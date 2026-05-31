/**
 * DateRangePicker logic — pure-function unit tests
 *
 * We extract the state-machine logic from DateRangePicker.jsx into plain
 * functions so we can exercise them under backend Jest (no DOM required).
 *
 * Mirrors the exact handleDay logic from frontend/src/shared/DateRangePicker.jsx.
 */

// ── State machine extracted verbatim from the component ───────────────────────

/**
 * Pure simulation of handleDay.
 *
 * @param {object} state  - { phase: 'idle'|'selecting', rangeStart: string|null }
 * @param {string} iso    - the date clicked (YYYY-MM-DD)
 * @returns {{ newState: object, onChange: [string,string]|null, closed: boolean }}
 */
function handleDay(state, iso) {
  const { phase, rangeStart } = state

  if (phase === 'idle') {
    // First click: single-day selection, enter selecting phase, do NOT close
    return {
      newState: { phase: 'selecting', rangeStart: iso },
      onChange: [iso, iso],
      closed: false,
    }
  } else {
    // Second click
    if (iso > rangeStart) {
      // Extend range — close
      return {
        newState: { phase: 'idle', rangeStart: null },
        onChange: [rangeStart, iso],
        closed: true,
      }
    } else {
      // Reset: restart with new anchor, stay open
      return {
        newState: { phase: 'selecting', rangeStart: iso },
        onChange: [iso, iso],
        closed: false,
      }
    }
  }
}

/**
 * Simulates closeAndReset (backdrop click or toggle-close).
 * Always resets phase to 'idle' and clears rangeStart.
 */
