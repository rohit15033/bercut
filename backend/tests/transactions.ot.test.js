// transactions.ot.test.js
//
// Unit tests for GET /api/reports/transactions in backend/routes/reports.js
// covering OT-aware commission logic.
//
// The endpoint makes exactly 2 pool.query calls per request:
//   Call 0: SELECT … FROM payroll_settings LIMIT 1
//   Call 1: SELECT … FROM bookings … (main transactions query)
//
// OT logic is computed inside the SQL query via parameters passed as:
//   $otEnabledIdx   → boolean
//   $otThresholdIdx → 'HH:MM' string
//   $otBonusPctIdx  → numeric
//   $otExcludedIdx  → uuid[]
//
// Because the DB computes is_ot / is_ot_service / commission, our mocks return
// pre-built rows and the assertions focus on:
//   (a) the correct OT parameters are forwarded to the second query
//   (b) the response body matches what the DB returned
//   (c) payroll_settings defaults are applied when no row exists

process.env.JWT_SECRET = 'test-secret'

jest.mock('../config/db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  requireAdmin: (req, _res, next) => { req.user = { id: 'u1', role: 'owner' }; next() },
}))

const request = require('supertest')
const express = require('express')
const pool    = require('../config/db')

// Build a minimal Express app with only the reports router mounted
const reportsRouter = require('../routes/reports')
const app = express()
app.use(express.json())
app.use('/api/reports', reportsRouter)

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Queue a payroll_settings result (call index 0). Pass null to simulate no row. */
function mockPayrollSettings(row) {
  const rows = row !== null ? [row] : []
  pool.query.mockResolvedValueOnce({ rows })
}

/** Queue the transactions result (call index 1). */
function mockTransactions(rows) {
  pool.query.mockResolvedValueOnce({ rows })
}

/** Return the args array passed to the second pool.query call (the main query). */
function getTransactionQueryArgs() {
  // calls[0] → payroll_settings, calls[1] → transactions
  const call = pool.query.mock.calls[1]
  return call ? call[1] : null
}

/** Return the SQL text of the second pool.query call. */
function getTransactionQueryText() {
  const call = pool.query.mock.calls[1]
  return call ? call[0] : null
}

