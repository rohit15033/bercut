const router = require('express').Router()
const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')
const { requireAdmin } = require('../middleware/auth')

const storage = multer.memoryStorage()
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
})

router.post('/image', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const filename = `img_${Date.now()}_${Math.round(Math.random() * 1E9)}.webp`
    const uploadDir = path.join(__dirname, '../public/uploads')
    const filepath = path.join(uploadDir, filename)

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Process image: resize to max 800px width/height, convert to webp, optimize
    await sharp(req.file.buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(filepath)

    const url = `/uploads/${filename}`
    res.json({ url })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ message: 'Failed to process image' })
  }
})

router.delete('/image', requireAdmin, async (req, res) => {
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

module.exports = router
