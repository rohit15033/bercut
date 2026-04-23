const pool = require('../config/db')
const { emitEvent } = require('../routes/events')

// ── Core send function ────────────────────────────────────────────────────────

async function sendWhatsApp(phone, message, tokenOverride = null) {
  let token = tokenOverride
  if (!token) {
    const settings = await pool.query('SELECT * FROM whatsapp_settings LIMIT 1')
    const ws = settings.rows[0]
    if (!ws || !ws.enabled || !ws.fonnte_token) return
    token = ws.fonnte_token
  }

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: phone, message })
    })
    const data = await res.json()
    if (!data.status) {
      console.error('[WhatsApp] send failed:', data.reason || 'Unknown error')
    }
  } catch (err) {
    console.error('[WhatsApp] network error:', err.message)
  }
}

function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

// ── Customer: Booking Confirmed ───────────────────────────────────────────────

async function notifyBookingConfirmed(booking) {
  const phone = booking.customer_phone || booking.guest_phone
  if (!phone) return
  const ws = await pool.query('SELECT tpl_booking_confirmed FROM whatsapp_settings LIMIT 1')
  const tpl = ws.rows[0]?.tpl_booking_confirmed
  if (!tpl) return
  const msg = renderTemplate(tpl, {
    name:        booking.customer_name || booking.guest_name || 'Guest',
    barber:      booking.barber_name || '',
    date:        booking.date || '',
    time:        booking.slot_time || 'sekarang',
    queue_no:    booking.booking_number || ''
  })
  await sendWhatsApp(phone, msg)
}

// ── Customer: Payment Receipt ─────────────────────────────────────────────────

async function notifyPaymentReceipt(booking, tipAmount = 0) {
  const phone = booking.customer_phone || booking.guest_phone
  if (!phone) return
  const ws = await pool.query('SELECT tpl_payment_receipt FROM whatsapp_settings LIMIT 1')
  const tpl = ws.rows[0]?.tpl_payment_receipt
  if (!tpl) return
  const msg = renderTemplate(tpl, {
    name:   booking.customer_name || booking.guest_name || 'Guest',
    total:  `Rp ${Number(booking.total_amount).toLocaleString('id-ID')}`,
    tip:    tipAmount > 0 ? `Rp ${Number(tipAmount).toLocaleString('id-ID')}` : '-'
  })
  await sendWhatsApp(phone, msg)
}

// ── Customer: Points Earned ───────────────────────────────────────────────────

async function notifyPointsEarned(customer, points) {
  if (!customer.phone) return
  const ws = await pool.query('SELECT tpl_points_earned FROM whatsapp_settings LIMIT 1')
  const tpl = ws.rows[0]?.tpl_points_earned
  if (!tpl) return
  const msg = renderTemplate(tpl, {
    name:   customer.name || 'Guest',
    points: points.toString(),
    total:  customer.points_balance?.toString() || '0'
  })
  await sendWhatsApp(customer.phone, msg)
}

// ── Barber: New Booking Alert ─────────────────────────────────────────────────

async function notifyBarberNewBooking(booking) {
  // Look up barber phone number
  const barberRes = await pool.query('SELECT name, phone FROM barbers WHERE id = $1', [booking.barber_id])
  const barber = barberRes.rows[0]
  if (!barber || !barber.phone) return

  const ws = await pool.query('SELECT tpl_barber_new_booking FROM whatsapp_settings LIMIT 1')
  const tpl = ws.rows[0]?.tpl_barber_new_booking
  if (!tpl) return

  const msg = renderTemplate(tpl, {
    barber:   barber.name,
    customer: booking.customer_name || booking.guest_name || 'Walk-in',
    time:     booking.slot_time || 'sekarang',
    date:     booking.date || '',
    queue_no: booking.booking_number || '',
    service:  booking.service_names || ''
  })
  await sendWhatsApp(barber.phone, msg)
}

// ── Barber: Escalation Reminder (start service!) ──────────────────────────────

async function notifyBarberEscalation(booking) {
  // Look up barber phone number
  const barberRes = await pool.query('SELECT name, phone FROM barbers WHERE id = $1', [booking.barber_id])
  const barber = barberRes.rows[0]
  if (!barber || !barber.phone) return

  const ws = await pool.query('SELECT tpl_barber_escalation FROM whatsapp_settings LIMIT 1')
  const tpl = ws.rows[0]?.tpl_barber_escalation
  if (!tpl) return

  const msg = renderTemplate(tpl, {
    barber:   barber.name,
    customer: booking.customer_name || booking.guest_name || 'Walk-in',
    queue_no: booking.booking_number || '',
    time:     booking.slot_time || 'sekarang',
    count:    (booking.escalation_count || 0).toString()
  })
  await sendWhatsApp(barber.phone, msg)
}

module.exports = {
  sendWhatsApp,
  notifyBookingConfirmed,
  notifyPaymentReceipt,
  notifyPointsEarned,
  notifyBarberNewBooking,
  notifyBarberEscalation
}
