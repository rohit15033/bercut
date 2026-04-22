const pool = require('./config/db')

async function run() {
  try {
    const brs = await pool.query('SELECT * FROM branch_services LIMIT 10')
    console.log('Branch Services Commissions:', brs.rows)
    
    const barbs = await pool.query('SELECT name, commission_rate FROM barbers LIMIT 10')
    console.log('Barber Commissions:', barbs.rows)
    
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
