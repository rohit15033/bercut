// frontend/src/shared/useSSE.js
// EventSource hook for real-time SSE updates.
// Auto-reconnects on disconnect. Branch-scoped via branch_id query param.
//
// Usage:
//   useSSE(branchId, {
//     payment_trigger: (data) => openPaymentScreen(data),
//     booking_created: (data) => refreshQueue(data),
//   })
//
// The server can emit either:
//   - Named events:  `event: payment_trigger\ndata: {...}\n\n`
//   - Generic:       `data: {"type":"payment_trigger","data":{...}}\n\n`

import { useEffect, useRef } from 'react'
import { getKioskToken } from './tokens.js'

const BASE               = import.meta.env.VITE_API_URL ?? '/api'
const RECONNECT_DELAY_MS = 3000

export function useSSE(branchId, handlers, options = {}) {
  const esRef       = useRef(null)
  const handlersRef = useRef(handlers)
  const optionsRef  = useRef(options)

  // Always call current handlers/options without restarting the connection
  useEffect(() => { handlersRef.current = handlers })
  useEffect(() => { optionsRef.current  = options })

  useEffect(() => {
    if (!branchId) return

    let cancelled  = false
    let retryTimer = null

    function connect() {
      if (cancelled) return

      const kioskToken = getKioskToken()
      const url = `${BASE}/events?branch_id=${encodeURIComponent(branchId)}${kioskToken ? `&kiosk_token=${encodeURIComponent(kioskToken)}` : ''}`
      const es  = new EventSource(url)
      esRef.current = es

      // Generic envelope: { type, data }
      es.onmessage = (e) => {
        try {
          const { type, data } = JSON.parse(e.data)
          handlersRef.current?.[type]?.(data)
        } catch { /* ignore malformed */ }
      }

      es.onopen = () => optionsRef.current?.onConnect?.()

      // Named event types (server sends `event: <type>\ndata: ...`)
      const knownTypes = Object.keys(handlersRef.current ?? {})
      knownTypes.forEach((type) => {
        es.addEventListener(type, (e) => {
          try { handlersRef.current?.[type]?.(JSON.parse(e.data)) }
          catch { /* ignore */ }
        })
      })

      es.onerror = () => {
        es.close()
        if (!cancelled) retryTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      esRef.current?.close()
      esRef.current = null
    }
  }, [branchId]) // eslint-disable-line react-hooks/exhaustive-deps
}
