// Mock auth before any requires so the middleware is replaced when routes load
jest.mock('../middleware/auth', () => ({
  requireAdmin:         (req, res, next) => next(),
  requireKiosk:         (req, res, next) => { req.branchId = 'test-branch-id'; next() },
  requireKioskOrAdmin:  (req, res, next) => { req.branchId = 'test-branch-id'; next() },
  JWT_SECRET:           'test-secret',
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

jest.mock('../services/notifications', () => ({
  notifyBookingConfirmed:  jest.fn().mockResolvedValue(undefined),
  notifyBarberNewBooking:  jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../routes/events', () => ({ emitEvent: jest.fn() }))

jest.mock('../services/barberAssignment', () => ({
  getFreeBarberIds:      jest.fn().mockResolvedValue(['barber-id-1']),
  pickIdleBarber:        jest.fn().mockResolvedValue('barber-id-1'),
  tryAssignDeferred:     jest.fn().mockResolvedValue(null),
}))

const request = require('supertest')
const express = require('express')

const slotsRouter    = require('../routes/slots')
const bookingsRouter = require('../routes/bookings')
const { getAvailableSlots, getUnionSlots, getNowWindow } = require('../services/slotGenerator')
const pool = require('../config/db')

const app = express()
app.use(express.json())
app.use('/api/slots',    slotsRouter)
app.use('/api/bookings', bookingsRouter)

const BARBER_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const BRANCH_ID = 'test-branch-id'
const DATE      = '2026-05-14'

// ── /api/slots ───────────────────────────────────────────────────────────────────

describe('GET /api/slots', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when barber_id is missing', async () => {
    const res = await request(app).get(`/api/slots?date=${DATE}`)
    expect(res.status).toBe(400)
  })

  it('returns 400 when date is missing', async () => {
    const res = await request(app).get(`/api/slots?barber_id=${BARBER_ID}`)
    expect(res.status).toBe(400)
  })

  it('returns slot array from getAvailableSlots', async () => {
    getAvailableSlots.mockResolvedValueOnce(['10:00', '10:30', '11:00'])
    const res = await request(app).get(`/api/slots?barber_id=${BARBER_ID}&date=${DATE}&duration_min=30`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(['10:00', '10:30', '11:00'])
    expect(getAvailableSlots).toHaveBeenCalledWith(BARBER_ID, DATE, 30, false)
  })

  it('passes walkin=true flag to getAvailableSlots', async () => {
    getAvailableSlots.mockResolvedValueOnce(['10:00'])
    await request(app).get(`/api/slots?barber_id=${BARBER_ID}&date=${DATE}&walkin=true`)
    expect(getAvailableSlots).toHaveBeenCalledWith(BARBER_ID, DATE, 30, true)
  })
})

describe('GET /api/slots/any-available', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when branch_id is missing', async () => {
    const res = await request(app).get(`/api/slots/any-available?date=${DATE}`)
    expect(res.status).toBe(400)
  })

  it('returns union slots from getUnionSlots', async () => {
    getUnionSlots.mockResolvedValueOnce(['10:00', '11:00'])
    const res = await request(app).get(`/api/slots/any-available?branch_id=${BRANCH_ID}&date=${DATE}&duration_min=60`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(['10:00', '11:00'])
    expect(getUnionSlots).toHaveBeenCalledWith(BRANCH_ID, DATE, 60, false)
  })
})

describe('GET /api/slots/now-window', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when date is missing', async () => {
    const res = await request(app).get(`/api/slots/now-window?barber_id=${BARBER_ID}`)
    expect(res.status).toBe(400)
  })

  it('returns 400 when neither branch_id nor barber_id provided', async () => {
    const res = await request(app).get(`/api/slots/now-window?date=${DATE}`)
    expect(res.status).toBe(400)
  })

  it('returns getNowWindow result', async () => {
    const mockResult = { freeNow: true, windowMin: 75, barberWindows: { [BARBER_ID]: 75 } }
    getNowWindow.mockResolvedValueOnce(mockResult)
    const res = await request(app).get(`/api/slots/now-window?barber_id=${BARBER_ID}&date=${DATE}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockResult)
    expect(getNowWindow).toHaveBeenCalledWith(undefined, BARBER_ID, DATE)
  })
})

// ── /api/bookings POST ────────────────────────────────────────────────────────────

describe('POST /api/bookings', () => {
  const client = pool._client

  beforeEach(() => {
    // Reset queues (clearAllMocks only resets call records, not mockResolvedValueOnce queues)
    client.query.mockReset()
    pool.query.mockReset()
    // Sequence matches route execution for request WITHOUT customer_phone:
    // BEGIN → dupCheck → durRes → svcRows → global_settings → branchRow → COUNT → INSERT booking → INSERT booking_services → COMMIT
    client.query
      .mockResolvedValueOnce(undefined)                          // BEGIN
      .mockResolvedValueOnce({ rows: [] })                       // dedup check (no duplicate)
      .mockResolvedValueOnce({ rows: [{ dur: 30 }] })           // duration calc (any_available path)
      .mockResolvedValueOnce({                                   // svcRows
        rows: [{ id: 'svc-1', price: '50000', duration_minutes: 30 }],
      })
      .mockResolvedValueOnce({ rows: [{ points_earn_rate: 0.0001, points_redemption_rate: 10000 }] }) // global_settings
      .mockResolvedValueOnce({ rows: [{ auto_cancel_minutes: 15 }] }) // branch row
      .mockResolvedValueOnce({ rows: [{ n: 1 }] })              // nextBookingNumber COUNT
      .mockResolvedValueOnce({                                   // INSERT booking
        rows: [{
          id: 'bk-1', booking_number: 'B001', branch_id: BRANCH_ID,
          barber_id: 'barber-id-1', status: 'confirmed', source: 'any_available',
          scheduled_at: new Date().toISOString(), points_redeemed: 0,
        }],
      })
      .mockResolvedValueOnce(undefined)                         // INSERT booking_services
      .mockResolvedValueOnce(undefined)                         // COMMIT

    // Pool-level queries (after commit)
    pool.query
      .mockResolvedValueOnce({ rows: [{ name: 'Alex' }] })      // barber name
      .mockResolvedValueOnce({ rows: [{ name: 'Haircut' }] })   // service names
  })

  it('returns 400 when no service_ids provided', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ branch_id: BRANCH_ID, service_ids: [], slot_time: 'Now', date: DATE })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/service/i)
  })

  it('creates a booking and returns 201 with booking data', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        branch_id:    BRANCH_ID,
        service_ids:  ['svc-1'],
        slot_time:    'Now',
        date:         DATE,
        source:       'any_available',
        customer_name: 'Budi',
      })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 'bk-1')
    expect(res.body).toHaveProperty('booking_number', 'B001')
  })
})

// ── /api/bookings GET /:id ────────────────────────────────────────────────────────

describe('GET /api/bookings/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    pool.query.mockReset()  // clear any unconsumed mocks from prior test suites
  })

  it('returns 404 when booking not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/bookings/nonexistent-id')
    expect(res.status).toBe(404)
  })

  it('returns booking data when found', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'bk-1', booking_number: 'B001', status: 'confirmed',
        barber_name: 'Alex', customer_name: 'Budi', services: [], extras: [],
      }],
    })
    const res = await request(app).get('/api/bookings/bk-1')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', 'bk-1')
  })
})
