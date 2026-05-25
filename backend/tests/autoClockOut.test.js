// autoClockOut.test.js
//
// Unit tests for backend/services/autoClockOut.js → runAutoClockOut()
//
// Query order inside the service per branch:
//   0. SELECT id FROM branches WHERE is_active = true  (runAutoClockOut, once)
//   1. SELECT closing_time FROM whatsapp_settings       (per branch)
//   2. SELECT open attendance                           (per branch, only if now >= closing_time)
//   3. SELECT active bookings                           (per barber)
//   4. UPDATE attendance SET clock_out_at               (per eligible barber)
//   5. UPDATE barbers SET status                        (per eligible barber)

jest.mock('../config/db', () => ({ query: jest.fn() }))
jest.mock('../routes/events', () => ({ emitEvent: jest.fn() }))

const pool = require('../config/db')
const { emitEvent } = require('../routes/events')
const { runAutoClockOut } = require('../services/autoClockOut')

// ── nowWITA control ───────────────────────────────────────────────────────────
//
// The service calls `new Intl.DateTimeFormat(...).formatToParts(new Date())`.
// We spy on Intl.DateTimeFormat and replace its instance methods so the function
// returns whatever HH:MM string we dictate.

let intlSpy

function mockCurrentTime(hhMM) {
  const [hour, minute] = hhMM.split(':')
  intlSpy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
    formatToParts: () => [
      { type: 'day', value: '21' },
      { type: 'hour', value: hour },
      { type: 'minute', value: minute },
    ],
  }))
}

// ── Queued pool.query helpers ─────────────────────────────────────────────────

function mockBranches(branchIds) {
  pool.query.mockResolvedValueOnce({ rows: branchIds.map(id => ({ id })) })
}

function mockClosingTime(time) {
  // Pass null to simulate "no row in whatsapp_settings" → default '21:00'
  const rows = time !== null ? [{ closing_time: time }] : []
  pool.query.mockResolvedValueOnce({ rows })
}

function mockOpenAttendance(barbers) {
  pool.query.mockResolvedValueOnce({ rows: barbers })
}

function mockActiveBookings(bookings) {
  pool.query.mockResolvedValueOnce({ rows: bookings })
}

function mockAttendanceUpdate(updatedRows) {
  pool.query.mockResolvedValueOnce({ rows: updatedRows })
}

