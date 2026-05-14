import { test, expect } from '@playwright/test'

// ── Fixture data ────────────────────────────────────────────────────────────────

const BRANCH_ID  = 'test-branch-id'
const BARBER_ID  = 'barber-id-1'
const SERVICE_ID = 'service-id-1'
const DATE       = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' })

const mockConfig = {
  branch_id:    BRANCH_ID,
  branch_name:  'Test Branch',
  settings:     { idle_timeout_sec: 999 },
  feedback_tags: [],
  menu_items:   [],
  services: [
    {
      id:               SERVICE_ID,
      name:             'Regular Haircut',
      category:         'haircut',
      duration_minutes: 30,
      base_price:       50000,
      is_active:        true,
    },
  ],
  barbers: [
    {
      id:              BARBER_ID,
      name:            'Alex',
      status:          'available',
      is_active:       true,
      spec:            'Haircut',
      rating:          4.8,
    },
  ],
}

const mockBookingResponse = {
  id:             'bk-test-1',
  booking_number: 'B001',
  status:         'confirmed',
  barber_id:      BARBER_ID,
  barber_name:    'Alex',
  total_amount:   50000,
  slot_time:      null, // Now booking
  deferred:       false,
}

// ── Setup helpers ────────────────────────────────────────────────────────────────

async function injectKioskConfig(page) {
  await page.addInitScript((config) => {
    localStorage.setItem('kiosk_token',       'TEST-KIOSK-TOKEN')
    localStorage.setItem('kiosk_branch_id',   config.branch_id)
    localStorage.setItem('kiosk_branch_name', config.branch_name)
    localStorage.setItem('kiosk_config',      JSON.stringify(config))
  }, mockConfig)
}

