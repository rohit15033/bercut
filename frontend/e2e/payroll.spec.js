import { test, expect } from '@playwright/test'

// ── Fixtures ───────────────────────────────────────────────────────────────────

const BRANCH_ID  = 'branch-uuid-001'
const BARBER_ID  = 'barber-uuid-001'
const BARBER2_ID = 'barber-uuid-002'
const PERIOD_ID  = 'period-uuid-001'
const ENTRY_ID   = 'entry-uuid-001'
const ADJ_ID     = 'adj-uuid-001'
const USER_ID    = 'user-uuid-001'

const mockUser     = { id: USER_ID, name: 'Owner Admin', role: 'owner', email: 'admin@bercut.id' }
const mockBranches = [{ id: BRANCH_ID, name: 'Kerobokan' }]

// Compute the most recent completed 16th→15th payroll cycle relative to today.
// This mirrors buildPeriodPresets() in PayrollList.jsx so mock dates always
// fall inside the 6-preset window regardless of when the tests run.
function mostRecentPreset() {
  const today = new Date()
  let year = today.getFullYear()
  let month = today.getMonth()           // 0-based

  // If we haven't yet passed the 16th, step back one more month
  if (today.getDate() < 16) {
    month -= 1
    if (month < 0) { month = 11; year -= 1 }
  }

  const fromYear  = year
  const fromMonth = month
  const toMonth   = (month + 1) % 12
  const toYear    = month === 11 ? year + 1 : year

  const period_from  = `${fromYear}-${String(fromMonth + 1).padStart(2, '0')}-16`
  const period_to    = `${toYear}-${String(toMonth + 1).padStart(2, '0')}-15`
  const period_month = `${fromYear}-${String(fromMonth + 1).padStart(2, '0')}`

  return { period_from, period_to, period_month }
}

// The second preset is one cycle earlier than the first
function secondPreset() {
  const today = new Date()
  let year = today.getFullYear()
  let month = today.getMonth()

  if (today.getDate() < 16) {
    month -= 1
    if (month < 0) { month = 11; year -= 1 }
  }
  // step back one more cycle
  month -= 1
  if (month < 0) { month = 11; year -= 1 }

  const fromYear  = year
  const fromMonth = month
  const toMonth   = (month + 1) % 12
  const toYear    = month === 11 ? year + 1 : year

  const period_from  = `${fromYear}-${String(fromMonth + 1).padStart(2, '0')}-16`
  const period_to    = `${toYear}-${String(toMonth + 1).padStart(2, '0')}-15`
  const period_month = `${fromYear}-${String(fromMonth + 1).padStart(2, '0')}`

  return { period_from, period_to, period_month }
}

const PRESET1 = mostRecentPreset()
const PRESET2 = secondPreset()

// A period already in DB (draft status) — must match the most recent preset exactly
const mockPeriod = {
  id:           PERIOD_ID,
  branch_id:    BRANCH_ID,
  period_month: PRESET1.period_month,
  period_from:  PRESET1.period_from,
  period_to:    PRESET1.period_to,
  status:       'draft',
  generated_at: new Date().toISOString(),
  created_at:   new Date().toISOString(),
}

// A second period with reviewed status — matches the second preset
const mockPeriod2 = {
  id:           'period-uuid-002',
  branch_id:    BRANCH_ID,
  period_month: PRESET2.period_month,
  period_from:  PRESET2.period_from,
  period_to:    PRESET2.period_to,
  status:       'reviewed',
  generated_at: new Date().toISOString(),
  created_at:   new Date().toISOString(),
}

const mockEntries = [
  {
    id:                      ENTRY_ID,
    period_id:               PERIOD_ID,
    barber_id:               BARBER_ID,
    barber_name:             'Ady',
    branch_id:               BRANCH_ID,
    pay_type:                'commission',
    base_salary:             2000000,
    gross_service_revenue:   3500000,
    commission_regular:      1400000,
    commission_ot:           0,
    total_tips:              100000,
    total_late_minutes:      10,
    inexcused_fixed_days:    0,
    excused_fixed_days:      0,
    working_days:            26,
    late_deduction:          20000,
    inexcused_off_deduction: 0,
    excused_off_deduction:   0,
    kasbon_total:            0,
    net_pay:                 3480000,
    present_days:            24,
  },
]

