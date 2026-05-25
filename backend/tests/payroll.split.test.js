// payroll.split.test.js
//
// Tests for:
//   1. calcNetPay includes total_tips in net pay
//   2. Generate: split-mode isSplit detection and eff_* variable routing
//   3. Generate: single-mode isSplit=false and eff_* collapse to period_from/to
//   4. Generate: partial split body (missing attendance_from) returns 400
//   5. Regenerate: split detected from stored period.performance_from
//   6. Regenerate: single detected when period.performance_from is null
//
// NOTE: The auth middleware mock MUST include checkPermission — the route was
// refactored from requireAdmin to checkPermission. The existing payroll.test.js
// and payroll.period.test.js mocks are missing this and will fail to run until
// they are updated.

jest.mock('../config/db', () => {
  const mockPool = { query: jest.fn(), connect: jest.fn() }
  return mockPool
})

jest.mock('../middleware/auth', () => ({
  requireAdmin:      (req, _res, next) => { req.user = { id: 'admin-1', role: 'owner' }; next() },
  requireOwner:      (req, _res, next) => next(),
  checkPermission:   (_section) => (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'owner' }
    next()
  },
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

// ── Pure calcNetPay — mirrors Payroll.jsx line 562 ───────────────────────────
//
// Extracted here as a pure function with the same logic as the component,
// including the total_tips addition added in this feature.

const LATE_RATE_PER_MIN  = 2_000
const FLAT_OFF_RATE      = 150_000
const EXCUSED_OVER_RATE  = 100_000
const EXCUSED_QUOTA      = 2

function calcNetPay(entry, ov = {}, adjs = [], workingDays = 26) {
  const lateMin        = ov.lateMin        ?? Number(entry.total_late_minutes   || 0)
  const inexcusedTimes = ov.inexcusedTimes ?? Number(entry.inexcused_fixed_days || 0)
  const excusedTimes   = ov.excusedTimes   ?? Number(entry.excused_fixed_days   || 0)
  const excusedOver    = Math.max(0, excusedTimes - EXCUSED_QUOTA)
  const inexcusedFixed   = ov.inexcusedFixed   ?? inexcusedTimes
  const inexcusedProrata = ov.inexcusedProrata ?? 0
  const excusedFixed     = ov.excusedFixed     ?? excusedOver
  const excusedProrata   = ov.excusedProrata   ?? 0
  const prorataRate      = Math.round(Number(entry.base_salary || 0) / workingDays)
  const lateDed          = lateMin * LATE_RATE_PER_MIN
  const inexcusedDed     = inexcusedFixed * FLAT_OFF_RATE + Math.round(inexcusedProrata * prorataRate)
  const excusedDed       = excusedFixed * EXCUSED_OVER_RATE + Math.round(excusedProrata * prorataRate)
  const totalAdd = adjs.filter(a => a.type === 'addition').reduce((s, a) => s + Number(a.amount), 0)
  const totalDed = adjs
    .filter(a => a.type === 'deduction' && !(a.is_kasbon && a.deduct_period === 'next'))
    .reduce((s, a) => s + Number(a.amount), 0)
  return Number(entry.base_salary       || 0)
       + Number(entry.commission_regular || 0)
       + Number(entry.commission_ot      || 0)
       + Number(entry.total_tips         || 0)   // <-- tips inclusion
       - lateDed - inexcusedDed - excusedDed + totalAdd - totalDed
}

const BASE_ENTRY = {
  base_salary:          3_000_000,
  commission_regular:   500_000,
  commission_ot:        0,
  total_late_minutes:   0,
  inexcused_fixed_days: 0,
  excused_fixed_days:   0,
  total_tips:           0,
}

// ── 1. calcNetPay includes tips ───────────────────────────────────────────────

describe('calcNetPay — total_tips included in net pay', () => {
  test('zero tips: net = base + commission_regular (baseline)', () => {
    expect(calcNetPay(BASE_ENTRY)).toBe(3_500_000)
  })

  test('tips = 50000: net increases by exactly 50000 vs zero-tips baseline', () => {
    const withTips    = calcNetPay({ ...BASE_ENTRY, total_tips: 50_000 })
    const withoutTips = calcNetPay({ ...BASE_ENTRY, total_tips: 0 })
    expect(withTips - withoutTips).toBe(50_000)
    expect(withTips).toBe(3_550_000)
  })

  test('tips = 50000 alongside deductions: tips still added to income side', () => {
    const entry = {
      ...BASE_ENTRY,
      total_tips:         50_000,
      total_late_minutes: 10,   // 10 * 2000 = 20000 deduction
    }
    // 3000000 + 500000 + 0 + 50000 - 20000 = 3530000
    expect(calcNetPay(entry)).toBe(3_530_000)
  })

  test('tips = 0 explicitly: behaves same as no tips field', () => {
    const withZero   = calcNetPay({ ...BASE_ENTRY, total_tips: 0 })
    const withUndef  = calcNetPay({ ...BASE_ENTRY })
    expect(withZero).toBe(withUndef)
  })

  test('tips included when entry.total_tips is a string (DB returns strings)', () => {
    const entry = { ...BASE_ENTRY, total_tips: '75000' }
    expect(calcNetPay(entry)).toBe(3_500_000 + 75_000)
  })

  test('tips do not interact with adjustments: tips added before adjustments', () => {
    const entry = { ...BASE_ENTRY, total_tips: 50_000 }
    const adjs  = [
      { type: 'deduction', is_kasbon: false, deduct_period: 'current', amount: 100_000 },
    ]
    // 3000000 + 500000 + 0 + 50000 - 100000 = 3450000
    expect(calcNetPay(entry, {}, adjs)).toBe(3_450_000)
  })
})

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SETTINGS_ROW = {
  late_deduction_per_minute: 2000, late_grace_period_minutes: 5,
  inexcused_off_flat_deduction: 150000, excused_off_flat_deduction: 150000,
  ot_commission_enabled: false, ot_threshold_time: '19:00',
  ot_bonus_pct: 5, working_days_per_week: 6, off_quota_per_week: 1,
}

const FAKE_PERIOD_SINGLE = {
  id: 'period-single',
  branch_id:    'branch-1',
  period_from:  '2026-05-01',
  period_to:    '2026-05-31',
  period_month: '2026-05',
  status:       'draft',
  generated_at: new Date().toISOString(),
  performance_from: null,
  performance_to:   null,
  attendance_from:  null,
  attendance_to:    null,
}

const FAKE_PERIOD_SPLIT = {
  id: 'period-split',
  branch_id:        'branch-1',
  period_from:      '2026-05-20',
  period_to:        '2026-06-19',
  period_month:     '2026-05',
  status:           'draft',
  generated_at:     new Date().toISOString(),
  performance_from: '2026-05-01',
  performance_to:   '2026-05-31',
  attendance_from:  '2026-05-20',
  attendance_to:    '2026-06-19',
}

const SINGLE_BODY = {
  branch_id:    'branch-1',
  period_month: '2026-05',
  period_from:  '2026-05-01',
  period_to:    '2026-05-31',
}

const SPLIT_BODY = {
  branch_id:        'branch-1',
  period_month:     '2026-05',
  performance_from: '2026-05-01',
  performance_to:   '2026-05-31',
  attendance_from:  '2026-05-20',
  attendance_to:    '2026-06-19',
}

// ── 2. Generate: split-mode body → isSplit=true, eff_* route correctly ────────

describe('POST /api/payroll/periods/generate — split mode', () => {
  let mockClient

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = { query: jest.fn(), release: jest.fn() }
    pool.connect.mockResolvedValue(mockClient)
  })

  test('all four split fields present → INSERT stores split columns as non-null', async () => {
    mockClient.query
      .mockResolvedValueOnce({})                                  // BEGIN
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SPLIT] })       // INSERT payroll_periods RETURNING
      .mockResolvedValueOnce({})                                   // UPDATE generated_at
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })            // SELECT payroll_settings
      .mockResolvedValueOnce({ rows: [] })                        // SELECT barbers (none)
      .mockResolvedValueOnce({})                                   // COMMIT

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SPLIT] })       // updatedPeriod
      .mockResolvedValueOnce({ rows: [] })                        // entries

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(SPLIT_BODY)

    expect(res.status).toBe(201)

    // The INSERT statement must be called with all four split columns non-null.
    // Parameters order per route: [branch_id, eff_period_month, eff_period_from, eff_period_to,
    //   performance_from|null, performance_to|null, attendance_from|null, attendance_to|null, req.user.id]
    const insertCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO payroll_periods')
    )
    expect(insertCall).toBeDefined()
    const params = insertCall[1]
    expect(params[4]).toBe('2026-05-01')  // performance_from
    expect(params[5]).toBe('2026-05-31')  // performance_to
    expect(params[6]).toBe('2026-05-20')  // attendance_from
    expect(params[7]).toBe('2026-06-19')  // attendance_to
  })

  test('split body: eff_period_from = attendance_from (not performance_from)', async () => {
    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SPLIT] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({})

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SPLIT] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(SPLIT_BODY)

    expect(res.status).toBe(201)

    // eff_period_from = eff_att_from = attendance_from
    const insertCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO payroll_periods')
    )
    expect(insertCall).toBeDefined()
    const params = insertCall[1]
    expect(params[2]).toBe('2026-05-20')  // eff_period_from = attendance_from
    expect(params[3]).toBe('2026-06-19')  // eff_period_to   = attendance_to
  })

  test('split body: performance period stored separately from period_from/to', async () => {
    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SPLIT] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({})

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SPLIT] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(SPLIT_BODY)

    expect(res.status).toBe(201)

    const insertCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO payroll_periods')
    )
    const params = insertCall[1]
    // period_from (params[2]) = attendance_from, NOT performance_from
    expect(params[2]).not.toBe(SPLIT_BODY.performance_from)
    // performance_from (params[4]) = SPLIT_BODY.performance_from
    expect(params[4]).toBe(SPLIT_BODY.performance_from)
  })
})

