/**
 * DateRangePicker E2E tests
 *
 * Tests the rendered DateRangePicker component via the Expenses screen, which
 * exposes the picker through the PeriodFilter "Custom" button.
 *
 * Key behavioral facts established by inspecting the component:
 *  - When switching to Custom, filterFrom/filterTo carry over from the previous
 *    period, so the trigger button shows "📅 <date> – <date> ✕" not "Pick range".
 *    To get an empty picker we must first click ✕ to clear the dates.
 *  - "Pick range" label only appears when both from and to are null.
 *
 * Tests focus on:
 *  - Picker trigger is present and opens the calendar panel
 *  - Clearing the range restores "Pick range" label
 *  - First click (from empty state) fires onChange with (date, date) — picker stays open
 *  - Second click on later date fires onChange with (start, end) and closes picker
 *  - Second click on same/earlier date restarts (reset) and keeps picker open
 *  - Phase resets when picker is closed via backdrop
 *  - Month navigation (‹ / ›)
 */

import { test, expect } from '@playwright/test'

// ── Shared fixtures ────────────────────────────────────────────────────────────

const BRANCH_ID = 'c067bd6c-ee96-4b70-b8d6-ed71159dd74c'
const USER_ID   = 'user-uuid-001'

const mockUser     = { id: USER_ID, name: 'Agrelia', role: 'owner', email: 'test@example.com' }
const mockBranches = [{ id: BRANCH_ID, name: 'Kerobokan' }]

async function setupExpenses(page, expenseList = []) {
  await page.addInitScript(() => {
    localStorage.setItem('bercut_token', 'TEST-ADMIN-TOKEN')
  })
  await page.route('**/api/auth/me', r => r.fulfill({ json: mockUser }))
  await page.route('**/api/branches', r => r.fulfill({ json: mockBranches }))
  await page.route('**/api/expenses/categories', r => {
    if (r.request().method() === 'GET') r.fulfill({ json: [] }); else r.continue()
  })
  await page.route('**/api/inventory/items**', r => r.fulfill({ json: [] }))
  await page.route('**/api/barbers**', r => r.fulfill({ json: [] }))
  await page.route('**/api/expenses?**', r => r.fulfill({ json: expenseList }))
  await page.route('**/api/settings/users/**', r => r.fulfill({ json: [] }))
  await page.route('**/api/events**', r => r.fulfill({ body: '', contentType: 'text/event-stream' }))
}

async function openExpenses(page) {
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Expenses' }).click()
  await expect(page.getByText('Log operating costs, stock purchases, and salary advances')).toBeVisible()
}

/**
 * Switch to Custom period. The DateRangePicker trigger will appear.
 * Because filterFrom/filterTo carry over from the previous preset, the trigger
 * shows the existing range — NOT "Pick range". We just confirm the 📅 button exists.
 */
async function switchToCustomPeriod(page) {
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  // The DateRangePicker trigger button contains 📅 emoji
  await expect(page.locator('button').filter({ hasText: '📅' })).toBeVisible()
}

/**
 * Clear the existing date range by clicking the ✕ inside the picker trigger.
 * After this the trigger shows "📅 Pick range" and from/to are both null.
 */
async function clearPickerRange(page) {
  // The ✕ clear span is inside the trigger button — use force to click the nested span
  const clearBtn = page.locator('button').filter({ hasText: '📅' }).locator('span').filter({ hasText: '✕' })
  await clearBtn.click({ force: true })
  await expect(page.getByRole('button', { name: /Pick range/i })).toBeVisible({ timeout: 3000 })
}

/**
 * Open the calendar panel by clicking the 📅 trigger button.
 */
async function openPicker(page) {
  await page.locator('button').filter({ hasText: '📅' }).click()
  // Wait for calendar to render — either idle hint or range display footer
  await expect(page.locator('button').filter({ hasText: '‹' })).toBeVisible({ timeout: 3000 })
}

/**
 * Click a calendar day cell by its day number.
 * Day cells are plain-text divs inside the picker panel.
 * We filter out multi-digit containment by using exact-match regex.
 */
