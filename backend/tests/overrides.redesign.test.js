/**
 * overrides.redesign.test.js
 *
 * Tests for the chair override redesign:
 *
 *   1. GET /api/barbers/all — 6 new fields returned per barber:
 *        chair_label, chair_branch_name,
 *        override_chair_label, override_branch_name,
 *        override_date_from, override_date_to, override_home_barber_name
 *
 *   2. POST /:id/chairs/:chairId/overrides — redesigned behaviour:
 *        a) Cancels existing override on the target chair
 *        b) Auto-cancels any active override the selected barber holds elsewhere
 *        c) Wrapped in a transaction (atomicity)
 */

// ── Auth / middleware mocks ────────────────────────────────────────────────────
jest.mock('../middleware/auth', () => ({
  requireAdmin:        (req, res, next) => { req.user = { id: 'user-001' }; next() },
  requireKiosk:        (req, res, next) => { req.branchId = 'branch-A'; next() },
  requireKioskOrAdmin: (req, res, next) => { req.branchId = 'branch-A'; next() },
  checkPermission:     () => (req, res, next) => { req.user = { id: 'user-001' }; next() },
  JWT_SECRET:          'test-secret',
}))

jest.mock('../config/db', () => {
  const client = { query: jest.fn(), release: jest.fn() }
  const pool   = { query: jest.fn(), connect: jest.fn().mockResolvedValue(client), _client: client }
  return pool
})

const request = require('supertest')
const express = require('express')
const barbersRouter  = require('../routes/barbers')
const branchesRouter = require('../routes/branches')
const pool           = require('../config/db')

// ── Express apps ───────────────────────────────────────────────────────────────
const barbersApp = express()
barbersApp.use(express.json())
barbersApp.use('/api/barbers', barbersRouter)

const branchesApp = express()
branchesApp.use(express.json())
branchesApp.use('/api/branches', branchesRouter)