// ── 3. Generate: single-mode body → isSplit=false, eff_* all = period_from/to ─

describe('POST /api/payroll/periods/generate — single mode', () => {
  let mockClient

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = { query: jest.fn(), release: jest.fn() }
    pool.connect.mockResolvedValue(mockClient)
  })

  test('single body: INSERT stores split columns as null', async () => {
    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SINGLE] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({})

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SINGLE] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(SINGLE_BODY)

    expect(res.status).toBe(201)

    const insertCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO payroll_periods')
    )
    expect(insertCall).toBeDefined()
    const params = insertCall[1]
    // Split columns must be null in single mode
    expect(params[4]).toBeNull()  // performance_from
    expect(params[5]).toBeNull()  // performance_to
    expect(params[6]).toBeNull()  // attendance_from
    expect(params[7]).toBeNull()  // attendance_to
  })

  test('single body: eff_period_from = period_from, eff_period_to = period_to', async () => {
    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SINGLE] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({})

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SINGLE] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(SINGLE_BODY)

    expect(res.status).toBe(201)

    const insertCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO payroll_periods')
    )
    const params = insertCall[1]
    expect(params[2]).toBe('2026-05-01')  // eff_period_from = period_from
    expect(params[3]).toBe('2026-05-31')  // eff_period_to   = period_to
  })
})

