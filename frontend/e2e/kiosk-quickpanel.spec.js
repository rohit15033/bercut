import { test, expect } from '@playwright/test'

// ── Fixtures ───────────────────────────────────────────────────────────────────

const BRANCH_ID  = 'test-branch-id'
const BARBER_ID  = 'barber-001'
const BOOKING_ID = 'booking-001'
const ITEM_ID    = 'item-001'
const ITEM_ID_2  = 'item-002'

const mockConfig = {
  branch_id:     BRANCH_ID,
  branch_name:   'Test Branch',
  settings:      { idle_timeout_sec: 999, kioskAdminPin: '1234' },
  feedback_tags: [],
  menu_items:    [],
  services: [
    { id: 'svc-001', name: 'Haircut', category: 'haircut', duration_minutes: 30, base_price: 60000, is_active: true },
  ],
  barbers: [
    { id: BARBER_ID, name: 'Ady', status: 'in_service', is_active: true },
  ],
}

const mockActiveBooking = {
  id:               BOOKING_ID,
  booking_number:   'B001',
  customer_name:    'John Doe',
  barber_id:        BARBER_ID,
  branch_id:        BRANCH_ID,
  status:           'in_progress',
  scheduled_at:     new Date().toISOString(),
  booking_services: [
    { id: 'bs-001', service_id: 'svc-001', service_name: 'Haircut', name: 'Haircut', price: 60000, added_mid_cut: false },
  ],
  booking_extras: [],
}

const mockProducts = [
  { id: ITEM_ID,   name: 'Pomade',     price: 75000, current_stock: 10, kiosk_visible: true, category: 'product' },
  { id: ITEM_ID_2, name: 'Hair Spray', price: 50000, current_stock: 3,  kiosk_visible: true, category: 'product' },
]

// ── Setup helpers ──────────────────────────────────────────────────────────────

async function injectKioskConfig(page) {
  await page.addInitScript((config) => {
    localStorage.setItem('kiosk_token',       'TEST-KIOSK-TOKEN')
    localStorage.setItem('kiosk_branch_id',   config.branch_id)
    localStorage.setItem('kiosk_branch_name', config.branch_name)
    localStorage.setItem('kiosk_config',      JSON.stringify(config))
  }, mockConfig)
}

async function mockAllRoutes(page) {
  // Re-validate token (always called on mount)
  await page.route('**/api/kiosk/register', route =>
    route.fulfill({ json: mockConfig })
  )
  // SSE — silence it
  await page.route('**/api/events**', route =>
    route.fulfill({ body: '', contentType: 'text/event-stream' })
  )
  // Barbers list
  await page.route('**/api/barbers**', route =>
    route.fulfill({ json: [
      { id: BARBER_ID, name: 'Ady', status: 'in_service', is_active: true, current_status: 'in_service' },
    ] })
  )
  // Pending payment check (KioskContent home screen effect) — must return empty to avoid PaymentTakeover
  await page.route('**/api/bookings?status=**', route =>
    route.fulfill({ json: [] })
  )
  // Bookings with date (QuickPanel calls GET /bookings?branch_id=...&date=...)
  await page.route('**/api/bookings?branch_id=**', route =>
    route.fulfill({ json: [mockActiveBooking] })
  )
  // Inventory / kiosk-menu
  await page.route('**/api/inventory/kiosk-menu**', route =>
    route.fulfill({ json: mockProducts })
  )
}

