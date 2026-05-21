const router = require('express').Router()
const pool   = require('../config/db')
const { checkPermission } = require('../middleware/auth')

// Helper: computed total subquery for a booking
const svcTotal  = `(SELECT COALESCE(SUM(price_charged),0) FROM booking_services WHERE booking_id = bk.id)`
const extraTotal = `(SELECT COALESCE(SUM(price * quantity),0) FROM booking_extras WHERE booking_id = bk.id)`
const totalAmt   = `(${svcTotal} + ${extraTotal} - bk.points_redeemed * 100)`

// GET /api/reports/revenue?branch_id=&date_from=&date_to=&group_by=day|week|month
router.get('/revenue', checkPermission('reports'), async (req, res) => {
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
router.get('/barbers', checkPermission('reports'), async (req, res) => {
  try {
    const { branch_id, date_from, date_to } = req.query

    const conds = ["bk.status = 'completed'"]; const vals = []; let idx = 1
    if (branch_id) { conds.push(`bk.branch_id = $${idx++}`); vals.push(branch_id) }
    if (date_from) { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') >= $${idx++}`); vals.push(date_from) }
    if (date_to)   { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') <= $${idx++}`); vals.push(date_to) }
    const where = 'WHERE b.is_active = true AND ' + conds.join(' AND ')

    // Build correlated subquery WHERE clause — reuses the same $1..$N as the outer query
    const subConds = ["bk2.status = 'completed'", "bk2.barber_id = b.id"]
    let innerIdx = 1
    if (branch_id) { subConds.push(`bk2.branch_id = $${innerIdx++}`) }
    if (date_from) { subConds.push(`DATE(bk2.scheduled_at AT TIME ZONE 'Asia/Makassar') >= $${innerIdx++}`) }
    if (date_to)   { subConds.push(`DATE(bk2.scheduled_at AT TIME ZONE 'Asia/Makassar') <= $${innerIdx++}`) }
    const subWhere = subConds.join(' AND ')

    const { rows } = await pool.query(
      `SELECT b.id, b.name, b.branch_id,
              COUNT(bk.id)               AS booking_count,
              SUM(${totalAmt})           AS total_revenue,
              AVG(${totalAmt})           AS avg_booking_value,
              SUM(COALESCE(t.amount, 0)) AS tips_total,
              AVG(bk.rating) FILTER (WHERE bk.rating IS NOT NULL) AS avg_rating,
              (SELECT COALESCE(SUM(bsv2.commission_amount), 0)
               FROM bookings bk2
               JOIN booking_services bsv2 ON bsv2.booking_id = bk2.id
               WHERE ${subWhere}
              ) AS total_commission
       FROM barbers b
       LEFT JOIN bookings bk ON bk.barber_id = b.id
       LEFT JOIN tips t ON t.booking_id = bk.id
       ${where}
       GROUP BY b.id, b.name, b.branch_id ORDER BY total_revenue DESC NULLS LAST`,
      vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/reports/services?branch_id=&date_from=&date_to=
router.get('/services', checkPermission('reports'), async (req, res) => {
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
router.get('/demand', checkPermission('reports'), async (req, res) => {
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
router.get('/barber-transactions', checkPermission('reports'), async (req, res) => {
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
              EXISTS(SELECT 1 FROM booking_services bs2 WHERE bs2.booking_id = bk.id AND bs2.is_ot_service = true) AS is_ot,
              (SELECT json_agg(
                json_build_object(
                  'service_name',              s.name,
                  'category',                  s.category,
                  'price',                     bsv.price_charged,
                  'commission_rate',           bsv.commission_rate,
                  'is_ot_service',             COALESCE(bsv.is_ot_service, false),
                  'effective_commission_rate', COALESCE(bsv.commission_rate_applied, bsv.commission_rate),
                  'commission',                COALESCE(bsv.commission_amount, 0)
                ) ORDER BY s.name
              )
               FROM booking_services bsv
               JOIN services s ON s.id = bsv.service_id
               WHERE bsv.booking_id = bk.id) AS services
       FROM bookings bk
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN tips t ON t.booking_id = bk.id
       ${where}
       ORDER BY bk.scheduled_at DESC`,
      vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/reports/delay?branch_id=&date_from=&date_to=
router.get('/delay', checkPermission('reports'), async (req, res) => {
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
router.get('/transactions', checkPermission('reports'), async (req, res) => {
  try {
    const { branch_id, date_from, date_to, limit = 200, offset = 0 } = req.query
    const conds = ["bk.status = 'completed'"]; const vals = []; let idx = 1
    if (branch_id) { conds.push(`bk.branch_id = $${idx++}`); vals.push(branch_id) }
    if (date_from) { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') >= $${idx++}`); vals.push(date_from) }
    if (date_to)   { conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') <= $${idx++}`); vals.push(date_to) }
    const where = 'WHERE ' + conds.join(' AND ')
    const limitIdx = idx++; const offsetIdx = idx++
    const { rows } = await pool.query(
      `SELECT bk.id, bk.booking_number,
              DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar')               AS date,
              TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS time_scheduled,
              TO_CHAR(bk.started_at   AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS time_started,
              TO_CHAR(bk.completed_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS time_ended,
              COALESCE(bk.guest_name, c.name)   AS customer_name,
              COALESCE(bk.guest_phone, c.phone) AS customer_phone,
              b.name AS barber_name,
              bk.payment_method,
              COALESCE(t.amount, 0) AS tip,
              ${totalAmt} AS total_amount,
              EXISTS(SELECT 1 FROM booking_services bs2 WHERE bs2.booking_id = bk.id AND bs2.is_ot_service = true) AS is_ot,
              (SELECT json_agg(
                json_build_object(
                  'service_name',              s.name,
                  'price',                     bsv.price_charged,
                  'category',                  s.category,
                  'commission_rate',           bsv.commission_rate,
                  'is_ot_service',             COALESCE(bsv.is_ot_service, false),
                  'effective_commission_rate', COALESCE(bsv.commission_rate_applied, bsv.commission_rate),
                  'commission',                COALESCE(bsv.commission_amount, 0)
                ) ORDER BY s.name
              )
              FROM booking_services bsv
              JOIN services s ON s.id = bsv.service_id
              WHERE bsv.booking_id = bk.id) AS services,
              (SELECT json_agg(json_build_object('name', ii.name, 'price', be.price, 'quantity', be.quantity, 'category', ii.category) ORDER BY ii.name)
               FROM booking_extras be JOIN inventory_items ii ON ii.id = be.item_id
               WHERE be.booking_id = bk.id) AS extras
       FROM bookings bk
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN barbers b ON b.id = bk.barber_id
       LEFT JOIN tips t ON t.booking_id = bk.id
       ${where}
       ORDER BY bk.scheduled_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...vals, limit, offset])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
