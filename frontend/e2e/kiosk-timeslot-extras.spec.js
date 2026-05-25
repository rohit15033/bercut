import { test, expect } from '@playwright/test'

// ── Fixtures ───────────────────────────────────────────────────────────────────

const BRANCH_ID   = 'test-branch-id'
const BARBER_ID   = 'barber-id-1'
const SERVICE_ID  = 'service-id-1'
const PRODUCT_ID  = 'prod-001'
const BEV_ID      = 'bev-001'
const OOS_ID      = 'oos-001'
const BOOKING_ID  = 'bk-extras-001'

const mockConfig = {
  branch_id:     BRANCH_ID,
  branch_name:   'Test Branch',
  settings:      { idle_timeout_sec: 999 },
  feedback_tags: [],
  services: [
    { id: SERVICE_ID, name: 'Haircut', category: 'haircut', duration_minutes: 30, base_price: 50000, is_active: true },
  ],
  barbers: [
    { id: BARBER_ID, name: 'Alex', status: 'available', is_active: true },
  ],
  menu_items: [
    // beverage — appears in gold slot bar
    { id: BEV_ID,     name: 'Teh Susu',  price: 12000, qty: 5,  category: 'beverage', kiosk_visible: true },
    // product — appears in the row below the bar
    { id: PRODUCT_ID, name: 'Pomade',    price: 75000, qty: 10, category: 'product',  kiosk_visible: true },
    // out of stock product
    { id: OOS_ID,     name: 'Wax Habis', price: 30000, qty: 0,  category: 'product',  kiosk_visible: true },
  ],
}

const mockBookingResponse = {
  id:             BOOKING_ID,
  booking_number: 'B001',
  status:         'confirmed',
  barber_id:      BARBER_ID,
  barber_name:    'Alex',
  total_amount:   200000,
  extras_total:   150000,
  slot_time:      '10:00',
  deferred:       false,
}

// ── Setup helpers ──────────────────────────────────────────────────────────────

async function injectKioskConfig(page) {
  await page.addInitScript((config) => {
    localStorage.setItem('kiosk_token',       'TEST-KIOSK-TOKEN')
    localStorage.setItem('kiosk_branch_id',   config.branch_id)
    localStorage.setItem('kiosk_branch_name', config.branch_name)
    localStorage.setItem('kiosk_config',      JSON.stringify(config))
  }, mockConfig)
}

async function mockApiRoutes(page, { bookingOverride } = {}) {
  await page.route('**/api/kiosk/register', route => route.fulfill({ json: mockConfig }))
  await page.route('**/api/events**', route => route.fulfill({ body: '', contentType: 'text/event-stream' }))
  await page.route('**/api/bookings?status=**', route => route.fulfill({ json: [] }))
  await page.route('**/api/slots/any-available**', route => route.fulfill({ json: ['10:00', '10:30'] }))
  await page.route('**/api/slots?**', route => route.fulfill({ json: ['10:00', '10:30'] }))
  await page.route('**/api/slots/now-window**', route => route.fulfill({ json: { freeNow: false, windowMin: 0, barberWindows: {} } }))
  await page.route('**/api/customers**', route => route.fulfill({ status: 404, json: null }))
  await page.route('**/api/bookings', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, json: bookingOverride ?? mockBookingResponse })
    } else {
      await route.continue()
    }
  })
}

