// Mock auth before any requires so the middleware is replaced when routes load
jest.mock('../middleware/auth', () => ({
  requireAdmin:        (req, res, next) => next(),
  requireKiosk:        (req, res, next) => { req.branchId = 'test-branch-id'; next() },
  requireKioskOrAdmin: (req, res, next) => { req.branchId = 'test-branch-id'; next() },
  checkPermission:     () => (req, res, next) => next(),
  JWT_SECRET:          'test-secret',
}))

jest.mock('../middleware/branchScope', () => ({
  branchScope:   (req, res, next) => { req.branchId = 'test-branch-id'; next() },
  requireBranch: (req, res, next) => next(),
}))

// Deep pool mock — connect() returns a transactional client
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

jest.mock('../routes/events', () => ({ emitEvent: jest.fn() }))

jest.mock('../services/notifications', () => ({
  notifyPaymentReceipt: jest.fn().mockResolvedValue(undefined),
  notifyBarberNewBooking: jest.fn().mockResolvedValue(undefined),
  notifyBookingConfirmed: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../services/loyalty', () => ({
  awardPoints: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../services/commissionSnapshot', () => ({
  snapshotCommission: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../services/barberAssignment', () => ({
  getFreeBarberIds:  jest.fn().mockResolvedValue(['barber-id-1']),
  pickIdleBarber:    jest.fn().mockResolvedValue('barber-id-1'),
  tryAssignDeferred: jest.fn().mockResolvedValue(null),
}))

const request = require('supertest')
const express = require('express')

const bookingsRouter = require('../routes/bookings')
const paymentsRouter = require('../routes/payments')
const pool           = require('../config/db')
const { emitEvent }  = require('../routes/events')

const app = express()
app.use(express.json())
app.use('/api/bookings', bookingsRouter)
app.use('/api/payments', paymentsRouter)

const BARBER_ID = 'barber-1'
const BRANCH_ID = 'branch-1'
const BOOKING_ID = 'booking-1'
const GROUP_ID   = 'group-1'

// ── PATCH /api/bookings/:id/cancel ───────────────────────────────────────────

describe('PATCH /api/bookings/:id/cancel — barber status reset', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    pool.query.mockReset()
  })

  it('does NOT reset barber when another in_progress booking still exists', async () => {
    // First query: cancel the booking — returns the cancelled row
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: BOOKING_ID,
          barber_id: BARBER_ID,
          branch_id: BRANCH_ID,
          status: 'cancelled',
        }],
      })
      // Second query: stillActive check — returns 1 row (another booking is still in_progress)
      .mockResolvedValueOnce({ rows: [{ 1: 1 }] })

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/cancel`)
      .send({ reason: 'customer request' })

    expect(res.status).toBe(200)

    // The UPDATE barbers query must NOT have been called
    const barberUpdateCalled = pool.query.mock.calls.some(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE barbers') && sql.includes("status = 'available'")
    )
    expect(barberUpdateCalled).toBe(false)
  })

  it('resets barber to available when no other in_progress bookings remain', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: BOOKING_ID,
          barber_id: BARBER_ID,
          branch_id: BRANCH_ID,
          status: 'cancelled',
        }],
      })
      // stillActive check — returns 0 rows (no other in_progress bookings)
      .mockResolvedValueOnce({ rows: [] })
      // UPDATE barbers SET status = 'available'
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/cancel`)
      .send({ reason: 'customer request' })

    expect(res.status).toBe(200)

    const barberUpdateCall = pool.query.mock.calls.find(
      ([sql, params]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE barbers') &&
        sql.includes("status = 'available'") &&
        sql.includes("status = 'in_service'") &&
        params[0] === BARBER_ID
    )
    expect(barberUpdateCall).toBeDefined()
  })

  it('does NOT reset barber when a different in_progress booking still exists for the same barber', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: BOOKING_ID,
          barber_id: BARBER_ID,
          branch_id: BRANCH_ID,
          status: 'cancelled',
        }],
      })
      // stillActive check — 1 row means another booking is in_progress
      .mockResolvedValueOnce({ rows: [{ 1: 1 }] })

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/cancel`)
      .send({})

    expect(res.status).toBe(200)

    const barberUpdateCalled = pool.query.mock.calls.some(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE barbers') && sql.includes("status = 'available'")
    )
    expect(barberUpdateCalled).toBe(false)
  })

  it('returns 409 when booking is not in a cancellable state', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/cancel`)
      .send({})

    expect(res.status).toBe(409)
  })
})

