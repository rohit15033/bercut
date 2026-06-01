/**
 * quickpanel.parallel.spec.js
 *
 * E2E tests for the QuickPanel "Mulai Juga" parallel service feature.
 * Covers:
 *   - 3-state start button (0 / 1 / 2 in_progress)
 *   - Dual-active "Sedang Dilayani" section with "2" badge
 *   - Confirmation modal on "Selesai ✓" tap
 *   - "+ Tambah" still opens add-service modal
 *   - Single-active regression: "Selesai ✓" still shows confirmation
 *
 * All API calls are mocked via page.route() — no live server needed.
 */

import { test, expect } from '@playwright/test'

// ── Constants ──────────────────────────────────────────────────────────────────

const BRANCH_ID   = 'branch-parallel-001'
const BARBER_ID   = 'barber-para-001'
const BOOKING_A   = 'booking-active-001'  // first in_progress
const BOOKING_B   = 'booking-active-002'  // second in_progress
const BOOKING_N   = 'booking-next-001'    // confirmed (next)

const CUSTOMER_A  = 'Budi Santoso'
const CUSTOMER_B  = 'Rina Kartika'
const CUSTOMER_N  = 'Dian Prakoso'

// ── Mock data factories ────────────────────────────────────────────────────────

function makeBooking(id, status, customerId, customerName, extra = {}) {
  return {
    id,
    booking_number: id,
    customer_name:  customerName,
    barber_id:      BARBER_ID,
    branch_id:      BRANCH_ID,
    status,
    scheduled_at:   new Date().toISOString(),
    started_at:     status === 'in_progress' ? new Date(Date.now() - 10 * 60000).toISOString() : null,
    total_amount:   85000,
    booking_services: [
      { id: `bs-${id}`, service_id: 'svc-001', service_name: 'Haircut', name: 'Haircut', price: 85000, added_mid_cut: false },
    ],
    booking_extras: [],
    ...extra,
  }
}

const mockConfig = {
  branch_id:     BRANCH_ID,
  branch_name:   'Test Branch',
  settings:      { idle_timeout_sec: 999, kioskAdminPin: '1234' },
  feedback_tags: [],
  menu_items:    [],
  services: [
    { id: 'svc-001', name: 'Haircut', category: 'Haircut', duration_minutes: 30, base_price: 85000, is_active: true },
  ],
  barbers: [
    { id: BARBER_ID, name: 'Ady', status: 'in_service', is_active: true },
  ],
}

// ── Shared setup ───────────────────────────────────────────────────────────────

async function injectKioskConfig(page) {
  await page.addInitScript((config) => {
    localStorage.setItem('kiosk_token',       'TEST-KIOSK-TOKEN')
    localStorage.setItem('kiosk_branch_id',   config.branch_id)
    localStorage.setItem('kiosk_branch_name', config.branch_name)
    localStorage.setItem('kiosk_config',      JSON.stringify(config))
  }, mockConfig)
}

/**
 * Wire up all routes that QuickPanel needs.
 * @param {import('@playwright/test').Page} page
 * @param {object[]} bookings  — the array returned by GET /bookings?branch_id=...
 * @param {object}   options
 * @param {string}   [options.barberStatus]  — current_status for the barber row
 */
async function mockQuickPanelRoutes(page, bookings, { barberStatus = 'in_service' } = {}) {
  await page.route('**/api/kiosk/register', route =>
    route.fulfill({ json: mockConfig })
  )
  await page.route('**/api/events**', route =>
    route.fulfill({ body: '', contentType: 'text/event-stream' })
  )
  // Pending payment check (must return empty array so KioskContent stays on home)
  await page.route('**/api/bookings?status=**', route =>
    route.fulfill({ json: [] })
  )
  // Barbers list
  await page.route('**/api/barbers**', route =>
    route.fulfill({ json: [
      { id: BARBER_ID, name: 'Ady', status: barberStatus, current_status: barberStatus, is_active: true },
    ] })
  )
  // QuickPanel bookings (GET /bookings?branch_id=...&date=...)
  await page.route('**/api/bookings?branch_id=**', route =>
    route.fulfill({ json: bookings })
  )
  // Inventory menu
  await page.route('**/api/inventory/kiosk-menu**', route =>
    route.fulfill({ json: [] })
  )
}

