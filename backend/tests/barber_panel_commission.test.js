// barber_panel_commission.test.js
//
// Unit tests for Fix 2: BarberPanel.jsx commission calculation.
//
// The fixed logic (replicated here as a pure function) sums per-service commissions:
//
//   rawSvcs.reduce(
//     (acc, s) => acc + Math.round(
//       (parseFloat(s.price) || 0) * (parseFloat(s.commission_rate) || commissionRate) / 100
//     ), 0
//   )
//
// vs the OLD (buggy) flat-rate formula:
//   Math.round(total_amount * commissionRate / 100)
//
// Tests also cover the fallback branch (no rawSvcs / empty array) which still
// uses the flat total_amount calculation.

// ── Pure replicas of BarberPanel commission logic ─────────────────────────────

/**
 * calcPerServiceCommission — mirrors the fixed reduce() in BarberPanel.jsx.
 *
 * @param {Array<{price: string|number, commission_rate?: string|number}>} rawSvcs
 * @param {number} commissionRate — barber's flat fallback rate (e.g. 35)
 * @returns {number}
 */
function calcPerServiceCommission(rawSvcs, commissionRate) {
  return rawSvcs.reduce(
    (acc, s) =>
      acc +
      Math.round(
        (parseFloat(s.price) || 0) *
          (parseFloat(s.commission_rate) || commissionRate) /
          100,
      ),
    0,
  )
}

/**
 * calcFlatCommission — old (buggy) formula, kept to prove the fix produces
 * different (correct) results when service rates diverge from the barber rate.
 */
function calcFlatCommission(totalAmount, commissionRate) {
  return Math.round(parseFloat(totalAmount || 0) * commissionRate / 100)
}

/**
 * bookingCommission — mirrors the full ternary in BarberPanel.jsx.
 * Returns null for non-completed bookings.
 */
