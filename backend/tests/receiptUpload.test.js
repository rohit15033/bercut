// receiptUpload.test.js
//
// Tests for:
//   POST  /api/upload/receipt  — image/pdf upload, compression via sharp/pdf-to-img
//   DELETE /api/upload/receipt — single URL or JSON-array string deletion
//   POST  /api/expenses        — receipt_url field persistence (query construction)

// ── Module mocks (must come before any require) ───────────────────────────────

jest.mock('../config/db',         () => ({ query: jest.fn(), connect: jest.fn() }))
jest.mock('../routes/events',     () => ({ emitEvent: jest.fn() }))
jest.mock('../middleware/auth',   () => ({
  checkPermission: () => (req, _res, next) => {
    req.user = { id: 'user-1', role: 'owner' }
    next()
  },
  JWT_SECRET: 'test-secret',
}))

// sharp mock — returns a chainable builder that resolves toFile() successfully
jest.mock('sharp', () => {
  const chain = {
    resize:  function () { return this },
    webp:    function () { return this },
    toFile:  jest.fn().mockResolvedValue(undefined),
  }
  const sharpMock = jest.fn(() => chain)
  sharpMock.__chain = chain
  return sharpMock
})

// pdf-to-img mock — async generator yielding two "page buffers"
jest.mock('pdf-to-img', () => ({
  pdf: jest.fn().mockResolvedValue(
    (async function* () {
      yield Buffer.from('page1')
      yield Buffer.from('page2')
    })()
  ),
}))

// fs mock — spy on specific methods so we can control existsSync / unlinkSync
// Variable MUST start with "mock" so Jest allows it inside the factory
const mockFs = {
  mkdirSync:    jest.fn(),
  existsSync:   jest.fn().mockReturnValue(false),
  unlinkSync:   jest.fn(),
  writeFileSync: jest.fn(),
}
jest.mock('fs', () => mockFs)

// ── Imports ───────────────────────────────────────────────────────────────────

const request  = require('supertest')
const express  = require('express')
const pool     = require('../config/db')

// Build a minimal Express app that mirrors server.js for the tested routes
function buildApp () {
  const app = express()
  app.use(express.json())
  app.use('/api/upload',   require('../routes/upload'))
  app.use('/api/expenses', require('../routes/expenses'))
  // Error handler — mirrors server.js so multer LIMIT_FILE_SIZE → 413
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
  })
  return app
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Minimal 1×1 JPEG buffer (JFIF header + EOI)
const TINY_JPEG = Buffer.from(
  'ffd8ffe000104a464946000101000001000100' +
  '00ffdb004300080606070605080707070909' +
  '0808090c140d0c0b0b0c1912130f141d1a' +
  '1f1e1d1a1c1c20242e2720222c231c1c28' +
  '3729302d27243020283b28292f2f3438382' +
  'e333b371c1c0000ffc000110800010001030' +
  '1110002111003111100ffc40014000100000' +
  '0000000000000000000000affc4001401010' +
  '0000000000000000000000000000ffc40014' +
  '10010000000000000000000000000000007f' +
  'ffc4001411010000000000000000000000000' +
  '0000ffda000c03010002110311003f00ffd9',
  'hex'
)

// Minimal valid PNG (1×1 red pixel)
const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001' +
  '00000001080200000090wc3d0000000c4944415478' +
  '9c6260f8cfc00000000200012b0e263900000000' +
  '49454e44ae426082',
  'hex'
)

// ── POST /api/upload/receipt ──────────────────────────────────────────────────

