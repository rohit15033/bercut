jest.mock('../config/db', () => ({ query: jest.fn() }))

const pool = require('../config/db')
const { getAvailableSlots, getNowWindow } = require('../services/slotGenerator')

const BARBER_ID  = 'aaaaaaaa-0000-0000-0000-000000000001'
const BRANCH_ID  = 'bbbbbbbb-0000-0000-0000-000000000001'
const FUTURE_DATE = '2026-05-14'
const PAST_DATE   = '2026-05-13' // used as "today" when testing future dates

// ── helpers ─────────────────────────────────────────────────────────────────────

function mockBarberExists() {
  pool.query.mockResolvedValueOnce({ rows: [{ id: BARBER_ID }] })
}
function mockBookings(rows = []) {
  pool.query.mockResolvedValueOnce({ rows })
}
function mockBreaks(rows = []) {
  pool.query.mockResolvedValueOnce({ rows })
}
function mockNow(t, d) {
  pool.query.mockResolvedValueOnce({ rows: [{ t, d }] })
}

// ── getAvailableSlots ────────────────────────────────────────────────────────────

describe('getAvailableSlots', () => {
  beforeEach(() => pool.query.mockReset())

  it('returns empty array when barber not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })
    expect(await getAvailableSlots(BARBER_ID, FUTURE_DATE, 30)).toEqual([])
  })

  it('returns full 30-min grid 10:00–19:30 for a future date with no bookings', async () => {
    mockBarberExists()
    mockBookings()
    mockBreaks()
    mockNow('12:00', PAST_DATE) // isToday = false

    const slots = await getAvailableSlots(BARBER_ID, FUTURE_DATE, 30)

    expect(slots[0]).toBe('10:00')
    expect(slots[slots.length - 1]).toBe('19:30')
    // 10:00 to 19:30 in 30-min steps = 20 slots
    expect(slots).toHaveLength(20)
    expect(slots).not.toContain('19:45') // 19:45 is not on a 30-min grid boundary
  })

  it('blocks 10:00 and 10:30 for a 60-min confirmed booking at 10:00', async () => {
    mockBarberExists()
    mockBookings([{
      slot_time: '10:00', started_time: null, status: 'confirmed', total_duration: '60',
    }])
    mockBreaks()
    mockNow('12:00', PAST_DATE)

    const slots = await getAvailableSlots(BARBER_ID, FUTURE_DATE, 30)

    expect(slots).not.toContain('10:00')
    expect(slots).not.toContain('10:30')
    expect(slots).not.toContain('11:00') // still inside block end + buffer (60+5=65 min → 11:05)
    expect(slots).toContain('11:30')
  })

  it('in_progress booking uses started_at instead of scheduled_at', async () => {
    // scheduled at 10:30 but started early at 10:00 for 30 min → blocks until 10:35
    mockBarberExists()
    mockBookings([{
      slot_time: '10:30', started_time: '10:00', status: 'in_progress', total_duration: '30',
    }])
    mockBreaks()
    mockNow('10:15', PAST_DATE)

    const slots = await getAvailableSlots(BARBER_ID, FUTURE_DATE, 30)

    // effectiveStart=600(10:00), estimatedEnd=630(10:30), blocked end=635
    // 10:30 slot (630) < 635 → blocked; 11:00 (660) >= 635 → free
    expect(slots).not.toContain('10:30')
    expect(slots).toContain('11:00')
  })

  it('overrun in_progress booking (now > estimatedEnd) extends block to nowMin+5', async () => {
    // booking started 09:30 for 30 min → estimated end 10:00, but it's now 10:20 (overrun)
    // block extends to 10:25 (nowMin+5 = 10:20+5)
    mockBarberExists()
    mockBookings([{
      slot_time: '09:30', started_time: '09:30', status: 'in_progress', total_duration: '30',
    }])
    mockBreaks()
    mockNow('10:20', FUTURE_DATE) // isToday = true, nowMin=620

    const slots = await getAvailableSlots(BARBER_ID, FUTURE_DATE, 30)

    // overrun block end = 620+5 = 625; first off-grid bonus = roundUpTo5(625) = 625 = 10:25
    expect(slots[0]).toBe('10:25')
    expect(slots).toContain('11:00')
  })

  it('excludes slots when total duration would exceed closeTime (21:00)', async () => {
    mockBarberExists()
    mockBookings()
    mockBreaks()
    mockNow('12:00', PAST_DATE)

    // duration = 90 min — last slot where t + 90 <= 1260 is 19:30 (1170+90=1260 ✓)
    const slots = await getAvailableSlots(BARBER_ID, FUTURE_DATE, 90)

    expect(slots).toContain('19:30')
    expect(slots).not.toContain('20:00') // 20:00+90=21:30 > closeTime
  })
})

