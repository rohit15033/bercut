const router = require('express').Router()
const pool   = require('../config/db')
const { requireAdmin } = require('../middleware/auth')
const { requireKioskOrAdmin } = require('../middleware/auth')

// GET /api/services?branch_id= — kiosk + admin
router.get('/', async (req, res) => {
  try {
    const branchId = req.query.branch_id || req.branchId
    let query, params
    if (branchId) {
      query = `
        SELECT s.id, s.name, s.name_id, s.category, s.duration_minutes, s.badge,
               s.description, s.is_active, s.sort_order, s.image_url, s.mutex_group,
               COALESCE(bs.price, s.base_price) AS price,
               COALESCE(bs.is_available, true)  AS is_available,
               bs.commission_rate
        FROM services s
        LEFT JOIN branch_services bs ON bs.service_id = s.id AND bs.branch_id = $1
        WHERE s.is_active = true AND COALESCE(bs.is_available, true) = true
        ORDER BY s.sort_order, s.name`
      params = [branchId]
    } else {
      query = `SELECT id, name, name_id, category, base_price AS price, duration_minutes,
                      badge, description, is_active, sort_order, image_url, mutex_group
               FROM services ORDER BY sort_order, name`
      params = []
    }
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/services/:id/branch-config
router.get('/:id/branch-config', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM branch_services WHERE service_id = $1', [req.params.id])
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/services/:id
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/services
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, name_id, category, base_price, duration_minutes, badge, description, sort_order, image_url, mutex_group } = req.body
    const { rows } = await pool.query(
      `INSERT INTO services (name, name_id, category, base_price, duration_minutes, badge, description, sort_order, image_url, mutex_group)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        name, name_id, category, 
        base_price || 0, 
        duration_minutes || 30, 
        badge || null, 
        description || null, 
        sort_order || 0, 
        image_url || null, 
        mutex_group || null
      ]
    )
    res.status(201).json(rows[0])
  } catch (err) { 
    console.error('POST /services error:', err)
    res.status(500).json({ message: 'Internal server error: ' + err.message }) 
  }
})

// PATCH /api/services/:id
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, name_id, category, base_price, duration_minutes, badge, description, sort_order, image_url, mutex_group, is_active } = req.body
    const { rows } = await pool.query(
      `UPDATE services SET name=$1, name_id=$2, category=$3, base_price=$4, duration_minutes=$5,
       badge=$6, description=$7, sort_order=$8, image_url=$9, mutex_group=$10, is_active=$11
       WHERE id=$12 RETURNING *`,
      [
        name, name_id, category, 
        base_price || 0, 
        duration_minutes || 30, 
        badge || null, 
        description || null, 
        sort_order || 0, 
        image_url || null, 
        mutex_group || null, 
        is_active !== false, 
        req.params.id
      ]
    )
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { 
    console.error('PATCH /services/:id error:', err)
    res.status(500).json({ message: 'Internal server error: ' + err.message }) 
  }
})

// PUT /api/services/:id/branch-config — per-branch availability + price + commission
router.put('/:id/branch-config', requireAdmin, async (req, res) => {
  try {
    const { branch_id, is_available, price, commission_rate } = req.body
    await pool.query(
      `INSERT INTO branch_services (service_id, branch_id, is_available, price, commission_rate)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (service_id, branch_id) DO UPDATE SET is_available=$3, price=$4, commission_rate=$5`,
      [req.params.id, branch_id, is_available !== false, price || null, commission_rate || null])
    res.status(204).end()
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/services/:id/consumables
router.get('/:id/consumables', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sc.*, ii.name AS item_name, ii.unit FROM service_consumables sc
       JOIN inventory_items ii ON ii.id = sc.item_id WHERE sc.service_id = $1`, [req.params.id])
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PUT /api/services/:id/consumables
router.put('/:id/consumables', requireAdmin, async (req, res) => {
  try {
    const { consumables } = req.body  // [{item_id, qty_per_use}]
    await pool.query('DELETE FROM service_consumables WHERE service_id = $1', [req.params.id])
    for (const c of (consumables || [])) {
      await pool.query(
        'INSERT INTO service_consumables (service_id, item_id, qty_per_use) VALUES ($1,$2,$3)',
        [req.params.id, c.item_id, c.qty_per_use || 1])
    }
    res.status(204).end()
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