function closeAndReset() {
  return { phase: 'idle', rangeStart: null }
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function idle() { return { phase: 'idle', rangeStart: null } }
function selecting(start) { return { phase: 'selecting', rangeStart: start } }

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('DateRangePicker — handleDay logic', () => {

  // ── Single-click (first click) ──────────────────────────────────────────────

  describe('first click (phase = idle)', () => {
    test('fires onChange with (date, date) — not (date, null)', () => {
      const result = handleDay(idle(), '2025-06-01')
      expect(result.onChange).toEqual(['2025-06-01', '2025-06-01'])
    })

    test('transitions phase to selecting', () => {
      const result = handleDay(idle(), '2025-06-01')
      expect(result.newState.phase).toBe('selecting')
    })

    test('sets rangeStart to the clicked date', () => {
      const result = handleDay(idle(), '2025-06-15')
      expect(result.newState.rangeStart).toBe('2025-06-15')
    })

    test('does NOT close the picker', () => {
      const result = handleDay(idle(), '2025-06-01')
      expect(result.closed).toBe(false)
    })

    test('works for any valid ISO date', () => {
      const result = handleDay(idle(), '2024-12-31')
      expect(result.onChange).toEqual(['2024-12-31', '2024-12-31'])
      expect(result.newState.rangeStart).toBe('2024-12-31')
    })
  })

  // ── Range extension (second click on later date) ─────────────────────────────

  describe('second click on later date (range extension)', () => {
    test('fires onChange with (rangeStart, clickedDate)', () => {
      const result = handleDay(selecting('2025-06-01'), '2025-06-10')
      expect(result.onChange).toEqual(['2025-06-01', '2025-06-10'])
    })

    test('closes the picker after range extension', () => {
      const result = handleDay(selecting('2025-06-01'), '2025-06-10')
      expect(result.closed).toBe(true)
    })

    test('resets phase to idle after range extension', () => {
      const result = handleDay(selecting('2025-06-01'), '2025-06-10')
      expect(result.newState.phase).toBe('idle')
    })

    test('clears rangeStart after range extension', () => {
      const result = handleDay(selecting('2025-06-01'), '2025-06-10')
      expect(result.newState.rangeStart).toBeNull()
    })

    test('preserves correct range order (start < end)', () => {
      const result = handleDay(selecting('2025-01-05'), '2025-03-20')
      expect(result.onChange[0]).toBe('2025-01-05')
      expect(result.onChange[1]).toBe('2025-03-20')
    })

    test('cross-month range works correctly', () => {
      const result = handleDay(selecting('2025-05-28'), '2025-06-03')
      expect(result.onChange).toEqual(['2025-05-28', '2025-06-03'])
      expect(result.closed).toBe(true)
    })

    test('cross-year range works correctly', () => {
      const result = handleDay(selecting('2024-12-20'), '2025-01-05')
      expect(result.onChange).toEqual(['2024-12-20', '2025-01-05'])
      expect(result.closed).toBe(true)
    })
  })

  // ── Reset (second click on same or earlier date) ─────────────────────────────

  describe('second click on same or earlier date (reset)', () => {
    test('clicking the same date restarts with that date as new anchor', () => {
      const result = handleDay(selecting('2025-06-10'), '2025-06-10')
      // iso === rangeStart — not strictly greater, so falls into reset branch
      expect(result.onChange).toEqual(['2025-06-10', '2025-06-10'])
      expect(result.newState.rangeStart).toBe('2025-06-10')
      expect(result.newState.phase).toBe('selecting')
      expect(result.closed).toBe(false)
    })

    test('clicking an earlier date restarts with the earlier date as anchor', () => {
      const result = handleDay(selecting('2025-06-15'), '2025-06-05')
      expect(result.onChange).toEqual(['2025-06-05', '2025-06-05'])
      expect(result.newState.rangeStart).toBe('2025-06-05')
      expect(result.newState.phase).toBe('selecting')
      expect(result.closed).toBe(false)
    })

    test('does NOT close the picker on reset', () => {
      const result = handleDay(selecting('2025-06-15'), '2025-06-01')
      expect(result.closed).toBe(false)
    })

    test('fires onChange with (newDate, newDate) on reset', () => {
      const result = handleDay(selecting('2025-06-20'), '2025-06-10')
      expect(result.onChange).toEqual(['2025-06-10', '2025-06-10'])
    })

    test('stays in selecting phase after reset', () => {
      const result = handleDay(selecting('2025-06-20'), '2025-06-10')
      expect(result.newState.phase).toBe('selecting')
    })
  })

  // ── closeAndReset ────────────────────────────────────────────────────────────

  describe('closeAndReset (backdrop click / toggle close)', () => {
    test('resets phase to idle', () => {
      const s = closeAndReset()
      expect(s.phase).toBe('idle')
    })

    test('clears rangeStart', () => {
      const s = closeAndReset()
      expect(s.rangeStart).toBeNull()
    })
  })

  // ── Multi-click sequence ─────────────────────────────────────────────────────

  describe('multi-click sequences', () => {
    test('complete single-day selection flow', () => {
      let state = idle()

      const r1 = handleDay(state, '2025-06-10')
      state = r1.newState
      expect(r1.onChange).toEqual(['2025-06-10', '2025-06-10'])
      expect(state.phase).toBe('selecting')
      expect(r1.closed).toBe(false)

      // Same date second click = reset (stays selecting)
      const r2 = handleDay(state, '2025-06-10')
      state = r2.newState
      expect(r2.onChange).toEqual(['2025-06-10', '2025-06-10'])
      expect(state.phase).toBe('selecting')
    })

    test('typical range selection: click start, click end', () => {
      let state = idle()
      let lastOnChange = null

      const r1 = handleDay(state, '2025-06-01')
      state = r1.newState
      lastOnChange = r1.onChange

      const r2 = handleDay(state, '2025-06-15')
      state = r2.newState
      lastOnChange = r2.onChange

      expect(lastOnChange).toEqual(['2025-06-01', '2025-06-15'])
      expect(r2.closed).toBe(true)
      expect(state.phase).toBe('idle')
    })

    test('restart after wrong start: click start, click earlier, click end', () => {
      let state = idle()

      const r1 = handleDay(state, '2025-06-20')  // first click
      state = r1.newState

      const r2 = handleDay(state, '2025-06-05')  // oops — earlier, resets
      state = r2.newState
      expect(r2.onChange).toEqual(['2025-06-05', '2025-06-05'])
      expect(state.rangeStart).toBe('2025-06-05')

      const r3 = handleDay(state, '2025-06-25')  // extend range from new anchor
      state = r3.newState
      expect(r3.onChange).toEqual(['2025-06-05', '2025-06-25'])
      expect(r3.closed).toBe(true)
    })

    test('after range closes, new click starts fresh from idle', () => {
      let state = idle()

      handleDay(state, '2025-06-01')
      state = { phase: 'selecting', rangeStart: '2025-06-01' }  // simulate first click
      const r2 = handleDay(state, '2025-06-10')
      state = r2.newState  // idle

      // Now another click should behave like idle (first click again)
      const r3 = handleDay(state, '2025-07-01')
      expect(r3.onChange).toEqual(['2025-07-01', '2025-07-01'])
      expect(r3.newState.phase).toBe('selecting')
      expect(r3.closed).toBe(false)
    })
  })
})

// ── Expense stat-box computation — pure logic ──────────────────────────────────

/**
 * Mirrors the stat-box computation from Expenses.jsx:
 * (the IIFE inside the JSX that computes totalSpend / regularSum / etc.)
 */
function computeStats(expenses) {
  const totalSpend    = expenses.reduce((a, e) => a + Number(e.amount || 0), 0)
  const regularExps   = expenses.filter(e => e.type === 'regular')
  const inventoryExps = expenses.filter(e => e.type === 'inventory')
  const kasbonExps    = expenses.filter(e => e.type === 'kasbon')
  const regularSum    = regularExps.reduce((a, e) => a + Number(e.amount || 0), 0)
  const inventorySum  = inventoryExps.reduce((a, e) => a + Number(e.amount || 0), 0)
  const kasbonSum     = kasbonExps.reduce((a, e) => a + Number(e.amount || 0), 0)
  return {
    totalSpend,
    regularSum,   regularCount:   regularExps.length,
    inventorySum, inventoryCount: inventoryExps.length,
    kasbonSum,    kasbonCount:    kasbonExps.length,
    totalCount:   expenses.length,
  }
}

describe('Expenses stat-box computation', () => {

  test('all zeros for empty expenses array', () => {
    const s = computeStats([])
    expect(s.totalSpend).toBe(0)
    expect(s.regularSum).toBe(0)
    expect(s.inventorySum).toBe(0)
    expect(s.kasbonSum).toBe(0)
    expect(s.totalCount).toBe(0)
  })

  test('totalSpend is sum of all expense amounts regardless of type', () => {
    const expenses = [
      { type: 'regular',   amount: 50000 },
      { type: 'inventory', amount: 200000 },
      { type: 'kasbon',    amount: 100000 },
    ]
    const s = computeStats(expenses)
    expect(s.totalSpend).toBe(350000)
  })

  test('regular sum includes only regular expenses', () => {
    const expenses = [
      { type: 'regular',   amount: 30000 },
      { type: 'regular',   amount: 20000 },
      { type: 'inventory', amount: 100000 },
      { type: 'kasbon',    amount: 50000 },
    ]
    const s = computeStats(expenses)
    expect(s.regularSum).toBe(50000)
    expect(s.regularCount).toBe(2)
  })

  test('inventory sum includes only inventory expenses', () => {
    const expenses = [
      { type: 'regular',   amount: 30000 },
      { type: 'inventory', amount: 80000 },
      { type: 'inventory', amount: 120000 },
    ]
    const s = computeStats(expenses)
    expect(s.inventorySum).toBe(200000)
    expect(s.inventoryCount).toBe(2)
  })

  test('kasbon sum includes only kasbon expenses', () => {
    const expenses = [
      { type: 'regular',   amount: 30000 },
      { type: 'kasbon',    amount: 150000 },
      { type: 'kasbon',    amount: 50000 },
    ]
    const s = computeStats(expenses)
    expect(s.kasbonSum).toBe(200000)
    expect(s.kasbonCount).toBe(2)
  })

  test('sums are independent: regular + inventory + kasbon = totalSpend', () => {
    const expenses = [
      { type: 'regular',   amount: 10000 },
      { type: 'inventory', amount: 20000 },
      { type: 'kasbon',    amount: 30000 },
    ]
    const s = computeStats(expenses)
    expect(s.regularSum + s.inventorySum + s.kasbonSum).toBe(s.totalSpend)
  })

  test('handles missing amount field (treats as 0)', () => {
    const expenses = [
      { type: 'regular' },                  // no amount field
      { type: 'regular', amount: null },    // null
      { type: 'regular', amount: '5000' },  // string amount
    ]
    const s = computeStats(expenses)
    expect(s.regularSum).toBe(5000)
    expect(s.regularCount).toBe(3)
  })

  test('reactive: adding an expense changes the relevant sums', () => {
    const initial = [{ type: 'regular', amount: 50000 }]
    const s1 = computeStats(initial)
    expect(s1.totalSpend).toBe(50000)
    expect(s1.inventorySum).toBe(0)

    const updated = [...initial, { type: 'inventory', amount: 30000 }]
    const s2 = computeStats(updated)
    expect(s2.totalSpend).toBe(80000)
    expect(s2.inventorySum).toBe(30000)
    expect(s2.regularSum).toBe(50000)  // unchanged
  })

  test('reactive: removing an expense reduces the correct sum', () => {
    const expenses = [
      { id: 1, type: 'regular',   amount: 50000 },
      { id: 2, type: 'inventory', amount: 30000 },
    ]
    const s1 = computeStats(expenses)
    expect(s1.totalSpend).toBe(80000)

    const after = expenses.filter(e => e.id !== 1)
    const s2 = computeStats(after)
    expect(s2.totalSpend).toBe(30000)
    expect(s2.regularSum).toBe(0)
    expect(s2.inventorySum).toBe(30000)
  })

  test('counts are correct for all-regular, all-inventory, all-kasbon scenarios', () => {
    const allRegular = Array.from({ length: 5 }, (_, i) => ({ type: 'regular', amount: 1000 * i }))
    expect(computeStats(allRegular).regularCount).toBe(5)
    expect(computeStats(allRegular).inventoryCount).toBe(0)
    expect(computeStats(allRegular).kasbonCount).toBe(0)

    const allKasbon = [{ type: 'kasbon', amount: 100 }]
    const sk = computeStats(allKasbon)
    expect(sk.kasbonCount).toBe(1)
    expect(sk.regularCount).toBe(0)
    expect(sk.inventoryCount).toBe(0)
  })
})

// ── getPeriodDates — pure logic ────────────────────────────────────────────────

/**
 * Mirrors getPeriodDates from Expenses.jsx exactly.
 */
function getPeriodDates(period, customFrom, customTo) {
  if (period === 'custom') return { from: customFrom, to: customTo }
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (period === 'today') { const t = iso(now); return { from: t, to: t } }
  if (period === 'week') {
    const day = now.getDay()
    const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { from: iso(mon), to: iso(sun) }
  }
  // Default: month
  return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: iso(now) }
}

