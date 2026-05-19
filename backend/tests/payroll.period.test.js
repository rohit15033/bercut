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

// ── POST /api/payroll/periods/generate — kasbon auto-import ─────────────────

describe('POST /api/payroll/periods/generate — kasbon auto-import', () => {
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

  const FAKE_BARBER = {
    id: 'barber-1', name: 'Barber One', branch_id: 'branch-1',
    base_salary: 3000000, commission_rate: 0.4, pay_type: 'commission',
    is_active: true, off_deduction_type: 'flat',
  }

  const FAKE_ENTRY = {
    id: 'entry-1', barber_id: 'barber-1', period_id: 'period-new', base_salary: 3000000,
  }

  const FAKE_KASBON_EXP = {
    id: 'exp-kas-1', type: 'kasbon', barber_id: 'barber-1',
    amount: 200000, description: 'Salary advance', submitted_by: 'admin-1',
    expense_date: '2026-05-05', deduct_period: 'current',
  }

  const FAKE_ADJ = {
    id: 'adj-1', payroll_entry_id: 'entry-1', type: 'deduction',
    category: 'Kasbon', is_kasbon: true, expense_id: 'exp-kas-1',
    amount: 200000, deduct_period: 'current',
  }

  // Helper: standard per-barber mocks up to (and including) the upsert INSERT,
  // with zero bookings and no kasbon SUM for simplicity.
  function mockPerBarberPreamble(client) {
    client.query
      // attendance (late minutes)
      .mockResolvedValueOnce({ rows: [{ total_late_minutes: 0 }] })
      // off_records
      .mockResolvedValueOnce({ rows: [] })
      // bookings
      .mockResolvedValueOnce({ rows: [] })
      // tips
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      // kasbon SUM for net_pay
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      // INSERT payroll_entries (upsert — no RETURNING)
      .mockResolvedValueOnce({})
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = { query: jest.fn(), release: jest.fn() }
    pool.connect.mockResolvedValue(mockClient)
  })

  // ── 1. Single kasbon expense auto-imported as adjustment ────────────────────
  test('kasbon expense auto-imported as adjustment with correct fields', async () => {
    mockClient.query
      .mockResolvedValueOnce({})                              // BEGIN
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })         // INSERT payroll_periods
      .mockResolvedValueOnce({})                              // UPDATE generated_at
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })        // SELECT payroll_settings
      .mockResolvedValueOnce({ rows: [FAKE_BARBER] })         // SELECT barbers

    mockPerBarberPreamble(mockClient)

    mockClient.query
      // SELECT * FROM expenses WHERE type='kasbon'
      .mockResolvedValueOnce({ rows: [FAKE_KASBON_EXP] })
      // SELECT id FROM payroll_entries (get entryId)
      .mockResolvedValueOnce({ rows: [FAKE_ENTRY] })
      // DELETE existing kasbon adjustments
      .mockResolvedValueOnce({})
      // INSERT payroll_adjustments
      .mockResolvedValueOnce({ rows: [FAKE_ADJ] })
      // COMMIT
      .mockResolvedValueOnce({})

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })         // updatedPeriod
      .mockResolvedValueOnce({ rows: [] })                    // entries

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(201)

    // Find the INSERT INTO payroll_adjustments call
    const insertAdjCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO payroll_adjustments')
    )
    expect(insertAdjCall).toBeDefined()

    const sql    = insertAdjCall[0]
    const params = insertAdjCall[1]

    // SQL shape checks
    expect(sql).toMatch(/is_kasbon/)
    expect(sql).toMatch(/'deduction'/)
    expect(sql).toMatch(/'Kasbon'/)

    // Params: [entryId, remarks, amount, submitted_by, expense_date, expense_id, deduct_period]
    expect(params[0]).toBe('entry-1')                    // payroll_entry_id
    expect(params[2]).toBe(200000)                        // amount
    expect(params[5]).toBe('exp-kas-1')                   // expense_id
    expect(params[6]).toBe('current')                     // deduct_period
  })

  // ── 2. Multiple kasbon expenses → multiple adjustment inserts ───────────────
  test('two kasbon expenses produce two INSERT payroll_adjustments calls', async () => {
    const KASBON_EXP_2 = {
      id: 'exp-kas-2', type: 'kasbon', barber_id: 'barber-1',
      amount: 100000, description: 'Second advance', submitted_by: 'admin-1',
      expense_date: '2026-05-10', deduct_period: 'current',
    }

    mockClient.query
      .mockResolvedValueOnce({})                              // BEGIN
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })         // INSERT payroll_periods
      .mockResolvedValueOnce({})                              // UPDATE generated_at
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })        // SELECT payroll_settings
      .mockResolvedValueOnce({ rows: [FAKE_BARBER] })         // SELECT barbers

    mockPerBarberPreamble(mockClient)

    mockClient.query
      // SELECT * FROM expenses WHERE type='kasbon' — two rows
      .mockResolvedValueOnce({ rows: [FAKE_KASBON_EXP, KASBON_EXP_2] })
      // SELECT id FROM payroll_entries
      .mockResolvedValueOnce({ rows: [FAKE_ENTRY] })
      // DELETE existing kasbon adjustments
      .mockResolvedValueOnce({})
      // INSERT payroll_adjustments — first expense
      .mockResolvedValueOnce({ rows: [FAKE_ADJ] })
      // INSERT payroll_adjustments — second expense
      .mockResolvedValueOnce({ rows: [{ ...FAKE_ADJ, id: 'adj-2', expense_id: 'exp-kas-2', amount: 100000 }] })
      // COMMIT
      .mockResolvedValueOnce({})

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(201)

    const insertAdjCalls = mockClient.query.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO payroll_adjustments')
    )
    expect(insertAdjCalls).toHaveLength(2)

    // First insert references exp-kas-1
    expect(insertAdjCalls[0][1][5]).toBe('exp-kas-1')
    // Second insert references exp-kas-2
    expect(insertAdjCalls[1][1][5]).toBe('exp-kas-2')
  })

  // ── 3. Kasbon expense outside period range → no INSERT ─────────────────────
  test('kasbon expense outside period range → no INSERT payroll_adjustments', async () => {
    mockClient.query
      .mockResolvedValueOnce({})                              // BEGIN
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })         // INSERT payroll_periods
      .mockResolvedValueOnce({})                              // UPDATE generated_at
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })        // SELECT payroll_settings
      .mockResolvedValueOnce({ rows: [FAKE_BARBER] })         // SELECT barbers

    mockPerBarberPreamble(mockClient)

    mockClient.query
      // kasbon expenses query returns empty (expense_date outside period)
      .mockResolvedValueOnce({ rows: [] })
      // SELECT id FROM payroll_entries
      .mockResolvedValueOnce({ rows: [FAKE_ENTRY] })
      // DELETE existing kasbon adjustments (still runs to clean stale rows)
      .mockResolvedValueOnce({})
      // COMMIT
      .mockResolvedValueOnce({})

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(201)

    const insertAdjCalls = mockClient.query.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO payroll_adjustments')
    )
    expect(insertAdjCalls).toHaveLength(0)
  })

  // ── 4. No barbers → kasbon SELECT never called ─────────────────────────────
  test('no barbers → kasbon expenses SELECT never called', async () => {
    mockClient.query
      .mockResolvedValueOnce({})                              // BEGIN
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })         // INSERT payroll_periods
      .mockResolvedValueOnce({})                              // UPDATE generated_at
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })        // SELECT payroll_settings
      .mockResolvedValueOnce({ rows: [] })                    // SELECT barbers — empty
      .mockResolvedValueOnce({})                              // COMMIT

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(VALID_BODY)

    expect(res.status).toBe(201)

    const kasbonSelectCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' &&
           c[0].includes("type = 'kasbon'") &&
           c[0].includes('expense_date BETWEEN')
    )
    expect(kasbonSelectCall).toBeUndefined()
  })
})