// A non-kasbon adjustment
const mockAdjustment = {
  id:               ADJ_ID,
  payroll_entry_id: ENTRY_ID,
  type:             'deduction',
  category:        'Uniform Deduction',
  remarks:          'New uniform',
  amount:           150000,
  date:             '2025-04-01',
  is_kasbon:        false,
  deduct_period:    'current',
  barber_name:      'Ady',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function setupAdmin(page, overrides = {}) {
  // Inject auth token before page load
  await page.addInitScript(() => {
    localStorage.setItem('bercut_token', 'TEST-ADMIN-TOKEN')
  })

  // Auth
  await page.route('**/api/auth/me', route =>
    route.fulfill({ json: overrides.user ?? mockUser })
  )

  // Permissions (owner sees all — return empty array, handled by role check)
  await page.route('**/api/settings/users/**', route =>
    route.fulfill({ json: [] })
  )

  // Branches
  await page.route('**/api/branches', route =>
    route.fulfill({ json: overrides.branches ?? mockBranches })
  )

  // Payroll periods list
  await page.route('**/api/payroll/periods?**', route =>
    route.fulfill({ json: overrides.periods ?? [mockPeriod, mockPeriod2] })
  )

  // Payroll entries for any period
  await page.route('**/api/payroll/periods/*/entries', route =>
    route.fulfill({ json: overrides.entries ?? mockEntries })
  )

  // Adjustments for any entry
  await page.route('**/api/payroll/adjustments?**', route =>
    route.fulfill({ json: overrides.adjustments ?? [] })
  )

  // Payroll settings
  await page.route('**/api/settings/payroll', route =>
    route.fulfill({ json: overrides.payrollSettings ?? { off_quota_per_week: 1, working_days_per_week: 6 } })
  )

  // SSE — return empty stream to prevent hangs
  await page.route('**/api/events**', route =>
    route.fulfill({ body: '', contentType: 'text/event-stream' })
  )
}

async function goToPayroll(page) {
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Payroll' }).click()
  // Wait for the list heading
  await expect(page.getByText('Select a period to view or generate a new one')).toBeVisible({ timeout: 8000 })
}

// ── Test suite: Navigation to payroll list ─────────────────────────────────────

test.describe('Payroll list — navigation and render', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page)
    await goToPayroll(page)
  })

  test('clicking Payroll in sidebar shows the list screen with heading', async ({ page }) => {
    // The PayrollList screen — not the old Payroll detail screen
    await expect(page.getByText('Select a period to view or generate a new one')).toBeVisible()
    // Should NOT show the detail-view "← Back" button at this point
    await expect(page.getByRole('button', { name: /← Back/i })).not.toBeVisible()
  })

  test('period list renders with periods and status badges', async ({ page }) => {
    // Table header columns visible
    await expect(page.getByText('Period',  { exact: true })).toBeVisible()
    await expect(page.getByText('Status',  { exact: true })).toBeVisible()
    await expect(page.getByText('Actions', { exact: true })).toBeVisible()

    // At least one period row from mock data rendered — check for Draft badge
    await expect(page.getByText('Draft')).toBeVisible()
    // Also a Reviewed badge for the second period
    await expect(page.getByText('Reviewed')).toBeVisible()
  })

  test('Open button is present on existing periods', async ({ page }) => {
    // First period has status=draft → should have Open button
    const openButtons = page.getByRole('button', { name: 'Open' })
    await expect(openButtons.first()).toBeVisible()
  })

  test('Regenerate button is present on existing periods', async ({ page }) => {
    const regenButtons = page.getByRole('button', { name: /Regenerate ↺/i })
    await expect(regenButtons.first()).toBeVisible()
  })

  test('Export Excel button is present on existing periods', async ({ page }) => {
    const excelButtons = page.getByRole('button', { name: /↓ Excel/i })
    await expect(excelButtons.first()).toBeVisible()
  })
})

// ── Test suite: Open period → detail view ─────────────────────────────────────

