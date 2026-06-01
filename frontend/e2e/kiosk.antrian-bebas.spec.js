/**
 * kiosk.antrian-bebas.spec.js
 *
 * E2E tests for the "Antrian Bebas" (free-queue pickup) section in QuickPanel.
 *
 * The section appears on a barber card when ALL of:
 *   - barber has < 2 active (in_progress) bookings
 *   - barber has no assigned next (confirmed) booking
 *   - GET /bookings/unassigned returns a non-null booking
 *
 * Covers:
 *   - Section hidden: no unassigned booking
 *   - Section hidden: barber has a confirmed next booking
 *   - Section hidden: barber is at cap (2 in_progress)
 *   - Section visible: barber has 1 active + no next + unassigned present
 *   - Section visible: barber has 0 active + no next + unassigned present
 *   - Customer name, service, and price displayed
 *   - "Ambil & Mulai ↗" calls PATCH /bookings/:id/claim-and-start with correct barber_id
 *   - 409 on "Ambil & Mulai ↗" — section refreshes silently (no error alert)
 *   - Progress bar visible inside active booking cards
 *   - Button touch targets are at least 48px tall (kiosk requirement)
 *
 * All API calls are mocked via page.route() — no live backend required.
 */

import { test, expect } from '@playwright/test'

// ── Constants ──────────────────────────────────────────────────────────────────

const BRANCH_ID    = 'branch-antrian-001'
const BARBER_ID    = 'barber-antrian-001'
const BOOKING_A_ID = 'booking-active-001'
const BOOKING_B_ID = 'booking-active-002'
const BOOKING_N_ID = 'booking-next-001'
const UNASSIGNED_ID = 'booking-unassigned-001'

const CUSTOMER_ACTIVE  = 'Andi Wijaya'
const CUSTOMER_NEXT    = 'Sari Dewi'
const CUSTOMER_FREE    = 'Budi Santoso'

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeBooking(id, status, customerName, extra = {}) {
  return {
    id,
    booking_number: id,
    barber_id:      status === 'in_progress' || status === 'confirmed' ? BARBER_ID : null,
    branch_id:      BRANCH_ID,
    status,
    customer_name:  customerName,
    scheduled_at:   new Date().toISOString(),
    started_at:     status === 'in_progress' ? new Date(Date.now() - 8 * 60000).toISOString() : null,
    total_amount:   75000,
    slot_time:      '10:00',
    booking_services: [
      { id: `bs-${id}`, service_id: 'svc-001', service_name: 'Classic Haircut', name: 'Classic Haircut', duration_minutes: 60, price: 75000, added_mid_cut: false },
    ],
    booking_extras: [],
    ...extra,
  }
}

const unassignedBooking = {
  id:                UNASSIGNED_ID,
  booking_number:    UNASSIGNED_ID,
  barber_id:         null,
  branch_id:         BRANCH_ID,
  status:            'confirmed',
  customer_name:     CUSTOMER_FREE,
  scheduled_at:      new Date().toISOString(),
  started_at:        null,
  total_amount:      85000,
  slot_time:         '10:30',
  booking_services:  [
    { id: 'bs-ua-001', service_id: 'svc-001', service_name: 'Fade Haircut', name: 'Fade Haircut', duration_minutes: 45, price: 85000, added_mid_cut: false },
  ],
  booking_extras: [],
}

