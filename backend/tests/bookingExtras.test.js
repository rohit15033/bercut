// bookingExtras.test.js
// Tests for products/extras support added to admin booking routes:
//   GET  /api/bookings/:id           — extras include `id` (booking_extras.id)
//   PATCH /api/bookings/:id/admin-update — add_product_ids / remove_product_ids
//   POST  /api/bookings/admin-force  — product_ids
//   PATCH /api/bookings/:id/reopen   — product_ids; service_ids now optional

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

jest.mock('../config/db', () => {
  const client = { query: jest.fn(), release: jest.fn() }
  const pool   = { query: jest.fn(), connect: jest.fn().mockResolvedValue(client), _client: client }
  return pool
})

jest.mock('../routes/events',          () => ({ emitEvent: jest.fn() }))
jest.mock('../services/notifications', () => ({
  notifyBookingConfirmed: jest.fn().mockResolvedValue(undefined),
  notifyBarberNewBooking: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../services/barberAssignment', () => ({
  getFreeBarberIds:  jest.fn().mockResolvedValue([]),
  pickIdleBarber:    jest.fn().mockResolvedValue(null),
  tryAssignDeferred: jest.fn().mockResolvedValue(null),
}))

const request = require('supertest')
const express = require('express')
const pool    = require('../config/db')

const bookingsRouter = require('../routes/bookings')
const app = express()
app.use(express.json())
app.use('/api/bookings', bookingsRouter)

const BRANCH_ID  = 'test-branch-id'
const BOOKING_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const BARBER_ID  = 'aaaaaaaa-0000-0000-0000-000000000001'
const ITEM_ID_1  = 'cccccccc-0000-0000-0000-000000000001'
const ITEM_ID_2  = 'cccccccc-0000-0000-0000-000000000002'
const EXTRA_ID_1 = 'eeeeeeee-0000-0000-0000-000000000001'
const SVC_ID_1   = 'dddddddd-0000-0000-0000-000000000001'

const client = pool._client

// resetAllMocks drains unconsumed mockResolvedValueOnce queues; re-wire connect after.
beforeEach(() => {
  jest.resetAllMocks()
  pool.connect.mockResolvedValue(client)
})

// ── GET /api/bookings/:id — extras include `id` ───────────────────────────────

describe('GET /api/bookings/:id — extras id field', () => {
  it('returns extras array with id field from booking_extras', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: BOOKING_ID, branch_id: BRANCH_ID, barber_id: BARBER_ID, status: 'in_progress',
        services: [],
        extras: [{ id: EXTRA_ID_1, item_id: ITEM_ID_1, name: 'Shampoo', price: 15000, qty: 1 }],
        subtotal: 50000, extras_total: 15000, total_amount: 65000,
      }],
    })

    const res = await request(app).get(`/api/bookings/${BOOKING_ID}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.extras)).toBe(true)
    expect(res.body.extras[0]).toHaveProperty('id', EXTRA_ID_1)
    expect(res.body.extras[0]).toHaveProperty('item_id', ITEM_ID_1)
  })
})

// ── PATCH /api/bookings/:id/admin-update — products ──────────────────────────

describe('PATCH /api/bookings/:id/admin-update — add_product_ids', () => {
  it('inserts extras when add_product_ids provided', async () => {
    // Queries that ACTUALLY EXECUTE for this request:
    // 1. BEGIN, 2. SELECT booking, 3. SELECT inventory (add_product_ids),
    // 4. INSERT booking_extras, 5. COMMIT, then pool.query SELECT booking
    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: BOOKING_ID, branch_id: BRANCH_ID, barber_id: BARBER_ID, status: 'confirmed' }] })
      .mockResolvedValueOnce({ rows: [{ id: ITEM_ID_1, price: 15000 }] })  // SELECT inventory
      .mockResolvedValueOnce({ rows: [] })  // INSERT booking_extras
      .mockResolvedValueOnce({ rows: [] })  // COMMIT
    pool.query.mockResolvedValueOnce({ rows: [{ id: BOOKING_ID, status: 'confirmed' }] })

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/admin-update`)
      .send({ add_product_ids: [ITEM_ID_1] })

    expect(res.status).toBe(200)

    const insertCall = client.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO booking_extras'))
    expect(insertCall).toBeDefined()
    expect(insertCall[1]).toEqual([BOOKING_ID, ITEM_ID_1, 1, 15000])
  })

  it('deletes extras by booking_extras.id when remove_product_ids provided', async () => {
    // Queries: BEGIN, SELECT booking, DELETE booking_extras, COMMIT, pool SELECT
    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: BOOKING_ID, branch_id: BRANCH_ID, barber_id: BARBER_ID, status: 'in_progress' }] })
      .mockResolvedValueOnce({ rows: [] })  // DELETE booking_extras
      .mockResolvedValueOnce({ rows: [] })  // COMMIT
    pool.query.mockResolvedValueOnce({ rows: [{ id: BOOKING_ID }] })

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/admin-update`)
      .send({ remove_product_ids: [EXTRA_ID_1] })

    expect(res.status).toBe(200)

    const deleteCall = client.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('DELETE FROM booking_extras'))
    expect(deleteCall).toBeDefined()
    expect(deleteCall[1][0]).toEqual([EXTRA_ID_1])   // array of booking_extras IDs
    expect(deleteCall[1][1]).toBe(BOOKING_ID)         // scoped to this booking
  })

  it('handles empty arrays without error', async () => {
    // Only BEGIN, SELECT booking, COMMIT execute — no product queries
    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: BOOKING_ID, branch_id: BRANCH_ID, barber_id: BARBER_ID, status: 'confirmed' }] })
      .mockResolvedValueOnce({ rows: [] })  // COMMIT
    pool.query.mockResolvedValueOnce({ rows: [{ id: BOOKING_ID }] })

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/admin-update`)
      .send({ add_product_ids: [], remove_product_ids: [] })

    expect(res.status).toBe(200)

    const insertCall = client.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO booking_extras'))
    const deleteCall = client.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('DELETE FROM booking_extras'))
    expect(insertCall).toBeUndefined()
    expect(deleteCall).toBeUndefined()
  })
})

