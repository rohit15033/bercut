// frontend/src/shared/api.js
// Base fetch wrapper. Reads VITE_API_URL from env (defaults to /api).
// Attaches Authorization: Bearer <token> when a token exists in localStorage.

import { getToken } from './tokens.js'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request(method, path, body) {
  const token   = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
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

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path)       => request('DELETE', path),
}
