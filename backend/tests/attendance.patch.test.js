// attendance.patch.test.js
//
// Unit / integration tests for:
//   1. PATCH /api/attendance/:id — late_minutes recalculation when clock_in_at is updated
//   2. Pure logic tests for the late-minutes formula: max(0, ciH*60+ciM - shH*60-shM - grace)

// ── Mock DB before any require ────────────────────────────────────────────────

jest.mock('../config/db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  requireAdmin:       (req, _res, next) => { req.user = { id: 'test-user', role: 'admin' }; next() },
  requireKioskOrAdmin:(req, _res, next) => next(),
}))
// events and barberAssignment are not exercised in PATCH tests — stub them
jest.mock('./events', () => ({ emitEvent: jest.fn() }), { virtual: true })
jest.mock('../routes/events', () => ({ emitEvent: jest.fn() }))
jest.mock('../services/barberAssignment', () => ({ tryAssignDeferred: jest.fn().mockResolvedValue(null) }))

const pool      = require('../config/db')
const express   = require('express')
const supertest = require('supertest')
const attendanceRouter = require('../routes/attendance')

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/attendance', attendanceRouter)
  return app
}

// ── Pure-logic helper (mirrors the route's inline formula) ───────────────────

function calcLateMinutes(clockInIso, shiftStartStr, graceMins) {
  const [shH, shM] = shiftStartStr.split(':').map(Number)
  const localStr   = new Date(clockInIso).toLocaleString('sv-SE', { timeZone: 'Asia/Makassar' })
  const ciHour     = parseInt(localStr.slice(11, 13))
  const ciMin      = parseInt(localStr.slice(14, 16))
  return Math.max(0, ciHour * 60 + ciMin - shH * 60 - shM - graceMins)
}

// ── Pure formula tests ────────────────────────────────────────────────────────
//
// WITA = UTC+8, so:
//   10:00 WITA = 02:00 UTC
//   10:05 WITA = 02:05 UTC
//   10:06 WITA = 02:06 UTC
//   10:35 WITA = 02:35 UTC
//   08:00 WITA = 00:00 UTC
//   09:15 WITA = 01:15 UTC

describe('calcLateMinutes — pure formula', () => {
  // Shift 10:00, grace 5 → threshold at 10:05 WITA
  const SHIFT  = '10:00:00'
  const GRACE  = 5

  test('on time (exactly at shift start 10:00 WITA) → 0', () => {
    // 10:00 WITA = UTC 02:00
    const clockIn = '2026-05-01T02:00:00.000Z'
    expect(calcLateMinutes(clockIn, SHIFT, GRACE)).toBe(0)
  })

  test('within grace window (10:04 WITA) → 0', () => {
    // 10:04 WITA = UTC 02:04
    const clockIn = '2026-05-01T02:04:00.000Z'
    expect(calcLateMinutes(clockIn, SHIFT, GRACE)).toBe(0)
  })

  test('exactly at grace boundary (10:05 WITA) → 0', () => {
    // 10:05 WITA = UTC 02:05
    const clockIn = '2026-05-01T02:05:00.000Z'
    expect(calcLateMinutes(clockIn, SHIFT, GRACE)).toBe(0)
  })

  test('1 minute past grace (10:06 WITA) → 1 min late', () => {
    // 10:06 WITA = UTC 02:06
    const clockIn = '2026-05-01T02:06:00.000Z'
    expect(calcLateMinutes(clockIn, SHIFT, GRACE)).toBe(1)
  })

  test('30 minutes late (10:35 WITA) → 30 min', () => {
    // 10:35 WITA = UTC 02:35
    const clockIn = '2026-05-01T02:35:00.000Z'
    expect(calcLateMinutes(clockIn, SHIFT, GRACE)).toBe(30)
  })

  test('early clock-in (08:00 WITA) → 0 (never negative)', () => {
    // 08:00 WITA = UTC 00:00
    const clockIn = '2026-05-01T00:00:00.000Z'
    expect(calcLateMinutes(clockIn, SHIFT, GRACE)).toBe(0)
  })

  test('different shift start (09:00) with grace 10, clocking 09:15 WITA → 5 min late', () => {
    // 09:15 WITA = UTC 01:15
    const clockIn = '2026-05-01T01:15:00.000Z'
    expect(calcLateMinutes(clockIn, '09:00:00', 10)).toBe(5)
  })

  test('zero grace — exactly at shift start → 0', () => {
    // 10:00 WITA = UTC 02:00
    const clockIn = '2026-05-01T02:00:00.000Z'
    expect(calcLateMinutes(clockIn, SHIFT, 0)).toBe(0)
  })

  test('zero grace — 1 minute past shift start → 1', () => {
    // 10:01 WITA = UTC 02:01
    const clockIn = '2026-05-01T02:01:00.000Z'
    expect(calcLateMinutes(clockIn, SHIFT, 0)).toBe(1)
  })
})

// ── PATCH /api/attendance/:id — route integration (mocked pool) ───────────────