/** Navigate to QuickPanel via the "···" barber queue button on the kiosk home. */
async function openQuickPanel(page) {
  await page.goto('/kiosk')
  await page.getByRole('button', { name: '···' }).click()
  await expect(page.getByText('Antrian Kapster')).toBeVisible({ timeout: 8000 })
}

// ══════════════════════════════════════════════════════════════════════════════
// Start button states
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Start button states', () => {
  test('0 in_progress — shows "Mulai Melayani →", enabled, white background', async ({ page }) => {
    const bookings = [makeBooking(BOOKING_N, 'confirmed', 'cust-n', CUSTOMER_N)]
    await injectKioskConfig(page)
    await mockQuickPanelRoutes(page, bookings)
    await openQuickPanel(page)

    const startBtn = page.getByRole('button', { name: /Mulai Melayani/ })
    await expect(startBtn).toBeVisible({ timeout: 5000 })
    await expect(startBtn).toBeEnabled()

    // White background is expressed as `C.white` (#ffffff). Check via computed style.
    const bgColor = await startBtn.evaluate(el => getComputedStyle(el).backgroundColor)
    // Playwright resolves rgb so white = rgb(255, 255, 255)
    expect(bgColor).toBe('rgb(255, 255, 255)')
  })

  test('1 in_progress — shows "Mulai Juga ↗", enabled, has amber border', async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_A, 'in_progress', 'cust-a', CUSTOMER_A),
      makeBooking(BOOKING_N, 'confirmed',   'cust-n', CUSTOMER_N),
    ]
    await injectKioskConfig(page)
    await mockQuickPanelRoutes(page, bookings)
    await openQuickPanel(page)

    const startBtn = page.getByRole('button', { name: /Mulai Juga/ })
    await expect(startBtn).toBeVisible({ timeout: 5000 })
    await expect(startBtn).toBeEnabled()

    // Border uses C.accent = #F5E200 (rgb 245, 226, 0) — Bercut yellow, not amber orange
    const borderColor = await startBtn.evaluate(el => getComputedStyle(el).borderColor)
    // rgb(245, 226, 0)
    expect(borderColor).toContain('245')
    expect(borderColor).toContain('226')
    expect(borderColor).toContain('0')
  })

  test('1 in_progress — "Mulai Juga ↗" button is the only start button variant visible', async ({ page }) => {
    // The component does not render a "1 layanan aktif" badge.
    // The numeric badge ("2") is only rendered when activeCount === 2.
    // At 1 in_progress the start button text itself changes to "Mulai Juga ↗"
    // and the "Mulai Melayani →" / "Tidak tersedia" variants are absent.
    const bookings = [
      makeBooking(BOOKING_A, 'in_progress', 'cust-a', CUSTOMER_A),
      makeBooking(BOOKING_N, 'confirmed',   'cust-n', CUSTOMER_N),
    ]
    await injectKioskConfig(page)
    await mockQuickPanelRoutes(page, bookings)
    await openQuickPanel(page)

    await expect(page.getByRole('button', { name: /Mulai Juga/ })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /Mulai Melayani/ })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /Tidak tersedia/ })).not.toBeVisible()
  })

  test('2 in_progress — shows "Tidak tersedia", is disabled', async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_A, 'in_progress', 'cust-a', CUSTOMER_A),
      makeBooking(BOOKING_B, 'in_progress', 'cust-b', CUSTOMER_B),
      makeBooking(BOOKING_N, 'confirmed',   'cust-n', CUSTOMER_N),
    ]
    await injectKioskConfig(page)
    await mockQuickPanelRoutes(page, bookings)
    await openQuickPanel(page)

    const startBtn = page.getByRole('button', { name: /Tidak tersedia/ })
    await expect(startBtn).toBeVisible({ timeout: 5000 })
    await expect(startBtn).toBeDisabled()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Dual-active "Sedang Dilayani" display
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Dual-active Sedang Dilayani section', () => {
  test.beforeEach(async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_A, 'in_progress', 'cust-a', CUSTOMER_A),
      makeBooking(BOOKING_B, 'in_progress', 'cust-b', CUSTOMER_B),
      makeBooking(BOOKING_N, 'confirmed',   'cust-n', CUSTOMER_N),
    ]
    await injectKioskConfig(page)
    await mockQuickPanelRoutes(page, bookings)
    await openQuickPanel(page)
  })

  test('section kicker shows "2" badge when barber has 2 in_progress', async ({ page }) => {
    await expect(page.getByText('Sedang Dilayani')).toBeVisible({ timeout: 5000 })
    // The badge is a <span> containing exactly "2" adjacent to the kicker
    const badge = page.locator('span').filter({ hasText: /^2$/ })
    await expect(badge).toBeVisible({ timeout: 5000 })
  })

  test('both customer names are visible in the active section', async ({ page }) => {
    await expect(page.getByText(CUSTOMER_A)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(CUSTOMER_B)).toBeVisible({ timeout: 5000 })
  })

  test('both "Selesai ✓" buttons are present', async ({ page }) => {
    const selesaiBtns = page.getByRole('button', { name: /Selesai/ })
    await expect(selesaiBtns).toHaveCount(2, { timeout: 5000 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Confirmation modal
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Confirmation modal', () => {
  async function setupSingleActive(page) {
    const bookings = [
      makeBooking(BOOKING_A, 'in_progress', 'cust-a', CUSTOMER_A),
      makeBooking(BOOKING_N, 'confirmed',   'cust-n', CUSTOMER_N),
    ]
    await injectKioskConfig(page)
    await mockQuickPanelRoutes(page, bookings)
    await openQuickPanel(page)
  }

  async function setupDualActive(page) {
    const bookings = [
      makeBooking(BOOKING_A, 'in_progress', 'cust-a', CUSTOMER_A),
      makeBooking(BOOKING_B, 'in_progress', 'cust-b', CUSTOMER_B),
      makeBooking(BOOKING_N, 'confirmed',   'cust-n', CUSTOMER_N),
    ]
    await injectKioskConfig(page)
    await mockQuickPanelRoutes(page, bookings)
    await openQuickPanel(page)
  }

  /** Helper: returns a locator scoped to the confirmation modal card. */
  function confirmModal(page) {
    // The modal card is the innermost div that (a) contains "Selesai melayani" text
    // and (b) has a "Batal" button somewhere in its subtree.
    // .last() gives the most-specific (innermost) matching element.
    return page.locator('div').filter({ hasText: /Selesai melayani/i }).filter({ has: page.getByRole('button', { name: 'Batal' }) }).last()
  }

  test('tapping "Selesai ✓" opens confirmation modal with correct customer name', async ({ page }) => {
    await setupSingleActive(page)

    await page.getByRole('button', { name: /Selesai/ }).first().click()

    const modal = confirmModal(page)
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(modal.getByText(/Selesai melayani/i)).toBeVisible({ timeout: 3000 })
    // Customer name appears inside the heading div
    await expect(modal.getByText(CUSTOMER_A)).toBeVisible({ timeout: 3000 })
  })

  test('modal shows payment screen auto-trigger text', async ({ page }) => {
    await setupSingleActive(page)

    await page.getByRole('button', { name: /Selesai/ }).first().click()

    await expect(page.getByText(/Layar pembayaran akan muncul/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/otomatis untuk pelanggan/i)).toBeVisible({ timeout: 5000 })
  })

  test('tapping "Batal" closes modal without completing', async ({ page }) => {
    await setupSingleActive(page)

    // Set up a route spy to ensure complete is NOT called
    let completeCalled = false
    await page.route(`**/api/bookings/${BOOKING_A}/complete`, async route => {
      completeCalled = true
      await route.fulfill({ status: 200, json: { ok: true } })
    })

    await page.getByRole('button', { name: /Selesai/ }).first().click()
    await expect(page.getByText(/Selesai melayani/i)).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Batal' }).click()

    // Modal should be gone
    await expect(page.getByText(/Selesai melayani/i)).not.toBeVisible({ timeout: 3000 })
    // Complete endpoint should NOT have been called
    expect(completeCalled).toBe(false)
  })

  test('clicking outside modal closes it without completing', async ({ page }) => {
    await setupSingleActive(page)

    let completeCalled = false
    await page.route(`**/api/bookings/${BOOKING_A}/complete`, async route => {
      completeCalled = true
      await route.fulfill({ status: 200, json: { ok: true } })
    })

    await page.getByRole('button', { name: /Selesai/ }).first().click()
    await expect(page.getByText(/Selesai melayani/i)).toBeVisible({ timeout: 5000 })

    // Click on the semi-transparent backdrop (the fixed overlay) via coordinates outside the modal card
    // The modal card is centered; click near the edge of the screen
    await page.mouse.click(20, 20)

    await expect(page.getByText(/Selesai melayani/i)).not.toBeVisible({ timeout: 3000 })
    expect(completeCalled).toBe(false)
  })

  test('tapping "Ya, Selesai ✓" calls complete endpoint and closes modal', async ({ page }) => {
    await setupSingleActive(page)

    let completeCalled = false
    await page.route(`**/api/bookings/${BOOKING_A}/complete`, async route => {
      completeCalled = true
      await route.fulfill({ status: 200, json: { ok: true } })
    })

    await page.getByRole('button', { name: /Selesai/ }).first().click()
    await expect(page.getByText(/Selesai melayani/i)).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: /Ya, Selesai/ }).click()

    // Wait for the complete request
    await expect(async () => {
      expect(completeCalled).toBe(true)
    }).toPass({ timeout: 5000 })

    // Modal should be gone
    await expect(page.getByText(/Selesai melayani/i)).not.toBeVisible({ timeout: 3000 })
  })

  test('confirmation modal does NOT show price — shows service names and payment auto-trigger hint', async ({ page }) => {
    // requestComplete() stores service names and extras from the booking — not total_amount.
    // The modal is intentionally price-free: it shows the service chip(s) only.
    // Payment auto-trigger text confirms the screen flow instead.
    await setupSingleActive(page)

    await page.getByRole('button', { name: /Selesai/ }).first().click()

    const modal = confirmModal(page)
    await expect(modal).toBeVisible({ timeout: 5000 })
    // Service name chip is present
    await expect(modal.getByText('Haircut')).toBeVisible({ timeout: 3000 })
    // Price / total_amount NOT in modal
    await expect(modal.getByText(/85\.000/)).not.toBeVisible()
    // Payment screen auto-trigger hint is present
    await expect(modal.getByText(/Layar pembayaran akan muncul/i)).toBeVisible({ timeout: 3000 })
  })

  test('confirmation modal shows service name', async ({ page }) => {
    await setupSingleActive(page)

    await page.getByRole('button', { name: /Selesai/ }).first().click()

    const modal = confirmModal(page)
    await expect(modal).toBeVisible({ timeout: 5000 })
    // The service summary line (below the total) contains the service name "Haircut"
    await expect(modal.getByText('Haircut')).toBeVisible({ timeout: 3000 })
  })

  test('dual-active: tapping first Selesai shows first customer name in modal', async ({ page }) => {
    await setupDualActive(page)

    // First Selesai button corresponds to the first active booking (CUSTOMER_A)
    const selesaiBtns = page.getByRole('button', { name: /Selesai/ })
    await selesaiBtns.first().click()

    const modal = confirmModal(page)
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(modal.getByText(/Selesai melayani/i)).toBeVisible({ timeout: 3000 })
    await expect(modal.getByText(CUSTOMER_A)).toBeVisible({ timeout: 3000 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Regression: + Tambah still opens add-service modal
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Regression — + Tambah opens add-service modal', () => {
  test('clicking "+ Tambah" on an active booking block opens AddServiceModal', async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_A, 'in_progress', 'cust-a', CUSTOMER_A),
    ]
    await injectKioskConfig(page)
    await mockQuickPanelRoutes(page, bookings)
    await openQuickPanel(page)

    // The active booking block should have a "+ Tambah" button
    const tambahBtn = page.getByRole('button', { name: '+ Tambah' })
    await expect(tambahBtn).toBeVisible({ timeout: 5000 })
    await tambahBtn.click()

    // AddServiceModal header should appear with the customer's name
    await expect(page.getByText('Tambah Item')).toBeVisible({ timeout: 5000 })
    // The modal header reads "untuk {customer_name}" — match the exact phrase
    await expect(page.getByText(`untuk ${CUSTOMER_A}`)).toBeVisible({ timeout: 3000 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Concurrent lock — busyId blocks the second Selesai button
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Concurrent lock — busyId blocks second Selesai', () => {
  test('while one complete is in-flight, the other Selesai button is disabled (busyId set)', async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_A, 'in_progress', 'cust-a', CUSTOMER_A),
      makeBooking(BOOKING_B, 'in_progress', 'cust-b', CUSTOMER_B),
      makeBooking(BOOKING_N, 'confirmed',   'cust-n', CUSTOMER_N),
    ]
    await injectKioskConfig(page)
    await mockQuickPanelRoutes(page, bookings)

    // Install a slow complete route for BOOKING_A so the request stays in-flight
    // while we inspect the other button's state.
    let resolveA
    await page.route(`**/api/bookings/${BOOKING_A}/complete`, async route => {
      await new Promise(res => { resolveA = res })
      await route.fulfill({ status: 200, json: { ok: true } })
    })

    await openQuickPanel(page)

    // The "Selesai ✓" card-buttons use /Selesai ✓/ text.
    // Before confirming there are 2 of them visible.
    const selesaiBtns = page.getByRole('button', { name: /Selesai/ }).filter({ hasNotText: /Ya,/ })
    await expect(selesaiBtns).toHaveCount(2, { timeout: 5000 })

    // Open the confirmation modal for BOOKING_A and confirm.
    // Click the first card-level Selesai button.
    await selesaiBtns.first().click()
    await expect(page.getByText(/Selesai melayani/i)).toBeVisible({ timeout: 5000 })

    // Tap "Ya, Selesai ✓" — this sets busyId and kicks off the in-flight request.
    await page.getByRole('button', { name: /Ya, Selesai/ }).click()

    // BOOKING_A's card button now shows "…" (busyId === act.id).
    // BOOKING_B's card button still shows "Selesai ✓" but with disabled={true}.
    // There is now exactly 1 card-level Selesai button (BOOKING_B's), and it must be disabled.
    await expect(selesaiBtns.first()).toBeDisabled({ timeout: 3000 })

    // Resolve to clean up the pending request.
    if (resolveA) resolveA()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Regression: single active barber still shows confirmation before completing
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Regression — single active still uses confirmation modal', () => {
  test('"Selesai ✓" on single active booking shows confirmation modal', async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_A, 'in_progress', 'cust-a', CUSTOMER_A),
    ]
    await injectKioskConfig(page)
    await mockQuickPanelRoutes(page, bookings)
    await openQuickPanel(page)

    let completeCalled = false
    await page.route(`**/api/bookings/${BOOKING_A}/complete`, async route => {
      completeCalled = true
      await route.fulfill({ status: 200, json: { ok: true } })
    })

    // Tap Selesai — must NOT immediately call complete; must show modal first
    await page.getByRole('button', { name: /Selesai/ }).first().click()

    // Modal must be visible before complete is called
    await expect(page.getByText(/Selesai melayani/i)).toBeVisible({ timeout: 5000 })
    expect(completeCalled).toBe(false)

    // Confirming via "Ya, Selesai ✓" then triggers complete
    await page.getByRole('button', { name: /Ya, Selesai/ }).click()

    await expect(async () => {
      expect(completeCalled).toBe(true)
    }).toPass({ timeout: 5000 })
  })
})
