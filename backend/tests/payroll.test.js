// payroll.test.js
//
// Unit tests for:
//   1. calcNetPay logic (extracted from Payroll.jsx — pure math, no React needed)
//   2. GET /payroll/periods/:id/entries — present_days subquery included in response

// ── Mock DB before any require ────────────────────────────────────────────────

jest.mock('../config/db', () => ({ query: jest.fn() }))

const pool = require('../config/db')

// ── calcNetPay — pure logic extracted from Payroll.jsx ───────────────────────
//
// The component calcNetPay closes over `overrides`, `adjustments`, `workingDays`.
// Here we replicate it as a pure function with explicit parameters so we can
// test every branch without spinning up React.

const LATE_RATE_PER_MIN = 2_000
const FLAT_OFF_RATE     = 150_000
const EXCUSED_OVER_RATE = 100_000
const EXCUSED_QUOTA     = 2

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
  const inexcusedDed     = inexcusedFixed * FLAT_OFF_RATE     + Math.round(inexcusedProrata * prorataRate)
  const excusedDed       = excusedFixed   * EXCUSED_OVER_RATE + Math.round(excusedProrata   * prorataRate)
  const totalAdd = adjs.filter(a => a.type === 'addition').reduce((s, a) => s + Number(a.amount), 0)
  const totalDed = adjs.filter(a => a.type === 'deduction' && !(a.is_kasbon && a.deduct_period === 'next')).reduce((s, a) => s + Number(a.amount), 0)
  return Number(entry.base_salary || 0) + Number(entry.commission_regular || 0) + Number(entry.commission_ot || 0)
       - lateDed - inexcusedDed - excusedDed + totalAdd - totalDed
}

// Base entry fixture — clean slate
const BASE = {
  base_salary:          3_000_000,
  commission_regular:   500_000,
  commission_ot:        0,
  total_late_minutes:   0,
  inexcused_fixed_days: 0,
  excused_fixed_days:   0,
}