// ── POST /api/payments/manual-confirm — barber status reset ──────────────────

describe('POST /api/payments/manual-confirm — barber status reset', () => {
  const client = pool._client

  beforeEach(() => {
    jest.clearAllMocks()
    pool.query.mockReset()
    client.query.mockReset()
  })

  it('resets barber to available when payment confirmed and no in_progress bookings remain', async () => {
    // Transactional client sequence:
    // BEGIN → SELECT booking → UPDATE booking (RETURNING) → snapshotCommission (mocked) → COMMIT
    client.query
      .mockResolvedValueOnce(undefined)                          // BEGIN
      .mockResolvedValueOnce({                                   // SELECT booking
        rows: [{ barber_id: BARBER_ID, branch_id: BRANCH_ID, status: 'in_progress', payment_ref: null }],
      })
      .mockResolvedValueOnce({                                   // UPDATE bookings RETURNING *
        rows: [{ id: BOOKING_ID, status: 'completed', barber_id: BARBER_ID, branch_id: BRANCH_ID }],
      })
      .mockResolvedValueOnce(undefined)                         // COMMIT

    // Pool-level queries (after commit):
    // stillActive check → 0 rows → UPDATE barbers → async receipt SELECT (ignored via fire-and-forget)
    pool.query
      .mockResolvedValueOnce({ rows: [] })                      // stillActive check — no in_progress
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE barbers SET status = 'available'
      .mockResolvedValueOnce({ rows: [] })                      // async receipt SELECT (fire-and-forget)

    const res = await request(app)
      .post('/api/payments/manual-confirm')
      .send({ booking_id: BOOKING_ID, payment_method: 'cash' })

    expect(res.status).toBe(200)

    const barberUpdateCall = pool.query.mock.calls.find(
      ([sql, params]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE barbers') &&
        sql.includes("status = 'available'") &&
        sql.includes("status = 'in_service'") &&
        params[0] === BARBER_ID
    )
    expect(barberUpdateCall).toBeDefined()
  })

  it('does NOT reset barber when another in_progress booking still exists', async () => {
    client.query
      .mockResolvedValueOnce(undefined)                         // BEGIN
      .mockResolvedValueOnce({
        rows: [{ barber_id: BARBER_ID, branch_id: BRANCH_ID, status: 'pending_payment', payment_ref: null }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: BOOKING_ID, status: 'completed', barber_id: BARBER_ID, branch_id: BRANCH_ID }],
      })
      .mockResolvedValueOnce(undefined)                         // COMMIT

    // stillActive check returns 1 row — barber still has another in_progress booking
    pool.query
      .mockResolvedValueOnce({ rows: [{ 1: 1 }] })             // stillActive has a row
      .mockResolvedValueOnce({ rows: [] })                      // async receipt SELECT (fire-and-forget)

    const res = await request(app)
      .post('/api/payments/manual-confirm')
      .send({ booking_id: BOOKING_ID, payment_method: 'cash' })

    expect(res.status).toBe(200)

    const barberUpdateCalled = pool.query.mock.calls.some(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE barbers') && sql.includes("status = 'available'")
    )
    expect(barberUpdateCalled).toBe(false)
  })

  it('does not attempt any barber update when booking has no barber_id (walk-in without barber)', async () => {
    client.query
      .mockResolvedValueOnce(undefined)                         // BEGIN
      .mockResolvedValueOnce({
        rows: [{ barber_id: null, branch_id: BRANCH_ID, status: 'pending_payment', payment_ref: null }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: BOOKING_ID, status: 'completed', barber_id: null, branch_id: BRANCH_ID }],
      })
      .mockResolvedValueOnce(undefined)                         // COMMIT

    // Only fire-and-forget receipt SELECT — no barber queries expected
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/payments/manual-confirm')
      .send({ booking_id: BOOKING_ID, payment_method: 'cash' })

    expect(res.status).toBe(200)

    const barberUpdateCalled = pool.query.mock.calls.some(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE barbers')
    )
    expect(barberUpdateCalled).toBe(false)

    // And no stillActive SELECT should have run either
    const stillActiveQueried = pool.query.mock.calls.some(
      ([sql]) => typeof sql === 'string' && sql.includes("status = 'in_progress'")
    )
    expect(stillActiveQueried).toBe(false)
  })

  it('returns 400 when booking_id is missing', async () => {
    const res = await request(app)
      .post('/api/payments/manual-confirm')
      .send({ payment_method: 'cash' })

    expect(res.status).toBe(400)
  })

  it('returns 404 when booking does not exist', async () => {
    client.query
      .mockResolvedValueOnce(undefined)                         // BEGIN
      .mockResolvedValueOnce({ rows: [] })                      // SELECT booking — not found
      .mockResolvedValueOnce(undefined)                         // ROLLBACK

    const res = await request(app)
      .post('/api/payments/manual-confirm')
      .send({ booking_id: 'nonexistent-booking', payment_method: 'cash' })

    expect(res.status).toBe(404)
  })
})

