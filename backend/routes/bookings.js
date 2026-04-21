const router = require('express').Router()
const pool   = require('../config/db')
const { requireAdmin, requireKiosk, requireKioskOrAdmin } = require('../middleware/auth')
const { branchScope, requireBranch } = require('../middleware/branchScope')
const { emitEvent } = require('./events')

// ── helpers ────────────────────────────────────────────────────────────────────

function scheduledAt(dateStr, timeStr) {
  // Combine date + time into a WITA (UTC+8) timestamp
  if (!timeStr || timeStr === 'Now') return new Date().toISOString()
  return `${dateStr}T${timeStr}:00+08:00`
}

async function nextBookingNumber(client, branchId, dateStr) {
  const { rows } = await client.query(
    `SELECT COUNT(*)+1 AS n FROM bookings
     WHERE branch_id = $1 AND DATE(scheduled_at AT TIME ZONE 'Asia/Makassar') = $2`,
    [branchId, dateStr])
  return 'B' + String(rows[0].n).padStart(3, '0')
}

async function assignAnyAvailable(client, branchId, dateStr) {
  const { rows } = await client.query(
    `SELECT b.id FROM barbers b
     LEFT JOIN bookings bk ON bk.barber_id = b.id
       AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
       AND bk.source = 'any_available'
       AND bk.status NOT IN ('cancelled','no_show')
     WHERE b.branch_id = $1 AND b.status NOT IN ('clocked_out','off') AND b.is_active = true
     GROUP BY b.id, b.sort_order
     ORDER BY COUNT(bk.id) ASC, b.sort_order ASC
     LIMIT 1`,
    [branchId, dateStr]
  )
  return rows[0]?.id ?? null
}

async function getBookingTotal(client, bookingId) {
  const svcs = await client.query(
    'SELECT COALESCE(SUM(price_charged), 0) AS total FROM booking_services WHERE booking_id = $1',
    [bookingId])
  const extras = await client.query(
    'SELECT COALESCE(SUM(price), 0) AS total FROM booking_extras WHERE booking_id = $1',
    [bookingId])
  return parseFloat(svcs.rows[0].total) + parseFloat(extras.rows[0].total)
}

// ── POST /api/bookings ─────────────────────────────────────────────────────────

