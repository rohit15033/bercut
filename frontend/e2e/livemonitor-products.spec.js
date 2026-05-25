import { test, expect } from '@playwright/test'

// ── Fixtures ───────────────────────────────────────────────────────────────────

const BRANCH_ID  = 'c067bd6c-ee96-4b70-b8d6-ed71159dd74c'
const BARBER_ID  = 'barber-uuid-001'
const USER_ID    = 'user-uuid-001'
const BOOKING_ID = 'booking-uuid-001'
const BOOKING_REOPEN_ID = 'booking-uuid-002'

const PROD_IN_STOCK_ID  = 'prod-uuid-001'
const PROD_OUT_STOCK_ID = 'prod-uuid-002'
const SVC_ID_1          = 'svc-uuid-001'
const SVC_ID_2          = 'svc-uuid-002'

const mockUser     = { id: USER_ID, name: 'Admin', role: 'owner', email: 'admin@test.com' }
const mockBranches = [{ id: BRANCH_ID, name: 'Kerobokan', is_active: true }]

const mockBarbers = [
  { id: BARBER_ID, name: 'Ady', branch_id: BRANCH_ID, status: 'available', is_active: true },
]

const mockServices = [
  { id: SVC_ID_1, name: 'Haircut', price: 60000, duration_minutes: 30, base_price: 60000, is_active: true, branch_id: BRANCH_ID },
  { id: SVC_ID_2, name: 'Shave',   price: 40000, duration_minutes: 20, base_price: 40000, is_active: true, branch_id: BRANCH_ID },
]

const mockProducts = [
  { id: PROD_IN_STOCK_ID,  name: 'Pomade',     price: 75000, current_stock: 10, kiosk_visible: true, category: 'product' },
  { id: PROD_OUT_STOCK_ID, name: 'Hair Spray', price: 50000, current_stock: 0,  kiosk_visible: true, category: 'product' },
]

// A confirmed booking that shows up in barber's queue — triggers Edit option in ActionMenu
const mockBooking = {
  id:               BOOKING_ID,
  booking_number:   'BK-0001',
  customer_name:    'John Doe',
  barber_id:        BARBER_ID,
  branch_id:        BRANCH_ID,
  status:           'confirmed',
  scheduled_at:     new Date().toISOString(),
  est_duration_min: 30,
  service_names:    'Haircut',
  services:         [{ service_id: SVC_ID_1, name: 'Haircut', price: 60000 }],
  extras:           [],
}

// A pending_payment booking — triggers the "Add Service & Resume" (Reopen) option in ActionMenu
const mockReopenBooking = {
  id:               BOOKING_REOPEN_ID,
  booking_number:   'BK-0002',
  customer_name:    'Jane Doe',
  barber_id:        BARBER_ID,
  branch_id:        BRANCH_ID,
  status:           'pending_payment',
  scheduled_at:     new Date().toISOString(),
  est_duration_min: 30,
  service_names:    'Haircut',
  services:         [{ service_id: SVC_ID_1 }],
  extras:           [],
}

// Full booking detail returned by GET /bookings/:id (for EditBookingModal)
const mockBookingDetail = {
  ...mockBooking,
  services: [{ service_id: SVC_ID_1, name: 'Haircut', price: 60000 }],
  extras:   [],
}

// ── Setup helpers ──────────────────────────────────────────────────────────────

async function setupAdmin(page, { bookings = [mockBooking] } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('bercut_token', 'TEST-ADMIN-TOKEN')
  })

  await page.route('**/api/auth/me', route =>
    route.fulfill({ json: mockUser })
  )
  await page.route('**/api/branches', route =>
    route.fulfill({ json: mockBranches })
  )
  // Silence SSE
  await page.route('**/api/events**', route =>
    route.fulfill({ body: '', contentType: 'text/event-stream' })
  )
  // Barbers
  await page.route('**/api/barbers**', route =>
    route.fulfill({ json: mockBarbers })
  )
  // Bookings list for today's date (used by loadData)
  await page.route('**/api/bookings?date=**', route =>
    route.fulfill({ json: bookings })
  )
  // Bookings by status — return empty (avoid ghost bookings from past dates)
  await page.route('**/api/bookings?status=**', route =>
    route.fulfill({ json: [] })
  )
  // Services
  await page.route('**/api/services**', route =>
    route.fulfill({ json: mockServices })
  )
  // Products / kiosk-menu
  await page.route('**/api/inventory/kiosk-menu**', route =>
    route.fulfill({ json: mockProducts })
  )
  // Booking detail for EditBookingModal
  await page.route(`**/api/bookings/${BOOKING_ID}`, route =>
    route.fulfill({ json: mockBookingDetail })
  )
}