function mockBarberStatusUpdate() {
  pool.query.mockResolvedValueOnce({ rows: [] })
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('runAutoClockOut', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    if (intlSpy) intlSpy.mockRestore()
  })

  // ── Test 1: No-op before closing time ──────────────────────────────────────

  test('no-op when current time is before closing_time', async () => {
    mockCurrentTime('20:00')
    mockBranches(['br1'])
    mockClosingTime('21:00') // 20:00 < 21:00 → return early

    await runAutoClockOut()

    // Only 2 queries: branches SELECT + closing_time SELECT
    expect(pool.query).toHaveBeenCalledTimes(2)

    const queryTexts = pool.query.mock.calls.map(c => c[0])
    expect(queryTexts.some(q => q.includes('clock_out_at IS NULL'))).toBe(false)
    expect(queryTexts.some(q => q.includes('UPDATE attendance'))).toBe(false)
    expect(emitEvent).not.toHaveBeenCalled()
  })

  // ── Test 2: Clock out at closing time ──────────────────────────────────────

  test('clocks out eligible barber at closing_time with no active bookings', async () => {
    mockCurrentTime('21:00')
    mockBranches(['br1'])
    mockClosingTime('21:00')                                    // 21:00 >= 21:00 → proceed
    mockOpenAttendance([{ attendance_id: 'att-1', barber_id: 'bar-1' }])
    mockActiveBookings([])                                      // no active bookings
    mockAttendanceUpdate([{ id: 'att-1' }])                    // UPDATE succeeds
    mockBarberStatusUpdate()

    await runAutoClockOut()

    const attendanceUpdate = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('UPDATE attendance')
    )
    expect(attendanceUpdate).toBeDefined()
    expect(attendanceUpdate[1]).toContain('att-1')

    const barberUpdate = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('UPDATE barbers')
    )
    expect(barberUpdate).toBeDefined()
    expect(barberUpdate[1]).toContain('bar-1')

    expect(emitEvent).toHaveBeenCalledTimes(1)
    expect(emitEvent).toHaveBeenCalledWith('br1', 'barber_update', {
      barber_id: 'bar-1',
      status: 'clocked_out',
    })
  })

  // ── Test 3: Skip barber with confirmed booking ─────────────────────────────

  test('skips barber who has a confirmed booking today', async () => {
    mockCurrentTime('21:00')
    mockBranches(['br1'])
    mockClosingTime('21:00')
    mockOpenAttendance([{ attendance_id: 'att-2', barber_id: 'bar-2' }])
    mockActiveBookings([{ id: 'bk-confirmed' }]) // has booking → skip

    await runAutoClockOut()

    const attendanceUpdate = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('UPDATE attendance')
    )
    expect(attendanceUpdate).toBeUndefined()
    expect(emitEvent).not.toHaveBeenCalled()
  })

  // ── Test 4: Skip barber with in_progress booking ───────────────────────────

  test('skips barber who has an in_progress booking today', async () => {
    mockCurrentTime('22:00')
    mockBranches(['br1'])
    mockClosingTime('21:00')
    mockOpenAttendance([{ attendance_id: 'att-3', barber_id: 'bar-3' }])
    mockActiveBookings([{ id: 'bk-inprogress' }]) // has booking → skip

    await runAutoClockOut()

    const attendanceUpdate = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('UPDATE attendance')
    )
    expect(attendanceUpdate).toBeUndefined()
    expect(emitEvent).not.toHaveBeenCalled()
  })

  // ── Test 5: Attendance UPDATE returns 0 rows (race condition) ─────────────

  test('gracefully continues when attendance UPDATE returns no rows', async () => {
    mockCurrentTime('21:30')
    mockBranches(['br1'])
    mockClosingTime('21:00')
    mockOpenAttendance([{ attendance_id: 'att-4', barber_id: 'bar-4' }])
    mockActiveBookings([])
    mockAttendanceUpdate([]) // 0 rows returned → already clocked out elsewhere

    await expect(runAutoClockOut()).resolves.toBeUndefined()

    // UPDATE barbers must NOT be called when attendance UPDATE returned nothing
    const barberUpdate = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('UPDATE barbers')
    )
    expect(barberUpdate).toBeUndefined()
    expect(emitEvent).not.toHaveBeenCalled()
  })

  // ── Test 6: Default closing_time when no whatsapp_settings row ────────────

  test('defaults to 21:00 when whatsapp_settings has no row for the branch', async () => {
    mockCurrentTime('21:00')
    mockBranches(['br1'])
    mockClosingTime(null)  // no row → service defaults to '21:00'
    mockOpenAttendance([{ attendance_id: 'att-5', barber_id: 'bar-5' }])
    mockActiveBookings([])
    mockAttendanceUpdate([{ id: 'att-5' }])
    mockBarberStatusUpdate()

    await runAutoClockOut()

    const attendanceUpdate = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('UPDATE attendance')
    )
    expect(attendanceUpdate).toBeDefined()
    expect(emitEvent).toHaveBeenCalledTimes(1)
  })

  // ── Test 7: Multiple barbers — one eligible, one with active booking ───────

  test('only clocks out the eligible barber when two barbers are open', async () => {
    mockCurrentTime('21:00')
    mockBranches(['br1'])
    mockClosingTime('21:00')
    mockOpenAttendance([
      { attendance_id: 'att-10', barber_id: 'bar-10' }, // eligible
      { attendance_id: 'att-11', barber_id: 'bar-11' }, // has active booking
    ])
    // bar-10: no active bookings → eligible
    mockActiveBookings([])
    mockAttendanceUpdate([{ id: 'att-10' }])
    mockBarberStatusUpdate()
    // bar-11: has a confirmed booking → skip
    mockActiveBookings([{ id: 'bk-active' }])

    await runAutoClockOut()

    const attendanceUpdates = pool.query.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('UPDATE attendance')
    )
    expect(attendanceUpdates).toHaveLength(1)
    expect(attendanceUpdates[0][1]).toContain('att-10')

    const barberUpdates = pool.query.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('UPDATE barbers')
    )
    expect(barberUpdates).toHaveLength(1)
    expect(barberUpdates[0][1]).toContain('bar-10')

    expect(emitEvent).toHaveBeenCalledTimes(1)
    expect(emitEvent).toHaveBeenCalledWith('br1', 'barber_update', {
      barber_id: 'bar-10',
      status: 'clocked_out',
    })
  })

  // ── Bonus: active bookings query targets correct status values ────────────

  test('active bookings query filters on confirmed and in_progress statuses', async () => {
    mockCurrentTime('21:00')
    mockBranches(['br1'])
    mockClosingTime('21:00')
    mockOpenAttendance([{ attendance_id: 'att-20', barber_id: 'bar-20' }])
    mockActiveBookings([])
    mockAttendanceUpdate([{ id: 'att-20' }])
    mockBarberStatusUpdate()

    await runAutoClockOut()

    const bookingQuery = pool.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('FROM bookings')
    )
    expect(bookingQuery).toBeDefined()
    expect(bookingQuery[0]).toContain("'confirmed'")
    expect(bookingQuery[0]).toContain("'in_progress'")
    expect(bookingQuery[1][0]).toBe('bar-20')
  })

  // ── Bonus: no active branches ─────────────────────────────────────────────

  test('no active branches → only branches SELECT fired, resolves cleanly', async () => {
    mockCurrentTime('21:00')
    mockBranches([]) // empty → loop never runs

    await expect(runAutoClockOut()).resolves.toBeUndefined()

    expect(pool.query).toHaveBeenCalledTimes(1)
    expect(emitEvent).not.toHaveBeenCalled()
  })

  // ── Bonus: multiple branches with different closing times ─────────────────

  test('processes two branches independently — only the early-closing one fires clock-out', async () => {
    mockCurrentTime('20:30')
    mockBranches(['br1', 'br2'])
    // br1 closes at 21:00 → 20:30 < 21:00 → no-op
    mockClosingTime('21:00')
    // br2 closes at 20:00 → 20:30 >= 20:00 → proceeds
    mockClosingTime('20:00')
    mockOpenAttendance([{ attendance_id: 'att-30', barber_id: 'bar-30' }])
    mockActiveBookings([])
    mockAttendanceUpdate([{ id: 'att-30' }])
    mockBarberStatusUpdate()

    await runAutoClockOut()

    expect(emitEvent).toHaveBeenCalledTimes(1)
    expect(emitEvent).toHaveBeenCalledWith('br2', 'barber_update', {
      barber_id: 'bar-30',
      status: 'clocked_out',
    })
  })

  // ── Bonus: DB error on branches query is caught without throwing ──────────

  test('branches query failure is caught and logged, does not throw', async () => {
    mockCurrentTime('21:00')
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    pool.query.mockRejectedValueOnce(new Error('connection timeout'))

    await expect(runAutoClockOut()).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[autoClockOut]'),
      expect.any(Error)
    )
    consoleErrorSpy.mockRestore()
  })
})