// ── POST /api/bookings/admin-force — product_ids ─────────────────────────────

describe('POST /api/bookings/admin-force — product_ids', () => {
  const BASE_BODY = {
    branch_id: BRANCH_ID, customer_name: 'Test Customer',
    barber_id: BARBER_ID,
    service_ids: [SVC_ID_1],
    date: '2026-05-22', time: '10:00',
  }

  // admin-force query sequence (no customer_phone):
  // BEGIN, SELECT services, SELECT COUNT+1 (bookingNumber), INSERT booking,
  // INSERT booking_services (×N), [SELECT inventory + INSERT extras (×P)], COMMIT
  // then pool.query: SELECT barber name

  it('inserts extras and includes extrasTotal in total_amount', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: SVC_ID_1, name: 'Haircut', price: 50000, commission_rate: 35 }] })
      .mockResolvedValueOnce({ rows: [{ n: 1 }] })  // booking number
      .mockResolvedValueOnce({ rows: [{ id: BOOKING_ID, branch_id: BRANCH_ID, barber_id: BARBER_ID, status: 'confirmed' }] })
      .mockResolvedValueOnce({ rows: [] })  // INSERT booking_services
      .mockResolvedValueOnce({ rows: [{ id: ITEM_ID_1, price: 15000 }, { id: ITEM_ID_2, price: 10000 }] })
      .mockResolvedValueOnce({ rows: [] })  // INSERT booking_extras item 1
      .mockResolvedValueOnce({ rows: [] })  // INSERT booking_extras item 2
      .mockResolvedValueOnce({ rows: [] })  // COMMIT
    pool.query.mockResolvedValueOnce({ rows: [{ name: 'Test Barber' }] })

    const res = await request(app)
      .post('/api/bookings/admin-force')
      .send({ ...BASE_BODY, product_ids: [ITEM_ID_1, ITEM_ID_2] })

    expect(res.status).toBe(201)
    expect(res.body.total_amount).toBe(75000)  // 50000 services + 25000 extras

    const insertExtras = client.query.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO booking_extras'))
    expect(insertExtras).toHaveLength(2)
  })

  it('total_amount equals subtotal when product_ids is empty', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: SVC_ID_1, name: 'Haircut', price: 50000, commission_rate: 35 }] })
      .mockResolvedValueOnce({ rows: [{ n: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: BOOKING_ID, branch_id: BRANCH_ID, barber_id: BARBER_ID, status: 'confirmed' }] })
      .mockResolvedValueOnce({ rows: [] })  // INSERT booking_services
      .mockResolvedValueOnce({ rows: [] })  // COMMIT
    pool.query.mockResolvedValueOnce({ rows: [{ name: 'Test Barber' }] })

    const res = await request(app)
      .post('/api/bookings/admin-force')
      .send({ ...BASE_BODY, product_ids: [] })

    expect(res.status).toBe(201)
    expect(res.body.total_amount).toBe(50000)

    const insertExtras = client.query.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO booking_extras'))
    expect(insertExtras).toHaveLength(0)
  })

  it('total_amount equals subtotal when product_ids omitted', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: SVC_ID_1, name: 'Haircut', price: 50000, commission_rate: 35 }] })
      .mockResolvedValueOnce({ rows: [{ n: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: BOOKING_ID, branch_id: BRANCH_ID, barber_id: BARBER_ID, status: 'confirmed' }] })
      .mockResolvedValueOnce({ rows: [] })  // INSERT booking_services
      .mockResolvedValueOnce({ rows: [] })  // COMMIT
    pool.query.mockResolvedValueOnce({ rows: [{ name: 'Test Barber' }] })

    const res = await request(app)
      .post('/api/bookings/admin-force')
      .send(BASE_BODY)

    expect(res.status).toBe(201)
    expect(res.body.total_amount).toBe(50000)
  })
})

