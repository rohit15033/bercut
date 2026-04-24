const router = require('express').Router()
const { requireKioskOrAdmin } = require('../middleware/auth')
const { getAvailableSlots, getUnionSlots } = require('../services/slotGenerator')

// GET /api/slots?barber_id=&date=&duration_min=
router.get('/', requireKioskOrAdmin, async (req, res) => {
  try {
    const { barber_id, date, duration_min } = req.query
    if (!barber_id || !date) {
      return res.status(400).json({ message: 'barber_id and date required' })
    }
    const slots = await getAvailableSlots(barber_id, date, parseInt(duration_min || 30))
    res.json(slots)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/slots/any-available?branch_id=&date=&duration_min=
// Returns union of all active barbers' available slots for the branch
router.get('/any-available', requireKioskOrAdmin, async (req, res) => {
  try {
    const { branch_id, date, duration_min } = req.query
    if (!branch_id || !date) return res.status(400).json({ message: 'branch_id and date required' })
    const durationMin = parseInt(duration_min || 30)

    const slots = await getUnionSlots(branch_id, date, durationMin)
    res.json(slots)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