async function goToLiveMonitor(page) {
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Live Queue' }).click()
  await expect(page.getByText('Live Queue Management')).toBeVisible()
}

async function openNewBookingModal(page) {
  await page.getByTestId('new-booking-btn').click()
  // Wait for the modal header — use a unique subtitle to avoid strict mode ambiguity
  await expect(page.getByText('Force-create — bypasses availability conflicts')).toBeVisible()
}

// ── NewBookingModal ────────────────────────────────────────────────────────────

test.describe('NewBookingModal — Products & Drinks tab', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page)
    await goToLiveMonitor(page)
    await openNewBookingModal(page)
  })

  test('tab bar renders with Services active by default', async ({ page }) => {
    const servicesTab = page.getByTestId('new-booking-tab-services')
    const productsTab = page.getByTestId('new-booking-tab-products')
    await expect(servicesTab).toBeVisible()
    await expect(productsTab).toBeVisible()
    // Services tab is active by default — catalog rows are directly visible (no toggle needed)
    await expect(page.getByTestId(`service-row-${SVC_ID_1}`)).toBeVisible()
  })

  test('switching to Products tab shows product list', async ({ page }) => {
    await page.getByTestId('new-booking-tab-products').click()
    await expect(page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)).toBeVisible()
    await expect(page.getByTestId(`product-card-${PROD_OUT_STOCK_ID}`)).toBeVisible()
  })

  test('selecting a product adds it to the selected list', async ({ page }) => {
    await page.getByTestId('new-booking-tab-products').click()
    await page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`).click()
    await expect(page.getByTestId(`selected-product-${PROD_IN_STOCK_ID}`)).toBeVisible()
  })

  test('selections persist when switching back to Services tab', async ({ page }) => {
    // Select a product
    await page.getByTestId('new-booking-tab-products').click()
    await page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`).click()
    // Switch back to services
    await page.getByTestId('new-booking-tab-services').click()
    // Switch back to products — selection should still be there
    await page.getByTestId('new-booking-tab-products').click()
    await expect(page.getByTestId(`selected-product-${PROD_IN_STOCK_ID}`)).toBeVisible()
  })

  test('tab badge shows count when products selected', async ({ page }) => {
    await page.getByTestId('new-booking-tab-products').click()
    await page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`).click()
    // Switch to services so badge is visible on the inactive products tab
    await page.getByTestId('new-booking-tab-services').click()
    const productsTab = page.getByTestId('new-booking-tab-products')
    // A span with "1" inside the products tab button
    await expect(productsTab.locator('span').filter({ hasText: '1' })).toBeVisible()
  })

  test('out-of-stock product shows warning badge and is non-selectable', async ({ page }) => {
    await page.getByTestId('new-booking-tab-products').click()
    const outOfStockCard = page.getByTestId(`product-card-${PROD_OUT_STOCK_ID}`)
    await expect(outOfStockCard).toBeVisible()
    await expect(outOfStockCard.getByText('Out of stock')).toBeVisible()
    // Out-of-stock cards are non-selectable — clicking must not add to selected list
    await outOfStockCard.click({ force: true })
    await expect(page.getByTestId(`selected-product-${PROD_OUT_STOCK_ID}`)).not.toBeVisible()
  })

  test('selected product chip is visible on Services tab (persistent section)', async ({ page }) => {
    // Select a product while on Products tab
    await page.getByTestId('new-booking-tab-products').click()
    await page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`).click()
    // Confirm chip is visible while still on Products tab
    await expect(page.getByTestId(`selected-product-${PROD_IN_STOCK_ID}`)).toBeVisible()
    // Switch to Services tab
    await page.getByTestId('new-booking-tab-services').click()
    // Chip must still be visible — it lives in the persistent section outside the tab content
    await expect(page.getByTestId(`selected-product-${PROD_IN_STOCK_ID}`)).toBeVisible()
  })

  test('combined total includes product prices', async ({ page }) => {
    // Services tab is active by default — click Haircut service row directly
    await page.getByTestId(`service-row-${SVC_ID_1}`).click()
    // Switch to products and add one
    await page.getByTestId('new-booking-tab-products').click()
    await page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`).click()
    // Total = 60000 (Haircut) + 75000 (Pomade) = 135000
    const totalEl = page.getByTestId('items-total')
    await expect(totalEl).toBeVisible()
    await expect(totalEl).toContainText('135.000')
  })
})

// ── EditBookingModal ───────────────────────────────────────────────────────────

test.describe('EditBookingModal — Products & Drinks tab', () => {
  let capturedPatch = null

  test.beforeEach(async ({ page }) => {
    capturedPatch = null
    await setupAdmin(page, { bookings: [mockBooking] })
    await page.route(`**/api/bookings/${BOOKING_ID}/admin-update`, async route => {
      capturedPatch = route.request().postDataJSON()
      route.fulfill({ status: 200, json: { ok: true } })
    })
    await goToLiveMonitor(page)
  })

  async function openEditModal(page) {
    // Click the ··· action menu button for the confirmed booking
    await page.getByTestId(`action-menu-btn-${BOOKING_ID}`).click()
    // Click the Edit action
    await page.getByTestId(`edit-booking-action-${BOOKING_ID}`).click()
    await expect(page.getByText('Edit Booking')).toBeVisible()
  }

  test('Products & Drinks tab renders in edit modal', async ({ page }) => {
    await openEditModal(page)
    await expect(page.getByTestId('edit-booking-tab-services')).toBeVisible()
    await expect(page.getByTestId('edit-booking-tab-products')).toBeVisible()
  })

  test('selecting a product in edit modal includes it in the save payload', async ({ page }) => {
    await openEditModal(page)
    await page.getByTestId('edit-booking-tab-products').click()
    // Wait for products to load
    await expect(page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)).toBeVisible()
    await page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`).click()
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(async () => {
      expect(capturedPatch).not.toBeNull()
    }).toPass({ timeout: 5000 })
    expect(Array.isArray(capturedPatch.add_products)).toBe(true)
    expect(capturedPatch.add_products.some(p => p.item_id === PROD_IN_STOCK_ID && p.quantity === 1)).toBe(true)
  })
})

