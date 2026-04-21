const bcrypt = require('bcrypt')
const pool = require('./config/db')

bcrypt.hash('10v3Jesus1503', 10).then(hash => {
  return pool.query(
    `INSERT INTO users (email, password_hash, name, role, is_active)
     VALUES ('rohit15033@gmail.com', $1, 'Owner', 'owner', true)
     ON CONFLICT (email) DO UPDATE SET password_hash = $1`,
    [hash]
  )
}).then(() => {
  console.log('Done. Login: rohit15033@gmail.com / 10v3Jesus1503')
  process.exit(0)
}).catch(err => {
  console.error(err.message)
  process.exit(1)
})