router.post('/', requireKioskOrAdmin, branchScope, requireBranch, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const branchId = req.branchId
    const {
      customer_phone, customer_name,
      barber_id,
      service_ids = [],
      extra_ids = [],
      slot_time,
      date,
      notes,
      use_points = false,
      source = 'walk_in'
    } = req.body

    if (!service_ids.length) return res.status(400).json({ message: 'At least one service required' })

    const bookingDate = date || new Date().toISOString().slice(0, 10)

    // resolve or create customer for loyalty
    let customerId = null
    let customerPoints = 0
    if (customer_phone) {
      const phone = customer_phone.startsWith('+') ? customer_phone : '+62' + customer_phone.replace(/^0/, '')
      const existing = await client.query(
        'SELECT id, points_balance FROM customers WHERE phone = $1', [phone])
      if (existing.rows.length) {
        customerId = existing.rows[0].id
        customerPoints = existing.rows[0].points_balance
        if (customer_name) {
          await client.query('UPDATE customers SET name = $1, last_visit = $2 WHERE id = $3',
            [customer_name, bookingDate, customerId])
        }
      } else {
        const ins = await client.query(
          `INSERT INTO customers (phone, name) VALUES ($1, $2) RETURNING id, points_balance`,
          [phone, customer_name || null])
        customerId = ins.rows[0].id
      }
    }

    // resolve barber
    let barberId = barber_id
    let resolvedSource = source === 'any_available' || !barber_id ? 'any_available' : 'walk_in'
    if (!barberId || barberId === 'any') {
      barberId = await assignAnyAvailable(client, branchId, bookingDate)
      resolvedSource = 'any_available'
      if (!barberId) return res.status(409).json({ message: 'No available barbers' })
    }

    // fetch branch services (validates + gets price)
    const svcRows = await client.query(
      `SELECT s.id, COALESCE(bs.price, s.base_price) AS price, s.duration_minutes
       FROM services s
       JOIN branch_services bs ON bs.service_id = s.id AND bs.branch_id = $1
       WHERE s.id = ANY($2::uuid[]) AND bs.is_available = true AND s.is_active = true`,
      [branchId, service_ids]
    )
    if (svcRows.rows.length !== service_ids.length) {
      return res.status(400).json({ message: 'One or more services unavailable at this branch' })
    }

    const subtotal = svcRows.rows.reduce((a, s) => a + parseInt(s.price), 0)

    // extras (inventory items sold at kiosk)
    let extrasRows = []
    if (extra_ids.length) {
      const ex = await client.query(
        `SELECT ii.id, ii.name, ist.price
         FROM inventory_items ii
         JOIN inventory_stock ist ON ist.item_id = ii.id AND ist.branch_id = $2
         WHERE ii.id = ANY($1::uuid[]) AND ist.kiosk_visible = true AND ist.price IS NOT NULL`,
        [extra_ids, branchId])
      extrasRows = ex.rows
    }
    const extrasTotal = extrasRows.reduce((a, e) => a + parseInt(e.price || 0), 0)

    // points redemption
    let pointsRedeemed = 0
    let pointsDiscount = 0
    const gs = await client.query('SELECT points_earn_rate, points_redemption_rate FROM global_settings LIMIT 1')
    const gsRow = gs.rows[0]
    if (use_points && customerId && customerPoints > 0 && gsRow) {
      const redeemRate = gsRow.points_redemption_rate || 10000
      if (customerPoints >= 1) {
        pointsRedeemed = customerPoints
        pointsDiscount = pointsRedeemed * redeemRate
        if (pointsDiscount > subtotal) {
          pointsDiscount = subtotal
          pointsRedeemed = Math.ceil(pointsDiscount / redeemRate)
        }
        const redeemRes = await client.query(
          'UPDATE customers SET points_balance = points_balance - $1, points_last_activity_at = NOW() WHERE id = $2 RETURNING points_balance',
          [pointsRedeemed, customerId])
        await client.query(
          `INSERT INTO point_transactions (customer_id, type, points, balance_after, note)
           VALUES ($1,'redeem',$2,$3,'redeemed at kiosk')`,
          [customerId, -pointsRedeemed, redeemRes.rows[0].points_balance])
      }
    }

    // auto_cancel_at
    const branchRow = await client.query('SELECT auto_cancel_minutes FROM branches WHERE id = $1', [branchId])
    const autoCancelMin = branchRow.rows[0]?.auto_cancel_minutes ?? null
    const isNow = !slot_time || slot_time === 'Now'

    const bookingNumber = await nextBookingNumber(client, branchId, bookingDate)

    const bkInsert = await client.query(
      `INSERT INTO bookings
         (booking_number, branch_id, customer_id, barber_id, scheduled_at, status, source,
          guest_name, guest_phone, points_redeemed, notes, auto_cancel_at)
       VALUES ($1,$2,$3,$4,$5,'confirmed',$6,$7,$8,$9,$10,
         CASE WHEN $11::int IS NOT NULL AND NOT $12::boolean
              THEN NOW() + ($11::int || ' minutes')::interval
              ELSE NULL END)
       RETURNING *`,
      [bookingNumber, branchId, customerId, barberId,
       scheduledAt(bookingDate, slot_time),
       resolvedSource,
       customer_name || null,
       customer_phone || null,
       pointsRedeemed, notes || null,
       autoCancelMin, isNow]
    )
    const booking = bkInsert.rows[0]

    // insert booking_services
    for (const svc of svcRows.rows) {
      await client.query(
        'INSERT INTO booking_services (booking_id, service_id, price_charged) VALUES ($1,$2,$3)',
        [booking.id, svc.id, svc.price])
    }

    // insert booking_extras
    for (const ex of extrasRows) {
      await client.query(
        'INSERT INTO booking_extras (booking_id, item_id, quantity, price) VALUES ($1,$2,1,$3)',
        [booking.id, ex.id, ex.price])
    }

    await client.query('COMMIT')

    const total = subtotal + extrasTotal - pointsDiscount
    const resp = {
      ...booking,
      total_amount: total,
      subtotal,
      extras_total: extrasTotal,
      points_discount: pointsDiscount,
      slot_time: isNow ? null : slot_time,
      date: bookingDate
    }

    emitEvent(branchId, 'new_booking', resp)
    res.status(201).json(resp)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
})