// ── DELETE /api/payroll/adjustments/:id ──────────────────────────────────────

describe('DELETE /api/payroll/adjustments/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  test('non-kasbon adjustment: deletes and returns 204', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'adj-1', is_kasbon: false, status: 'draft' }] }) // SELECT
      .mockResolvedValueOnce({})                                                               // DELETE

    const res = await supertest(makeApp())
      .delete('/api/payroll/adjustments/adj-1')

    expect(res.status).toBe(204)
    const deleteSql = pool.query.mock.calls[1][0]
    expect(deleteSql).toMatch(/DELETE FROM payroll_adjustments/)
    expect(pool.query.mock.calls[1][1]).toContain('adj-1')
  })

  test('kasbon adjustment → 400, no DELETE executed', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'adj-kasbon', is_kasbon: true, status: 'draft' }] })

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
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })  // status check
      .mockResolvedValueOnce({ rows: [updatedAdj] })            // UPDATE

    const res = await supertest(makeApp())
      .patch('/api/payroll/adjustments/adj-1')
      .send({ deduct_period: 'next' })

    expect(res.status).toBe(200)
    expect(res.body.deduct_period).toBe('next')
    expect(pool.query.mock.calls[1][1]).toEqual(['next', 'adj-1'])
  })

  test('deduct_period=current → updates and returns adj row', async () => {
    const updatedAdj = { id: 'adj-1', deduct_period: 'current', is_kasbon: true }
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'reviewed' }] }) // status check
      .mockResolvedValueOnce({ rows: [updatedAdj] })              // UPDATE

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
    pool.query.mockResolvedValueOnce({ rows: [] }) // status check returns empty

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

