const pool = require('../config/db')

// Returns available barbers sorted by idle time: who completed their last service TODAY earliest comes first.
// Barbers with no completed bookings today sort first (null), broken by name alphabetically.
// Barbers who are in_service, on_break, clocked_out, or off are excluded entirely.
async function getActiveBarbers(client, branchId) {
  const { rows } = await client.query(
    `SELECT b.id, b.name,
            MAX(bk.completed_at) AS last_completed_at,
            MIN(a.clock_in_at) AS clocked_in_at
     FROM barbers b
     LEFT JOIN bookings bk ON bk.barber_id = b.id
       AND bk.status IN ('pending_payment','completed')
       AND DATE(bk.completed_at AT TIME ZONE 'Asia/Makassar') = DATE(NOW() AT TIME ZONE 'Asia/Makassar')
     LEFT JOIN attendance a ON a.barber_id = b.id
       AND DATE(a.clock_in_at AT TIME ZONE 'Asia/Makassar') = DATE(NOW() AT TIME ZONE 'Asia/Makassar')
     WHERE b.branch_id = $1 AND b.is_active = true AND b.status = 'available'
     GROUP BY b.id, b.name
     ORDER BY last_completed_at ASC NULLS FIRST, clocked_in_at ASC NULLS LAST, b.name ASC`,
    [branchId]
  )
  return rows
}

// Returns set of barber IDs who have no conflicting booking at the given time and are not on break.
async function getFreeBarberIds(client, branchId, scheduledISO, durationMin) {
  const { rows } = await client.query(
    `SELECT b.id FROM barbers b
     WHERE b.branch_id = $1 AND b.is_active = true AND b.status NOT IN ('clocked_out','off','on_break')
       AND NOT EXISTS (
         SELECT 1 FROM bookings bk
         JOIN (
           SELECT bsv.booking_id, SUM(s.duration_minutes) AS total_dur
           FROM booking_services bsv JOIN services s ON s.id = bsv.service_id
           GROUP BY bsv.booking_id
         ) dur ON dur.booking_id = bk.id
         WHERE bk.barber_id = b.id
           AND bk.status IN ('confirmed','in_progress')
           AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = DATE($2::timestamptz AT TIME ZONE 'Asia/Makassar')
           AND bk.scheduled_at < $2::timestamptz + ($3 * INTERVAL '1 minute')
           AND CASE WHEN bk.status = 'in_progress'
                    THEN GREATEST(bk.scheduled_at + ((dur.total_dur + 5) * INTERVAL '1 minute'), NOW() + INTERVAL '1 minute')
                    ELSE bk.scheduled_at + ((dur.total_dur + 5) * INTERVAL '1 minute')
               END > $2::timestamptz
       )`,
    [branchId, scheduledISO, durationMin]
  )
  return new Set(rows.map(r => r.id))
}

// Picks the most-idle free barber. Advisory lock prevents concurrent double-assignment.
async function pickIdleBarber(client, branchId, freeIds) {
  if (!freeIds.size) return null
  // Branch-scoped advisory lock for the duration of this transaction
  await client.query(
    `SELECT pg_advisory_xact_lock(('x' || substr(md5($1), 1, 16))::bit(64)::bigint)`,
    [branchId]
  )
  const barbers = await getActiveBarbers(client, branchId)
  const picked  = barbers.find(b => freeIds.has(b.id))
  return picked?.id || null
}

// Called after barber clicks Selesai — tries assigning oldest deferred booking
// using the same policy as scheduler/create: only free barbers, longest-idle first.
async function tryAssignDeferred(branchId, _completingBarberId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: deferred } = await client.query(
      `SELECT bk.id, bk.scheduled_at
       FROM bookings bk
       WHERE bk.branch_id = $1
         AND bk.barber_id IS NULL
         AND bk.status = 'confirmed'
         AND bk.scheduled_at <= NOW() + INTERVAL '15 minutes'
       ORDER BY bk.scheduled_at ASC, bk.created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [branchId]
    )
    if (!deferred.length) { await client.query('ROLLBACK'); return null }

    const booking = deferred[0]
    // Only assign to barbers who are available now and have no confirmed booking in the next 15 minutes
    const { rows: eligibleRows } = await client.query(
      `SELECT b.id FROM barbers b
       WHERE b.branch_id = $1
         AND b.is_active = true
         AND b.status = 'available'
         AND NOT EXISTS (
           SELECT 1 FROM bookings bk
           WHERE bk.barber_id = b.id
             AND bk.status = 'confirmed'
             AND bk.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '15 minutes'
         )`,
      [branchId]
    )
    const freeIds = new Set(eligibleRows.map(r => r.id))
    const assignedId = await pickIdleBarber(client, branchId, freeIds)
    if (!assignedId) { await client.query('ROLLBACK'); return null }

    await client.query(`UPDATE bookings SET barber_id = $1 WHERE id = $2`, [assignedId, booking.id])
    await client.query('COMMIT')
    return { bookingId: booking.id, barberId: assignedId }
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[tryAssignDeferred]', err)
    return null
  } finally { client.release() }
}

module.exports = { getActiveBarbers, getFreeBarberIds, pickIdleBarber, tryAssignDeferred }
