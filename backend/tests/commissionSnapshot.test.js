// commissionSnapshot.test.js
//
// Unit tests for backend/services/commissionSnapshot.js → snapshotCommission()
//
// Query order inside the service per call:
//   0. SELECT ... FROM payroll_settings LIMIT 1
//   1. SELECT started_at, scheduled_at FROM bookings WHERE id = $1
//   2. SELECT id, service_id, price_charged, commission_rate FROM booking_services WHERE booking_id = $1
//   3..N  UPDATE booking_services SET ... WHERE id = $k  (one per service row)

jest.mock('../config/db', () => ({ query: jest.fn() }))

const pool = require('../config/db')
const { snapshotCommission } = require('../services/commissionSnapshot')

// ── Intl.DateTimeFormat spy helpers ──────────────────────────────────────────
//
// commissionSnapshot calls new Intl.DateTimeFormat(...).format(date) which returns
// a string like "19:30". We spy on Intl.DateTimeFormat to return a controlled value.

let intlSpy

function mockSlotTime(hhMM) {
  intlSpy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
    format: () => hhMM,
  }))
}

// ── mockClient builder ────────────────────────────────────────────────────────
//
// snapshotCommission accepts either a pg PoolClient or falls back to pool.
// Using a dedicated mockClient per test keeps calls isolated from pool.query.

function makeMockClient() {
  return { query: jest.fn() }
}

// ── Response builders ─────────────────────────────────────────────────────────

function payrollRow({
  ot_commission_enabled = true,
  ot_threshold_time = '19:00',
  ot_bonus_pct = 10,
  ot_excluded_service_ids = [],
} = {}) {
  return {
    rows: [
      { ot_commission_enabled, ot_threshold_time, ot_bonus_pct, ot_excluded_service_ids },
    ],
  }
}

function bookingRow({ started_at = null, scheduled_at = null } = {}) {
  // Use a fixed ISO string when the test controls time via Intl spy.
  return {
    rows: [{ started_at: started_at || '2024-01-01T11:30:00.000Z', scheduled_at }],
  }
}

function servicesRows(rows) {
  return { rows }
}

