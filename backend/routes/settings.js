const router = require('express').Router()
const pool   = require('../config/db')
const bcrypt = require('bcrypt')
const { requireAdmin, requireOwner, checkPermission } = require('../middleware/auth')

// ── Global Settings ────────────────────────────────────────────────────────────
router.get('/global', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM global_settings LIMIT 1')
    res.json(rows[0] || {})
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.patch('/global', requireAdmin, requireOwner, async (req, res) => {
  try {
    const allowed = ['points_earn_rate','points_redemption_rate',
      'points_expiry_months','points_expiry_warning_days']
    const sets = []; const vals = []; let idx = 1
    for (const key of allowed) {
      if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); vals.push(req.body[key]) }
    }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    sets.push('updated_at = NOW()')
    const { rows } = await pool.query(
      `UPDATE global_settings SET ${sets.join(', ')} RETURNING *`, vals)
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── Payroll Settings ───────────────────────────────────────────────────────────
router.get('/payroll', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM payroll_settings LIMIT 1')
    res.json(rows[0] || {})
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.patch('/payroll', requireAdmin, requireOwner, async (req, res) => {
  try {
    const allowed = ['late_deduction_per_minute','late_grace_period_minutes',
      'inexcused_off_flat_deduction','excused_off_flat_deduction',
      'off_quota_per_month','ot_commission_enabled','ot_threshold_time',
      'ot_bonus_pct','working_days_per_week']
    const sets = []; const vals = []; let idx = 1
    for (const key of allowed) {
      if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); vals.push(req.body[key]) }
    }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    sets.push('updated_at = NOW()')
    const { rows } = await pool.query(
      `UPDATE payroll_settings SET ${sets.join(', ')} RETURNING *`, vals)
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── WhatsApp Settings ──────────────────────────────────────────────────────────
router.get('/whatsapp', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM whatsapp_settings LIMIT 1')
    res.json(rows[0] || {})
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.patch('/whatsapp', requireAdmin, requireOwner, async (req, res) => {
  try {
    const allowed = ['enabled','fonnte_token',
      'tpl_booking_confirmed','tpl_booking_reminder','tpl_payment_receipt',
      'tpl_feedback_request','tpl_points_earned','tpl_kasbon_deducted']
    const sets = []; const vals = []; let idx = 1
    for (const key of allowed) {
      if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); vals.push(req.body[key]) }
    }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    sets.push('updated_at = NOW()')
    const { rows } = await pool.query(
      `UPDATE whatsapp_settings SET ${sets.join(', ')} RETURNING *`, vals)
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── Users (admin accounts) ─────────────────────────────────────────────────────
router.get('/users', requireAdmin, requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, role, is_active, last_login_at, created_at FROM users ORDER BY name')
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.post('/users', requireAdmin, requireOwner, async (req, res) => {
  try {
    const { email, name, password, role = 'manager' } = req.body
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'email, name, password required' })
    }
    const hash = await bcrypt.hash(password, 12)
    const { rows } = await pool.query(
      `INSERT INTO users (email, name, password_hash, role) VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO NOTHING RETURNING id, email, name, role`,
      [email.toLowerCase(), name, hash, role])
    if (!rows.length) return res.status(409).json({ message: 'Email already exists' })
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.patch('/users/:id', requireAdmin, requireOwner, async (req, res) => {
  try {
    const allowed = ['name','role','is_active']
    const sets = []; const vals = []; let idx = 1
    for (const key of allowed) {
      if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); vals.push(req.body[key]) }
    }
    if (req.body.password) {
      sets.push(`password_hash = $${idx++}`)
      vals.push(await bcrypt.hash(req.body.password, 12))
    }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    sets.push('updated_at = NOW()')
    vals.push(req.params.id)
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, email, name, role, is_active`, vals)
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── User Permissions ───────────────────────────────────────────────────────────
router.get('/users/:id/permissions', requireAdmin, requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_permissions WHERE user_id = $1', [req.params.id])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.put('/users/:id/permissions', requireAdmin, requireOwner, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM user_permissions WHERE user_id = $1', [req.params.id])
    const { permissions = [] } = req.body
    for (const p of permissions) {
      await client.query(
        `INSERT INTO user_permissions (user_id, section, can_view, can_edit)
         VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, section) DO UPDATE
         SET can_view = $3, can_edit = $4`,
        [req.params.id, p.section, p.can_view ?? true, p.can_edit ?? false])
    }
    await client.query('COMMIT')
    const { rows } = await pool.query(
      'SELECT * FROM user_permissions WHERE user_id = $1', [req.params.id])
    res.json(rows)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
})

// ── Feedback Tags ──────────────────────────────────────────────────────────────
router.get('/feedback-tags', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM feedback_tags ORDER BY label')
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.post('/feedback-tags', requireAdmin, async (req, res) => {
  try {
    const { label, sentiment = 'positive' } = req.body
    const { rows } = await pool.query(
      'INSERT INTO feedback_tags (label, sentiment) VALUES ($1,$2) RETURNING *',
      [label, sentiment])
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.delete('/feedback-tags/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM feedback_tags WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── Expense Categories ─────────────────────────────────────────────────────────
router.get('/expense-categories', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM expense_categories ORDER BY name')
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.post('/expense-categories', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body
    const { rows } = await pool.query(
      'INSERT INTO expense_categories (name, description) VALUES ($1,$2) RETURNING *',
      [name, description||null])
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── Audit Log ──────────────────────────────────────────────────────────────────
router.get('/audit-log', requireAdmin, requireOwner, async (req, res) => {
  try {
    const { user_id, table_name, limit = 100 } = req.query
    const conds = []; const vals = []; let idx = 1
    if (user_id)    { conds.push(`al.user_id = $${idx++}`);    vals.push(user_id) }
    if (table_name) { conds.push(`al.table_name = $${idx++}`); vals.push(table_name) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT al.*, u.name AS user_name FROM audit_log al
       LEFT JOIN users u ON u.id = al.user_id
       ${where} ORDER BY al.created_at DESC LIMIT $${idx}`,
      [...vals, limit])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── Kiosk Settings ─────────────────────────────────────────────────────────────
router.get('/kiosk/:branch_id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM kiosk_settings WHERE branch_id = $1', [req.params.branch_id])
    res.json(rows[0] || {})
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.patch('/kiosk/:branch_id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['idle_timeout_sec','idle_video_url','show_queue_number',
      'payment_methods_enabled','receipt_footer','theme_accent_color']
    const sets = ['updated_at = NOW()']; const vals = []; let idx = 1
    for (const key of allowed) {
      if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); vals.push(req.body[key]) }
    }
    vals.push(req.params.branch_id)
    const { rows } = await pool.query(
      `INSERT INTO kiosk_settings (branch_id) VALUES ($${idx})
       ON CONFLICT (branch_id) DO UPDATE SET ${sets.join(', ')} RETURNING *`, vals)
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
