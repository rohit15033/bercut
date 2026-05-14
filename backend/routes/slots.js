const router = require('express').Router()
const { requireKioskOrAdmin } = require('../middleware/auth')
const { getAvailableSlots, getUnionSlots, getNowWindow } = require('../services/slotGenerator')

// GET /api/slots?barber_id=&date=&duration_min=&walkin=true
router.get('/', requireKioskOrAdmin, async (req, res) => {
  try {
    const { barber_id, date, duration_min, walkin } = req.query
    if (!barber_id || !date) {
      return res.status(400).json({ message: 'barber_id and date required' })
    }
    const slots = await getAvailableSlots(barber_id, date, parseInt(duration_min || 30), walkin === 'true')
    res.json(slots)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/slots/any-available?branch_id=&date=&duration_min=&walkin=true
// Returns union of all active barbers' available slots for the branch
router.get('/any-available', requireKioskOrAdmin, async (req, res) => {
  try {
    const { branch_id, date, duration_min, walkin } = req.query
    if (!branch_id || !date) return res.status(400).json({ message: 'branch_id and date required' })
    const durationMin = parseInt(duration_min || 30)

    const slots = await getUnionSlots(branch_id, date, durationMin, walkin === 'true')
    res.json(slots)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/slots/now-window?branch_id=&date= OR ?barber_id=&date=
// Returns { freeNow, windowMin } — how many minutes are available for a walk-in starting now
router.get('/now-window', requireKioskOrAdmin, async (req, res) => {
  try {
    const { branch_id, barber_id, date } = req.query
    if (!date) return res.status(400).json({ message: 'date required' })
    if (!branch_id && !barber_id) return res.status(400).json({ message: 'branch_id or barber_id required' })
    const result = await getNowWindow(branch_id, barber_id, date)
    res.json(result)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
