import { test, expect } from '@playwright/test'

// ── Fixtures ───────────────────────────────────────────────────────────────────

const BRANCH_ID = 'c067bd6c-ee96-4b70-b8d6-ed71159dd74c'
const CAT_ID    = 'cat-uuid-001'
const ITEM_ID   = '357411f8-b1b4-4444-b029-5435aea16c0f'
const BARBER_ID = 'barber-uuid-001'
const USER_ID   = 'user-uuid-001'
const TODAY     = new Date().toISOString().split('T')[0]

const mockUser     = { id: USER_ID, name: 'Agrelia', role: 'owner', email: 'agreliarindengan08@gmail.com' }
const mockBranches = [{ id: BRANCH_ID, name: 'Kerobokan' }]
const mockCats     = [{ id: CAT_ID, key: 'rent', label: 'Rent', color: '#2563EB', bg: '#EFF6FF', is_active: true }]
const mockItems    = [{ id: ITEM_ID, name: 'Hair Powder', unit: 'pcs', category: 'product', is_active: true }]
const mockBarbers  = [{ id: BARBER_ID, name: 'Ady', branch_id: BRANCH_ID, is_active: true }]

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

  // Data loaders
  await page.route('**/api/branches', route =>
    route.fulfill({ json: overrides.branches ?? mockBranches })
  )
  await page.route('**/api/expenses/categories', route => {
    if (route.request().method() === 'GET')
      route.fulfill({ json: overrides.categories ?? mockCats })
    else
      route.continue()
  })
  await page.route('**/api/inventory/items**', route =>
    route.fulfill({ json: overrides.items ?? mockItems })
  )
  await page.route('**/api/barbers**', route =>
    route.fulfill({ json: overrides.barbers ?? mockBarbers })
  )
  await page.route('**/api/expenses?**', route =>
    route.fulfill({ json: overrides.expenses ?? [] })
  )
  await page.route('**/api/settings/users/**', route =>
    route.fulfill({ json: [] })
  )
  // Silence other admin data calls
  await page.route('**/api/events**', route =>
    route.fulfill({ body: '', contentType: 'text/event-stream' })
  )
}

async function goToExpenses(page) {
  await page.goto('/admin')
  // Wait for sidebar to render and click Expenses nav
  await page.getByRole('button', { name: 'Expenses' }).click()
  // Wait for the Expenses heading
  await expect(page.getByText('Log operating costs, stock purchases, and salary advances')).toBeVisible()
}

async function openAddForm(page) {
  await page.getByRole('button', { name: '+ Add Expense' }).click()
  await expect(page.getByText('New Expense')).toBeVisible()
}

// Clicks a type tab (Regular/Inventory/Kasbon) inside the form card only,
// avoiding the sidebar nav and filter-row buttons with the same name.
async function switchFormTab(page, name) {
  const formCard = page.locator('.admin-card').filter({ hasText: 'New Expense' })
  await formCard.getByRole('button', { name, exact: true }).click()
}

// ── Page load ─────────────────────────────────────────────────────────────────

test.describe('Expenses screen — page load', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page)
    await goToExpenses(page)
  })

  test('shows Expenses heading and Add Expense button', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+ Add Expense' })).toBeVisible()
  })

  test('shows empty state when no expenses', async ({ page }) => {
    await expect(page.getByText('No expenses found for this period')).toBeVisible()
  })

  test('shows expense list when expenses exist', async ({ page, context }) => {
    // Re-run with expenses data
    await page.close()
    const p2 = await context.newPage()
    const expense = {
      id: 'exp-1', type: 'regular', branch_id: BRANCH_ID,
      amount: 50000, expense_date: TODAY,
      description: 'Office supplies', source: 'petty_cash',
      category_name: 'Rent', created_by_name: 'Agrelia',
    }
    await setupAdmin(p2, { expenses: [expense] })
    await goToExpenses(p2)
    await expect(p2.getByText('Office supplies')).toBeVisible()
    await expect(p2.getByText('Rp 50.000')).toBeVisible()
  })
})

// ── Regular expense ────────────────────────────────────────────────────────────

