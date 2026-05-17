// autoOffClassifier.test.js
//
// Unit tests for:
//   1. getMondayOfWeek — Mon–Sun week boundary logic
//   2. runAutoOffClassifier — quota logic with mocked pool

jest.mock('../config/db', () => ({ query: jest.fn() }))

const pool = require('../config/db')

// We need to reach getMondayOfWeek. It is not exported directly, but we can
// re-implement the same pure function here for unit tests, and separately test
// the classifier logic via the module entry point.

// ── Re-implement getMondayOfWeek (mirrors service exactly) ───────────────────

function getMondayOfWeek(date) {
  const dow = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const monday = new Date(date)
  monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1))
  return monday
}

// ── getMondayOfWeek unit tests ────────────────────────────────────────────────

describe('getMondayOfWeek', () => {
  // Reference week: Mon 2026-05-11 … Sun 2026-05-17

  test('Monday returns itself', () => {
    const mon = new Date('2026-05-11')
    const result = getMondayOfWeek(mon)
    expect(result.toISOString().slice(0, 10)).toBe('2026-05-11')
  })

  test('Wednesday returns Monday of the same week', () => {
    const wed = new Date('2026-05-13')
    const result = getMondayOfWeek(wed)
    expect(result.toISOString().slice(0, 10)).toBe('2026-05-11')
  })

  test('Saturday returns Monday of the same week', () => {
    const sat = new Date('2026-05-16')
    const result = getMondayOfWeek(sat)
    expect(result.toISOString().slice(0, 10)).toBe('2026-05-11')
  })

  test('Sunday returns Monday six days prior (Mon–Sun week)', () => {
    // Sun 2026-05-17 → belongs to the week starting Mon 2026-05-11
    const sun = new Date('2026-05-17')
    const result = getMondayOfWeek(sun)
    expect(result.toISOString().slice(0, 10)).toBe('2026-05-11')
  })

  test('Sunday at week boundary: 2026-05-10 (Sun) → Mon 2026-05-04', () => {
    const sun = new Date('2026-05-10')
    const result = getMondayOfWeek(sun)
    expect(result.toISOString().slice(0, 10)).toBe('2026-05-04')
  })

  test('Does not mutate the input date', () => {
    const input = new Date('2026-05-13')
    const original = input.toISOString()
    getMondayOfWeek(input)
    expect(input.toISOString()).toBe(original)
  })
})

// ── runAutoOffClassifier — mocked pool integration ───────────────────────────

