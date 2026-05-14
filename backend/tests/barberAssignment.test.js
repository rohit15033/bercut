// barberAssignment.test.js
//
// Tests for getActiveBarbers, getFreeBarberIds, and pickIdleBarber.
//
// All three functions take a `client` (transactional DB client) as their
// first argument, so we pass a mock client directly — no module-level pool
// mock needed for those functions.
//
// NOTE ON SQL GAP LOGIC:
// The actual conflict-overlap math in getFreeBarberIds lives in SQL:
//   scheduled_at < $2 + $3 minutes  AND  end_time > $2
// We cannot verify that SQL against a mock client.  What we CAN test:
//   - the function correctly wraps the query result into a Set
//   - it passes the right params (branchId, scheduledISO, durationMin) to client.query
//   - the combined pipeline (getFreeBarberIds → pickIdleBarber) selects the
//     correct barber given the Set the DB "would" return for each duration scenario
//
// Integration-level SQL correctness lives in booking.api.test.js + e2e tests.

jest.mock('../config/db', () => ({
  query:   jest.fn(),
  connect: jest.fn(),
}))

const { getActiveBarbers, getFreeBarberIds, pickIdleBarber } = require('../services/barberAssignment')

// ── Fixture IDs ─────────────────────────────────────────────────────────────────

const B1 = 'aaaaaaaa-0000-0000-0000-000000000001'  // 45-min gap before next booking
const B2 = 'aaaaaaaa-0000-0000-0000-000000000002'  // 60-min gap
const B3 = 'aaaaaaaa-0000-0000-0000-000000000003'  // 75-min gap
const BRANCH_ID = 'bbbbbbbb-0000-0000-0000-000000000001'

// Builds a mock transactional client that returns responses in order
function makeClient(...responses) {
  const client = { query: jest.fn(), release: jest.fn() }
  responses.forEach(r => client.query.mockResolvedValueOnce(r))
  return client
}

// ── pickIdleBarber ────────────────────────────────────────────────────────────────

describe('pickIdleBarber', () => {
  test('returns null immediately when freeIds is empty — no DB calls made', async () => {
    const client = makeClient()
    const result = await pickIdleBarber(client, BRANCH_ID, new Set())
    expect(result).toBeNull()
    expect(client.query).not.toHaveBeenCalled()
  })

  test('returns most-idle barber (null last_completed = never served today)', async () => {
    // DB returns barbers sorted by idle time: B1 first (null = never served)
    const client = makeClient(
      { rows: [] },  // advisory lock
      { rows: [
        { id: B1, last_completed_at: null },
        { id: B2, last_completed_at: '2026-05-14T09:00:00Z' },
        { id: B3, last_completed_at: '2026-05-14T10:00:00Z' },
      ]},
    )
    const result = await pickIdleBarber(client, BRANCH_ID, new Set([B1, B2, B3]))
    expect(result).toBe(B1)
  })

  test('skips barbers not in freeIds and picks the next eligible one', async () => {
    // B1 is most idle but excluded (e.g., current booking in-progress, status = busy)
    const client = makeClient(
      { rows: [] },
      { rows: [
        { id: B1, last_completed_at: null },
        { id: B2, last_completed_at: '2026-05-14T09:00:00Z' },
        { id: B3, last_completed_at: '2026-05-14T10:00:00Z' },
      ]},
    )
    const result = await pickIdleBarber(client, BRANCH_ID, new Set([B2, B3]))
    expect(result).toBe(B2)
  })

  test('returns null when no active barber matches freeIds', async () => {
    const client = makeClient(
      { rows: [] },
      { rows: [{ id: B1, last_completed_at: null }] },  // only B1 clocked in
    )
    // B2 is "free" per schedule, but never clocked in → not in active list
    const result = await pickIdleBarber(client, BRANCH_ID, new Set([B2]))
    expect(result).toBeNull()
  })

  test('tie-breaks by earliest clocked-in time when both have no completed bookings', async () => {
    // B1 and B2 both have null last_completed; B1 clocked in earlier → comes first
    const client = makeClient(
      { rows: [] },
      { rows: [
        { id: B1, last_completed_at: null, clocked_in_at: '2026-05-14T08:00:00Z' },
        { id: B2, last_completed_at: null, clocked_in_at: '2026-05-14T09:00:00Z' },
      ]},
    )
    const result = await pickIdleBarber(client, BRANCH_ID, new Set([B1, B2]))
    // SQL ORDER BY clocked_in_at ASC → B1 sorted first → picked
    expect(result).toBe(B1)
  })
})

// ── getFreeBarberIds ─────────────────────────────────────────────────────────────

