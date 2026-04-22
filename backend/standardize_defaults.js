const pool = require('./config/db')

async function run() {
  try {
    console.log('Standardizing defaults to 35%...')
    await pool.query('ALTER TABLE barbers ALTER COLUMN commission_rate SET DEFAULT 35.00')
    await pool.query('UPDATE barbers SET commission_rate = 35.00 WHERE commission_rate = 40.00')
    console.log('Success!')
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