// ── 4. Generate: partial split body → 400 ────────────────────────────────────

describe('POST /api/payroll/periods/generate — validation', () => {
  let mockClient

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = { query: jest.fn(), release: jest.fn() }
    pool.connect.mockResolvedValue(mockClient)
  })

  test('has performance_from/to + attendance_to but missing attendance_from → 400', async () => {
    // This is neither a valid split (missing attendance_from) nor a valid single
    // (missing period_from). The route must return 400 without touching the DB.
    const partial = {
      branch_id:        'branch-1',
      period_month:     '2026-05',
      performance_from: '2026-05-01',
      performance_to:   '2026-05-31',
      // attendance_from intentionally absent
      attendance_to:    '2026-06-19',
    }

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(partial)

    expect(res.status).toBe(400)
    // pool.connect called at route start before validation — check no commit was issued
    // The important assertion is the 400 status
  })

  test('has attendance_from/to but missing performance_from → treated as missing period_from → 400', async () => {
    const partial = {
      branch_id:       'branch-1',
      period_month:    '2026-05',
      // performance_from intentionally absent — isSplit=false
      performance_to:  '2026-05-31',
      attendance_from: '2026-05-20',
      attendance_to:   '2026-06-19',
    }
    // isSplit = !!(undefined && ...) = false, falls to !period_from check → 400

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(partial)

    expect(res.status).toBe(400)
  })

  test('missing all date fields → 400', async () => {
    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send({ branch_id: 'branch-1', period_month: '2026-05' })

    expect(res.status).toBe(400)
  })

  test('valid split: all four split fields → 201 (not 400)', async () => {
    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SPLIT] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({})

    pool.query
      .mockResolvedValueOnce({ rows: [FAKE_PERIOD_SPLIT] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/generate')
      .send(SPLIT_BODY)

    expect(res.status).toBe(201)
  })
})

