const router = require('express').Router()
const crypto = require('crypto')
const pool   = require('../config/db')
const { requireAdmin } = require('../middleware/auth')

// POST /api/kiosk/register — validate token, return branch config
router.post('/register', async (req, res) => {
  try {
    const raw = req.headers['x-kiosk-token'] || req.body.token
    if (!raw) return res.status(400).json({ message: 'Token required' })
    const hash = crypto.createHash('sha256').update(raw).digest('hex')
    const { rows } = await pool.query(
      `SELECT kt.id, kt.branch_id, b.name AS branch_name, b.timezone,
              ks.welcome_cta, ks.welcome_cta_id, ks.welcome_subtitle, ks.welcome_subtitle_id,
              ks.upsell_enabled, ks.upsell_rules, ks.suggest_services, ks.category_order,
              ks.svc_order_by_cat, ks.service_visible, ks.session_timeout_secs,
              ks.upsell_heading, ks.upsell_heading_id, ks.upsell_switch_cta, ks.upsell_keep_cta,
              b.tip_presets
       FROM kiosk_tokens kt
       JOIN branches b ON b.id = kt.branch_id
       LEFT JOIN kiosk_settings ks ON ks.branch_id = kt.branch_id
       WHERE kt.token_hash = $1 AND kt.is_active = true`, [hash])
    if (!rows.length) return res.status(401).json({ message: 'Invalid or revoked token' })
    const row = rows[0]
    pool.query('UPDATE kiosk_tokens SET last_seen_at = NOW() WHERE id = $1', [row.id]).catch(() => {})

    // Also fetch feedback tags, menu items, services, and barbers
    const [tagRes, menuRes, svcRes, barberRes] = await Promise.all([
      pool.query('SELECT id, label, context, sort_order FROM feedback_tags WHERE is_active = true ORDER BY sort_order'),
      pool.query(`SELECT ii.id, ii.name, ii.category, ist.price, ist.current_stock, ist.kiosk_visible
                  FROM inventory_stock ist
                  JOIN inventory_items ii ON ii.id = ist.item_id
                  WHERE ist.branch_id = $1 AND ist.kiosk_visible = true AND ii.category IN ('beverage','product')
                  ORDER BY ii.category, ii.name`, [row.branch_id]),
      pool.query(`SELECT s.id, s.name, s.name_id, s.category, s.duration_minutes, s.badge,
                         s.description, s.image_url, s.mutex_group,
                         COALESCE(bs.price, s.base_price) AS price
                  FROM services s
                  LEFT JOIN branch_services bs ON bs.service_id = s.id AND bs.branch_id = $1
                  WHERE s.is_active = true AND COALESCE(bs.is_available, true) = true
                  ORDER BY s.sort_order, s.name`, [row.branch_id]),
      pool.query(`SELECT id, name, specialty, specialty_id, avatar_url, status
                  FROM barbers
                  WHERE branch_id = $1 AND is_active = true
                  ORDER BY name`, [row.branch_id])
    ])

    // Map service categories to match frontend expectation (Haircut vs haircut)
    const categoryMap = {
      'haircut':   'Haircut',
      'beard':     'Beard',
      'treatment': 'Treatment',
      'hair_color':'HairColor',
      'package':   'Package'
    }

    const services = svcRes.rows.map(s => ({
      ...s,
      category: categoryMap[s.category] || s.category
    }))

    const barbers = barberRes.rows.map(b => ({
      ...b,
      spec: b.specialty,
      spec_id: b.specialty_id,
      image_url: b.avatar_url,
      // Map 'available' to 'active' if that's what the frontend expects
      status: b.status === 'available' ? 'active' : b.status
    }))

    res.json({
      branch_id: row.branch_id,
      branch_name: row.branch_name,
      timezone: row.timezone,
      tip_presets: row.tip_presets || [5000, 10000, 20000, 50000, 100000],
      settings: {
        welcomeCta: row.welcome_cta || 'Book Now',
        welcomeCtaId: row.welcome_cta_id || 'Pesan Sekarang',
        welcomeSubtitle: row.welcome_subtitle || 'No. 1 Barber in The Island of Paradise',
        welcomeSubtitleId: row.welcome_subtitle_id || 'Barber Terbaik di Pulau Dewata',
        upsellEnabled: row.upsell_enabled !== false,
        upsellRules: row.upsell_rules || [],
        suggestServices: row.suggest_services || null,
        categoryOrder: row.category_order || null,
        svcOrderByCat: row.svc_order_by_cat || null,
        serviceVisible: row.service_visible || null,
        sessionTimeoutSecs: row.session_timeout_secs || 60,
        upsellHeading: row.upsell_heading,
        upsellHeadingId: row.upsell_heading_id,
        upsellSwitchCta: row.upsell_switch_cta,
        upsellKeepCta: row.upsell_keep_cta,
        tipPresets: row.tip_presets || [5000, 10000, 20000, 50000, 100000],
      },
      feedback_tags: tagRes.rows,
      menu_items: menuRes.rows,
      services,
      barbers
    })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/pax-out — log idle timeout / back press
router.post('/pax-out', async (req, res) => {
  try {
    const branchId = req.branchId || req.body.branch_id
    const { step, step_label, source } = req.body
    if (!branchId) return res.status(400).json({ message: 'branch_id required' })
    await pool.query(
      'INSERT INTO pax_out_events (branch_id, step, step_label, source) VALUES ($1,$2,$3,$4)',
      [branchId, step || 0, step_label || '', source || 'kiosk_back'])
    res.status(204).end()
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// ── Admin: manage kiosk tokens ────────────────────────────────────────────
// GET  /api/kiosk/tokens?branch_id=
router.get('/tokens', requireAdmin, async (req, res) => {
  try {
    const { branch_id } = req.query
    if (!branch_id) return res.status(400).json({ message: 'branch_id required' })
    const { rows } = await pool.query(
      `SELECT id, device_name, is_active, last_seen_at, created_at,
              CONCAT(SUBSTR(token_hash, 1, 8), '...') AS token_preview
       FROM kiosk_tokens WHERE branch_id = $1 ORDER BY created_at`, [branch_id])
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/kiosk/tokens — generate new token
router.post('/tokens', requireAdmin, async (req, res) => {
  try {
    const { branch_id, device_name } = req.body
    if (!branch_id) return res.status(400).json({ message: 'branch_id required' })
    // Generate a secure random token
    const raw = 'BERCUT-' + crypto.randomBytes(12).toString('hex').toUpperCase()
    const hash = crypto.createHash('sha256').update(raw).digest('hex')
    const { rows } = await pool.query(
      `INSERT INTO kiosk_tokens (branch_id, token_hash, device_name, is_active, created_by)
       VALUES ($1,$2,$3,true,$4) RETURNING id, device_name, created_at, is_active`,
      [branch_id, hash, device_name || 'Kiosk', req.user.id])
    // Return raw token ONCE — never stored again
    res.json({ ...rows[0], token: raw, warning: 'Store this token securely — it will not be shown again.' })
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// DELETE /api/kiosk/tokens/:id — revoke
router.delete('/tokens/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE kiosk_tokens SET is_active = false WHERE id = $1', [req.params.id])
    res.status(204).end()
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
