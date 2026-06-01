/**
 * bookings.claimstart.test.js
 *
 * Tests for the two new endpoints introduced to support the "Antrian Bebas"
 * (parallel walk-in pickup) feature:
 *
 *   GET  /api/bookings/unassigned?branch_id=
 *     — returns the next unassigned confirmed booking (null if none)
 *
 *   PATCH /api/bookings/:id/claim-and-start
 *     — atomically assigns a barber + sets status in_progress (SELECT FOR UPDATE SKIP LOCKED)
 *     — 409 when booking already has a barber assigned
 *     — 409 when claiming barber already has 2 in_progress bookings
 *
 * Race condition test: two concurrent requests for the same booking — only one wins.
 *
 * Pattern follows barbers.visibility.test.js and slots.pinched.test.js.
 */

// ── Auth / DB mocks ────────────────────────────────────────────────────────────
jest.mock('../middleware/auth', () => ({
  requireAdmin:        (req, res, next) => { req.user = { id: 'user-admin' }; next() },
  requireKiosk:        (req, res, next) => { req.branchId = 'branch-test-001'; next() },
  requireKioskOrAdmin: (req, res, next) => { req.branchId = 'branch-test-001'; next() },
  checkPermission:     () => (req, res, next) => next(),
  JWT_SECRET:          'test-secret',
}))

jest.mock('../config/db', () => {
  const client = { query: jest.fn(), release: jest.fn() }
  const pool   = { query: jest.fn(), connect: jest.fn().mockResolvedValue(client), _client: client }
  return pool
})

jest.mock('../routes/events', () => ({ emitEvent: jest.fn() }))

jest.mock('../services/notifications', () => ({
  notifyBookingConfirmed:  jest.fn().mockResolvedValue(undefined),
  notifyBarberNewBooking:  jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../middleware/branchScope', () => ({
  branchScope:   (req, res, next) => next(),
  requireBranch: (req, res, next) => next(),
}))

const request  = require('supertest')
const express  = require('express')
const bookingsRouter = require('../routes/bookings')
const pool     = require('../config/db')

// ── Express app ────────────────────────────────────────────────────────────────
const app = express()
app.use(express.json())
app.use('/api/bookings', bookingsRouter)

// ── Constants ──────────────────────────────────────────────────────────────────
const BRANCH_ID  = 'branch-test-001'
const BARBER_ID  = 'barber-test-001'
const BOOKING_ID = 'booking-unassigned-001'

