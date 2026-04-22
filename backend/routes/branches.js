const router = require('express').Router()
const pool   = require('../config/db')
const { requireAdmin, requireOwner } = require('../middleware/auth')

// ── GET /api/branches ──────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*,
              (SELECT COUNT(*) FROM barbers br WHERE br.branch_id = b.id AND br.is_active = true) AS barber_count,
              (SELECT COUNT(*) FROM chairs ch WHERE ch.branch_id = b.id) AS chair_count,
              (SELECT COUNT(*) FROM chairs ch WHERE ch.branch_id = b.id AND ch.barber_id IS NOT NULL) AS assigned_chair_count
       FROM branches b
       ORDER BY b.name ASC`)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── GET /api/branches/:id ──────────────────────────────────────────────────────
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM branches WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── GET /api/branches/slug/:slug (Public) ──────────────────────────────────────
router.get('/slug/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, city, online_booking_enabled FROM branches WHERE LOWER(online_booking_slug) = LOWER($1) AND is_active = true', 
      [req.params.slug])
    if (!rows.length) return res.status(404).json({ message: 'Branch not found' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── POST /api/branches ─────────────────────────────────────────────────────────
router.post('/', requireAdmin, requireOwner, async (req, res) => {
  try {
    const {
      name, address, city, timezone = 'Asia/Makassar', is_active = true,
      auto_cancel_minutes = 15, backoffice_alert_phone,
      online_booking_slug, online_booking_enabled = true,
      whatsapp_enabled = true, late_start_threshold_minutes = 10,
      ack_grace_period_minutes = 3, tip_distribution_method = 'individual',
      pay_period_type = 'monthly', speaker_enabled = true,
      web_push_enabled = false, tip_presets,
    } = req.body
    if (!name) return res.status(400).json({ message: 'Name required' })
    const { rows } = await pool.query(
      `INSERT INTO branches
         (name, address, city, timezone, is_active, auto_cancel_minutes, backoffice_alert_phone,
          online_booking_slug, online_booking_enabled, whatsapp_enabled,
          late_start_threshold_minutes, ack_grace_period_minutes,
          tip_distribution_method, pay_period_type, speaker_enabled, web_push_enabled, tip_presets)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [name, address||null, city||null, timezone, is_active, auto_cancel_minutes,
       backoffice_alert_phone||null, online_booking_slug||null, online_booking_enabled,
       whatsapp_enabled, late_start_threshold_minutes, ack_grace_period_minutes,
       tip_distribution_method, pay_period_type, speaker_enabled, web_push_enabled,
       tip_presets ? JSON.stringify(tip_presets) : JSON.stringify([5000,10000,20000,50000,100000])])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    if (err.code === '23505' && err.constraint === 'branches_online_booking_slug_key')
      return res.status(409).json({ message: 'Online booking slug is already taken — choose a different one.' })
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ── PATCH /api/branches/:id ────────────────────────────────────────────────────
router.patch('/:id', requireAdmin, requireOwner, async (req, res) => {
  try {
    const allowed = ['name','address','city','timezone','is_active','auto_cancel_minutes',
      'backoffice_alert_phone','online_booking_slug','online_booking_enabled','whatsapp_enabled',
      'late_start_threshold_minutes','ack_grace_period_minutes','tip_distribution_method',
      'pay_period_type','speaker_enabled','web_push_enabled','tip_presets']
    const sets = []; const vals = []; let idx = 1
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sets.push(`${key} = $${idx++}`)
        vals.push(key === 'tip_presets' ? JSON.stringify(req.body[key]) : req.body[key])
      }
    }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    vals.push(req.params.id)
    const { rows } = await pool.query(
      `UPDATE branches SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals)
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── DELETE /api/branches/:id ───────────────────────────────────────────────────
router.delete('/:id', requireAdmin, requireOwner, async (req, res) => {
  try {
    await pool.query('UPDATE branches SET is_active = false WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── Chairs ─────────────────────────────────────────────────────────────────────

router.get('/:id/chairs', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ch.*, b.name AS barber_name,
              co.barber_id AS override_barber_id, ob.name AS override_barber_name,
              co.id AS override_id
       FROM chairs ch
       LEFT JOIN barbers b ON b.id = ch.barber_id
       LEFT JOIN chair_overrides co ON co.chair_id = ch.id AND co.resolved_by IS NULL
       LEFT JOIN barbers ob ON ob.id = co.barber_id
       WHERE ch.branch_id = $1 ORDER BY ch.sort_order ASC`,
      [req.params.id])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.post('/:id/chairs', requireAdmin, async (req, res) => {
  try {
    const { label, barber_id, sort_order = 0 } = req.body
    const { rows } = await pool.query(
      `INSERT INTO chairs (branch_id, label, barber_id, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, label, barber_id||null, sort_order])
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.patch('/:id/chairs/:chairId', requireAdmin, async (req, res) => {
  try {
    const { label, barber_id, sort_order } = req.body
    const sets = []; const vals = []; let idx = 1
    if (label      !== undefined) { sets.push(`label = $${idx++}`);      vals.push(label) }
    if (barber_id  !== undefined) { sets.push(`barber_id = $${idx++}`);  vals.push(barber_id) }
    if (sort_order !== undefined) { sets.push(`sort_order = $${idx++}`); vals.push(sort_order) }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    vals.push(req.params.chairId)
    const { rows } = await pool.query(
      `UPDATE chairs SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals)
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── Chair Overrides ────────────────────────────────────────────────────────────

router.post('/:id/chairs/:chairId/overrides', requireAdmin, async (req, res) => {
  try {
    const { barber_id } = req.body
    await pool.query(
      'UPDATE chair_overrides SET resolved_by = $1, resolved_at = NOW() WHERE chair_id = $2 AND resolved_by IS NULL',
      ['admin', req.params.chairId])
    const { rows } = await pool.query(
      `INSERT INTO chair_overrides (chair_id, barber_id) VALUES ($1, $2) RETURNING *`,
      [req.params.chairId, barber_id])
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.delete('/:id/chairs/:chairId/overrides', requireAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE chair_overrides SET resolved_by = $1, resolved_at = NOW()
       WHERE chair_id = $2 AND resolved_by IS NULL`,
      ['admin', req.params.chairId])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// ── Kiosk Tokens ───────────────────────────────────────────────────────────────

router.get('/:id/kiosk-tokens', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, label, last_seen_at, created_at FROM kiosk_tokens WHERE branch_id = $1 ORDER BY created_at DESC',
      [req.params.id])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

router.delete('/:id/kiosk-tokens/:tokenId', requireAdmin, requireOwner, async (req, res) => {
  try {
    await pool.query('DELETE FROM kiosk_tokens WHERE id = $1 AND branch_id = $2',
      [req.params.tokenId, req.params.id])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
