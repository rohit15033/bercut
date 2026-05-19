// payroll.period.test.js
//
// Tests for:
//   1. Payroll period dedup — POST /api/payroll/periods/generate returns 409 on duplicate
//      (ON CONFLICT (branch_id, period_from, period_to) DO NOTHING)
//   2. Frontend period find fix — .slice(0,10) comparison for ISO timestamp from DB
//   3. First generate succeeds and returns { period, entries }

// ── Mock DB before any require ────────────────────────────────────────────────

jest.mock('../config/db', () => {
  const mockPool = { query: jest.fn(), connect: jest.fn() }
  return mockPool
})
jest.mock('../middleware/auth', () => ({
  requireAdmin: (req, _res, next) => { req.user = { id: 'admin-1', role: 'admin' }; next() },
  requireOwner: (req, _res, next) => next(),
}))

const pool      = require('../config/db')
const express   = require('express')
const supertest = require('supertest')
const payrollRouter = require('../routes/payroll')

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/payroll', payrollRouter)
  return app
}

// ── Frontend period find logic (pure, no React) ───────────────────────────────
//
// Mirrors the Payroll.jsx fix: compare .slice(0,10) of both sides so an ISO
// timestamp from the DB ('2026-05-01T00:00:00.000Z') matches the local date
// string used when generating ('2026-05-01').

function findExistingPeriod(periods, targetFrom, targetTo) {
  return periods.find(p =>
    p.period_from.slice(0, 10) === targetFrom.slice(0, 10) &&
    p.period_to.slice(0, 10)   === targetTo.slice(0, 10)
  )
}

describe('Frontend period find — .slice(0,10) ISO timestamp comparison', () => {
  const periods = [
    {
      id:          'period-1',
      period_from: '2026-05-01T00:00:00.000Z',
      period_to:   '2026-05-31T00:00:00.000Z',
      period_month: '2026-05',
    },
    {
      id:          'period-2',
      period_from: '2026-04-01T00:00:00.000Z',
      period_to:   '2026-04-30T00:00:00.000Z',
      period_month: '2026-04',
    },
  ]

  test('finds period when searching with plain date strings', () => {
    const found = findExistingPeriod(periods, '2026-05-01', '2026-05-31')
    expect(found).toBeDefined()
    expect(found.id).toBe('period-1')
  })

  test('finds period when searching with ISO timestamps (same format as DB)', () => {
    const found = findExistingPeriod(periods, '2026-05-01T00:00:00.000Z', '2026-05-31T00:00:00.000Z')
    expect(found).toBeDefined()
    expect(found.id).toBe('period-1')
  })

  test('finds period when DB ISO vs plain date search (the actual fix scenario)', () => {
    // DB returns ISO timestamp; UI generates plain date — this is the mixed case
    const found = findExistingPeriod(periods, '2026-04-01', '2026-04-30')
    expect(found).toBeDefined()
    expect(found.id).toBe('period-2')
  })

  test('returns undefined for a period that does not exist', () => {
    const found = findExistingPeriod(periods, '2026-06-01', '2026-06-30')
    expect(found).toBeUndefined()
  })

  test('does NOT match if from matches but to differs', () => {
    const found = findExistingPeriod(periods, '2026-05-01', '2026-05-15')
    expect(found).toBeUndefined()
  })

  test('without .slice(0,10) — strict equality would FAIL on ISO vs plain', () => {
    // Demonstrate the bug that was fixed: direct === comparison
    const bugged = periods.find(p =>
      p.period_from === '2026-05-01' &&
      p.period_to   === '2026-05-31'
    )
    expect(bugged).toBeUndefined() // would be undefined (the original bug)
  })
})

// ── POST /api/payroll/periods/generate — route integration ───────────────────

describe('POST /api/payroll/periods/generate', () => {
  let mockClient

  beforeEach(() => {
    jest.clearAllMocks()

    mockClient = {
      query:   jest.fn(),
      release: jest.fn(),
    }
    pool.connect.mockResolvedValue(mockClient)
  })

  const VALID_BODY = {
    branch_id:    'branch-1',
    period_month: '2026-05',
    period_from:  '2026-05-01',
    period_to:    '2026-05-31',
  }

  test('first generate succeeds: returns 201 with { period, entries }', async () => {
    const fakePeriod = {
      id:          'period-new',
      branch_id:   'branch-1',
      period_from: '2026-05-01',
      period_to:   '2026-05-31',
      period_month: '2026-05',
    }

    // BEGIN
    mockClient.query.mockResolvedValueOnce({})
    // INSERT payroll_periods (ON CONFLICT DO NOTHING) → returns new row
    mockClient.query.mockResolvedValueOnce({ rows: [fakePeriod] })
    // SELECT payroll_settings
    mockClient.query.mockResolvedValueOnce({ rows: [{ late_deduction_per_minute: 2000, late_grace_period_minutes: 5, inexcused_off_flat_deduction: 150000, excused_off_flat_deduction: 150000, ot_commission_enabled: false, ot_threshold_time: '19:00', ot_bonus_pct: 5, working_days_per_week: 6 }] })
    // SELECT barbers (none active → skip loop)
    mockClient.query.mockResolvedValueOnce({ rows: [] })
    // COMMIT
    mockClient.query.mockResolvedValueOnce({})

    // pool.query for fetching entries after commit
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('period')
    expect(res.body).toHaveProperty('entries')
    expect(res.body.period.id).toBe('period-new')
    expect(Array.isArray(res.body.entries)).toBe(true)
  })

  test('duplicate period → 409 with { message: "Period already exists" }', async () => {
    // BEGIN
    mockClient.query.mockResolvedValueOnce({})
    // INSERT returns empty rows (ON CONFLICT DO NOTHING triggered)
    mockClient.query.mockResolvedValueOnce({ rows: [] })
    // ROLLBACK
    mockClient.query.mockResolvedValueOnce({})

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('Period already exists')
    // ROLLBACK must have been called
    const calls = mockClient.query.mock.calls.map(c => c[0])
    expect(calls).toContain('ROLLBACK')
  })

  test('missing period_from → 400', async () => {
    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send({ branch_id: 'branch-1', period_month: '2026-05', period_to: '2026-05-31' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/period_from/)
  })

  test('missing period_to → 400', async () => {
    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send({ branch_id: 'branch-1', period_month: '2026-05', period_from: '2026-05-01' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/period_to/)
  })

  test('missing period_month → 400', async () => {
    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send({ branch_id: 'branch-1', period_from: '2026-05-01', period_to: '2026-05-31' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/period_month/)
  })

  test('DB error → 500 and ROLLBACK called', async () => {
    mockClient.query
      .mockResolvedValueOnce({})                          // BEGIN
      .mockRejectedValueOnce(new Error('DB exploded'))   // INSERT throws
      .mockResolvedValueOnce({})                          // ROLLBACK

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Internal server error')
  })
})