describe('getPeriodDates', () => {
  test('today: from === to === today ISO', () => {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const todayISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const { from, to } = getPeriodDates('today', null, null)
    expect(from).toBe(todayISO)
    expect(to).toBe(todayISO)
  })

  test('month: from is first day of current month, to is today', () => {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const todayISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const firstOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    const { from, to } = getPeriodDates('month', null, null)
    expect(from).toBe(firstOfMonth)
    expect(to).toBe(todayISO)
  })

  test('week: from <= to, span is at most 7 days', () => {
    const { from, to } = getPeriodDates('week', null, null)
    const f = new Date(from)
    const t = new Date(to)
    expect(t >= f).toBe(true)
    const diffDays = (t - f) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(6)  // Mon–Sun span
  })

  test('week: from is Monday (getDay() === 1)', () => {
    const { from } = getPeriodDates('week', null, null)
    const d = new Date(from)
    expect(d.getDay()).toBe(1)  // 1 = Monday
  })

  test('week: to is Sunday (getDay() === 0)', () => {
    const { to } = getPeriodDates('week', null, null)
    const d = new Date(to)
    expect(d.getDay()).toBe(0)  // 0 = Sunday
  })

  test('custom: returns the provided from/to unchanged', () => {
    const { from, to } = getPeriodDates('custom', '2025-03-01', '2025-03-15')
    expect(from).toBe('2025-03-01')
    expect(to).toBe('2025-03-15')
  })

  test('custom with null values: returns null/null', () => {
    const { from, to } = getPeriodDates('custom', null, null)
    expect(from).toBeNull()
    expect(to).toBeNull()
  })
})