function bookingCommission(booking, commissionRate) {
  const rawSvcs = booking.booking_services || booking.services || []
  if (booking.status !== 'completed') return null
  if (Array.isArray(rawSvcs) && rawSvcs.length > 0) {
    return calcPerServiceCommission(rawSvcs, commissionRate)
  }
  return Math.round(parseFloat(booking.total_amount || 0) * commissionRate / 100)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BarberPanel commission calculation (Fix 2)', () => {
  const BARBER_COMMISSION_RATE = 35 // typical flat fallback rate

  // ── Per-service reduce ───────────────────────────────────────────────────────

  describe('calcPerServiceCommission', () => {
    it('sums commissions for a single service using its own rate', () => {
      const svcs = [{ price: '80000', commission_rate: '40' }]
      // 80000 * 40 / 100 = 32000
      expect(calcPerServiceCommission(svcs, BARBER_COMMISSION_RATE)).toBe(32_000)
    })

    it('sums commissions for multiple services each with different rates', () => {
      const svcs = [
        { price: '60000', commission_rate: '45' }, // 27000
        { price: '50000', commission_rate: '30' }, // 15000
      ]
      expect(calcPerServiceCommission(svcs, BARBER_COMMISSION_RATE)).toBe(42_000)
    })

    it('falls back to barber commissionRate when service has no commission_rate', () => {
      const svcs = [{ price: '100000' /* no commission_rate */ }]
      // fallback: 100000 * 35 / 100 = 35000
      expect(calcPerServiceCommission(svcs, BARBER_COMMISSION_RATE)).toBe(35_000)
    })

    it('falls back to barber commissionRate when commission_rate is null', () => {
      const svcs = [{ price: '100000', commission_rate: null }]
      expect(calcPerServiceCommission(svcs, BARBER_COMMISSION_RATE)).toBe(35_000)
    })

    it('falls back to barber commissionRate when commission_rate is empty string', () => {
      const svcs = [{ price: '100000', commission_rate: '' }]
      expect(calcPerServiceCommission(svcs, BARBER_COMMISSION_RATE)).toBe(35_000)
    })

    it('falls back to barber commissionRate when commission_rate is 0 (falsy)', () => {
      // parseFloat('0') === 0, which is falsy → falls back to commissionRate
      const svcs = [{ price: '100000', commission_rate: '0' }]
      expect(calcPerServiceCommission(svcs, BARBER_COMMISSION_RATE)).toBe(35_000)
    })

    it('handles mixed: some services with rates, some without', () => {
      const svcs = [
        { price: '80000', commission_rate: '40' }, // 32000
        { price: '50000'                         }, // fallback 35 → 17500
      ]
      expect(calcPerServiceCommission(svcs, BARBER_COMMISSION_RATE)).toBe(49_500)
    })

    it('rounds fractional results per service before summing', () => {
      // 33333 * 40 / 100 = 13333.2 → rounds to 13333
      const svcs = [{ price: '33333', commission_rate: '40' }]
      expect(calcPerServiceCommission(svcs, BARBER_COMMISSION_RATE)).toBe(13_333)
    })

    it('accepts numeric price and commission_rate (not just strings)', () => {
      const svcs = [{ price: 80000, commission_rate: 40 }]
      expect(calcPerServiceCommission(svcs, BARBER_COMMISSION_RATE)).toBe(32_000)
    })

    it('returns 0 for empty array', () => {
      expect(calcPerServiceCommission([], BARBER_COMMISSION_RATE)).toBe(0)
    })

    // ── Regression: old flat formula gives wrong result ──────────────────────
    it('produces different result than old flat formula when service rates differ from barber rate', () => {
      // Total = 110000; barber flat rate = 35 → old formula = 38500
      // Per-service: 60000*45/100=27000 + 50000*30/100=15000 = 42000
      const svcs = [
        { price: '60000', commission_rate: '45' },
        { price: '50000', commission_rate: '30' },
      ]
      const total = 110_000
      const perSvc = calcPerServiceCommission(svcs, BARBER_COMMISSION_RATE)
      const flat   = calcFlatCommission(total, BARBER_COMMISSION_RATE)

      expect(perSvc).toBe(42_000)
      expect(flat).toBe(38_500)
      expect(perSvc).not.toBe(flat) // they must differ — proves old formula was wrong
    })
  })

  // ── bookingCommission full ternary ───────────────────────────────────────────

  describe('bookingCommission (full BarberPanel logic)', () => {
    it('returns null for non-completed bookings', () => {
      const booking = { status: 'confirmed', booking_services: [{ price: '80000', commission_rate: '40' }], total_amount: '80000' }
      expect(bookingCommission(booking, BARBER_COMMISSION_RATE)).toBeNull()
    })

    it('returns null for in_progress bookings', () => {
      const booking = { status: 'in_progress', booking_services: [{ price: '80000', commission_rate: '40' }], total_amount: '80000' }
      expect(bookingCommission(booking, BARBER_COMMISSION_RATE)).toBeNull()
    })

    it('uses per-service reduce for completed booking with booking_services', () => {
      const booking = {
        status: 'completed',
        booking_services: [
          { price: '60000', commission_rate: '45' },
          { price: '50000', commission_rate: '30' },
        ],
        total_amount: '110000',
      }
      // Per-service: 27000 + 15000 = 42000
      expect(bookingCommission(booking, BARBER_COMMISSION_RATE)).toBe(42_000)
    })

    it('prefers booking_services over services array', () => {
      const booking = {
        status: 'completed',
        booking_services: [{ price: '80000', commission_rate: '40' }],  // should be used
        services:         [{ price: '60000', commission_rate: '50' }],  // should be ignored
        total_amount:     '80000',
      }
      // 80000 * 40/100 = 32000 (from booking_services, not services)
      expect(bookingCommission(booking, BARBER_COMMISSION_RATE)).toBe(32_000)
    })

    it('falls back to services array when booking_services is absent', () => {
      const booking = {
        status:       'completed',
        services:     [{ price: '60000', commission_rate: '50' }],
        total_amount: '60000',
      }
      // 60000 * 50/100 = 30000
      expect(bookingCommission(booking, BARBER_COMMISSION_RATE)).toBe(30_000)
    })

    it('uses flat total_amount fallback when rawSvcs is empty', () => {
      const booking = {
        status:           'completed',
        booking_services: [],
        total_amount:     '100000',
      }
      // fallback: 100000 * 35 / 100 = 35000
      expect(bookingCommission(booking, BARBER_COMMISSION_RATE)).toBe(35_000)
    })

    it('uses flat total_amount fallback when booking_services is null', () => {
      const booking = { status: 'completed', booking_services: null, total_amount: '100000' }
      expect(bookingCommission(booking, BARBER_COMMISSION_RATE)).toBe(35_000)
    })

    it('handles zero total_amount gracefully', () => {
      const booking = { status: 'completed', booking_services: null, total_amount: '0' }
      expect(bookingCommission(booking, BARBER_COMMISSION_RATE)).toBe(0)
    })
  })
})
