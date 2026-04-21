const router = require('express').Router()
const pool   = require('../config/db')
const { requireAdmin } = require('../middleware/auth')

// GET /api/customers?phone=  — loyalty lookup by phone (kiosk)
router.get('/', async (req, res) => {
  try {
    const { phone } = req.query
    if (!phone) return res.status(400).json({ message: 'phone required' })
    const { rows } = await pool.query(
      `SELECT id, name, phone, points_balance, total_visits, total_spend, last_visit,
              points_last_activity_at, points_last_expired_at
       FROM customers WHERE phone = $1`, [phone])
    if (!rows.length) return res.json(null)
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/customers/list?page=&limit=&search= — admin list
router.get('/list', requireAdmin, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1'))
    const limit = Math.min(100, parseInt(req.query.limit || '50'))
    const offset = (page - 1) * limit
    const search = req.query.search ? `%${req.query.search}%` : null

    const where = search ? 'WHERE name ILIKE $3 OR phone ILIKE $3' : ''
    const params = search ? [limit, offset, search] : [limit, offset]

    const { rows } = await pool.query(
      `SELECT id, name, phone, points_balance, total_visits, total_spend, last_visit,
              points_last_activity_at, points_last_expired_at, created_at
       FROM customers ${where} ORDER BY total_visits DESC LIMIT $1 OFFSET $2`, params)

    const countRes = await pool.query(`SELECT COUNT(*) FROM customers ${where}`, search ? [search] : [])
    res.json({ data: rows, total: parseInt(countRes.rows[0].count), page, limit })
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/customers/:id/bookings — booking history
router.get('/:id/bookings', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.booking_number, b.scheduled_at, b.status, b.rating,
              br.name AS barber_name, b.points_earned, b.points_redeemed,
              (SELECT SUM(bs.price_charged) FROM booking_services bs WHERE bs.booking_id = b.id) AS total,
              (SELECT STRING_AGG(s.name, ', ') FROM booking_services bs JOIN services s ON s.id = bs.service_id WHERE bs.booking_id = b.id) AS services
       FROM bookings b
       JOIN barbers br ON br.id = b.barber_id
       WHERE b.customer_id = $1
       ORDER BY b.scheduled_at DESC`, [req.params.id])
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
