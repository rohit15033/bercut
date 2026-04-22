const pool = require('./backend/config/db')
async function check() {
  const { rows } = await pool.query('SELECT name, online_booking_slug FROM branches')
  console.table(rows)
  process.exit()
}
check()