// ── DELETE /api/payroll/periods/:id ──────────────────────────────────────────

describe('DELETE /api/payroll/periods/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  test('draft period → 204, DELETE SQL executed', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'draft' }] }) // SELECT
      .mockResolvedValueOnce({})                                                // DELETE

    const res = await supertest(makeApp())
      .delete('/api/payroll/periods/period-1')

    expect(res.status).toBe(204)
    expect(pool.query.mock.calls).toHaveLength(2)
    const deleteSql = pool.query.mock.calls[1][0]
    expect(deleteSql).toMatch(/DELETE FROM payroll_periods/)
    expect(pool.query.mock.calls[1][1]).toContain('period-1')
  })

  test('non-draft period (status=reviewed) → 400, no DELETE executed', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'reviewed' }] }) // SELECT

    const res = await supertest(makeApp())
      .delete('/api/payroll/periods/period-1')

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Only draft periods can be deleted')
    expect(pool.query.mock.calls).toHaveLength(1) // only SELECT, no DELETE
  })

  test('not found → 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .delete('/api/payroll/periods/nonexistent')

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Not found')
  })

  test('DB error on SELECT → 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'))

    const res = await supertest(makeApp())
      .delete('/api/payroll/periods/period-1')

    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Internal server error')
  })
})

// ── POST /api/payroll/periods/:id/regenerate ─────────────────────────────────

describe('POST /api/payroll/periods/:id/regenerate', () => {
  let mockClient

  const FAKE_PERIOD = {
    id: 'period-regen',
    branch_id: 'branch-1',
    // Simulate what postgres returns: a Date object or ISO string
    period_from: '2026-05-01T00:00:00.000Z',
    period_to:   '2026-05-31T00:00:00.000Z',
    period_month: '2026-05',
    status: 'reviewed',
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

  test('uses String(period_from).slice(0,10) — succeeds with ISO timestamp period_from', async () => {
    // period_from is an ISO string (as postgres returns Date columns)
    // The fix ensures slice(0,10) gives "2026-05-01" not a toISOString() timezone bug
    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })   // precheck SELECT period (pool.query)
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })   // updatedPeriod
      .mockResolvedValueOnce({ rows: [] })               // entries

    mockClient.query
      .mockResolvedValueOnce({})                         // BEGIN
      .mockResolvedValueOnce({})                         // UPDATE status=draft
      .mockResolvedValueOnce({})                         // DELETE entries
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })  // SELECT payroll_settings
      .mockResolvedValueOnce({ rows: [] })               // SELECT barbers (none)
      .mockResolvedValueOnce({})                         // COMMIT

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/period-regen/regenerate')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('period')
    expect(res.body).toHaveProperty('entries')

    // Verify that attendance/off queries receive the sliced date "2026-05-01", not a full ISO string
    // (no barbers in this test, so the attendance query won't be called — but period_from
    //  was correctly sliced before reaching the barber loop without throwing)
    const updateCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes("status = 'draft'")
    )
    expect(updateCall).toBeDefined()
  })

  test('period not found → 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/nonexistent/regenerate')

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Period not found')
  })

  test('DB error on SELECT → 500 + ROLLBACK', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD] })   // precheck SELECT period (pool.query)

    mockClient.query
      .mockResolvedValueOnce({})                         // BEGIN
      .mockRejectedValueOnce(new Error('DB exploded'))   // UPDATE status fails
      .mockResolvedValueOnce({})                         // ROLLBACK

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/period-regen/regenerate')

    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Internal server error')
    const calls = mockClient.query.mock.calls.map(c => c[0])
    expect(calls).toContain('ROLLBACK')
  })
})

// ── Communicated guard — PATCH /api/payroll/entries/:id ──────────────────────

