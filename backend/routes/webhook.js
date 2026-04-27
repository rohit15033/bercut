const router = require('express').Router()
const pool   = require('../config/db')
const { sendWhatsApp } = require('../services/notifications')

// POST /api/webhook/fonnte
// Fonnte calls this when someone messages the device number.
// Sends the no-reply notice exactly once per phone number.
router.post('/fonnte', async (req, res) => {
  try {
    const phone = (req.body.sender || '').replace(/[^0-9]/g, '')
    if (!phone) return res.json({ ok: true })

    const existing = await pool.query(
      'SELECT 1 FROM wa_autoreply_log WHERE phone = $1', [phone])
    if (existing.rows.length) return res.json({ ok: true })

    const wsRes = await pool.query(
      'SELECT enabled, fonnte_token, tpl_autoreply FROM whatsapp_settings LIMIT 1')
    const ws = wsRes.rows[0]
    if (!ws || !ws.enabled || !ws.fonnte_token || !ws.tpl_autoreply) {
      return res.json({ ok: true })
    }

    await sendWhatsApp(phone, ws.tpl_autoreply, ws.fonnte_token)

    await pool.query(
      'INSERT INTO wa_autoreply_log (phone) VALUES ($1) ON CONFLICT DO NOTHING', [phone])

    res.json({ ok: true })
  } catch (err) {
    console.error('[Webhook/Fonnte]', err.message)
    res.status(500).json({ ok: false })
  }
})

module.exports = router
