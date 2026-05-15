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
      `SELECT e.*, ec.label AS category_name, u.name AS created_by_name
       FROM expenses e
       LEFT JOIN expense_categories ec ON ec.id = e.category_id
       LEFT JOIN users u ON u.id = e.submitted_by
       ${where} ORDER BY e.expense_date DESC, e.created_at DESC`, vals)
    res.json(rows)
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
    const { rows } = await pool.query('SELECT * FROM expense_categories ORDER BY label')
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { label, color, bg } = req.body
    if (!label?.trim()) return res.status(400).json({ message: 'label required' })
    const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const { rows } = await pool.query(
      `INSERT INTO expense_categories (key, label, color, bg)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [key, label.trim(), color || '#2563EB', bg || '#EFF6FF'])
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── GET /api/expenses/:id ──────────────────────────────────────────────────────
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, ec.label AS category_name,
              json_agg(
                json_build_object(
                  'id', esi.id, 'item_id', esi.item_id, 'item_name', ii.name,
                  'branch_id', esi.branch_id, 'quantity_received', esi.quantity_received, 'unit', esi.unit
                ) ORDER BY esi.id
              ) FILTER (WHERE esi.id IS NOT NULL) AS stock_items
       FROM expenses e
       LEFT JOIN expense_categories ec ON ec.id = e.category_id
       LEFT JOIN expense_stock_items esi ON esi.expense_id = e.id
       LEFT JOIN inventory_items ii ON ii.id = esi.item_id
       WHERE e.id = $1 GROUP BY e.id, ec.label`, [req.params.id])
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
      amount, expense_date, source,
      po_id, po_attribution,
      barber_id, deduct_period,
      stock_items = []
    } = req.body

    if (!amount || !expense_date) {
      return res.status(400).json({ message: 'amount, expense_date required' })
    }
    if (type !== 'inventory' && !branch_id) {
      return res.status(400).json({ message: 'branch_id required' })
    }

    const validItems = stock_items.filter(i => i.branch_id)
    const resolvedBranchId = branch_id || (type === 'inventory' && validItems.length === 1 ? validItems[0].branch_id : null)

    const { rows } = await client.query(
      `INSERT INTO expenses
         (branch_id, type, category_id, description, amount, expense_date, source,
          po_id, po_attribution, barber_id, deduct_period, submitted_by, receipt_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [resolvedBranchId||null, type, category_id||null, description||null, amount, expense_date,
       source||'petty_cash', po_id||null, po_attribution||null,
       barber_id||null, deduct_period||null, req.user.id, ''])
    const expense = rows[0]

    for (const item of stock_items) {
      const qty = item.quantity_received ?? item.qty ?? 0
      const itemBranch = item.branch_id || branch_id
      await client.query(
        `INSERT INTO expense_stock_items (expense_id, item_id, branch_id, quantity_received, unit)
         VALUES ($1,$2,$3,$4,$5)`,
        [expense.id, item.item_id, itemBranch, qty, item.unit || 'pcs'])
      await client.query(
        `INSERT INTO inventory_stock (item_id, branch_id, current_stock)
         VALUES ($1,$2,$3)
         ON CONFLICT (item_id, branch_id) DO UPDATE SET current_stock = inventory_stock.current_stock + $3, updated_at = NOW()`,
        [item.item_id, itemBranch, qty])
      await client.query(
        `INSERT INTO inventory_movements (item_id, branch_id, movement_type, quantity, note, logged_by)
         VALUES ($1,$2,'in',$3,$4,$5)`,
        [item.item_id, itemBranch, qty, expense.description || null, req.user.id])
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
    const allowed = ['category_id','description','amount','expense_date','source','po_id','po_attribution']
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

module.exports = router