// ── getNowWindow ──────────────────────────────────────────────────────────────────

describe('getNowWindow', () => {
  beforeEach(() => pool.query.mockReset())

  it('returns freeNow:false and windowMin:0 when date is not today', async () => {
    mockNow('12:00', '2026-05-15') // not FUTURE_DATE
    const result = await getNowWindow(BRANCH_ID, null, FUTURE_DATE)
    expect(result).toEqual({ freeNow: false, windowMin: 0 })
  })

  it('returns freeNow:true with large window when barber has no bookings', async () => {
    const today = FUTURE_DATE
    mockNow('12:00', today)
    // branch query returns one barber
    pool.query.mockResolvedValueOnce({ rows: [{ id: BARBER_ID }] })
    mockBookings()
    mockBreaks()

    const result = await getNowWindow(BRANCH_ID, null, today)

    expect(result.freeNow).toBe(true)
    // windowMin = closeTime(1260) - now(720) + OVERLAP_MIN(15) = 555
    expect(result.windowMin).toBe(555)
  })

  it('returns freeNow:false when barber is currently in a booking', async () => {
    const today = FUTURE_DATE
    // now=12:00(720), booking started 11:00 for 90 min → ends 12:30(810) → active
    mockNow('12:00', today)
    pool.query.mockResolvedValueOnce({ rows: [{ id: BARBER_ID }] })
    pool.query.mockResolvedValueOnce({ rows: [{
      barber_id:      BARBER_ID,
      slot_time:      '11:00',
      started_time:   '11:00',
      status:         'in_progress',
      total_duration: '90',
    }]})
    mockBreaks()

    const result = await getNowWindow(BRANCH_ID, null, today)

    expect(result.freeNow).toBe(false)
  })

  it('returns freeNow:true and correct windowMin when barber has a future booking', async () => {
    const today = FUTURE_DATE
    // now=12:00(720), confirmed booking at 13:00(780) → gap = 60 min
    // windowMin = 60 + OVERLAP_MIN(15) = 75
    mockNow('12:00', today)
    pool.query.mockResolvedValueOnce({ rows: [{ id: BARBER_ID }] })
    pool.query.mockResolvedValueOnce({ rows: [{
      barber_id:      BARBER_ID,
      slot_time:      '13:00',
      started_time:   null,
      status:         'confirmed',
      total_duration: '30',
    }]})
    mockBreaks()

    const result = await getNowWindow(BRANCH_ID, null, today)

    expect(result.freeNow).toBe(true)
    expect(result.windowMin).toBe(75)
  })

  it('returns window for a specific barber when barberId is passed', async () => {
    const today = FUTURE_DATE
    mockNow('12:00', today)
    // single-barber lookup (not branch lookup)
    pool.query.mockResolvedValueOnce({ rows: [{ id: BARBER_ID }] })
    mockBookings()
    mockBreaks()

    const result = await getNowWindow(null, BARBER_ID, today)

    expect(result.freeNow).toBe(true)
    expect(result.barberWindows).toHaveProperty(BARBER_ID)
  })

  it('returns freeNow:false and windowMin:0 when no active barbers found', async () => {
    const today = FUTURE_DATE
    mockNow('12:00', today)
    pool.query.mockResolvedValueOnce({ rows: [] }) // no barbers

    const result = await getNowWindow(BRANCH_ID, null, today)

    expect(result).toEqual({ freeNow: false, windowMin: 0 })
  })
})