describe('calcNetPay — deduction model', () => {
  test('zero deductions: net = base + commission', () => {
    expect(calcNetPay(BASE)).toBe(3_500_000)
  })

  test('late deduction: lateMin * 2000', () => {
    const entry = { ...BASE, total_late_minutes: 10 }
    // 10 * 2000 = 20000 deducted
    expect(calcNetPay(entry)).toBe(3_500_000 - 20_000)
  })

  test('late deduction override via ov.lateMin', () => {
    const entry = { ...BASE, total_late_minutes: 10 }
    // override to 5 min
    expect(calcNetPay(entry, { lateMin: 5 })).toBe(3_500_000 - 10_000)
  })

  test('inexcused off flat only: inexcusedFixed * 150000', () => {
    const entry = { ...BASE, inexcused_fixed_days: 2 }
    expect(calcNetPay(entry)).toBe(3_500_000 - 300_000)
  })

  test('inexcused off prorata only: round(inexcusedProrata * round(baseSalary/workingDays))', () => {
    // prorataRate = round(3000000 / 26) = round(115384.6) = 115385
    // inexcusedProrata=1, inexcusedFixed defaults to inexcusedTimes=0
    const prorataRate = Math.round(3_000_000 / 26)
    const expected = 3_500_000 - Math.round(1 * prorataRate)
    expect(calcNetPay(BASE, { inexcusedProrata: 1, inexcusedFixed: 0 })).toBe(expected)
  })

  test('inexcused off mixed flat+prorata', () => {
    const prorataRate = Math.round(3_000_000 / 26)
    // 1 flat + 1 prorata
    const inexcusedDed = 1 * FLAT_OFF_RATE + Math.round(1 * prorataRate)
    expect(calcNetPay(BASE, { inexcusedFixed: 1, inexcusedProrata: 1, inexcusedTimes: 2 }))
      .toBe(3_500_000 - inexcusedDed)
  })

  test('excused within quota (≤2): zero deduction', () => {
    const entry = { ...BASE, excused_fixed_days: 2 }
    // excusedOver = max(0, 2-2) = 0 → excusedFixed defaults to 0 → zero ded
    expect(calcNetPay(entry)).toBe(3_500_000)
  })

  test('excused over quota: (excusedTimes - 2) * 100000 flat', () => {
    const entry = { ...BASE, excused_fixed_days: 4 }
    // excusedOver=2, excusedFixed defaults to 2
    expect(calcNetPay(entry)).toBe(3_500_000 - 200_000)
  })

  test('excused prorata split: excusedFixed flat + excusedProrata prorata', () => {
    const prorataRate = Math.round(3_000_000 / 26)
    // excused 3 total, 1 flat + 1 prorata (admin splits manually)
    const excusedDed = 1 * EXCUSED_OVER_RATE + Math.round(1 * prorataRate)
    expect(calcNetPay(BASE, { excusedTimes: 3, excusedFixed: 1, excusedProrata: 1 }))
      .toBe(3_500_000 - excusedDed)
  })

  test('OT commission adds to net', () => {
    const entry = { ...BASE, commission_ot: 200_000 }
    expect(calcNetPay(entry)).toBe(3_700_000)
  })

  test('kasbon deferred (deduct_period=next) excluded from net', () => {
    const adjs = [
      { type: 'deduction', is_kasbon: true,  deduct_period: 'next',    amount: 500_000 },
      { type: 'deduction', is_kasbon: true,  deduct_period: 'current', amount: 200_000 },
    ]
    // only 200k deducted — deferred 500k excluded
    expect(calcNetPay(BASE, {}, adjs)).toBe(3_500_000 - 200_000)
  })

  test('addition adjustments add to net', () => {
    const adjs = [{ type: 'addition', is_kasbon: false, deduct_period: 'current', amount: 300_000 }]
    expect(calcNetPay(BASE, {}, adjs)).toBe(3_800_000)
  })

  test('non-kasbon deduction subtracts from net', () => {
    const adjs = [{ type: 'deduction', is_kasbon: false, deduct_period: 'current', amount: 100_000 }]
    expect(calcNetPay(BASE, {}, adjs)).toBe(3_400_000)
  })

  test('all deductions combined', () => {
    const entry = { ...BASE, total_late_minutes: 5, inexcused_fixed_days: 1, excused_fixed_days: 3 }
    // late: 5*2000=10000, inexcused flat: 1*150000=150000, excused over: 1*100000=100000
    const adjs = [
      { type: 'addition',  is_kasbon: false, deduct_period: 'current', amount: 50_000 },
      { type: 'deduction', is_kasbon: false, deduct_period: 'current', amount: 25_000 },
      { type: 'deduction', is_kasbon: true,  deduct_period: 'next',    amount: 999_000 }, // deferred
    ]
    const expected = 3_500_000 - 10_000 - 150_000 - 100_000 + 50_000 - 25_000
    expect(calcNetPay(entry, {}, adjs)).toBe(expected)
  })
})

// ── present_days — route integration (mocked pool) ───────────────────────────

const express    = require('express')
const supertest  = require('supertest')

// Minimal auth middleware stub so the route doesn't 401
jest.mock('../middleware/auth', () => ({
  requireAdmin: (req, _res, next) => { req.user = { id: 'test-user', role: 'admin' }; next() },
  requireOwner: (req, _res, next) => next(),
}))

const payrollRouter = require('../routes/payroll')

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/payroll', payrollRouter)
  return app
}

describe('GET /api/payroll/periods/:id/entries — present_days', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns present_days field in each entry row', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id:                   'entry-1',
          barber_id:            'barber-1',
          barber_name:          'Dewa',
          pay_type:             'commission',
          base_salary:          3000000,
          commission_regular:   500000,
          commission_ot:        0,
          total_late_minutes:   0,
          inexcused_fixed_days: 0,
          excused_fixed_days:   0,
          working_days:         26,
          net_pay:              3500000,
          present_days:         3,
        },
      ],
    })

    const res = await supertest(makeApp())
      .get('/api/payroll/periods/period-123/entries')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toHaveProperty('present_days', 3)
  })

  test('present_days = 0 when barber had no attendance in period', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'entry-2', barber_name: 'Rizki', present_days: 0, base_salary: 2000000 }],
    })

    const res = await supertest(makeApp())
      .get('/api/payroll/periods/period-456/entries')

    expect(res.status).toBe(200)
    expect(res.body[0].present_days).toBe(0)
  })

  test('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB connection failed'))

    const res = await supertest(makeApp())
      .get('/api/payroll/periods/period-789/entries')

    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('message', 'Internal server error')
  })
})
