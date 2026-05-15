jest.mock('../middleware/auth', () => ({
  requireAdmin: (req, res, next) => { req.user = { id: 'user-uuid-001' }; next() },
}))

jest.mock('../config/db', () => {
  const client = { query: jest.fn(), release: jest.fn() }
  const pool   = { query: jest.fn(), connect: jest.fn().mockResolvedValue(client), _client: client }
  return pool
})

const request = require('supertest')
const express = require('express')
const expensesRouter = require('../routes/expenses')
const pool = require('../config/db')

const app = express()
app.use(express.json())
app.use('/api/expenses', expensesRouter)

const BRANCH   = 'c067bd6c-ee96-4b70-b8d6-ed71159dd74c'
const ITEM     = '357411f8-b1b4-4444-b029-5435aea16c0f'
const CAT_ID   = 'cat-uuid-001'
const USER_ID  = 'user-uuid-001'

beforeEach(() => {
  jest.clearAllMocks()
  pool._client.query.mockReset()
  pool._client.release.mockReset()
})

// ── GET /categories ────────────────────────────────────────────────────────────

describe('GET /api/expenses/categories', () => {
  it('returns categories list', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: CAT_ID, label: 'Rent', key: 'rent' }] })
    const res = await request(app).get('/api/expenses/categories')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ id: CAT_ID, label: 'Rent', key: 'rent' }])
  })
})

// ── POST /categories ───────────────────────────────────────────────────────────

describe('POST /api/expenses/categories', () => {
  it('creates category with derived key', async () => {
    const newCat = { id: CAT_ID, key: 'office_supplies', label: 'Office Supplies', color: '#2563EB', bg: '#EFF6FF' }
    pool.query.mockResolvedValueOnce({ rows: [newCat] })
    const res = await request(app).post('/api/expenses/categories').send({ label: 'Office Supplies' })
    expect(res.status).toBe(201)
    expect(res.body.label).toBe('Office Supplies')
    const sql = pool.query.mock.calls[0][0]
    expect(sql).toMatch(/INSERT INTO expense_categories/)
    const params = pool.query.mock.calls[0][1]
    expect(params[0]).toBe('office_supplies')
    expect(params[1]).toBe('Office Supplies')
  })

  it('rejects missing label', async () => {
    const res = await request(app).post('/api/expenses/categories').send({})
    expect(res.status).toBe(400)
  })

  it('rejects empty label', async () => {
    const res = await request(app).post('/api/expenses/categories').send({ label: '   ' })
    expect(res.status).toBe(400)
  })
})

// ── POST / (regular expense) ───────────────────────────────────────────────────

