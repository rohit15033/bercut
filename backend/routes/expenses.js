const router = require('express').Router()
const pool   = require('../config/db')
const { requireAdmin } = require('../middleware/auth')

// ── GET /api/expenses ──────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { branch_id, date_from, date_to, type } = req.query
    const conds = []; const vals = []; let idx = 1
    if (branch_id) { conds.push(`e.branch_id = $${idx++}`);  vals.push(branch_id) }
    if (date_from) { conds.push(`e.expense_date >= $${idx++}`); vals.push(date_from) }
    if (date_to)   { conds.push(`e.expense_date <= $${idx++}`); vals.push(date_to) }
    if (type)      { conds.push(`e.type = $${idx++}`);        vals.push(type) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT e.*, ec.name AS category_name, u.name AS created_by_name
       FROM expenses e
       LEFT JOIN expense_categories ec ON ec.id = e.category_id
       LEFT JOIN users u ON u.id = e.created_by
       ${where} ORDER BY e.expense_date DESC, e.created_at DESC`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── GET /api/expenses/:id ──────────────────────────────────────────────────────
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, ec.name AS category_name,
              json_agg(esi ORDER BY esi.id) FILTER (WHERE esi.id IS NOT NULL) AS stock_items
       FROM expenses e
       LEFT JOIN expense_categories ec ON ec.id = e.category_id
       LEFT JOIN expense_stock_items esi ON esi.expense_id = e.id
       WHERE e.id = $1 GROUP BY e.id, ec.name`, [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── POST /api/expenses ─────────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      branch_id, type = 'regular', category_id, description,
      amount, expense_date, notes,
      po_id, po_attribution,
      stock_items = []
    } = req.body

    if (!branch_id || !amount || !expense_date) {
      return res.status(400).json({ message: 'branch_id, amount, expense_date required' })
    }

    const { rows } = await client.query(
      `INSERT INTO expenses
         (branch_id, type, category_id, description, amount, expense_date, notes,
          po_id, po_attribution, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [branch_id, type, category_id||null, description||null, amount, expense_date,
       notes||null, po_id||null, po_attribution||null, req.user.id])
    const expense = rows[0]

    for (const item of stock_items) {
      const qty = item.quantity_received ?? item.qty ?? 0
      await client.query(
        `INSERT INTO expense_stock_items (expense_id, item_id, branch_id, quantity_received, unit)
         VALUES ($1,$2,$3,$4,$5)`,
        [expense.id, item.item_id, branch_id, qty, item.unit || 'pcs'])
      await client.query(
        `INSERT INTO inventory_stock (item_id, branch_id, current_stock)
         VALUES ($1,$2,$3)
         ON CONFLICT (item_id, branch_id) DO UPDATE SET current_stock = inventory_stock.current_stock + $3, updated_at = NOW()`,
        [item.item_id, branch_id, qty])
      await client.query(
        `INSERT INTO inventory_movements (item_id, branch_id, movement_type, quantity, note, logged_by)
         VALUES ($1,$2,'in',$3,$4,$5)`,
        [item.item_id, branch_id, qty, expense.description || null, req.user.id])
    }

    await client.query('COMMIT')
    res.status(201).json(expense)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
})

// ── PATCH /api/expenses/:id ────────────────────────────────────────────────────
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['category_id','description','amount','expense_date','notes','po_id','po_attribution']
    const sets = []; const vals = []; let idx = 1
    for (const key of allowed) {
      if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); vals.push(req.body[key]) }
    }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    sets.push('updated_at = NOW()')
    vals.push(req.params.id)
    const { rows } = await pool.query(
      `UPDATE expenses SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals)
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── DELETE /api/expenses/:id ───────────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── Purchase Orders ────────────────────────────────────────────────────────────

router.get('/purchase-orders', requireAdmin, async (req, res) => {
  try {
    const { branch_id } = req.query
    const conds = branch_id ? ['branch_id = $1'] : []
    const vals  = branch_id ? [branch_id] : []
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT * FROM purchase_orders ${where} ORDER BY created_at DESC`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.post('/purchase-orders', requireAdmin, async (req, res) => {
  try {
    const { branch_id, supplier, notes, order_date } = req.body
    const { rows } = await pool.query(
      `INSERT INTO purchase_orders (branch_id, supplier, notes, order_date, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [branch_id, supplier||null, notes||null, order_date, req.user.id])
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── Expense Categories ─────────────────────────────────────────────────────────

router.get('/categories', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM expense_categories ORDER BY name')
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
