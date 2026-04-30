const router  = require('express').Router()
const pool    = require('../config/db')
const { requireAdmin, requireKiosk, requireKioskOrAdmin } = require('../middleware/auth')
const { emitEvent } = require('./events')
const { notifyPaymentReceipt } = require('../services/notifications')
const { awardPoints } = require('../services/loyalty')

const XENDIT_SECRET   = process.env.XENDIT_SECRET_KEY || ''
const XENDIT_TERMINAL_KEY = process.env.XENDIT_TERMINAL_KEY || XENDIT_SECRET  // separate key from Xendit team
const WEBHOOK_TOKEN   = process.env.XENDIT_WEBHOOK_TOKEN || ''
const TERMINAL_URL    = process.env.XENDIT_TERMINAL_URL || 'https://terminal.xendit.co'
const XENDIT_API_URL  = process.env.XENDIT_API_URL || 'https://api.xendit.co'

function xenditHeaders(idempotencyKey) {
  const cred = Buffer.from(XENDIT_TERMINAL_KEY + ':').toString('base64')
  const h = { Authorization: `Basic ${cred}`, 'Content-Type': 'application/json' }
  if (idempotencyKey) h['idempotency-key'] = idempotencyKey
  return h
}

// Terminal H2H helpers (terminal.xendit.co)
async function xenditPost(path, body, idempotencyKey) {
  const r = await fetch(`${TERMINAL_URL}${path}`, {
    method: 'POST', headers: xenditHeaders(idempotencyKey), body: JSON.stringify(body)
  })
  const json = await r.json()
  if (!r.ok) console.error('[Xendit Terminal] POST', path, r.status, json?.error_code, json?.message)
  return json
}

async function xenditGet(path) {
  const r = await fetch(`${TERMINAL_URL}${path}`, { method: 'GET', headers: xenditHeaders() })
  const json = await r.json()
  if (!r.ok) console.error('[Xendit Terminal] GET', path, r.status, json?.error_code)
  return json
}

// Main API helpers (api.xendit.co) — used for QR codes, etc.
function xenditApiHeaders(idempotencyKey) {
  const cred = Buffer.from(XENDIT_SECRET + ':').toString('base64')
  const h = { Authorization: `Basic ${cred}`, 'Content-Type': 'application/json', 'api-version': '2022-07-31' }
  if (idempotencyKey) h['idempotency-key'] = idempotencyKey
  return h
}

async function xenditApiPost(path, body, idempotencyKey) {
  const r = await fetch(`${XENDIT_API_URL}${path}`, {
    method: 'POST', headers: xenditApiHeaders(idempotencyKey), body: JSON.stringify(body)
  })
  const json = await r.json()
  if (!r.ok) console.error('[Xendit API] POST', path, r.status, json?.error_code, json?.message)
  return json
}

async function xenditApiGet(path) {
  const r = await fetch(`${XENDIT_API_URL}${path}`, { method: 'GET', headers: xenditApiHeaders() })
  const json = await r.json()
  if (!r.ok) console.error('[Xendit API] GET', path, r.status, json?.error_code)
  return json
}



function mapXenditPaymentMethod(xenditMethod) {
  if (xenditMethod === 'ID_QRIS') return 'qris'
  if (xenditMethod === 'ID_CONTACTLESS') return 'tap'
  return 'card'
}

const computedTotal = `(
  COALESCE((SELECT SUM(price_charged) FROM booking_services WHERE booking_id = bk.id),0) +
  COALESCE((SELECT SUM(price * quantity) FROM booking_extras WHERE booking_id = bk.id),0) -
  bk.points_redeemed * 10000
)`