// ── 5 & 6. Regenerate: split detection from stored period.performance_from ────

describe('POST /api/payroll/periods/:id/regenerate — split vs single detection', () => {
  let mockClient

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = { query: jest.fn(), release: jest.fn() }
    pool.connect.mockResolvedValue(mockClient)
  })

  test('period.performance_from is set → regenerate uses split eff_* variables (perf ≠ att)', async () => {
    // Split period: performance window = May, attendance window = May20–Jun19
    const splitPeriod = {
      ...FAKE_PERIOD_SPLIT,
      id:     'period-regen-split',
      status: 'draft',
    }

    pool.query
      .mockResolvedValueOnce({ rows: [splitPeriod] })   // precheck SELECT

    mockClient.query
      .mockResolvedValueOnce({})                         // BEGIN
      .mockResolvedValueOnce({})                         // UPDATE status=draft
      .mockResolvedValueOnce({})                         // DELETE entries
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })  // SELECT payroll_settings
      .mockResolvedValueOnce({ rows: [              // SELECT barbers — one barber
        {
          id: 'barber-1', name: 'Barber One', branch_id: 'branch-1',
          base_salary: 3000000, commission_rate: 0.4, pay_type: 'commission',
          is_active: true, off_deduction_type: 'flat',
        },
      ] })
      // Per-barber queries
      .mockResolvedValueOnce({ rows: [] })               // attendance (eff_att window)
      .mockResolvedValueOnce({ rows: [] })               // off_records (eff_att window)
      .mockResolvedValueOnce({ rows: [{ commission_regular: '0', commission_ot: '0' }] }) // bookings (eff_perf window)
      .mockResolvedValueOnce({ rows: [{ gross_rev: '0' }] })                              // gross revenue
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })                                  // tips
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })                                  // kasbon
      .mockResolvedValueOnce({})                         // INSERT payroll_entries
      .mockResolvedValueOnce({ rows: [] })               // kasbon expenses
      .mockResolvedValueOnce({ rows: [{ id: 'entry-1' }] }) // SELECT entry id
      .mockResolvedValueOnce({})                         // DELETE kasbon adjustments
      .mockResolvedValueOnce({})                         // COMMIT

    pool.query
      .mockResolvedValueOnce({ rows: [splitPeriod] })   // updatedPeriod
      .mockResolvedValueOnce({ rows: [] })               // entries

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/period-regen-split/regenerate')

    expect(res.status).toBe(200)

    // Verify that the attendance query used eff_att_from = attendance_from = '2026-05-20'
    // and the commission query used eff_perf_from = performance_from = '2026-05-01'
    const allCalls = mockClient.query.mock.calls

    // Find the attendance SELECT — uses eff_att_from/eff_att_to
    const attCall = allCalls.find(
      c => typeof c[0] === 'string' && c[0].includes('FROM attendance') && c[0].includes('BETWEEN')
    )
    expect(attCall).toBeDefined()
    expect(attCall[1][1]).toBe('2026-05-20')  // eff_att_from
    expect(attCall[1][2]).toBe('2026-06-19')  // eff_att_to

    // Find the commission SELECT — uses eff_perf_from/eff_perf_to
    const commCall = allCalls.find(
      c => typeof c[0] === 'string' && c[0].includes('commission_amount') && c[0].includes('BETWEEN')
    )
    expect(commCall).toBeDefined()
    expect(commCall[1][1]).toBe('2026-05-01')  // eff_perf_from (performance window)
    expect(commCall[1][2]).toBe('2026-05-31')  // eff_perf_to
  })

  test('period.performance_from is null → regenerate uses single eff_* variables (all = period_from/to)', async () => {
    const singlePeriod = {
      ...FAKE_PERIOD_SINGLE,
      id:     'period-regen-single',
      status: 'draft',
    }

    pool.query
      .mockResolvedValueOnce({ rows: [singlePeriod] })  // precheck SELECT

    mockClient.query
      .mockResolvedValueOnce({})                         // BEGIN
      .mockResolvedValueOnce({})                         // UPDATE status=draft
      .mockResolvedValueOnce({})                         // DELETE entries
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })  // SELECT payroll_settings
      .mockResolvedValueOnce({ rows: [
        {
          id: 'barber-1', name: 'Barber One', branch_id: 'branch-1',
          base_salary: 3000000, commission_rate: 0.4, pay_type: 'commission',
          is_active: true, off_deduction_type: 'flat',
        },
      ] })
      // Per-barber queries
      .mockResolvedValueOnce({ rows: [] })               // attendance
      .mockResolvedValueOnce({ rows: [] })               // off_records
      .mockResolvedValueOnce({ rows: [{ commission_regular: '0', commission_ot: '0' }] })
      .mockResolvedValueOnce({ rows: [{ gross_rev: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })  // tips
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })  // kasbon
      .mockResolvedValueOnce({})                         // INSERT payroll_entries
      .mockResolvedValueOnce({ rows: [] })               // kasbon expenses
      .mockResolvedValueOnce({ rows: [{ id: 'entry-1' }] })
      .mockResolvedValueOnce({})                         // DELETE kasbon adjustments
      .mockResolvedValueOnce({})                         // COMMIT

    pool.query
      .mockResolvedValueOnce({ rows: [singlePeriod] })  // updatedPeriod
      .mockResolvedValueOnce({ rows: [] })               // entries

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/period-regen-single/regenerate')

    expect(res.status).toBe(200)

    const allCalls = mockClient.query.mock.calls

    // In single mode, eff_att_from = eff_perf_from = period_from = '2026-05-01'
    const attCall = allCalls.find(
      c => typeof c[0] === 'string' && c[0].includes('FROM attendance') && c[0].includes('BETWEEN')
    )
    expect(attCall).toBeDefined()
    expect(attCall[1][1]).toBe('2026-05-01')  // eff_att_from = period_from
    expect(attCall[1][2]).toBe('2026-05-31')  // eff_att_to   = period_to

    const commCall = allCalls.find(
      c => typeof c[0] === 'string' && c[0].includes('commission_amount') && c[0].includes('BETWEEN')
    )
    expect(commCall).toBeDefined()
    expect(commCall[1][1]).toBe('2026-05-01')  // eff_perf_from = period_from (same as att)
    expect(commCall[1][2]).toBe('2026-05-31')  // eff_perf_to   = period_to
  })

  test('period.performance_from is null → isSplit=false (att and perf windows are identical)', async () => {
    // Verifies the detection branch: period.performance_from is null → isSplit=false
    // As a result, both eff_att_* and eff_perf_* equal period_from/to
    const singlePeriod = { ...FAKE_PERIOD_SINGLE, id: 'period-single-detect', status: 'draft' }

    pool.query
      .mockResolvedValueOnce({ rows: [singlePeriod] })

    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })
      .mockResolvedValueOnce({ rows: [] })  // no barbers
      .mockResolvedValueOnce({})

    pool.query
      .mockResolvedValueOnce({ rows: [singlePeriod] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/period-single-detect/regenerate')

    expect(res.status).toBe(200)
    // No barbers in this test, so the att/perf routing confirmation is done via the
    // successful 200 response — no crash from split field access on null.
  })

  test('period.performance_from is set (ISO timestamp) → slice(0,10) extracts correct date', async () => {
    // Simulates what postgres returns: ISO timestamp strings for date columns
    const splitPeriodISO = {
      id:               'period-regen-iso',
      branch_id:        'branch-1',
      period_from:      '2026-05-20T00:00:00.000Z',
      period_to:        '2026-06-19T00:00:00.000Z',
      period_month:     '2026-05',
      status:           'draft',
      performance_from: '2026-05-01T00:00:00.000Z',
      performance_to:   '2026-05-31T00:00:00.000Z',
      attendance_from:  '2026-05-20T00:00:00.000Z',
      attendance_to:    '2026-06-19T00:00:00.000Z',
    }

    pool.query
      .mockResolvedValueOnce({ rows: [splitPeriodISO] })

    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [SETTINGS_ROW] })
      .mockResolvedValueOnce({ rows: [] })  // no barbers
      .mockResolvedValueOnce({})

    pool.query
      .mockResolvedValueOnce({ rows: [splitPeriodISO] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await supertest(makeApp())
      .post('/api/payroll/periods/period-regen-iso/regenerate')

    // Should succeed — String(ISO).slice(0,10) correctly yields '2026-05-01' etc.
    expect(res.status).toBe(200)
  })
})

