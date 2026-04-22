const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:10v3Jesus1503@localhost:5432/bercut'
});

async function check() {
  const { rows } = await pool.query(`
    SELECT p.name as package_name, s.name as service_name, s.image_url
    FROM package_services ps
    JOIN services p ON p.id = ps.package_id
    JOIN services s ON s.id = ps.service_id
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit();
}
check();
