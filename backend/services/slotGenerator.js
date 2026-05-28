const pool = require('../config/db')

const BUFFER_MIN  = 5   // grace buffer after each booking ends
const GRID        = 30  // standard slot grid in minutes
const OVERLAP_MIN = 15  // customers can arrive up to 15 min early and wait

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
 * Returns available slots for a barber on a given date (WITA timezone).
 * Returns { time, windowMin, pinched? }[] — windowMin is the available gap at that slot.
 * If minDurationMin < durationMin, also returns pinched slots (gap too short for full services).
 */
async function getAvailableSlots(barberId, date, durationMin = 30, minDurationMin = null) {
  const effectiveMinDur = (minDurationMin != null && minDurationMin < durationMin) ? minDurationMin : durationMin
  const barberRes = await pool.query(
    'SELECT id, branch_id FROM barbers WHERE id = $1 AND is_active = true', [barberId])
  if (!barberRes.rows.length) return []
  const branchId = barberRes.rows[0].branch_id

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

  const { rows: deferredRows } = await pool.query(
    `SELECT TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
            SUM(s.duration_minutes) AS total_duration
     FROM bookings bk
     JOIN booking_services bsv ON bsv.booking_id = bk.id
     JOIN services s ON s.id = bsv.service_id
     WHERE bk.branch_id = $1
       AND bk.barber_id IS NULL
       AND bk.status = 'confirmed'
       AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
     GROUP BY bk.id, bk.scheduled_at`,
    [branchId, date])

  const { rows: totalBarberRows } = await pool.query(
    `SELECT COUNT(*) AS count FROM barbers
     WHERE branch_id = $1 AND is_active = true AND status NOT IN ('clocked_out','off','on_break')`,
    [branchId])
  const totalActiveBarbers = parseInt(totalBarberRows[0].count || 0)

  const { rows: confirmedBranchRows } = await pool.query(
    `SELECT TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
            SUM(s.duration_minutes) AS total_duration
     FROM bookings bk
     JOIN booking_services bsv ON bsv.booking_id = bk.id
     JOIN services s ON s.id = bsv.service_id
     WHERE bk.branch_id = $1
       AND bk.barber_id IS NOT NULL
       AND bk.status IN ('confirmed','in_progress')
       AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
     GROUP BY bk.id, bk.scheduled_at`,
    [branchId, date])

  const confirmedBranchBlocks = confirmedBranchRows
    .filter(r => r.slot_time)
    .map(r => {
      const start = minutesFromMidnight(r.slot_time)
      return { start, end: start + parseInt(r.total_duration || 30) + BUFFER_MIN }
    })

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
    const isOverrun    = bk.status === 'in_progress' && isToday && nowMin >= estimatedEnd
    blocked.push({ start, end: isOverrun ? nowMin + 5 : estimatedEnd + BUFFER_MIN })
  }
  for (const br of breaks.rows) {
    blocked.push({ start: minutesFromMidnight(br.start_time), end: minutesFromMidnight(br.end_time) })
  }

  blocked.sort((a, b) => a.start - b.start)

  // Deferred bookings saturating all branch capacity also block this specific barber
  const deferredBlocksForBarber = []
  for (const bk of deferredRows) {
    if (!bk.slot_time) continue
    const start = minutesFromMidnight(bk.slot_time)
    deferredBlocksForBarber.push({ start, end: start + parseInt(bk.total_duration || 30) + BUFFER_MIN })
  }
  if (totalActiveBarbers > 0) {
    const confirmedCountAt = (t, dur) => confirmedBranchBlocks.filter(
      c => t < c.end && t + dur > c.start
    ).length
    const deferredCountAt = (t, dur) => deferredBlocksForBarber.filter(
      d => t < d.end && t + dur > d.start
    ).length
    for (const d of deferredBlocksForBarber) {
      if (confirmedCountAt(d.start, durationMin) + deferredCountAt(d.start, durationMin) >= totalActiveBarbers) {
        blocked.push({ start: d.start, end: d.end })
      }
    }
    blocked.sort((a, b) => a.start - b.start)
  }

  // Add slots in a free window (stores minute values into slotSet)
  const slotSet = new Set()
  function addWindow(cursor, limit) {
    if (cursor % GRID !== 0) {
      const first = roundUpTo5(cursor)
      if (first <= lastOrderStart && first + durationMin <= limit) slotSet.add(first)
      cursor = Math.ceil((cursor + 1) / GRID) * GRID
    }
    for (let t = cursor; t <= lastOrderStart && t + durationMin <= limit; t += GRID) {
      slotSet.add(t)
    }
  }

  // Bonus: if barber is free right now, add current time as first slot
  if (isToday && nowMin >= openTime) {
    const nowRounded = roundUpTo5(nowMin)
    const freeNow = !blocked.some(b => nowRounded < b.end && nowRounded + durationMin > b.start)
    if (freeNow && nowRounded <= lastOrderStart && nowRounded + durationMin <= closeTime) {
      slotSet.add(nowRounded)
    }
  }

  let cursor = Math.max(openTime, isToday ? nowMin : openTime)
  for (const b of blocked) {
    if (b.end <= cursor) continue
    if (b.start > cursor) addWindow(cursor, b.start)
    cursor = Math.max(cursor, b.end)
  }
  addWindow(cursor, closeTime)

  // Window available at time t — distance to next blocking event
  function windowAt(t) {
    let w = closeTime - t
    for (const bk of blocked) {
      if (bk.start > t) { w = Math.min(w, bk.start - t); break }
    }
    return Math.max(0, w)
  }

  const normalSlots = [...slotSet].sort((a, b) => a - b).map(t => ({
    time: minutesToTime(t),
    windowMin: windowAt(t)
  }))

  if (effectiveMinDur >= durationMin) return normalSlots

  // Pinched slots: valid for effectiveMinDur but not durationMin
  const pinchedSet = new Set()
  const nowRoundedP = roundUpTo5(nowMin)
  if (isToday && nowMin >= openTime) {
    const nr = nowRoundedP
    if (!slotSet.has(nr) && !blocked.some(b => nr < b.end && nr + effectiveMinDur > b.start)
        && nr <= lastOrderStart && nr + effectiveMinDur <= closeTime) {
      pinchedSet.add(nr)
    }
  }
  const pinchedCursorStart = Math.max(openTime, isToday ? Math.ceil(nowMin / GRID) * GRID : openTime)
  for (let t = pinchedCursorStart; t <= lastOrderStart && t + effectiveMinDur <= closeTime; t += GRID) {
    if (!slotSet.has(t) && !blocked.some(b => t < b.end && t + effectiveMinDur > b.start)) pinchedSet.add(t)
  }
  for (const b of blocked) {
    const first = roundUpTo5(b.end)
    if (first % GRID !== 0 && first >= nowRoundedP && first <= lastOrderStart
        && first + effectiveMinDur <= closeTime
        && !blocked.some(bl => first < bl.end && first + effectiveMinDur > bl.start)
        && !slotSet.has(first)) {
      pinchedSet.add(first)
    }
  }

  const pinchedSlots = [...pinchedSet].sort((a, b) => a - b).map(t => ({
    time: minutesToTime(t),
    windowMin: windowAt(t),
    pinched: true
  }))

  return [...normalSlots, ...pinchedSlots].sort((a, b) =>
    minutesFromMidnight(a.time) - minutesFromMidnight(b.time)
  )
}