// ── IDs ────────────────────────────────────────────────────────────────────────
const BRANCH_ID       = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_BRANCH_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
const CHAIR_ID        = 'cccccccc-0000-0000-0000-000000000003'
const BARBER_ID       = 'dddddddd-0000-0000-0000-000000000004'
const OVERRIDE_ID     = 'eeeeeeee-0000-0000-0000-000000000005'

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Convenience row builder for GET /api/barbers/all responses */
function barberRow(overrides = {}) {
  return {
    id:                     BARBER_ID,
    name:                   'Ali',
    branch_id:              BRANCH_ID,
    specialty:              'Haircut',
    phone:                  null,
    status:                 'clocked_in',
    is_active:              true,
    sort_order:             1,
    pay_type:               'commission',
    base_salary:            null,
    daily_rate:             null,
    chair_label:            null,
    chair_branch_name:      null,
    override_chair_label:   null,
    override_branch_name:   null,
    override_date_from:     null,
    override_date_to:       null,
    override_home_barber_name: null,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  pool.query.mockReset()
  pool._client.query.mockReset()
  pool._client.release.mockReset()
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/barbers/all — new fields
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/barbers/all — new chair / override fields', () => {

  // ── Test 1 — barber with no chair ────────────────────────────────────────────
  it('returns chair_label null and override_chair_label null for a barber with no chair', async () => {
    const row = barberRow()  // all nulls by default
    pool.query.mockResolvedValueOnce({ rows: [row] })

    const res = await request(barbersApp).get('/api/barbers/all')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].chair_label).toBeNull()
    expect(res.body[0].chair_branch_name).toBeNull()
    expect(res.body[0].override_chair_label).toBeNull()
    expect(res.body[0].override_branch_name).toBeNull()
  })

  // ── Test 2 — barber with a permanent chair ───────────────────────────────────
  it('returns chair_label and chair_branch_name for a barber with a permanent chair', async () => {
    const row = barberRow({
      chair_label:       'A1',
      chair_branch_name: 'Main Branch',
    })
    pool.query.mockResolvedValueOnce({ rows: [row] })

    const res = await request(barbersApp).get('/api/barbers/all')

    expect(res.status).toBe(200)
    expect(res.body[0].chair_label).toBe('A1')
    expect(res.body[0].chair_branch_name).toBe('Main Branch')
    // No active override
    expect(res.body[0].override_chair_label).toBeNull()
    expect(res.body[0].override_branch_name).toBeNull()
  })

  // ── Test 3 — barber with an active override ──────────────────────────────────
  it('returns override_chair_label, override_branch_name, override_date_from for a barber with an active override', async () => {
    const row = barberRow({
      chair_label:              'A1',
      chair_branch_name:        'Main Branch',
      override_chair_label:     'B2',
      override_branch_name:     'Other Branch',
      override_date_from:       '2025-06-01',
      override_date_to:         null,
      override_home_barber_name: 'Budi',
    })
    pool.query.mockResolvedValueOnce({ rows: [row] })

    const res = await request(barbersApp).get('/api/barbers/all')

    expect(res.status).toBe(200)
    expect(res.body[0].override_chair_label).toBe('B2')
    expect(res.body[0].override_branch_name).toBe('Other Branch')
    expect(res.body[0].override_date_from).toBe('2025-06-01')
    expect(res.body[0].override_home_barber_name).toBe('Budi')
  })

  // ── Test 4 — barber with an expired override ─────────────────────────────────
  it('returns override_chair_label null for a barber whose override has expired (DB filters it)', async () => {
    // The SQL LATERAL subquery guards on date_to >= CURRENT_DATE, so the DB
    // returns NULL for all override_* fields when the override is expired.
    const row = barberRow({
      chair_label:       'A1',
      chair_branch_name: 'Main Branch',
      // override_* fields remain null (expired → lateral returns nothing)
    })
    pool.query.mockResolvedValueOnce({ rows: [row] })

    const res = await request(barbersApp).get('/api/barbers/all')

    expect(res.status).toBe(200)
    expect(res.body[0].override_chair_label).toBeNull()
    expect(res.body[0].override_date_from).toBeNull()

    // Confirm the SQL contains the date guard in the LATERAL subquery
    const sql = pool.query.mock.calls[0][0]
    expect(sql).toMatch(/date_to IS NULL OR.*date_to >= CURRENT_DATE/i)
    expect(sql).toMatch(/date_from <= CURRENT_DATE/i)
  })

  // ── Test 5 — barber with a resolved override ─────────────────────────────────
  it('returns override_chair_label null for a barber whose override was resolved (resolved_by IS NOT NULL)', async () => {
    // The SQL LATERAL subquery includes AND co.resolved_by IS NULL, so a
    // manually resolved override is not picked up.
    const row = barberRow({
      chair_label:       'A1',
      chair_branch_name: 'Main Branch',
      // override_* nulls because resolved_by IS NOT NULL filtered by lateral
    })
    pool.query.mockResolvedValueOnce({ rows: [row] })

    const res = await request(barbersApp).get('/api/barbers/all')

    expect(res.status).toBe(200)
    expect(res.body[0].override_chair_label).toBeNull()

    // Confirm the SQL filters resolved overrides in the LATERAL subquery
    const sql = pool.query.mock.calls[0][0]
    expect(sql).toMatch(/resolved_by IS NULL/i)
  })

  // ── Test — SQL selects all 7 new fields ──────────────────────────────────────
  it('issues a query that selects all 7 new override / chair fields', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(barbersApp).get('/api/barbers/all')

    const sql = pool.query.mock.calls[0][0]
    expect(sql).toMatch(/chair_label/i)
    expect(sql).toMatch(/chair_branch_name/i)
    expect(sql).toMatch(/override_chair_label/i)
    expect(sql).toMatch(/override_branch_name/i)
    expect(sql).toMatch(/override_date_from/i)
    expect(sql).toMatch(/override_date_to/i)
    expect(sql).toMatch(/override_home_barber_name/i)
  })

  // ── Test — uses LATERAL JOIN ─────────────────────────────────────────────────
  it('uses a LATERAL JOIN for the active override subquery', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(barbersApp).get('/api/barbers/all')

    const sql = pool.query.mock.calls[0][0]
    expect(sql).toMatch(/LATERAL/i)
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /:id/chairs/:chairId/overrides — redesigned transaction behaviour
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/branches/:id/chairs/:chairId/overrides — transaction behaviour', () => {

  const client = pool._client

  // ── Test 6 — auto-cancel barber's previous override elsewhere ────────────────
  it('cancels the barber\'s existing active override elsewhere (auto-cancel)', async () => {
    const newOverrideRow = {
      id: OVERRIDE_ID,
      chair_id: CHAIR_ID,
      barber_id: BARBER_ID,
      date_from: '2025-07-01',
      date_to: null,
    }

    // Transaction flow: BEGIN, UPDATE target chair, UPDATE barber's old override, INSERT, COMMIT
    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // UPDATE chair_overrides WHERE chair_id (cancel target chair's override)
      .mockResolvedValueOnce({ rows: [] })  // UPDATE chair_overrides WHERE barber_id (auto-cancel barber's old override)
      .mockResolvedValueOnce({ rows: [newOverrideRow] })  // INSERT
      .mockResolvedValueOnce({ rows: [] })  // COMMIT

    const res = await request(branchesApp)
      .post(`/api/branches/${BRANCH_ID}/chairs/${CHAIR_ID}/overrides`)
      .send({ barber_id: BARBER_ID, date_from: '2025-07-01' })

    expect(res.status).toBe(201)
    expect(res.body.id).toBe(OVERRIDE_ID)
    expect(res.body.barber_id).toBe(BARBER_ID)

    // Verify auto-cancel UPDATE was issued (second UPDATE, third client.query call overall)
    const calls = client.query.mock.calls
    // BEGIN is first
    expect(calls[0][0]).toMatch(/BEGIN/i)

    // First UPDATE: cancel target chair's override
    const cancelChairCall = calls[1]
    expect(cancelChairCall[0]).toMatch(/UPDATE chair_overrides/i)
    expect(cancelChairCall[0]).toMatch(/chair_id/i)
    expect(cancelChairCall[1]).toContain(CHAIR_ID)

    // Second UPDATE: auto-cancel barber's override elsewhere
    const cancelBarberCall = calls[2]
    expect(cancelBarberCall[0]).toMatch(/UPDATE chair_overrides/i)
    expect(cancelBarberCall[0]).toMatch(/barber_id/i)
    expect(cancelBarberCall[1]).toContain(BARBER_ID)

    // COMMIT is last before release
    expect(calls[4][0]).toMatch(/COMMIT/i)
  })

  // ── Test 7 — normal case: free barber, no side effects ───────────────────────
  it('creates override for a free barber and issues no extra side-effect UPDATEs', async () => {
    const newOverrideRow = {
      id: OVERRIDE_ID,
      chair_id: CHAIR_ID,
      barber_id: BARBER_ID,
      date_from: '2025-07-01',
      date_to: null,
    }

    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // UPDATE target chair's override (0 rows affected but query still runs)
      .mockResolvedValueOnce({ rows: [] })  // UPDATE barber's overrides elsewhere (0 rows — barber is free)
      .mockResolvedValueOnce({ rows: [newOverrideRow] })  // INSERT
      .mockResolvedValueOnce({ rows: [] })  // COMMIT

    const res = await request(branchesApp)
      .post(`/api/branches/${BRANCH_ID}/chairs/${CHAIR_ID}/overrides`)
      .send({ barber_id: BARBER_ID, date_from: '2025-07-01' })

    expect(res.status).toBe(201)
    expect(res.body.chair_id).toBe(CHAIR_ID)

    // The route must use exactly 5 client.query calls: BEGIN, 2x UPDATE, INSERT, COMMIT
    expect(client.query.mock.calls).toHaveLength(5)
    // No extra (6th) call means no unintended side effects
    expect(client.query.mock.calls[4][0]).toMatch(/COMMIT/i)
  })

  // ── Test 8 — transaction rollback on INSERT failure ───────────────────────────
  it('rolls back the transaction if the INSERT fails, leaving neither UPDATE persisted', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })                   // BEGIN
      .mockResolvedValueOnce({ rows: [] })                   // UPDATE target chair's override
      .mockResolvedValueOnce({ rows: [] })                   // UPDATE barber's overrides elsewhere
      .mockRejectedValueOnce(new Error('insert error: invalid barber_id'))  // INSERT fails
      .mockResolvedValueOnce({ rows: [] })                   // ROLLBACK

    const res = await request(branchesApp)
      .post(`/api/branches/${BRANCH_ID}/chairs/${CHAIR_ID}/overrides`)
      .send({ barber_id: 'invalid-barber-id', date_from: '2025-07-01' })

    expect(res.status).toBe(500)

    // ROLLBACK must have been called (4th client.query call = ROLLBACK)
    const calls = client.query.mock.calls
    const rollbackCall = calls.find(([sql]) => typeof sql === 'string' && /ROLLBACK/i.test(sql))
    expect(rollbackCall).toBeDefined()

    // COMMIT must NOT have been called
    const commitCall = calls.find(([sql]) => typeof sql === 'string' && /COMMIT/i.test(sql))
    expect(commitCall).toBeUndefined()
  })

  // ── Test — missing barber_id returns 400 ─────────────────────────────────────
  it('returns 400 when barber_id is missing', async () => {
    const res = await request(branchesApp)
      .post(`/api/branches/${BRANCH_ID}/chairs/${CHAIR_ID}/overrides`)
      .send({ date_from: '2025-07-01' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('message', 'barber_id required')
    // No DB calls should have been made
    expect(client.query).not.toHaveBeenCalled()
  })

  // ── Test — missing date_from returns 400 ─────────────────────────────────────
  it('returns 400 when date_from is missing', async () => {
    const res = await request(branchesApp)
      .post(`/api/branches/${BRANCH_ID}/chairs/${CHAIR_ID}/overrides`)
      .send({ barber_id: BARBER_ID })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('message', 'date_from required')
    expect(client.query).not.toHaveBeenCalled()
  })

  // ── Test — client.release() is called in all outcomes ────────────────────────
  it('releases the DB client even when the transaction fails', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockRejectedValueOnce(new Error('db error'))  // first UPDATE fails
      .mockResolvedValueOnce({ rows: [] })  // ROLLBACK

    await request(branchesApp)
      .post(`/api/branches/${BRANCH_ID}/chairs/${CHAIR_ID}/overrides`)
      .send({ barber_id: BARBER_ID, date_from: '2025-07-01' })

    expect(client.release).toHaveBeenCalledTimes(1)
  })

})