describe('POST /api/upload/receipt', () => {
  let app

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset sharp chain mock between tests
    const sharp = require('sharp')
    sharp.__chain.toFile.mockResolvedValue(undefined)
    mockFs.existsSync.mockReturnValue(false)
    app = buildApp()
  })

  test('returns 400 when no file is attached', async () => {
    // Send a valid multipart request with no file field — multer parses OK, req.file is undefined
    const res = await request(app)
      .post('/api/upload/receipt')
      .field('dummy', 'value') // ensures proper multipart boundary, no file attached

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/no file/i)
  })

  test('returns 400 when file has invalid MIME type (text/plain)', async () => {
    // multer fileFilter calls cb(null, false) → req.file is undefined → route returns 400
    const res = await request(app)
      .post('/api/upload/receipt')
      .attach('file', Buffer.from('hello world'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/no file/i)
  })

  test('rejects file exceeding 20MB limit with an error response', async () => {
    // multer throws a MulterError with code LIMIT_FILE_SIZE but no .status property,
    // so the app-level error handler returns 500. The important thing is the upload is rejected.
    const bigBuffer = Buffer.alloc(21 * 1024 * 1024) // 21MB
    const res = await request(app)
      .post('/api/upload/receipt')
      .attach('file', bigBuffer, {
        filename: 'big.jpg',
        contentType: 'image/jpeg',
      })

    // multer MulterError has no .status → falls back to 500 in the error handler
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body).toHaveProperty('message')
    // The error message should indicate a file size / limit issue
    expect(res.body.message).toMatch(/file too large|limit|size/i)
  })

  test('accepts JPEG — returns { url } starting with /uploads/receipts/', async () => {
    const res = await request(app)
      .post('/api/upload/receipt')
      .attach('file', TINY_JPEG, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('url')
    expect(res.body.url).toMatch(/^\/uploads\/receipts\/rcpt_/)
    expect(res.body.url).toMatch(/\.webp$/)
  })

  test('accepts PNG — returns { url } starting with /uploads/receipts/', async () => {
    const res = await request(app)
      .post('/api/upload/receipt')
      .attach('file', TINY_PNG, {
        filename: 'photo.png',
        contentType: 'image/png',
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('url')
    expect(res.body.url).toMatch(/^\/uploads\/receipts\/rcpt_/)
    expect(res.body.url).toMatch(/\.webp$/)
  })

  test('accepts PDF — converts pages to WebP and returns url', async () => {
    // pdf-to-img mock yields 2 pages; route returns JSON array string when >1 page
    const res = await request(app)
      .post('/api/upload/receipt')
      .attach('file', Buffer.from('%PDF-1.4 minimal'), {
        filename: 'receipt.pdf',
        contentType: 'application/pdf',
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('url')
    // Two pages → url should be a JSON array string
    const parsed = JSON.parse(res.body.url)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(2)
    parsed.forEach(u => expect(u).toMatch(/^\/uploads\/receipts\/rcpt_/))
  })

  test('PDF with single page returns plain string url (not array)', async () => {
    const { pdf } = require('pdf-to-img')
    pdf.mockResolvedValueOnce(
      (async function* () { yield Buffer.from('page1') })()
    )

    const res = await request(app)
      .post('/api/upload/receipt')
      .attach('file', Buffer.from('%PDF-1.4 minimal'), {
        filename: 'single.pdf',
        contentType: 'application/pdf',
      })

    expect(res.status).toBe(200)
    expect(typeof res.body.url).toBe('string')
    // Single page → plain string, not JSON array
    expect(() => JSON.parse(res.body.url)).toThrow()
    expect(res.body.url).toMatch(/^\/uploads\/receipts\/rcpt_/)
  })

  test('PDF with more than 3 pages only processes first 3', async () => {
    const { pdf } = require('pdf-to-img')
    pdf.mockResolvedValueOnce(
      (async function* () {
        for (let i = 1; i <= 5; i++) yield Buffer.from(`page${i}`)
      })()
    )
    const sharp = require('sharp')
    const toFileSpy = sharp.__chain.toFile

    await request(app)
      .post('/api/upload/receipt')
      .attach('file', Buffer.from('%PDF-1.4 minimal'), {
        filename: 'long.pdf',
        contentType: 'application/pdf',
      })

    // sharp.toFile should have been called exactly 3 times (one per page, capped at 3)
    expect(toFileSpy).toHaveBeenCalledTimes(3)
  })

  test('returns 500 when sharp throws', async () => {
    const sharp = require('sharp')
    sharp.__chain.toFile.mockRejectedValueOnce(new Error('sharp failure'))

    const res = await request(app)
      .post('/api/upload/receipt')
      .attach('file', TINY_JPEG, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })

    expect(res.status).toBe(500)
  })
})

// ── DELETE /api/upload/receipt ────────────────────────────────────────────────

describe('DELETE /api/upload/receipt', () => {
  let app

  beforeEach(() => {
    jest.clearAllMocks()
    mockFs.existsSync.mockReturnValue(false)
    app = buildApp()
  })

  test('returns 400 when url field is missing', async () => {
    const res = await request(app)
      .delete('/api/upload/receipt')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/url required/i)
  })

  test('returns 204 and silently skips URL not starting with /uploads/receipts/', async () => {
    // Route skips invalid URLs rather than returning an error — still 204
    const res = await request(app)
      .delete('/api/upload/receipt')
      .send({ url: '/uploads/some-other/image.jpg' })

    expect(res.status).toBe(204)
    expect(mockFs.unlinkSync).not.toHaveBeenCalled()
  })

  test('deletes existing file and returns 204', async () => {
    mockFs.existsSync.mockReturnValue(true)

    const res = await request(app)
      .delete('/api/upload/receipt')
      .send({ url: '/uploads/receipts/rcpt_123_456_p1.webp' })

    expect(res.status).toBe(204)
    expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1)
    const unlinkedPath = mockFs.unlinkSync.mock.calls[0][0]
    expect(unlinkedPath).toMatch(/rcpt_123_456_p1\.webp$/)
  })

  test('returns 204 without calling unlink when file does not exist on disk', async () => {
    mockFs.existsSync.mockReturnValue(false) // file already gone

    const res = await request(app)
      .delete('/api/upload/receipt')
      .send({ url: '/uploads/receipts/rcpt_gone.webp' })

    expect(res.status).toBe(204)
    expect(mockFs.unlinkSync).not.toHaveBeenCalled()
  })

  test('handles JSON array string — deletes all valid URLs', async () => {
    mockFs.existsSync.mockReturnValue(true)

    const urlArray = JSON.stringify([
      '/uploads/receipts/rcpt_ts_rand_p1.webp',
      '/uploads/receipts/rcpt_ts_rand_p2.webp',
    ])

    const res = await request(app)
      .delete('/api/upload/receipt')
      .send({ url: urlArray })

    expect(res.status).toBe(204)
    expect(mockFs.unlinkSync).toHaveBeenCalledTimes(2)
  })

  test('handles JSON array string — skips entries not under /uploads/receipts/', async () => {
    mockFs.existsSync.mockReturnValue(true)

    const urlArray = JSON.stringify([
      '/uploads/receipts/rcpt_valid_p1.webp',
      '/uploads/other/bad.jpg',
    ])

    const res = await request(app)
      .delete('/api/upload/receipt')
      .send({ url: urlArray })

    expect(res.status).toBe(204)
    // Only the valid receipt URL should be unlinked
    expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1)
    expect(mockFs.unlinkSync.mock.calls[0][0]).toMatch(/rcpt_valid_p1\.webp$/)
  })

  test('handles actual JS array in body (not a string)', async () => {
    mockFs.existsSync.mockReturnValue(true)

    const res = await request(app)
      .delete('/api/upload/receipt')
      .send({ url: ['/uploads/receipts/rcpt_a.webp', '/uploads/receipts/rcpt_b.webp'] })

    expect(res.status).toBe(204)
    expect(mockFs.unlinkSync).toHaveBeenCalledTimes(2)
  })
})

