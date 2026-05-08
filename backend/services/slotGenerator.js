const pool = require('../config/db')

const BUFFER_MIN        = 5   // grace buffer after each booking ends
const GRID              = 30  // standard slot grid in minutes
const WALKIN_OVERLAP_MIN = 15 // walk-in can start up to this many minutes before a confirmed booking ends

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
 * walkin=true: Now slot allows up to WALKIN_OVERLAP_MIN overlap into confirmed (not in_progress) bookings.
 */
async function getAvailableSlots(barberId, date, durationMin = 30, walkin = false) {
  const barberRes = await pool.query('SELECT id FROM barbers WHERE id = $1 AND is_active = true', [barberId])
  if (!barberRes.rows.length) return []

  const openTime       = minutesFromMidnight('10:00')
  const closeTime      = minutesFromMidnight('21:00')
  const lastOrderStart = minutesFromMidnight('19:45')
  const GRID           = 30

  const bookings = await pool.query(
    `SELECT TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
            TO_CHAR(bk.started_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS started_time,
            bk.status,
            SUM(s.duration_minutes) AS total_duration
     FROM bookings bk
     JOIN booking_services bsv ON bsv.booking_id = bk.id
     JOIN services s ON s.id = bsv.service_id
     WHERE bk.barber_id = $1
       AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
       AND bk.status IN ('confirmed','in_progress')
     GROUP BY bk.id, bk.scheduled_at, bk.started_at, bk.status`,
    [barberId, date])

  const breaks = await pool.query(
    `SELECT TO_CHAR(started_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS start_time,
            TO_CHAR(COALESCE(ended_at, started_at + (COALESCE(duration_minutes,30) * INTERVAL '1 minute')) AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS end_time
     FROM barber_breaks
     WHERE barber_id = $1
       AND DATE(started_at AT TIME ZONE 'Asia/Makassar') = $2`,
    [barberId, date])

  const { rows: timeRows } = await pool.query(
    "SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'HH24:MI') as t, TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') as d"
  )
  const nowMin  = minutesFromMidnight(timeRows[0].t)
  const isToday = timeRows[0].d === date

  const blocked = []
  for (const bk of bookings.rows) {
    if (!bk.slot_time) continue
    const start        = minutesFromMidnight(bk.slot_time)
    // Use actual started_at for in_progress bookings — barber may have started early
    const effectiveStart = bk.status === 'in_progress' && bk.started_time
      ? minutesFromMidnight(bk.started_time)
      : start
    const estimatedEnd = effectiveStart + parseInt(bk.total_duration || 30)
    const isOverrun    = bk.status === 'in_progress' && isToday && nowMin > estimatedEnd
    blocked.push({
      start,
      end: isOverrun ? nowMin + 5 : estimatedEnd + BUFFER_MIN,
      fromConfirmed: bk.status === 'confirmed',
    })
  }
  for (const br of breaks.rows) {
    blocked.push({ start: minutesFromMidnight(br.start_time), end: minutesFromMidnight(br.end_time), fromConfirmed: false })
  }

  const { rows: timeRows } = await pool.query(
    "SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'HH24:MI') as t, TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') as d"
  )
  const nowMin    = minutesFromMidnight(timeRows[0].t)
  const isToday   = timeRows[0].d === date
  const gridStart = Math.max(openTime, isToday ? Math.ceil(nowMin / GRID) * GRID : openTime)
  // #region agent log
  fetch('http://127.0.0.1:7929/ingest/c67916ff-c4d9-4efd-b5ce-fcefcdb4f598',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'85c6ae'},body:JSON.stringify({sessionId:'85c6ae',runId:'initial',hypothesisId:'H1',location:'backend/services/slotGenerator.js:getAvailableSlots:pre-loop',message:'Computed specific barber slot baseline',data:{barberId,date,durationMin,isToday,nowMin,gridStart,blockedCount:blocked.length},timestamp:Date.now()})}).catch(()=>{});
  console.log('[DBG85][H1] specific-baseline', JSON.stringify({ barberId, date, durationMin, isToday, nowMin, gridStart, blockedCount: blocked.length }))
  // #endregion

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

  // Bonus: if barber is free right now, add current time as first slot (same as getUnionSlots)
  // walkin mode: confirmed bookings allow WALKIN_OVERLAP_MIN overlap tolerance
  if (isToday && nowMin >= openTime) {
    const nowRounded = roundUpTo5(nowMin)
    const freeNow = !blocked.some(b => {
      const effectiveBlockStart = (walkin && b.fromConfirmed) ? b.start + WALKIN_OVERLAP_MIN : b.start
      return nowRounded < b.end && nowRounded + durationMin > effectiveBlockStart
    })
    if (freeNow && nowRounded <= lastOrderStart && nowRounded + durationMin <= closeTime) {
      slots.push(minutesToTime(nowRounded))
    }
  }

  let cursor = Math.max(openTime, isToday ? nowMin : openTime)

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
 * walkin=true: Now slot allows up to WALKIN_OVERLAP_MIN overlap into confirmed (not in_progress) bookings.
 */
