const pool = require('../config/db')
const { emitEvent } = require('../routes/events')

function nowWITA() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  return parts.find(p => p.type === 'hour').value + ':' + parts.find(p => p.type === 'minute').value
}

// Runs every minute — auto clocks out barbers after branch closing_time.
async function runAutoClockOut() {
  const nowHHMM = nowWITA()
  try {
    const { rows: branches } = await pool.query(
      `SELECT id FROM branches WHERE is_active = true`
    )
    for (const { id: branch_id } of branches) {
      await autoClockOutForBranch(branch_id, nowHHMM)
    }
  } catch (err) {
    console.error('[autoClockOut]', err)
  }
}

async function autoClockOutForBranch(branch_id, nowHHMM) {
  try {
    const { rows: settings } = await pool.query(
      `SELECT closing_time FROM whatsapp_settings LIMIT 1`
    )
    const closingHHMM = settings.length && settings[0].closing_time
      ? String(settings[0].closing_time).slice(0, 5)
      : '21:00'

    if (nowHHMM < closingHHMM) return

    const { rows: openAttendance } = await pool.query(
      `SELECT a.id AS attendance_id, a.barber_id
       FROM attendance a
       WHERE a.branch_id = $1
         AND a.clock_out_at IS NULL
         AND DATE(a.clock_in_at AT TIME ZONE 'Asia/Makassar') = (NOW() AT TIME ZONE 'Asia/Makassar')::date`,
      [branch_id]
    )

    for (const { attendance_id, barber_id } of openAttendance) {
      // Check active bookings across all branches — consistent with manual clock-out route.
      const { rows: activeBookings } = await pool.query(
        `SELECT id FROM bookings
         WHERE barber_id = $1
           AND status IN ('confirmed', 'in_progress')
           AND DATE(scheduled_at AT TIME ZONE 'Asia/Makassar') = (NOW() AT TIME ZONE 'Asia/Makassar')::date
         LIMIT 1`,
        [barber_id]
      )

      if (activeBookings.length) continue

      const { rows: updated } = await pool.query(
        `UPDATE attendance SET clock_out_at = NOW()
         WHERE id = $1 AND clock_out_at IS NULL
         RETURNING *`,
        [attendance_id]
      )
      if (!updated.length) continue

      await pool.query(
        `UPDATE barbers SET status = 'clocked_out' WHERE id = $1 AND status != 'clocked_out'`,
        [barber_id]
      )

      emitEvent(branch_id, 'barber_update', { barber_id, status: 'clocked_out' })
      console.log('[autoClockOut] clocked out barber_id=%s branch_id=%s', barber_id, branch_id)
      // Closing report is fired by the existing per-minute cron in server.js — no duplicate call needed.
    }
  } catch (err) {
    console.error('[autoClockOut] branch_id=%s', branch_id, err)
  }
}

module.exports = { runAutoClockOut }
