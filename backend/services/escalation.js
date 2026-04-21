const pool = require('../config/db')
const { emitEvent } = require('../routes/events')

async function checkEscalations() {
  try {
    const { rows } = await pool.query(
      `SELECT bk.*, br.escalation_warn_min, br.escalation_critical_min,
              br.backoffice_alert_phone
       FROM bookings bk
       JOIN branches br ON br.id = bk.branch_id
       WHERE bk.status = 'confirmed'
         AND bk.escalation_stopped_at IS NULL
         AND bk.client_not_arrived_at IS NOT NULL`)

    const now = Date.now()
    for (const bk of rows) {
      const flaggedMs = new Date(bk.client_not_arrived_at).getTime()
      const elapsedMin = (now - flaggedMs) / 60000
      const warnMin     = bk.escalation_warn_min     || 15
      const criticalMin = bk.escalation_critical_min || 30

      if (elapsedMin >= criticalMin && !bk.escalation_critical_at) {
        await pool.query(
          'UPDATE bookings SET escalation_critical_at = NOW() WHERE id = $1', [bk.id])
        emitEvent(bk.branch_id, 'escalation_critical', { booking_id: bk.id })
      } else if (elapsedMin >= warnMin && !bk.escalation_warned_at) {
        await pool.query(
          'UPDATE bookings SET escalation_warned_at = NOW() WHERE id = $1', [bk.id])
        emitEvent(bk.branch_id, 'escalation_warn', { booking_id: bk.id })
      }
    }
  } catch (err) {
    console.error('[escalation] check failed:', err.message)
  }
}

module.exports = { checkEscalations }
