// weeklyOffQuota.test.js
//
// Unit tests for the weekly off quota feature:
//   1. periodQuota formula  — used in payroll.js route
//   2. excusedOver deduction — payroll.js deduction logic
//   3. autoOffClassifier offType decision — autoOffClassifier.js

// ── Pure formula helpers (mirrors payroll.js exactly) ────────────────────────

/**
 * Calculate how many excused offs are free in a payroll period.
 * @param {number} offQuotaPerWeek - from payroll_settings.off_quota_per_week
 * @param {string} period_from     - 'YYYY-MM-DD'
 * @param {string} period_to       - 'YYYY-MM-DD'
 * @returns {number} periodQuota
 */
function calcPeriodQuota(offQuotaPerWeek, period_from, period_to) {
  const periodDays = Math.round((new Date(period_to) - new Date(period_from)) / 86400000) + 1
  return Math.floor(periodDays / 7) * offQuotaPerWeek
}

/**
 * Calculate how many excused offs exceed the quota (and therefore attract a deduction).
 * @param {number} excusedDays  - total excused off days in the period
 * @param {number} periodQuota  - free quota for this period
 * @returns {number} excusedOver
 */
function calcExcusedOver(excusedDays, periodQuota) {
  return Math.max(0, excusedDays - periodQuota)
}

/**
 * Determine the off type for an auto-classified absence.
 * @param {number} autoExcusedCount - auto-excused offs already in the Mon–Sun week
 * @param {number} weeklyQuota      - from payroll_settings.off_quota_per_week
 * @returns {'excused'|'inexcused'}
 */
function calcOffType(autoExcusedCount, weeklyQuota) {
  return autoExcusedCount < weeklyQuota ? 'excused' : 'inexcused'
}

// ── periodQuota formula ───────────────────────────────────────────────────────

describe('periodQuota formula', () => {
  test('quota=1, 5-day period → 0 (floor(5/7)=0)', () => {
    // 2026-05-11 to 2026-05-15 = 5 days
    expect(calcPeriodQuota(1, '2026-05-11', '2026-05-15')).toBe(0)
  })

  test('quota=1, 7-day period → 1 (floor(7/7)=1)', () => {
    // 2026-05-11 to 2026-05-17 = 7 days
    expect(calcPeriodQuota(1, '2026-05-11', '2026-05-17')).toBe(1)
  })

  test('quota=1, 12-day period → 1 (floor(12/7)=1)', () => {
    // 2026-05-01 to 2026-05-12 = 12 days
    expect(calcPeriodQuota(1, '2026-05-01', '2026-05-12')).toBe(1)
  })

  test('quota=1, 14-day period → 2 (floor(14/7)=2)', () => {
    // 2026-05-01 to 2026-05-14 = 14 days
    expect(calcPeriodQuota(1, '2026-05-01', '2026-05-14')).toBe(2)
  })

  test('quota=1, 30-day period → 4 (floor(30/7)=4)', () => {
    // 2026-05-01 to 2026-05-30 = 30 days
    expect(calcPeriodQuota(1, '2026-05-01', '2026-05-30')).toBe(4)
  })

  test('quota=2, 14-day period → 4 (floor(14/7)*2=4)', () => {
    // 2026-05-01 to 2026-05-14 = 14 days
    expect(calcPeriodQuota(2, '2026-05-01', '2026-05-14')).toBe(4)
  })

  test('quota=0, 30-day period → 0 (all excused offs are charged)', () => {
    expect(calcPeriodQuota(0, '2026-05-01', '2026-05-30')).toBe(0)
  })

  test('quota=0, 7-day period → 0', () => {
    expect(calcPeriodQuota(0, '2026-05-11', '2026-05-17')).toBe(0)
  })

  test('quota=3, 21-day period → 9 (floor(21/7)*3=9)', () => {
    expect(calcPeriodQuota(3, '2026-05-01', '2026-05-21')).toBe(9)
  })

  test('single-day period → 0 regardless of quota (floor(1/7)=0)', () => {
    expect(calcPeriodQuota(1, '2026-05-15', '2026-05-15')).toBe(0)
    expect(calcPeriodQuota(5, '2026-05-15', '2026-05-15')).toBe(0)
  })
})

// ── excusedOver deduction ─────────────────────────────────────────────────────

