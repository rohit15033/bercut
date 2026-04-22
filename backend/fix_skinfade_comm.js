const pool = require('./config/db')

async function run() {
  try {
    const res = await pool.query(`
      INSERT INTO branch_services (service_id, branch_id, is_available, commission_rate)
      SELECT s.id, b.id, true, 35
      FROM services s
      CROSS JOIN branches b
      WHERE s.name = 'Skin Fade'
      ON CONFLICT (service_id, branch_id) DO UPDATE SET commission_rate = 35
    `)
    console.log('Success! Skin Fade now has 35% branch commission.')
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