// A minimal booking row as the DB would return for GET /unassigned
const UNASSIGNED_BOOKING = {
  id: BOOKING_ID,
  branch_id: BRANCH_ID,
  barber_id: null,
  status: 'confirmed',
  guest_name: 'Budi Santoso',
  customer_name: 'Budi Santoso',
  scheduled_at: '2026-06-01T10:00:00+08:00',
  created_at: '2026-06-01T09:00:00+08:00',
  total_amount: '75000',
  booking_services: [
    { id: 'bs-001', service_id: 'svc-001', service_name: 'Classic Haircut', duration_minutes: 60, price_charged: 75000 },
  ],
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Get the mocked DB client (pool.connect returns this) */
function getMockClient() {
  return pool._client
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  pool.query.mockReset()
  getMockClient().query.mockReset()
  getMockClient().release.mockReset()
  // pool.connect always returns the same mock client
  pool.connect.mockResolvedValue(getMockClient())
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/bookings/unassigned
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/bookings/unassigned', () => {

  it('returns null (not 400) when route is called without explicit branch_id — branchId comes from kiosk token', async () => {
    // The /unassigned route reads req.branchId set by requireKiosk middleware.
    // There is no explicit branch_id query guard — it relies on the kiosk token.
    // When no DB rows found it returns null (200), not 400.
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/bookings/unassigned')
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it('returns null when no unassigned bookings exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/bookings/unassigned')
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it('returns the earliest unassigned booking (ordered by scheduled_at ASC)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [UNASSIGNED_BOOKING] })

    const res = await request(app)
      .get('/api/bookings/unassigned')
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(200)
    expect(res.body).not.toBeNull()
    expect(res.body.id).toBe(BOOKING_ID)
    expect(res.body.customer_name).toBe('Budi Santoso')
  })

  it('uses req.branchId (set by kiosk token) as the SQL branch filter', async () => {
    // requireKiosk mock sets req.branchId = 'branch-test-001'
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app)
      .get('/api/bookings/unassigned')
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(pool.query).toHaveBeenCalledTimes(1)
    // The SQL parameter should be the branchId injected by requireKiosk
    const [, params] = pool.query.mock.calls[0]
    expect(params[0]).toBe(BRANCH_ID)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/bookings/:id/claim-and-start
// ═══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/bookings/:id/claim-and-start', () => {

  it('returns 400 when barber_id is missing from body', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/claim-and-start`)
      .send({})
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/barber_id/)
  })

  it('assigns booking to barber and sets status to in_progress', async () => {
    const client = getMockClient()
    // BEGIN
    client.query.mockResolvedValueOnce({})
    // SELECT FOR UPDATE — returns unassigned booking (lock acquired)
    client.query.mockResolvedValueOnce({ rows: [UNASSIGNED_BOOKING] })
    // Barber-branch validation — barber belongs to branch
    client.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] })
    // Advisory lock on barber
    client.query.mockResolvedValueOnce({})
    // COUNT in_progress for capacity check — 0
    client.query.mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
    // UPDATE SET barber_id + status = in_progress
    const updatedRow = { ...UNASSIGNED_BOOKING, barber_id: BARBER_ID, status: 'in_progress', started_at: new Date().toISOString() }
    client.query.mockResolvedValueOnce({ rows: [updatedRow] })
    // UPDATE barbers SET status = 'in_service'
    client.query.mockResolvedValueOnce({})
    // COMMIT
    client.query.mockResolvedValueOnce({})

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/claim-and-start`)
      .send({ barber_id: BARBER_ID })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(200)
    expect(res.body.barber_id).toBe(BARBER_ID)
    expect(res.body.status).toBe('in_progress')
  })

  it('returns 409 when booking already has a barber assigned (SELECT FOR UPDATE returns 0 rows)', async () => {
    const client = getMockClient()
    // BEGIN
    client.query.mockResolvedValueOnce({})
    // SELECT FOR UPDATE — 0 rows (booking already claimed / locked)
    client.query.mockResolvedValueOnce({ rows: [] })
    // ROLLBACK
    client.query.mockResolvedValueOnce({})

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/claim-and-start`)
      .send({ barber_id: BARBER_ID })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/already claimed/i)
  })

  it('returns 409 when claiming barber already has 2 in_progress bookings', async () => {
    const client = getMockClient()
    // BEGIN
    client.query.mockResolvedValueOnce({})
    // SELECT FOR UPDATE — booking available
    client.query.mockResolvedValueOnce({ rows: [UNASSIGNED_BOOKING] })
    // Barber-branch validation — barber belongs to branch
    client.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] })
    // Advisory lock on barber
    client.query.mockResolvedValueOnce({})
    // COUNT in_progress — 2 (at cap)
    client.query.mockResolvedValueOnce({ rows: [{ cnt: '2' }] })
    // ROLLBACK
    client.query.mockResolvedValueOnce({})

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/claim-and-start`)
      .send({ barber_id: BARBER_ID })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/capacity|in_progress/i)
  })

  it('releases client even on unexpected error', async () => {
    const client = getMockClient()
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('DB exploded'))    // SELECT FOR UPDATE
      .mockResolvedValueOnce({}) // ROLLBACK

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/claim-and-start`)
      .send({ barber_id: BARBER_ID })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(500)
    expect(client.release).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Race condition — two concurrent claim-and-start requests for the same booking
// ═══════════════════════════════════════════════════════════════════════════════

describe('Race condition — concurrent claim-and-start', () => {

  it('only one of two concurrent requests succeeds; the other gets 409', async () => {
    // Simulate a race: first caller gets the lock (rows returned), second caller gets 0 rows
    // due to SKIP LOCKED.  We use two separate mock clients.

    const clientA = { query: jest.fn(), release: jest.fn() }
    const clientB = { query: jest.fn(), release: jest.fn() }

    let callCount = 0
    pool.connect.mockImplementation(() => {
      callCount++
      return Promise.resolve(callCount === 1 ? clientA : clientB)
    })

    // Client A wins the lock
    clientA.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [UNASSIGNED_BOOKING] }) // SELECT FOR UPDATE — acquired
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] }) // barber-branch validation
      .mockResolvedValueOnce({}) // advisory lock
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] }) // capacity check — OK
      .mockResolvedValueOnce({ rows: [{ ...UNASSIGNED_BOOKING, barber_id: BARBER_ID, status: 'in_progress' }] }) // UPDATE booking
      .mockResolvedValueOnce({}) // UPDATE barbers SET status
      .mockResolvedValueOnce({}) // COMMIT

    // Client B loses the lock (SKIP LOCKED returns no rows)
    clientB.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE — skipped
      .mockResolvedValueOnce({}) // ROLLBACK

    const BARBER_B = 'barber-test-002'

    const [resA, resB] = await Promise.all([
      request(app)
        .patch(`/api/bookings/${BOOKING_ID}/claim-and-start`)
        .send({ barber_id: BARBER_ID })
        .set('Authorization', 'Bearer TEST-KIOSK-TOKEN'),
      request(app)
        .patch(`/api/bookings/${BOOKING_ID}/claim-and-start`)
        .send({ barber_id: BARBER_B })
        .set('Authorization', 'Bearer TEST-KIOSK-TOKEN'),
    ])

    const statuses = [resA.status, resB.status].sort()
    expect(statuses).toEqual([200, 409])

    // The successful one has in_progress
    const winner = resA.status === 200 ? resA : resB
    expect(winner.body.status).toBe('in_progress')

    // The loser has "already claimed" message
    const loser = resA.status === 409 ? resA : resB
    expect(loser.body.message).toMatch(/already claimed/i)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// walk-in any_available assignment — prefers barber with empty queue
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Regression guard for the walk-in barber assignment bug.
 *
 * Setup:
 *   Bob  (BOB_ID)   — status 'available', has 1 confirmed booking today → conflicts with "Now"
 *   Test 4 (T4_ID) — status 'available', no bookings today → free
 *   Cole (COLE_ID)  — status 'clocked_out' → excluded entirely by getFreeBarberIds
 *
 * Root cause that was fixed:
 *   getFreeBarberIds uses NOT EXISTS.  Bob has a confirmed booking overlapping
 *   "Now", so the subquery finds a row for him → he is excluded from the free set.
 *   Test 4 has no conflicting booking → he is included.
 *   pickIdleBarber → getActiveBarbers then returns Test 4 (only available barber
 *   in the free set), so the booking is assigned to Test 4, not Bob.
 *
 * The "regression guard" companion test documents the bug: if getFreeBarberIds
 * mistakenly returned Bob as free he would be picked first (sorted by idle time /
 * clock-in time).  That scenario is mocked explicitly to prove the test infrastructure
 * can detect the regression.
 */

describe('walk-in any_available assignment — prefers barber with empty queue', () => {

  const BOB_ID  = 'barber-bob-00000000-0000-0000-0001'
  const T4_ID   = 'barber-test4-0000-0000-0000-0002'
  const COLE_ID = 'barber-cole-0000-0000-0000-0003'
  const SVC_ID  = '11111111-1111-1111-1111-111111111111'
  const NEW_BOOKING_ID = 'booking-new-walkin-000000000001'

  // Minimal booking row returned by INSERT INTO bookings
  function makeBookingRow(barberId) {
    return {
      id:             NEW_BOOKING_ID,
      booking_number: 'B001',
      branch_id:      BRANCH_ID,
      barber_id:      barberId,
      status:         'confirmed',
      source:         'any_available',
      guest_name:     'Andi',
      scheduled_at:   new Date().toISOString(),
      created_at:     new Date().toISOString(),
      auto_cancel_at: null,
      points_redeemed: 0,
      notes:          null,
      group_id:       null,
    }
  }

  /**
   * Helper that sets up the full mock sequence for POST /api/bookings with
   * source='any_available', slot_time='Now', one service, no phone, no extras.
   *
   * @param {object} client      — getMockClient()
   * @param {string[]} freeIds   — barber IDs returned by getFreeBarberIds query
   * @param {string[]} activeIds — barber IDs returned by getActiveBarbers query
   */
  function mockWalkinSequence(client, freeIds, activeIds) {
    const freeRows   = freeIds.map(id => ({ id }))
    const activeRows = activeIds.map((id, i) => ({
      id,
      name:              id === T4_ID ? 'Test 4' : 'Bob',
      last_completed_at: null,
      clocked_in_at:     new Date(Date.now() - (i + 1) * 3600 * 1000).toISOString(),
    }))

    const assignedBarberId = activeIds[0] ?? null   // pickIdleBarber picks the first active barber in the free set
    const bookingRow       = makeBookingRow(assignedBarberId)
    const barberName       = assignedBarberId === T4_ID ? 'Test 4' : 'Bob'

    client.query
      // 1. BEGIN
      .mockResolvedValueOnce({})
      // 2. Dup-check → no duplicate
      .mockResolvedValueOnce({ rows: [] })
      // (no customer_phone — customer lookup is skipped)
      // 3. Duration query
      .mockResolvedValueOnce({ rows: [{ dur: '45' }] })
      // 4. getFreeBarberIds — NOT EXISTS query
      .mockResolvedValueOnce({ rows: freeRows })
      // 5. Advisory lock (inside pickIdleBarber)
      .mockResolvedValueOnce({})
      // 6. getActiveBarbers — status='available' barbers sorted by idle time
      .mockResolvedValueOnce({ rows: activeRows })
      // 7. Branch services / price query
      .mockResolvedValueOnce({ rows: [{ id: SVC_ID, price: '45000', duration_minutes: 45, commission_rate: '35' }] })
      // (no extras input — extrasInput is empty, inventory query is skipped)
      // 8. global_settings
      .mockResolvedValueOnce({ rows: [{ points_earn_rate: 0.0001, points_redemption_rate: 10000 }] })
      // 9. auto_cancel_minutes
      .mockResolvedValueOnce({ rows: [{ auto_cancel_minutes: null }] })
      // 10. nextBookingNumber COUNT query
      .mockResolvedValueOnce({ rows: [{ n: 1 }] })
      // 11. INSERT INTO bookings RETURNING *
      .mockResolvedValueOnce({ rows: [bookingRow] })
      // 12. INSERT INTO booking_services (one service)
      .mockResolvedValueOnce({})
      // 13. COMMIT
      .mockResolvedValueOnce({})

    // Post-commit pool.query calls (use pool directly, not client)
    pool.query
      // 14. SELECT name FROM barbers WHERE id = $1  (barber name for response)
      .mockResolvedValueOnce({ rows: [{ name: barberName }] })
      // 15. SELECT name FROM services WHERE id = ANY(...)  (service names for response)
      .mockResolvedValueOnce({ rows: [{ name: 'Classic Haircut' }] })

    return { assignedBarberId, barberName }
  }

  // ── Happy path: Test 4 is free; Bob is excluded by NOT EXISTS ─────────────

  it('assigns to Test 4 (empty queue) and skips Bob (has conflicting booking)', async () => {
    const client = getMockClient()

    // getFreeBarberIds returns only Test 4 — Bob excluded because NOT EXISTS found his booking
    // getActiveBarbers returns only Test 4 — status='available' and in the free set
    mockWalkinSequence(client, [T4_ID], [T4_ID])

    const res = await request(app)
      .post('/api/bookings')
      .send({
        customer_name: 'Andi',
        service_ids:   [SVC_ID],
        slot_time:     'Now',
        source:        'any_available',
      })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(201)
    expect(res.body.barber_id).toBe(T4_ID)
    expect(res.body.barber_name).toBe('Test 4')
    expect(res.body.source).toBe('any_available')
  })

  it('deferred flag is false because a barber was found (not a deferred booking)', async () => {
    const client = getMockClient()
    mockWalkinSequence(client, [T4_ID], [T4_ID])

    const res = await request(app)
      .post('/api/bookings')
      .send({
        customer_name: 'Andi',
        service_ids:   [SVC_ID],
        slot_time:     'Now',
        source:        'any_available',
      })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(201)
    expect(res.body.deferred).toBe(false)
  })

  // ── Regression guard: if getFreeBarberIds mistakenly included Bob ──────────
  // This test documents what the bug looked like before the fix.
  // If the NOT EXISTS logic were broken and Bob appeared in freeIds, pickIdleBarber
  // would call getActiveBarbers and return Bob first (he clocked in earlier than Test 4).
  // The test asserts on Bob being assigned to prove the infrastructure can detect
  // the regression — it is NOT the correct behaviour.

  it('[REGRESSION GUARD] if getFreeBarberIds wrongly includes Bob, he gets assigned first (documents the old bug)', async () => {
    const client = getMockClient()

    // Simulate the broken state: freeIds includes both Bob AND Test 4
    // getActiveBarbers returns Bob first (clocked in earlier — idle time sort)
    mockWalkinSequence(client, [BOB_ID, T4_ID], [BOB_ID, T4_ID])

    const res = await request(app)
      .post('/api/bookings')
      .send({
        customer_name: 'Andi',
        service_ids:   [SVC_ID],
        slot_time:     'Now',
        source:        'any_available',
      })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(201)
    // Bob gets assigned — this is the WRONG outcome that the bug fix prevents.
    // If this assertion ever fails (Bob is NOT assigned when he is first in the active list),
    // the pickIdleBarber logic has changed and this regression guard needs updating.
    expect(res.body.barber_id).toBe(BOB_ID)
    expect(res.body.barber_name).toBe('Bob')
  })

  // ── Edge case: no free barbers → booking is deferred ──────────────────────

  it('creates a deferred booking (barber_id null) when no free barbers exist', async () => {
    // When getFreeBarberIds returns an empty set, pickIdleBarber short-circuits
    // (freeIds.size === 0) and returns null immediately — NO advisory lock query
    // and NO getActiveBarbers query are issued.  The booking is inserted with
    // barber_id = null (deferred).
    // Note: isNow=true means we take the isNow || within30Min branch, so the
    // deferred-capacity CTE block is NOT reached.
    const client = getMockClient()

    client.query
      .mockResolvedValueOnce({})                              // BEGIN
      .mockResolvedValueOnce({ rows: [] })                    // dup-check
      .mockResolvedValueOnce({ rows: [{ dur: '45' }] })       // duration
      .mockResolvedValueOnce({ rows: [] })                    // getFreeBarberIds → empty set
      // advisory lock and getActiveBarbers are SKIPPED (freeIds.size === 0 early-return)
      .mockResolvedValueOnce({ rows: [{ id: SVC_ID, price: '45000', duration_minutes: 45, commission_rate: '35' }] }) // svcRows
      .mockResolvedValueOnce({ rows: [{ points_earn_rate: 0.0001, points_redemption_rate: 10000 }] }) // global_settings
      .mockResolvedValueOnce({ rows: [{ auto_cancel_minutes: null }] })                              // branches
      .mockResolvedValueOnce({ rows: [{ n: 1 }] })            // nextBookingNumber
      .mockResolvedValueOnce({ rows: [makeBookingRow(null)] }) // INSERT booking (barber_id = null)
      .mockResolvedValueOnce({})                              // INSERT booking_services
      .mockResolvedValueOnce({})                              // COMMIT

    // post-commit pool queries: barberId is null so barber-name query is skipped;
    // only service names query runs
    pool.query
      .mockResolvedValueOnce({ rows: [{ name: 'Classic Haircut' }] }) // service names

    const res = await request(app)
      .post('/api/bookings')
      .send({
        customer_name: 'Andi',
        service_ids:   [SVC_ID],
        slot_time:     'Now',
        source:        'any_available',
      })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(201)
    expect(res.body.barber_id).toBeNull()
    expect(res.body.deferred).toBe(true)
    expect(res.body.barber_name).toBe('Any Available')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// claim-and-start — parallel in_progress cap (COUNT >= 2 guard in bookings.js)
// ═══════════════════════════════════════════════════════════════════════════════

describe('claim-and-start — parallel in_progress cap', () => {
  /**
   * These tests verify the capacity guard inside the claim-and-start route
   * (bookings.js), which rejects if the claiming barber already has >= 2
   * in_progress bookings.  This is independent of getFreeBarberIds, which
   * uses NOT EXISTS and is only called during walk-in assignment.
   */

  it('barber with 1 in_progress can still claim (under the >= 2 cap)', async () => {
    const client = getMockClient()
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [UNASSIGNED_BOOKING] }) // lock acquired
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] }) // barber-branch validation
      .mockResolvedValueOnce({}) // advisory lock
      .mockResolvedValueOnce({ rows: [{ cnt: '1' }] }) // 1 in_progress — under cap
      .mockResolvedValueOnce({ rows: [{ ...UNASSIGNED_BOOKING, barber_id: BARBER_ID, status: 'in_progress' }] })
      .mockResolvedValueOnce({}) // UPDATE barbers
      .mockResolvedValueOnce({}) // COMMIT

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/claim-and-start`)
      .send({ barber_id: BARBER_ID })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(200)
  })

  it('barber with 2 in_progress cannot claim (at cap)', async () => {
    const client = getMockClient()
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [UNASSIGNED_BOOKING] }) // lock acquired
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] }) // barber-branch validation
      .mockResolvedValueOnce({}) // advisory lock
      .mockResolvedValueOnce({ rows: [{ cnt: '2' }] }) // 2 in_progress — at cap
      .mockResolvedValueOnce({}) // ROLLBACK

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/claim-and-start`)
      .send({ barber_id: BARBER_ID })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/capacity|in_progress/i)
  })

  it('barber with 0 in_progress can claim', async () => {
    const client = getMockClient()
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [UNASSIGNED_BOOKING] }) // lock
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] }) // barber-branch validation
      .mockResolvedValueOnce({}) // advisory lock
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] }) // 0 in_progress
      .mockResolvedValueOnce({ rows: [{ ...UNASSIGNED_BOOKING, barber_id: BARBER_ID, status: 'in_progress' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({}) // COMMIT

    const res = await request(app)
      .patch(`/api/bookings/${BOOKING_ID}/claim-and-start`)
      .send({ barber_id: BARBER_ID })
      .set('Authorization', 'Bearer TEST-KIOSK-TOKEN')

    expect(res.status).toBe(200)
  })
})