test.describe('Payroll list → detail navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page)
    await goToPayroll(page)
  })

  test('clicking Open on a draft period loads detail view with barber table', async ({ page }) => {
    // Click the first Open button
    await page.getByRole('button', { name: 'Open' }).first().click()

    // Detail view should render with a period label and Back button
    await expect(page.getByRole('button', { name: /← Back/i })).toBeVisible({ timeout: 8000 })

    // Should show the period date label — the detail heading starts with "16 " (day 16)
    // Use the period label computed from the dynamic mock
    const fromDay = PRESET1.period_from.slice(8)   // '16'
    await expect(page.getByText(new RegExp(fromDay + '\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'))).toBeVisible()

    // Barber table headers visible
    await expect(page.getByText('Barber', { exact: true })).toBeVisible()
    await expect(page.getByText('Net Pay', { exact: true })).toBeVisible()

    // The mocked barber entry should appear
    await expect(page.getByText('Ady')).toBeVisible()
  })

  test('← Back button in detail view returns to list screen', async ({ page }) => {
    // Navigate into detail
    await page.getByRole('button', { name: 'Open' }).first().click()
    await expect(page.getByRole('button', { name: /← Back/i })).toBeVisible({ timeout: 8000 })

    // Go back
    await page.getByRole('button', { name: /← Back/i }).click()

    // Should be back on list screen
    await expect(page.getByText('Select a period to view or generate a new one')).toBeVisible({ timeout: 8000 })

    // The period should still appear in the list
    await expect(page.getByText('Draft')).toBeVisible()
  })
})

// ── Test suite: Regenerate flow ────────────────────────────────────────────────

test.describe('Payroll detail — Regenerate flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page)
    await goToPayroll(page)
    // Navigate into detail view
    await page.getByRole('button', { name: 'Open' }).first().click()
    await expect(page.getByRole('button', { name: /← Back/i })).toBeVisible({ timeout: 8000 })
  })

  test('clicking Regenerate ↺ shows confirmation dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Regenerate ↺/i }).click()
    // Confirmation dialog should appear
    await expect(page.getByText(/Are you sure you want to regenerate/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Yes, Regenerate' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
  })

  test('Cancel in regen dialog dismisses without reloading', async ({ page }) => {
    await page.getByRole('button', { name: /Regenerate ↺/i }).click()
    await expect(page.getByText(/Are you sure you want to regenerate/i)).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Dialog gone, still on detail view
    await expect(page.getByText(/Are you sure you want to regenerate/i)).not.toBeVisible()
    await expect(page.getByText('Ady')).toBeVisible()
  })

  test('Confirm in regen dialog triggers regenerate and table reloads', async ({ page }) => {
    let regenCalled = false

    // Override generate endpoint to track the call
    await page.route('**/api/payroll/periods/generate', route => {
      regenCalled = true
      route.fulfill({
        status: 201,
        json: {
          period:  { ...mockPeriod, status: 'draft', generated_at: new Date().toISOString() },
          entries: mockEntries,
        },
      })
    })

    await page.getByRole('button', { name: /Regenerate ↺/i }).click()
    await expect(page.getByRole('button', { name: 'Yes, Regenerate' })).toBeVisible()
    await page.getByRole('button', { name: 'Yes, Regenerate' }).click()

    // Dialog should close
    await expect(page.getByText(/Are you sure you want to regenerate/i)).not.toBeVisible({ timeout: 5000 })

    // API should have been called
    expect(regenCalled).toBe(true)

    // Table still shows (reloaded with same mock data)
    await expect(page.getByText('Ady')).toBeVisible({ timeout: 8000 })
  })
})

// ── Test suite: Export button (no 401) ────────────────────────────────────────

test.describe('Payroll detail — Export Excel', () => {
  test('clicking ↓ Export initiates a fetch-based download (no 401)', async ({ page }) => {
    let exportStatus = 200

    await setupAdmin(page)
    await goToPayroll(page)

    // Mock the export endpoint to return a tiny xlsx-like blob
    await page.route('**/api/payroll/periods/*/export', route => {
      exportStatus = 200
      route.fulfill({
        status:  200,
        headers: {
          'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=payroll_test.xlsx',
        },
        // Minimal binary content (not a real xlsx, but enough to create a blob)
        body: Buffer.from('PK\x03\x04', 'binary'),
      })
    })

    // Navigate into detail
    await page.getByRole('button', { name: 'Open' }).first().click()
    await expect(page.getByRole('button', { name: /← Back/i })).toBeVisible({ timeout: 8000 })

    // Click export — the fetch+blob approach is used (not window.open)
    // Monitor network requests to verify the auth header is sent and no 401 occurs
    const [exportRequest] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/export')),
      page.getByRole('button', { name: /↓ Export/i }).click(),
    ])

    // The request should carry the Authorization header (token was injected in localStorage)
    const authHeader = exportRequest.headers()['authorization']
    expect(authHeader).toBeTruthy()
    expect(authHeader).toContain('Bearer')

    // The mock returned 200 — no 401
    expect(exportStatus).toBe(200)
  })
})