// ── ReopenModal ────────────────────────────────────────────────────────────────

test.describe('ReopenModal — Products & Drinks tab', () => {
  test.beforeEach(async ({ page }) => {
    // Include both bookings: one confirmed (for edit tests) + one pending_payment (for reopen)
    await setupAdmin(page, { bookings: [mockBooking, mockReopenBooking] })
    await page.route(`**/api/bookings/${BOOKING_REOPEN_ID}/reopen`, route =>
      route.fulfill({ status: 200, json: { ok: true } })
    )
    await goToLiveMonitor(page)
  })

  async function openReopenModal(page) {
    // Click the ··· action menu for the pending_payment booking
    await page.getByTestId(`action-menu-btn-${BOOKING_REOPEN_ID}`).click()
    // Click "Add Service & Resume" (the reopen action)
    await page.getByTestId(`reopen-booking-action-${BOOKING_REOPEN_ID}`).click()
    await expect(page.getByText('Add Items & Resume')).toBeVisible()
  }

  test('Products tab shows in reopen modal', async ({ page }) => {
    await openReopenModal(page)
    await expect(page.getByTestId('reopen-tab-services')).toBeVisible()
    await expect(page.getByTestId('reopen-tab-products')).toBeVisible()
    await page.getByTestId('reopen-tab-products').click()
    await expect(page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)).toBeVisible()
  })

  test('CTA button is disabled when nothing selected, enabled after product selection', async ({ page }) => {
    await openReopenModal(page)
    const ctaBtn = page.getByTestId('reopen-cta-btn')
    await expect(ctaBtn).toBeDisabled()
    // Select a product
    await page.getByTestId('reopen-tab-products').click()
    await expect(page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)).toBeVisible()
    await page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`).click()
    await expect(ctaBtn).toBeEnabled()
  })

  test('CTA label updates to "Resume with P item(s)" when only products selected', async ({ page }) => {
    await openReopenModal(page)
    await page.getByTestId('reopen-tab-products').click()
    await expect(page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)).toBeVisible()
    await page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`).click()
    const ctaBtn = page.getByTestId('reopen-cta-btn')
    await expect(ctaBtn).toContainText('Resume with 1 item')
  })

  test('summary line shows products added text', async ({ page }) => {
    await openReopenModal(page)
    await page.getByTestId('reopen-tab-products').click()
    await expect(page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)).toBeVisible()
    await page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`).click()
    const summary = page.getByTestId('reopen-summary')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('product')
  })

  test('CTA label shows combined form when both services and products selected', async ({ page }) => {
    await openReopenModal(page)
    // Services tab is active by default — select Shave (not already in booking)
    await expect(page.getByText('Shave')).toBeVisible()
    await page.getByText('Shave').first().click()
    // Switch to products and select one
    await page.getByTestId('reopen-tab-products').click()
    await expect(page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)).toBeVisible()
    await page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`).click()
    const ctaBtn = page.getByTestId('reopen-cta-btn')
    await expect(ctaBtn).toContainText('service')
    await expect(ctaBtn).toContainText('item')
  })
})