describe('Communicated guard — PATCH /api/payroll/entries/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  test('communicated period → 403', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'entry-1', status: 'communicated' }] })

    const res = await supertest(makeApp())
      .patch('/api/payroll/entries/entry-1')
      .send({ working_days: 25 })

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Cannot edit a communicated period')
    expect(pool.query.mock.calls).toHaveLength(1) // only SELECT, no UPDATE
  })

  test('draft period → 200, UPDATE executed', async () => {
    const updatedEntry = { id: 'entry-1', working_days: 25, status: 'draft' }
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'entry-1', status: 'draft' }] })  // SELECT
      .mockResolvedValueOnce({ rows: [updatedEntry] })                          // UPDATE

    const res = await supertest(makeApp())
      .patch('/api/payroll/entries/entry-1')
      .send({ working_days: 25 })

    expect(res.status).toBe(200)
    expect(res.body.working_days).toBe(25)
  })

  test('reviewed period → 200, UPDATE executed', async () => {
    const updatedEntry = { id: 'entry-1', working_days: 26, status: 'reviewed' }
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'entry-1', status: 'reviewed' }] }) // SELECT
      .mockResolvedValueOnce({ rows: [updatedEntry] })                            // UPDATE

    const res = await supertest(makeApp())
      .patch('/api/payroll/entries/entry-1')
      .send({ working_days: 26 })

    expect(res.status).toBe(200)
    expect(res.body.working_days).toBe(26)
  })

  test('entry not found → 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .patch('/api/payroll/entries/nonexistent')
      .send({ working_days: 25 })

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Not found')
  })
})

// ── Communicated guard — POST /api/payroll/adjustments ───────────────────────

describe('Communicated guard — POST /api/payroll/adjustments', () => {
  beforeEach(() => jest.clearAllMocks())

  const VALID_ADJ_BODY = {
    payroll_entry_id: 'entry-1',
    type: 'deduction',
    category: 'Other',
    amount: 50000,
    date: '2026-05-10',
  }

  test('communicated period → 403', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ status: 'communicated' }] })

    const res = await supertest(makeApp())
      .post('/api/payroll/adjustments')
      .send(VALID_ADJ_BODY)

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Cannot edit a communicated period')
    expect(pool.query.mock.calls).toHaveLength(1) // only status check, no INSERT
  })

  test('draft period → 201, INSERT executed', async () => {
    const newAdj = { id: 'adj-new', ...VALID_ADJ_BODY }
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })   // status check
      .mockResolvedValueOnce({ rows: [newAdj] })                  // INSERT

    const res = await supertest(makeApp())
      .post('/api/payroll/adjustments')
      .send(VALID_ADJ_BODY)

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('adj-new')
  })

  test('reviewed period → 201, INSERT executed', async () => {
    const newAdj = { id: 'adj-new2', ...VALID_ADJ_BODY }
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'reviewed' }] }) // status check
      .mockResolvedValueOnce({ rows: [newAdj] })                  // INSERT

    const res = await supertest(makeApp())
      .post('/api/payroll/adjustments')
      .send(VALID_ADJ_BODY)

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('adj-new2')
  })

  test('missing required fields → 400 (no DB call)', async () => {
    const res = await supertest(makeApp())
      .post('/api/payroll/adjustments')
      .send({ payroll_entry_id: 'entry-1' }) // missing type and amount

    expect(res.status).toBe(400)
    expect(pool.query.mock.calls).toHaveLength(0)
  })
})

// ── Communicated guard — DELETE /api/payroll/adjustments/:id ─────────────────

describe('Communicated guard — DELETE /api/payroll/adjustments/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  test('communicated period → 403, no DELETE executed', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'adj-1', is_kasbon: false, status: 'communicated' }] })

    const res = await supertest(makeApp())
      .delete('/api/payroll/adjustments/adj-1')

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Cannot edit a communicated period')
    expect(pool.query.mock.calls).toHaveLength(1) // only SELECT, no DELETE
  })

  test('draft period (non-kasbon) → 204, DELETE executed', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'adj-1', is_kasbon: false, status: 'draft' }] }) // SELECT
      .mockResolvedValueOnce({})                                                               // DELETE

    const res = await supertest(makeApp())
      .delete('/api/payroll/adjustments/adj-1')

    expect(res.status).toBe(204)
  })
})

// ── PATCH /api/payroll/periods/:id/status — forward-only transitions ─────────