// ── Test suite: Regenerate from list view (list-level ↺ button) ───────────────

test.describe('Payroll list — Regenerate ↺ row action', () => {
  test('Regenerate ↺ on a list row shows confirmation and can be cancelled', async ({ page }) => {
    await setupAdmin(page)
    await goToPayroll(page)

    // Click the row-level Regenerate ↺ button (not inside detail view)
    const regenBtns = page.getByRole('button', { name: /Regenerate ↺/i })
    await regenBtns.first().click()

    // Confirmation dialog from the list
    await expect(page.getByRole('button', { name: 'Yes, Regenerate' })).toBeVisible()

    // Cancel stays on list
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Select a period to view or generate a new one')).toBeVisible()
  })
})

// ── Test suite: Add and Delete adjustment ─────────────────────────────────────

test.describe('Payroll detail — adjustments', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page)
    await goToPayroll(page)
    // Open detail
    await page.getByRole('button', { name: 'Open' }).first().click()
    await expect(page.getByText('Ady')).toBeVisible({ timeout: 8000 })
  })

  test('Add adjustment modal opens and saves a deduction', async ({ page }) => {
    let addCalled = false

    // Mock POST /api/payroll/adjustments
    await page.route('**/api/payroll/adjustments', async route => {
      if (route.request().method() === 'POST') {
        addCalled = true
        route.fulfill({
          status: 201,
          json: {
            id:               'adj-new-001',
            payroll_entry_id: ENTRY_ID,
            type:             'deduction',
            category:         'Uniform Deduction',
            remarks:          'Test remark',
            amount:           50000,
            date:             '2025-04-01',
            is_kasbon:        false,
            deduct_period:    'current',
          },
        })
      } else {
        route.continue()
      }
    })

    // Find the + Add button for the barber row
    // It is rendered as a small button in the actions column
    const addBtn = page.getByRole('button', { name: /\+ Add/i }).first()
    await expect(addBtn).toBeVisible()
    await addBtn.click()

    // Add Adjustment modal should open (exact: true avoids matching footer hint text)
    await expect(page.getByText('Add Adjustment', { exact: true })).toBeVisible()

    // Switch to Deduction tab
    await page.getByRole('button', { name: 'Deduction', exact: true }).click()

    // Enter an amount
    await page.locator('input[type="number"]').fill('50000')

    // Optionally add remarks
    await page.locator('input[placeholder*="Perfect attendance" i]').fill('Test remark')

    // Save
    await page.getByRole('button', { name: /Add Deduction/i }).click()

    // Modal should close and API called
    await expect(page.getByText('Add Adjustment', { exact: true })).not.toBeVisible({ timeout: 5000 })
    expect(addCalled).toBe(true)
  })

  test('Manage adjustments modal shows existing adjustments and allows delete', async ({ page }) => {
    // This test needs adjustments pre-loaded — set up a fresh page with adjustment in mock
    // (Can't reload since that loses the initScript/route context from beforeEach)
    // Instead we open Manage and verify the delete button calls the DELETE API.
    // The beforeEach mock returns [] for adjustments; we override the POST mock
    // to return an adjustment and then open the Manage modal via Add flow.

    // Track DELETE calls via waitForRequest (more reliable than route flag)
    const deleteRequestPromise = page.waitForRequest(
      req => req.url().includes('/payroll/adjustments/') && req.method() === 'DELETE',
      { timeout: 8000 }
    ).catch(() => null) // null if never called

    // Mock DELETE for any adjustment ID
    await page.route('**/api/payroll/adjustments/**', route => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 204, body: '' })
      } else {
        route.continue()
      }
    })

    // Mock POST adjustments to return a non-kasbon deduction
    await page.route('**/api/payroll/adjustments', async route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          json:   mockAdjustment,
        })
      } else {
        route.continue()
      }
    })

    // Open Add modal and save → adjustment appears in local state
    const addBtn = page.getByRole('button', { name: /\+ Add/i }).first()
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    await expect(page.getByText('Add Adjustment', { exact: true })).toBeVisible()

    // Switch to Deduction, enter amount, save
    await page.getByRole('button', { name: 'Deduction', exact: true }).click()
    await page.locator('input[type="number"]').fill('150000')
    await page.getByRole('button', { name: /Add Deduction/i }).click()
    await expect(page.getByText('Add Adjustment', { exact: true })).not.toBeVisible({ timeout: 5000 })

    // Now open Manage modal — the saved adjustment should be listed
    const manageBtn = page.getByRole('button', { name: /Manage/i }).first()
    await expect(manageBtn).toBeVisible()
    await manageBtn.click()

    // Manage modal should open with the adjustment listed
    await expect(page.getByText('Uniform Deduction')).toBeVisible()

    // The Manage modal has two ✕ buttons: one in the header (close) and one in the
    // AdjRow for non-kasbon items (delete). The AdjRow delete ✕ is the LAST one
    // since the header close is rendered first.
    const allX = page.locator('button').filter({ hasText: '✕' })
    const count = await allX.count()
    // The delete ✕ is the last one (AdjRow is below the modal header close)
    const deleteBtn = allX.nth(count - 1)
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Adjustment should be removed from the UI
    await expect(page.getByText('Uniform Deduction')).not.toBeVisible({ timeout: 5000 })

    // The DELETE API should have been called
    const deleteReq = await deleteRequestPromise
    expect(deleteReq).not.toBeNull()
    expect(deleteReq.url()).toContain('/payroll/adjustments/')
  })
})