async function clickCalendarDay(page, dayNumber) {
  // Find divs with exactly this number as text content — inside the calendar dropdown
  const dayCells = page.locator('div').filter({ hasText: new RegExp(`^${dayNumber}$`) })
  await dayCells.first().click({ timeout: 3000 })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('DateRangePicker — trigger and initial state', () => {
  test.beforeEach(async ({ page }) => {
    await setupExpenses(page)
    await openExpenses(page)
    await switchToCustomPeriod(page)
  })

  test('DateRangePicker trigger button is visible after switching to Custom', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: '📅' })).toBeVisible()
  })

  test('trigger shows inherited date range from previous preset (not Pick range)', async ({ page }) => {
    // When switching from This Month → Custom, the current month range is shown
    // The trigger text contains "–" separating from/to dates
    await expect(page.locator('button').filter({ hasText: '📅' })).toContainText('–')
  })

  test('clearing the range restores "Pick range" label', async ({ page }) => {
    await clearPickerRange(page)
    await expect(page.getByRole('button', { name: /Pick range/i })).toBeVisible()
  })

  test('trigger button with active range shows ✕ clear button', async ({ page }) => {
    // The trigger has a ✕ span when from/to are set
    await expect(page.locator('button').filter({ hasText: '📅' }).locator('span', { hasText: '✕' })).toBeVisible()
  })

  test('picker panel opens when trigger is clicked', async ({ page }) => {
    await openPicker(page)
    // Calendar navigation buttons and month heading are visible
    await expect(page.locator('button').filter({ hasText: '‹' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '›' })).toBeVisible()
  })

  test('picker shows two calendar months when open', async ({ page }) => {
    await openPicker(page)
    // Two month headings rendered by renderMonth
    const monthHeadings = page.locator('div').filter({
      hasText: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/
    })
    await expect(monthHeadings).toHaveCount(2)
  })
})

test.describe('DateRangePicker — idle state (after clearing)', () => {
  test.beforeEach(async ({ page }) => {
    await setupExpenses(page)
    await openExpenses(page)
    await switchToCustomPeriod(page)
    await clearPickerRange(page)   // Now from=to=null, shows "Pick range"
    await openPicker(page)         // Open calendar panel
  })

  test('idle state shows "Click a date to select" hint', async ({ page }) => {
    await expect(page.getByText('Click a date to select · click another to set a range')).toBeVisible()
  })

  test('first date click shows "selecting" hint (phase transitions to selecting)', async ({ page }) => {
    await clickCalendarDay(page, 15)
    await expect(page.getByText('Click another date to extend to a range')).toBeVisible({ timeout: 3000 })
  })

  test('first date click does NOT close the picker', async ({ page }) => {
    await clickCalendarDay(page, 15)
    // Calendar nav buttons should still be visible
    await expect(page.locator('button').filter({ hasText: '‹' })).toBeVisible({ timeout: 3000 })
  })

  test('first date click updates trigger label to show a date (from=to=clicked date)', async ({ page }) => {
    await clickCalendarDay(page, 10)
    // After first click, trigger should no longer say "Pick range" — it shows the selected date
    // The trigger button text should contain the date (label contains "–" for same-day range)
    await expect(page.getByText('Click another date to extend to a range')).toBeVisible({ timeout: 3000 })
    // The trigger trigger button inside PeriodFilter should show a date, not "Pick range"
    // (The picker is still open, trigger text is updated behind it)
    await expect(page.getByRole('button', { name: /Pick range/i })).not.toBeVisible()
  })
})

