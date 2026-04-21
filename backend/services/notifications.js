const pool = require('../config/db')
const { emitEvent } = require('../routes/events')

async function sendWhatsApp(phone, message) {
  const settings = await pool.query('SELECT * FROM whatsapp_settings LIMIT 1')
  const ws = settings.rows[0]
  if (!ws || !ws.enabled || !ws.fonnte_token) return

  try {
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: ws.fonnte_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: phone, message })
    })
  } catch (err) {
    console.error('[WhatsApp] send failed:', err.message)
  }
}

function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

async function notifyBookingConfirmed(booking) {
  if (!booking.customer_phone) return
  const ws = await pool.query('SELECT tpl_booking_confirmed FROM whatsapp_settings LIMIT 1')
  const tpl = ws.rows[0]?.tpl_booking_confirmed
  if (!tpl) return
  const msg = renderTemplate(tpl, {
    name:        booking.customer_name || 'Guest',
    barber:      booking.barber_name,
    date:        booking.date,
    time:        booking.slot_time || 'anytime',
    queue_no:    booking.queue_number || ''
  })
  await sendWhatsApp(booking.customer_phone, msg)
}

async function notifyPaymentReceipt(booking, tipAmount = 0) {
  if (!booking.customer_phone) return
  const ws = await pool.query('SELECT tpl_payment_receipt FROM whatsapp_settings LIMIT 1')
  const tpl = ws.rows[0]?.tpl_payment_receipt
  if (!tpl) return
  const msg = renderTemplate(tpl, {
    name:   booking.customer_name || 'Guest',
    total:  `Rp ${Number(booking.total_amount).toLocaleString('id-ID')}`,
    tip:    tipAmount > 0 ? `Rp ${Number(tipAmount).toLocaleString('id-ID')}` : '-'
  })
  await sendWhatsApp(booking.customer_phone, msg)
}

async function notifyPointsEarned(customer, points) {
  if (!customer.phone) return
  const ws = await pool.query('SELECT tpl_points_earned FROM whatsapp_settings LIMIT 1')
  const tpl = ws.rows[0]?.tpl_points_earned
  if (!tpl) return
  const msg = renderTemplate(tpl, {
    name:   customer.name || 'Guest',
    points: points.toString(),
    total:  customer.loyalty_points?.toString() || '0'
  })
  await sendWhatsApp(customer.phone, msg)
}

module.exports = { sendWhatsApp, notifyBookingConfirmed, notifyPaymentReceipt, notifyPointsEarned }
