const router = require('express').Router()
const pool   = require('../config/db')
const { requireKioskOrAdmin } = require('../middleware/auth')
const { emitEvent } = require('./events')

// GET /api/barber-breaks?barber_id=&active=true — fetch breaks
router.get('/', requireKioskOrAdmin, async (req, res) => {
  try {
    const { barber_id, active } = req.query
    if (!barber_id) return res.status(400).json({ message: 'barber_id required' })
    const { rows } = await pool.query(
      `SELECT * FROM barber_breaks WHERE barber_id = $1 ${active === 'true' ? 'AND ended_at IS NULL' : ''} ORDER BY started_at DESC`,
      [barber_id]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /api/barber-breaks — start a break
router.post('/', requireKioskOrAdmin, async (req, res) => {
  try {
    const { barber_id, duration_minutes, note } = req.body
    if (!barber_id) return res.status(400).json({ message: 'barber_id required' })

    // Get branch_id for the barber
    const barberRes = await pool.query('SELECT branch_id FROM barbers WHERE id = $1', [barber_id])
    const branchId = barberRes.rows[0]?.branch_id
    if (!branchId) return res.status(404).json({ message: 'Barber branch not found' })

    const { rows } = await pool.query(
      `INSERT INTO barber_breaks (barber_id, branch_id, started_at, duration_minutes, note)
       VALUES ($1, $2, NOW(), $3, $4) RETURNING *`,
      [barber_id, branchId, duration_minutes || 30, note || null])
    
    // Update barber status
    await pool.query(`UPDATE barbers SET status = 'on_break' WHERE id = $1`, [barber_id])
    
    emitEvent(branchId, 'barber_update', { barber_id, status: 'on_break' })

    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// PATCH /api/barber-breaks/:id/end — end a break
router.patch('/:id/end', requireKioskOrAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      `UPDATE barber_breaks SET ended_at = NOW()
       WHERE id = $1 AND ended_at IS NULL
       RETURNING *`, [id])
    
    if (!rows.length) {
      // If specific break ID not found or already ended, try to find any open break for the barber
      // This handles cases where the client might not have the ID
      return res.status(404).json({ message: 'Break not found or already ended' })
    }

    const barber_id = rows[0].barber_id
    await pool.query(`UPDATE barbers SET status = 'available' WHERE id = $1`, [barber_id])
    
    const barberRes = await pool.query('SELECT branch_id FROM barbers WHERE id = $1', [barber_id])
    const branchId = barberRes.rows[0]?.branch_id
    if (branchId) emitEvent(branchId, 'barber_update', { barber_id, status: 'available' })

    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

module.exports = router