// POST /api/payments/terminal/session — initiate Xendit H2H terminal payment
router.post('/terminal/session', requireKiosk, async (req, res) => {
  try {
    const { booking_id, tip_amount = 0, payment_method = 'card', terminal_id } = req.body
    if (!booking_id)  return res.status(400).json({ message: 'booking_id required' })
    if (!terminal_id) return res.status(400).json({ message: 'terminal_id required' })

    const bk = await pool.query(
      `SELECT bk.*, ${computedTotal} AS total_amount FROM bookings bk WHERE bk.id = $1`,
      [booking_id])
    if (!bk.rows.length) return res.status(404).json({ message: 'Booking not found' })
    const booking = bk.rows[0]

    if (booking.payment_status === 'paid') {
      return res.status(409).json({ message: 'Booking is already paid', already_paid: true })
    }

    const total = Math.round(parseFloat(booking.total_amount) + parseFloat(tip_amount || 0))
    const xenditMethod = payment_method === 'tap' ? 'ID_CONTACTLESS' : 'ID_INSERT_CARD'
    const payload = {
      session_type: 'PAY',
      mode: 'TERMINAL',
      currency: 'IDR',
      amount: total,
      country: 'ID',
      reference_id: `bk-${booking_id}`,
      description: `Bercut #${booking_id}`,
      channel_properties: { terminal_id, order_id: booking_id.replace(/-/g, '').slice(0, 16) + Date.now().toString().slice(-4), payment_methods: [xenditMethod] },
      metadata: { booking_id, branch_id: booking.branch_id, tip_amount: parseFloat(tip_amount || 0) }
    }

    const idempotencyKey = `bercut-${booking_id}-${Date.now()}`
    const session = await xenditPost('/v1/terminal/sessions', payload, idempotencyKey)
    if (session.error_code) {
      console.error('[Terminal] Xendit error:', JSON.stringify(session))
      return res.status(502).json({ message: session.message || 'Xendit error', error_code: session.error_code })
    }

    await pool.query('UPDATE bookings SET payment_ref = $1 WHERE id = $2', [session.payment_session_id, booking_id])
    res.json({ session_id: session.payment_session_id, status: session.status })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/payments/terminal/session/:id/status — poll Xendit session status
router.get('/terminal/session/:id/status', requireKiosk, async (req, res) => {
  try {
    const session = await xenditGet(`/v1/terminal/sessions/${req.params.id}`)
    if (session.error_code) return res.status(502).json({ message: session.message, error_code: session.error_code })

    // If completed, mark booking paid in DB (fallback for when webhook doesn't fire)
    if (session.status === 'COMPLETED') {
      const bookingId = session.metadata?.booking_id || resolveBookingId({ reference_id: session.reference_id })
      if (bookingId) {
        const amount = parseFloat(session.amount || 0)
        const payMethod = mapXenditPaymentMethod(session.payment_details?.payment_method)
        await markPaidIfNeeded(bookingId, amount, payMethod, session.payment_session_id)
      } else {
        console.error('[Poll] COMPLETED session but could not resolve booking_id. session_id:', req.params.id, 'reference_id:', session.reference_id)
      }
    }

    res.json({ status: session.status, payment_session_id: session.payment_session_id })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})


// POST /api/payments/terminal/session/:id/retry — retry a failed/canceled session
router.post('/terminal/session/:id/retry', requireKiosk, async (req, res) => {
  try {
    const result = await xenditPost(`/v1/terminal/sessions/${req.params.id}/retry`, {})
    if (result.error_code) return res.status(502).json({ message: result.message, error_code: result.error_code })
    res.json({ ok: true, message: result.message })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/payments/qris/session — create Xendit QRIS code (shown on kiosk screen)
router.post('/qris/session', requireKiosk, async (req, res) => {
  try {
    const { booking_id, tip_amount = 0 } = req.body
    if (!booking_id) return res.status(400).json({ message: 'booking_id required' })

    const bk = await pool.query(
      `SELECT bk.*, ${computedTotal} AS total_amount FROM bookings bk WHERE bk.id = $1`,
      [booking_id])
    if (!bk.rows.length) return res.status(404).json({ message: 'Booking not found' })
    const booking = bk.rows[0]

    if (booking.payment_status === 'paid') {
      return res.status(409).json({ message: 'Booking is already paid', already_paid: true })
    }

    const total = Math.round(parseFloat(booking.total_amount) + parseFloat(tip_amount || 0))
    const referenceId = `qris-${booking_id}-${Date.now()}`
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()  // 10 minutes

    const qr = await xenditApiPost('/qr_codes', {
      reference_id: referenceId,
      type: 'DYNAMIC',
      currency: 'IDR',
      amount: total,
      expires_at: expiresAt,
      metadata: { booking_id, branch_id: booking.branch_id, tip_amount: parseFloat(tip_amount || 0) }
    }, referenceId)

    if (qr.error_code) {
      console.error('[QRIS] Xendit error:', JSON.stringify(qr))
      return res.status(502).json({ message: qr.message || 'Xendit error', error_code: qr.error_code })
    }

    await pool.query('UPDATE bookings SET payment_ref = $1 WHERE id = $2', [qr.id, booking_id])
    res.json({ qr_id: qr.id, qr_string: qr.qr_string, expires_at: qr.expires_at })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/payments/qris/:id/status — poll for completed payment on this QR code
router.get('/qris/:id/status', requireKiosk, async (req, res) => {
  try {
    const { booking_id } = req.query
    const payments = await xenditApiGet(`/qr_codes/${req.params.id}/payments`)
    if (payments.error_code) return res.status(502).json({ message: payments.message })
    const succeeded = Array.isArray(payments.data)
      ? payments.data.find(p => p.status === 'SUCCEEDED')
      : null

    // Mark DB paid as fallback if webhook didn't fire
    if (succeeded && booking_id) {
      await markPaidIfNeeded(booking_id, parseFloat(succeeded.amount || 0), 'qris', succeeded.id)
        .catch(e => console.error('[QRIS Poll] markPaid failed:', e))
    } else if (succeeded && !booking_id) {
      console.warn('[QRIS Poll] Payment succeeded but booking_id missing — DB not updated. qr_id:', req.params.id)
    }

    res.json({ status: succeeded ? 'COMPLETED' : 'ACTIVE', qr_id: req.params.id })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/payments/webhook — Xendit callbacks (Terminal H2H)
router.post('/webhook', async (req, res) => {
  try {
    const token = req.headers['x-callback-token']
    if (!WEBHOOK_TOKEN) { console.error('[Webhook] XENDIT_WEBHOOK_TOKEN not set — rejecting'); return res.status(401).json({ message: 'Webhook token not configured' }) }
    if (token !== WEBHOOK_TOKEN) return res.status(401).json({ message: 'Unauthorized' })

    const { event, data } = req.body
    if (!event || !data) return res.json({ received: true })

    if (event === 'terminal_payment.succeeded') {
      await handleTerminalPaymentSucceeded(data)
    } else if (event === 'terminal_session.completed') {
      // Idempotent — terminal_payment.succeeded usually fires first
      const bookingId = resolveBookingId(data)
      if (bookingId) {
        const payMethod = mapXenditPaymentMethod(data.payment_details?.payment_method)
        await markPaidIfNeeded(bookingId, data.amount, payMethod, data.payment_session_id)
      }
    } else if (event === 'terminal_session.canceled' || event === 'terminal_session.voided') {
      const bookingId = resolveBookingId(data)
      if (bookingId) {
        const bk = await pool.query('SELECT branch_id FROM bookings WHERE id=$1', [bookingId])
        if (bk.rows[0]) emitEvent(bk.rows[0].branch_id, 'payment_failed', { booking_id: bookingId, reason: event })
      }
    } else if (event === 'qr.payment') {
      // QRIS on-screen payment confirmed
      const bookingId = data?.metadata?.booking_id
        || (data?.reference_id?.startsWith('qris-') ? data.reference_id.slice(5, data.reference_id.lastIndexOf('-')) : null)
      if (bookingId) {
        const amount = parseFloat(data.amount || 0)
        await markPaidIfNeeded(bookingId, amount, 'qris', data.id)
      }
    }

    res.json({ received: true })
  } catch (err) { console.error('[Webhook]', err); res.status(500).json({ message: 'Internal server error' }) }
})

function resolveBookingId(data) {
  if (data?.metadata?.booking_id) return data.metadata.booking_id
  if (data?.reference_id?.startsWith('bk-')) return data.reference_id.slice(3)
  return null
}

async function handleTerminalPaymentSucceeded(data) {
  const bookingId = resolveBookingId(data)
  if (!bookingId) return
  const xenditMethod = data?.payment_details?.payment_method
  const payMethod = mapXenditPaymentMethod(xenditMethod)
  const amount = parseFloat(data.request_amount || 0)
  await markPaidIfNeeded(bookingId, amount, payMethod, data.payment_id)
}

async function markPaidIfNeeded(bookingId, amount, payMethod, xenditRef) {
  const bk = await pool.query(
    `SELECT bk.*, ${computedTotal} AS total_amount FROM bookings bk WHERE bk.id = $1`,
    [bookingId])
  if (!bk.rows.length) return
  const booking = bk.rows[0]
  if (booking.payment_status === 'paid') return  // idempotent

  const method = payMethod || (booking.payment_method || 'card')
  const tipAmount = Math.max(0, amount - parseFloat(booking.total_amount))

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE bookings SET status='completed', paid_at=NOW(), payment_status='paid',
         payment_method=$1, payment_ref=COALESCE($2, payment_ref),
         completed_at=COALESCE(completed_at, NOW()) WHERE id=$3`,
      [method, xenditRef, bookingId])
    if (tipAmount > 0) {
      await client.query(
        `INSERT INTO tips (booking_id, barber_id, branch_id, amount, payment_method)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (booking_id) DO NOTHING`,
        [bookingId, booking.barber_id, booking.branch_id, tipAmount, method])
    }
    await client.query('COMMIT')
    emitEvent(booking.branch_id, 'payment_complete', { booking_id: bookingId, tip: tipAmount })
    notifyPaymentReceipt(booking, tipAmount).catch(e => console.error('[Notification] Receipt failed:', e))
    awardPoints(bookingId).catch(e => console.error('[Loyalty] Award failed:', e))
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// POST /api/payments/manual-confirm — confirm manual payment (cash/external card)
router.post('/manual-confirm', requireKioskOrAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    const { booking_id, payment_method = 'cash', tip_amount = 0 } = req.body
    if (!booking_id) return res.status(400).json({ message: 'booking_id required' })

    await client.query('BEGIN')
    
    // 1. Get booking details
    const bkRes = await client.query('SELECT barber_id, branch_id, status FROM bookings WHERE id = $1', [booking_id])
    if (!bkRes.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Booking not found' })
    }
    const booking = bkRes.rows[0]

    // 2. Update booking status
    const { rows } = await client.query(
      `UPDATE bookings 
       SET status = 'completed', 
           payment_status = 'paid', 
           paid_at = NOW(), 
           payment_method = $1,
           completed_at = COALESCE(completed_at, NOW())
       WHERE id = $2
       RETURNING *`,
      [payment_method, booking_id]
    )

    // 3. Record tip if any
    if (parseFloat(tip_amount) > 0) {
      await client.query(
        `INSERT INTO tips (booking_id, barber_id, branch_id, amount, payment_method)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (booking_id) DO UPDATE SET amount = EXCLUDED.amount`,
        [booking_id, booking.barber_id, booking.branch_id, tip_amount, payment_method]
      )
    }

    await client.query('COMMIT')
    
    // 4. Notify kiosk
    emitEvent(booking.branch_id, 'payment_complete', { booking_id, status: 'completed' })
    
    // Async notification (needs full booking data for template)
    pool.query(`SELECT bk.*, b.name AS barber_name, (
      COALESCE((SELECT SUM(price_charged) FROM booking_services WHERE booking_id = bk.id),0) +
      COALESCE((SELECT SUM(price * quantity) FROM booking_extras WHERE booking_id = bk.id),0) -
      bk.points_redeemed * 10000
    ) AS total_amount FROM bookings bk
    LEFT JOIN barbers b ON b.id = bk.barber_id
    WHERE bk.id = $1`, [booking_id])
      .then(r => {
        if (r.rows[0]) notifyPaymentReceipt(r.rows[0], tip_amount).catch(e => console.error('[Notification] Receipt failed:', e))
      })

    // Award loyalty points
    awardPoints(booking_id).catch(e => console.error('[Loyalty] Award failed:', e))

    res.json(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
})

// POST /api/payments/tip — manual tip from kiosk tip screen
router.post('/tip', requireKiosk, async (req, res) => {
  try {
    const { booking_id, amount } = req.body
    if (!booking_id || !amount) return res.status(400).json({ message: 'booking_id and amount required' })
    const bk = await pool.query('SELECT barber_id, branch_id FROM bookings WHERE id = $1', [booking_id])
    if (!bk.rows.length) return res.status(404).json({ message: 'Not found' })
    const { barber_id, branch_id } = bk.rows[0]
    await pool.query(
      `INSERT INTO tips (booking_id, barber_id, branch_id, amount)
       VALUES ($1,$2,$3,$4) ON CONFLICT (booking_id) DO NOTHING`,
      [booking_id, barber_id, branch_id, amount])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/payments/group-confirm — confirm payment for an entire booking group
router.post('/group-confirm', requireKioskOrAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    const { group_id, payment_method = 'cash', tip_amounts = {} } = req.body
    if (!group_id) return res.status(400).json({ message: 'group_id required' })

    await client.query('BEGIN')
    const { rows: bookings } = await client.query(
      `SELECT id, barber_id, branch_id FROM bookings WHERE group_id = $1 AND status = 'pending_payment'`,
      [group_id])
    if (!bookings.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'No pending_payment bookings in group' })
    }

    const branchId = bookings[0].branch_id
    for (const bk of bookings) {
      await client.query(
        `UPDATE bookings SET status='completed', payment_status='paid', paid_at=NOW(),
           payment_method=$1, completed_at=COALESCE(completed_at,NOW()) WHERE id=$2`,
        [payment_method, bk.id])
      const tip = parseFloat(tip_amounts[bk.id] || 0)
      if (tip > 0) {
        await client.query(
          `INSERT INTO tips (booking_id, barber_id, branch_id, amount, payment_method)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (booking_id) DO UPDATE SET amount=EXCLUDED.amount`,
          [bk.id, bk.barber_id, branchId, tip, payment_method])
      }
    }

    await client.query('COMMIT')
    emitEvent(branchId, 'payment_complete', { group_id, status: 'completed' })
    for (const bk of bookings) {
      awardPoints(bk.id).catch(e => console.error('[Loyalty] Award failed:', e))
    }

    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
})

// GET /api/payments — admin list
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { branch_id, date_from, date_to } = req.query
    const conds = ["bk.status = 'completed'"]; const vals = []; let idx = 1
    if (branch_id) { conds.push(`bk.branch_id = $${idx++}`); vals.push(branch_id) }
    if (date_from) {
      conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') >= $${idx++}`)
      vals.push(date_from)
    }
    if (date_to) {
      conds.push(`DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') <= $${idx++}`)
      vals.push(date_to)
    }
    const where = 'WHERE ' + conds.join(' AND ')
    const { rows } = await pool.query(
      `SELECT bk.id, bk.booking_number,
              DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') AS date,
              ${computedTotal} AS total_amount,
              bk.payment_method, bk.paid_at,
              b.name AS barber_name,
              COALESCE(bk.guest_name, c.name) AS customer_name,
              COALESCE(t.amount, 0) AS tip_amount
       FROM bookings bk
       LEFT JOIN barbers b ON b.id = bk.barber_id
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN tips t ON t.booking_id = bk.id
       ${where} ORDER BY bk.paid_at DESC`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