describe('excusedOver deduction', () => {
  test('3 excused offs, periodQuota=2 → excusedOver=1 (1 charged)', () => {
    expect(calcExcusedOver(3, 2)).toBe(1)
  })

  test('2 excused offs, periodQuota=2 → excusedOver=0 (within quota, nothing charged)', () => {
    expect(calcExcusedOver(2, 2)).toBe(0)
  })

  test('1 excused off, periodQuota=0 → excusedOver=1 (quota=0 means all are charged)', () => {
    expect(calcExcusedOver(1, 0)).toBe(1)
  })

  test('0 excused offs, periodQuota=2 → excusedOver=0', () => {
    expect(calcExcusedOver(0, 2)).toBe(0)
  })

  test('5 excused offs, periodQuota=4 → excusedOver=1', () => {
    expect(calcExcusedOver(5, 4)).toBe(1)
  })

  test('0 excused offs, periodQuota=0 → excusedOver=0 (nothing to charge)', () => {
    expect(calcExcusedOver(0, 0)).toBe(0)
  })

  test('excusedDays < periodQuota → never goes negative (clamped at 0)', () => {
    expect(calcExcusedOver(1, 4)).toBe(0)
  })

  test('large excused count: 10 excused offs, periodQuota=4 → excusedOver=6', () => {
    expect(calcExcusedOver(10, 4)).toBe(6)
  })
})

// ── autoOffClassifier offType decision ───────────────────────────────────────

describe('autoOffClassifier — offType decision (autoExcusedCount < weeklyQuota)', () => {
  describe('weeklyQuota=1', () => {
    test('0 prior auto-excused → excused (0 < 1)', () => {
      expect(calcOffType(0, 1)).toBe('excused')
    })

    test('1 prior auto-excused → inexcused (1 is not < 1)', () => {
      expect(calcOffType(1, 1)).toBe('inexcused')
    })

    test('2 prior auto-excused → inexcused (2 > 1)', () => {
      expect(calcOffType(2, 1)).toBe('inexcused')
    })
  })

  describe('weeklyQuota=2', () => {
    test('0 prior auto-excused → excused (0 < 2)', () => {
      expect(calcOffType(0, 2)).toBe('excused')
    })

    test('1 prior auto-excused → excused (1 < 2)', () => {
      expect(calcOffType(1, 2)).toBe('excused')
    })

    test('2 prior auto-excused → inexcused (2 is not < 2)', () => {
      expect(calcOffType(2, 2)).toBe('inexcused')
    })

    test('3 prior auto-excused → inexcused (3 > 2)', () => {
      expect(calcOffType(3, 2)).toBe('inexcused')
    })
  })

  describe('weeklyQuota=0 (no free quota)', () => {
    test('0 prior auto-excused → inexcused (0 is not < 0)', () => {
      expect(calcOffType(0, 0)).toBe('inexcused')
    })

    test('any count → always inexcused', () => {
      expect(calcOffType(1, 0)).toBe('inexcused')
      expect(calcOffType(5, 0)).toBe('inexcused')
    })
  })

  describe('weeklyQuota=3', () => {
    test('0, 1, 2 prior auto-excused → excused', () => {
      expect(calcOffType(0, 3)).toBe('excused')
      expect(calcOffType(1, 3)).toBe('excused')
      expect(calcOffType(2, 3)).toBe('excused')
    })

    test('3 prior auto-excused → inexcused (quota exhausted)', () => {
      expect(calcOffType(3, 3)).toBe('inexcused')
    })
  })
})

// ── Integration: periodQuota feeds into excusedOver correctly ────────────────

describe('periodQuota → excusedOver integration', () => {
  test('quota=1, 7-day period, 1 excused off → periodQuota=1, excusedOver=0', () => {
    const pq = calcPeriodQuota(1, '2026-05-11', '2026-05-17')
    expect(pq).toBe(1)
    expect(calcExcusedOver(1, pq)).toBe(0)
  })

  test('quota=1, 7-day period, 2 excused offs → periodQuota=1, excusedOver=1', () => {
    const pq = calcPeriodQuota(1, '2026-05-11', '2026-05-17')
    expect(pq).toBe(1)
    expect(calcExcusedOver(2, pq)).toBe(1)
  })

  test('quota=2, 14-day period, 3 excused offs → periodQuota=4, excusedOver=0', () => {
    const pq = calcPeriodQuota(2, '2026-05-01', '2026-05-14')
    expect(pq).toBe(4)
    expect(calcExcusedOver(3, pq)).toBe(0)
  })

  test('quota=0, any period, 1 excused off → periodQuota=0, excusedOver=1', () => {
    const pq = calcPeriodQuota(0, '2026-05-01', '2026-05-30')
    expect(pq).toBe(0)
    expect(calcExcusedOver(1, pq)).toBe(1)
  })

  test('quota=1, 30-day period, 4 excused offs → periodQuota=4, excusedOver=0 (all within quota)', () => {
    const pq = calcPeriodQuota(1, '2026-05-01', '2026-05-30')
    expect(pq).toBe(4)
    expect(calcExcusedOver(4, pq)).toBe(0)
  })

  test('quota=1, 30-day period, 5 excused offs → periodQuota=4, excusedOver=1', () => {
    const pq = calcPeriodQuota(1, '2026-05-01', '2026-05-30')
    expect(pq).toBe(4)
    expect(calcExcusedOver(5, pq)).toBe(1)
  })
})
