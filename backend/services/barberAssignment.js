const pool = require('../config/db')

// Returns barbers sorted by idle time: who completed last service earliest today (or never = null) comes first.
// Alphabetical tiebreaker for nulls (start of day).
async function getActiveBarbers(client, branchId) {
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Makassar' }).slice(0, 10)
  const { rows } = await client.query(
    `SELECT b.id, b.name, MAX(bk.completed_at) AS last_completed_at
     FROM barbers b
     LEFT JOIN bookings bk ON bk.barber_id = b.id
       AND bk.status IN ('pending_payment','completed')
       AND DATE(bk.completed_at AT TIME ZONE 'Asia/Makassar') = $2
     WHERE b.branch_id = $1 AND b.is_active = true AND b.status NOT IN ('clocked_out','off')
     GROUP BY b.id, b.name
     ORDER BY last_completed_at ASC NULLS FIRST, b.name ASC`,
    [branchId, today]
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

// Picks the barber whose current workload ends soonest — used when all are busy.
async function pickFastestBarber(client, branchId) {
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Makassar' }).slice(0, 10)
  const { rows } = await client.query(
    `SELECT b.id,
       COALESCE(
         MAX(CASE WHEN bk.status = 'in_progress'
                  THEN GREATEST(bk.scheduled_at + ((dur.total_dur + 5) * INTERVAL '1 minute'), NOW())
                  ELSE bk.scheduled_at + ((dur.total_dur + 5) * INTERVAL '1 minute')
             END),
         NOW()
       ) AS est_end
     FROM barbers b
     LEFT JOIN bookings bk ON bk.barber_id = b.id
       AND bk.status IN ('confirmed','in_progress')
       AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
     LEFT JOIN (
       SELECT bsv.booking_id, SUM(s.duration_minutes) AS total_dur
       FROM booking_services bsv JOIN services s ON s.id = bsv.service_id
       GROUP BY bsv.booking_id
     ) dur ON dur.booking_id = bk.id
     WHERE b.branch_id = $1 AND b.is_active = true AND b.status NOT IN ('clocked_out','off','on_break')
     GROUP BY b.id
     ORDER BY est_end ASC
     LIMIT 1`,
    [branchId, today]
  )
  return rows[0]?.id || null
}

// Called after barber clicks Selesai — assigns oldest upcoming deferred booking to that barber.
// No picking needed: the barber who just finished IS the most recently idle.
async function tryAssignDeferred(branchId, completingBarberId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: deferred } = await client.query(
      `SELECT id FROM bookings
       WHERE branch_id = $1 AND barber_id IS NULL AND status = 'confirmed'
         AND scheduled_at <= NOW() + INTERVAL '30 minutes'
       ORDER BY scheduled_at ASC, created_at ASC
       LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [branchId]
    )
    if (!deferred.length) { await client.query('ROLLBACK'); return null }

    await client.query(`UPDATE bookings SET barber_id = $1 WHERE id = $2`, [completingBarberId, deferred[0].id])
    await client.query('COMMIT')
    return { bookingId: deferred[0].id, barberId: completingBarberId }
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[tryAssignDeferred]', err)
    return null
  } finally { client.release() }
}

module.exports = { getActiveBarbers, getFreeBarberIds, pickIdleBarber, pickFastestBarber, tryAssignDeferred }