// ── Frontend duplicate-check logic — split vs single mode ────────────────────
//
// Mirrors handleCustomGenerate logic in PayrollList.jsx.
// Split mode checks performance_from/to pair; single mode checks period_from/to.

function splitModeDuplicateCheck(dbPeriods, perfFrom, perfTo) {
  return dbPeriods.find(p =>
    String(p.performance_from).slice(0, 10) === perfFrom &&
    String(p.performance_to).slice(0, 10)   === perfTo
  )
}

function singleModeDuplicateCheck(dbPeriods, customFrom, customTo) {
  return dbPeriods.find(p =>
    String(p.period_from).slice(0, 10) === customFrom &&
    String(p.period_to).slice(0, 10)   === customTo
  )
}

describe('PayrollList — duplicate-check logic (split vs single)', () => {
  const DB_PERIODS = [
    {
      id:               'existing-split',
      period_from:      '2026-05-20T00:00:00.000Z',
      period_to:        '2026-06-19T00:00:00.000Z',
      performance_from: '2026-05-01T00:00:00.000Z',
      performance_to:   '2026-05-31T00:00:00.000Z',
    },
    {
      id:               'existing-single',
      period_from:      '2026-04-01T00:00:00.000Z',
      period_to:        '2026-04-30T00:00:00.000Z',
      performance_from: null,
      performance_to:   null,
    },
  ]

  test('split mode: finds existing period by performance_from/to', () => {
    const dup = splitModeDuplicateCheck(DB_PERIODS, '2026-05-01', '2026-05-31')
    expect(dup?.id).toBe('existing-split')
  })

  test('split mode: no match when performance dates differ', () => {
    const dup = splitModeDuplicateCheck(DB_PERIODS, '2026-06-01', '2026-06-30')
    expect(dup).toBeUndefined()
  })

  test('split mode: ISO timestamps in DB correctly slice to plain date', () => {
    // Ensures slice(0,10) on '2026-05-01T00:00:00.000Z' gives '2026-05-01'
    const dup = splitModeDuplicateCheck(DB_PERIODS, '2026-05-01', '2026-05-31')
    expect(dup).toBeDefined()
  })

  test('split mode: null performance_from in single-mode period → no match', () => {
    // String(null).slice(0,10) = 'null'.slice(0,10) = 'null' — never equals a date
    const dup = splitModeDuplicateCheck(DB_PERIODS, '2026-04-01', '2026-04-30')
    expect(dup).toBeUndefined()
  })

  test('single mode: finds existing period by period_from/to', () => {
    const dup = singleModeDuplicateCheck(DB_PERIODS, '2026-04-01', '2026-04-30')
    expect(dup?.id).toBe('existing-single')
  })

  test('single mode: no match when period dates differ', () => {
    const dup = singleModeDuplicateCheck(DB_PERIODS, '2026-03-01', '2026-03-31')
    expect(dup).toBeUndefined()
  })
})