// ── POST /api/payments/group-confirm — barber status reset ───────────────────

describe('POST /api/payments/group-confirm — barber status reset', () => {
  const client = pool._client

  beforeEach(() => {
    jest.clearAllMocks()
    pool.query.mockReset()
    client.query.mockReset()
  })

  it('resets barber to available when group confirmed and no in_progress bookings remain', async () => {
    // Two bookings in the group, both for the same barber
    const groupBookings = [
      { id: 'bk-1', barber_id: BARBER_ID, branch_id: BRANCH_ID, status: 'pending_payment' },
      { id: 'bk-2', barber_id: BARBER_ID, branch_id: BRANCH_ID, status: 'pending_payment' },
    ]

    client.query
      .mockResolvedValueOnce(undefined)                         // BEGIN
      .mockResolvedValueOnce({ rows: groupBookings })           // SELECT bookings WHERE group_id
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE bookings bk-1
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE bookings bk-2
      .mockResolvedValueOnce(undefined)                         // COMMIT

    // Pool-level: stillActive for BARBER_ID → 0 rows → UPDATE barbers
    pool.query
      .mockResolvedValueOnce({ rows: [] })                      // stillActive check — none remaining
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE barbers SET status = 'available'

    const res = await request(app)
      .post('/api/payments/group-confirm')
      .send({ group_id: GROUP_ID, payment_method: 'cash' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const barberUpdateCall = pool.query.mock.calls.find(
      ([sql, params]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE barbers') &&
        sql.includes("status = 'available'") &&
        sql.includes("status = 'in_service'") &&
        params[0] === BARBER_ID
    )
    expect(barberUpdateCall).toBeDefined()
  })

  it('does NOT reset barber when another in_progress booking still exists after group payment', async () => {
    const groupBookings = [
      { id: 'bk-1', barber_id: BARBER_ID, branch_id: BRANCH_ID, status: 'pending_payment' },
    ]

    client.query
      .mockResolvedValueOnce(undefined)                         // BEGIN
      .mockResolvedValueOnce({ rows: groupBookings })           // SELECT bookings WHERE group_id
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE bookings bk-1
      .mockResolvedValueOnce(undefined)                         // COMMIT

    // stillActive check returns 1 row — barber has another booking still in_progress
    pool.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] })

    const res = await request(app)
      .post('/api/payments/group-confirm')
      .send({ group_id: GROUP_ID, payment_method: 'cash' })

    expect(res.status).toBe(200)

    const barberUpdateCalled = pool.query.mock.calls.some(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE barbers') && sql.includes("status = 'available'")
    )
    expect(barberUpdateCalled).toBe(false)
  })

  it('resets each unique barber independently in a multi-barber group', async () => {
    const BARBER_ID_2 = 'barber-2'
    const groupBookings = [
      { id: 'bk-1', barber_id: BARBER_ID,   branch_id: BRANCH_ID, status: 'pending_payment' },
      { id: 'bk-2', barber_id: BARBER_ID_2, branch_id: BRANCH_ID, status: 'pending_payment' },
    ]

    client.query
      .mockResolvedValueOnce(undefined)                         // BEGIN
      .mockResolvedValueOnce({ rows: groupBookings })           // SELECT bookings WHERE group_id
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE bookings bk-1
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE bookings bk-2
      .mockResolvedValueOnce(undefined)                         // COMMIT

    // Pool queries: barber-1 stillActive → 0 rows → UPDATE barbers barber-1
    //               barber-2 stillActive → 0 rows → UPDATE barbers barber-2
    pool.query
      .mockResolvedValueOnce({ rows: [] })                      // stillActive barber-1
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE barbers barber-1
      .mockResolvedValueOnce({ rows: [] })                      // stillActive barber-2
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE barbers barber-2

    const res = await request(app)
      .post('/api/payments/group-confirm')
      .send({ group_id: GROUP_ID, payment_method: 'cash' })

    expect(res.status).toBe(200)

    const barberUpdateCalls = pool.query.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE barbers') && sql.includes("status = 'available'")
    )
    // Both barbers should have had their status reset
    expect(barberUpdateCalls).toHaveLength(2)
    const updatedBarberIds = barberUpdateCalls.map(([, params]) => params[0])
    expect(updatedBarberIds).toContain(BARBER_ID)
    expect(updatedBarberIds).toContain(BARBER_ID_2)
  })

  it('skips barber reset for null barber_id entries in the group', async () => {
    const groupBookings = [
      { id: 'bk-1', barber_id: null,      branch_id: BRANCH_ID, status: 'pending_payment' },
      { id: 'bk-2', barber_id: BARBER_ID, branch_id: BRANCH_ID, status: 'pending_payment' },
    ]

    client.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: groupBookings })
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE bk-1
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE bk-2
      .mockResolvedValueOnce(undefined)                         // COMMIT

    pool.query
      .mockResolvedValueOnce({ rows: [] })                      // stillActive for barber-1 only
      .mockResolvedValueOnce({ rows: [] })                      // UPDATE barbers for barber-1

    const res = await request(app)
      .post('/api/payments/group-confirm')
      .send({ group_id: GROUP_ID, payment_method: 'cash' })

    expect(res.status).toBe(200)

    // Only one barber update should have run (for BARBER_ID, not for null)
    const barberUpdateCalls = pool.query.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE barbers') && sql.includes("status = 'available'")
    )
    expect(barberUpdateCalls).toHaveLength(1)
    expect(barberUpdateCalls[0][1][0]).toBe(BARBER_ID)
  })

  it('returns 400 when group_id is missing', async () => {
    const res = await request(app)
      .post('/api/payments/group-confirm')
      .send({ payment_method: 'cash' })

    expect(res.status).toBe(400)
  })

  it('returns 404 when group does not exist', async () => {
    client.query
      .mockResolvedValueOnce(undefined)                         // BEGIN
      .mockResolvedValueOnce({ rows: [] })                      // SELECT bookings — empty
      .mockResolvedValueOnce(undefined)                         // ROLLBACK

    const res = await request(app)
      .post('/api/payments/group-confirm')
      .send({ group_id: 'nonexistent-group', payment_method: 'cash' })

    expect(res.status).toBe(404)
  })
})