async function mockApiRoutes(page, overrides = {}) {
  // Re-validate token on mount
  await page.route('**/api/kiosk/register', route =>
    route.fulfill({ json: mockConfig })
  )

  // Slots
  await page.route('**/api/slots/any-available**', route =>
    route.fulfill({ json: overrides.slots ?? ['10:00', '10:30', '11:00'] })
  )
  await page.route('**/api/slots?**', route =>
    route.fulfill({ json: overrides.slots ?? ['10:00', '10:30', '11:00'] })
  )

  // Now window
  await page.route('**/api/slots/now-window**', route =>
    route.fulfill({ json: overrides.nowWindow ?? { freeNow: true, windowMin: 555, barberWindows: { [BARBER_ID]: 555 } } })
  )

  // Customers
  await page.route('**/api/customers**', route =>
    route.fulfill({ json: null, status: 404 })
  )

  // Create booking
  await page.route('**/api/bookings', async route => {
    if (route.request().method() === 'POST') {
      route.fulfill({ json: overrides.booking ?? mockBookingResponse, status: 201 })
    } else {
      route.continue()
    }
  })

  // Pending payment check (home screen)
  await page.route('**/api/bookings?status=pending_payment**', route =>
    route.fulfill({ json: [] })
  )

  // SSE — return empty stream so it doesn't hang
  await page.route('**/api/events**', route =>
    route.fulfill({ body: '', contentType: 'text/event-stream' })
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────────

test.describe('Booking flow — happy path', () => {
  test.beforeEach(async ({ page }) => {
    await injectKioskConfig(page)
    await mockApiRoutes(page)
    await page.goto('/')
  })

  test('Welcome screen shows start button', async ({ page }) => {
    await expect(page.getByTestId('start-booking-btn')).toBeVisible()
  })

  test('clicking Start navigates to service selection', async ({ page }) => {
    await page.getByTestId('start-booking-btn').click()
    await expect(page.getByTestId('services-continue-btn')).toBeVisible()
  })

  test('service card is selectable and continue enables', async ({ page }) => {
    await page.getByTestId('start-booking-btn').click()

    const serviceCard = page.getByTestId(`service-${SERVICE_ID}`)
    await expect(serviceCard).toBeVisible()
    await expect(page.getByTestId('services-continue-btn')).toBeDisabled()

    await serviceCard.click()
    await expect(page.getByTestId('services-continue-btn')).toBeEnabled()
  })

  test('navigates through service → barber → time → confirm', async ({ page }) => {
    // Step 1: select service
    await page.getByTestId('start-booking-btn').click()
    await page.getByTestId(`service-${SERVICE_ID}`).click()
    await page.getByTestId('services-continue-btn').click()

    // Step 2: select "Any Available" barber
    await expect(page.getByTestId('barber-any')).toBeVisible()
    await page.getByTestId('barber-any').click()
    await expect(page.getByTestId('barber-continue-btn')).toBeEnabled()
    await page.getByTestId('barber-continue-btn').click()

    // Step 3: pick a time slot
    // "Now ⚡" should be clickable because nowWindow.freeNow=true and slots[0] is near now
    // Alternatively pick the first grid slot
    await expect(page.getByTestId('timeslot-continue-btn')).toBeDisabled()
    await page.getByTestId('slot-10:00').click()
    await expect(page.getByTestId('timeslot-continue-btn')).toBeEnabled()
    await page.getByTestId('timeslot-continue-btn').click()

    // Step 4: confirm — need a name
    await expect(page.getByTestId('confirm-booking-btn')).toBeVisible()
  })

  test('full booking flow reaches QueueNumber screen', async ({ page }) => {
    // Step 1
    await page.getByTestId('start-booking-btn').click()
    await page.getByTestId(`service-${SERVICE_ID}`).click()
    await page.getByTestId('services-continue-btn').click()

    // Step 2
    await page.getByTestId('barber-any').click()
    await page.getByTestId('barber-continue-btn').click()

    // Step 3
    await page.getByTestId('slot-10:00').click()
    await page.getByTestId('timeslot-continue-btn').click()

    // Step 4 — tap name field to show keyboard, type via virtual keys
    await page.locator('input[placeholder*="name" i], input[placeholder*="nama" i]').first().click()
    const kb = page.getByTestId('name-keyboard')
    await kb.getByRole('button', { name: 'B', exact: true }).click()
    await kb.getByRole('button', { name: 'u', exact: true }).click()
    await kb.getByRole('button', { name: 'd', exact: true }).click()
    await kb.getByRole('button', { name: 'i', exact: true }).click()
    await page.getByTestId('confirm-booking-btn').click()

    // Step 5 — queue number screen
    await expect(page.getByTestId('queue-confirmed')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('queue-confirmed')).toContainText('Reservation Confirmed')
  })
})

test.describe('Swap services path (NowPickerModal)', () => {
  test.beforeEach(async ({ page }) => {
    await injectKioskConfig(page)
  })

  test('Now button opens NowPickerModal when service duration exceeds window', async ({ page }) => {
    // Override config: add a long (200min) service
    const longServiceId = 'service-id-long'
    const configWithLong = {
      ...mockConfig,
      services: [
        ...mockConfig.services,
        {
          id:               longServiceId,
          name:             'Big Package',
          category:         'package',
          duration_minutes: 200,
          base_price:       500000,
          is_active:        true,
        },
      ],
    }
    // Re-inject config with long service
    await page.addInitScript((config) => {
      localStorage.setItem('kiosk_token',       'TEST-KIOSK-TOKEN')
      localStorage.setItem('kiosk_branch_id',   config.branch_id)
      localStorage.setItem('kiosk_branch_name', config.branch_name)
      localStorage.setItem('kiosk_config',      JSON.stringify(config))
    }, configWithLong)

    await mockApiRoutes(page, {
      // Window is only 60 min but service is 200 min → showNowPicker should activate
      nowWindow: { freeNow: true, windowMin: 60, barberWindows: { [BARBER_ID]: 60 } },
      slots: [], // no scheduled slots available
    })

    await page.route('**/api/kiosk/register', route =>
      route.fulfill({ json: configWithLong })
    )

    await page.goto('/')

    // Navigate to TimeSlot with the long service selected
    await page.getByTestId('start-booking-btn').click()
    await page.getByTestId(`service-${longServiceId}`).click()
    await page.getByTestId('services-continue-btn').click()
    await page.getByTestId('barber-any').click()
    await page.getByTestId('barber-continue-btn').click()

    // Now button should show "Adjust services →" sub-label
    const nowBtn = page.getByTestId('now-btn')
    await expect(nowBtn).toBeVisible()
    await expect(nowBtn).toContainText('Adjust services')

    // Click opens NowPickerModal
    await nowBtn.click()
    await expect(page.getByTestId('nowpicker-confirm-btn')).toBeVisible()
  })

  test('unchecking a service in NowPickerModal enables confirm', async ({ page }) => {
    const longServiceId = 'service-id-long'
    const configWithTwo = {
      ...mockConfig,
      services: [
        {
          id:               SERVICE_ID,
          name:             'Regular Haircut',
          category:         'haircut',
          duration_minutes: 30,
          base_price:       50000,
          is_active:        true,
        },
        {
          id:               longServiceId,
          name:             'Long Treatment',
          category:         'treatment',
          duration_minutes: 90,
          base_price:       200000,
          is_active:        true,
        },
      ],
    }
    await page.addInitScript((config) => {
      localStorage.setItem('kiosk_token',       'TEST-KIOSK-TOKEN')
      localStorage.setItem('kiosk_branch_id',   config.branch_id)
      localStorage.setItem('kiosk_branch_name', config.branch_name)
      localStorage.setItem('kiosk_config',      JSON.stringify(config))
    }, configWithTwo)

    // Window = 50 min, total dur = 30+90=120 → exceeds window, but 30 fits
    await mockApiRoutes(page, {
      nowWindow: { freeNow: true, windowMin: 50, barberWindows: { [BARBER_ID]: 50 } },
      slots: [],
    })
    await page.route('**/api/kiosk/register', route =>
      route.fulfill({ json: configWithTwo })
    )

    await page.goto('/')
    await page.getByTestId('start-booking-btn').click()

    // Select both services
    await page.getByTestId(`service-${SERVICE_ID}`).click()
    await page.getByTestId(`service-${longServiceId}`).click()
    await page.getByTestId('services-continue-btn').click()
    await page.getByTestId('barber-any').click()
    await page.getByTestId('barber-continue-btn').click()

    // Click Now — opens modal
    await page.getByTestId('now-btn').click()
    await expect(page.getByTestId('nowpicker-confirm-btn')).toBeVisible()

    // Confirm disabled because 120 min > 50 min window
    await expect(page.getByTestId('nowpicker-confirm-btn')).toBeDisabled()

    // Uncheck the long service
    await page.getByTestId(`nowpicker-service-${longServiceId}`).click()

    // Now only 30 min checked — fits in 50 min window → confirm enabled
    await expect(page.getByTestId('nowpicker-confirm-btn')).toBeEnabled()

    // Confirm advances to confirm screen
    await page.getByTestId('nowpicker-confirm-btn').click()
    await expect(page.getByTestId('confirm-booking-btn')).toBeVisible()
  })
})

// ── Barber availability states ────────────────────────────────────────────────

test.describe('Barber availability states', () => {
  async function navigateToBarberSelection(page, config) {
    await page.addInitScript((cfg) => {
      localStorage.setItem('kiosk_token',       'TEST-KIOSK-TOKEN')
      localStorage.setItem('kiosk_branch_id',   cfg.branch_id)
      localStorage.setItem('kiosk_branch_name', cfg.branch_name)
      localStorage.setItem('kiosk_config',      JSON.stringify(cfg))
    }, config)
    await page.route('**/api/kiosk/register', route => route.fulfill({ json: config }))
    await page.goto('/')
    await page.getByTestId('start-booking-btn').click()
    await page.getByTestId(`service-${SERVICE_ID}`).click()
    await page.getByTestId('services-continue-btn').click()
  }

  test('clocked_out barber shows Unavailable badge and click is ignored', async ({ page }) => {
    const config = {
      ...mockConfig,
      barbers: [{ ...mockConfig.barbers[0], status: 'clocked_out' }],
    }
    await mockApiRoutes(page)
    await navigateToBarberSelection(page, config)

    await expect(page.getByTestId(`barber-${BARBER_ID}`)).toContainText('Unavailable')

    // Clicking an unavailable card must not select it
    await page.getByTestId(`barber-${BARBER_ID}`).click()
    await expect(page.getByTestId('barber-continue-btn')).toBeDisabled()
  })

  test('on_break barber shows On Break badge and cannot be selected', async ({ page }) => {
    const config = {
      ...mockConfig,
      barbers: [{ ...mockConfig.barbers[0], status: 'on_break' }],
    }
    await mockApiRoutes(page)
    await navigateToBarberSelection(page, config)

    await expect(page.getByTestId(`barber-${BARBER_ID}`)).toContainText('On Break')

    // on_break is in isUnavailable — click must not select
    await page.getByTestId(`barber-${BARBER_ID}`).click()
    await expect(page.getByTestId('barber-continue-btn')).toBeDisabled()
  })

  test('busy barber is selectable and shows Busy badge', async ({ page }) => {
    const config = {
      ...mockConfig,
      barbers: [{ ...mockConfig.barbers[0], status: 'busy' }],
    }
    await mockApiRoutes(page, {
      slots:     [],
      nowWindow: { freeNow: false, windowMin: 0, barberWindows: {} },
    })
    await navigateToBarberSelection(page, config)

    // busy is not in isUnavailable — card clickable, badge shows "Busy"
    await expect(page.getByTestId(`barber-${BARBER_ID}`)).toContainText('Busy')
    await page.getByTestId(`barber-${BARBER_ID}`).click()
    await expect(page.getByTestId('barber-continue-btn')).toBeEnabled()
  })

  test('Now button disabled and inert when freeNow=false', async ({ page }) => {
    await injectKioskConfig(page)
    // Use late-night slots so firstSlotMin is never within 4 min of test run time
    await mockApiRoutes(page, {
      slots:     ['22:00', '22:30'],
      nowWindow: { freeNow: false, windowMin: 0, barberWindows: {} },
    })
    await page.goto('/')

    await page.getByTestId('start-booking-btn').click()
    await page.getByTestId(`service-${SERVICE_ID}`).click()
    await page.getByTestId('services-continue-btn').click()
    await page.getByTestId('barber-any').click()
    await page.getByTestId('barber-continue-btn').click()

    // Clicking Now must not set a slot (canNow=false, showNowPicker=false)
    await page.getByTestId('now-btn').click()
    await expect(page.getByTestId('timeslot-continue-btn')).toBeDisabled()

    // Grid slots are still visible and selectable
    await expect(page.getByTestId('slot-22:00')).toBeVisible()
  })

  test('no slots and freeNow=false shows no-availability message', async ({ page }) => {
    await injectKioskConfig(page)
    await mockApiRoutes(page, {
      slots:     [],
      nowWindow: { freeNow: false, windowMin: 0, barberWindows: {} },
    })
    await page.goto('/')

    await page.getByTestId('start-booking-btn').click()
    await page.getByTestId(`service-${SERVICE_ID}`).click()
    await page.getByTestId('services-continue-btn').click()
    await page.getByTestId('barber-any').click()
    await page.getByTestId('barber-continue-btn').click()

    await expect(page.getByText(/no available slots today/i)).toBeVisible()
    await expect(page.getByTestId('timeslot-continue-btn')).toBeDisabled()
  })
})