// Navigate from Welcome → ServiceSelection → BarberSelection → TimeSlot
async function navigateToTimeSlot(page) {
  await page.goto('/')
  await page.getByTestId('start-booking-btn').click()
  await page.getByTestId(`service-${SERVICE_ID}`).click()
  await page.getByTestId('services-continue-btn').click()
  await page.getByTestId('barber-any').click()
  await page.getByTestId('barber-continue-btn').click()
  // Pick slot — "Now" is disabled (freeNow=false), use grid slot
  await expect(page.getByTestId('slot-10:00')).toBeVisible()
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('TimeSlot — extras quantity stepper (customer kiosk)', () => {
  test.beforeEach(async ({ page }) => {
    await injectKioskConfig(page)
    await mockApiRoutes(page)
    await navigateToTimeSlot(page)
  })

  // ── Slot selection reveals items ─────────────────────────────────────────────

  test('product and beverage cards appear after slot selection', async ({ page }) => {
    await page.getByTestId('slot-10:00').click()

    await expect(page.getByTestId(`extra-card-${PRODUCT_ID}`)).toBeVisible()
    await expect(page.getByTestId(`extra-card-${BEV_ID}`)).toBeVisible()
  })

  test('out-of-stock product card is visible but non-interactive', async ({ page }) => {
    await page.getByTestId('slot-10:00').click()

    const oosCard = page.getByTestId(`extra-card-${OOS_ID}`)
    await expect(oosCard).toBeVisible()

    // Force-click the non-interactive card — it must not show a stepper
    await oosCard.click({ force: true })
    await expect(oosCard.getByRole('button', { name: '−' })).not.toBeVisible()
    await expect(oosCard.getByRole('button', { name: '+' })).not.toBeVisible()
  })

  // ── Stepper appears on selection ─────────────────────────────────────────────

  test('clicking product card reveals stepper at qty=1', async ({ page }) => {
    await page.getByTestId('slot-10:00').click()

    const card = page.getByTestId(`extra-card-${PRODUCT_ID}`)
    await expect(card.getByRole('button', { name: '−' })).not.toBeVisible()

    await card.click()

    await expect(card.getByRole('button', { name: '−' })).toBeVisible()
    await expect(card.getByRole('button', { name: '+' })).toBeVisible()
    await expect(card.locator('span').filter({ hasText: /^1$/ })).toBeVisible()
  })

  test('clicking beverage card reveals stepper at qty=1', async ({ page }) => {
    await page.getByTestId('slot-10:00').click()

    const card = page.getByTestId(`extra-card-${BEV_ID}`)
    await card.click()

    await expect(card.getByRole('button', { name: '−' })).toBeVisible()
    await expect(card.locator('span').filter({ hasText: /^1$/ })).toBeVisible()
  })

  // ── Plus / minus ─────────────────────────────────────────────────────────────

  test('plus increments qty from 1 to 2', async ({ page }) => {
    await page.getByTestId('slot-10:00').click()
    const card = page.getByTestId(`extra-card-${PRODUCT_ID}`)
    await card.click()

    await card.getByRole('button', { name: '+' }).click()

    await expect(card.locator('span').filter({ hasText: /^2$/ })).toBeVisible()
  })

  test('minus at qty=1 deselects the card', async ({ page }) => {
    await page.getByTestId('slot-10:00').click()
    const card = page.getByTestId(`extra-card-${PRODUCT_ID}`)
    await card.click()

    await expect(card.getByRole('button', { name: '−' })).toBeVisible()
    await card.getByRole('button', { name: '−' }).click()

    // Stepper gone — card is unselected again
    await expect(card.getByRole('button', { name: '−' })).not.toBeVisible()
    await expect(card.getByRole('button', { name: '+' })).not.toBeVisible()
  })

  test('minus decrements qty from 3 to 2 without deselecting', async ({ page }) => {
    await page.getByTestId('slot-10:00').click()
    const card = page.getByTestId(`extra-card-${PRODUCT_ID}`)
    await card.click()

    const plusBtn  = card.getByRole('button', { name: '+' })
    const minusBtn = card.getByRole('button', { name: '−' })

    await plusBtn.click()
    await plusBtn.click()
    await expect(card.locator('span').filter({ hasText: /^3$/ })).toBeVisible()

    await minusBtn.click()
    await expect(card.locator('span').filter({ hasText: /^2$/ })).toBeVisible()
    await expect(minusBtn).toBeVisible()
  })

  test('plus disabled at max stock: qty stays at 5 for Teh Susu (stock=5)', async ({ page }) => {
    await page.getByTestId('slot-10:00').click()
    const card = page.getByTestId(`extra-card-${BEV_ID}`)
    await card.click()

    const plusBtn = card.getByRole('button', { name: '+' })

    // Click + four times to reach stock limit of 5
    for (let i = 0; i < 4; i++) await plusBtn.click()
    await expect(card.locator('span').filter({ hasText: /^5$/ })).toBeVisible()

    // Plus is non-interactive at max — force-click, qty must stay 5
    await plusBtn.click({ force: true })
    await expect(card.locator('span').filter({ hasText: /^5$/ })).toBeVisible()
  })

  // ── Add-ons total in slot bar ────────────────────────────────────────────────

  test('add-ons total updates in slot bar: 2 × 75000 = 150.000', async ({ page }) => {
    await page.getByTestId('slot-10:00').click()
    const card = page.getByTestId(`extra-card-${PRODUCT_ID}`)
    await card.click()
    await card.getByRole('button', { name: '+' }).click()

    // The slot bar shows "+Rp 150.000" (note the literal + prefix)
    await expect(page.getByText('+Rp 150.000', { exact: true })).toBeVisible()
  })

  // ── Continue and Confirm page ────────────────────────────────────────────────

  test('confirm page shows qty × price for selected extras', async ({ page }) => {
    await page.getByTestId('slot-10:00').click()
    const card = page.getByTestId(`extra-card-${PRODUCT_ID}`)
    await card.click()
    await card.getByRole('button', { name: '+' }).click()  // qty = 2

    await page.getByTestId('timeslot-continue-btn').click()

    // Confirm page shows "Pomade ×2" and subtotal 150.000
    await expect(page.getByText(/Pomade.*×2|Pomade ×2/)).toBeVisible()
    await expect(page.getByText(/150\.000/)).toBeVisible()
  })

  // ── Booking submit payload ───────────────────────────────────────────────────

  test('booking POST sends extras: [{item_id, quantity}] shape', async ({ page }) => {
    let capturedBody = null
    await page.route('**/api/bookings', async route => {
      if (route.request().method() === 'POST') {
        capturedBody = route.request().postDataJSON()
        await route.fulfill({ status: 201, json: mockBookingResponse })
      } else {
        await route.continue()
      }
    })

    await page.getByTestId('slot-10:00').click()
    const card = page.getByTestId(`extra-card-${PRODUCT_ID}`)
    await card.click()
    await card.getByRole('button', { name: '+' }).click()  // qty = 2

    await page.getByTestId('timeslot-continue-btn').click()

    // Type name in confirm screen
    await page.locator('input[placeholder*="name" i], input[placeholder*="nama" i]').first().click()
    const kb = page.getByTestId('name-keyboard')
    await kb.getByRole('button', { name: 'B', exact: true }).click()
    await kb.getByRole('button', { name: 'u', exact: true }).click()
    await kb.getByRole('button', { name: 'd', exact: true }).click()
    await kb.getByRole('button', { name: 'i', exact: true }).click()
    await page.getByTestId('confirm-booking-btn').click()

    await expect(async () => {
      expect(capturedBody).not.toBeNull()
    }).toPass({ timeout: 5000 })

    // Must send extras array, not legacy extra_ids
    expect(Array.isArray(capturedBody.extras)).toBe(true)
    expect(capturedBody.extras.some(
      e => e.item_id === PRODUCT_ID && e.quantity === 2
    )).toBe(true)
    // Legacy field must not be present
    expect(capturedBody.extra_ids).toBeUndefined()
  })
})
