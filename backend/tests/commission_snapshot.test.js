// commission_snapshot.test.js
//
// Verifies Fix 1: GET /api/bookings returns booking_services[].commission_rate
// from the snapshotted value in booking_services.commission_rate (bs.commission_rate)
// rather than pulling from current lookup tables.
//
// The COALESCE priority under test:
//   bs.commission_rate  (snapshot — highest priority)
//   bar_svc.commission_rate  (barber_services current lookup)
//   brs.commission_rate      (branch_services current lookup)
//   b_inner.commission_rate  (barbers current fallback)
//   35                       (hardcoded default)
//
// We mock pool.query to return shaped rows that simulate what PostgreSQL
// hands back after the subquery aggregation, then assert the response.

jest.mock('../middleware/auth', () => ({
  requireAdmin:        (req, res, next) => next(),
  requireKiosk:        (req, res, next) => { req.branchId = 'test-branch-id'; next() },
  requireKioskOrAdmin: (req, res, next) => { req.branchId = 'test-branch-id'; next() },
  JWT_SECRET: 'test-secret',
}))

jest.mock('../middleware/branchScope', () => ({
  branchScope:   (req, res, next) => { req.branchId = 'test-branch-id'; next() },
  requireBranch: (req, res, next) => next(),
}))

jest.mock('../services/slotGenerator', () => ({
  getAvailableSlots: jest.fn(),
  getUnionSlots:     jest.fn(),
  getNowWindow:      jest.fn(),
}))

jest.mock('../config/db', () => {
  const client = { query: jest.fn(), release: jest.fn() }
  const pool   = { query: jest.fn(), connect: jest.fn().mockResolvedValue(client), _client: client }
  return pool
})

jest.mock('../services/notifications', () => ({
  notifyBookingConfirmed: jest.fn().mockResolvedValue(undefined),
  notifyBarberNewBooking: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../routes/events', () => ({ emitEvent: jest.fn() }))

jest.mock('../services/barberAssignment', () => ({
  getFreeBarberIds:  jest.fn().mockResolvedValue(['barber-id-1']),
  pickIdleBarber:    jest.fn().mockResolvedValue('barber-id-1'),
  tryAssignDeferred: jest.fn().mockResolvedValue(null),
}))

const request = require('supertest')
const express = require('express')
const pool    = require('../config/db')

const bookingsRouter = require('../routes/bookings')

const app = express()
app.use(express.json())
app.use('/api/bookings', bookingsRouter)

const BARBER_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const DATE      = '2026-05-14'

// Helper — builds a minimal booking row as the DB subquery would produce it.
function makeBookingRow({
  bookingId       = 'bk-snap-1',
  totalAmount     = 80000,
  commissionRates = [40],   // per-service commission rates returned in booking_services json
  prices          = [80000],
} = {}) {
  const bookingServices = commissionRates.map((cr, i) => ({
    id:             `bs-${i}`,
    service_id:     `svc-${i}`,
    name:           `Service ${i}`,
    price:          prices[i] ?? 80000,
    added_mid_cut:  false,
    commission_rate: cr,
  }))

  return {
    id:               bookingId,
    booking_number:   'B001',
    branch_id:        'test-branch-id',
    barber_id:        BARBER_ID,
    status:           'completed',
    scheduled_at:     new Date().toISOString(),
    started_at:       null,
    points_redeemed:  0,
    barber_name:      'Alex',
    customer_name:    'Budi',
    subtotal:         totalAmount,
    extras_total:     0,
    total_amount:     totalAmount,
    slot_time:        '09:00',
    started_time:     null,
    date:             DATE,
    booking_services: bookingServices,
    service_names:    'Haircut',
    est_duration_min: 30,
    tip:              0,
    booking_extras:   null,
  }
}

describe('GET /api/bookings — commission_rate snapshot (Fix 1)', () => {
  beforeEach(() => {
    pool.query.mockReset()
  })

  it('returns booking_services with commission_rate from snapshot (bs.commission_rate)', async () => {
    // The snapshot rate stored in booking_services is 40 (set at booking time).
    // Current barber/branch rates might differ — but since we mock the final query
    // result we confirm the route passes through whatever the DB COALESCE returns.
    const snapshotRate = 40
    pool.query.mockResolvedValueOnce({ rows: [makeBookingRow({ commissionRates: [snapshotRate] })] })

    const res = await request(app).get(`/api/bookings?barber_id=${BARBER_ID}&date=${DATE}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)

    const bk = res.body[0]
    expect(Array.isArray(bk.booking_services)).toBe(true)
    expect(bk.booking_services[0]).toHaveProperty('commission_rate', snapshotRate)
  })

  it('returns multiple booking_services each with their own commission_rate', async () => {
    // Two services — snapshot rates 45 and 30.
    const row = makeBookingRow({
      commissionRates: [45, 30],
      prices:          [60000, 50000],
      totalAmount:     110000,
    })
    pool.query.mockResolvedValueOnce({ rows: [row] })

    const res = await request(app).get(`/api/bookings?barber_id=${BARBER_ID}&date=${DATE}`)

    expect(res.status).toBe(200)
    const svcs = res.body[0].booking_services
    expect(svcs).toHaveLength(2)
    expect(svcs[0].commission_rate).toBe(45)
    expect(svcs[1].commission_rate).toBe(30)
  })

  it('falls back to default 35 when snapshot and all lookup rates are null', async () => {
    // Simulate DB COALESCE resolving to 35 (hardcoded default) because bs.commission_rate
    // and every lookup rate is NULL.
    const row = makeBookingRow({ commissionRates: [35] })
    pool.query.mockResolvedValueOnce({ rows: [row] })

    const res = await request(app).get(`/api/bookings?barber_id=${BARBER_ID}&date=${DATE}`)

    expect(res.status).toBe(200)
    expect(res.body[0].booking_services[0].commission_rate).toBe(35)
  })

  it('returns an empty array when no bookings match', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get(`/api/bookings?barber_id=${BARBER_ID}&date=${DATE}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('filters by barber_id query param (passes param to pool.query)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get(`/api/bookings?barber_id=${BARBER_ID}&date=${DATE}`)

    // The SQL is a single pool.query call; verify it was called with the barber id.
    expect(pool.query).toHaveBeenCalledTimes(1)
    const [_sql, params] = pool.query.mock.calls[0]
    expect(params).toContain(BARBER_ID)
    expect(params).toContain(DATE)
  })

  // ── Verify COALESCE priority in the SQL string itself ─────────────────────────
  //
  // This test inspects the SQL passed to pool.query to assert that bs.commission_rate
  // (the snapshot column) is the FIRST argument in the COALESCE, not a fallback.

  it('SQL query uses COALESCE with bs.commission_rate as the first (highest-priority) argument', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get(`/api/bookings?barber_id=${BARBER_ID}&date=${DATE}`)

    expect(pool.query).toHaveBeenCalledTimes(1)
    const sql = pool.query.mock.calls[0][0]

    // The COALESCE expression for commission_rate must start with bs.commission_rate.
    // This is the critical assertion: snapshot value comes first.
    expect(sql).toMatch(/COALESCE\s*\(\s*bs\.commission_rate/i)
  })
})