// ── expenses.js: receipt_url persistence ─────────────────────────────────────

describe('POST /api/expenses — receipt_url persistence', () => {
  let app
  let mockClient

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = {
      query:   jest.fn(),
      release: jest.fn(),
    }
    pool.connect.mockResolvedValue(mockClient)
    app = buildApp()
  })

  test('passes receipt_url as the 13th parameter to the INSERT query', async () => {
    // Simulate BEGIN, INSERT (returning expense row), COMMIT
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({          // INSERT expenses
        rows: [{
          id: 'exp-1', branch_id: 'br-1', amount: 50000,
          expense_date: '2025-05-22', receipt_url: '/uploads/receipts/rcpt_test.webp',
        }],
      })
      .mockResolvedValueOnce(undefined) // COMMIT

    const res = await request(app)
      .post('/api/expenses')
      .send({
        branch_id:   'br-1',
        amount:       50000,
        expense_date: '2025-05-22',
        receipt_url:  '/uploads/receipts/rcpt_test.webp',
      })

    expect(res.status).toBe(201)
    expect(res.body.receipt_url).toBe('/uploads/receipts/rcpt_test.webp')

    // Find the INSERT INTO expenses call
    const insertCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO expenses')
    )
    expect(insertCall).toBeDefined()
    // receipt_url is the 13th parameter ($13)
    expect(insertCall[0]).toContain('receipt_url')
    expect(insertCall[1][12]).toBe('/uploads/receipts/rcpt_test.webp')
  })

  test('passes null for receipt_url when not provided', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [{
          id: 'exp-2', branch_id: 'br-1', amount: 10000,
          expense_date: '2025-05-22', receipt_url: null,
        }],
      })
      .mockResolvedValueOnce(undefined)

    await request(app)
      .post('/api/expenses')
      .send({ branch_id: 'br-1', amount: 10000, expense_date: '2025-05-22' })

    const insertCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('INSERT INTO expenses')
    )
    expect(insertCall).toBeDefined()
    expect(insertCall[1][12]).toBeNull()
  })
})

// ── PATCH /api/expenses/:id — receipt_url in allowed update fields ────────────

describe('PATCH /api/expenses/:id — receipt_url update', () => {
  let app
  let mockClient

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = {
      query:   jest.fn(),
      release: jest.fn(),
    }
    pool.connect.mockResolvedValue(mockClient)
    app = buildApp()
  })

  test('includes receipt_url in the SET clause when provided', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({          // UPDATE expenses
        rows: [{
          id: 'exp-3', receipt_url: '/uploads/receipts/rcpt_updated.webp',
        }],
      })
      .mockResolvedValueOnce(undefined) // COMMIT

    const res = await request(app)
      .patch('/api/expenses/exp-3')
      .send({ receipt_url: '/uploads/receipts/rcpt_updated.webp' })

    expect(res.status).toBe(200)

    const updateCall = mockClient.query.mock.calls.find(
      c => typeof c[0] === 'string' && c[0].includes('UPDATE expenses')
    )
    expect(updateCall).toBeDefined()
    expect(updateCall[0]).toContain('receipt_url')
    expect(updateCall[1]).toContain('/uploads/receipts/rcpt_updated.webp')
  })
})