// ── GET /api/bookings ──────────────────────────────────────────────────────────

router.get('/', requireKioskOrAdmin, branchScope, async (req, res) => {
  try {
    const { date, status, barber_id } = req.query
    const conditions = []; const params = []; let idx = 1

    if (req.branchId) { conditions.push(`bk.branch_id = $${idx++}`); params.push(req.branchId) }
    if (date)         { conditions.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $${idx++}`); params.push(date) }
    if (status)       { conditions.push(`bk.status = $${idx++}`);    params.push(status) }
    if (barber_id)    { conditions.push(`bk.barber_id = $${idx++}`); params.push(barber_id) }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT bk.*,
              b.name AS barber_name,
              c.name AS customer_name, c.phone AS customer_phone,
              COALESCE(s_total.total, 0) AS subtotal,
              COALESCE(e_total.total, 0) AS extras_total,
              COALESCE(s_total.total, 0) + COALESCE(e_total.total, 0) -
                (bk.points_redeemed * COALESCE(gs.points_redemption_rate, 10000)) AS total_amount,
              (bk.scheduled_at AT TIME ZONE 'Asia/Makassar')::time::text AS slot_time,
              (bk.scheduled_at AT TIME ZONE 'Asia/Makassar')::date AS date
       FROM bookings bk
       LEFT JOIN barbers b ON b.id = bk.barber_id
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN (SELECT booking_id, SUM(price_charged) AS total FROM booking_services GROUP BY booking_id) s_total ON s_total.booking_id = bk.id
       LEFT JOIN (SELECT booking_id, SUM(price) AS total FROM booking_extras GROUP BY booking_id) e_total ON e_total.booking_id = bk.id
       CROSS JOIN LATERAL (SELECT points_redemption_rate FROM global_settings LIMIT 1) gs
       ${where}
       ORDER BY bk.scheduled_at ASC`,
      params)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── GET /api/bookings/:id ──────────────────────────────────────────────────────

router.get('/:id', requireKioskOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT bk.*,
              b.name AS barber_name,
              c.name AS customer_name, c.phone AS customer_phone, c.points_balance,
              (bk.scheduled_at AT TIME ZONE 'Asia/Makassar')::time::text AS slot_time,
              (bk.scheduled_at AT TIME ZONE 'Asia/Makassar')::date AS date,
              COALESCE(s_total.total, 0) AS subtotal,
              COALESCE(e_total.total, 0) AS extras_total,
              COALESCE(s_total.total, 0) + COALESCE(e_total.total, 0) -
                (bk.points_redeemed * COALESCE(gs.points_redemption_rate, 10000)) AS total_amount,
              json_agg(DISTINCT jsonb_build_object('service_id', bs.service_id, 'name', s.name, 'price', bs.price_charged, 'duration_min', s.duration_minutes)) FILTER (WHERE bs.id IS NOT NULL) AS services,
              json_agg(DISTINCT jsonb_build_object('item_id', be.item_id, 'name', ii.name, 'price', be.price, 'qty', be.quantity)) FILTER (WHERE be.id IS NOT NULL) AS extras
       FROM bookings bk
       LEFT JOIN barbers b ON b.id = bk.barber_id
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN booking_services bs ON bs.booking_id = bk.id
       LEFT JOIN services s ON s.id = bs.service_id
       LEFT JOIN booking_extras be ON be.booking_id = bk.id
       LEFT JOIN inventory_items ii ON ii.id = be.item_id
       LEFT JOIN (SELECT booking_id, SUM(price_charged) AS total FROM booking_services GROUP BY booking_id) s_total ON s_total.booking_id = bk.id
       LEFT JOIN (SELECT booking_id, SUM(price) AS total FROM booking_extras GROUP BY booking_id) e_total ON e_total.booking_id = bk.id
       CROSS JOIN LATERAL (SELECT points_redemption_rate FROM global_settings LIMIT 1) gs
       WHERE bk.id = $1
       GROUP BY bk.id, b.name, c.name, c.phone, c.points_balance, s_total.total, e_total.total, gs.points_redemption_rate`,
      [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── PATCH /api/bookings/:id/start ─────────────────────────────────────────────

router.patch('/:id/start', requireKiosk, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE bookings SET status = 'in_progress', started_at = NOW()
       WHERE id = $1 AND status = 'confirmed' RETURNING *`,
      [req.params.id])
    if (!rows.length) return res.status(409).json({ message: 'Cannot start booking' })
    await pool.query(`UPDATE barbers SET status = 'in_service' WHERE id = $1`, [rows[0].barber_id])
    emitEvent(rows[0].branch_id, 'booking_started', rows[0])
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── PATCH /api/bookings/:id/complete ──────────────────────────────────────────

router.patch('/:id/complete', requireKiosk, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE bookings SET status = 'pending_payment', completed_at = NOW()
       WHERE id = $1 AND status = 'in_progress' RETURNING *`,
      [req.params.id])
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Cannot complete' }) }
    const booking = rows[0]

    // barber back to available
    await client.query(`UPDATE barbers SET status = 'available' WHERE id = $1`, [booking.barber_id])

    // earn points
    const gs = await client.query('SELECT points_earn_rate, points_redemption_rate FROM global_settings LIMIT 1')
    const gsRow = gs.rows[0]
    if (gsRow && booking.customer_id) {
      const totalRows = await client.query(
        `SELECT COALESCE(SUM(price_charged),0) AS total FROM booking_services WHERE booking_id = $1`, [booking.id])
      const svcTotal = parseFloat(totalRows.rows[0].total)
      const earned = Math.floor(svcTotal * (gsRow.points_earn_rate || 0.0001))
      if (earned > 0) {
        const earnRes = await client.query(
          'UPDATE customers SET points_balance = points_balance + $1, points_last_activity_at = NOW(), total_visits = total_visits + 1, last_visit = CURRENT_DATE WHERE id = $2 RETURNING points_balance',
          [earned, booking.customer_id])
        await client.query(
          `INSERT INTO point_transactions (customer_id, booking_id, type, points, balance_after, note)
           VALUES ($1,$2,'earn',$3,$4,'service completed')`,
          [booking.customer_id, booking.id, earned, earnRes.rows[0].points_balance])
        await client.query('UPDATE bookings SET points_earned = $1 WHERE id = $2', [earned, booking.id])
      }
    }

    // deduct inventory consumables
    const svcs = await client.query('SELECT service_id FROM booking_services WHERE booking_id = $1', [booking.id])
    for (const svc of svcs.rows) {
      const consumables = await client.query(
        'SELECT item_id, qty_per_use FROM service_consumables WHERE service_id = $1', [svc.service_id])
      for (const c of consumables.rows) {
        await client.query(
          'UPDATE inventory_stock SET current_stock = GREATEST(current_stock - $1, 0) WHERE item_id = $2 AND branch_id = $3',
          [c.qty_per_use, c.item_id, booking.branch_id])
        await client.query(
          `INSERT INTO inventory_movements (item_id, branch_id, movement_type, quantity, note)
           VALUES ($1,$2,'out',$3,'service_use')`,
          [c.item_id, booking.branch_id, c.qty_per_use])
      }
    }

    await client.query('COMMIT')
    const totalResult = await pool.query(
      'SELECT COALESCE(SUM(price_charged),0) AS total FROM booking_services WHERE booking_id = $1', [booking.id])
    const extrasResult = await pool.query(
      'SELECT COALESCE(SUM(price),0) AS total FROM booking_extras WHERE booking_id = $1', [booking.id])
    const totalAmount = parseFloat(totalResult.rows[0].total) + parseFloat(extrasResult.rows[0].total)
    emitEvent(booking.branch_id, 'payment_trigger', { booking_id: booking.id, amount: totalAmount })
    res.json({ ...booking, total_amount: totalAmount })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
})

// ── PATCH /api/bookings/:id/cancel ────────────────────────────────────────────

router.patch('/:id/cancel', requireKioskOrAdmin, async (req, res) => {
  try {
    const { reason } = req.body
    const { rows } = await pool.query(
      `UPDATE bookings SET status = 'cancelled', cancellation_reason = $2
       WHERE id = $1 AND status IN ('confirmed','in_progress') RETURNING *`,
      [req.params.id, reason || null])
    if (!rows.length) return res.status(409).json({ message: 'Cannot cancel' })
    emitEvent(rows[0].branch_id, 'booking_cancelled', rows[0])
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── PATCH /api/bookings/:id/no-show ───────────────────────────────────────────

router.patch('/:id/no-show', requireKioskOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE bookings SET status = 'no_show'
       WHERE id = $1 AND status = 'confirmed' RETURNING *`,
      [req.params.id])
    if (!rows.length) return res.status(409).json({ message: 'Cannot mark no-show' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── POST /api/bookings/:id/client-not-arrived ─────────────────────────────────

router.post('/:id/client-not-arrived', requireKiosk, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE bookings SET client_not_arrived_at = NOW()
       WHERE id = $1 AND status = 'confirmed' AND client_not_arrived_at IS NULL RETURNING *`,
      [req.params.id])
    if (!rows.length) return res.status(409).json({ message: 'Already flagged or invalid status' })
    emitEvent(rows[0].branch_id, 'client_not_arrived', rows[0])
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── PATCH /api/bookings/:id/stop-escalation ───────────────────────────────────

router.patch('/:id/stop-escalation', requireKioskOrAdmin, async (req, res) => {
  try {
    const { reason, stopped_by } = req.body
    const { rows } = await pool.query(
      `UPDATE bookings SET escalation_stopped_at = NOW(),
         escalation_stop_reason = $2, escalation_stopped_by = $3
       WHERE id = $1 RETURNING *`,
      [req.params.id, reason || 'admin_cancelled', stopped_by || null])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── PATCH /api/bookings/:id/trigger-payment ───────────────────────────────────

router.patch('/:id/trigger-payment', requireKiosk, async (req, res) => {
  try {
    const bk = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id])
    if (!bk.rows.length) return res.status(404).json({ message: 'Not found' })
    const totalResult = await pool.query(
      'SELECT COALESCE(SUM(price_charged),0) AS total FROM booking_services WHERE booking_id = $1', [req.params.id])
    const amount = parseFloat(totalResult.rows[0].total)
    emitEvent(bk.rows[0].branch_id, 'payment_trigger', { booking_id: req.params.id, amount })
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── POST /api/bookings/:id/rate ────────────────────────────────────────────────

router.post('/:id/rate', requireKiosk, async (req, res) => {
  try {
    const { rating, feedback_tag_ids = [], comment } = req.body
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating 1-5 required' })
    const tags = feedback_tag_ids.length ? feedback_tag_ids : null
    await pool.query(
      'UPDATE bookings SET rating = $1, review_tags = $2 WHERE id = $3',
      [rating, tags, req.params.id])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── POST /api/bookings/:id/add-services ───────────────────────────────────────

router.post('/:id/add-services', requireKiosk, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { service_ids = [] } = req.body
    const bk = await client.query('SELECT * FROM bookings WHERE id = $1', [req.params.id])
    if (!bk.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Not found' }) }
    const booking = bk.rows[0]

    const svcRows = await client.query(
      `SELECT s.id, COALESCE(bs.price, s.base_price) AS price
       FROM services s
       JOIN branch_services bs ON bs.service_id = s.id AND bs.branch_id = $1
       WHERE s.id = ANY($2::uuid[]) AND bs.is_available = true`,
      [booking.branch_id, service_ids])

    for (const svc of svcRows.rows) {
      await client.query(
        'INSERT INTO booking_services (booking_id, service_id, price_charged, added_mid_cut) VALUES ($1,$2,$3,true) ON CONFLICT DO NOTHING',
        [booking.id, svc.id, svc.price])
    }

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

module.exports = router
