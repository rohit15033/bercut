const router = require('express').Router()
const bcrypt = require('bcrypt')
const pool   = require('../config/db')
const { requireAdmin, requireKiosk } = require('../middleware/auth')

// GET /api/barbers?branch_id=&service_ids=  (also used by kiosk)
router.get('/', async (req, res) => {
  try {
    const { branch_id, service_ids } = req.query
    const branchId = branch_id || req.branchId
    if (!branchId) return res.status(400).json({ message: 'branch_id required' })

    const serviceIds = service_ids ? service_ids.split(',').filter(Boolean) : []

    // Exclude barbers currently covering a different branch via chair_overrides
    let query = `
      SELECT b.id, b.name, b.specialty, b.specialty_id, b.avatar_url, b.status, b.sort_order,
             b.commission_rate, b.pay_type,
             COALESCE(
               (SELECT COUNT(*) FROM bookings bk
                WHERE bk.barber_id = b.id AND bk.branch_id = $1
                AND bk.status IN ('confirmed','in_progress')
                AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = CURRENT_DATE),
               0
             ) AS queue_count,
             COALESCE(
               (SELECT COUNT(*) FROM bookings bk
                WHERE bk.barber_id = b.id AND bk.source = 'any_available'
                AND bk.branch_id = $1
                AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = CURRENT_DATE),
               0
             ) AS any_available_count
      FROM barbers b
      WHERE b.is_active = true
        AND (
          b.branch_id = $1
          OR EXISTS (
            SELECT 1 FROM chair_overrides co
            JOIN chairs c ON c.id = co.chair_id
            WHERE co.barber_id = b.id AND c.branch_id = $1
              AND co.date_from <= CURRENT_DATE
              AND (co.date_to IS NULL OR co.date_to >= CURRENT_DATE)
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM chair_overrides co
          JOIN chairs c ON c.id = co.chair_id
          WHERE co.barber_id = b.id
            AND c.branch_id != $1
            AND co.date_from <= CURRENT_DATE
            AND (co.date_to IS NULL OR co.date_to >= CURRENT_DATE)
        )`

    const params = [branchId]

    if (serviceIds.length > 0) {
      query += ` AND NOT EXISTS (
        SELECT 1 FROM UNNEST($2::uuid[]) AS sid
        WHERE EXISTS (
          SELECT 1 FROM barber_services bs
          WHERE bs.barber_id = b.id AND bs.service_id = sid AND bs.is_enabled = false
        )
      )`
      params.push(serviceIds)
    }

    query += ' ORDER BY b.sort_order, b.name'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/barbers/:id
// GET /api/barbers/all — all barbers across branches (admin use)
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.name, b.branch_id, b.specialty, b.status, b.is_active, b.sort_order, b.pay_type, b.base_salary, b.daily_rate,
              c.label AS chair_label
       FROM barbers b
       LEFT JOIN chairs c ON c.barber_id = b.id
       WHERE b.is_active = true
       ORDER BY b.name ASC`)
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM barbers WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/barbers
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, branch_id, specialty, specialty_id, phone, pin, commission_rate, base_salary, pay_type, daily_rate, avatar_url, sort_order } = req.body
    const pin_hash = pin ? await bcrypt.hash(String(pin), 10) : null
    const { rows } = await pool.query(
      `INSERT INTO barbers (name, branch_id, specialty, specialty_id, phone, pin_hash, commission_rate, base_salary, pay_type, daily_rate, avatar_url, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, branch_id, specialty, specialty_id, phone, pin_hash, commission_rate || 40, base_salary || 0, pay_type || 'salary_plus_commission', daily_rate || 0, avatar_url, sort_order || 0])
    res.status(201).json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PATCH /api/barbers/:id
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, branch_id, specialty, specialty_id, phone, pin, commission_rate, base_salary, pay_type, daily_rate, avatar_url, sort_order, is_active } = req.body
    const updates = { name, branch_id, specialty, specialty_id, phone, commission_rate, base_salary, pay_type, daily_rate, avatar_url, sort_order, is_active }
    if (pin) updates.pin_hash = await bcrypt.hash(String(pin), 10)

    const keys = Object.keys(updates).filter(k => updates[k] !== undefined)
    const vals = keys.map(k => updates[k])
    const set  = keys.map((k, i) => `${k}=$${i + 1}`).join(', ')
    const { rows } = await pool.query(`UPDATE barbers SET ${set} WHERE id=$${keys.length + 1} RETURNING *`, [...vals, req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/barbers/:id/verify-pin — kiosk PIN verification
router.post('/:id/verify-pin', requireKiosk, async (req, res) => {
  try {
    const { pin } = req.body
    const { rows } = await pool.query('SELECT pin_hash, name, avatar_url, status FROM barbers WHERE id = $1 AND is_active = true', [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Barber not found' })
    const valid = await bcrypt.compare(String(pin), rows[0].pin_hash || '')
    if (!valid) return res.status(401).json({ message: 'Incorrect PIN' })
    res.json({ barber_id: req.params.id, name: rows[0].name, avatar_url: rows[0].avatar_url, status: rows[0].status })
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/barbers/:id/services
router.get('/:id/services', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.category, COALESCE(bs.is_enabled, true) AS is_enabled
       FROM services s
       LEFT JOIN barber_services bs ON bs.barber_id = $1 AND bs.service_id = s.id
       WHERE s.is_active = true ORDER BY s.sort_order`, [req.params.id])
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PUT /api/barbers/:id/services/:svc_id
router.put('/:id/services/:svc_id', requireAdmin, async (req, res) => {
  try {
    const { is_enabled } = req.body
    await pool.query(
      `INSERT INTO barber_services (barber_id, service_id, is_enabled) VALUES ($1,$2,$3)
       ON CONFLICT (barber_id, service_id) DO UPDATE SET is_enabled=$3`,
      [req.params.id, req.params.svc_id, is_enabled !== false])
    res.status(204).end()
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
