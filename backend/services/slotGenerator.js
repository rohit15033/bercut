const pool = require('../config/db')

const BUFFER_MIN = 5  // grace buffer after each booking ends
const GRID       = 30 // standard slot grid in minutes

function minutesFromMidnight(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(min) {
  const h = Math.floor(min / 60).toString().padStart(2, '0')
  const m = (min % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function roundUpTo5(min) {
  return Math.ceil(min / 5) * 5
}

/**
 * Returns available HH:MM slots for a barber on a given date (WITA timezone).
 * Uses a fixed 30-min clock grid (09:00, 09:30, 10:00...) — skips slots that overlap bookings/breaks.
 */
async function getAvailableSlots(barberId, date, durationMin = 30) {
  const barberRes = await pool.query('SELECT id FROM barbers WHERE id = $1 AND is_active = true', [barberId])
  if (!barberRes.rows.length) return []

  const openTime       = minutesFromMidnight('10:00')
  const closeTime      = minutesFromMidnight('21:00')
  const lastOrderStart = minutesFromMidnight('19:55')
  const GRID           = 30

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
    blocked.push({ start, end: start + parseInt(bk.total_duration || 30) + BUFFER_MIN })
  }
  for (const br of breaks.rows) {
    blocked.push({ start: minutesFromMidnight(br.start_time), end: minutesFromMidnight(br.end_time) })
  }

  const { rows: timeRows } = await pool.query(
    "SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'HH24:MI') as t, TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') as d"
  )
  const nowMin    = minutesFromMidnight(timeRows[0].t)
  const isToday   = timeRows[0].d === date
  const gridStart = Math.max(openTime, isToday ? Math.ceil(nowMin / GRID) * GRID : openTime)

  blocked.sort((a, b) => a.start - b.start)

  // Add slots in a free window:
  // - If cursor is on a grid boundary (start of day): just use grid
  // - If cursor is off-grid (right after a booking ends + buffer): add the
  //   actual first-free time (rounded to 5 min) as a bonus slot, then grid
  function addWindow(cursor, limit) {
    if (cursor % GRID !== 0) {
      const first = roundUpTo5(cursor)
      if (first <= lastOrderStart && first + durationMin <= limit) {
        slots.push(minutesToTime(first))
      }
      cursor = Math.ceil((cursor + 1) / GRID) * GRID
    }
    for (let t = cursor; t <= lastOrderStart && t + durationMin <= limit; t += GRID) {
      slots.push(minutesToTime(t))
    }
  }

  const slots = []
  let cursor = gridStart

  for (const b of blocked) {
    if (b.end <= cursor) continue
    if (b.start > cursor) addWindow(cursor, b.start)
    cursor = Math.max(cursor, b.end)
  }
  addWindow(cursor, closeTime)

  return slots
}

/**
 * Returns union of available slots across all active barbers at a branch,
 * snapped to a fixed 30-min clock grid (09:00, 09:30, 10:00...).
 * A slot is included if at least one barber is free for the full duration at that time.
 */
async function getUnionSlots(branchId, date, durationMin = 30) {
  const openTime       = minutesFromMidnight('10:00')
  const closeTime      = minutesFromMidnight('21:00')
  const lastOrderStart = minutesFromMidnight('19:55')
  const GRID           = 30

  const { rows: barbers } = await pool.query(
    `SELECT id FROM barbers
     WHERE branch_id = $1 AND is_active = true AND status NOT IN ('clocked_out','off','on_break')
     ORDER BY sort_order ASC`,
    [branchId]
  )
  if (!barbers.length) return []

  const barberIds = barbers.map(b => b.id)

  const { rows: bookingRows } = await pool.query(
    `SELECT bk.barber_id,
            TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
            SUM(s.duration_minutes) AS total_duration
     FROM bookings bk
     JOIN booking_services bsv ON bsv.booking_id = bk.id
     JOIN services s ON s.id = bsv.service_id
     WHERE bk.barber_id = ANY($1::uuid[])
       AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
       AND bk.status IN ('confirmed','in_progress')
     GROUP BY bk.barber_id, bk.id, bk.scheduled_at`,
    [barberIds, date]
  )

  const { rows: breakRows } = await pool.query(
    `SELECT barber_id,
            TO_CHAR(started_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS start_time,
            TO_CHAR(COALESCE(ended_at, started_at + (COALESCE(duration_minutes,30) * INTERVAL '1 minute')) AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS end_time
     FROM barber_breaks
     WHERE barber_id = ANY($1::uuid[])
       AND DATE(started_at AT TIME ZONE 'Asia/Makassar') = $2`,
    [barberIds, date]
  )

  // Build per-barber blocked intervals
  const blockedMap = {}
  for (const b of barbers) blockedMap[b.id] = []
  for (const bk of bookingRows) {
    if (!bk.slot_time) continue
    const start = minutesFromMidnight(bk.slot_time)
    blockedMap[bk.barber_id].push({ start, end: start + parseInt(bk.total_duration || 30) + BUFFER_MIN })
  }
  for (const br of breakRows) {
    blockedMap[br.barber_id].push({
      start: minutesFromMidnight(br.start_time),
      end:   minutesFromMidnight(br.end_time),
    })
  }

  const { rows: timeRows } = await pool.query(
    "SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'HH24:MI') as t, TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') as d"
  )
  const nowMin   = minutesFromMidnight(timeRows[0].t)
  const isToday  = timeRows[0].d === date
  const gridStart = Math.max(openTime, isToday ? Math.ceil(nowMin / GRID) * GRID : openTime)

  const isFreeAt = (t) => barbers.some(b => !blockedMap[b.id].some(bk => t < bk.end && t + durationMin > bk.start))

  const slotSet = new Set()

  // If any barber is free right now, add current time as first slot so "Now" works on the kiosk
  if (isToday && nowMin >= openTime && isFreeAt(nowMin)) {
    const nowRounded = roundUpTo5(nowMin)
    if (nowRounded >= openTime && nowRounded <= lastOrderStart && nowRounded + durationMin <= closeTime) {
      slotSet.add(nowRounded)
    }
  }

  // Fixed grid slots
  for (let t = gridStart; t <= lastOrderStart && t + durationMin <= closeTime; t += GRID) {
    if (isFreeAt(t)) slotSet.add(t)
  }

  // Dynamic first-available times: when each barber finishes a booking, add their
  // first free slot (rounded to 5 min) if it's off-grid and someone is free then
  for (const b of barbers) {
    const intervals = [...blockedMap[b.id]].sort((a, x) => a.start - x.start)
    for (const block of intervals) {
      const first = roundUpTo5(block.end)
      if (first % GRID !== 0 && first >= gridStart && first <= lastOrderStart && first + durationMin <= closeTime && isFreeAt(first)) {
        slotSet.add(first)
      }
    }
  }

  const unionSlots = [...slotSet].sort((a, b) => a - b).map(minutesToTime)
  return unionSlots
}

module.exports = { getAvailableSlots, getUnionSlots }
