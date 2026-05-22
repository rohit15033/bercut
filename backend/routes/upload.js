const router = require('express').Router()
const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')
const { checkPermission } = require('../middleware/auth')
const { pdf } = require('pdf-to-img')

const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
})

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only image/* and application/pdf are accepted'))
  }
})

router.post('/image', checkPermission('settings'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Use absolute path from project root for reliability
    const uploadDir = path.resolve(__dirname, '../public/uploads')

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating upload directory:', uploadDir)
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Try sharp processing first (webp conversion + resize)
    try {
      const filename = `img_${Date.now()}_${Math.round(Math.random() * 1E9)}.webp`
      const filepath = path.join(uploadDir, filename)

      await sharp(req.file.buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toFile(filepath)

      const url = `/uploads/${filename}`
      return res.json({ url })
    } catch (sharpErr) {
      console.warn('Sharp processing failed, saving original file:', sharpErr.message)
    }

    // Fallback: save original file as-is
    const ext = path.extname(req.file.originalname || '.jpg').toLowerCase() || '.jpg'
    const filename = `img_${Date.now()}_${Math.round(Math.random() * 1E9)}${ext}`
    const filepath = path.join(uploadDir, filename)
    fs.writeFileSync(filepath, req.file.buffer)

    const url = `/uploads/${filename}`
    res.json({ url })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ message: 'Failed to process image' })
  }
})

router.delete('/image', checkPermission('settings'), async (req, res) => {
  try {
    const { url } = req.body
    if (!url || !url.startsWith('/uploads/')) {
      return res.status(400).json({ message: 'Invalid URL' })
    }

    const filename = path.basename(url)
    const filepath = path.join(__dirname, '../public/uploads', filename)

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
    }

    res.status(204).end()
  } catch (err) {
    console.error('Delete error:', err)
    res.status(500).json({ message: 'Failed to delete image' })
  }
})

// ── POST /receipt ──────────────────────────────────────────────────────────────
router.post('/receipt', checkPermission('expenses'), receiptUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    if (req.file.size === 0) {
      return res.status(400).json({ message: 'File is empty' })
    }

    const receiptDir = path.resolve(__dirname, '../public/uploads/receipts')
    fs.mkdirSync(receiptDir, { recursive: true })

    const ts = Date.now()
    const rand = Math.round(Math.random() * 1e9)

    const compressPage = async (pageBuffer, pageNum) => {
      const filename = `rcpt_${ts}_${rand}_p${pageNum}.webp`
      const filepath = path.join(receiptDir, filename)
      await sharp(pageBuffer)
        .resize(1400, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filepath)
      return `/uploads/receipts/${filename}`
    }

    if (req.file.mimetype === 'application/pdf') {
      const urls = []
      let pageNum = 0
      for await (const pageBuffer of await pdf(req.file.buffer, { scale: 2 })) {
        pageNum++
        if (pageNum > 3) break
        const url = await compressPage(pageBuffer, pageNum)
        urls.push(url)
      }
      if (urls.length === 0) {
        return res.status(422).json({ message: 'PDF has no renderable pages' })
      }
      const urlValue = urls.length === 1 ? urls[0] : JSON.stringify(urls)
      return res.json({ url: urlValue })
    }

    // Image path
    const url = await compressPage(req.file.buffer, 1)
    res.json({ url })
  } catch (err) {
    console.error('Receipt upload error:', err)
    res.status(500).json({ message: 'Upload failed' })
  }
})

// ── DELETE /receipt ────────────────────────────────────────────────────────────
router.delete('/receipt', checkPermission('expenses'), async (req, res) => {
  try {
    let { url } = req.body
    if (!url) return res.status(400).json({ message: 'url required' })

    // Accept a JSON array string or a plain string
    let urls
    if (typeof url === 'string') {
      try { urls = JSON.parse(url) } catch { urls = url }
    } else {
      urls = url
    }
    if (!Array.isArray(urls)) urls = [urls]

    for (const u of urls) {
      if (typeof u !== 'string' || !u.startsWith('/uploads/receipts/')) continue
      const filename = path.basename(u)
      const filepath = path.join(__dirname, '../public/uploads/receipts', filename)
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    }

    res.status(204).end()
  } catch (err) {
    console.error('Receipt delete error:', err)
    res.status(500).json({ message: 'Delete failed' })
  }
})

module.exports = router
