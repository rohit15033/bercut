const router = require('express').Router()
const pool   = require('../config/db')
const { requireAdmin } = require('../middleware/auth')

// Helper: computed total subquery for a booking
const svcTotal  = `(SELECT COALESCE(SUM(price_charged),0) FROM booking_services WHERE booking_id = bk.id)`
const extraTotal = `(SELECT COALESCE(SUM(price * quantity),0) FROM booking_extras WHERE booking_id = bk.id)`
const totalAmt   = `(${svcTotal} + ${extraTotal} - bk.points_redeemed * 100)`

// GET /api/reports/revenue?branch_id=&date_from=&date_to=&group_by=day|week|month
router.get('/revenue', requireAdmin, async (req, res) => {
  try {
    const { branch_id, date_from, date_to, group_by = 'day' } = req.query
    const conds = ["bk.status = 'completed'"]; const vals = []; let idx = 1
    if (branch_id) { conds.push(`bk.branch_id = $${idx++}`); vals.push(branch_id) }
    if (date_from) { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') >= $${idx++}`); vals.push(date_from) }
    if (date_to)   { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') <= $${idx++}`); vals.push(date_to) }
    const where = 'WHERE ' + conds.join(' AND ')

    const dateTrunc = ['week','month'].includes(group_by) ? group_by : 'day'
    const { rows } = await pool.query(
      `SELECT DATE_TRUNC('${dateTrunc}', bk.scheduled_at AT TIME ZONE 'Asia/Makassar') AS period,
              COUNT(bk.id)                AS booking_count,
              SUM(${svcTotal})            AS services_revenue,
              SUM(${extraTotal})          AS extras_revenue,
              SUM(bk.points_redeemed * 100) AS points_discount,
              SUM(COALESCE(t.amount, 0)) AS tips_total,
              SUM(${totalAmt})           AS revenue
       FROM bookings bk
       LEFT JOIN tips t ON t.booking_id = bk.id
       ${where}
       GROUP BY period ORDER BY period ASC`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/reports/barbers?branch_id=&date_from=&date_to=
router.get('/barbers', requireAdmin, async (req, res) => {
  try {
    const { branch_id, date_from, date_to } = req.query
    const conds = ["bk.status = 'completed'"]; const vals = []; let idx = 1
    if (branch_id) { conds.push(`bk.branch_id = $${idx++}`); vals.push(branch_id) }
    if (date_from) { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') >= $${idx++}`); vals.push(date_from) }
    if (date_to)   { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') <= $${idx++}`); vals.push(date_to) }
    const where = 'WHERE b.is_active = true AND ' + conds.join(' AND ')
    const { rows } = await pool.query(
      `SELECT b.id, b.name, b.branch_id,
              COUNT(bk.id)               AS booking_count,
              SUM(${totalAmt})           AS total_revenue,
              AVG(${totalAmt})           AS avg_booking_value,
              SUM(COALESCE(t.amount, 0)) AS tips_total,
              AVG(bk.rating) FILTER (WHERE bk.rating IS NOT NULL) AS avg_rating
       FROM barbers b
       LEFT JOIN bookings bk ON bk.barber_id = b.id
       LEFT JOIN tips t ON t.booking_id = bk.id
       ${where}
       GROUP BY b.id, b.name, b.branch_id ORDER BY total_revenue DESC NULLS LAST`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/reports/services?branch_id=&date_from=&date_to=
router.get('/services', requireAdmin, async (req, res) => {
  try {
    const { branch_id, date_from, date_to } = req.query
    const conds = ["bk.status = 'completed'"]; const vals = []; let idx = 1
    if (branch_id) { conds.push(`bk.branch_id = $${idx++}`); vals.push(branch_id) }
    if (date_from) { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') >= $${idx++}`); vals.push(date_from) }
    if (date_to)   { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') <= $${idx++}`); vals.push(date_to) }
    const where = 'WHERE ' + conds.join(' AND ')
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.category,
              COUNT(bsv.id) AS times_booked,
              SUM(bsv.price_charged) AS total_revenue
       FROM booking_services bsv
       JOIN services s ON s.id = bsv.service_id
       JOIN bookings bk ON bk.id = bsv.booking_id
       ${where}
       GROUP BY s.id, s.name, s.category ORDER BY times_booked DESC`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/reports/demand?branch_id=&date_from=&date_to=
// Uses pax_out_events as a proxy for walk-out / drop-off analytics
router.get('/demand', requireAdmin, async (req, res) => {
  try {
    const { branch_id, date_from, date_to } = req.query
    const conds = []; const vals = []; let idx = 1
    if (branch_id) { conds.push(`po.branch_id = $${idx++}`); vals.push(branch_id) }
    if (date_from) { conds.push(`DATE(po.created_at AT TIME ZONE 'Asia/Makassar') >= $${idx++}`); vals.push(date_from) }
    if (date_to)   { conds.push(`DATE(po.created_at AT TIME ZONE 'Asia/Makassar') <= $${idx++}`); vals.push(date_to) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT DATE(po.created_at AT TIME ZONE 'Asia/Makassar') AS date,
              po.step_label, COUNT(*) AS count,
              br.name AS branch_name
       FROM pax_out_events po
       LEFT JOIN branches br ON br.id = po.branch_id
       ${where}
       GROUP BY date, po.step_label, br.name ORDER BY date DESC, count DESC`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/reports/barber-transactions?barber_id=&date_from=&date_to=
router.get('/barber-transactions', requireAdmin, async (req, res) => {
  try {
    const { barber_id, date_from, date_to } = req.query
    if (!barber_id) return res.status(400).json({ message: 'barber_id required' })
    const conds = ["bk.barber_id = $1", "bk.status = 'completed'"]; const vals = [barber_id]; let idx = 2
    if (date_from) { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') >= $${idx++}`); vals.push(date_from) }
    if (date_to)   { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') <= $${idx++}`); vals.push(date_to) }
    const where = 'WHERE ' + conds.join(' AND ')
    const { rows } = await pool.query(
      `SELECT bk.id, bk.booking_number,
              DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') AS date,
              TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
              ${totalAmt} AS total_amount,
              bk.payment_method, bk.rating, bk.paid_at,
              COALESCE(bk.guest_name, c.name) AS customer_name,
              COALESCE(bk.guest_phone, c.phone) AS customer_phone,
              COALESCE(t.amount, 0) AS tip,
              (SELECT json_agg(s.name) FROM booking_services bsv JOIN services s ON s.id = bsv.service_id WHERE bsv.booking_id = bk.id) AS services
       FROM bookings bk
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN tips t ON t.booking_id = bk.id
       ${where}
       ORDER BY bk.scheduled_at DESC`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/reports/delay?branch_id=&date_from=&date_to=
router.get('/delay', requireAdmin, async (req, res) => {
  try {
    const { branch_id, date_from, date_to } = req.query
    const conds = ["bk.started_at IS NOT NULL"]; const vals = []; let idx = 1
    if (branch_id) { conds.push(`bk.branch_id = $${idx++}`); vals.push(branch_id) }
    if (date_from) { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') >= $${idx++}`); vals.push(date_from) }
    if (date_to)   { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') <= $${idx++}`); vals.push(date_to) }
    const where = 'WHERE ' + conds.join(' AND ')
    const { rows } = await pool.query(
      `SELECT bk.id, bk.booking_number,
              DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') AS date,
              TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
              EXTRACT(EPOCH FROM (bk.started_at - bk.scheduled_at)) / 60 AS delay_minutes,
              b.name AS barber_name
       FROM bookings bk LEFT JOIN barbers b ON b.id = bk.barber_id
       ${where} ORDER BY bk.scheduled_at DESC`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/reports/transactions?branch_id=&date_from=&date_to=&limit=&offset=
router.get('/transactions', requireAdmin, async (req, res) => {
  try {
    const { branch_id, date_from, date_to, limit = 200, offset = 0 } = req.query
    const conds = ["bk.status = 'completed'"]; const vals = []; let idx = 1
    if (branch_id) { conds.push(`bk.branch_id = $${idx++}`); vals.push(branch_id) }
    if (date_from) { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') >= $${idx++}`); vals.push(date_from) }
    if (date_to)   { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') <= $${idx++}`); vals.push(date_to) }
    const where = 'WHERE ' + conds.join(' AND ')
    const { rows } = await pool.query(
      `SELECT bk.id, bk.booking_number,
              DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar')              AS date,
              TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS time_scheduled,
              TO_CHAR(bk.started_at   AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS time_started,
              TO_CHAR(bk.completed_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS time_ended,
              COALESCE(bk.guest_name, c.name)  AS customer_name,
              COALESCE(bk.guest_phone, c.phone) AS customer_phone,
              b.name AS barber_name,
              bk.payment_method,
              COALESCE(t.amount, 0) AS tip,
              ${totalAmt} AS total_amount,
              (SELECT json_agg(
                json_build_object(
                  'service_name',    s.name,
                  'price',           bsv.price_charged,
                  'commission_rate', COALESCE(bs_barber.commission_rate, bs_branch.commission_rate, b.commission_rate),
                  'commission',      ROUND(bsv.price_charged *
                                       COALESCE(bs_barber.commission_rate, bs_branch.commission_rate, b.commission_rate) / 100)
                ) ORDER BY s.name
              )
              FROM booking_services bsv
              JOIN services s ON s.id = bsv.service_id
              LEFT JOIN barber_services bs_barber
                ON bs_barber.barber_id = bk.barber_id AND bs_barber.service_id = bsv.service_id
              LEFT JOIN branch_services bs_branch
                ON bs_branch.service_id = bsv.service_id AND bs_branch.branch_id = bk.branch_id
              WHERE bsv.booking_id = bk.id) AS services
       FROM bookings bk
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN barbers b ON b.id = bk.barber_id
       LEFT JOIN tips t ON t.booking_id = bk.id
       ${where}
       ORDER BY bk.scheduled_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...vals, limit, offset])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
