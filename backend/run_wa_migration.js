require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'migrate_whatsapp.sql'), 'utf8')
  // Split on semicolons and run each statement
  const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'))
  
  for (const stmt of statements) {
    try {
      console.log('Running:', stmt.slice(0, 80) + '...')
      await pool.query(stmt)
      console.log('  ✓ OK')
    } catch (err) {
      console.error('  ✗ Error:', err.message)
    }
  }
  
  // Verify the columns exist now
  const { rows } = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'whatsapp_settings' ORDER BY ordinal_position`)
  console.log('\nCurrent whatsapp_settings columns:', rows.map(r => r.column_name).join(', '))

  // Check row count
  const countRes = await pool.query('SELECT COUNT(*) FROM whatsapp_settings')
  console.log('Row count:', countRes.rows[0].count)

  await pool.end()
}

run().catch(err => { console.error(err); process.exit(1) })
