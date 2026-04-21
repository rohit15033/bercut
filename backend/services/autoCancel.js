const pool = require('../config/db')
const { emitEvent } = require('../routes/events')

async function runAutoCancel() {
  const { rows } = await pool.query(
    `UPDATE bookings
     SET status = 'cancelled', cancellation_reason = 'auto_cancel'
     WHERE status = 'confirmed'
       AND auto_cancel_at IS NOT NULL
       AND auto_cancel_at <= NOW()
     RETURNING id, branch_id`)

  for (const bk of rows) {
    emitEvent(bk.branch_id, 'booking_cancelled', { booking_id: bk.id, reason: 'auto_cancel' })
  }

  if (rows.length > 0) {
    console.log(`[autoCancel] Cancelled ${rows.length} expired bookings`)
  }
}

module.exports = { runAutoCancel }