// ── NewBookingModal — Services tab (direct catalog) ───────────────────────────

test.describe('NewBookingModal — Services tab (direct catalog)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page)
    await goToLiveMonitor(page)
    await openNewBookingModal(page)
  })

  test('service catalog rows render directly on Services tab (no toggle needed)', async ({ page }) => {
    // Services tab is active by default — rows must be immediately visible without clicking any button
    await expect(page.locator('[data-testid^="service-row-"]').first()).toBeVisible()
    // Confirm both mock service rows are present
    await expect(page.getByTestId(`service-row-${SVC_ID_1}`)).toBeVisible()
    await expect(page.getByTestId(`service-row-${SVC_ID_2}`)).toBeVisible()
  })

  test('selecting a service row shows it in the persistent selected section', async ({ page }) => {
    // Click the first service row (Haircut)
    const serviceRow = page.getByTestId(`service-row-${SVC_ID_1}`)
    await serviceRow.click()

    // The row should still be visible (selected state)
    await expect(serviceRow).toBeVisible()

    // Switch to Products tab — the selected service section is outside tab content, so it persists
    await page.getByTestId('new-booking-tab-products').click()

    // The persistent SERVICES section should show the selected service name
    await expect(page.getByText('Haircut').first()).toBeVisible()

    // The items-total should now be visible reflecting the service price
    await expect(page.getByTestId('items-total')).toBeVisible()
    await expect(page.getByTestId('items-total')).toContainText('60.000')
  })
})

// ── NewBookingModal — quantity stepper ────────────────────────────────────────

