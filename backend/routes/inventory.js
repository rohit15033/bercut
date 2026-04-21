const router = require('express').Router()
const pool   = require('../config/db')
const { requireAdmin } = require('../middleware/auth')

// GET /api/inventory?branch_id=
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { branch_id } = req.query
    const conds = []; const vals = []; let idx = 1
    if (branch_id) { conds.push(`ist.branch_id = $${idx++}`); vals.push(branch_id) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT ii.id, ii.name, ii.unit, ii.category,
              ist.branch_id, ist.current_stock, ist.reorder_threshold,
              ist.price, ist.kiosk_visible, br.name AS branch_name
       FROM inventory_items ii
       LEFT JOIN inventory_stock ist ON ist.item_id = ii.id
       LEFT JOIN branches br ON br.id = ist.branch_id
       ${where}
       ORDER BY ii.category ASC, ii.name ASC`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/inventory/items
router.get('/items', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inventory_items ORDER BY category, name')
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/inventory/items
router.post('/items', requireAdmin, async (req, res) => {
  try {
    const { name, unit, category } = req.body
    if (!name) return res.status(400).json({ message: 'Name required' })
    const { rows } = await pool.query(
      'INSERT INTO inventory_items (name, unit, category) VALUES ($1,$2,$3) RETURNING *',
      [name, unit || 'pcs', category || null])
    res.status(201).json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PATCH /api/inventory/items/:id
router.patch('/items/:id', requireAdmin, async (req, res) => {
  try {
    const { name, unit, category } = req.body
    const { rows } = await pool.query(
      `UPDATE inventory_items SET
         name     = COALESCE($1, name),
         unit     = COALESCE($2, unit),
         category = COALESCE($3, category)
       WHERE id = $4 RETURNING *`,
      [name || null, unit || null, category || null, req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/inventory/stock?item_id=&branch_id=
router.get('/stock', requireAdmin, async (req, res) => {
  try {
    const { item_id, branch_id } = req.query
    if (!item_id || !branch_id) return res.status(400).json({ message: 'item_id and branch_id required' })
    const { rows } = await pool.query(
      `SELECT ist.*, ii.name, ii.unit, ii.category
       FROM inventory_stock ist JOIN inventory_items ii ON ii.id = ist.item_id
       WHERE ist.item_id = $1 AND ist.branch_id = $2`, [item_id, branch_id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/inventory/stock — upsert stock entry for a branch
router.post('/stock', requireAdmin, async (req, res) => {
  try {
    const {
      item_id, branch_id,
      current_stock = 0, reorder_threshold = 5,
      price, kiosk_visible = false
    } = req.body
    if (!item_id || !branch_id) return res.status(400).json({ message: 'item_id and branch_id required' })
    const { rows } = await pool.query(
      `INSERT INTO inventory_stock (item_id, branch_id, current_stock, reorder_threshold, price, kiosk_visible)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (item_id, branch_id)
       DO UPDATE SET current_stock = inventory_stock.current_stock + $3, updated_at = NOW()
       RETURNING *`,
      [item_id, branch_id, current_stock, reorder_threshold, price || null, kiosk_visible])
    res.status(201).json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PATCH /api/inventory/stock — update stock fields (item_id + branch_id in body)
router.patch('/stock', requireAdmin, async (req, res) => {
  try {
    const { item_id, branch_id, ...updates } = req.body
    if (!item_id || !branch_id) return res.status(400).json({ message: 'item_id and branch_id required' })
    const allowed = ['current_stock', 'reorder_threshold', 'price', 'kiosk_visible']
    const sets = []; const vals = []; let idx = 1
    for (const key of allowed) {
      if (updates[key] !== undefined) { sets.push(`${key} = $${idx++}`); vals.push(updates[key]) }
    }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    sets.push('updated_at = NOW()')
    vals.push(item_id, branch_id)
    const { rows } = await pool.query(
      `UPDATE inventory_stock SET ${sets.join(', ')} WHERE item_id = $${idx} AND branch_id = $${idx + 1} RETURNING *`, vals)
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/inventory/distribute — transfer stock from one branch to another
router.post('/distribute', requireAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { item_id, from_branch_id, to_branch_id, quantity, notes } = req.body
    if (!item_id || !from_branch_id || !to_branch_id || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'item_id, from_branch_id, to_branch_id, quantity required' })
    }

    const from = await client.query(
      'SELECT current_stock FROM inventory_stock WHERE item_id = $1 AND branch_id = $2',
      [item_id, from_branch_id])
    if (!from.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Source stock not found' }) }
    if (from.rows[0].current_stock < quantity) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Insufficient stock' }) }

    await client.query(
      'UPDATE inventory_stock SET current_stock = current_stock - $1, updated_at = NOW() WHERE item_id = $2 AND branch_id = $3',
      [quantity, item_id, from_branch_id])
    await client.query(
      `INSERT INTO inventory_stock (item_id, branch_id, current_stock)
       VALUES ($1,$2,$3) ON CONFLICT (item_id, branch_id) DO UPDATE SET current_stock = inventory_stock.current_stock + $3, updated_at = NOW()`,
      [item_id, to_branch_id, quantity])

    await client.query(
      `INSERT INTO inventory_movements (item_id, branch_id, movement_type, quantity, note, logged_by)
       VALUES ($1,$2,'out',$3,$4,$5)`,
      [item_id, from_branch_id, quantity, notes || null, req.user.id])
    await client.query(
      `INSERT INTO inventory_movements (item_id, branch_id, movement_type, quantity, note, logged_by)
       VALUES ($1,$2,'in',$3,$4,$5)`,
      [item_id, to_branch_id, quantity, notes || null, req.user.id])

    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
})

// GET /api/inventory/movements?item_id=&branch_id=&limit=
router.get('/movements', requireAdmin, async (req, res) => {
  try {
    const { item_id, branch_id, limit = 50 } = req.query
    const conds = []; const vals = []; let idx = 1
    if (item_id)   { conds.push(`im.item_id = $${idx++}`);   vals.push(item_id) }
    if (branch_id) { conds.push(`im.branch_id = $${idx++}`); vals.push(branch_id) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT im.*, ii.name AS item_name FROM inventory_movements im
       JOIN inventory_items ii ON ii.id = im.item_id
       ${where} ORDER BY im.created_at DESC LIMIT $${idx}`,
      [...vals, limit])
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/inventory/kiosk-menu?branch_id=
router.get('/kiosk-menu', requireAdmin, async (req, res) => {
  try {
    const { branch_id } = req.query
    if (!branch_id) return res.status(400).json({ message: 'branch_id required' })
    const { rows } = await pool.query(
      `SELECT ii.id, ii.name, ii.category, ist.price, ist.kiosk_visible, ist.current_stock
       FROM inventory_stock ist JOIN inventory_items ii ON ii.id = ist.item_id
       WHERE ist.branch_id = $1 ORDER BY ii.category, ii.name`,
      [branch_id])
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
