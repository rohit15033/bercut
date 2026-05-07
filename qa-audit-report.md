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
const JWT_SECRET = process.env.JANT_SECRET
```
**Verify:** Check if `secrets.VPS_HOST` CI/CD secret injects `JWT_SECRET` into the VPS environment.

---

### C2 — Fonnte webhook has zero auth verification
**File:** `backend/routes/webhook.js:8`
```js
router.post('/fonnte', async (req, res) => {
  const phone = (req.body.sender || '').replace(/[^0-9]/g, '')
  // No token check, no IP allowlist, no signature
```
**Issue:** Anyone can POST to `/api/webhook/fonnte` with a fake `sender` payload and trigger WhatsApp autoreplies to arbitrary numbers.
**Fix:** Add Fonnte webhook secret:
```js
const FONNTE_WEBHOOK_SECRET = process.env.FONNTE_WEBHOOK_SECRET || ''
router.post('/fonnte', async (req, res) => {
  const sig = req.headers['x-fonnte-signature']
  if (FONNTE_WEBHOOK_SECRET && sig !== FONNTE_WEBHOOK_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
```

---

## 🟠 HIGH

### H1 — Backend does not enforce "topmost confirmed booking only" start constraint
**Decision-log:** "Start button is active only for the topmost confirmed booking in the barber's queue"
**File:** `backend/routes/bookings.js:405` — `/start` endpoint:
```js
router.patch('/:id/start', requireKioskOrAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE bookings SET status = 'in_progress', started_at = NOW()
     WHERE id = $1 AND status = 'confirmed' RETURNING *`,
```
**Issue:** Backend starts ANY confirmed booking for the kiosk. Frontend enforces ordering, but a modified kiosk JS could bypass this. Backend is the source of truth — must enforce.
**Fix:** Add ordering check in `/start`:
```js
// Only allow starting the earliest unstarted booking for this barber today
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
RETURNING *
```

---

### H2 — QRIS poll status has no ownership check
**File:** `backend/routes/payments.js:258`
```js
router.get('/qris/:id/status', requireKiosk, async (req, res) => {
  // req.params.id = Xendit QR code ID — no check this QR belongs to this kiosk's branch
```
**Issue:** A kiosk at Branch A can poll a QR code generated for Branch B if they know the Xendit QR ID.
**Fix:** Store branch_id with QR codes and verify ownership:
```js
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
**Fix:** Create non-root deploy user with passwordless sudo for git pull + pm2, rotate VPS_PASSWORD immediately.

---

## 🟡 MEDIUM

### M1 — Idempotency key collision risk on terminal session retry
**File:** `backend/routes/payments.js:150`
```js
const idempotencyKey = `bercut-${group_id || booking_id}-${Date.now()}`
```
**Issue:** `Date.now()` is 10-digit epoch. Concurrent requests could collide. Very unlikely but not zero.
**Fix:** Append kiosk token ID to idempotency key:
```js
const idempotencyKey = `bercut-${group_id || booking_id}-${Date.now()}-${req.kiosk?.tokenId || 'unknown'}`
```

---

### M2 — `booking-groups.js` not registered as route in server.js
**File:** `backend/server.js` — does NOT mount `/api/booking-groups` route
But `backend/routes/booking-groups.js` exists with its own endpoints. Either:
- Endpoints are dead code (never reachable) → remove file
- Or they should be wired up
**Check required:** Read `backend/routes/booking-groups.js` and wire up or delete.

---

## 🔵 LOW

### L1 — Xendit webhook has no replay protection
`markPaidIfNeeded` is idempotent so replay is safe, but add event ID tracking for cleanliness.

### L2 — No rate limiting on public endpoints
Add `express-rate-limit` to `/api/events`, `/api/bookings/public`, `/api/webhook/*`.

### L3 — No request logging middleware
Add `morgan` for structured request logs with response time.

---

## Verified Safe (No Issue)

| Check | Status |
|-------|--------|
| Kiosk token uses SHA-256 hash, not plain text | ✅ |
| `markPaidIfNeeded` + `markGroupPaidIfNeeded` idempotent | ✅ |
| Points deducted at service completion, not booking time | ✅ |
| Barber escalation stops on `booking_started` SSE | ✅ |
| `stop-escalation` requires `requireKioskOrAdmin` | ✅ |
| Xendit Terminal H2H idempotency keys on session creation | ✅ |
| `complete` re-emits payment trigger for deferred assignment | ✅ |
| Points expiry cron nightly, auto-cancel every 2 min | ✅ |
| `booking_services.added_mid_cut` prevents mid-cut service deletion | ✅ |

---

## Unverified Without Live Access

| Check | Notes |
|-------|-------|
| VPS env vars actually set (JWT_SECRET, XENDIT keys) | Need SSH + `printenv` |
| PostgreSQL RLS policies active | `SELECT * FROM pg_policies WHERE tablename = 'bookings'` |
| Xendit webhook URL publicly reachable | Must test with a test payload |
| `kiosk_tokens.token_hash` column exists (SHA-256) | Check schema migrations |
| `backend/routes/booking-groups.js` reachable or dead code | Read file to confirm |

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 2 (C1: JWT fallback, C2: Fonnte webhook no auth) |
| 🟠 HIGH | 3 (H1: /start ordering, H2: QRIS poll ownership, H3: root CI/CD) |
| 🟡 MEDIUM | 2 (M1: idempotency collision, M2: unreachable route) |
| 🔵 LOW | 2 (L1: replay, L2: rate limit) |

---

## PR Status

**QA recommendation: REQUEST CHANGES**

Fix C1, C2, H1, H2, H3 before merge. M1, M2, M2, L1, L2 can be tracked separately.

After fixes are committed, QA will re-review and post approval.