/**
 * Returns union of available slots across all active barbers at a branch.
 * Returns { time, windowMin, pinched? }[] — windowMin is the max gap any free barber has at that slot.
 * If minDurationMin < durationMin, also returns pinched slots where the gap fits minDurationMin but not durationMin.
 */
async function getUnionSlots(branchId, date, durationMin = 30, walkin = false, minDurationMin = null) {
  const effectiveMinDur = (minDurationMin != null && minDurationMin < durationMin) ? minDurationMin : durationMin
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

  const { rows: deferredRows } = await pool.query(
    `SELECT TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
            SUM(s.duration_minutes) AS total_duration
     FROM bookings bk
     JOIN booking_services bsv ON bsv.booking_id = bk.id
     JOIN services s ON s.id = bsv.service_id
     WHERE bk.branch_id = $1
       AND bk.barber_id IS NULL
       AND bk.status = 'confirmed'
       AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
     GROUP BY bk.id, bk.scheduled_at`,
    [branchId, date])

  const deferredBlocks = deferredRows
    .filter(r => r.slot_time)
    .map(r => {
      const start = minutesFromMidnight(r.slot_time)
      return { start, end: start + parseInt(r.total_duration || 30) + BUFFER_MIN }
    })

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
    const isOverrun    = bk.status === 'in_progress' && isToday && nowMin >= estimatedEnd
    blockedMap[bk.barber_id].push({ start, end: isOverrun ? nowMin + 5 : estimatedEnd + BUFFER_MIN })
  }
  for (const br of breakRows) {
    blockedMap[br.barber_id].push({
      start: minutesFromMidnight(br.start_time),
      end:   minutesFromMidnight(br.end_time),
    })
  }
  const gridStart = Math.max(openTime, isToday ? Math.ceil(nowMin / GRID) * GRID : openTime)

  const freeCountAt = (t, dur = durationMin) => barbers.filter(b =>
    !blockedMap[b.id].some(bk => t < bk.end && t + dur > bk.start)
  ).length
  const deferredCountAt = (t, dur = durationMin) => deferredBlocks.filter(
    d => t < d.end && t + dur > d.start
  ).length
  const isFreeAt = (t, dur = durationMin) => freeCountAt(t, dur) > deferredCountAt(t, dur)

  // Max window any free barber has at time t
  function windowAtTime(t) {
    let maxWindow = 0
    for (const b of barbers) {
      if (blockedMap[b.id].some(bk => t < bk.end && t + effectiveMinDur > bk.start)) continue
      let w = closeTime - t
      const sortedBlocks = [...blockedMap[b.id]].sort((a, x) => a.start - x.start)
      for (const bk of sortedBlocks) {
        if (bk.start > t) { w = Math.min(w, bk.start - t); break }
      }
      maxWindow = Math.max(maxWindow, w)
    }
    for (const d of deferredBlocks) {
      if (d.start > t && d.start < t + maxWindow) {
        if (freeCountAt(d.start, 1) <= deferredCountAt(d.start, 1)) {
          maxWindow = Math.min(maxWindow, d.start - t)
        }
      }
    }
    return Math.max(0, maxWindow)
  }

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
  const nowRounded = roundUpTo5(nowMin)
  for (const b of barbers) {
    const intervals = [...blockedMap[b.id]].sort((a, x) => a.start - x.start)
    for (const block of intervals) {
      const first = roundUpTo5(block.end)
      if (first % GRID !== 0 && first >= nowRounded && first <= lastOrderStart && first + durationMin <= closeTime && isFreeAt(first)) {
        slotSet.add(first)
      }
    }
  }

  // Dynamic first-available from deferred block ends — same logic as barber blocks
  for (const block of deferredBlocks) {
    const first = roundUpTo5(block.end)
    if (first % GRID !== 0 && first >= nowRounded && first <= lastOrderStart
        && first + durationMin <= closeTime && isFreeAt(first)) {
      slotSet.add(first)
    }
  }

  const normalSlots = [...slotSet].sort((a, b) => a - b).map(t => ({
    time: minutesToTime(t),
    windowMin: windowAtTime(t)
  }))

  if (effectiveMinDur >= durationMin) return normalSlots

  // Pinched slots: valid for effectiveMinDur but not durationMin
  const pinchedSet = new Set()
  const nowRoundedU = roundUpTo5(nowMin)

  if (isToday && nowMin >= openTime && !slotSet.has(nowRoundedU) && isFreeAt(nowRoundedU, effectiveMinDur)
      && nowRoundedU <= lastOrderStart && nowRoundedU + effectiveMinDur <= closeTime) {
    pinchedSet.add(nowRoundedU)
  }
  for (let t = gridStart; t <= lastOrderStart && t + effectiveMinDur <= closeTime; t += GRID) {
    if (!slotSet.has(t) && isFreeAt(t, effectiveMinDur)) pinchedSet.add(t)
  }
  for (const b of barbers) {
    for (const block of [...blockedMap[b.id]].sort((a, x) => a.start - x.start)) {
      const first = roundUpTo5(block.end)
      if (first % GRID !== 0 && first >= nowRoundedU && first <= lastOrderStart
          && first + effectiveMinDur <= closeTime && isFreeAt(first, effectiveMinDur) && !slotSet.has(first)) {
        pinchedSet.add(first)
      }
    }
  }
  for (const block of deferredBlocks) {
    const first = roundUpTo5(block.end)
    if (first % GRID !== 0 && first >= nowRoundedU && first <= lastOrderStart
        && first + effectiveMinDur <= closeTime && isFreeAt(first, effectiveMinDur) && !slotSet.has(first)) {
      pinchedSet.add(first)
    }
  }

  const pinchedSlots = [...pinchedSet].sort((a, b) => a - b).map(t => ({
    time: minutesToTime(t),
    windowMin: windowAtTime(t),
    pinched: true
  }))

  return [...normalSlots, ...pinchedSlots].sort((a, b) =>
    minutesFromMidnight(a.time) - minutesFromMidnight(b.time)
  )
}

