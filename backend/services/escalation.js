const pool = require('../config/db')
const { emitEvent } = require('../routes/events')
const { notifyBarberEscalation } = require('./notifications')

async function checkEscalations() {
  try {
    // Find confirmed bookings that are past their scheduled time
    // and the barber hasn't started service yet
    const { rows } = await pool.query(
      `SELECT bk.id, bk.barber_id, bk.branch_id, bk.booking_number,
              bk.guest_name, bk.guest_phone,
              bk.escalation_count, bk.escalation_stopped_at,
              bk.scheduled_at,
              b.name AS barber_name, b.status AS barber_status,
              c.name AS customer_name, c.phone AS customer_phone,
              (bk.scheduled_at AT TIME ZONE 'Asia/Makassar')::time::text AS slot_time,
              br.barber_escalation_interval_minutes,
              br.barber_escalation_max_count
       FROM bookings bk
       JOIN barbers b ON b.id = bk.barber_id
       JOIN branches br ON br.id = bk.branch_id
       LEFT JOIN customers c ON c.id = bk.customer_id
       WHERE bk.status = 'confirmed'
         AND bk.escalation_stopped_at IS NULL
         AND bk.scheduled_at <= NOW()`)

    const now = Date.now()
    for (const bk of rows) {
      const scheduledMs = new Date(bk.scheduled_at).getTime()
      const elapsedMin = (now - scheduledMs) / 60000
      const intervalMin = bk.barber_escalation_interval_minutes || 3
      const maxCount    = bk.barber_escalation_max_count || 5

      // Calculate how many escalation messages should have been sent by now
      const expectedCount = Math.min(Math.floor(elapsedMin / intervalMin), maxCount)
      const currentCount  = bk.escalation_count || 0

      if (expectedCount > currentCount && currentCount < maxCount) {
        // Send another escalation
        const newCount = currentCount + 1
        await pool.query(
          'UPDATE bookings SET escalation_count = $1 WHERE id = $2',
          [newCount, bk.id])

        // Emit SSE event for the barber panel
        emitEvent(bk.branch_id, 'escalation_warn', {
          booking_id: bk.id,
          barber_id: bk.barber_id,
          count: newCount
        })

        // Send WhatsApp to barber
        notifyBarberEscalation({ ...bk, escalation_count: newCount })
          .catch(e => console.error('[Escalation] WhatsApp failed:', e))

        console.log(`[Escalation] Booking ${bk.booking_number} → ${bk.barber_name} (count: ${newCount}/${maxCount})`)
      }

      // If max reached, auto-stop escalation
      if (currentCount >= maxCount && !bk.escalation_stopped_at) {
        await pool.query(
          `UPDATE bookings SET escalation_stopped_at = NOW(), escalation_stop_reason = 'max_reached'
           WHERE id = $1`, [bk.id])
        emitEvent(bk.branch_id, 'escalation_critical', { booking_id: bk.id })
      }
    }
  } catch (err) {
    console.error('[escalation] check failed:', err.message)
  }
}

module.exports = { checkEscalations }
