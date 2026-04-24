const router = require('express').Router()
const pool   = require('../config/db')
const { requireAdmin, requireKiosk, requireKioskOrAdmin } = require('../middleware/auth')
const { branchScope, requireBranch } = require('../middleware/branchScope')
const { emitEvent } = require('./events')
const { notifyBookingConfirmed, notifyBarberNewBooking } = require('../services/notifications')

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

async function assignRoundRobin(client, branchId, scheduledISO, durationMin) {
  // Get active barbers in sort order
  const { rows: barbers } = await client.query(
    `SELECT id FROM barbers
     WHERE branch_id = $1 AND is_active = true AND status NOT IN ('clocked_out','off')
     ORDER BY name ASC`,
    [branchId]
  )
  if (!barbers.length) return null

  // Find barbers free at the requested time
  const { rows: freeRows } = await client.query(
    `SELECT b.id FROM barbers b
     WHERE b.branch_id = $1 AND b.is_active = true AND b.status NOT IN ('clocked_out','off')
       AND NOT EXISTS (
         SELECT 1 FROM bookings bk
         JOIN (
           SELECT bsv.booking_id, SUM(s.duration_minutes) AS total_dur
           FROM booking_services bsv JOIN services s ON s.id = bsv.service_id
           GROUP BY bsv.booking_id
         ) dur ON dur.booking_id = bk.id
         WHERE bk.barber_id = b.id
           AND bk.status IN ('confirmed','in_progress')
           AND bk.scheduled_at < $2::timestamptz + ($3 * INTERVAL '1 minute')
           AND bk.scheduled_at + ((dur.total_dur + 5) * INTERVAL '1 minute') > $2::timestamptz
       )`,
    [branchId, scheduledISO, durationMin]
  )
  if (!freeRows.length) return null

  const freeIds = new Set(freeRows.map(r => r.id))

  // Last booking today (any source) determines whose turn is next
  const { rows: lastRows } = await client.query(
    `SELECT barber_id FROM bookings
     WHERE branch_id = $1
       AND DATE(created_at AT TIME ZONE 'Asia/Makassar') = (NOW() AT TIME ZONE 'Asia/Makassar')::date
       AND status NOT IN ('cancelled','no_show')
     ORDER BY created_at DESC, booking_number DESC LIMIT 1`,
    [branchId]
  )
  const lastBarberId = lastRows[0]?.barber_id
  const lastIdx = lastBarberId ? barbers.findIndex(b => b.id === lastBarberId) : -1

  for (let i = 1; i <= barbers.length; i++) {
    const idx = (lastIdx + i) % barbers.length
    if (freeIds.has(barbers[idx].id)) return barbers[idx].id
  }
  return null
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
      source = 'walk_in',
      group_id = null
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
    let resolvedSource = 'walk_in'
    if (source === 'any_available' || !barberId || barberId === 'any') {
      resolvedSource = 'any_available'
      const durRes = await client.query(
        `SELECT COALESCE(SUM(s.duration_minutes), 30) AS dur FROM services s WHERE s.id = ANY($1::uuid[])`,
        [service_ids]
      )
      const totalDur   = parseInt(durRes.rows[0]?.dur || 30)
      const scheduledISO = scheduledAt(bookingDate, slot_time)
      barberId = await assignRoundRobin(client, branchId, scheduledISO, totalDur)
      if (!barberId) return res.status(409).json({ message: 'No available barbers at that time' })
    } else {
      const barberCheck = await client.query(
        `SELECT status FROM barbers WHERE id = $1 AND is_active = true`, [barberId])
      if (!barberCheck.rows.length) return res.status(404).json({ message: 'Barber not found' })
      if (['clocked_out', 'off'].includes(barberCheck.rows[0].status)) {
        return res.status(409).json({ message: 'Barber is not available' })
      }
    }

    // fetch branch services (validates + gets price)
    const svcRows = await client.query(
      `SELECT s.id, COALESCE(bs.price, s.base_price) AS price, s.duration_minutes
       FROM services s
       LEFT JOIN branch_services bs ON bs.service_id = s.id AND bs.branch_id = $1
       WHERE s.id = ANY($2::uuid[]) AND COALESCE(bs.is_available, true) = true AND s.is_active = true`,
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
          guest_name, guest_phone, points_redeemed, notes, auto_cancel_at, group_id)
       VALUES ($1,$2,$3,$4,$5,'confirmed',$6,$7,$8,$9,$10,
         CASE WHEN $11::int IS NOT NULL AND NOT $12::boolean
              THEN $5::timestamptz + ($11::int || ' minutes')::interval
              ELSE NULL END,
         $13)
       RETURNING *`,
      [bookingNumber, branchId, customerId, barberId,
       scheduledAt(bookingDate, slot_time),
       resolvedSource,
       customer_name || null,
       customer_phone || null,
       pointsRedeemed, notes || null,
       autoCancelMin, isNow,
       group_id || null]
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

    // Fetch barber name and build service names for the response + notifications
    const barberRow = await pool.query('SELECT name FROM barbers WHERE id = $1', [barberId])
    const barberName = barberRow.rows[0]?.name || ''
    const svcNameRows = await pool.query(
      'SELECT name FROM services WHERE id = ANY($1::uuid[])', [service_ids])
    const serviceNames = svcNameRows.rows.map(r => r.name).join(', ')

    const total = subtotal + extrasTotal - pointsDiscount
    const resp = {
      ...booking,
      total_amount: total,
      subtotal,
      extras_total: extrasTotal,
      points_discount: pointsDiscount,
      slot_time: isNow ? null : slot_time,
      date: bookingDate,
      barber_name: barberName,
      service_names: serviceNames
    }

    emitEvent(branchId, 'new_booking', resp)
    
    // Async notification
    notifyBookingConfirmed(resp).catch(e => console.error('[Notification] Confirmed failed:', e))
    notifyBarberNewBooking(resp).catch(e => console.error('[Notification] Barber alert failed:', e))

    res.status(201).json(resp)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
})

// ── GET /api/bookings/public ──────────────────────────────────────────────────
router.get('/public', async (req, res) => {
  try {
    const { branch_id, date } = req.query
    if (!branch_id) return res.status(400).json({ message: 'branch_id required' })

    const targetDate = date || new Date().toISOString().slice(0, 10)

    const { rows } = await pool.query(
      `SELECT bk.id, bk.booking_number, bk.status, bk.scheduled_at, bk.started_at,
              bk.barber_id, b.name AS barber_name,
              (SELECT label FROM chairs ch 
               LEFT JOIN chair_overrides co ON co.chair_id = ch.id AND co.resolved_by IS NULL
               WHERE ch.barber_id = b.id OR co.barber_id = b.id 
               LIMIT 1) AS chair_label,
              COALESCE(bk.guest_name, c.name) AS customer_name,
              svc_names.service_names,
              COALESCE(svc_names.est_duration_min, 30) AS est_duration_min
       FROM bookings bk
       LEFT JOIN barbers b ON b.id = bk.barber_id
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN (
          SELECT bs.booking_id, 
                 STRING_AGG(s.name, ', ') AS service_names,
                 SUM(s.duration_minutes) AS est_duration_min
          FROM booking_services bs 
          JOIN services s ON s.id = bs.service_id
          GROUP BY bs.booking_id
        ) svc_names ON svc_names.booking_id = bk.id
       WHERE bk.branch_id = $1 
         AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
         AND bk.status IN ('confirmed', 'in_progress')
       ORDER BY bk.scheduled_at ASC`,
      [branch_id, targetDate])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
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
              COALESCE(c.name, bk.guest_name) AS customer_name, c.phone AS customer_phone,
              COALESCE(s_total.total, 0) AS subtotal,
              COALESCE(e_total.total, 0) AS extras_total,
              COALESCE(s_total.total, 0) + COALESCE(e_total.total, 0) -
                (bk.points_redeemed * COALESCE(gs.points_redemption_rate, 10000)) AS total_amount,
              (bk.scheduled_at AT TIME ZONE 'Asia/Makassar')::time::text AS slot_time,
              (bk.started_at AT TIME ZONE 'Asia/Makassar')::time::text AS started_time,
              (bk.scheduled_at AT TIME ZONE 'Asia/Makassar')::date AS date,
              svc_names.booking_services,
              svc_names.service_names,
              COALESCE(svc_names.est_duration_min, 30) AS est_duration_min,
              COALESCE(t.amount, 0) AS tip,
              ext_agg.booking_extras
       FROM bookings bk
       LEFT JOIN barbers b ON b.id = bk.barber_id
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN tips t ON t.booking_id = bk.id
       LEFT JOIN (SELECT booking_id, SUM(price_charged) AS total FROM booking_services GROUP BY booking_id) s_total ON s_total.booking_id = bk.id
       LEFT JOIN (SELECT booking_id, SUM(price) AS total FROM booking_extras GROUP BY booking_id) e_total ON e_total.booking_id = bk.id
       LEFT JOIN (
          SELECT bs.booking_id,
                 json_agg(jsonb_build_object(
                   'id', bs.id,
                   'service_id', bs.service_id,
                   'name', s.name,
                   'price', bs.price_charged,
                   'added_mid_cut', bs.added_mid_cut,
                   'commission_rate', COALESCE(bar_svc.commission_rate, brs.commission_rate, b_inner.commission_rate, 35)
                 )) AS booking_services,
                 STRING_AGG(s.name, ', ') AS service_names,
                 SUM(s.duration_minutes) AS est_duration_min
          FROM booking_services bs
          JOIN services s ON s.id = bs.service_id
          JOIN bookings bk_inner ON bk_inner.id = bs.booking_id
          JOIN barbers b_inner ON b_inner.id = bk_inner.barber_id
          LEFT JOIN branch_services brs ON brs.service_id = bs.service_id AND brs.branch_id = bk_inner.branch_id
          LEFT JOIN barber_services bar_svc ON bar_svc.barber_id = bk_inner.barber_id AND bar_svc.service_id = bs.service_id
          GROUP BY bs.booking_id
        ) svc_names ON svc_names.booking_id = bk.id
       LEFT JOIN (
          SELECT be.booking_id,
                 json_agg(jsonb_build_object(
                   'id', be.id,
                   'item_id', be.item_id,
                   'name', ii.name,
                   'price', be.price,
                   'quantity', be.quantity
                 )) AS booking_extras
          FROM booking_extras be
          JOIN inventory_items ii ON ii.id = be.item_id
          GROUP BY be.booking_id
        ) ext_agg ON ext_agg.booking_id = bk.id
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
              COALESCE(c.name, bk.guest_name) AS customer_name, c.phone AS customer_phone, c.points_balance,
              (bk.scheduled_at AT TIME ZONE 'Asia/Makassar')::time::text AS slot_time,
              (bk.scheduled_at AT TIME ZONE 'Asia/Makassar')::date AS date,
              COALESCE(s_total.total, 0) AS subtotal,
              COALESCE(e_total.total, 0) AS extras_total,
              COALESCE(s_total.total, 0) + COALESCE(e_total.total, 0) -
                (bk.points_redeemed * COALESCE(gs.points_redemption_rate, 10000)) AS total_amount,
              json_agg(DISTINCT jsonb_build_object(
                'service_id', bs.service_id, 
                'name', s.name, 
                'price', bs.price_charged, 
                'duration_min', s.duration_minutes, 
                'added_mid_cut', bs.added_mid_cut,
                'commission_rate', COALESCE(bar_svc.commission_rate, brs.commission_rate, b.commission_rate, 35)
              )) FILTER (WHERE bs.id IS NOT NULL) AS services,
              json_agg(DISTINCT jsonb_build_object('item_id', be.item_id, 'name', ii.name, 'price', be.price, 'qty', be.quantity)) FILTER (WHERE be.id IS NOT NULL) AS extras
       FROM bookings bk
       LEFT JOIN barbers b ON b.id = bk.barber_id
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN booking_services bs ON bs.booking_id = bk.id
       LEFT JOIN services s ON s.id = bs.service_id
       LEFT JOIN branch_services brs ON brs.service_id = bs.service_id AND brs.branch_id = bk.branch_id
       LEFT JOIN barber_services bar_svc ON bar_svc.barber_id = bk.barber_id AND bar_svc.service_id = bs.service_id
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

router.patch('/:id/start', requireKioskOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE bookings SET status = 'in_progress', started_at = NOW()
       WHERE id = $1 AND status = 'confirmed' RETURNING *`,
      [req.params.id])
    if (!rows.length) return res.status(409).json({ message: 'Cannot start booking' })
    await pool.query(`UPDATE barbers SET status = 'in_service' WHERE id = $1`, [rows[0].barber_id])
    emitEvent(rows[0].branch_id, 'barber_update', { barber_id: rows[0].barber_id, status: 'busy' })
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
    if (!rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Booking not found or not in progress' })
    }
    const booking = rows[0]

    // Auto-set barber back to available
    await client.query("UPDATE barbers SET status = 'available' WHERE id = $1", [booking.barber_id])
    const { emitEvent } = require('./events')
    emitEvent(booking.branch_id, 'barber_update', { barber_id: booking.barber_id, status: 'available' })

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
          'UPDATE inventory_stock SET current_stock = GREATEST(current_stock - $1, 0), updated_at = NOW() WHERE item_id = $2 AND branch_id = $3',
          [c.qty_per_use, c.item_id, booking.branch_id])
        await client.query(
          `INSERT INTO inventory_movements (item_id, branch_id, movement_type, quantity, note)
           VALUES ($1,$2,'out',$3,'service_use')`,
          [c.item_id, booking.branch_id, c.qty_per_use])
      }
    }

    // deduct inventory extras (products/beverages sold)
    const extras = await client.query('SELECT item_id, quantity FROM booking_extras WHERE booking_id = $1', [booking.id])
    for (const ex of extras.rows) {
      await client.query(
        'UPDATE inventory_stock SET current_stock = GREATEST(current_stock - $1, 0), updated_at = NOW() WHERE item_id = $2 AND branch_id = $3',
        [ex.quantity, ex.item_id, booking.branch_id])
      await client.query(
        `INSERT INTO inventory_movements (item_id, branch_id, movement_type, quantity, note)
         VALUES ($1,$2,'out',$3,'sale')`,
        [ex.item_id, booking.branch_id, ex.quantity])
    }

    await client.query('COMMIT')
    const totalResult = await pool.query(
      'SELECT COALESCE(SUM(price_charged),0) AS total FROM booking_services WHERE booking_id = $1', [booking.id])
    const extrasResult = await pool.query(
      'SELECT COALESCE(SUM(price),0) AS total FROM booking_extras WHERE booking_id = $1', [booking.id])
    const totalAmount = parseFloat(totalResult.rows[0].total) + parseFloat(extrasResult.rows[0].total)

    if (booking.group_id) {
      const { rows: gStats } = await pool.query(
        `SELECT COUNT(*) FILTER (WHERE status NOT IN ('pending_payment','completed','cancelled','no_show')) AS still_active
         FROM bookings WHERE group_id = $1`, [booking.group_id])
      if (parseInt(gStats[0].still_active) === 0) {
        const { rows: gbs } = await pool.query(
          `SELECT b.id,
                  COALESCE(s.total,0) + COALESCE(e.total,0) - (b.points_redeemed * COALESCE(gs.points_redemption_rate,10000)) AS amt
           FROM bookings b
           LEFT JOIN (SELECT booking_id, SUM(price_charged) AS total FROM booking_services GROUP BY booking_id) s ON s.booking_id = b.id
           LEFT JOIN (SELECT booking_id, SUM(price*quantity) AS total FROM booking_extras GROUP BY booking_id) e ON e.booking_id = b.id
           CROSS JOIN LATERAL (SELECT points_redemption_rate FROM global_settings LIMIT 1) gs
           WHERE b.group_id = $1`, [booking.group_id])
        const groupTotal = gbs.reduce((s, r) => s + parseFloat(r.amt), 0)
        emitEvent(booking.branch_id, 'payment_trigger', {
          group_id: booking.group_id,
          booking_ids: gbs.map(r => r.id),
          amount: groupTotal
        })
      }
    } else {
      emitEvent(booking.branch_id, 'payment_trigger', { booking_id: booking.id, id: booking.id, amount: totalAmount })
    }

    res.json({ ...booking, booking_id: booking.id, total_amount: totalAmount })
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
       WHERE id = $1 AND status IN ('confirmed','in_progress','pending_payment') RETURNING *`,
      [req.params.id, reason || null])
    if (!rows.length) return res.status(409).json({ message: 'Cannot cancel' })
    
    // Auto-set barber back to available if it was in progress
    await pool.query("UPDATE barbers SET status = 'available' WHERE id = $1", [rows[0].barber_id])
    emitEvent(rows[0].branch_id, 'barber_update', { barber_id: rows[0].barber_id, status: 'available' })
    
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

// ── PATCH /api/bookings/:id/add-services ───────────────────────────────────────

router.patch('/:id/add-services', requireKiosk, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { service_ids = [] } = req.body
    const bk = await client.query('SELECT * FROM bookings WHERE id = $1', [req.params.id])
    if (!bk.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Not found' }) }
    const booking = bk.rows[0]

    const existingRes = await client.query('SELECT service_id FROM booking_services WHERE booking_id = $1', [booking.id])
    const existingIds = existingRes.rows.map(r => r.service_id)
    const newIds = service_ids.filter(id => !existingIds.includes(id))

    if (newIds.length) {
      const svcRows = await client.query(
        `SELECT s.id, COALESCE(bs.price, s.base_price) AS price
         FROM services s
         LEFT JOIN branch_services bs ON bs.service_id = s.id AND bs.branch_id = $1
         WHERE s.id = ANY($2::uuid[]) AND COALESCE(bs.is_available, true) = true AND s.is_active = true`,
        [booking.branch_id, newIds])

      for (const svc of svcRows.rows) {
        await client.query(
          'INSERT INTO booking_services (booking_id, service_id, price_charged, added_mid_cut) VALUES ($1,$2,$3,true)',
          [booking.id, svc.id, svc.price])
      }
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

// ── PATCH /api/bookings/:id/add-extras ───────────────────────────────────────
router.patch('/:id/add-extras', requireKiosk, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { item_ids = [] } = req.body
    const bk = await client.query('SELECT * FROM bookings WHERE id = $1', [req.params.id])
    if (!bk.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Not found' }) }
    const booking = bk.rows[0]

    const itemRows = await client.query(
      `SELECT ii.id, ist.price FROM inventory_items ii
       JOIN inventory_stock ist ON ist.item_id = ii.id AND ist.branch_id = $1
       WHERE ii.id = ANY($2::uuid[]) AND ist.current_stock > 0 AND ist.price IS NOT NULL`,
      [booking.branch_id, item_ids])

    for (const item of itemRows.rows) {
      await client.query(
        'INSERT INTO booking_extras (booking_id, item_id, quantity, price) VALUES ($1,$2,1,$3)',
        [booking.id, item.id, item.price])
    }

    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally { client.release() }
})

// ── DELETE /api/bookings/:id/extras/:extra_id ────────────────────────────────
router.delete('/:id/extras/:extra_id', requireKiosk, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM booking_extras WHERE id = $1 AND booking_id = $2 RETURNING *`,
      [req.params.extra_id, req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Extra not found' })
    const bk = await pool.query('SELECT branch_id FROM bookings WHERE id = $1', [req.params.id])
    if (bk.rows.length) emitEvent(bk.rows[0].branch_id, 'booking_updated', { id: req.params.id })
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── PATCH /api/bookings/:id/set-group ────────────────────────────────────────
router.patch('/:id/set-group', requireKiosk, async (req, res) => {
  try {
    const { group_id } = req.body
    if (!group_id) return res.status(400).json({ message: 'group_id required' })
    const { rows } = await pool.query(
      'UPDATE bookings SET group_id = $1 WHERE id = $2 RETURNING id, group_id',
      [group_id, req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Booking not found' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── PATCH /api/bookings/:id/admin-update ─────────────────────────────────────
router.patch('/:id/admin-update', requireAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const bkRes = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND status IN ('confirmed','in_progress','pending_payment')`,
      [req.params.id])
    if (!bkRes.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Booking not found or not editable' })
    }
    const booking = bkRes.rows[0]
    const { barber_id, add_service_ids = [], remove_service_ids = [], scheduled_at } = req.body

    const updates = []
    const uVals   = []
    let   uIdx    = 1
    if (barber_id && barber_id !== booking.barber_id) {
      updates.push(`barber_id = $${uIdx++}`); uVals.push(barber_id)
    }
    if (scheduled_at) {
      updates.push(`scheduled_at = $${uIdx++}`); uVals.push(scheduled_at)
    }
    if (updates.length) {
      uVals.push(booking.id)
      await client.query(`UPDATE bookings SET ${updates.join(', ')} WHERE id = $${uIdx}`, uVals)
    }
    if (remove_service_ids.length) {
      await client.query(
        'DELETE FROM booking_services WHERE booking_id = $1 AND service_id = ANY($2::uuid[])',
        [booking.id, remove_service_ids])
    }
    if (add_service_ids.length) {
      const existingRes = await client.query('SELECT service_id FROM booking_services WHERE booking_id = $1', [booking.id])
      const existingIds = existingRes.rows.map(r => r.service_id)
      const newIds = add_service_ids.filter(id => !existingIds.includes(id))
      if (newIds.length) {
        const svcRows = await client.query(
          `SELECT s.id, COALESCE(bs.price, s.base_price) AS price
           FROM services s
           LEFT JOIN branch_services bs ON bs.service_id = s.id AND bs.branch_id = $1
           WHERE s.id = ANY($2::uuid[]) AND s.is_active = true`,
          [booking.branch_id, newIds])
        for (const svc of svcRows.rows) {
          await client.query(
            'INSERT INTO booking_services (booking_id, service_id, price_charged, added_mid_cut) VALUES ($1,$2,$3,true)',
            [booking.id, svc.id, svc.price])
        }
      }
    }
    await client.query('COMMIT')
    emitEvent(booking.branch_id, 'booking_updated', { id: booking.id })
    const updated = await pool.query('SELECT * FROM bookings WHERE id = $1', [booking.id])
    res.json(updated.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally { client.release() }
})

// ── DELETE /api/bookings/:id/services/:service_id ────────────────────────────
router.delete('/:id/services/:service_id', requireKiosk, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM booking_services 
       WHERE booking_id = $1 AND service_id = $2 AND added_mid_cut = true
       RETURNING *`, [req.params.id, req.params.service_id])
    
    if (!rows.length) return res.status(404).json({ message: 'Service not found or cannot be deleted (original service)' })
    
    // Emit update so kiosk refreshes
    const bk = await pool.query('SELECT branch_id FROM bookings WHERE id = $1', [req.params.id])
    if (bk.rows.length) emitEvent(bk.rows[0].branch_id, 'booking_updated', { id: req.params.id })
    
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── POST /api/bookings/admin-force ───────────────────────────────────────────
// Admin-only force create: bypasses barber availability + service branch checks
router.post('/admin-force', requireAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      branch_id, customer_name, customer_phone,
      barber_id, service_ids = [],
      date, time, notes,
    } = req.body

    if (!branch_id)        return res.status(400).json({ message: 'branch_id required' })
    if (!barber_id)        return res.status(400).json({ message: 'barber_id required' })
    if (!service_ids.length) return res.status(400).json({ message: 'At least one service required' })

    const bookingDate = date || new Date().toISOString().slice(0, 10)

    // Resolve or create customer
    let customerId = null
    if (customer_phone) {
      const phone = customer_phone.startsWith('+') ? customer_phone : '+62' + customer_phone.replace(/^0/, '')
      const existing = await client.query('SELECT id FROM customers WHERE phone = $1', [phone])
      if (existing.rows.length) {
        customerId = existing.rows[0].id
        if (customer_name) await client.query('UPDATE customers SET name = $1 WHERE id = $2', [customer_name, customerId])
      } else {
        const ins = await client.query('INSERT INTO customers (phone, name) VALUES ($1,$2) RETURNING id', [phone, customer_name || null])
        customerId = ins.rows[0].id
      }
    }

    // Services — use branch price if available, otherwise base_price (no availability gate)
    const svcRows = await client.query(
      `SELECT s.id, s.name, COALESCE(bs.price, s.base_price) AS price
       FROM services s
       LEFT JOIN branch_services bs ON bs.service_id = s.id AND bs.branch_id = $1
       WHERE s.id = ANY($2::uuid[]) AND s.is_active = true`,
      [branch_id, service_ids])
    if (!svcRows.rows.length) return res.status(400).json({ message: 'No valid services found' })

    const subtotal = svcRows.rows.reduce((a, s) => a + parseInt(s.price), 0)

    const bookingNumber = await nextBookingNumber(client, branch_id, bookingDate)
    const scheduledISO  = scheduledAt(bookingDate, time || null)

    const bkInsert = await client.query(
      `INSERT INTO bookings
         (booking_number, branch_id, customer_id, barber_id, scheduled_at, status, source,
          guest_name, guest_phone, notes)
       VALUES ($1,$2,$3,$4,$5,'confirmed','walk_in',$6,$7,$8)
       RETURNING *`,
      [bookingNumber, branch_id, customerId, barber_id, scheduledISO,
       customer_name || null, customer_phone || null, notes || null])
    const booking = bkInsert.rows[0]

    for (const svc of svcRows.rows) {
      await client.query(
        'INSERT INTO booking_services (booking_id, service_id, price_charged) VALUES ($1,$2,$3)',
        [booking.id, svc.id, svc.price])
    }

    await client.query('COMMIT')

    const barberRow  = await pool.query('SELECT name FROM barbers WHERE id = $1', [barber_id])
    const resp = {
      ...booking,
      total_amount:  subtotal,
      barber_name:   barberRow.rows[0]?.name || '',
      service_names: svcRows.rows.map(r => r.name).join(', '),
    }
    emitEvent(branch_id, 'new_booking', resp)
    res.status(201).json(resp)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally { client.release() }
})

module.exports = router
