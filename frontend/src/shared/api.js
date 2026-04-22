// frontend/src/shared/api.js
// Base fetch wrapper. Reads VITE_API_URL from env (defaults to /api).
// Admin routes: Authorization: Bearer <jwt>
// Kiosk routes: X-Kiosk-Token <token>

import { getToken, getKioskToken } from './tokens.js'

export const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request(method, path, body, opts = {}) {
  const headers = {}
  const isFormData = body instanceof FormData

  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const adminToken  = getToken()
  const kioskToken  = getKioskToken()

  if (opts.kiosk && kioskToken) {
    headers['X-Kiosk-Token'] = kioskToken
  } else if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ message: res.statusText }))
    const error   = new Error(payload.message ?? 'Request failed')
    error.status  = res.status
    throw error
  }

  if (res.status === 204) return null
  return res.json()
}

// Standard admin API calls
export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path)       => request('DELETE', path),
}

// Kiosk API calls — includes X-Kiosk-Token header
export const kioskApi = {
  get:    (path)       => request('GET',    path, undefined, { kiosk: true }),
  post:   (path, body) => request('POST',   path, body,      { kiosk: true }),
  put:    (path, body) => request('PUT',    path, body,      { kiosk: true }),
  patch:  (path, body) => request('PATCH',  path, body,      { kiosk: true }),
}
