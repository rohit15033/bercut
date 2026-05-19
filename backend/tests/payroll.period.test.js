// payroll.period.test.js

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

function findExistingPeriod(periods, targetFrom, targetTo) {
  return periods.find(p =>
    p.period_from.slice(0, 10) === targetFrom.slice(0, 10) &&
    p.period_to.slice(0, 10)   === targetTo.slice(0, 10)
  )
}

describe('Frontend period find — .slice(0,10) ISO timestamp comparison', () => {
  const periods = [
    { id: 'period-1', period_from: '2026-05-01T00:00:00.000Z', period_to: '2026-05-31T00:00:00.000Z', period_month: '2026-05' },
    { id: 'period-2', period_from: '2026-04-01T00:00:00.000Z', period_to: '2026-04-30T00:00:00.000Z', period_month: '2026-04' },
  ]

  test('finds period when searching with plain date strings', () => {
    expect(findExistingPeriod(periods, '2026-05-01', '2026-05-31')?.id).toBe('period-1')
  })

  test('finds period when searching with ISO timestamps', () => {
    expect(findExistingPeriod(periods, '2026-05-01T00:00:00.000Z', '2026-05-31T00:00:00.000Z')?.id).toBe('period-1')
  })

  test('finds period — DB ISO vs plain date search (actual fix scenario)', () => {
    expect(findExistingPeriod(periods, '2026-04-01', '2026-04-30')?.id).toBe('period-2')
  })

  test('returns undefined for missing period', () => {
    expect(findExistingPeriod(periods, '2026-06-01', '2026-06-30')).toBeUndefined()
  })

  test('no match if period_to differs', () => {
    expect(findExistingPeriod(periods, '2026-05-01', '2026-05-15')).toBeUndefined()
  })

  test('strict === fails on ISO vs plain (demonstrates why slice is needed)', () => {
    const bugged = periods.find(p => p.period_from === '2026-05-01' && p.period_to === '2026-05-31')
    expect(bugged).toBeUndefined()
  })
})

// ── POST /api/payroll/periods/generate ───────────────────────────────────────

describe('POST /api/payroll/periods/generate', () => {
  let mockClient

  const VALID_BODY = {
    branch_id:    'branch-1',
    period_month: '2026-05',
    period_from:  '2026-05-01',
    period_to:    '2026-05-31',
  }

  const FAKE_PERIOD = {
    id: 'period-new', branch_id: 'branch-1',
    period_from: '2026-05-01', period_to: '2026-05-31',
    period_month: '2026-05', status: 'draft', generated_at: new Date().toISOString(),
  }

  const SETTINGS_ROW = {
    late_deduction_per_minute: 2000, late_grace_period_minutes: 5,
    inexcused_off_flat_deduction: 150000, excused_off_flat_deduction: 150000,
    ot_commission_enabled: false, ot_threshold_time: '19:00',
    ot_bonus_pct: 5, working_days_per_week: 6, off_quota_per_week: 1,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = { query: jest.fn(), release: jest.fn() }
    pool.connect.mockResolvedValue(mockClient)
  })

  test('new period: returns 201 with { period, entries }', async () => {
    mockClient.query
      .mockResolvedValueOnce({})                              // BEGIN
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })         // INSERT periods
      .mockResolvedValueOnce({})                              // UPDATE generated_at
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })        // SELECT payroll_settings
      .mockResolvedValueOnce({ rows: [] })                    // SELECT barbers (none)
      .mockResolvedValueOnce({})                              // COMMIT

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })         // SELECT * FROM payroll_periods (updatedPeriod)
      .mockResolvedValueOnce({ rows: [] })                    // SELECT payroll_entries (entries)

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('period')
    expect(res.body).toHaveProperty('entries')
    expect(res.body.period.id).toBe('period-new')
    expect(Array.isArray(res.body.entries)).toBe(true)
  })

  test('existing period (conflict): recalculates and returns 201 (no 409)', async () => {
    const existingPeriod = { ...FAKE_PERIOD, id: 'period-existing', status: 'reviewed' }

    mockClient.query
      .mockResolvedValueOnce({})                              // BEGIN
      .mockResolvedValueOnce({ rows: [] })                    // INSERT → DO NOTHING (conflict)
      .mockResolvedValueOnce({ rows: [existingPeriod] })      // SELECT existing period
      .mockResolvedValueOnce({})                              // UPDATE status=draft, generated_at
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })        // SELECT payroll_settings
      .mockResolvedValueOnce({ rows: [] })                    // SELECT barbers (none)
      .mockResolvedValueOnce({})                              // COMMIT

    pool.query
      .mockResolvedValueOnce({ rows: [existingPeriod] })      // updatedPeriod
      .mockResolvedValueOnce({ rows: [] })                    // entries

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(201)
    expect(res.body.period.id).toBe('period-existing')
    // Status reset to draft confirmed in the UPDATE call
    const updateCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes("status = 'draft'")
    )
    expect(updateCall).toBeDefined()
  })

  test('conflict + existing period not found → 500', async () => {
    mockClient.query
      .mockResolvedValueOnce({})          // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // INSERT → conflict
      .mockResolvedValueOnce({ rows: [] }) // SELECT existing → not found
      .mockResolvedValueOnce({})           // ROLLBACK

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Period conflict but not found')
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

  test('DB error on INSERT → 500 + ROLLBACK', async () => {
    mockClient.query
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('DB exploded'))
      .mockResolvedValueOnce({})

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Internal server error')
    const calls = mockClient.query.mock.calls.map(c => c[0])
    expect(calls).toContain('ROLLBACK')
  })
})