test.describe('NewBookingModal — quantity stepper', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page)
    await goToLiveMonitor(page)
    await openNewBookingModal(page)
    await page.getByTestId('new-booking-tab-products').click()
    await expect(page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)).toBeVisible()
  })

  test('stepper appears on selection and shows qty 1', async ({ page }) => {
    const card = page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)
    // Before selection — stepper buttons must not be visible
    await expect(card.getByRole('button', { name: '−' })).not.toBeVisible()
    await expect(card.getByRole('button', { name: '+' })).not.toBeVisible()

    // Select the card
    await card.click()

    // After selection — both stepper buttons must appear
    await expect(card.getByRole('button', { name: '−' })).toBeVisible()
    await expect(card.getByRole('button', { name: '+' })).toBeVisible()

    // The qty display between the buttons must show 1
    const qtySpan = card.locator('span').filter({ hasText: /^1$/ })
    await expect(qtySpan).toBeVisible()
  })

  test('plus increments quantity and chip subtitle shows 2 ×', async ({ page }) => {
    const card = page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)
    await card.click()

    const plusBtn = card.getByRole('button', { name: '+' })
    await plusBtn.click()

    // Qty display must show 2
    const qtySpan = card.locator('span').filter({ hasText: /^2$/ })
    await expect(qtySpan).toBeVisible()

    // The selected chip subtitle must include "2 ×"
    const chip = page.getByTestId(`selected-product-${PROD_IN_STOCK_ID}`)
    await expect(chip).toContainText('2 ×')
  })

  test('total updates with quantity: qty=2 of Rp 75.000 shows 150.000', async ({ page }) => {
    const card = page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)
    await card.click()

    const plusBtn = card.getByRole('button', { name: '+' })
    await plusBtn.click()

    // 2 × 75000 = 150000 → formatted as "150.000"
    const totalEl = page.getByTestId('items-total')
    await expect(totalEl).toBeVisible()
    await expect(totalEl).toContainText('150.000')
  })

  test('minus decrements quantity from 3 to 2', async ({ page }) => {
    const card = page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)
    await card.click()

    const plusBtn  = card.getByRole('button', { name: '+' })
    const minusBtn = card.getByRole('button', { name: '−' })

    // Click + twice to reach qty=3
    await plusBtn.click()
    await plusBtn.click()

    const qtyAt3 = card.locator('span').filter({ hasText: /^3$/ })
    await expect(qtyAt3).toBeVisible()

    // Click − once — should drop to 2
    await minusBtn.click()

    const qtyAt2 = card.locator('span').filter({ hasText: /^2$/ })
    await expect(qtyAt2).toBeVisible()
  })

  test('minus at qty=1 deselects the card completely', async ({ page }) => {
    const card     = page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)
    const minusBtn = card.getByRole('button', { name: '−' })

    // Select (qty=1)
    await card.click()
    await expect(minusBtn).toBeVisible()

    // Click − at qty=1 — should deselect
    await minusBtn.click()

    // Stepper buttons must no longer be visible
    await expect(card.getByRole('button', { name: '−' })).not.toBeVisible()
    await expect(card.getByRole('button', { name: '+' })).not.toBeVisible()

    // The selected chip must be gone
    await expect(page.getByTestId(`selected-product-${PROD_IN_STOCK_ID}`)).not.toBeVisible()
  })

  test('plus is non-functional at max stock (qty stays at 10)', async ({ page }) => {
    const card    = page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)
    const plusBtn = card.getByRole('button', { name: '+' })

    await card.click()

    // Click + nine times to go from qty=1 to qty=10 (current_stock is 10)
    for (let i = 0; i < 9; i++) {
      await plusBtn.click()
    }

    const qtyAt10 = card.locator('span').filter({ hasText: /^10$/ })
    await expect(qtyAt10).toBeVisible()

    // At max stock the + button has pointerEvents:none — it won't respond to clicks.
    // Attempt one more click (force:true to bypass pointer-events) and confirm qty stays at 10.
    await plusBtn.click({ force: true })
    await expect(qtyAt10).toBeVisible()
  })

  // ── ReopenModal stepper (test 7) ─────────────────────────────────────────────

  test('ReopenModal — stepper appears and increments qty', async ({ page }) => {
    // This test needs a different setup — use a fresh page context via setup inside the test
    // The beforeEach already called setupAdmin with only [mockBooking]; we need to re-route
    // to include mockReopenBooking and stub the reopen endpoint.
    // Re-route bookings to include both bookings for this test.
    await page.route('**/api/bookings?date=**', route =>
      route.fulfill({ json: [mockBooking, mockReopenBooking] })
    )
    await page.route(`**/api/bookings/${BOOKING_REOPEN_ID}/reopen`, route =>
      route.fulfill({ status: 200, json: { ok: true } })
    )

    // Navigate to live monitor fresh so the updated booking route takes effect
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Live Queue' }).click()
    await expect(page.getByText('Live Queue Management')).toBeVisible()

    // Open the reopen modal for the pending_payment booking
    await page.getByTestId(`action-menu-btn-${BOOKING_REOPEN_ID}`).click()
    await page.getByTestId(`reopen-booking-action-${BOOKING_REOPEN_ID}`).click()
    await expect(page.getByText('Add Items & Resume')).toBeVisible()

    // Switch to Products tab
    await page.getByTestId('reopen-tab-products').click()
    await expect(page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)).toBeVisible()

    // Select the in-stock product — stepper must appear
    const card = page.getByTestId(`product-card-${PROD_IN_STOCK_ID}`)
    await card.click()
    await expect(card.getByRole('button', { name: '−' })).toBeVisible()
    await expect(card.getByRole('button', { name: '+' })).toBeVisible()

    // Click + once — qty must show 2
    await card.getByRole('button', { name: '+' }).click()
    const qtySpan = card.locator('span').filter({ hasText: /^2$/ })
    await expect(qtySpan).toBeVisible()
  })
})