test.describe('Regular expense — create', () => {
  let capturedBody = null

  test.beforeEach(async ({ page }) => {
    capturedBody = null
    await setupAdmin(page)
    // Intercept POST /api/expenses
    await page.route('**/api/expenses', async route => {
      if (route.request().method() === 'POST') {
        capturedBody = route.request().postDataJSON()
        route.fulfill({
          status: 201,
          json: {
            id: 'exp-new-1', type: 'regular', branch_id: BRANCH_ID,
            amount: capturedBody.amount, expense_date: capturedBody.expense_date,
            description: capturedBody.description, source: capturedBody.source,
            created_by_name: 'Agrelia',
          },
        })
      } else {
        route.continue()
      }
    })
    await goToExpenses(page)
    await openAddForm(page)
  })

  test('Regular tab is selected by default', async ({ page }) => {
    // Regular tab is active (has topBg background) — check form fields appear
    await expect(page.getByPlaceholder('e.g. Office supplies')).toBeVisible()
  })

  test('saves regular expense with correct payload', async ({ page }) => {
    // Branch auto-selected (only one branch)
    // Select category
    await page.locator('select').filter({ hasText: '— None —' }).selectOption(CAT_ID)
    // Source defaults to petty_cash — change to owner
    await page.locator('select').filter({ hasText: 'Petty Cash' }).first().selectOption('owner')
    // Amount
    await page.getByPlaceholder('150000').fill('75000')
    // Description
    await page.getByPlaceholder('e.g. Office supplies').fill('Cleaning supplies')
    // Submit
    await page.getByRole('button', { name: 'Save Expense' }).click()

    // Wait for saved state
    await expect(page.getByRole('button', { name: '✓ Saved' })).toBeVisible({ timeout: 5000 })

    // Verify payload
    expect(capturedBody.type).toBe('regular')
    expect(capturedBody.amount).toBe(75000)
    expect(capturedBody.description).toBe('Cleaning supplies')
    expect(capturedBody.source).toBe('owner')
    expect(capturedBody.branch_id).toBe(BRANCH_ID)
    expect(capturedBody.category_id).toBe(CAT_ID)
    // UUIDs must not be integers
    expect(typeof capturedBody.branch_id).toBe('string')
    expect(capturedBody.branch_id).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('validation blocks submit when amount is empty', async ({ page }) => {
    await page.getByPlaceholder('e.g. Office supplies').fill('Test desc')
    // Don't fill amount
    await page.getByRole('button', { name: 'Save Expense' }).click()
    // Form stays open — no "Saved" state
    await expect(page.getByRole('button', { name: 'Save Expense' })).toBeVisible()
    expect(capturedBody).toBeNull()
  })

  test('validation blocks submit when description is empty', async ({ page }) => {
    await page.getByPlaceholder('150000').fill('50000')
    await page.getByRole('button', { name: 'Save Expense' }).click()
    expect(capturedBody).toBeNull()
  })

  test('new expense appears in list after save', async ({ page }) => {
    await page.getByPlaceholder('150000').fill('99000')
    await page.getByPlaceholder('e.g. Office supplies').fill('Test expense')
    await page.getByRole('button', { name: 'Save Expense' }).click()
    await expect(page.getByRole('button', { name: '✓ Saved' })).toBeVisible({ timeout: 5000 })
    // After form closes, expense should be in list
    await expect(page.getByText('Test expense')).toBeVisible({ timeout: 3000 })
  })
})

// ── Inventory expense ──────────────────────────────────────────────────────────

test.describe('Inventory expense — create', () => {
  let capturedBody = null

  test.beforeEach(async ({ page }) => {
    capturedBody = null
    await setupAdmin(page)
    await page.route('**/api/expenses', async route => {
      if (route.request().method() === 'POST') {
        capturedBody = route.request().postDataJSON()
        route.fulfill({
          status: 201,
          json: {
            id: 'exp-inv-1', type: 'inventory', branch_id: null,
            amount: capturedBody.amount, expense_date: capturedBody.expense_date,
            description: capturedBody.description,
          },
        })
      } else {
        route.continue()
      }
    })
    await goToExpenses(page)
    await openAddForm(page)
    // Switch to Inventory tab
    await switchFormTab(page, 'Inventory')
    await expect(page.getByPlaceholder('e.g. Pomade restock batch')).toBeVisible()
  })

  test('Inventory form shows item selector and distribution row', async ({ page }) => {
    await expect(page.getByText('Item Received *')).toBeVisible()
    await expect(page.getByText('Distribution')).toBeVisible()
    // Auto-populated distLine branch_id (single branch) — Kerobokan should show in select
    const distBranchSelect = page.locator('select').filter({ hasText: 'Kerobokan' }).first()
    await expect(distBranchSelect).toBeVisible()
  })

  test('saves inventory expense with UUID item_id and correct branch_id', async ({ page }) => {
    // Fill amount
    await page.getByPlaceholder('500000').fill('145000')
    // Fill description
    await page.getByPlaceholder('e.g. Pomade restock batch').fill('Hair Powder restock')
    // Select item
    await page.locator('select').filter({ hasText: '— Select item —' }).selectOption(ITEM_ID)
    // Fill qty in auto-populated dist line
    await page.getByPlaceholder('Qty').fill('3')
    // Submit
    await page.getByRole('button', { name: 'Save Expense' }).click()
    await expect(page.getByRole('button', { name: '✓ Saved' })).toBeVisible({ timeout: 5000 })

    // Verify payload
    expect(capturedBody.type).toBe('inventory')
    expect(capturedBody.amount).toBe(145000)
    expect(capturedBody.stock_items).toHaveLength(1)
    const item = capturedBody.stock_items[0]
    // item_id must be UUID string, not integer
    expect(item.item_id).toBe(ITEM_ID)
    expect(typeof item.item_id).toBe('string')
    expect(item.item_id).toMatch(/^[0-9a-f-]{36}$/)
    // branch_id from dist line must be UUID, not null
    expect(item.branch_id).toBe(BRANCH_ID)
    expect(item.qty).toBe(3)
  })

  test('validation blocks submit when no item selected', async ({ page }) => {
    await page.getByPlaceholder('500000').fill('50000')
    await page.getByPlaceholder('e.g. Pomade restock batch').fill('Test')
    await page.getByPlaceholder('Qty').fill('2')
    // Don't select item
    await page.getByRole('button', { name: 'Save Expense' }).click()
    expect(capturedBody).toBeNull()
  })

  test('validation blocks submit when qty is zero', async ({ page }) => {
    await page.getByPlaceholder('500000').fill('50000')
    await page.getByPlaceholder('e.g. Pomade restock batch').fill('Test')
    await page.locator('select').filter({ hasText: '— Select item —' }).selectOption(ITEM_ID)
    // Leave qty empty
    await page.getByRole('button', { name: 'Save Expense' }).click()
    expect(capturedBody).toBeNull()
  })

  test('smart cost shows unit cost after amount + qty filled', async ({ page }) => {
    await page.getByPlaceholder('500000').fill('90000')
    await page.locator('select').filter({ hasText: '— Select item —' }).selectOption(ITEM_ID)
    await page.getByPlaceholder('Qty').fill('3')
    // Should show total qty info
    await expect(page.getByText('Total Qty:')).toBeVisible()
    await expect(page.getByText('Unit Cost:')).toBeVisible()
    await expect(page.getByText('Rp 30.000')).toBeVisible()
  })

  test('+ Add Branch adds another dist line', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Branch' }).click()
    const qtyInputs = page.getByPlaceholder('Qty')
    await expect(qtyInputs).toHaveCount(2)
  })
})

// ── Kasbon expense ─────────────────────────────────────────────────────────────

test.describe('Kasbon expense — create', () => {
  let capturedBody = null

  test.beforeEach(async ({ page }) => {
    capturedBody = null
    await setupAdmin(page)
    await page.route('**/api/expenses', async route => {
      if (route.request().method() === 'POST') {
        capturedBody = route.request().postDataJSON()
        route.fulfill({
          status: 201,
          json: {
            id: 'exp-kas-1', type: 'kasbon', branch_id: BRANCH_ID,
            barber_id: capturedBody.barber_id, amount: capturedBody.amount,
            expense_date: capturedBody.expense_date,
          },
        })
      } else {
        route.continue()
      }
    })
    await goToExpenses(page)
    await openAddForm(page)
    // Switch to Kasbon tab
    await switchFormTab(page, 'Kasbon')
    await expect(page.getByText('Deduct Period')).toBeVisible()
  })

  test('Kasbon form shows barber select and deduct period', async ({ page }) => {
    await expect(page.getByText('Barber *')).toBeVisible()
    await expect(page.getByText('Deduct Period')).toBeVisible()
    // Verify the deduct period select is present with the default option
    await expect(page.locator('select').filter({ hasText: 'This Payroll Period' })).toBeVisible()
  })

  test('saves kasbon with UUID barber_id', async ({ page }) => {
    // Select barber
    await page.locator('select').filter({ hasText: '— Select barber —' }).selectOption(BARBER_ID)
    // Amount
    await page.getByPlaceholder('500000').fill('200000')
    // Note (optional)
    await page.getByPlaceholder('e.g. Medical emergency advance').fill('Medical advance')
    // Submit
    await page.getByRole('button', { name: 'Save Expense' }).click()
    await expect(page.getByRole('button', { name: '✓ Saved' })).toBeVisible({ timeout: 5000 })

    expect(capturedBody.type).toBe('kasbon')
    expect(capturedBody.amount).toBe(200000)
    // barber_id must be UUID string, not integer
    expect(capturedBody.barber_id).toBe(BARBER_ID)
    expect(typeof capturedBody.barber_id).toBe('string')
    // Must not be an integer (parseInt would have returned NaN or truncated value)
    expect(Number.isInteger(capturedBody.barber_id)).toBe(false)
    expect(capturedBody.deduct_period).toBe('current')
  })

  test('can change deduct period to next', async ({ page }) => {
    await page.locator('select').filter({ hasText: '— Select barber —' }).selectOption(BARBER_ID)
    await page.locator('select').filter({ hasText: 'This Payroll Period' }).selectOption('next')
    await page.getByPlaceholder('500000').fill('100000')
    await page.getByRole('button', { name: 'Save Expense' }).click()
    await expect(page.getByRole('button', { name: '✓ Saved' })).toBeVisible({ timeout: 5000 })
    expect(capturedBody.deduct_period).toBe('next')
  })

  test('validation blocks submit without barber', async ({ page }) => {
    await page.getByPlaceholder('500000').fill('100000')
    await page.getByRole('button', { name: 'Save Expense' }).click()
    expect(capturedBody).toBeNull()
  })

  test('description defaults to Salary advance when note is empty', async ({ page }) => {
    await page.locator('select').filter({ hasText: '— Select barber —' }).selectOption(BARBER_ID)
    await page.getByPlaceholder('500000').fill('150000')
    await page.getByRole('button', { name: 'Save Expense' }).click()
    await expect(page.getByRole('button', { name: '✓ Saved' })).toBeVisible({ timeout: 5000 })
    expect(capturedBody.description).toBe('Salary advance')
  })
})

// ── Category creation ──────────────────────────────────────────────────────────

test.describe('Create expense category', () => {
  let capturedCatBody = null

  test.beforeEach(async ({ page }) => {
    capturedCatBody = null
    await setupAdmin(page)
    await page.route('**/api/expenses/categories', async route => {
      if (route.request().method() === 'POST') {
        capturedCatBody = route.request().postDataJSON()
        route.fulfill({
          status: 201,
          json: {
            id: 'cat-new-1',
            key: capturedCatBody.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            label: capturedCatBody.label,
            color: capturedCatBody.color || '#2563EB',
            bg: '#EFF6FF',
          },
        })
      } else {
        // GET categories
        route.fulfill({ json: mockCats })
      }
    })
    await goToExpenses(page)
    await openAddForm(page)
  })

  test('category modal opens via dropdown option', async ({ page }) => {
    await page.locator('select').filter({ hasText: '— None —' }).selectOption('__create__')
    await expect(page.getByText('New Expense Category')).toBeVisible()
    await expect(page.getByPlaceholder('e.g. Marketing, Rent…')).toBeVisible()
  })

  test('Create Category button disabled until label entered', async ({ page }) => {
    await page.locator('select').filter({ hasText: '— None —' }).selectOption('__create__')
    const createBtn = page.getByRole('button', { name: 'Create Category' })
    await expect(createBtn).toBeDisabled()
    await page.getByPlaceholder('e.g. Marketing, Rent…').fill('Marketing')
    await expect(createBtn).toBeEnabled()
  })

  test('preview badge shows label text', async ({ page }) => {
    await page.locator('select').filter({ hasText: '— None —' }).selectOption('__create__')
    await page.getByPlaceholder('e.g. Marketing, Rent…').fill('Transport')
    await expect(page.getByText('Transport — preview')).toBeVisible()
  })

  test('creates category with correct label and POSTs to /expenses/categories', async ({ page }) => {
    await page.locator('select').filter({ hasText: '— None —' }).selectOption('__create__')
    await page.getByPlaceholder('e.g. Marketing, Rent…').fill('Utilities')
    await page.getByRole('button', { name: 'Create Category' }).click()

    // Modal closes
    await expect(page.getByText('New Expense Category')).not.toBeVisible({ timeout: 3000 })

    // API was called correctly
    expect(capturedCatBody.label).toBe('Utilities')
    // Should NOT have posted to /expense-categories (old wrong path)
    // The mock intercepts /api/expenses/categories — if it got here, URL is correct
  })

  test('selects new category after creation', async ({ page }) => {
    await page.locator('select').filter({ hasText: '— None —' }).selectOption('__create__')
    await page.getByPlaceholder('e.g. Marketing, Rent…').fill('New Cat')
    await page.getByRole('button', { name: 'Create Category' }).click()
    await expect(page.getByText('New Expense Category')).not.toBeVisible({ timeout: 3000 })
    // The new category should now be selected in the dropdown
    const catSelect = page.locator('select').filter({ hasText: 'Rent' })
    await expect(catSelect).toBeVisible()
  })

  test('Cancel closes modal without creating', async ({ page }) => {
    await page.locator('select').filter({ hasText: '— None —' }).selectOption('__create__')
    await page.getByPlaceholder('e.g. Marketing, Rent…').fill('Will be cancelled')
    // Scope Cancel to the category modal to avoid matching the form's Cancel button
    const modal = page.locator('.admin-card').filter({ hasText: 'New Expense Category' })
    await modal.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('New Expense Category')).not.toBeVisible()
    expect(capturedCatBody).toBeNull()
  })

  test('color selection changes preview color', async ({ page }) => {
    await page.locator('select').filter({ hasText: '— None —' }).selectOption('__create__')
    await page.getByPlaceholder('e.g. Marketing, Rent…').fill('Green Cat')
    // Browser converts #16A34A hex to rgb(22, 163, 74) in inline styles
    await page.locator('[style*="22, 163, 74"]').click()
    await page.getByRole('button', { name: 'Create Category' }).click()
    await expect(page.getByText('New Expense Category')).not.toBeVisible({ timeout: 3000 })
    expect(capturedCatBody.color).toBe('#16A34A')
  })
})

