const router = require('express').Router()
const pool   = require('../config/db')
const { requireAdmin, requireKioskOrAdmin } = require('../middleware/auth')

// GET /api/attendance?branch_id=&barber_id=&month=&year=
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { branch_id, barber_id, month, year } = req.query
    const conds = []; const vals = []; let idx = 1
    if (branch_id) { conds.push(`a.branch_id = $${idx++}`); vals.push(branch_id) }
    if (barber_id) { conds.push(`a.barber_id = $${idx++}`); vals.push(barber_id) }
    if (month) { conds.push(`EXTRACT(MONTH FROM a.clock_in_at AT TIME ZONE 'Asia/Makassar') = $${idx++}`); vals.push(month) }
    if (year)  { conds.push(`EXTRACT(YEAR FROM a.clock_in_at AT TIME ZONE 'Asia/Makassar') = $${idx++}`);  vals.push(year) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT a.*,
              DATE(a.clock_in_at AT TIME ZONE 'Asia/Makassar') AS work_date,
              b.name AS barber_name
       FROM attendance a
       LEFT JOIN barbers b ON b.id = a.barber_id
       ${where} ORDER BY a.clock_in_at DESC`, vals)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/attendance/clock-in
router.post('/clock-in', requireKioskOrAdmin, async (req, res) => {
  try {
    const { barber_id, branch_id } = req.body
    if (!barber_id || !branch_id) return res.status(400).json({ message: 'barber_id and branch_id required' })
    const today = new Date().toISOString().slice(0, 10)
    // Check if already clocked in today (WITA)
    const existing = await pool.query(
      `SELECT id FROM attendance
       WHERE barber_id = $1 AND DATE(clock_in_at AT TIME ZONE 'Asia/Makassar') = $2`,
      [barber_id, today])
    if (existing.rows.length) return res.status(409).json({ message: 'Already clocked in today' })
    const { rows } = await pool.query(
      'INSERT INTO attendance (barber_id, branch_id, clock_in_at) VALUES ($1,$2,NOW()) RETURNING *',
      [barber_id, branch_id])
    res.status(201).json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/attendance/clock-out
router.post('/clock-out', requireKioskOrAdmin, async (req, res) => {
  try {
    const { barber_id } = req.body
    if (!barber_id) return res.status(400).json({ message: 'barber_id required' })
    const today = new Date().toISOString().slice(0, 10)
    const { rows } = await pool.query(
      `UPDATE attendance SET clock_out_at = NOW()
       WHERE barber_id = $1
         AND DATE(clock_in_at AT TIME ZONE 'Asia/Makassar') = $2
         AND clock_out_at IS NULL
       RETURNING *`,
      [barber_id, today])
    if (!rows.length) return res.status(409).json({ message: 'No open clock-in found' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/attendance/log-off — admin logs a barber's day off
router.post('/log-off', requireAdmin, async (req, res) => {
  try {
    const { barber_id, branch_id, date, type = 'excused', note, has_doctor_note = false } = req.body
    if (!barber_id || !branch_id || !date) {
      return res.status(400).json({ message: 'barber_id, branch_id, date required' })
    }
    if (!['excused','inexcused'].includes(type)) {
      return res.status(400).json({ message: 'type must be excused or inexcused' })
    }
    const { rows } = await pool.query(
      `INSERT INTO off_records (barber_id, branch_id, date, type, note, has_doctor_note, logged_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING RETURNING *`,
      [barber_id, branch_id, date, type, note || null, has_doctor_note, req.user?.id || null])
    res.status(201).json(rows[0] || { message: 'Record already exists' })
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/attendance/off-records?barber_id=&branch_id=
router.get('/off-records', requireAdmin, async (req, res) => {
  try {
    const { barber_id, branch_id } = req.query
    const conds = []; const vals = []; let idx = 1
    if (barber_id) { conds.push(`o.barber_id = $${idx++}`); vals.push(barber_id) }
    if (branch_id) { conds.push(`o.branch_id = $${idx++}`); vals.push(branch_id) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT o.*, b.name AS barber_name FROM off_records o
       LEFT JOIN barbers b ON b.id = o.barber_id
       ${where} ORDER BY o.date DESC`, vals)
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PATCH /api/attendance/:id — admin manual correction
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { clock_in_at, clock_out_at } = req.body
    const sets = []; const vals = []; let idx = 1
    if (clock_in_at)  { sets.push(`clock_in_at = $${idx++}`);  vals.push(clock_in_at) }
    if (clock_out_at) { sets.push(`clock_out_at = $${idx++}`); vals.push(clock_out_at) }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    vals.push(req.params.id)
    const { rows } = await pool.query(
      `UPDATE attendance SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals)
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
