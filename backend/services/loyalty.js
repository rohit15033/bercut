const pool = require('../config/db')
const { notifyPointsEarned } = require('./notifications')

async function awardPoints(bookingId) {
  const client = await pool.connect()
  try {
    // 1. Get booking and global settings
    const bkRes = await client.query(`
      SELECT bk.id, bk.customer_id, bk.points_earned,
             (SELECT COALESCE(SUM(price_charged), 0) FROM booking_services WHERE booking_id = bk.id) AS subtotal
      FROM bookings bk
      WHERE bk.id = $1 AND bk.customer_id IS NOT NULL AND bk.status = 'completed'
    `, [bookingId])
    
    if (!bkRes.rows.length) return
    const booking = bkRes.rows[0]
    
    const gsRes = await client.query('SELECT points_earn_rate FROM global_settings LIMIT 1')
    const earnRate = gsRes.rows[0]?.points_earn_rate || 0.0001
    
    // 2. Calculate points (usually subtotal * earn_rate)
    const pointsToEarn = Math.floor(booking.subtotal * earnRate)
    if (pointsToEarn <= 0) return

    await client.query('BEGIN')
    
    // 3. Update booking
    await client.query('UPDATE bookings SET points_earned = $1 WHERE id = $2', [pointsToEarn, bookingId])
    
    // 4. Update customer balance
    const custRes = await client.query(
      'UPDATE customers SET points_balance = points_balance + $1, points_last_activity_at = NOW() WHERE id = $2 RETURNING *',
      [pointsToEarn, booking.customer_id]
    )
    const customer = custRes.rows[0]
    
    // 5. Record transaction
    await client.query(
      `INSERT INTO point_transactions (customer_id, booking_id, type, points, balance_after, note)
       VALUES ($1, $2, 'earn', $3, $4, 'Earned from booking')`,
      [customer.id, bookingId, pointsToEarn, customer.points_balance]
    )
    
    await client.query('COMMIT')
    
    // 6. Notify customer
    await notifyPointsEarned(customer, pointsToEarn)
    
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[Loyalty] Award points failed:', err)
  } finally {
    client.release()
  }
}

module.exports = { awardPoints }
