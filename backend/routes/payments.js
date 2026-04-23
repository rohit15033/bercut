const router  = require('express').Router()
const pool    = require('../config/db')
const { requireAdmin, requireKiosk, requireKioskOrAdmin } = require('../middleware/auth')
const { emitEvent } = require('./events')
const { notifyPaymentReceipt } = require('../services/notifications')
const { awardPoints } = require('../services/loyalty')

const XENDIT_SECRET = process.env.XENDIT_SECRET_KEY || ''
const WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN || ''
const TERMINAL_URL  = process.env.XENDIT_TERMINAL_BASE_URL || 'https://api.xendit.co'

function xenditHeaders() {
  const cred = Buffer.from(XENDIT_SECRET + ':').toString('base64')
  return { Authorization: `Basic ${cred}`, 'Content-Type': 'application/json' }
}

async function xenditPost(path, body) {
  const r = await fetch(`${TERMINAL_URL}${path}`, {
    method: 'POST', headers: xenditHeaders(), body: JSON.stringify(body)
  })
  return r.json()
}

const computedTotal = `(
  COALESCE((SELECT SUM(price_charged) FROM booking_services WHERE booking_id = bk.id),0) +
  COALESCE((SELECT SUM(price * quantity) FROM booking_extras WHERE booking_id = bk.id),0) -
  bk.points_redeemed * 100
)`

// POST /api/payments/terminal/session — initiate Xendit terminal payment
router.post('/terminal/session', requireKiosk, async (req, res) => {
  try {
    const { booking_id, terminal_id } = req.body
    if (!booking_id) return res.status(400).json({ message: 'booking_id required' })

    const bk = await pool.query(
      `SELECT bk.*, ${computedTotal} AS total_amount FROM bookings bk WHERE bk.id = $1`,
      [booking_id])
    if (!bk.rows.length) return res.status(404).json({ message: 'Booking not found' })
    const booking = bk.rows[0]

    const payload = {
      reference_id: booking.id,
      currency: 'IDR',
      amount: booking.total_amount,
      terminal_id,
      metadata: { booking_id: booking.id, branch_id: booking.branch_id }
    }
    const session = await xenditPost('/payment_requests', payload)
    if (session.error_code) {
      return res.status(502).json({ message: session.message || 'Xendit error' })
    }

    // Store Xendit session ref in payment_ref field
    await pool.query('UPDATE bookings SET payment_ref = $1 WHERE id = $2', [session.id, booking.id])

    res.json({ session_id: session.id, status: session.status })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/payments/webhook — Xendit callback
router.post('/webhook', async (req, res) => {
  try {
    const token = req.headers['x-callback-token']
    if (token !== WEBHOOK_TOKEN) return res.status(401).json({ message: 'Unauthorized' })

    const event = req.body
    if (event.event !== 'payment.succeeded' && event.event !== 'payment_request.succeeded') {
      return res.json({ received: true })
    }

    const bookingId = event.data?.reference_id || event.data?.metadata?.booking_id
    if (!bookingId) return res.json({ received: true })

    const bk = await pool.query(
      `SELECT bk.*, ${computedTotal} AS total_amount FROM bookings bk WHERE bk.id = $1`,
      [bookingId])
    if (!bk.rows.length) return res.json({ received: true })
    const booking = bk.rows[0]

    const amount     = parseInt(event.data?.amount || 0)
    const payMethod  = event.data?.payment_method?.type === 'QR_CODE' ? 'qris' : 'card'
    const xenditRef  = event.data?.id

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE bookings SET status='completed', paid_at=NOW(), payment_status='paid',
           payment_method=$1, payment_ref=$2 WHERE id=$3`,
        [payMethod, xenditRef, bookingId])

      const tipAmount = Math.max(0, amount - booking.total_amount)
      if (tipAmount > 0) {
        await client.query(
          `INSERT INTO tips (booking_id, barber_id, branch_id, amount, payment_method)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (booking_id) DO NOTHING`,
          [bookingId, booking.barber_id, booking.branch_id, tipAmount, payMethod])
      }
      await client.query('COMMIT')
      emitEvent(booking.branch_id, 'payment_complete', { booking_id: bookingId, tip: tipAmount })

      // Async notification
      notifyPaymentReceipt(booking, tipAmount).catch(e => console.error('[Notification] Receipt failed:', e))
      
      // Award loyalty points
      awardPoints(bookingId).catch(e => console.error('[Loyalty] Award failed:', e))
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    res.json({ received: true })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

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
      bk.points_redeemed * 100
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
