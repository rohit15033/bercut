const pool = require('../config/db')

const SLOT_DURATION = 30 // minutes between slot start times
const BUFFER_MIN    = 0 // grace buffer after each booking

function minutesFromMidnight(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(min) {
  const h = Math.floor(min / 60).toString().padStart(2, '0')
  const m = (min % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/**
 * Returns available HH:MM slots for a barber on a given date (WITA timezone).
 */
async function getAvailableSlots(barberId, date, durationMin = 30) {
  const barberRes = await pool.query('SELECT id FROM barbers WHERE id = $1 AND is_active = true', [barberId])
  if (!barberRes.rows.length) return []

  const openTime  = minutesFromMidnight('09:00')
  const closeTime = minutesFromMidnight('21:00')
  const lastOrderStart = minutesFromMidnight('19:30')

  // Existing bookings — extract HH:MM from scheduled_at in WITA (UTC+8)
  const bookings = await pool.query(
    `SELECT TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
            SUM(s.duration_minutes) AS total_duration
     FROM bookings bk
     JOIN booking_services bsv ON bsv.booking_id = bk.id
     JOIN services s ON s.id = bsv.service_id
     WHERE bk.barber_id = $1
       AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
       AND bk.status IN ('confirmed','in_progress')
     GROUP BY bk.id, bk.scheduled_at`,
    [barberId, date])

  // Barber breaks (started_at/ended_at are TIMESTAMPTZ)
  const breaks = await pool.query(
    `SELECT TO_CHAR(started_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS start_time,
            TO_CHAR(COALESCE(ended_at, started_at + (COALESCE(duration_minutes,30) * INTERVAL '1 minute')) AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS end_time
     FROM barber_breaks
     WHERE barber_id = $1
       AND DATE(started_at AT TIME ZONE 'Asia/Makassar') = $2`,
    [barberId, date])

  const blocked = []
  for (const bk of bookings.rows) {
    if (!bk.slot_time) continue
    const start = minutesFromMidnight(bk.slot_time)
    const end   = start + parseInt(bk.total_duration || 30) + BUFFER_MIN
    blocked.push({ start, end })
  }
  for (const br of breaks.rows) {
    blocked.push({
      start: minutesFromMidnight(br.start_time),
      end:   minutesFromMidnight(br.end_time)
    })
  }

  const { rows: timeRows } = await pool.query("SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'HH24:MI') as t, TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') as d")
  const nowMin = minutesFromMidnight(timeRows[0].t)
  const isToday = timeRows[0].d === date
  // Fixed 10am bug: use floor instead of ceil to allow current slot if not elapsed
  const actualStart = isToday ? Math.max(openTime, Math.floor(nowMin / SLOT_DURATION) * SLOT_DURATION) : openTime

  const slots = []
  // Fixed last order start time constraint
  for (let t = actualStart; t <= lastOrderStart && t + durationMin <= closeTime; t += SLOT_DURATION) {
    const slotEnd = t + durationMin
    const overlaps = blocked.some(b => {
      return t < b.end && slotEnd > b.start
    })
    if (!overlaps) slots.push(minutesToTime(t))
  }
  return slots
}

module.exports = { getAvailableSlots }
