const router  = require('express').Router()
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const pool    = require('../config/db')
const { JWT_SECRET } = require('../middleware/auth')

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' })
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, name, role, is_active FROM users WHERE email = $1',
      [email.toLowerCase()])
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' })
    const user = rows[0]
    if (!user.is_active) return res.status(403).json({ message: 'Account deactivated' })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id])
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '8h' })
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/auth/me
router.get('/me', require('../middleware/auth').requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