/**
 * Returns { freeNow, windowMin, barberWindows } — how many consecutive minutes are available
 * for a walk-in starting right now, limited by the nearest blocking event.
 * - When called with barber_id: returns that barber's window
 * - When called with branch_id (Any Available): returns the MAX window across all barbers
 *   so the UI can show the highest threshold and let idlepicker choose fairly
 */
async function getNowWindow(branchId, barberId, date) {
  const { rows: timeRows } = await pool.query(
    "SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'HH24:MI') as t, TO_CHAR(NOW() AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') as d"
  )
  const nowMin  = minutesFromMidnight(timeRows[0].t)
  const isToday = timeRows[0].d === date
  if (!isToday) return { freeNow: false, windowMin: 0 }

  // Get barbers to check
  let barbers
  if (barberId) {
    const { rows } = await pool.query(
      'SELECT id FROM barbers WHERE id = $1 AND is_active = true AND status NOT IN (\'clocked_out\',\'off\',\'on_break\')',
      [barberId])
    barbers = rows
  } else {
    const { rows } = await pool.query(
      `SELECT id FROM barbers WHERE branch_id = $1 AND is_active = true AND status NOT IN ('clocked_out','off','on_break')`,
      [branchId])
    barbers = rows
  }
  if (!barbers.length) return { freeNow: false, windowMin: 0 }

  const barberIds = barbers.map(b => b.id)
  const closeTime = minutesFromMidnight('21:00')

  // Fetch all bookings + breaks for these barbers today
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

  const blockedMap = {}
  for (const b of barbers) blockedMap[b.id] = []
  for (const bk of bookingRows) {
    if (!bk.slot_time) continue
    const start = minutesFromMidnight(bk.slot_time)
    const effectiveStart = bk.status === 'in_progress' && bk.started_time
      ? minutesFromMidnight(bk.started_time)
      : start
    const estimatedEnd = effectiveStart + parseInt(bk.total_duration || 30)
    const isOverrun = bk.status === 'in_progress' && nowMin >= estimatedEnd
    blockedMap[bk.barber_id].push({ start, end: isOverrun ? nowMin + 5 : estimatedEnd + BUFFER_MIN })
  }
  for (const br of breakRows) {
    blockedMap[br.barber_id].push({
      start: minutesFromMidnight(br.start_time),
      end: minutesFromMidnight(br.end_time),
    })
  }

  // Sort each barber's blocked intervals
  for (const id of barberIds) blockedMap[id].sort((a, b) => a.start - b.start)

  // Deferred bookings reduce effective capacity for any-available now-window
  let deferredBlocks = []
  if (branchId) {
    const { rows: deferredRows } = await pool.query(
      `SELECT TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time,
              SUM(s.duration_minutes) AS total_duration
       FROM bookings bk
       JOIN booking_services bsv ON bsv.booking_id = bk.id
       JOIN services s ON s.id = bsv.service_id
       WHERE bk.branch_id = $1
         AND bk.barber_id IS NULL
         AND bk.status = 'confirmed'
         AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
       GROUP BY bk.id, bk.scheduled_at`,
      [branchId, date])
    deferredBlocks = deferredRows
      .filter(r => r.slot_time)
      .map(r => {
        const start = minutesFromMidnight(r.slot_time)
        return { start, end: start + parseInt(r.total_duration || 30) + BUFFER_MIN }
      })
  }

  // Calculate per-barber windows first (include OVERLAP_MIN for early-arrival tolerance)
  const perBarberWindows = {}
  const deferredCountAtTime = (t) => deferredBlocks.filter(d => t < d.end && t + 1 > d.start).length

  for (const b of barbers) {
    let w = closeTime - nowMin + OVERLAP_MIN  // include overlap in base window
    for (const bk of blockedMap[b.id]) {
      if (bk.start > nowMin) {
        w = Math.min(w, bk.start - nowMin + OVERLAP_MIN)  // add overlap to gap
      }
    }
    // Deferred bookings that saturate all free barbers also constrain this window
    for (const d of deferredBlocks) {
      if (d.start > nowMin) {
        const freeAtD = barbers.filter(bb =>
          !blockedMap[bb.id].some(bk => d.start < bk.end && d.start >= bk.start)
        ).length
        if (freeAtD <= deferredCountAtTime(d.start)) {
          w = Math.min(w, d.start - nowMin + OVERLAP_MIN)
        }
      }
    }
    perBarberWindows[b.id] = Math.max(0, w)
  }

  // freeNow = at least one barber has positive window AND is not currently in a booking
  const freeNowCount = barbers.filter(b =>
    !blockedMap[b.id].some(bk => nowMin >= bk.start && nowMin < bk.end)
  ).length
  const deferredNowCount = deferredBlocks.filter(d => nowMin >= d.start && nowMin < d.end).length
  const isFreeNow = freeNowCount > deferredNowCount

  // For single barber: return their window
  // For branch (Any Available): return the MAX window — the barber with most free time
  const isAnyAvailable = !barberId && !!branchId

  const windowMin = isAnyAvailable
    ? Math.max(...Object.values(perBarberWindows))  // MAX for Any Available
    : barberId ? perBarberWindows[barberId] ?? 0   // Single barber's window
    : Math.min(...Object.values(perBarberWindows))  // fallback: MIN

  return { freeNow: isFreeNow, windowMin, barberWindows: perBarberWindows }
}

module.exports = { getAvailableSlots, getUnionSlots, getNowWindow }