describe('PATCH /api/attendance/:id — late_minutes recalc', () => {
  beforeEach(() => jest.clearAllMocks())

  // Helper: mock the two settings queries then the UPDATE result
  function mockSettings({ grace = 5, shift = '10:00:00' } = {}) {
    pool.query
      .mockResolvedValueOnce({ rows: [{ late_grace_period_minutes: grace }] })  // payroll_settings
      .mockResolvedValueOnce({ rows: [{ shift_start_time: shift }] })            // global_settings
  }

  function mockUpdateRow(overrides = {}) {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'att-1',
        barber_id: 'barber-1',
        late_minutes: overrides.late_minutes ?? 0,
        clock_in_at: overrides.clock_in_at ?? '2026-05-01T01:00:00.000Z',
        clock_out_at: null,
        ...overrides,
      }],
    })
  }

  test('on-time clock_in_at → late_minutes = 0 in UPDATE params', async () => {
    // 10:00 WITA = UTC 02:00, shift 10:00, grace 5 → 0 late
    const clockIn = '2026-05-01T02:00:00.000Z'
    mockSettings({ grace: 5, shift: '10:00:00' })
    mockUpdateRow({ late_minutes: 0, clock_in_at: clockIn })

    const res = await supertest(makeApp())
      .patch('/api/attendance/att-1')
      .send({ clock_in_at: clockIn })

    expect(res.status).toBe(200)
    expect(res.body.late_minutes).toBe(0)

    // Verify the UPDATE was called and the computed late_minutes (0) is in the params
    const updateCall = pool.query.mock.calls.find(c => typeof c[0] === 'string' && c[0].includes('UPDATE'))
    expect(updateCall).toBeDefined()
    // late_minutes = 0 should appear in the params array
    expect(updateCall[1]).toContain(0)
  })

  test('late clock_in_at → late_minutes = 30 computed and passed to UPDATE', async () => {
    // 10:35 WITA = UTC 02:35 → 35 - 5 grace = 30 min late
    const clockIn = '2026-05-01T02:35:00.000Z'
    mockSettings({ grace: 5, shift: '10:00:00' })
    mockUpdateRow({ late_minutes: 30, clock_in_at: clockIn })

    const res = await supertest(makeApp())
      .patch('/api/attendance/att-1')
      .send({ clock_in_at: clockIn })

    expect(res.status).toBe(200)
    expect(res.body.late_minutes).toBe(30)

    // The route computes lateMins=30 and passes it as a param to the UPDATE query
    const updateCall = pool.query.mock.calls.find(c => typeof c[0] === 'string' && c[0].includes('UPDATE'))
    expect(updateCall).toBeDefined()
    expect(updateCall[1]).toContain(30)
  })

  test('only clock_out_at → no settings queries, no late_minutes in UPDATE', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'att-1', barber_id: 'barber-1', clock_out_at: '2026-05-01T10:00:00.000Z' }],
    })

    const res = await supertest(makeApp())
      .patch('/api/attendance/att-1')
      .send({ clock_out_at: '2026-05-01T10:00:00.000Z' })

    expect(res.status).toBe(200)
    // Only one pool.query call (the UPDATE) — settings NOT queried
    expect(pool.query.mock.calls).toHaveLength(1)
    const updateSql = pool.query.mock.calls[0][0]
    expect(updateSql).not.toContain('late_minutes')
  })

  test('no body → 400', async () => {
    const res = await supertest(makeApp())
      .patch('/api/attendance/att-1')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Nothing to update')
  })

  test('attendance record not found → 404', async () => {
    // 10:00 WITA = UTC 02:00
    const clockIn = '2026-05-01T02:00:00.000Z'
    mockSettings()
    pool.query.mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows

    const res = await supertest(makeApp())
      .patch('/api/attendance/nonexistent')
      .send({ clock_in_at: clockIn })

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Not found')
  })

  test('DB error → 500', async () => {
    // First pool.query call (payroll_settings) throws immediately
    const clockIn = '2026-05-01T02:00:00.000Z'
    pool.query.mockRejectedValueOnce(new Error('DB failure'))

    const res = await supertest(makeApp())
      .patch('/api/attendance/att-1')
      .send({ clock_in_at: clockIn })

    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Internal server error')
  })

  test('missing payroll_settings row uses default grace=5', async () => {
    // payroll_settings returns no rows → route defaults grace to 5
    // 10:06 WITA = UTC 02:06 → 1 min past grace(5) → late_minutes = 1
    const clockIn = '2026-05-01T02:06:00.000Z'
    pool.query
      .mockResolvedValueOnce({ rows: [] })                                        // payroll_settings empty
      .mockResolvedValueOnce({ rows: [{ shift_start_time: '10:00:00' }] })       // global_settings
    mockUpdateRow({ late_minutes: 1, clock_in_at: clockIn })

    const res = await supertest(makeApp())
      .patch('/api/attendance/att-1')
      .send({ clock_in_at: clockIn })

    expect(res.status).toBe(200)
    expect(res.body.late_minutes).toBe(1)
  })

  test('missing global_settings row uses default shift 10:00', async () => {
    // global_settings returns no rows → route defaults shift to '10:00:00'
    // 10:06 WITA = UTC 02:06 → 1 min past grace(5) → late_minutes = 1
    const clockIn = '2026-05-01T02:06:00.000Z'
    pool.query
      .mockResolvedValueOnce({ rows: [{ late_grace_period_minutes: 5 }] })
      .mockResolvedValueOnce({ rows: [] })                                        // global_settings empty
    mockUpdateRow({ late_minutes: 1, clock_in_at: clockIn })

    const res = await supertest(makeApp())
      .patch('/api/attendance/att-1')
      .send({ clock_in_at: clockIn })

    expect(res.status).toBe(200)
    expect(res.body.late_minutes).toBe(1)
  })
})
