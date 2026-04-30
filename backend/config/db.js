const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'bercut',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max:      20,
  idleTimeoutMillis:       10000,   // drop idle connections after 10s to avoid stale pool
  connectionTimeoutMillis: 10000,   // wait up to 10s to acquire a connection under load
  keepAlive:               true,    // send TCP keepalives so idle connections aren't silently dropped
  keepAliveInitialDelayMillis: 10000,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err)
})

module.exports = pool
