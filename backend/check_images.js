const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:10v3Jesus1503@localhost:5432/bercut'
});

async function check() {
  const { rows } = await pool.query('SELECT id, name, image_url FROM services WHERE image_url IS NOT NULL LIMIT 10');
  console.log(JSON.stringify(rows, null, 2));
  process.exit();
}
check();