async function navigateToItemsTab(page) {
  await page.goto('/kiosk')
  await page.getByRole('button', { name: '···' }).click()
  await expect(page.getByText('Antrian Kapster')).toBeVisible()
  await page.getByRole('button', { name: '+ Tambah' }).click()
  await expect(page.getByText('Tambah Item')).toBeVisible()
  await page.getByRole('button', { name: /Produk & Minuman/ }).click()
  await expect(page.locator(`[data-testid="item-card-${ITEM_ID}"]`)).toBeVisible()
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('QuickPanel — AddServiceModal — quantity stepper', () => {
  test.beforeEach(async ({ page }) => {
    await injectKioskConfig(page)
    await mockAllRoutes(page)
    await navigateToItemsTab(page)
  })

  // Test 1: items tab shows product cards
  test('items tab shows product cards with name and price', async ({ page }) => {
    const pomadeCard = page.locator(`[data-testid="item-card-${ITEM_ID}"]`)
    await expect(pomadeCard).toBeVisible()
    await expect(pomadeCard.getByText('Pomade')).toBeVisible()
    // Price formatted as "Rp 75.000" by Indonesian locale
    await expect(pomadeCard.getByText(/75\.000/)).toBeVisible()
  })

  // Test 2: clicking card shows stepper at qty=1
  test('clicking card reveals stepper buttons and qty=1', async ({ page }) => {
    const card = page.locator(`[data-testid="item-card-${ITEM_ID}"]`)

    // Before selection — stepper buttons must not be in the DOM / not visible
    await expect(card.getByRole('button', { name: '−' })).not.toBeVisible()
    await expect(card.getByRole('button', { name: '+' })).not.toBeVisible()

    // Click to select
    await card.click()

    // Stepper buttons appear
    await expect(card.getByRole('button', { name: '−' })).toBeVisible()
    await expect(card.getByRole('button', { name: '+' })).toBeVisible()

    // Qty span shows 1
    const qtySpan = card.locator('span').filter({ hasText: /^1$/ })
    await expect(qtySpan).toBeVisible()
  })

  // Test 3: plus increments qty
  test('clicking + increments qty to 2 and shows price line', async ({ page }) => {
    const card = page.locator(`[data-testid="item-card-${ITEM_ID}"]`)
    await card.click()

    const plusBtn = card.getByRole('button', { name: '+' })
    await plusBtn.click()

    // Qty span shows 2
    const qtySpan = card.locator('span').filter({ hasText: /^2$/ })
    await expect(qtySpan).toBeVisible()

    // Price line contains "2 ×"
    await expect(card.getByText(/2 ×/)).toBeVisible()
  })

  // Test 4: total footer updates with quantity
  test('footer total reflects quantity: 2 × 75000 = 150.000', async ({ page }) => {
    const card = page.locator(`[data-testid="item-card-${ITEM_ID}"]`)
    await card.click()

    const plusBtn = card.getByRole('button', { name: '+' })
    await plusBtn.click()

    // Footer is rendered when totalAdded > 0 and shows "+Rp 150.000" (2 × 75000)
    // The footer div contains the text "+Rp 150.000" (with the + prefix prepended in JSX)
    await expect(page.getByText('+Rp 150.000')).toBeVisible()
  })

  // Test 5: minus at qty=1 deselects card
  test('minus at qty=1 deselects the card and hides confirm button', async ({ page }) => {
    const card = page.locator(`[data-testid="item-card-${ITEM_ID}"]`)
    await card.click()

    const minusBtn = card.getByRole('button', { name: '−' })
    await expect(minusBtn).toBeVisible()

    // Click − at qty=1 — deselects
    await minusBtn.click()

    // Stepper buttons disappear
    await expect(card.getByRole('button', { name: '−' })).not.toBeVisible()
    await expect(card.getByRole('button', { name: '+' })).not.toBeVisible()

    // Confirm button disappears (footer is hidden when totalAdded === 0)
    await expect(page.getByRole('button', { name: /Konfirmasi/ })).not.toBeVisible()
  })

  // Test 6: minus decrements qty without deselecting
  test('minus decrements qty from 3 to 2 without deselecting', async ({ page }) => {
    const card = page.locator(`[data-testid="item-card-${ITEM_ID}"]`)
    await card.click()

    const plusBtn  = card.getByRole('button', { name: '+' })
    const minusBtn = card.getByRole('button', { name: '−' })

    // Click + twice to reach qty=3
    await plusBtn.click()
    await plusBtn.click()

    const qtyAt3 = card.locator('span').filter({ hasText: /^3$/ })
    await expect(qtyAt3).toBeVisible()

    // Click − once — drops to 2
    await minusBtn.click()

    const qtyAt2 = card.locator('span').filter({ hasText: /^2$/ })
    await expect(qtyAt2).toBeVisible()
  })

  // Test 7: plus disabled at max stock (Hair Spray has current_stock=3)
  test('plus is non-functional at max stock: qty stays at 3 for Hair Spray', async ({ page }) => {
    const card = page.locator(`[data-testid="item-card-${ITEM_ID_2}"]`)
    await card.click()

    const plusBtn = card.getByRole('button', { name: '+' })

    // Click + twice to reach stock limit of 3
    await plusBtn.click()
    await plusBtn.click()

    const qtyAt3 = card.locator('span').filter({ hasText: /^3$/ })
    await expect(qtyAt3).toBeVisible()

    // + button now has pointer-events: none — force:true bypasses that and confirms qty stays at 3
    await plusBtn.click({ force: true })
    await expect(qtyAt3).toBeVisible()
  })

  // Test 8: confirm button sends correct items payload
  test('confirm button sends correct items payload to add-extras endpoint', async ({ page }) => {
    let capturedBody = null
    await page.route(`**/api/bookings/${BOOKING_ID}/add-extras`, async route => {
      capturedBody = route.request().postDataJSON()
      await route.fulfill({ status: 200, json: { ok: true } })
    })
    // Also stub add-services (called in parallel by handleAddItems if serviceIds.length > 0)
    await page.route(`**/api/bookings/${BOOKING_ID}/add-services`, async route => {
      await route.fulfill({ status: 200, json: { ok: true } })
    })
    // Stub the reload call that happens after confirm (QuickPanel's load() re-fetches)
    await page.route('**/api/bookings?branch_id=**', route =>
      route.fulfill({ json: [mockActiveBooking] })
    )

    const card = page.locator(`[data-testid="item-card-${ITEM_ID}"]`)
    await card.click()

    const plusBtn = card.getByRole('button', { name: '+' })
    await plusBtn.click() // qty = 2

    // Confirm button text: "Konfirmasi (1) →" (1 item type selected)
    await page.getByRole('button', { name: /Konfirmasi/ }).click()

    // Wait for the request to be captured
    await expect(async () => {
      expect(capturedBody).not.toBeNull()
    }).toPass({ timeout: 5000 })

    expect(Array.isArray(capturedBody.items)).toBe(true)
    expect(capturedBody.items.some(
      item => item.item_id === ITEM_ID && item.quantity === 2
    )).toBe(true)
  })
})