describe('POST /api/expenses — regular', () => {
  function mockTransactionSuccess(expenseRow) {
    const c = pool._client
    c.query
      .mockResolvedValueOnce({})                      // BEGIN
      .mockResolvedValueOnce({ rows: [expenseRow] })  // INSERT expense
      .mockResolvedValueOnce({})                      // COMMIT
  }

  it('creates regular expense with correct columns', async () => {
    const expense = { id: 'exp-001', branch_id: BRANCH, type: 'regular', amount: 50000, source: 'petty_cash' }
    mockTransactionSuccess(expense)
    const res = await request(app).post('/api/expenses').send({
      branch_id: BRANCH, type: 'regular', amount: 50000,
      expense_date: '2026-05-15', description: 'Snacks', source: 'petty_cash',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe('exp-001')
    const insertCall = pool._client.query.mock.calls[1]
    expect(insertCall[0]).toMatch(/submitted_by/)
    expect(insertCall[0]).not.toMatch(/created_by/)
    expect(insertCall[0]).toMatch(/source/)
    expect(insertCall[0]).not.toMatch(/notes/)
    expect(insertCall[0]).toMatch(/receipt_url/)
    expect(insertCall[1]).toContain(USER_ID)
    expect(insertCall[1]).toContain('petty_cash')
  })

  it('rejects when amount missing', async () => {
    const res = await request(app).post('/api/expenses').send({
      branch_id: BRANCH, expense_date: '2026-05-15', type: 'regular',
    })
    expect(res.status).toBe(400)
  })

  it('rejects regular expense without branch_id', async () => {
    const res = await request(app).post('/api/expenses').send({
      type: 'regular', amount: 50000, expense_date: '2026-05-15',
    })
    expect(res.status).toBe(400)
  })

  it('defaults source to petty_cash when not provided', async () => {
    const expense = { id: 'exp-002', source: 'petty_cash' }
    mockTransactionSuccess(expense)
    await request(app).post('/api/expenses').send({
      branch_id: BRANCH, type: 'regular', amount: 10000, expense_date: '2026-05-15',
    })
    const params = pool._client.query.mock.calls[1][1]
    expect(params).toContain('petty_cash')
  })
})

// ── POST / (inventory expense) ─────────────────────────────────────────────────

describe('POST /api/expenses — inventory', () => {
  function mockInventorySuccess(expenseRow) {
    const c = pool._client
    c.query
      .mockResolvedValueOnce({})                      // BEGIN
      .mockResolvedValueOnce({ rows: [expenseRow] })  // INSERT expense
      .mockResolvedValueOnce({})                      // INSERT expense_stock_items
      .mockResolvedValueOnce({})                      // UPSERT inventory_stock
      .mockResolvedValueOnce({})                      // INSERT inventory_movements
      .mockResolvedValueOnce({})                      // COMMIT
  }

  it('creates inventory expense without top-level branch_id', async () => {
    const expense = { id: 'exp-inv-001', type: 'inventory', branch_id: null }
    mockInventorySuccess(expense)
    const res = await request(app).post('/api/expenses').send({
      type: 'inventory', amount: 100000, expense_date: '2026-05-15',
      description: 'Hair Powder restock',
      stock_items: [{ item_id: ITEM, branch_id: BRANCH, qty: 3 }],
    })
    expect(res.status).toBe(201)
  })

  it('uses item.branch_id for stock and movement inserts, not top-level branch_id', async () => {
    const expense = { id: 'exp-inv-002', type: 'inventory' }
    mockInventorySuccess(expense)
    await request(app).post('/api/expenses').send({
      type: 'inventory', amount: 50000, expense_date: '2026-05-15',
      stock_items: [{ item_id: ITEM, branch_id: BRANCH, qty: 2 }],
    })
    const calls = pool._client.query.mock.calls
    const stockItemsInsert = calls[2][1]
    expect(stockItemsInsert).toContain(BRANCH)
    const inventoryStockUpsert = calls[3][1]
    expect(inventoryStockUpsert).toContain(BRANCH)
    const movementsInsert = calls[4][1]
    expect(movementsInsert).toContain(BRANCH)
  })

  it('increments stock by qty', async () => {
    const expense = { id: 'exp-inv-003', type: 'inventory' }
    mockInventorySuccess(expense)
    await request(app).post('/api/expenses').send({
      type: 'inventory', amount: 60000, expense_date: '2026-05-15',
      stock_items: [{ item_id: ITEM, branch_id: BRANCH, qty: 5 }],
    })
    const upsertParams = pool._client.query.mock.calls[3][1]
    expect(upsertParams).toContain(5)
    const upsertSql = pool._client.query.mock.calls[3][0]
    expect(upsertSql).toMatch(/current_stock \+ \$3/)
  })

  it('rolls back on db error', async () => {
    const c = pool._client
    c.query
      .mockResolvedValueOnce({})                            // BEGIN
      .mockRejectedValueOnce(new Error('db error'))         // INSERT expense fails
    c.query.mockResolvedValueOnce({})                       // ROLLBACK
    const res = await request(app).post('/api/expenses').send({
      type: 'inventory', amount: 50000, expense_date: '2026-05-15',
      stock_items: [{ item_id: ITEM, branch_id: BRANCH, qty: 1 }],
    })
    expect(res.status).toBe(500)
    const rollbackCall = c.query.mock.calls.find(c => c[0] === 'ROLLBACK')
    expect(rollbackCall).toBeDefined()
  })
})

// ── POST / (kasbon expense) ────────────────────────────────────────────────────

describe('POST /api/expenses — kasbon', () => {
  it('creates kasbon expense with barber_id as UUID string', async () => {
    const BARBER = 'barber-uuid-001'
    const expense = { id: 'exp-kas-001', type: 'kasbon', barber_id: BARBER }
    const c = pool._client
    c.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [expense] })
      .mockResolvedValueOnce({})
    const res = await request(app).post('/api/expenses').send({
      branch_id: BRANCH, type: 'kasbon', amount: 200000,
      expense_date: '2026-05-15', barber_id: BARBER,
      description: 'Salary advance', deduct_period: 'current',
    })
    expect(res.status).toBe(201)
    const insertParams = pool._client.query.mock.calls[1][1]
    expect(insertParams).toContain(BARBER)
  })
})
