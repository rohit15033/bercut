require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')
const cron    = require('node-cron')

const app = express()

// ── Middleware ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
}
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ── Static files (built frontend) ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')))

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'))
app.use('/api/kiosk',      require('./routes/kiosk'))
app.use('/api/branches',   require('./routes/branches'))
app.use('/api/barbers',    require('./routes/barbers'))
app.use('/api/services',   require('./routes/services'))
app.use('/api/slots',      require('./routes/slots'))
app.use('/api/bookings',   require('./routes/bookings'))
app.use('/api/customers',  require('./routes/customers'))
app.use('/api/payments',   require('./routes/payments'))
app.use('/api/events',     require('./routes/events'))
app.use('/api/expenses',   require('./routes/expenses'))
app.use('/api/inventory',  require('./routes/inventory'))
app.use('/api/attendance', require('./routes/attendance'))
app.use('/api/reports',    require('./routes/reports'))
app.use('/api/settings',   require('./routes/settings'))
app.use('/api/payroll',    require('./routes/payroll'))
app.use('/api/upload',     require('./routes/upload'))
app.use('/api/barber-breaks', require('./routes/barber-breaks'))

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
})

// ── Background jobs ───────────────────────────────────────────────────────────
const { runPointsExpiry } = require('./services/pointsExpiry')
const { runAutoCancel }   = require('./services/autoCancel')

// Points expiry — nightly at 00:05 WITA (UTC+8 = 16:05 UTC prev day)
cron.schedule('5 16 * * *', () => {
  runPointsExpiry().catch(console.error)
})

// Auto-cancel — every 2 minutes
cron.schedule('*/2 * * * *', () => {
  runAutoCancel().catch(console.error)
})

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Bercut backend running on port ${PORT}`)
})
