// SSE endpoint — GET /api/events?branch_id=
const router = require('express').Router()
const { requireKioskOrAdmin } = require('../middleware/auth')
const clients = new Map()

function getClients(branchId) {
  if (!clients.has(branchId)) clients.set(branchId, new Set())
  return clients.get(branchId)
}

function emitEvent(branchId, type, data) {
  const set = clients.get(branchId)
  if (!set || !set.size) return
  const payload = `data: ${JSON.stringify({ type, data })}\n\n`
  for (const res of set) { try { res.write(payload) } catch { set.delete(res) } }
}

// SSE endpoint — GET /api/events?branch_id=
router.get('/', (req, res) => {
  const branchId = req.query.branch_id
  if (!branchId) return res.status(400).json({ message: 'branch_id required' })

  res.set({ 
    'Content-Type': 'text/event-stream', 
    'Cache-Control': 'no-cache', 
    'Connection': 'keep-alive', 
    'X-Accel-Buffering': 'no' 
  })
  res.flushHeaders()

  const ping = setInterval(() => { 
    try { res.write(': ping\n\n') } catch { clearInterval(ping) } 
  }, 25000)

  const set = getClients(branchId)
  set.add(res)

  req.on('close', () => { 
    clearInterval(ping)
    set.delete(res) 
  })
})

module.exports = router
module.exports.emitEvent = emitEvent