const mockConfig = {
  branch_id:     BRANCH_ID,
  branch_name:   'Test Branch',
  settings:      { idle_timeout_sec: 999, kioskAdminPin: '1234' },
  feedback_tags: [],
  menu_items:    [],
  services: [
    { id: 'svc-001', name: 'Classic Haircut', category: 'Haircut', duration_minutes: 60, base_price: 75000, is_active: true },
  ],
  barbers: [
    { id: BARBER_ID, name: 'Adi', status: 'available', current_status: 'available', is_active: true },
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
 * Wire all routes QuickPanel needs.
 * @param {import('@playwright/test').Page} page
 * @param {object[]} bookings        — response for GET /bookings?branch_id=...
 * @param {object|null} unassigned   — response for GET /bookings/unassigned
 * @param {object}   options
 * @param {string}   [options.barberStatus]
 */
async function mockRoutes(page, bookings, unassigned = null, { barberStatus = 'available' } = {}) {
  await page.route('**/api/kiosk/register', route =>
    route.fulfill({ json: mockConfig })
  )
  await page.route('**/api/events**', route =>
    route.fulfill({ body: '', contentType: 'text/event-stream' })
  )
  await page.route('**/api/bookings?status=**', route =>
    route.fulfill({ json: [] })
  )
  await page.route('**/api/barbers**', route =>
    route.fulfill({ json: [
      { id: BARBER_ID, name: 'Adi', status: barberStatus, current_status: barberStatus, is_active: true },
    ] })
  )
  // Unassigned endpoint — must be registered BEFORE the broader bookings catch-all
  await page.route(`**/api/bookings/unassigned**`, route =>
    route.fulfill({ json: unassigned })
  )
  // QuickPanel bookings
  await page.route('**/api/bookings?branch_id=**', route =>
    route.fulfill({ json: bookings })
  )
  await page.route('**/api/inventory/kiosk-menu**', route =>
    route.fulfill({ json: [] })
  )
}

async function openQuickPanel(page) {
  await page.goto('/kiosk')
  await page.getByRole('button', { name: '···' }).click()
  await expect(page.getByText('Antrian Kapster')).toBeVisible({ timeout: 8000 })
}

// ══════════════════════════════════════════════════════════════════════════════
// Section visibility — hidden cases
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Antrian Bebas — hidden when conditions not met', () => {

  test('section is hidden when unassigned API returns null', async ({ page }) => {
    await injectKioskConfig(page)
    await mockRoutes(page, [], null)   // unassigned = null
    await openQuickPanel(page)

    await expect(page.getByText('ANTRIAN BEBAS')).not.toBeVisible()
  })

  test('section is hidden when barber has a confirmed next booking (next != null)', async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_N_ID, 'confirmed', CUSTOMER_NEXT),
    ]
    await injectKioskConfig(page)
    await mockRoutes(page, bookings, unassignedBooking)
    await openQuickPanel(page)

    // barber has a "next" booking, so Antrian Bebas should be suppressed
    await expect(page.getByText('ANTRIAN BEBAS')).not.toBeVisible()
  })

  test('section is hidden when barber is at cap (2 in_progress)', async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_A_ID, 'in_progress', CUSTOMER_ACTIVE),
      makeBooking(BOOKING_B_ID, 'in_progress', 'Rina Kartika'),
    ]
    await injectKioskConfig(page)
    await mockRoutes(page, bookings, unassignedBooking)
    await openQuickPanel(page)

    await expect(page.getByText('ANTRIAN BEBAS')).not.toBeVisible()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Section visibility — shown cases
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Antrian Bebas — shown when barber has capacity', () => {

  test('section shows when barber has 0 active + no next + unassigned exists', async ({ page }) => {
    await injectKioskConfig(page)
    await mockRoutes(page, [], unassignedBooking)
    await openQuickPanel(page)

    await expect(page.getByText('ANTRIAN BEBAS')).toBeVisible({ timeout: 5000 })
  })

  test('section shows when barber has 1 active + no next + unassigned exists', async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_A_ID, 'in_progress', CUSTOMER_ACTIVE),
    ]
    await injectKioskConfig(page)
    await mockRoutes(page, bookings, unassignedBooking)
    await openQuickPanel(page)

    await expect(page.getByText('ANTRIAN BEBAS')).toBeVisible({ timeout: 5000 })
  })

  test('shows customer name from unassigned booking', async ({ page }) => {
    await injectKioskConfig(page)
    await mockRoutes(page, [], unassignedBooking)
    await openQuickPanel(page)

    await expect(page.getByText(CUSTOMER_FREE)).toBeVisible({ timeout: 5000 })
  })

  test('shows service name from unassigned booking', async ({ page }) => {
    await injectKioskConfig(page)
    await mockRoutes(page, [], unassignedBooking)
    await openQuickPanel(page)

    await expect(page.getByText('Fade Haircut')).toBeVisible({ timeout: 5000 })
  })

  test('shows formatted price from unassigned booking', async ({ page }) => {
    await injectKioskConfig(page)
    await mockRoutes(page, [], unassignedBooking)
    await openQuickPanel(page)

    // total_amount = 85000 → formatted as "Rp 85.000"
    await expect(page.getByText(/85\.000/)).toBeVisible({ timeout: 5000 })
  })

  test('"Ambil & Mulai" button is visible', async ({ page }) => {
    await injectKioskConfig(page)
    await mockRoutes(page, [], unassignedBooking)
    await openQuickPanel(page)

    await expect(page.getByRole('button', { name: /Ambil & Mulai/ })).toBeVisible({ timeout: 5000 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// "Ambil & Mulai ↗" interaction
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Ambil & Mulai — tap interactions', () => {

  test('calls PATCH /bookings/:id/claim-and-start with correct barber_id', async ({ page }) => {
    await injectKioskConfig(page)
    await mockRoutes(page, [], unassignedBooking)

    let capturedBody = null
    let capturedUrl  = null

    // Register the claim-and-start handler before navigating
    await page.route(`**/api/bookings/${UNASSIGNED_ID}/claim-and-start`, route => {
      capturedUrl  = route.request().url()
      capturedBody = route.request().postDataJSON()
      return route.fulfill({ json: { ...unassignedBooking, barber_id: BARBER_ID, status: 'in_progress' } })
    })

    await openQuickPanel(page)

    // Wait for the Antrian Bebas button to appear first
    const claimBtn = page.getByRole('button', { name: /Ambil & Mulai/ })
    await expect(claimBtn).toBeVisible({ timeout: 8000 })

    // Override the unassigned route for the reload after claim (returns null = section gone)
    await page.route(`**/api/bookings/unassigned**`, route =>
      route.fulfill({ json: null })
    )

    await claimBtn.click()

    // Wait for the PATCH to fire
    await expect(async () => {
      expect(capturedUrl).not.toBeNull()
    }).toPass({ timeout: 5000 })

    expect(capturedUrl).toContain(UNASSIGNED_ID)
    expect(capturedUrl).toContain('claim-and-start')
    expect(capturedBody).not.toBeNull()
    expect(capturedBody.barber_id).toBe(BARBER_ID)
  })

  test('409 response refreshes silently — no alert dialog shown', async ({ page }) => {
    await injectKioskConfig(page)
    await mockRoutes(page, [], unassignedBooking)

    // Intercept any dialogs — a dialog appearing would fail this test
    let dialogAppeared = false
    page.on('dialog', async dialog => {
      dialogAppeared = true
      await dialog.dismiss()
    })

    // Register the 409 handler before navigating
    let claimCallCount = 0
    await page.route(`**/api/bookings/${UNASSIGNED_ID}/claim-and-start`, route => {
      claimCallCount++
      return route.fulfill({ status: 409, json: { message: 'Booking already claimed by another barber' } })
    })

    await openQuickPanel(page)

    // Wait for the button to be visible
    const claimBtn = page.getByRole('button', { name: /Ambil & Mulai/ })
    await expect(claimBtn).toBeVisible({ timeout: 8000 })

    // Track re-fetches of unassigned after 409 — override to return null
    // Playwright uses last registered handler, so this override fires after initial load
    let unassignedCallCount = 0
    await page.route(`**/api/bookings/unassigned**`, route => {
      unassignedCallCount++
      return route.fulfill({ json: null })
    })

    await claimBtn.click()

    // Give the async flow time to settle
    await page.waitForTimeout(1000)

    expect(dialogAppeared).toBe(false)
    expect(claimCallCount).toBeGreaterThanOrEqual(1)
    // Panel should have re-fetched unassigned at least once after the 409 (silent refresh)
    expect(unassignedCallCount).toBeGreaterThanOrEqual(1)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Progress bar inside active booking cards
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Progress bar in active booking cards', () => {

  test('progress bar track element is present for an in_progress booking', async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_A_ID, 'in_progress', CUSTOMER_ACTIVE),
    ]
    await injectKioskConfig(page)
    await mockRoutes(page, bookings, null)
    await openQuickPanel(page)

    // The progress track is a div with height:4 and background:#2a2a28
    // The fill bar is a child div with a percentage width.
    // We look for the fill div that has a percentage width set via inline style.
    const progressBar = page.locator('div[style*="width:"][style*="%"]').first()
    await expect(progressBar).toBeAttached({ timeout: 5000 })
  })

  test('elapsed time label is shown in active booking card', async ({ page }) => {
    const bookings = [
      makeBooking(BOOKING_A_ID, 'in_progress', CUSTOMER_ACTIVE),
    ]
    await injectKioskConfig(page)
    await mockRoutes(page, bookings, null)
    await openQuickPanel(page)

    // The elapsed label reads "{n} menit"
    await expect(page.getByText(/menit/)).toBeVisible({ timeout: 5000 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Touch target size — kiosk requirement: min 48px height
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Touch targets — minimum 48px height (kiosk requirement)', () => {

  test('"Ambil & Mulai ↗" button is at least 48px tall', async ({ page }) => {
    await injectKioskConfig(page)
    await mockRoutes(page, [], unassignedBooking)
    await openQuickPanel(page)

    const btn = page.getByRole('button', { name: /Ambil & Mulai/ })
    await expect(btn).toBeVisible({ timeout: 5000 })

    const box = await btn.boundingBox()
    expect(box).not.toBeNull()
    expect(box.height).toBeGreaterThanOrEqual(48)
  })

  test('"Mulai Melayani →" button is at least 48px tall (0 active)', async ({ page }) => {
    const bookings = [makeBooking(BOOKING_N_ID, 'confirmed', CUSTOMER_NEXT)]
    await injectKioskConfig(page)
    await mockRoutes(page, bookings, null)
    await openQuickPanel(page)

    const btn = page.getByRole('button', { name: /Mulai Melayani/ })
    await expect(btn).toBeVisible({ timeout: 5000 })

    const box = await btn.boundingBox()
    expect(box).not.toBeNull()
    expect(box.height).toBeGreaterThanOrEqual(48)
  })

  test('"Selesai ✓" button is at least 48px tall', async ({ page }) => {
    const bookings = [makeBooking(BOOKING_A_ID, 'in_progress', CUSTOMER_ACTIVE)]
    await injectKioskConfig(page)
    await mockRoutes(page, bookings, null)
    await openQuickPanel(page)

    const btn = page.getByRole('button', { name: /Selesai/ }).first()
    await expect(btn).toBeVisible({ timeout: 5000 })

    const box = await btn.boundingBox()
    expect(box).not.toBeNull()
    expect(box.height).toBeGreaterThanOrEqual(48)
  })
})
