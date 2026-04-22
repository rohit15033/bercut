const pool = require('./backend/config/db')

async function fix() {
  try {
    await pool.query(`
      ALTER TABLE barber_breaks ADD COLUMN IF NOT EXISTS note TEXT;
    `)
    console.log('Fixed barber_breaks table')
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

fix()
