const jwt    = require('jsonwebtoken')
const pool   = require('../config/db')
const crypto = require('crypto')

if (!process.env.JWT_SECRET) {
  console.error('[Auth] JWT_SECRET env var is not set — refusing to start')
  process.exit(1)
}
const JWT_SECRET = process.env.JWT_SECRET

// Verify JWT — kept for requireKioskOrAdmin internal use
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' })
  }
  const token = authHeader.slice(7)
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// Verify X-Kiosk-Token for kiosk routes
async function requireKiosk(req, res, next) {
  const token = req.headers['x-kiosk-token']
  if (!token) return res.status(401).json({ message: 'Kiosk token required' })
  try {
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const { rows } = await pool.query(
      `SELECT kt.*, b.id AS b_id, b.name AS b_name, b.timezone
       FROM kiosk_tokens kt
       JOIN branches b ON b.id = kt.branch_id
       WHERE kt.token_hash = $1 AND kt.is_active = true`,
      [hash]
    )
    if (!rows.length) return res.status(401).json({ message: 'Invalid or revoked kiosk token' })
    const row = rows[0]
    req.kiosk = { tokenId: row.id, branchId: row.branch_id, branchName: row.b_name }
    req.branchId = row.branch_id
    pool.query('UPDATE kiosk_tokens SET last_seen_at = NOW() WHERE id = $1', [row.id]).catch(() => {})
    next()
  } catch (err) {
    console.error('Kiosk auth error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Accept either kiosk token OR admin JWT
async function requireKioskOrAdmin(req, res, next) {
  const kioskToken = req.headers['x-kiosk-token'] || req.query.kiosk_token
  if (kioskToken) {
    req.headers['x-kiosk-token'] = kioskToken
    return requireKiosk(req, res, next)
  }
  return requireAdmin(req, res, next)
}

// Single middleware: verifies JWT then checks section permission.
// section keys: reports, barbers, services, customers, expenses, inventory,
//               payroll, online_booking, kiosk_config, branches, settings, live_monitor
// Pass null to skip section check (auth-only).
function checkPermission(section) {
  return async (req, res, next) => {
    // 1. Verify JWT
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' })
    }
    try {
      req.user = jwt.verify(authHeader.slice(7), JWT_SECRET)
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' })
    }

    // 2. Check section permission (skip if section is null — auth-only routes)
    if (!section) return next()

    const { role, id } = req.user
    if (role === 'owner') return next()
    if (role === 'monitoring' && !['overview', 'live_monitor'].includes(section)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    try {
      const { rows } = await pool.query(
        'SELECT is_enabled FROM user_permissions WHERE user_id = $1 AND section = $2',
        [id, section]
      )
      if (rows.length && !rows[0].is_enabled) {
        return res.status(403).json({ message: 'Access denied' })
      }
      next()
    } catch {
      next()
    }
  }
}

module.exports = { requireAdmin, requireKiosk, requireKioskOrAdmin, checkPermission, JWT_SECRET }