// ── PATCH /api/bookings/:id/reopen — product_ids ─────────────────────────────

describe('PATCH /api/bookings/:id/reopen — product_ids', () => {
  const PENDING_BOOKING = { id: BOOKING_ID, branch_id: BRANCH_ID, barber_id: BARBER_ID, status: 'pending_payment' }

  it('succeeds with product_ids only (no service_ids)', async () => {
    // Validation passes (hasProducts=true). Queries:
    // BEGIN, SELECT booking, SELECT inventory, INSERT extras, UPDATE booking, UPDATE barber, COMMIT
    client.query
      .mockResolvedValueOnce({ rows: [] })               // BEGIN
      .mockResolvedValueOnce({ rows: [PENDING_BOOKING] }) // SELECT booking
      .mockResolvedValueOnce({ rows: [{ id: ITEM_ID_1, price: 15000 }] })
      .mockResolvedValueOnce({ rows: [] })  // INSERT booking_extras
      .mockResolvedValueOnce({ rows: [] })  // UPDATE booking
      .mockResolvedValueOnce({ rows: [] })  // UPDATE barber
      .mockResolvedValueOnce({ rows: [] })  // COMMIT

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/reopen`)
      .send({ product_ids: [ITEM_ID_1] })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.added_products).toBe(1)

    const statusUpdate = client.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes("status = 'in_progress'"))
    expect(statusUpdate).toBeDefined()
  })

  it('succeeds with both service_ids and product_ids', async () => {
    // Queries: BEGIN, SELECT booking, SELECT services, INSERT booking_services,
    //          SELECT inventory, INSERT extras, UPDATE booking, UPDATE barber, COMMIT
    client.query
      .mockResolvedValueOnce({ rows: [] })               // BEGIN
      .mockResolvedValueOnce({ rows: [PENDING_BOOKING] }) // SELECT booking
      .mockResolvedValueOnce({ rows: [{ id: SVC_ID_1, duration_minutes: 30, price: 50000, commission_rate: 35 }] })
      .mockResolvedValueOnce({ rows: [] })  // INSERT booking_services
      .mockResolvedValueOnce({ rows: [{ id: ITEM_ID_1, price: 15000 }] })
      .mockResolvedValueOnce({ rows: [] })  // INSERT booking_extras
      .mockResolvedValueOnce({ rows: [] })  // UPDATE booking
      .mockResolvedValueOnce({ rows: [] })  // UPDATE barber
      .mockResolvedValueOnce({ rows: [] })  // COMMIT

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/reopen`)
      .send({ service_ids: [SVC_ID_1], product_ids: [ITEM_ID_1] })

    expect(res.status).toBe(200)
    expect(res.body.added).toBe(1)
    expect(res.body.added_products).toBe(1)
    expect(res.body.added_duration_min).toBe(30)
  })

  it('returns 400 when neither service_ids nor product_ids provided', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/reopen`)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/service_ids or product_ids required/)
  })

  it('returns 400 when both arrays are empty', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/reopen`)
      .send({ service_ids: [], product_ids: [] })
    expect(res.status).toBe(400)
  })

  it('service_ids only still works (no regression)', async () => {
    // Queries: BEGIN, SELECT booking, SELECT services, INSERT booking_services,
    //          UPDATE booking, UPDATE barber, COMMIT
    client.query
      .mockResolvedValueOnce({ rows: [] })               // BEGIN
      .mockResolvedValueOnce({ rows: [PENDING_BOOKING] }) // SELECT booking
      .mockResolvedValueOnce({ rows: [{ id: SVC_ID_1, duration_minutes: 45, price: 50000, commission_rate: 35 }] })
      .mockResolvedValueOnce({ rows: [] })  // INSERT booking_services
      .mockResolvedValueOnce({ rows: [] })  // UPDATE booking
      .mockResolvedValueOnce({ rows: [] })  // UPDATE barber
      .mockResolvedValueOnce({ rows: [] })  // COMMIT

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/reopen`)
      .send({ service_ids: [SVC_ID_1] })

    expect(res.status).toBe(200)
    expect(res.body.added).toBe(1)
    expect(res.body.added_products).toBe(0)
    expect(res.body.added_duration_min).toBe(45)
  })
})
