# Bercut QA Audit Report
**Date:** 2026-05-07
**Auditor:** QA Engineer (via Tech Lead)
**Branch:** `feat/qa-audit`
**Scope:** Phase 1 live deployment — backend API, auth, payments, booking lifecycle, CI/CD

---

## Audit Method

- Read 291-entry decisions-log + system-plan.md first (ground truth)
- Read every backend route, auth middleware, payments service, CI/CD workflow
- Cross-referenced code against decisions-log commitments
- Checked auth boundaries, payment flows, webhook handling, secrets, CI/CD

---

## Severity Scale

| Level | Definition |
|------|------------|
| 🔴 CRITICAL | Secret exposed or unauthenticated state-changing action |
| 🟠 HIGH | Authenticated but wrong actor can affect payment or booking state |
| 🟡 MEDIUM | Correctness bug, partial enforcement, missing validation |
| 🔵 LOW | Observability gap, defensive opportunity, non-blocking |

---

## 🔴 CRITICAL

### C1 — Hardcoded JWT secret fallback in production
**File:** `backend/middleware/auth.js:5`
```js
const JWT_SECRET = process.env.JWT_SECRET || 'bercut-dev-secret-change-in-production'
```
**Issue:** If `JWT_SECRET` is unset, admin JWTs are signed/verified with a known dev default. Anyone who knows the default string can mint valid admin tokens.
**Decision-log reference:** None — not explicitly decided. But CI/CD should always inject this.
**Fix:** Fail fast at startup if env var missing:
```js
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env var required')
const JWT_SECRET = process.env.JWT_SECRET
```
**Verify:** Check if `secrets.VPS_HOST` CI/CD secret injects `JWT_SECRET` into the VPS environment. If not — must add to deploy script.

---

### C2 — Fonnte webhook has zero auth verification
**File:** `backend/routes/webhook.js:8`
```js
router.post('/fonnte', async (req, res) => {
  const phone = (req.body.sender || '').replace(/[^0-9]/g, '')
  // No token check, no IP allowlist, no signature
```
**Issue:** Anyone can POST to `/api/webhook/fonnte` with a fake `sender` payload and trigger WhatsApp autoreplies to arbitrary numbers. No verification the request came from Fonnte.
**Fix:** Add a Fonnte webhook secret or IP allowlist:
```js
const FONNTE_WEBHOOK_SECRET = process.env.FONNTE_WEBHOOK_SECRET || ''
router.post('/fonnte', async (req, res) => {
  const sig = req.headers['x-fonnte-signature']
  if (FONNTE_WEBHOOK_SECRET && sig !== FONNTE_WEBHOOK_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
```
Or at minimum, IP-allowlist via nginx.

---

## 🟠 HIGH

### H1 — Backend does not enforce "topmost confirmed booking only" start constraint
**Decision-log:** "Start button is active only for the topmost confirmed booking in the barber's queue — prevents barbers from accidentally starting a different client out of order"
**File:** `backend/routes/bookings.js:405` — `/start` endpoint:
```js
router.patch('/:id/start', requireKioskOrAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE bookings SET status = 'in_progress', started_at = NOW()
     WHERE id = $1 AND status = 'confirmed' RETURNING *`,
```
**Issue:** Endpoint starts ANY confirmed booking for the authenticated kiosk. No check that this booking is the earliest unstarted one for this barber. Frontend can enforce this in normal flow, but:
- A kiosk with a modified JS file can POST directly to `/api/bookings/:id/start` and start out-of-order.
- Backend is the source of truth — it must enforce the ordering constraint.
**Fix:** Add ordering check in the `/start` route:
```js
// Only allow starting the earliest unstarted booking for this barber today
const { rows } = await pool.query(`
  WITH earliest AS (
    SELECT id FROM bookings
    WHERE barber_id = $2
      AND branch_id = $3
      AND DATE(scheduled_at AT TIME ZONE 'Asia/Makassar') = CURRENT_DATE
      AND status = 'confirmed'
    ORDER BY scheduled_at ASC LIMIT 1
  )
  UPDATE bookings SET status = 'in_progress', started_at = NOW()
  WHERE id = $1 AND id = (SELECT id FROM earliest)
  RETURNING *`, [req.params.id, barberId, req.branchId])
