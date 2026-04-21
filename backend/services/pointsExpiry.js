const pool = require('../config/db')

async function runPointsExpiry() {
  const gs = await pool.query('SELECT points_expiry_months FROM global_settings LIMIT 1')
  const months = gs.rows[0]?.points_expiry_months
  if (!months) return

  const expired = await pool.query(
    `UPDATE customers
     SET points_balance = 0, points_last_expired_at = NOW()
     WHERE points_balance > 0
       AND points_last_activity_at < NOW() - ($1 || ' months')::interval
     RETURNING id, points_balance`,
    [months])
  // Log expiry transactions
  for (const c of expired.rows) {
    pool.query(
      `INSERT INTO point_transactions (customer_id, type, points, balance_after, note)
       VALUES ($1,'expired',$2,0,'auto expiry')`,
      [c.id, -c.points_balance]).catch(() => {})
  }
  const rowCount = expired.rowCount

  if (rowCount > 0) {
    console.log(`[pointsExpiry] Expired points for ${rowCount} customers`)
  }
}

module.exports = { runPointsExpiry }
