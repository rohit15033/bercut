// Mock auth before any requires so the middleware is replaced when routes load.
// We use a factory so individual tests can override requireKioskOrAdmin behaviour
// to simulate admin (req.user) vs kiosk (req.kiosk) callers.
let mockRequireKioskOrAdmin = (req, res, next) => { req.branchId = 'test-branch-id'; next() }

jest.mock('../middleware/auth', () => ({
  requireAdmin:        (req, res, next) => next(),
  requireKiosk:        (req, res, next) => { req.branchId = 'test-branch-id'; next() },
  requireKioskOrAdmin: (req, res, next) => mockRequireKioskOrAdmin(req, res, next),
  checkPermission:     () => (req, res, next) => next(),
  JWT_SECRET:          'test-secret',
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

// Deep pool mock — pool.connect() returns a transactional client.
// The handler now uses client.query() exclusively inside the start route.
jest.mock('../config/db', () => {
  const client = {
    query:   jest.fn(),
    release: jest.fn(),
  }
  const pool = {
    query:   jest.fn(),
    connect: jest.fn().mockResolvedValue(client),
    _client: client,
  }
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

const request    = require('supertest')
const express    = require('express')
const bookingsRouter = require('../routes/bookings')
const pool       = require('../config/db')

const app = express()
app.use(express.json())
app.use('/api/bookings', bookingsRouter)

const BOOKING_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const BARBER_ID  = 'aaaaaaaa-0000-0000-0000-000000000001'
const BRANCH_ID  = 'test-branch-id'

// Helper: booking row returned by a successful UPDATE
function confirmedBooking(overrides = {}) {
  return {
    id:         BOOKING_ID,
    barber_id:  BARBER_ID,
    branch_id:  BRANCH_ID,
    status:     'in_progress',
    started_at: new Date().toISOString(),
    ...overrides,
  }
}

// ── PATCH /:id/start — force-start tests ────────────────────────────────────

describe('PATCH /api/bookings/:id/start — force-start', () => {
  // client is the mock object returned by pool.connect()
  let client

  beforeEach(() => {
    jest.clearAllMocks()
    client = pool._client
    // Reset the client query mock between tests
    client.query.mockReset()
    client.release.mockReset()
    pool.connect.mockResolvedValue(client)
  })

  // ── Test 1: force-start succeeds for a non-queue-head booking ───────────
  it('returns 200 and in_progress when admin uses ?force=true on a non-head booking', async () => {
    // Admin caller has req.user set
    mockRequireKioskOrAdmin = (req, res, next) => {
      req.branchId = BRANCH_ID
      req.user = { id: 'admin-user-1', role: 'admin' }
      next()
    }

    const booking = confirmedBooking()

    // Force-start path issues client.query calls in this order:
    // 1. BEGIN
    // 2. SELECT barber_id FROM bookings WHERE id=$1 AND status='confirmed'  → row found
    // 3. SELECT 1 FROM bookings WHERE barber_id=$1 AND status='in_progress' → no row (barber free)
    // 4. UPDATE bookings SET status='in_progress'... RETURNING *             → booking row
    // 5. UPDATE barbers SET status='in_service'...
    // 6. COMMIT
    client.query
      .mockResolvedValueOnce({ rows: [] })                   // BEGIN
      .mockResolvedValueOnce({ rows: [{ barber_id: BARBER_ID }] }) // SELECT barber_id
      .mockResolvedValueOnce({ rows: [] })                   // SELECT in_progress check (free)
      .mockResolvedValueOnce({ rows: [booking] })            // UPDATE booking
      .mockResolvedValueOnce({ rows: [] })                   // UPDATE barber status
      .mockResolvedValueOnce({ rows: [] })                   // COMMIT

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/start?force=true`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status', 'in_progress')
    expect(res.body).toHaveProperty('id', BOOKING_ID)

    // Verify the SELECT barber_id guard was issued
    const selectBarberCall = client.query.mock.calls[1]
    expect(selectBarberCall[0]).toMatch(/SELECT barber_id FROM bookings WHERE id = \$1 AND status = 'confirmed'/i)

    // Verify the in_progress guard was issued
    const inProgressCall = client.query.mock.calls[2]
    expect(inProgressCall[0]).toMatch(/SELECT 1 FROM bookings WHERE barber_id = \$1 AND status = 'in_progress'/i)

    // Verify the force-start UPDATE (no CTE / earliest keyword)
    const updateCall = client.query.mock.calls[3]
    expect(updateCall[0]).toMatch(/WHERE id = \$1 AND status = 'confirmed'/i)
    expect(updateCall[0]).not.toMatch(/earliest/i)
  })

  // ── Test 2: force-start fails if booking is not confirmed ───────────────
  it('returns 409 when admin uses ?force=true but booking is already in_progress', async () => {
    mockRequireKioskOrAdmin = (req, res, next) => {
      req.branchId = BRANCH_ID
      req.user = { id: 'admin-user-1', role: 'admin' }
      next()
    }

    // SELECT barber_id returns no rows because status != 'confirmed'
    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // SELECT barber_id — no row (already in_progress)
      .mockResolvedValueOnce({ rows: [] })  // ROLLBACK

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/start?force=true`)

    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('message', 'Cannot start booking')
  })

  // ── Test 3: normal start still blocked for non-queue-head (admin, no force) ──
  it('returns 409 when admin omits ?force=true and booking is not the queue head', async () => {
    mockRequireKioskOrAdmin = (req, res, next) => {
      req.branchId = BRANCH_ID
      req.user = { id: 'admin-user-1', role: 'admin' }
      next()
    }

    // CTE path: UPDATE returns no rows because id != earliest.id
    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // CTE UPDATE — no rows (not queue head)
      .mockResolvedValueOnce({ rows: [] })  // ROLLBACK

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/start`)  // no ?force

    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('message', 'Cannot start booking')

    // Confirm the CTE (non-force) path was taken — second call is the CTE UPDATE
    const cteCall = client.query.mock.calls[1]
    expect(cteCall[0]).toMatch(/earliest/i)
  })

  // ── Test 4: kiosk caller cannot force-start ─────────────────────────────
  it('returns 409 when kiosk uses ?force=true but is not the queue head', async () => {
    // Kiosk caller has req.kiosk set, NOT req.user
    mockRequireKioskOrAdmin = (req, res, next) => {
      req.branchId = BRANCH_ID
      req.kiosk = { branchId: BRANCH_ID }
      // req.user is deliberately NOT set
      next()
    }

    // CTE path returns no rows — booking is not the earliest
    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // CTE UPDATE — no rows
      .mockResolvedValueOnce({ rows: [] })  // ROLLBACK

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/start?force=true`)

    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('message', 'Cannot start booking')

    // Must have used the CTE (queue-order) path, not the force path
    const cteCall = client.query.mock.calls[1]
    expect(cteCall[0]).toMatch(/earliest/i)
    expect(cteCall[0]).not.toMatch(/SELECT barber_id FROM bookings WHERE id = \$1 AND status = 'confirmed'/i)
  })

  // ── Test 5: normal start works for queue-head (regression) ──────────────
  it('returns 200 when the booking IS the queue head and no ?force is used', async () => {
    mockRequireKioskOrAdmin = (req, res, next) => {
      req.branchId = BRANCH_ID
      req.kiosk = { branchId: BRANCH_ID }
      next()
    }

    const booking = confirmedBooking()

    // CTE path: UPDATE returns the row because the booking is earliest
    client.query
      .mockResolvedValueOnce({ rows: [] })           // BEGIN
      .mockResolvedValueOnce({ rows: [booking] })    // CTE UPDATE booking
      .mockResolvedValueOnce({ rows: [] })           // UPDATE barber status
      .mockResolvedValueOnce({ rows: [] })           // COMMIT

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/start`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status', 'in_progress')
    expect(res.body).toHaveProperty('id', BOOKING_ID)

    // Confirm the CTE path was used
    const cteCall = client.query.mock.calls[1]
    expect(cteCall[0]).toMatch(/earliest/i)
  })

  // ── Test 6: barber already in_progress guard fires ───────────────────────
  it('returns 409 when admin uses ?force=true but barber already has a booking in_progress', async () => {
    mockRequireKioskOrAdmin = (req, res, next) => {
      req.branchId = BRANCH_ID
      req.user = { id: 'admin-user-1', role: 'admin' }
      next()
    }

    // SELECT barber_id finds the confirmed booking row,
    // but the in_progress check finds an existing in_progress booking for that barber.
    client.query
      .mockResolvedValueOnce({ rows: [] })                         // BEGIN
      .mockResolvedValueOnce({ rows: [{ barber_id: BARBER_ID }] }) // SELECT barber_id — row found
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })        // SELECT 1 in_progress — barber busy
      .mockResolvedValueOnce({ rows: [] })                         // ROLLBACK

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/start?force=true`)

    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('message', 'Barber already has a service in progress')

    // Verify the in_progress guard query was issued with the correct barber_id
    const inProgressCall = client.query.mock.calls[2]
    expect(inProgressCall[0]).toMatch(/SELECT 1 FROM bookings WHERE barber_id = \$1 AND status = 'in_progress'/i)
    expect(inProgressCall[1]).toEqual([BARBER_ID])
  })
})