test.describe('DateRangePicker — range extension (second click on later date)', () => {
  test.beforeEach(async ({ page }) => {
    await setupExpenses(page)
    await openExpenses(page)
    await switchToCustomPeriod(page)
    await clearPickerRange(page)
    await openPicker(page)
    // First click: day 5 to enter selecting phase
    await clickCalendarDay(page, 5)
    await expect(page.getByText('Click another date to extend to a range')).toBeVisible({ timeout: 3000 })
  })

  test('second click on later day closes the picker', async ({ page }) => {
    await clickCalendarDay(page, 20)
    // Calendar nav buttons gone (picker closed)
    await expect(page.locator('button').filter({ hasText: '‹' })).not.toBeVisible({ timeout: 3000 })
  })

  test('second click on later day shows "–" range in trigger label', async ({ page }) => {
    await clickCalendarDay(page, 20)
    await expect(page.locator('button').filter({ hasText: '📅' })).toContainText('–', { timeout: 3000 })
  })

  test('second click on later day removes "selecting" hint', async ({ page }) => {
    await clickCalendarDay(page, 20)
    await expect(page.getByText('Click another date to extend to a range')).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('DateRangePicker — reset (second click on same or earlier date)', () => {
  test.beforeEach(async ({ page }) => {
    await setupExpenses(page)
    await openExpenses(page)
    await switchToCustomPeriod(page)
    await clearPickerRange(page)
    await openPicker(page)
    // First click: day 20 to enter selecting phase
    await clickCalendarDay(page, 20)
    await expect(page.getByText('Click another date to extend to a range')).toBeVisible({ timeout: 3000 })
  })

  test('clicking an earlier day keeps picker open (does not close)', async ({ page }) => {
    // Click day 10 — earlier than 20, should reset not extend
    await clickCalendarDay(page, 10)
    // Picker stays open — still in selecting phase
    await expect(page.locator('button').filter({ hasText: '‹' })).toBeVisible({ timeout: 3000 })
  })

  test('clicking an earlier day keeps "selecting" hint visible (stays in selecting phase)', async ({ page }) => {
    await clickCalendarDay(page, 10)
    // Should still show "Click another date to extend to a range"
    await expect(page.getByText('Click another date to extend to a range')).toBeVisible({ timeout: 3000 })
  })

  test('after reset, clicking a later day closes picker and shows range', async ({ page }) => {
    // Reset to day 5
    await clickCalendarDay(page, 5)
    await expect(page.getByText('Click another date to extend to a range')).toBeVisible({ timeout: 3000 })
    // Now extend to day 25
    await clickCalendarDay(page, 25)
    await expect(page.locator('button').filter({ hasText: '‹' })).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('button').filter({ hasText: '📅' })).toContainText('–', { timeout: 3000 })
  })
})

test.describe('DateRangePicker — phase reset on close', () => {
  test('phase resets to idle (selecting hint gone) when picker is closed via backdrop', async ({ page }) => {
    // Behavior: after first click, phase=selecting, rangeStart=dayN, and onChange fires
    // setting parent from=to=dayN. Backdrop close calls closeAndReset: phase→idle,
    // rangeStart→null. But from/to remain set in parent. So on re-open:
    //   • "selecting" hint does NOT appear (phase is idle)
    //   • "Clear" footer appears (because phase=idle AND from && to are set)
    //   • "Click a date to select" hint does NOT appear (only shown when !from)
    await setupExpenses(page)
    await openExpenses(page)
    await switchToCustomPeriod(page)
    await clearPickerRange(page)
    await openPicker(page)

    // Enter selecting phase via first click
    await clickCalendarDay(page, 10)
    await expect(page.getByText('Click another date to extend to a range')).toBeVisible({ timeout: 3000 })

    // Close via backdrop (click top-left corner of viewport, outside the picker panel)
    await page.mouse.click(10, 10)
    // Selecting hint disappears (picker closed)
    await expect(page.getByText('Click another date to extend to a range')).not.toBeVisible({ timeout: 3000 })

    // Re-open picker — phase is idle, from/to set → "Clear" footer is shown (not "selecting" hint)
    await openPicker(page)
    await expect(page.getByText('Click another date to extend to a range')).not.toBeVisible()
    // "Clear" button appears in idle state when from && to are set
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible({ timeout: 3000 })
  })

  test('phase resets to idle when picker is closed by completing a range selection', async ({ page }) => {
    // After completing a range (second click on later date), closeAndReset is called:
    // phase→idle, rangeStart→null. Re-opening shows idle state with range set → "Clear" footer.
    await setupExpenses(page)
    await openExpenses(page)
    await switchToCustomPeriod(page)
    await clearPickerRange(page)
    await openPicker(page)

    // Select a range: click day 5, then day 20
    await clickCalendarDay(page, 5)
    await expect(page.getByText('Click another date to extend to a range')).toBeVisible({ timeout: 3000 })
    await clickCalendarDay(page, 20)

    // Picker closed — selecting hint gone
    await expect(page.locator('button').filter({ hasText: '‹' })).not.toBeVisible({ timeout: 3000 })

    // Re-open picker — handleOpenToggle resets phase to idle and rangeStart to null on open.
    // from/to are set (day5–day20), so idle footer with "Clear" button appears.
    await openPicker(page)
    await expect(page.getByText('Click another date to extend to a range')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible({ timeout: 3000 })
  })

  test('NOTE: trigger button is blocked by backdrop while picker is open', async ({ page }) => {
    // Documents a known behavior: when the calendar panel is open, the backdrop div
    // at zIndex:99 covers the trigger button (which has no explicit z-index on its wrapper).
    // Closing the picker requires either completing a selection or clicking the backdrop area.
    // This test verifies the calendar panel is visible and the backdrop intercepts clicks.
    await setupExpenses(page)
    await openExpenses(page)
    await switchToCustomPeriod(page)
    await openPicker(page)

    // Calendar is open
    await expect(page.locator('button').filter({ hasText: '‹' })).toBeVisible()

    // Close by clicking backdrop area (top-left corner of viewport)
    await page.mouse.click(10, 10)

    // Picker is now closed
    await expect(page.locator('button').filter({ hasText: '‹' })).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('DateRangePicker — month navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupExpenses(page)
    await openExpenses(page)
    await switchToCustomPeriod(page)
    await openPicker(page)
  })

  test('‹ button navigates to previous month', async ({ page }) => {
    const monthsBefore = await page.locator('div').filter({
      hasText: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/
    }).allTextContents()

    await page.locator('button').filter({ hasText: '‹' }).click()

    const monthsAfter = await page.locator('div').filter({
      hasText: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/
    }).allTextContents()
    expect(monthsAfter).not.toEqual(monthsBefore)
  })

  test('› button navigates to next month', async ({ page }) => {
    const monthsBefore = await page.locator('div').filter({
      hasText: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/
    }).allTextContents()

    await page.locator('button').filter({ hasText: '›' }).click()

    const monthsAfter = await page.locator('div').filter({
      hasText: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/
    }).allTextContents()
    expect(monthsAfter).not.toEqual(monthsBefore)
  })

  test('navigating forward then back returns to same months', async ({ page }) => {
    const monthsBefore = await page.locator('div').filter({
      hasText: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/
    }).allTextContents()

    await page.locator('button').filter({ hasText: '›' }).click()
    await page.locator('button').filter({ hasText: '‹' }).click()

    const monthsAfter = await page.locator('div').filter({
      hasText: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/
    }).allTextContents()
    expect(monthsAfter).toEqual(monthsBefore)
  })
})

test.describe('DateRangePicker — clear button (✕)', () => {
  test('✕ clears range and restores "Pick range" trigger label', async ({ page }) => {
    await setupExpenses(page)
    await openExpenses(page)
    await switchToCustomPeriod(page)

    // Trigger should already have a date range (from This Month)
    await expect(page.locator('button').filter({ hasText: '📅' })).toContainText('–')

    // Click ✕ to clear
    await page.locator('button').filter({ hasText: '📅' }).locator('span', { hasText: '✕' }).click({ force: true })

    // Should now show "Pick range"
    await expect(page.getByRole('button', { name: /Pick range/i })).toBeVisible({ timeout: 3000 })
  })

  test('after clearing and selecting a range, ✕ appears again', async ({ page }) => {
    await setupExpenses(page)
    await openExpenses(page)
    await switchToCustomPeriod(page)
    await clearPickerRange(page)
    await openPicker(page)

    await clickCalendarDay(page, 3)
    await clickCalendarDay(page, 25)

    // Range is now set — ✕ should be visible in trigger
    await expect(page.locator('button').filter({ hasText: '📅' }).locator('span', { hasText: '✕' })).toBeVisible({ timeout: 3000 })
  })
})