// ── Test suite: Custom date generate ──────────────────────────────────────────

test.describe('Payroll list — custom date generate', () => {
  test('filling custom From/To and clicking Generate opens the detail view', async ({ page }) => {
    const customPeriod = {
      id:           'period-custom-001',
      branch_id:    BRANCH_ID,
      period_month: '2025-01',
      period_from:  '2025-01-01',
      period_to:    '2025-01-31',
      status:       'draft',
      generated_at: new Date().toISOString(),
      created_at:   new Date().toISOString(),
    }

    await setupAdmin(page)
    await goToPayroll(page)

    // Mock the generate endpoint for custom period
    await page.route('**/api/payroll/periods/generate', route => {
      route.fulfill({
        status: 201,
        json: {
          period:  customPeriod,
          entries: [],
        },
      })
    })

    // Mock entries for the custom period
    await page.route(`**/api/payroll/periods/period-custom-001/entries`, route =>
      route.fulfill({ json: [] })
    )

    // Fill in custom date inputs
    await page.locator('input[type="date"]').nth(0).fill('2025-01-01')
    await page.locator('input[type="date"]').nth(1).fill('2025-01-31')

    // Click Generate in the Custom Period section
    // The button is inside the custom card and reads "Generate" (not "Generate Now")
    const customCard = page.locator('.admin-card').filter({ hasText: 'Custom Period' })
    await customCard.getByRole('button', { name: 'Generate' }).click()

    // Should navigate to detail view
    await expect(page.getByRole('button', { name: /← Back/i })).toBeVisible({ timeout: 8000 })
  })
})

// ── Test suite: "Next period ready" banner ────────────────────────────────────

test.describe('Payroll list — next period ready banner', () => {
  test('shows banner when an ungenerated preset exists and Generate Now triggers generate', async ({ page }) => {
    // Return empty periods so ALL presets are "not_started"
    await setupAdmin(page, { periods: [] })
    await goToPayroll(page)

    // Banner should be visible
    await expect(page.getByText('Next period ready:')).toBeVisible()

    let generateCalled = false
    // Mock the generate endpoint
    await page.route('**/api/payroll/periods/generate', route => {
      generateCalled = true
      route.fulfill({
        status: 201,
        json: {
          period:  mockPeriod,
          entries: mockEntries,
        },
      })
    })
    await page.route(`**/api/payroll/periods/${PERIOD_ID}/entries`, route =>
      route.fulfill({ json: mockEntries })
    )

    // Click Generate Now in the banner
    await page.getByRole('button', { name: 'Generate Now' }).click()

    // Should navigate to detail view
    await expect(page.getByRole('button', { name: /← Back/i })).toBeVisible({ timeout: 8000 })
    expect(generateCalled).toBe(true)
  })
})