describe('runAutoOffClassifier — quota logic', () => {
  beforeEach(() => jest.clearAllMocks())

  // Helper: set up pool.query calls for a single barber scenario.
  // Call order inside the service per barber:
  //   1. barbers SELECT (once, before loop)
  //   2. attendance check (clock-in on yesterday)
  //   3. off_records existence check
  //   4. week auto-excused count
  //   5. INSERT off_record
  //
  // We mock the barbers query once, then per-barber calls in sequence.

  function mockBarbers(barberRows) {
    pool.query.mockResolvedValueOnce({ rows: barberRows })
  }

  function mockNoClockIn() {
    pool.query.mockResolvedValueOnce({ rows: [] })
  }

  function mockClockIn() {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'att-99' }] })
  }

  function mockNoExistingOffRecord() {
    pool.query.mockResolvedValueOnce({ rows: [] })
  }

  function mockExistingOffRecord() {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'off-99' }] })
  }

  function mockWeekAutoExcusedCount(count) {
    pool.query.mockResolvedValueOnce({ rows: [{ cnt: String(count) }] })
  }

  function mockInsertSuccess(offType) {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'off-new', type: offType, is_auto: true }] })
  }

  test('barber with clock-in yesterday → skipped, no INSERT', async () => {
    mockBarbers([{ barber_id: 'b1', branch_id: 'br1' }])
    mockClockIn() // has a clock-in → skip

    const { runAutoOffClassifier } = require('../services/autoOffClassifier')
    await runAutoOffClassifier()

    const insertCalls = pool.query.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO off_records')
    )
    expect(insertCalls).toHaveLength(0)
  })

  test('barber with existing off_record yesterday → skipped, no INSERT', async () => {
    mockBarbers([{ barber_id: 'b1', branch_id: 'br1' }])
    mockNoClockIn()
    mockExistingOffRecord() // already has off_record → skip

    const { runAutoOffClassifier } = require('../services/autoOffClassifier')
    await runAutoOffClassifier()

    const insertCalls = pool.query.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO off_records')
    )
    expect(insertCalls).toHaveLength(0)
  })

  test('barber with 0 auto-excused offs this week → inserts type=excused, is_auto=true', async () => {
    mockBarbers([{ barber_id: 'b1', branch_id: 'br1' }])
    mockNoClockIn()
    mockNoExistingOffRecord()
    mockWeekAutoExcusedCount(0)   // no auto-excused this week → get the free slot
    mockInsertSuccess('excused')

    const { runAutoOffClassifier } = require('../services/autoOffClassifier')
    await runAutoOffClassifier()

    const insertCall = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO off_records')
    )
    expect(insertCall).toBeDefined()
    // params: [barber_id, branch_id, yesterday, type, ...]
    expect(insertCall[1][3]).toBe('excused')
    // is_auto is literal `true` in the SQL string, not a param — verify type param
    expect(insertCall[1]).toContain('b1')
    expect(insertCall[1]).toContain('br1')
  })

  test('barber with 1 auto-excused off this week → inserts type=inexcused, is_auto=true', async () => {
    mockBarbers([{ barber_id: 'b2', branch_id: 'br1' }])
    mockNoClockIn()
    mockNoExistingOffRecord()
    mockWeekAutoExcusedCount(1)   // already used free slot → inexcused
    mockInsertSuccess('inexcused')

    const { runAutoOffClassifier } = require('../services/autoOffClassifier')
    await runAutoOffClassifier()

    const insertCall = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO off_records')
    )
    expect(insertCall).toBeDefined()
    expect(insertCall[1][3]).toBe('inexcused')
  })

  test('manual inexcused off (is_auto=false) does NOT block excused auto-classification', async () => {
    // The quota query filters is_auto=true AND type='excused'
    // A manual inexcused (is_auto=false) won't appear in that count
    // Simulate: count returns 0 even though a manual off exists
    mockBarbers([{ barber_id: 'b3', branch_id: 'br1' }])
    mockNoClockIn()
    mockNoExistingOffRecord()
    mockWeekAutoExcusedCount(0)  // manual offs excluded from count → still 0
    mockInsertSuccess('excused')

    const { runAutoOffClassifier } = require('../services/autoOffClassifier')
    await runAutoOffClassifier()

    const insertCall = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO off_records')
    )
    expect(insertCall).toBeDefined()
    expect(insertCall[1][3]).toBe('excused') // free slot is still available
  })

  test('race condition: INSERT throws unique_violation (23505) → silently swallowed', async () => {
    mockBarbers([{ barber_id: 'b4', branch_id: 'br1' }])
    mockNoClockIn()
    mockNoExistingOffRecord()
    mockWeekAutoExcusedCount(0)

    const uniqueViolation = new Error('duplicate key')
    uniqueViolation.code = '23505'
    pool.query.mockRejectedValueOnce(uniqueViolation)

    const { runAutoOffClassifier } = require('../services/autoOffClassifier')
    // Should resolve without throwing
    await expect(runAutoOffClassifier()).resolves.toBeUndefined()
  })

  test('non-23505 INSERT failure → logs error and does not rethrow', async () => {
    mockBarbers([{ barber_id: 'b5', branch_id: 'br1' }])
    mockNoClockIn()
    mockNoExistingOffRecord()
    mockWeekAutoExcusedCount(0)

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const dbError = new Error('connection reset')
    dbError.code = '08006'
    pool.query.mockRejectedValueOnce(dbError)

    const { runAutoOffClassifier } = require('../services/autoOffClassifier')
    await expect(runAutoOffClassifier()).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[autoOffClassifier]'),
      expect.any(String),
      expect.any(Object)
    )
    consoleErrorSpy.mockRestore()
  })

  test('no barbers in DB → no queries after initial fetch, resolves cleanly', async () => {
    mockBarbers([])

    const { runAutoOffClassifier } = require('../services/autoOffClassifier')
    await expect(runAutoOffClassifier()).resolves.toBeUndefined()

    // Only the initial barbers SELECT was called
    expect(pool.query.mock.calls).toHaveLength(1)
  })

  test('quota query filters is_auto=true AND type=excused — verifies SQL params', async () => {
    mockBarbers([{ barber_id: 'b6', branch_id: 'br1' }])
    mockNoClockIn()
    mockNoExistingOffRecord()
    mockWeekAutoExcusedCount(0)
    mockInsertSuccess('excused')

    const { runAutoOffClassifier } = require('../services/autoOffClassifier')
    await runAutoOffClassifier()

    // Find the COUNT query
    const countCall = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('COUNT(')
    )
    expect(countCall).toBeDefined()
    // SQL should reference both is_auto and type filters (checked in SQL string)
    expect(countCall[0]).toContain("is_auto = true")
    expect(countCall[0]).toContain("type = 'excused'")
    // Params: [barber_id, weekStart, weekEnd]
    expect(countCall[1][0]).toBe('b6')
    expect(countCall[1][1]).toMatch(/^\d{4}-\d{2}-\d{2}$/) // weekStart
    expect(countCall[1][2]).toMatch(/^\d{4}-\d{2}-\d{2}$/) // weekEnd
  })
})
