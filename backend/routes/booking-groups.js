const router = require('express').Router()
const pool   = require('../config/db')
const { requireKiosk, requireKioskOrAdmin } = require('../middleware/auth')

// POST /api/booking-groups — create a new group
router.post('/', requireKiosk, async (req, res) => {
  try {
    const { branch_id } = req.body
    if (!branch_id) return res.status(400).json({ message: 'branch_id required' })
    const { rows } = await pool.query(
      'INSERT INTO booking_groups (branch_id) VALUES ($1) RETURNING id',
      [branch_id])
    res.status(201).json({ id: rows[0].id })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/booking-groups/:id — fetch all bookings in group with full detail
router.get('/:id', requireKioskOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT bk.*,
              b.name AS barber_name,
              COALESCE(bk.guest_name, c.name) AS customer_name,
              c.phone AS customer_phone,
              (bk.scheduled_at AT TIME ZONE 'Asia/Makassar')::time::text AS slot_time,
              COALESCE(s_total.total, 0) AS subtotal,
              COALESCE(e_total.total, 0) AS extras_total,
              COALESCE(s_total.total, 0) + COALESCE(e_total.total, 0) -
                (bk.points_redeemed * COALESCE(gs.points_redemption_rate, 10000)) AS total_amount,
              svc_agg.booking_services,
              ext_agg.booking_extras
       FROM bookings bk
       LEFT JOIN barbers b ON b.id = bk.barber_id
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN (SELECT booking_id, SUM(price_charged) AS total FROM booking_services GROUP BY booking_id) s_total
         ON s_total.booking_id = bk.id
       LEFT JOIN (SELECT booking_id, SUM(price * quantity) AS total FROM booking_extras GROUP BY booking_id) e_total
         ON e_total.booking_id = bk.id
       LEFT JOIN (
         SELECT bs.booking_id,
                json_agg(jsonb_build_object(
                  'service_id', bs.service_id, 'name', s.name,
                  'price', bs.price_charged, 'duration_min', s.duration_minutes,
                  'added_mid_cut', bs.added_mid_cut
                ) ORDER BY bs.id) AS booking_services
         FROM booking_services bs
         JOIN services s ON s.id = bs.service_id
         GROUP BY bs.booking_id
       ) svc_agg ON svc_agg.booking_id = bk.id
       LEFT JOIN (
         SELECT be.booking_id,
                json_agg(jsonb_build_object(
                  'name', ii.name, 'price', be.price, 'qty', be.quantity
                )) AS booking_extras
         FROM booking_extras be
         JOIN inventory_items ii ON ii.id = be.item_id
         GROUP BY be.booking_id
       ) ext_agg ON ext_agg.booking_id = bk.id
       CROSS JOIN LATERAL (SELECT points_redemption_rate FROM global_settings LIMIT 1) gs
       WHERE bk.group_id = $1
       ORDER BY bk.scheduled_at ASC`,
      [req.params.id])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