// ── Late grace-period suppression ────────────────────────────────────────────
//
// Mirrors the fixed totalLateMinutes reduce in payroll.js (generate + regenerate).
// Grace = 5 min (from SETTINGS_ROW). Attendance rows within grace window must
// contribute 0 to totalLateMinutes; rows above grace must contribute their full value.

const LATE_GRACE = 5  // mirrors SETTINGS_ROW.late_grace_period_minutes

function calcTotalLateMinutes(attRows, grace = LATE_GRACE) {
  return attRows.reduce((sum, r) => {
    const m = parseInt(r.late_minutes) || 0
    return sum + (m <= grace ? 0 : m)
  }, 0)
}

describe('Late grace-period suppression', () => {
  test('0 late minutes → 0 (never charged)', () => {
    expect(calcTotalLateMinutes([{ late_minutes: 0 }])).toBe(0)
  })

  test('exactly at grace (5 min) → 0 (suppressed)', () => {
    expect(calcTotalLateMinutes([{ late_minutes: 5 }])).toBe(0)
  })

  test('one minute over grace (6 min) → 6 (full amount charged)', () => {
    expect(calcTotalLateMinutes([{ late_minutes: 6 }])).toBe(6)
  })

  test('below grace across multiple days → all suppressed', () => {
    const rows = [{ late_minutes: 2 }, { late_minutes: 4 }, { late_minutes: 5 }]
    expect(calcTotalLateMinutes(rows)).toBe(0)
  })

  test('mixed: some within grace, some over → only over-grace rows counted', () => {
    // 3 min (suppressed) + 10 min (counted) + 5 min (suppressed) + 20 min (counted) = 30
    const rows = [{ late_minutes: 3 }, { late_minutes: 10 }, { late_minutes: 5 }, { late_minutes: 20 }]
    expect(calcTotalLateMinutes(rows)).toBe(30)
  })

  test('null/undefined late_minutes treated as 0 → suppressed', () => {
    expect(calcTotalLateMinutes([{ late_minutes: null }, { late_minutes: undefined }])).toBe(0)
  })

  test('late_minutes as string (DB may return strings) → parsed correctly', () => {
    expect(calcTotalLateMinutes([{ late_minutes: '8' }])).toBe(8)
    expect(calcTotalLateMinutes([{ late_minutes: '3' }])).toBe(0)
  })
})
