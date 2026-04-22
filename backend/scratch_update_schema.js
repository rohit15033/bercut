const pool = require('./config/db')

async function run() {
  try {
    console.log('Updating bookings_payment_method_check constraint...')
    await pool.query('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check')
    await pool.query("ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check CHECK (payment_method IN ('qris', 'card', 'cash', 'manual'))")
    console.log('Success!')
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