function updateOk() {
  return { rows: [] }
}

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('snapshotCommission', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    if (intlSpy) intlSpy.mockRestore()
  })

  // ── Test 1: OT booking, eligible service ────────────────────────────────────

  test('OT booking: eligible service gets is_ot_service=true and OT-adjusted commission', async () => {
    // Arrange
    mockSlotTime('19:30') // past threshold of 19:00
    const client = makeMockClient()
    client.query
      .mockResolvedValueOnce(payrollRow({ ot_bonus_pct: 10, ot_excluded_service_ids: [] }))
      .mockResolvedValueOnce(bookingRow())
      .mockResolvedValueOnce(
        servicesRows([{ id: 'bs-1', service_id: 'svc-A', price_charged: 100000, commission_rate: 5 }])
      )
      .mockResolvedValueOnce(updateOk())

    // Act
    await snapshotCommission('bk-1', client)

    // Assert — UPDATE called with correct values
    const updateCall = client.query.mock.calls[3]
    expect(updateCall[0]).toContain('UPDATE booking_services')
    // commission_amount: ROUND(100000 * 15 / 100) = 15000
    expect(updateCall[1][0]).toBe(15000)  // commission_amount
    expect(updateCall[1][1]).toBe(15)     // commission_rate_applied = 5 + 10
    expect(updateCall[1][2]).toBe(true)   // is_ot_service
    expect(updateCall[1][3]).toBe('bs-1') // row id
  })

  // ── Test 2: OT booking, excluded service ────────────────────────────────────

  test('OT booking: excluded service gets is_ot_service=false and base commission only', async () => {
    // Arrange
    mockSlotTime('20:00') // past threshold
    const client = makeMockClient()
    client.query
      .mockResolvedValueOnce(
        payrollRow({ ot_bonus_pct: 10, ot_excluded_service_ids: ['svc-EXCLUDED'] })
      )
      .mockResolvedValueOnce(bookingRow())
      .mockResolvedValueOnce(
        servicesRows([
          {
            id: 'bs-2',
            service_id: 'svc-EXCLUDED',
            price_charged: 80000,
            commission_rate: 5,
          },
        ])
      )
      .mockResolvedValueOnce(updateOk())

    // Act
    await snapshotCommission('bk-2', client)

    // Assert
    const updateCall = client.query.mock.calls[3]
    // commission_amount: ROUND(80000 * 5 / 100) = 4000
    expect(updateCall[1][0]).toBe(4000)  // commission_amount
    expect(updateCall[1][1]).toBe(5)     // commission_rate_applied = base only
    expect(updateCall[1][2]).toBe(false) // is_ot_service
    expect(updateCall[1][3]).toBe('bs-2')
  })

  // ── Test 3: Non-OT booking ──────────────────────────────────────────────────

  test('Non-OT booking: booking at 18:00 gives is_ot_service=false for all services', async () => {
    // Arrange
    mockSlotTime('18:00') // before threshold 19:00
    const client = makeMockClient()
    client.query
      .mockResolvedValueOnce(payrollRow({ ot_threshold_time: '19:00', ot_bonus_pct: 10 }))
      .mockResolvedValueOnce(bookingRow())
      .mockResolvedValueOnce(
        servicesRows([
          { id: 'bs-3', service_id: 'svc-B', price_charged: 60000, commission_rate: 5 },
          { id: 'bs-4', service_id: 'svc-C', price_charged: 40000, commission_rate: 8 },
        ])
      )
      .mockResolvedValueOnce(updateOk())
      .mockResolvedValueOnce(updateOk())

    // Act
    await snapshotCommission('bk-3', client)

    // Assert — both services should be non-OT
    const update1 = client.query.mock.calls[3]
    expect(update1[1][2]).toBe(false) // is_ot_service = false
    expect(update1[1][1]).toBe(5)     // rate = base only

    const update2 = client.query.mock.calls[4]
    expect(update2[1][2]).toBe(false) // is_ot_service = false
    expect(update2[1][1]).toBe(8)     // rate = base only
  })

  // ── Test 4: OT disabled ─────────────────────────────────────────────────────

  test('OT disabled: ot_commission_enabled=false gives is_ot_service=false even past threshold', async () => {
    // Arrange
    mockSlotTime('21:00') // well past threshold — but OT is off
    const client = makeMockClient()
    client.query
      .mockResolvedValueOnce(
        payrollRow({ ot_commission_enabled: false, ot_threshold_time: '19:00', ot_bonus_pct: 10 })
      )
      .mockResolvedValueOnce(bookingRow())
      .mockResolvedValueOnce(
        servicesRows([{ id: 'bs-5', service_id: 'svc-D', price_charged: 50000, commission_rate: 5 }])
      )
      .mockResolvedValueOnce(updateOk())

    // Act
    await snapshotCommission('bk-4', client)

    // Assert
    const updateCall = client.query.mock.calls[3]
    expect(updateCall[1][2]).toBe(false) // is_ot_service must be false
    expect(updateCall[1][1]).toBe(5)     // only base rate
    // commission_amount: ROUND(50000 * 5 / 100) = 2500
    expect(updateCall[1][0]).toBe(2500)
  })

  // ── Test 5: Booking not found ────────────────────────────────────────────────

  test('booking not found: returns without error and fires no UPDATE', async () => {
    // Arrange
    const client = makeMockClient()
    client.query
      .mockResolvedValueOnce(payrollRow())
      .mockResolvedValueOnce({ rows: [] }) // booking not found

    // Act + Assert — must not throw
    await expect(snapshotCommission('nonexistent-id', client)).resolves.toBeUndefined()

    // Only 2 queries fired; no booking_services SELECT or UPDATE
    expect(client.query).toHaveBeenCalledTimes(2)
    const querySQLs = client.query.mock.calls.map(c => c[0])
    expect(querySQLs.some(sql => sql.includes('booking_services'))).toBe(false)
  })

  // ── Test 6: NULL commission_rate ────────────────────────────────────────────

  test('NULL commission_rate: baseRate defaults to 0, commission_amount = 0, no crash', async () => {
    // Arrange
    mockSlotTime('18:00') // non-OT, so OT branch not involved
    const client = makeMockClient()
    client.query
      .mockResolvedValueOnce(payrollRow({ ot_commission_enabled: false }))
      .mockResolvedValueOnce(bookingRow())
      .mockResolvedValueOnce(
        servicesRows([
          { id: 'bs-6', service_id: 'svc-E', price_charged: 75000, commission_rate: null },
        ])
      )
      .mockResolvedValueOnce(updateOk())

    // Act + Assert — must not throw
    await expect(snapshotCommission('bk-5', client)).resolves.toBeUndefined()

    const updateCall = client.query.mock.calls[3]
    expect(updateCall[1][0]).toBe(0)  // commission_amount = 0
    expect(updateCall[1][1]).toBe(0)  // commission_rate_applied = 0
    expect(updateCall[1][2]).toBe(false)
  })

  // ── Test 7: Edge — booking exactly at threshold ──────────────────────────────

  test('booking exactly at threshold (19:00 >= 19:00) is treated as OT', async () => {
    // Arrange
    mockSlotTime('19:00') // exactly at threshold
    const client = makeMockClient()
    client.query
      .mockResolvedValueOnce(
        payrollRow({ ot_threshold_time: '19:00', ot_bonus_pct: 15, ot_excluded_service_ids: [] })
      )
      .mockResolvedValueOnce(bookingRow())
      .mockResolvedValueOnce(
        servicesRows([
          { id: 'bs-7', service_id: 'svc-F', price_charged: 120000, commission_rate: 5 },
        ])
      )
      .mockResolvedValueOnce(updateOk())

    // Act
    await snapshotCommission('bk-6', client)

    // Assert — must be OT
    const updateCall = client.query.mock.calls[3]
    expect(updateCall[1][2]).toBe(true)  // is_ot_service
    expect(updateCall[1][1]).toBe(20)    // 5 + 15
    // commission_amount: ROUND(120000 * 20 / 100) = 24000
    expect(updateCall[1][0]).toBe(24000)
  })

  // ── Bonus: pool fallback when no client passed ───────────────────────────────

  test('falls back to pool when no client argument is provided', async () => {
    // Arrange
    mockSlotTime('18:00')
    pool.query
      .mockResolvedValueOnce(payrollRow({ ot_commission_enabled: false }))
      .mockResolvedValueOnce(bookingRow())
      .mockResolvedValueOnce(
        servicesRows([
          { id: 'bs-8', service_id: 'svc-G', price_charged: 50000, commission_rate: 5 },
        ])
      )
      .mockResolvedValueOnce(updateOk())

    // Act — intentionally omit the client param
    await snapshotCommission('bk-7')

    // Assert — pool.query was used (not a client)
    expect(pool.query).toHaveBeenCalledTimes(4)
    const updateCall = pool.query.mock.calls[3]
    expect(updateCall[1][3]).toBe('bs-8')
  })

  // ── Bonus: multiple services, mixed OT eligibility ───────────────────────────

  test('OT booking with one eligible and one excluded service snapshots correctly', async () => {
    // Arrange
    mockSlotTime('20:00')
    const client = makeMockClient()
    client.query
      .mockResolvedValueOnce(
        payrollRow({ ot_bonus_pct: 10, ot_excluded_service_ids: ['svc-SKIP'] })
      )
      .mockResolvedValueOnce(bookingRow())
      .mockResolvedValueOnce(
        servicesRows([
          // eligible
          { id: 'bs-A', service_id: 'svc-HAIR', price_charged: 60000, commission_rate: 5 },
          // excluded
          { id: 'bs-B', service_id: 'svc-SKIP', price_charged: 30000, commission_rate: 5 },
        ])
      )
      .mockResolvedValueOnce(updateOk())
      .mockResolvedValueOnce(updateOk())

    // Act
    await snapshotCommission('bk-8', client)

    // Assert
    const updateHair = client.query.mock.calls[3]
    expect(updateHair[1][2]).toBe(true)  // is_ot_service
    expect(updateHair[1][1]).toBe(15)    // 5 + 10
    // ROUND(60000 * 15 / 100) = 9000
    expect(updateHair[1][0]).toBe(9000)
    expect(updateHair[1][3]).toBe('bs-A')

    const updateSkip = client.query.mock.calls[4]
    expect(updateSkip[1][2]).toBe(false) // excluded → not OT
    expect(updateSkip[1][1]).toBe(5)     // base only
    // ROUND(30000 * 5 / 100) = 1500
    expect(updateSkip[1][0]).toBe(1500)
    expect(updateSkip[1][3]).toBe('bs-B')
  })

  // ── Bonus: no payroll_settings row ──────────────────────────────────────────

  test('missing payroll_settings row: defaults applied — OT disabled, threshold 19:00', async () => {
    // Arrange — empty payroll_settings forces all defaults
    mockSlotTime('21:00')
    const client = makeMockClient()
    client.query
      .mockResolvedValueOnce({ rows: [] }) // no payroll_settings row
      .mockResolvedValueOnce(bookingRow())
      .mockResolvedValueOnce(
        servicesRows([
          { id: 'bs-C', service_id: 'svc-H', price_charged: 50000, commission_rate: 5 },
        ])
      )
      .mockResolvedValueOnce(updateOk())

    // Act
    await snapshotCommission('bk-9', client)

    // Assert — ot_commission_enabled defaults to false via `|| false`
    // so is_ot_service must be false even at 21:00
    const updateCall = client.query.mock.calls[3]
    expect(updateCall[1][2]).toBe(false) // is_ot_service
    expect(updateCall[1][1]).toBe(5)     // base only
  })

  // ── Bonus: commission_amount rounds correctly (Math.round) ──────────────────

  test('commission_amount is Math.round of (price * rate / 100)', async () => {
    // 33333 * 5 / 100 = 1666.65 → rounds to 1667
    mockSlotTime('18:00')
    const client = makeMockClient()
    client.query
      .mockResolvedValueOnce(payrollRow({ ot_commission_enabled: false }))
      .mockResolvedValueOnce(bookingRow())
      .mockResolvedValueOnce(
        servicesRows([
          { id: 'bs-D', service_id: 'svc-I', price_charged: 33333, commission_rate: 5 },
        ])
      )
      .mockResolvedValueOnce(updateOk())

    await snapshotCommission('bk-10', client)

    const updateCall = client.query.mock.calls[3]
    expect(updateCall[1][0]).toBe(1667)
  })
})