describe('getFreeBarberIds — Set wrapping and query params', () => {
  const NOW_ISO = new Date().toISOString()

  test('returns a Set instance', async () => {
    const client = makeClient({ rows: [{ id: B1 }] })
    const result = await getFreeBarberIds(client, BRANCH_ID, NOW_ISO, 30)
    expect(result).toBeInstanceOf(Set)
  })

  test('30min: when DB returns all 3 barbers, Set contains all 3', async () => {
    const client = makeClient({ rows: [{ id: B1 }, { id: B2 }, { id: B3 }] })
    const freeIds = await getFreeBarberIds(client, BRANCH_ID, NOW_ISO, 30)
    expect(freeIds.size).toBe(3)
    expect(freeIds.has(B1)).toBe(true)
    expect(freeIds.has(B2)).toBe(true)
    expect(freeIds.has(B3)).toBe(true)
  })

  test('50min: when DB returns B2+B3 (B1 conflict), Set excludes B1', async () => {
    const client = makeClient({ rows: [{ id: B2 }, { id: B3 }] })
    const freeIds = await getFreeBarberIds(client, BRANCH_ID, NOW_ISO, 50)
    expect(freeIds.has(B1)).toBe(false)
    expect(freeIds.has(B2)).toBe(true)
    expect(freeIds.has(B3)).toBe(true)
    expect(freeIds.size).toBe(2)
  })

  test('70min: when DB returns only B3 (B1+B2 conflict), Set has only B3', async () => {
    const client = makeClient({ rows: [{ id: B3 }] })
    const freeIds = await getFreeBarberIds(client, BRANCH_ID, NOW_ISO, 70)
    expect(freeIds.has(B3)).toBe(true)
    expect(freeIds.has(B1)).toBe(false)
    expect(freeIds.has(B2)).toBe(false)
    expect(freeIds.size).toBe(1)
  })

  test('returns empty Set when no barbers are free', async () => {
    const client = makeClient({ rows: [] })
    const freeIds = await getFreeBarberIds(client, BRANCH_ID, NOW_ISO, 90)
    expect(freeIds.size).toBe(0)
  })

  test('passes branchId, scheduledISO, durationMin to SQL query', async () => {
    const client = makeClient({ rows: [] })
    await getFreeBarberIds(client, BRANCH_ID, NOW_ISO, 70)
    expect(client.query).toHaveBeenCalledWith(
      expect.any(String),
      [BRANCH_ID, NOW_ISO, 70],
    )
  })
})

// ── Full pipeline: gap scenario → idle selection ─────────────────────────────────
//
// Mirrors the user story:
//   3 barbers, all busy but with gaps before next booking
//   B1=45min gap, B2=60min gap, B3=75min gap
//
// The DB returns only the barbers whose gap ≥ service duration.
// pickIdleBarber then selects the most idle among those.

describe('idle-picker pipeline — gap scenario', () => {
  const NOW_ISO = new Date().toISOString()

  test('70min service: only B3 free → B3 assigned regardless of idle order', async () => {
    const client = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: B3 }] })                  // getFreeBarberIds
      .mockResolvedValueOnce({ rows: [] })                             // advisory lock
      .mockResolvedValueOnce({ rows: [{ id: B3, last_completed_at: '2026-05-14T09:00:00Z' }] }),  // getActiveBarbers
    }
    const freeIds = await getFreeBarberIds(client, BRANCH_ID, NOW_ISO, 70)
    const picked  = await pickIdleBarber(client, BRANCH_ID, freeIds)
    expect(picked).toBe(B3)
  })

  test('50min service: B2+B3 free → most idle of those two picked (B2, earlier last service)', async () => {
    const client = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: B2 }, { id: B3 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [
        { id: B2, last_completed_at: '2026-05-14T09:00:00Z' },  // served earlier → more idle
        { id: B3, last_completed_at: '2026-05-14T10:00:00Z' },
      ]}),
    }
    const freeIds = await getFreeBarberIds(client, BRANCH_ID, NOW_ISO, 50)
    const picked  = await pickIdleBarber(client, BRANCH_ID, freeIds)
    expect(picked).toBe(B2)
  })

  test('30min service: all 3 free → B1 picked (never served today → most idle)', async () => {
    const client = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: B1 }, { id: B2 }, { id: B3 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [
        { id: B1, last_completed_at: null },                    // most idle
        { id: B2, last_completed_at: '2026-05-14T09:00:00Z' },
        { id: B3, last_completed_at: '2026-05-14T10:00:00Z' },
      ]}),
    }
    const freeIds = await getFreeBarberIds(client, BRANCH_ID, NOW_ISO, 30)
    const picked  = await pickIdleBarber(client, BRANCH_ID, freeIds)
    expect(picked).toBe(B1)
  })

  test('no barbers free → pickIdleBarber returns null', async () => {
    const client = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [] }),  // getFreeBarberIds: no one free
    }
    const freeIds = await getFreeBarberIds(client, BRANCH_ID, NOW_ISO, 120)
    const picked  = await pickIdleBarber(client, BRANCH_ID, freeIds)
    expect(freeIds.size).toBe(0)
    expect(picked).toBeNull()
  })
})