// ── DELETE /api/payroll/adjustments/:id ──────────────────────────────────────

describe('DELETE /api/payroll/adjustments/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  test('non-kasbon adjustment: deletes and returns 204', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'adj-1', is_kasbon: false }] }) // SELECT
      .mockResolvedValueOnce({})                                              // DELETE

    const res = await supertest(makeApp())
      .delete('/api/payroll/adjustments/adj-1')

    expect(res.status).toBe(204)
    const deleteSql = pool.query.mock.calls[1][0]
    expect(deleteSql).toMatch(/DELETE FROM payroll_adjustments/)
    expect(pool.query.mock.calls[1][1]).toContain('adj-1')
  })

  test('kasbon adjustment → 400, no DELETE executed', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'adj-kasbon', is_kasbon: true }] })

    const res = await supertest(makeApp())
      .delete('/api/payroll/adjustments/adj-kasbon')

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Cannot delete kasbon adjustments')
    expect(pool.query.mock.calls).toHaveLength(1) // only SELECT, no DELETE
  })

  test('not found → 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .delete('/api/payroll/adjustments/nonexistent')

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Not found')
  })

  test('DB error → 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'))

    const res = await supertest(makeApp())
      .delete('/api/payroll/adjustments/adj-1')

    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Internal server error')
  })
})

// ── PATCH /api/payroll/adjustments/:id ───────────────────────────────────────

describe('PATCH /api/payroll/adjustments/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  test('deduct_period=next → updates and returns adj row', async () => {
    const updatedAdj = { id: 'adj-1', deduct_period: 'next', is_kasbon: true }
    pool.query.mockResolvedValueOnce({ rows: [updatedAdj] })

    const res = await supertest(makeApp())
      .patch('/api/payroll/adjustments/adj-1')
      .send({ deduct_period: 'next' })

    expect(res.status).toBe(200)
    expect(res.body.deduct_period).toBe('next')
    expect(pool.query.mock.calls[0][1]).toEqual(['next', 'adj-1'])
  })

  test('deduct_period=current → updates and returns adj row', async () => {
    const updatedAdj = { id: 'adj-1', deduct_period: 'current', is_kasbon: true }
    pool.query.mockResolvedValueOnce({ rows: [updatedAdj] })

    const res = await supertest(makeApp())
      .patch('/api/payroll/adjustments/adj-1')
      .send({ deduct_period: 'current' })

    expect(res.status).toBe(200)
    expect(res.body.deduct_period).toBe('current')
  })

  test('invalid deduct_period → 400', async () => {
    const res = await supertest(makeApp())
      .patch('/api/payroll/adjustments/adj-1')
      .send({ deduct_period: 'invalid_value' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('deduct_period must be current or next')
    expect(pool.query.mock.calls).toHaveLength(0) // no DB call
  })

  test('not found → 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .patch('/api/payroll/adjustments/adj-1')
      .send({ deduct_period: 'next' })

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Not found')
  })

  test('DB error → 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'))

    const res = await supertest(makeApp())
      .patch('/api/payroll/adjustments/adj-1')
      .send({ deduct_period: 'next' })

    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Internal server error')
  })
})