async function getUnionSlots(branchId, date, durationMin = 30, walkin = false) {
  const openTime       = minutesFromMidnight('10:00')
  const closeTime      = minutesFromMidnight('21:00')
  const lastOrderStart = minutesFromMidnight('19:45')
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
    `SELECT bk.barber_id, bk.status,
            TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
            TO_CHAR(bk.started_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS started_time,
            SUM(s.duration_minutes) AS total_duration
     FROM bookings bk
     JOIN booking_services bsv ON bsv.booking_id = bk.id
     JOIN services s ON s.id = bsv.service_id
     WHERE bk.barber_id = ANY($1::uuid[])
       AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
       AND bk.status IN ('confirmed','in_progress')
     GROUP BY bk.barber_id, bk.id, bk.scheduled_at, bk.started_at, bk.status`,
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

  const { rows: timeRows } = await pool.query(
    "SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'HH24:MI') as t, TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') as d"
  )
  const nowMin   = minutesFromMidnight(timeRows[0].t)
  const isToday  = timeRows[0].d === date

  // Build per-barber blocked intervals
  const blockedMap = {}
  for (const b of barbers) blockedMap[b.id] = []
  for (const bk of bookingRows) {
    if (!bk.slot_time) continue
    const start        = minutesFromMidnight(bk.slot_time)
    const effectiveStart = bk.status === 'in_progress' && bk.started_time
      ? minutesFromMidnight(bk.started_time)
      : start
    const estimatedEnd = effectiveStart + parseInt(bk.total_duration || 30)
    const isOverrun    = bk.status === 'in_progress' && isToday && nowMin > estimatedEnd
    blockedMap[bk.barber_id].push({
      start,
      end: isOverrun ? nowMin + 5 : estimatedEnd + BUFFER_MIN,
      fromConfirmed: bk.status === 'confirmed',
    })
  }
  for (const br of breakRows) {
    blockedMap[br.barber_id].push({
      start: minutesFromMidnight(br.start_time),
      end:   minutesFromMidnight(br.end_time),
      fromConfirmed: false,
    })
  }
  const gridStart = Math.max(openTime, isToday ? Math.ceil(nowMin / GRID) * GRID : openTime)

  // walkin mode: confirmed bookings allow WALKIN_OVERLAP_MIN overlap tolerance for the Now slot only
  const isFreeAt = (t, applyWalkinTolerance = false) =>
    barbers.some(b => !blockedMap[b.id].some(bk => {
      const effectiveBlockStart = (applyWalkinTolerance && bk.fromConfirmed)
        ? bk.start + WALKIN_OVERLAP_MIN
        : bk.start
      return t < bk.end && t + durationMin > effectiveBlockStart
    }))

  const slotSet = new Set()

  // If any barber is free right now, add current time as first slot so "Now" works on the kiosk
  if (isToday && nowMin >= openTime && isFreeAt(nowMin, walkin)) {
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

/**
 * Returns how many minutes a walk-in can take starting right now, for a barber or branch.
 * freeNow: barber physically free (no in_progress / break covering current time)
 * windowMin: minutes available now, including WALKIN_OVERLAP_MIN into the next confirmed booking.
 *            null = not free at all.
 * For branch (any-available): returns windowMin of the most-idle free barber (same ordering as
 * pickIdleBarber), so the modal window matches the barber who would actually be assigned.
 */
async function getNowWindow(barberId, branchId, date) {
  const closeTime = minutesFromMidnight('21:00')
  const openTime  = minutesFromMidnight('10:00')

  const { rows: timeRows } = await pool.query(
    "SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'HH24:MI') as t, TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') as d"
  )
  const nowMin  = minutesFromMidnight(timeRows[0].t)
  const isToday = timeRows[0].d === date

  if (!isToday || nowMin < openTime || nowMin >= closeTime) return { freeNow: false, windowMin: null }

  // barberIds ordered by idle priority for branch; single array for single-barber
  let barberIds = []
  let idleOrder = null  // null = not relevant (single barber)

  if (barberId) {
    const { rows } = await pool.query('SELECT id FROM barbers WHERE id = $1 AND is_active = true', [barberId])
    if (!rows.length) return { freeNow: false, windowMin: null }
    barberIds = [barberId]
  } else if (branchId) {
    // Fetch in idle order: longest-idle first (mirrors getActiveBarbers / pickIdleBarber)
    const { rows } = await pool.query(
      `SELECT b.id,
              MAX(bk.completed_at) AS last_completed_at,
              MIN(a.clock_in_at)   AS clocked_in_at
       FROM barbers b
       LEFT JOIN bookings bk ON bk.barber_id = b.id
         AND bk.status IN ('pending_payment','completed')
         AND DATE(bk.completed_at AT TIME ZONE 'Asia/Makassar') = DATE(NOW() AT TIME ZONE 'Asia/Makassar')
       LEFT JOIN attendance a ON a.barber_id = b.id
         AND DATE(a.clock_in_at AT TIME ZONE 'Asia/Makassar') = DATE(NOW() AT TIME ZONE 'Asia/Makassar')
       WHERE b.branch_id = $1 AND b.is_active = true AND b.status NOT IN ('clocked_out','off','on_break')
       GROUP BY b.id, b.name
       ORDER BY last_completed_at ASC NULLS FIRST, clocked_in_at ASC NULLS LAST, b.name ASC`,
      [branchId]
    )
    if (!rows.length) return { freeNow: false, windowMin: null }
    idleOrder = rows.map(r => r.id)
    barberIds = idleOrder
  } else {
    return { freeNow: false, windowMin: null }
  }

  const { rows: bookingRows } = await pool.query(
    `SELECT bk.barber_id, bk.status,
            TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
            TO_CHAR(bk.started_at  AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS started_time,
            SUM(s.duration_minutes) AS total_duration
     FROM bookings bk
     JOIN booking_services bsv ON bsv.booking_id = bk.id
     JOIN services s ON s.id = bsv.service_id
     WHERE bk.barber_id = ANY($1::uuid[])
       AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
       AND bk.status IN ('confirmed','in_progress')
     GROUP BY bk.barber_id, bk.id, bk.scheduled_at, bk.started_at, bk.status`,
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

  // Build per-barber intervals, tagged as physicallyBlocking or confirmed
  const blockedMap = {}
  for (const id of barberIds) blockedMap[id] = []
  for (const bk of bookingRows) {
    if (!bk.slot_time) continue
    const start        = minutesFromMidnight(bk.slot_time)
    const effectiveStart = bk.status === 'in_progress' && bk.started_time
      ? minutesFromMidnight(bk.started_time) : start
    const estimatedEnd = effectiveStart + parseInt(bk.total_duration || 30)
    const isOverrun    = bk.status === 'in_progress' && nowMin > estimatedEnd
    blockedMap[bk.barber_id].push({
      start,
      end: isOverrun ? nowMin + 5 : estimatedEnd + BUFFER_MIN,
      physicallyBlocking: bk.status === 'in_progress',
      fromConfirmed: bk.status === 'confirmed',
    })
  }
  for (const br of breakRows) {
    blockedMap[br.barber_id].push({
      start: minutesFromMidnight(br.start_time),
      end:   minutesFromMidnight(br.end_time),
      physicallyBlocking: true,
      fromConfirmed: false,
    })
  }

  const computeWindow = (id) => {
    const intervals = blockedMap[id]
    const physBusy = intervals.some(b => b.physicallyBlocking && nowMin >= b.start && nowMin < b.end)
    if (physBusy) return null
    const confirmedCoveringNow = intervals.some(b => b.fromConfirmed && b.start <= nowMin && nowMin < b.end)
    if (confirmedCoveringNow) return null
    const nextConfirmed = intervals
      .filter(b => b.fromConfirmed && b.start > nowMin)
      .sort((a, c) => a.start - c.start)[0]
    const w = !nextConfirmed
      ? closeTime - nowMin
      : Math.min(nextConfirmed.start + WALKIN_OVERLAP_MIN - nowMin, closeTime - nowMin)
    return w > 0 ? w : null
  }

  if (idleOrder) {
    // Branch: return MAX window across all barbers with a gap (modal needs most flexibility)
    const windows = idleOrder
      .map(id => ({ id, w: computeWindow(id) }))
      .filter(x => x.w !== null)
    if (!windows.length) return { freeNow: false, windowMin: null }
    const maxW = Math.max(...windows.map(x => x.w))
    return { freeNow: true, windowMin: maxW }
  }

  // Single barber
  const w = computeWindow(barberIds[0])
  return { freeNow: w !== null, windowMin: w }
}

module.exports = { getAvailableSlots, getUnionSlots, getNowWindow }
