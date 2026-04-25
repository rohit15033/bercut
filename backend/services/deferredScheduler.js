const pool = require('../config/db')
const { emitEvent } = require('../routes/events')
const { notifyBarberNewBooking } = require('./notifications')
const { getFreeBarberIds, pickIdleBarber } = require('./barberAssignment')

// Runs every minute — assigns deferred future-slot bookings starting within 30 minutes.
async function assignUpcomingDeferred() {
  try {
    const { rows: branches } = await pool.query(
      `SELECT DISTINCT branch_id FROM bookings
       WHERE barber_id IS NULL AND status = 'confirmed'
         AND scheduled_at <= NOW() + INTERVAL '30 minutes'
         AND scheduled_at > NOW() - INTERVAL '2 hours'`
    )
    for (const { branch_id } of branches) {
      await assignDeferredForBranch(branch_id)
    }
  } catch (err) {
    console.error('[deferredScheduler]', err)
  }
}

async function assignDeferredForBranch(branchId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: deferred } = await client.query(
      `WITH candidate AS (
         SELECT bk.id, bk.scheduled_at
         FROM bookings bk
         WHERE bk.branch_id = $1
           AND bk.barber_id IS NULL
           AND bk.status = 'confirmed'
           AND bk.scheduled_at <= NOW() + INTERVAL '30 minutes'
           AND bk.scheduled_at > NOW() - INTERVAL '2 hours'
         ORDER BY bk.scheduled_at ASC, bk.created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       SELECT c.id, c.scheduled_at, COALESCE(d.total_dur, 30) AS total_dur
       FROM candidate c
       LEFT JOIN (
         SELECT bsv.booking_id, SUM(s.duration_minutes) AS total_dur
         FROM booking_services bsv
         JOIN services s ON s.id = bsv.service_id
         GROUP BY bsv.booking_id
       ) d ON d.booking_id = c.id`,
      [branchId]
    )
    if (!deferred.length) { await client.query('ROLLBACK'); return }

    const booking = deferred[0]
    const freeIds = await getFreeBarberIds(client, branchId, booking.scheduled_at.toISOString(), booking.total_dur)

    // Assign only when at least one barber is actually free.
    let assignedId = await pickIdleBarber(client, branchId, freeIds)
    if (!assignedId) { await client.query('ROLLBACK'); return }

    await client.query(`UPDATE bookings SET barber_id = $1 WHERE id = $2`, [assignedId, booking.id])
    await client.query('COMMIT')

    const { rows } = await pool.query(
      `SELECT bk.*, COALESCE(bk.guest_name, c.name) AS customer_name, bar.name AS barber_name
       FROM bookings bk
       LEFT JOIN customers c ON c.id = bk.customer_id
       LEFT JOIN barbers bar ON bar.id = bk.barber_id
       WHERE bk.id = $1`,
      [booking.id]
    )
    if (rows.length) {
      emitEvent(branchId, 'booking_updated', rows[0])
      notifyBarberNewBooking(rows[0]).catch(e => console.error('[deferredScheduler notify]', e))
    }
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[assignDeferredForBranch]', err)
  } finally {
    client.release()
  }
}

module.exports = { assignUpcomingDeferred }