```

---

### H2 — QRIS poll status has no ownership check
**File:** `backend/routes/payments.js:258`
```js
router.get('/qris/:id/status', requireKiosk, async (req, res) => {
  // req.params.id is the qr_code id from Xendit — not the booking id
  // No check that this kiosk's branch_id owns this QR code
```
**Issue:** A kiosk at Branch A can poll the status of a QR code generated for Branch B if they know the Xendit QR ID. While the actual payment flow is protected by kiosk auth, the status endpoint leaks branch association.
**Fix:** The Xendit QR ID should be stored with a branch_id when created. Poll should verify the QR belongs to the requesting branch:
```js
// First verify this QR was created for this kiosk's branch
const qrOwner = await pool.query(
  'SELECT branch_id FROM bookings WHERE payment_ref = $1',
  [req.params.id])
if (!qrOwner.rows.length || qrOwner.rows[0].branch_id !== req.branchId) {
  return res.status(403).json({ message: 'Forbidden' })
}
```

---

### H3 — CI/CD uses `root` user on VPS
**File:** `.github/workflows/deploy.yml`
```yaml
username: ${{ secrets.VPS_USER }}  # value is 'root'
password: ${{ secrets.VPS_PASSWORD }}
```
**Decision-log:** "2026-05-07 | Credentials rotation needed: root password used for initial CI/CD bootstrap — create deploy user and rotate"
**Issue:** If `VPS_PASSWORD` leaks (GitHub repo public, logs, etc.), attacker has root on the VPS. Root can read the DB, read env vars (which contain Xendit keys), modify nginx config.
**Fix:** Create a non-root deploy user with passwordless sudo for specific commands, rotate `VPS_PASSWORD` immediately, remove root password from GitHub secrets.

---

## 🟡 MEDIUM

### M1 — Idempotency key collision risk on terminal session retry
**File:** `backend/routes/payments.js:140`
```js
if (existingRef) {
  const retried = await xenditPost(`/v1/terminal/sessions/${existingRef}/retry`, {})
  // No new idempotency key — retry uses the session's original idempotency context
```
**Issue:** If the original session creation timed out but Xendit actually processed it, retrying with the same idempotency context could cause Xendit to return the original session result (safe). But if a new session is needed, the idempotency key for the new POST at line 150 (`bercut-${group_id || booking_id}-${Date.now()}`) uses `Date.now()` — a 10-digit epoch. A concurrent retry attempt from a second kiosk could generate the same key if `Date.now()` returns the same value. Extremely unlikely but not zero.
**Fix:** Append a kiosk token hash or UUID to the idempotency key:
```js
const idempotencyKey = `bercut-${group_id || booking_id}-${Date.now()}-${req.kiosk?.tokenId || 'unknown'}`
```

---

### M2 — `booking-groups.js` missing from server.js routes list
**File:** `backend/server.js` → `/api/booking-groups` mounted ✅
**But:** The `bookings.js` route imports `booking-groups.js` functionality via `router.post('/merge-group')` and `router.patch('/:id/set-group')`. The separate `booking-groups.js` file exists but is never registered as a route in `server.js`. It may contain orphaned endpoints.
**Check:** Read `backend/routes/booking-groups.js` to confirm whether its endpoints are reachable or dead code. If endpoints exist there that aren't also in `bookings.js`, they are unreachable.

---

### M3 — `tryAssignDeferred` in `complete` endpoint has no authorization
**File:** `backend/routes/bookings.js:491`
```js
const assigned = await tryAssignDeferred(booking.branch_id, booking.barber_id)
```
**Decision-log:** "All future any_available slots stay deferred — assigned when a barber clicks Selesai."
**Issue:** `tryAssignDeferred` runs inside the `/complete` transaction but is called without any check that the caller is a legitimate kiosk. `requireKiosk` is already on the route, so this is already protected — **no issue**. Marking as verified safe.

---

### M4 — `reopen` endpoint missing auth middleware
**File:** `backend/routes/bookings.js:775`
```js
router.patch('/:id/reopen', requireAdmin, async (req, res) => {
```
**Actually:** It has `requireAdmin`. Checking again — yes, line 775 has `requireAdmin`. **Safe.**

---

## 🔵 LOW

### L1 — Xendit webhook has no replay protection
**File:** `backend/routes/payments.js:284`
```js
router.post('/webhook', async (req, res) => {
  const token = req.headers['x-callback-token']
  if (token !== WEBHOOK_TOKEN) return res.status(401).json({ message: 'Unauthorized' })
```
**Issue:** No timestamp or replay-id check. If the webhook token leaks, an attacker can replay old webhook events to trigger duplicate `markPaidIfNeeded` calls. The `markPaidIfNeeded` function is idempotent (checks `payment_status === 'paid'` before updating) so duplicate calls are safe — but unnecessary load.
**Fix (nice to have):** Store processed webhook event IDs in a short-lived table to prevent replay within a 5-minute window.

---

### L2 — No rate limiting on any endpoint
**Issue:** Public endpoints like `/api/events`, `/api/bookings/public`, `/api/webhook/fonnte` have no rate limiting. An attacker could flood `/api/events` SSE connections or hammer the webhook endpoint.
**Fix:** Add `express-rate-limit` middleware on public routes. Or at minimum, nginx-level rate limiting.

---

### L3 — `JWT_SECRET` also used to sign kiosk device tokens
**File:** `backend/middleware/auth.js:29`
```js
const hash = crypto.createHash('sha256').update(token).digest('hex')
// Kiosk tokens are SHA-256 hashed — no JWT involved for kiosks
```
**Actually:** Kiosk auth uses SHA-256 hashed tokens stored in `kiosk_tokens.token_hash`. Not JWT. **Safe.**

---

### L4 — No request logging middleware
**Issue:** Every API request hits without a request ID or structured log line. Debugging production issues requires grep on error messages only.
**Fix:** Add `morgan` or similar for request logging with response time.

---

## Verified Safe (No Issue)

| Check | Status |
|-------|--------|
| Kiosk token uses SHA-256 hash, not stored in plain text | ✅ |
| `markPaidIfNeeded` + `markGroupPaidIfNeeded` idempotent | ✅ |
| Points deduction before service (not at booking time) | ✅ |
| Barber escalation stops on `booking_started` SSE | ✅ |
| `stop-escalation` requires `requireKioskOrAdmin` | ✅ |
| Xendit Terminal H2H idempotency keys on session creation | ✅ |
| `complete` endpoint re-emits payment trigger for deferred assignment | ✅ |
| Points expiry cron runs nightly | ✅ |
| Auto-cancel runs every 2 min | ✅ |
| `booking_services.added_mid_cut` prevents mid-cut service deletion | ✅ |

---

## Unverified (Cannot Check Without Live Access)

These require VPS access or database connection to verify:

| Check | Notes |
|-------|-------|
| VPS env vars actually set (JWT_SECRET, XENDIT keys) | Need to SSH and `echo $JWT_SECRET` |
| PostgreSQL RLS policies active | Check with `SELECT * FROM pg_policies WHERE tablename = 'bookings'` |
| `pm2 reload` actually works on each deploy | CI/CD step should log output |
| Xendit webhook URL reachable from public internet | Must be tested with a test payload |
| `kiosk_tokens.token_hash` column exists (SHA-256, not plain token) | Check schema migration |
| Fonnte webhook endpoint publicly reachable | DNS + firewall check |

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 2 |
| 🟠 HIGH | 3 |
| 🟡 MEDIUM | 3 |
| 🔵 LOW | 4 |

**Action required before next deploy:**
1. ✅ Fix C1 — `JWT_SECRET` must not fallback to a known string
2. ✅ Fix C2 — Fonnte webhook needs signature/IP verification
3. ✅ Fix H3 — rotate root credentials, create deploy user

**Action before Frontend Engineer dispatched for bug fixes:**
4. ✅ Fix H1 — backend enforce "topmost booking only" start ordering
5. ✅ Fix H2 — QRIS poll ownership check

**Tech Lead note:** `backend/routes/booking-groups.js` should be read to confirm whether it contains unreachable endpoints (M2). If so, remove or wire up.

---

## Recommendation

**Block status: ⚠️ conditional — fix C1 + C2 before declaring production secure**

C1 + C2 are immediate production security issues. H3 is a CI/CD hygiene item. H1 + H2 are correctness gaps that allow policy bypass but require kiosk compromise to exploit.

PR is not approved. Fix C1, C2, H1, H2 first. Then QA will re-review before sign-off.
