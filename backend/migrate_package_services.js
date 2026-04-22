const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Creating package_services table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS package_services (
        package_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        PRIMARY KEY (package_id, service_id)
      );
    `);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
