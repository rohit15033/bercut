const router = require('express').Router()
const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')
const { requireAdmin } = require('../middleware/auth')

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

router.post('/image', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const filename = `img_${Date.now()}_${Math.round(Math.random() * 1E9)}.webp`
    const filepath = path.join(__dirname, '../public/uploads', filename)

    // Process image: resize to max 800px width/height, convert to webp, optimize
    await sharp(req.file.buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
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