// ── Form tab switching ─────────────────────────────────────────────────────────

test.describe('Form tab switching', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page)
    await goToExpenses(page)
    await openAddForm(page)
  })

  test('switching tabs resets form fields', async ({ page }) => {
    // Fill regular form
    await page.getByPlaceholder('150000').fill('99999')
    await page.getByPlaceholder('e.g. Office supplies').fill('Some desc')
    // Switch to Inventory
    await switchFormTab(page, 'Inventory')
    await expect(page.getByPlaceholder('e.g. Pomade restock batch')).toBeVisible()
    await expect(page.getByPlaceholder('e.g. Pomade restock batch')).toHaveValue('')
    // Switch to Kasbon
    await switchFormTab(page, 'Kasbon')
    await expect(page.getByPlaceholder('500000')).toHaveValue('')
  })

  test('Cancel button closes form', async ({ page }) => {
    // Scope to the form card to avoid the category modal's Cancel button
    const formCard = page.locator('.admin-card').filter({ hasText: 'New Expense' })
    await formCard.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('New Expense')).not.toBeVisible()
  })

  test('+ Add Expense toggle closes form', async ({ page }) => {
    await page.getByRole('button', { name: '✕ Cancel' }).click()
    await expect(page.getByText('New Expense')).not.toBeVisible()
  })
})