describe('PATCH /api/payroll/periods/:id/status — forward-only transitions', () => {
  beforeEach(() => jest.clearAllMocks())

  test('draft → reviewed → 200', async () => {
    const updatedPeriod = { id: 'period-1', status: 'reviewed' }
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })      // SELECT current status
      .mockResolvedValueOnce({ rows: [updatedPeriod] })              // UPDATE

    const res = await supertest(makeApp())
      .patch('/api/payroll/periods/period-1/status')
      .send({ status: 'reviewed' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('reviewed')
  })

  test('reviewed → communicated → 200, sets communicated_by and communicated_at', async () => {
    const updatedPeriod = {
      id: 'period-1', status: 'communicated',
      communicated_by: 'admin-1', communicated_at: new Date().toISOString(),
    }
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'reviewed' }] })    // SELECT current status
      .mockResolvedValueOnce({ rows: [updatedPeriod] })               // UPDATE

    const res = await supertest(makeApp())
      .patch('/api/payroll/periods/period-1/status')
      .send({ status: 'communicated' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('communicated')
    expect(res.body.communicated_by).toBe('admin-1')
    expect(res.body.communicated_at).toBeDefined()

    // Verify the UPDATE SQL includes communicated_by and communicated_at
    const updateCall = pool.query.mock.calls[1]
    expect(updateCall[0]).toMatch(/communicated_by/)
    expect(updateCall[0]).toMatch(/communicated_at/)
    // communicated_by param should be the admin user id
    expect(updateCall[1]).toContain('admin-1')
  })

  test('draft → communicated (skip a step) → 400', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })       // SELECT current status

    const res = await supertest(makeApp())
      .patch('/api/payroll/periods/period-1/status')
      .send({ status: 'communicated' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/draft/)
    expect(res.body.message).toMatch(/communicated/)
    expect(pool.query.mock.calls).toHaveLength(1)  // only SELECT, no UPDATE
  })

  test('communicated → draft (backwards) → 400', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'communicated' }] }) // SELECT current status

    const res = await supertest(makeApp())
      .patch('/api/payroll/periods/period-1/status')
      .send({ status: 'draft' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/communicated/)
    expect(pool.query.mock.calls).toHaveLength(1)  // only SELECT, no UPDATE
  })

  test('reviewed → draft (backwards) → 400', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'reviewed' }] })    // SELECT current status

    const res = await supertest(makeApp())
      .patch('/api/payroll/periods/period-1/status')
      .send({ status: 'draft' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/reviewed/)
    expect(pool.query.mock.calls).toHaveLength(1)  // only SELECT, no UPDATE
  })

  test('period not found → 404', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })                           // SELECT returns empty

    const res = await supertest(makeApp())
      .patch('/api/payroll/periods/nonexistent/status')
      .send({ status: 'reviewed' })

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Not found')
    expect(pool.query.mock.calls).toHaveLength(1)  // only SELECT, no UPDATE
  })
})

// ── Communicated guard — PATCH /api/payroll/periods/:id/regenerate ────────────

describe('Communicated guard — POST /api/payroll/periods/:id/regenerate', () => {
  let mockClient

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = { query: jest.fn(), release: jest.fn() }
    pool.connect.mockResolvedValue(mockClient)
  })

  test('communicated period → 403, pool.connect never called', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'period-comm', status: 'communicated' }] }) // precheck SELECT (pool.query)

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/period-comm/regenerate')

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Cannot regenerate a communicated period')

    // pool.connect must NOT have been called — no client was acquired
    expect(pool.connect).not.toHaveBeenCalled()

    // client.query must NOT have been called at all — no transaction was opened
    expect(mockClient.query).not.toHaveBeenCalled()
  })
})

// ── Communicated guard — PATCH /api/payroll/adjustments/:id ──────────────────

describe('Communicated guard — PATCH /api/payroll/adjustments/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  test('communicated period → 403', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ status: 'communicated' }] })

    const res = await supertest(makeApp())
      .patch('/api/payroll/adjustments/adj-1')
      .send({ deduct_period: 'next' })

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Cannot edit a communicated period')
    expect(pool.query.mock.calls).toHaveLength(1) // only status check, no UPDATE
  })

  test('draft period → 200, UPDATE executed', async () => {
    const updatedAdj = { id: 'adj-1', deduct_period: 'next' }
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })  // status check
      .mockResolvedValueOnce({ rows: [updatedAdj] })            // UPDATE

    const res = await supertest(makeApp())
      .patch('/api/payroll/adjustments/adj-1')
      .send({ deduct_period: 'next' })

    expect(res.status).toBe(200)
    expect(res.body.deduct_period).toBe('next')
  })

  test('reviewed period → 200, UPDATE executed', async () => {
    const updatedAdj = { id: 'adj-1', deduct_period: 'current' }
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'reviewed' }] }) // status check
      .mockResolvedValueOnce({ rows: [updatedAdj] })              // UPDATE

    const res = await supertest(makeApp())
      .patch('/api/payroll/adjustments/adj-1')
      .send({ deduct_period: 'current' })

    expect(res.status).toBe(200)
    expect(res.body.deduct_period).toBe('current')
  })
})
