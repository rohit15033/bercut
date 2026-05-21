const pool = require('../config/db')

/**
 * Snapshots OT-adjusted commission into booking_services rows for a given booking.
 * Must be called inside an existing DB transaction — pass the `client` from the caller.
 * Falls back to pool if no client is provided (for standalone use).
 *
 * @param {string} bookingId
 * @param {object} [client] - pg PoolClient already in a BEGIN transaction
 */
async function snapshotCommission(bookingId, client) {
  const db = client || pool

  // 1. Fetch OT settings
  const ps = await db.query(
    'SELECT ot_commission_enabled, ot_threshold_time, ot_bonus_pct, ot_excluded_service_ids FROM payroll_settings LIMIT 1'
  )
  const otEnabled   = ps.rows[0]?.ot_commission_enabled || false
  const otThreshold = String(ps.rows[0]?.ot_threshold_time || '19:00').slice(0, 5)
  const otBonusPct  = parseFloat(ps.rows[0]?.ot_bonus_pct || 10)
  const otExcluded  = Array.isArray(ps.rows[0]?.ot_excluded_service_ids)
    ? ps.rows[0].ot_excluded_service_ids
    : []

  // 2. Fetch booking timing
  const bkRes = await db.query(
    'SELECT started_at, scheduled_at FROM bookings WHERE id = $1',
    [bookingId]
  )
  if (!bkRes.rows.length) return
  const bk = bkRes.rows[0]

  // Derive slot time in Asia/Makassar (WITA, UTC+8)
  const slotTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(bk.started_at || bk.scheduled_at))
    .replace(/[^\d:]/g, '')
    .slice(0, 5)

  const isOtBooking = otEnabled && slotTime >= otThreshold

  // 3. Fetch all services for this booking
  const svcs = await db.query(
    'SELECT id, service_id, price_charged, commission_rate FROM booking_services WHERE booking_id = $1',
    [bookingId]
  )

  for (const svc of svcs.rows) {
    const baseRate   = parseFloat(svc.commission_rate || 0)
    const isExcluded = otExcluded.includes(svc.service_id)
    const isOtSvc    = isOtBooking && !isExcluded
    const rateApplied = isOtSvc ? baseRate + otBonusPct : baseRate
    const amount      = Math.round(svc.price_charged * rateApplied / 100)

    await db.query(
      `UPDATE booking_services
       SET commission_amount = $1, commission_rate_applied = $2, is_ot_service = $3
       WHERE id = $4`,
      [amount, rateApplied, isOtSvc, svc.id]
    )
  }
}

module.exports = { snapshotCommission }
