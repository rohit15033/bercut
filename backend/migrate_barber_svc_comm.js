const pool = require('./config/db')

async function run() {
  try {
    console.log('Adding commission_rate to barber_services...')
    await pool.query('ALTER TABLE barber_services ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT NULL')
    console.log('Success!')
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