// Standard payroll settings used across most tests
const DEFAULT_OT_SETTINGS = {
  ot_commission_enabled:  true,
  ot_threshold_time:      '19:00',
  ot_bonus_pct:           '10',
  ot_excluded_service_ids: [],
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('GET /api/reports/transactions — OT commission', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Test 1: OT disabled globally ─────────────────────────────────────────

  test('OT disabled globally: is_ot=false, base commission for all bookings', async () => {
    mockPayrollSettings({
      ot_commission_enabled:   false,
      ot_threshold_time:       '19:00',
      ot_bonus_pct:            '10',
      ot_excluded_service_ids: [],
    })

    const bookingRow = {
      id:            'bk-1',
      booking_number: 'BK001',
      date:          '2024-01-15',
      is_ot:         false,
      services: [
        { service_name: 'Haircut', price: 100000, is_ot_service: false, commission: 15000, commission_rate: 15 },
      ],
    }
    mockTransactions([bookingRow])

    const res = await request(app).get('/api/reports/transactions')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].is_ot).toBe(false)
    expect(res.body[0].services[0].is_ot_service).toBe(false)

    // Verify that false was passed as the OT enabled flag in the query args
    const args = getTransactionQueryArgs()
    expect(args).not.toBeNull()
    // otEnabled is the 3rd param after limit+offset (index 2 in the trailing OT block)
    // args layout: [...filterVals, limit, offset, otEnabled, otThreshold, otBonusPct, otExcluded]
    // With no filter query params: args = [200, 0, false, '19:00', 0, []]
    expect(args[2]).toBe(false)
  })

  // ── Test 2: Before threshold ──────────────────────────────────────────────

  test('booking before threshold (18:00 < 19:00): is_ot=false, base commission', async () => {
    mockPayrollSettings(DEFAULT_OT_SETTINGS)

    const bookingRow = {
      id:             'bk-2',
      booking_number: 'BK002',
      date:           '2024-01-15',
      time_scheduled: '18:00',
      is_ot:          false,
      services: [
        { service_name: 'Shave', price: 80000, is_ot_service: false, commission: 12000, commission_rate: 15 },
      ],
    }
    mockTransactions([bookingRow])

    const res = await request(app).get('/api/reports/transactions')

    expect(res.status).toBe(200)
    expect(res.body[0].is_ot).toBe(false)
    expect(res.body[0].services[0].is_ot_service).toBe(false)
    // commission should equal base rate: ROUND(80000 * 15 / 100) = 12000
    expect(res.body[0].services[0].commission).toBe(12000)

    // OT threshold '19:00' must be passed to the query
    const args = getTransactionQueryArgs()
    expect(args[3]).toBe('19:00')
  })

  // ── Test 3: At threshold (boundary) ──────────────────────────────────────

  test('booking exactly at threshold (19:00 >= 19:00): is_ot=true, OT commission', async () => {
    mockPayrollSettings(DEFAULT_OT_SETTINGS)

    const bookingRow = {
      id:             'bk-3',
      booking_number: 'BK003',
      date:           '2024-01-15',
      time_scheduled: '19:00',
      is_ot:          true,
      services: [
        {
          service_name:    'Haircut',
          price:           100000,
          commission_rate: 15,
          is_ot_service:   true,
          // ROUND(100000 * (15 + 10) / 100) = 25000
          commission:      25000,
        },
      ],
    }
    mockTransactions([bookingRow])

    const res = await request(app).get('/api/reports/transactions')

    expect(res.status).toBe(200)
    expect(res.body[0].is_ot).toBe(true)
    expect(res.body[0].services[0].is_ot_service).toBe(true)
    expect(res.body[0].services[0].commission).toBe(25000)

    // Verify OT bonus pct forwarded correctly
    const args = getTransactionQueryArgs()
    expect(parseFloat(args[4])).toBe(10)
  })

  // ── Test 4: After threshold ───────────────────────────────────────────────

  test('booking after threshold (20:00 > 19:00): is_ot=true, OT commission applied', async () => {
    mockPayrollSettings(DEFAULT_OT_SETTINGS)

    const bookingRow = {
      id:             'bk-4',
      booking_number: 'BK004',
      date:           '2024-01-15',
      time_scheduled: '20:00',
      is_ot:          true,
      services: [
        {
          service_name:    'Color',
          price:           200000,
          commission_rate: 20,
          is_ot_service:   true,
          // ROUND(200000 * (20 + 10) / 100) = 60000
          commission:      60000,
        },
      ],
    }
    mockTransactions([bookingRow])

    const res = await request(app).get('/api/reports/transactions')

    expect(res.status).toBe(200)
    expect(res.body[0].is_ot).toBe(true)
    expect(res.body[0].services[0].is_ot_service).toBe(true)
    expect(res.body[0].services[0].commission).toBe(60000)
  })

  // ── Test 5: OT booking with excluded service ──────────────────────────────

  test('OT booking with excluded service: is_ot_service=false, base commission', async () => {
    const excludedServiceId = 'svc-uuid-excluded-001'
    mockPayrollSettings({
      ot_commission_enabled:   true,
      ot_threshold_time:       '19:00',
      ot_bonus_pct:            '10',
      ot_excluded_service_ids: [excludedServiceId],
    })

    const bookingRow = {
      id:             'bk-5',
      booking_number: 'BK005',
      date:           '2024-01-15',
      time_scheduled: '20:00',
      is_ot:          true,
      services: [
        {
          service_name:    'Excluded Service',
          price:           150000,
          commission_rate: 15,
          // is_ot_service = false because service is in excluded list
          is_ot_service:   false,
          // ROUND(150000 * 15 / 100) = 22500 (base rate, not OT rate)
          commission:      22500,
        },
      ],
    }
    mockTransactions([bookingRow])

    const res = await request(app).get('/api/reports/transactions')

    expect(res.status).toBe(200)
    expect(res.body[0].is_ot).toBe(true)
    expect(res.body[0].services[0].is_ot_service).toBe(false)
    expect(res.body[0].services[0].commission).toBe(22500)

    // Verify excluded service IDs array is passed to the query
    const args = getTransactionQueryArgs()
    expect(args[5]).toEqual([excludedServiceId])
  })

  // ── Test 6: OT booking with non-excluded service ──────────────────────────

  test('OT booking with non-excluded service: is_ot_service=true, OT commission applied', async () => {
    const excludedServiceId = 'svc-uuid-excluded-002'
    const eligibleServiceId = 'svc-uuid-eligible-001'

    mockPayrollSettings({
      ot_commission_enabled:   true,
      ot_threshold_time:       '19:00',
      ot_bonus_pct:            '15',
      ot_excluded_service_ids: [excludedServiceId],
    })

    const bookingRow = {
      id:             'bk-6',
      booking_number: 'BK006',
      date:           '2024-01-15',
      time_scheduled: '21:00',
      is_ot:          true,
      services: [
        {
          service_name:    'Eligible Service',
          price:           120000,
          commission_rate: 20,
          is_ot_service:   true,
          // ROUND(120000 * (20 + 15) / 100) = 42000
          commission:      42000,
        },
        {
          service_name:    'Excluded Service',
          price:           80000,
          commission_rate: 20,
          is_ot_service:   false,
          // ROUND(80000 * 20 / 100) = 16000
          commission:      16000,
        },
      ],
    }
    mockTransactions([bookingRow])

    const res = await request(app).get('/api/reports/transactions')

    expect(res.status).toBe(200)
    expect(res.body[0].is_ot).toBe(true)

    const eligibleSvc = res.body[0].services.find(s => s.service_name === 'Eligible Service')
    const excludedSvc = res.body[0].services.find(s => s.service_name === 'Excluded Service')

    expect(eligibleSvc.is_ot_service).toBe(true)
    expect(eligibleSvc.commission).toBe(42000)

    expect(excludedSvc.is_ot_service).toBe(false)
    expect(excludedSvc.commission).toBe(16000)

    // OT bonus pct 15 must be passed
    const args = getTransactionQueryArgs()
    expect(parseFloat(args[4])).toBe(15)
    expect(args[5]).toEqual([excludedServiceId])
  })

  // ── Test 7: No payroll_settings row ──────────────────────────────────────

  test('no payroll_settings row: defaults to OT disabled, base commission, no error', async () => {
    // Simulate no rows returned by payroll_settings query
    mockPayrollSettings(null)

    const bookingRow = {
      id:             'bk-7',
      booking_number: 'BK007',
      date:           '2024-01-15',
      time_scheduled: '21:00',
      is_ot:          false,
      services: [
        {
          service_name:    'Haircut',
          price:           100000,
          commission_rate: 15,
          is_ot_service:   false,
          commission:      15000,
        },
      ],
    }
    mockTransactions([bookingRow])

    const res = await request(app).get('/api/reports/transactions')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)

    // With no settings row: otEnabled=false, otThreshold='19:00', otBonusPct=0, otExcluded=[]
    const args = getTransactionQueryArgs()
    expect(args[2]).toBe(false)    // otEnabled defaults to false
    expect(args[3]).toBe('19:00')  // otThreshold defaults to '19:00'
    expect(args[4]).toBe(0)        // otBonusPct defaults to 0
    expect(args[5]).toEqual([])    // otExcluded defaults to []
  })

  // ── Test 8: Empty ot_excluded_service_ids ────────────────────────────────

  test('empty ot_excluded_service_ids: all services in OT bookings are OT-eligible', async () => {
    mockPayrollSettings({
      ot_commission_enabled:   true,
      ot_threshold_time:       '19:00',
      ot_bonus_pct:            '10',
      ot_excluded_service_ids: [],  // explicitly empty
    })

    const bookingRow = {
      id:             'bk-8',
      booking_number: 'BK008',
      date:           '2024-01-15',
      time_scheduled: '20:00',
      is_ot:          true,
      services: [
        {
          service_name:    'Service A',
          price:           100000,
          commission_rate: 15,
          is_ot_service:   true,
          // ROUND(100000 * (15 + 10) / 100) = 25000
          commission:      25000,
        },
        {
          service_name:    'Service B',
          price:           50000,
          commission_rate: 10,
          is_ot_service:   true,
          // ROUND(50000 * (10 + 10) / 100) = 10000
          commission:      10000,
        },
      ],
    }
    mockTransactions([bookingRow])

    const res = await request(app).get('/api/reports/transactions')

    expect(res.status).toBe(200)
    expect(res.body[0].is_ot).toBe(true)

    // Every service should be OT-eligible when excluded list is empty
    for (const svc of res.body[0].services) {
      expect(svc.is_ot_service).toBe(true)
    }

    expect(res.body[0].services[0].commission).toBe(25000)
    expect(res.body[0].services[1].commission).toBe(10000)

    // Empty array must be forwarded (not null/undefined)
    const args = getTransactionQueryArgs()
    expect(args[5]).toEqual([])
  })

  // ── Bonus: payroll_settings query runs first and once ────────────────────

  test('payroll_settings is always the first query fired', async () => {
    mockPayrollSettings(DEFAULT_OT_SETTINGS)
    mockTransactions([])

    await request(app).get('/api/reports/transactions')

    expect(pool.query).toHaveBeenCalledTimes(2)
    const firstQuery = pool.query.mock.calls[0][0]
    expect(firstQuery).toMatch(/FROM payroll_settings/)
    expect(firstQuery).toMatch(/ot_commission_enabled/)
    expect(firstQuery).toMatch(/ot_threshold_time/)
    expect(firstQuery).toMatch(/ot_bonus_pct/)
    expect(firstQuery).toMatch(/ot_excluded_service_ids/)
  })

  // ── Bonus: OT threshold slice — only first 5 chars used ─────────────────

  test('ot_threshold_time longer than HH:MM is sliced to 5 chars before use', async () => {
    mockPayrollSettings({
      ot_commission_enabled:   true,
      ot_threshold_time:       '19:00:00',  // 8-char value from DB
      ot_bonus_pct:            '10',
      ot_excluded_service_ids: [],
    })
    mockTransactions([])

    await request(app).get('/api/reports/transactions')

    const args = getTransactionQueryArgs()
    expect(args[3]).toBe('19:00')  // must be sliced to exactly 5 chars
  })

  // ── Bonus: DB error returns 500 ───────────────────────────────────────────

  test('DB error on payroll_settings query returns 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('connection timeout'))

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const res = await request(app).get('/api/reports/transactions')

    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ message: 'Internal server error' })

    consoleErrorSpy.mockRestore()
  })

  // ── Bonus: ot_excluded_service_ids non-array falls back to [] ────────────

  test('non-array ot_excluded_service_ids in DB row defaults to empty array', async () => {
    mockPayrollSettings({
      ot_commission_enabled:   true,
      ot_threshold_time:       '19:00',
      ot_bonus_pct:            '10',
      ot_excluded_service_ids: null,  // DB could return null
    })
    mockTransactions([])

    await request(app).get('/api/reports/transactions')

    const args = getTransactionQueryArgs()
    expect(args[5]).toEqual([])
  })
})
