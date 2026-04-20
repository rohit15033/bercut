# Bercut Barber Shop — Antigravity Prompting Guide
*v2.0 · April 2026 · Production Build Phase · Confidential*

---

## 01 — How to Use This Guide

**Phase change:** Mockups are approved. This guide is now structured for **production build**.
All mockup screens in `mockups/kiosk/` and `mockups/admin/` are the visual contract.
Antigravity's job is to:

1. Build the PostgreSQL schema (`backend/db/schema.sql`)
2. Build the Node.js/Express backend (`backend/`)
3. Build the production React frontend (`frontend/src/apps/`) by taking the mockup code and implementing the backend.
4. Wire real API calls into the screens that were prototyped as mockups.
5. **Optimize the kiosk frontend for a 1366 x 768 resolution** (the current kiosk mockups are not built for this, they must be adjusted to fit).
6. **DO NOT change any UI, UX, or anything else** besides the 1366 x 768 resolution optimization and backend wiring.
7. Prepare for staging/production deployment on Rumahweb VPS

**Session structure:**
1. Paste the Master System Prompt (Section 02) at the start of every session
2. Follow the Build Phases in order (Section 03)
3. For each screen/module, read the specific handoff section
4. Always cross-reference the mockup file listed — it is the visual truth
5. Always cross-reference `_ai/system-plan.md` Sections 06–07 for schema and API contracts
6. Test on localhost before declaring a module done

**Source of truth hierarchy:**
1. `_ai/decisions-log.md` — most recent entry wins
2. `_ai/system-plan.md` — full schema, API, business rules
3. `_ai/pre-build-audit.md` — gap analysis and known issues
4. Mockup JSX files — visual and interaction reference
5. This file — build instructions and handoff details

---

## 02 — Master System Prompt

> Paste this entire block at the start of every new Antigravity session.

```
# Bercut Barber Shop — System Context

## Project
You are building the production version of the Bercut Barber Shop POS system.
Bercut is a barbershop chain with 6+ branches in Bali, Indonesia.
The system has two PWA apps sharing one codebase: Kiosk and Admin Dashboard.
Barber functions (queue, clock in/out, breaks, start/complete) are accessed
via the kiosk's PIN-protected BarberPanel — there is no separate barber app.

## What Already Exists
- Approved mockups in mockups/kiosk/ and mockups/admin/ — these are the visual contract
- Skeleton backend structure in backend/ (server.js, route files, db/)
- Skeleton frontend in frontend/src/ (App.jsx, shared/, apps/)
- Full schema design in _ai/system-plan.md Section 06
- Full API contract in _ai/system-plan.md Section 07
- Pre-build audit in _ai/pre-build-audit.md (all 28 items PASS)

## Your Job
1. Build backend/db/schema.sql from system-plan.md Section 06
2. Build each backend route from system-plan.md Section 07 API table
3. Build production frontend screens in frontend/src/apps/ by taking the mockup JSX and implementing the backend.
4. **Optimize the kiosk frontend for a 1366 x 768 resolution.**
5. **DO NOT change any UI, UX, or anything else** besides the resolution optimization and backend wiring.
6. Replace hardcoded mock data with real API calls
7. Wire SSE for real-time updates
8. Prepare deployment config in deploy/

## Tech Stack
- Frontend: React PWA (Vite build)
- Backend: Node.js + Express REST API
- Database: PostgreSQL (self-hosted on Rumahweb VPS — no cloud DB)
- Real-time: Server-Sent Events (SSE) — GET /api/events?branch_id=
- Payments: Xendit Terminal H2H — REST API from backend to Xendit cloud
- Notifications Phase 1: Web Speech API kiosk speaker (free, zero setup)
- Notifications Phase 2: Web Push API via PWA (free, Android Chrome)
- WhatsApp: Fonnte API (Phase 2 — backend/services/notifications.js)
- Receipts: ESC/POS thermal printer per kiosk
- Hosting: Rumahweb VPS (Nginx + PM2 + PostgreSQL self-hosted)

## Build output
- Vite build outputs to backend/public
- Nginx serves from backend/public (single origin, no CORS)
- PM2 manages the Node.js process

## Design Tokens (production: frontend/src/shared/tokens.js)
bg:         #FAFAF8   // warm off-white page background
surface:    #F2F0EB   // secondary surface, input backgrounds
surface2:   #ECEAE4   // tertiary surface, disabled states
accent:     #F5E200   // Bercut signature yellow — CTAs and selected states ONLY
accentText: #111110   // text ON yellow backgrounds
text:       #111110   // primary text
text2:      #3a3a38   // secondary text
muted:      #88887e   // placeholder, helper text
border:     #DDDBD4   // card borders, dividers
topBg:      #111110   // topbar, primary dark buttons
topText:    #F5E200   // text in topbar (yellow on black)
white:      #FFFFFF   // card surfaces
danger:     #C0272D   // destructive actions only

## Typography
Display/Headings: Inter (800 weight)
Body/UI copy:     DM Sans (400/500/600 weight)
Both loaded via Google Fonts.

## Colour Rules — CRITICAL
1. Yellow (#F5E200) is NEVER used as text colour on white/light backgrounds.
2. Yellow ONLY appears as: filled button background, selected card background, booking number hero.
3. Text ON yellow must always be #111110 (accentText).
4. Selected card state: background flips to yellow, ALL text inside flips to #111110.
5. topBg (#111110) is the primary action colour for dark buttons — not yellow.

## Business Rules
- Payment model: POSTPAID. Customers never pay during booking.
- Payment methods: QRIS and card — both via Xendit Terminal H2H. NO CASH.
- Tip: collected at payment time. Presets configurable per branch. Individual per barber.
- Barber triggers payment: when barber taps Complete, kiosk switches to payment mode.
- Staff panel: triple-tap top-right corner of topbar.
- No front desk: kiosk handles booking. BarberPanel handles queue + payment trigger.
- All data is branch-scoped. Every DB query must include branch_id.
- Booking lifecycle: confirmed → in_progress → pending_payment → completed | no_show | cancelled
- Kiosk auth: permanent device token (X-Kiosk-Token header). No login for customers.
- Admin auth: email + password, JWT.
- Barber auth: 4–6 digit PIN via kiosk BarberPanel.

## Languages
- Kiosk: bilingual — English (primary) + Bahasa Indonesia (subtitle)
- BarberPanel: Bahasa Indonesia only
- Admin Dashboard: English primary

## Touch / UX Rules (Kiosk)
- **Target Resolution: 1366 x 768**. The current mockups need to be optimized for this exact display resolution.
- Minimum 72px height for all tappable elements
- clamp() for all font sizes and spacing
- onClick for all interactions (not onTouchStart)
- overscroll-behavior: none on body
- -webkit-overflow-scrolling: touch on scrollable containers
- No hover-only states
- No changing any UI, UX, or anything else aside from the 1366 x 768 resolution optimization.
```

---

## 03 — Build Phases

### Phase 0 — Foundation (do this first, before any screens)

```
Build the project foundation for the Bercut system.

## 0A. Database Schema
File: backend/db/schema.sql

Read _ai/system-plan.md Section 06 for the complete schema.
Create ALL tables in FK dependency order:
  1. branches (include is_head_office, backoffice_alert_phone, escalation columns)
  2. users + user_permissions
  3. audit_log
  4. barbers (include status ENUM, pay_type, base_salary, daily_rate)
  5. services (include mutex_group, image_url)
  6. branch_services (composite PK: service_id + branch_id)
  7. barber_services (composite PK: barber_id + service_id)
  8. service_consumables (composite PK: service_id + item_id)
  9. customers (include points_balance, phone_country_code, points_last_activity_at, points_last_expired_at)
  10. bookings (include source ENUM, group_id, review_tags TEXT[], escalation columns, client_not_arrived_at, payment_trigger_source)
  11. booking_services (include paid_with_points, bleach_step, bleach_with_color)
  12. booking_extras
  13. booking_groups
  14. tips (include barber_id for individual tracking)
  15. expense_categories
  16. expenses (include type ENUM, source ENUM, barber_id, deduct_period, po_id, po_payment_type, po_attribution JSONB)
  17. purchase_orders
  18. expense_stock_items
  19. attendance
  20. inventory_items
  21. inventory_stock (include price, kiosk_visible)
  22. inventory_movements
  23. chairs + chair_overrides (include resolved_by)
  24. barber_breaks
  25. off_records
  26. point_transactions
  27. feedback_tags
  28. payroll_settings (singleton)
  29. payroll_periods (include commission_from/to, attendance_from/to, tips_from/to)
  30. payroll_entries (include commission_regular, commission_ot, flat/prorata split columns)
  31. payroll_adjustments (include is_kasbon, expense_id, deduct_period)
  32. pax_out_events
  33. delay_incidents
  34. kiosk_settings
  35. kiosk_tokens
  36. whatsapp_settings (singleton, 6 templates)

Then create all indexes from system-plan.md.
Then create backend/db/seed.sql with realistic Bali data.

## 0B. Backend Foundation
Files: backend/server.js, backend/config/db.js, backend/middleware/

server.js:
  - Express app, JSON body parser, CORS (dev only), static serve from public/
  - Mount all route files under /api/
  - Error handling middleware

config/db.js:
  - PostgreSQL pool using node-postgres (pg)
  - Read DB connection from environment variables
  - Pool config: max 20 connections

middleware/auth.js:
  - JWT verification for admin routes
  - X-Kiosk-Token verification for kiosk routes
  - Combined middleware: acceptsKioskOrAdmin()

middleware/branchScope.js:
  - Extracts branch_id from query, body, or kiosk token
  - Attaches to req.branchId
  - Rejects requests without branch_id where required

## 0C. Frontend Foundation
Files: frontend/src/shared/

tokens.js — export all design tokens from Section 02
api.js — base fetch wrapper:
  - Reads VITE_API_URL from env (default: '' for same-origin)
  - Adds X-Kiosk-Token header when in kiosk mode
  - Adds Authorization: Bearer <jwt> when in admin mode
  - Returns parsed JSON, throws on non-2xx
  - Exports: get(url), post(url, body), patch(url, body), put(url, body), del(url)

useSSE.js — EventSource hook:
  - Accepts branch_id param
  - Connects to /api/events?branch_id=
  - Auto-reconnects on error (exponential backoff)
  - Returns { lastEvent, isConnected }
  - Callback-based: onEvent(type, callback)

App.jsx — root router (React Router):
  - /kiosk → KioskApp
  - /admin → AdminApp
  - /mockup/kiosk → existing mockup BercutKiosk (keep for reference)
  - /mockup/admin → existing mockup BercutAdmin (keep for reference)

## 0D. SSE Endpoint
File: backend/routes/events.js

GET /api/events?branch_id=
  - Validates branch_id
  - Sets headers: Content-Type text/event-stream, Cache-Control no-cache,
    Connection keep-alive, X-Accel-Buffering no (for Nginx)
  - Stores client connection in a Map keyed by branch_id
  - On close: remove from Map
  - Export: emitEvent(branchId, type, data) — broadcasts to all clients on that branch

Event types to support:
  new_booking, booking_started, payment_trigger, booking_cancelled,
  kiosk_settings_update, client_not_arrived, payment_complete

## 0E. Kiosk Registration + Webhook Endpoints
File: backend/routes/kiosk.js

POST /api/kiosk/register
  - Validates X-Kiosk-Token header against kiosk_tokens table
  - Returns { branch_id, branch_name, settings } including merged kiosk_settings
  - Updates kiosk_tokens.last_seen_at
  - 401 if token missing, invalid, or revoked (is_active=false)

File: backend/routes/payments.js (webhook)

POST /api/payments/xendit-webhook
  - Verifies Xendit webhook signature (X-CALLBACK-TOKEN header)
  - Sets booking.payment_status = 'paid', booking.paid_at = now()
  - Transitions booking.status to 'completed'
  - Credits loyalty points if applicable (points_earned on booking)
  - Inserts point_transactions row (type='earn')
  - Updates customers.points_balance, total_spend, total_visits, last_visit
  - Triggers inventory deduction (service_consumables → inventory_stock)
  - Emits SSE: { type: 'payment_complete', booking_id }
```

---

### Phase 1 — Kiosk Booking Flow

Build these screens in order. Each connects to real API endpoints.

#### 1A. Services + Barbers + Slots + Confirm + Queue Number

```
Build the complete kiosk booking flow for production.

## Mockup references
- mockups/kiosk/BercutKiosk.jsx — main shell, DeviceSetup, OfflineBanner, IdleOverlay
- mockups/kiosk/Welcome.jsx
- mockups/kiosk/ServiceSelection.jsx — includes BleachModal, UpsellModal
- mockups/kiosk/BarberSelection.jsx
- mockups/kiosk/TimeSlot.jsx
- mockups/kiosk/Confirm.jsx — E.164 phone, per-service points toggle
- mockups/kiosk/QueueNumber.jsx — escalation timer, Web Speech

## Production files
frontend/src/apps/kiosk/KioskApp.jsx — main shell (port from BercutKiosk.jsx)
frontend/src/apps/kiosk/screens/Welcome.jsx
frontend/src/apps/kiosk/screens/ServiceSelection.jsx
frontend/src/apps/kiosk/screens/BarberSelection.jsx
frontend/src/apps/kiosk/screens/TimeSlot.jsx
frontend/src/apps/kiosk/screens/Confirm.jsx
frontend/src/apps/kiosk/screens/QueueNumber.jsx

## API connections (replace mock data)
GET  /api/services?branch_id=            — service list (filtered by branch_services)
GET  /api/barbers?branch_id=             — available barbers (filtered by barber_services capability)
GET  /api/slots?barber_id=&date=&service_ids=  — available time slots
GET  /api/customers?phone=               — loyalty points lookup by E.164 phone
POST /api/bookings                       — create booking
POST /api/bookings/:id/announce          — trigger Web Speech announcement

## Backend routes to build
backend/routes/services.js
backend/routes/barbers.js
backend/routes/slots.js — slot generation logic (see system-plan Section 07)
backend/routes/bookings.js — create, start, complete, add-services, cancel, no-show, announce, client-not-arrived, stop-escalation

## Key business logic
- Slot generation: 30-min blocks within barber shift, minus booked slots, minus breaks,
  minus 15-min buffer, minus service duration, minus past times
  → See _ai/system-plan.md Section 07 "Slot generation logic"
- Booking number: "B" + 3-digit sequential per branch per day (B001, B002...)
- Customer upsert: if guest_phone provided, upsert customers table
- Any Available assignment: fewest any-available bookings today, tiebreak by sort_order
  → bookings.source = 'any_available'
- Points: deducted at confirm (status=confirmed), credited at completed
- Mutex groups: ear_treatment and beard_service — enforce mutual exclusivity
- Hair Bleach: store bleach_step (1/2/3) and bleach_with_color on booking_services
- Auto-cancel: for future slots, set auto_cancel_at = scheduled_at + branches.auto_cancel_minutes
  (default 15 min, configurable per branch in Branches → Operations tab; 0 = disabled)
  "Now" bookings → auto_cancel_at = NULL (never auto-cancelled)

## Kiosk shell features (from BercutKiosk.jsx)
- Device setup: read X-Kiosk-Token from localStorage, POST /api/kiosk/register
- Offline banner: navigator.onLine listener
- Idle timeout: 60s inactivity → 15s countdown → auto-reset + POST /api/pax-out (kiosk_timeout)
- pax-out on back button: POST /api/pax-out (kiosk_back)
- Triple-tap corner: opens StaffPanel
- Topbar logo tap: opens access modal (Admin or Barber PIN)
```

---

#### 1B. Payment Takeover

```
Build the PaymentTakeover component for production.

## Mockup reference
mockups/kiosk/PaymentTakeover.jsx

## Production file
frontend/src/apps/kiosk/screens/PaymentTakeover.jsx

## Flow
1. Triggered by SSE event { type: 'payment_trigger', booking_id }
   OR StaffPanel/AdminPanel selection
2. Full-screen dark overlay, two-column layout
3. Left: order summary + tip selection
4. Right: payment method (QRIS / Card) → Xendit Terminal trigger
5. On success: ReceiptScreen (print + WA receipt option)
6. Then: ReviewScreen (1–5 stars + feedback tags, 5-min timeout)
7. Auto-returns to booking flow

## API connections
POST /api/payments — { booking_id, method, tip_amount, total_amount }
  → Backend calls Xendit POST /v1/terminal/sessions
  → On Xendit webhook: set booking.payment_status=paid, booking.status=completed
  → Emit SSE: { type: 'payment_complete', booking_id }
  → If tip > 0: INSERT INTO tips

POST /api/whatsapp/receipt — send receipt WA if phone provided
GET  /api/feedback-tags    — load admin-configured tags for ReviewScreen

## Payment failure UX (from system-plan)
If Xendit declines or times out:
- Full-screen error with 3 options: Retry, Try Other Method, Contact Staff
- Contact Staff emits SSE alert to admin
- Booking stays in pending_payment — never auto-cancelled

## Xendit simulation testing
Terminal ID: SIM001 — special test amounts available before hardware
See _ai/system-plan.md Section 07 for Xendit H2H details

## Backend route
backend/routes/payments.js
  - POST /api/payments — trigger Xendit session
  - POST /api/payments/manual — admin manual trigger (payment_trigger_source='admin_manual')
  - Webhook handler: POST /api/payments/xendit-webhook — Xendit sends confirmation

## Receipt printer
backend/services/receiptPrinter.js
  - Uses escpos or node-thermal-printer library
  - printReceipt(bookingId) — queries booking + services + tip, formats ESC/POS commands
  - Connects via USB or network (configurable per branch)
  - Called automatically on payment_complete webhook + manually via admin "Reprint" button
  - If printer offline: silently log error, do NOT block payment flow
```

---

#### 1C. Barber Panel + Staff Panel

```
Build the BarberPanel and StaffPanel for production.

## Mockup references
mockups/kiosk/BarberPanel.jsx
mockups/kiosk/StaffPanel.jsx
mockups/kiosk/AdminPanel.jsx

## Production files
frontend/src/apps/kiosk/screens/BarberPanel.jsx
frontend/src/apps/kiosk/screens/StaffPanel.jsx
frontend/src/apps/kiosk/screens/AdminPanel.jsx

## BarberPanel API connections
GET  /api/bookings?barber_id=&date=today&branch_id=    — today's queue
POST /api/bookings/:id/start                            — start service
POST /api/bookings/:id/complete                         — complete → pending_payment
POST /api/bookings/:id/add-services                     — add services mid-cut
POST /api/bookings/:id/client-not-arrived               — "Belum Datang" alert
POST /api/attendance/clock-in                           — barber clock in
POST /api/attendance/clock-out                          — barber clock out
POST /api/barber-breaks                                 — start break
PATCH /api/barber-breaks/:id/end                        — end break
GET  /api/events?branch_id= (SSE)                       — listen for new_booking events

## Key BarberPanel rules
- Start button: active only for topmost confirmed booking (prevents wrong-client start)
- Belum Datang: sends WA to branch backoffice_alert_phone, emits SSE client_not_arrived
- Barber cannot cancel or no-show — admin-only actions
- Monthly earnings toggle: pulls from bookings + tips for the month
- Break: 15/30/45 min options, blocks time slots for duration

## StaffPanel API connections
GET  /api/bookings?branch_id=&status=in_progress,confirmed  — active queue list
POST /api/booking-groups                                     — form group payment

## AdminPanel API connections
GET  /api/admin/branch-overview?branch_id=&date=  — full queue + barber status
POST /api/payments/manual                          — manual payment trigger
POST /api/bookings/:id/cancel                      — cancel with reason
POST /api/bookings/:id/no-show                     — mark no-show
PATCH /api/bookings/:id/stop-escalation            — stop WA escalation

## Backend routes needed
backend/routes/bookings.js — add start, complete, add-services, cancel, no-show, 
                             client-not-arrived, stop-escalation, announce
backend/routes/attendance.js — clock-in, clock-out, log-off
backend/routes/barber-breaks.js — start, end
backend/routes/events.js — SSE (already built in Phase 0)
```

---

### Phase 2 — Admin Dashboard

Build these in order. Each screen has an approved mockup as reference.

#### 2A. Admin Shell + Overview + Live Monitor

```
Build the admin dashboard shell, overview, and live monitor.

## Mockup references
mockups/admin/BercutAdmin.jsx — shell with sidebar nav (14 items)
mockups/admin/Overview.jsx
mockups/admin/LiveMonitor.jsx
mockups/admin/BranchDetail.jsx

## Production files
frontend/src/apps/admin/AdminApp.jsx
frontend/src/apps/admin/screens/Overview.jsx
frontend/src/apps/admin/screens/LiveMonitor.jsx
frontend/src/apps/admin/screens/BranchDetail.jsx

## Admin auth
backend/routes/auth.js:
  POST /api/auth/login — { email, password } → JWT
  GET  /api/auth/me    — validate JWT, return user + permissions

## AdminApp shell
- Left sidebar: 220px, dark (#111110)
- 14 nav items: Overview, Live Monitor, Reports, Barbers, Branches, Services,
  Customers, Expenses, Inventory, Attendance, Payroll, Online Booking,
  Kiosk Config, Settings
- Permission-gated: hide nav items where user_permissions.is_enabled = false
- monitoring role: only Overview + Live Monitor visible

## Overview API
GET /api/admin/overview?date= — today's KPIs + branch cards
  Returns: { totalRevenue, activeBookings, waitingCount, completedCount,
             branches: [{ id, name, city, revenue, inChair, waiting, done,
                          barbers: [{ id, name, status, avatar_url }], alerts }] }

## LiveMonitor API
GET /api/live-monitor?branch_id= — current chair status across branches
  Returns per-barber: current booking, next booking, elapsed time, status
GET /api/live/barbers?branch_id= (SSE) — real-time barber state updates

Admin actions from LiveMonitor:
  POST /api/bookings/:id/start   — force-start (same as barber Mulai)
  POST /api/bookings/:id/cancel  — cancel with required reason
  POST /api/bookings/:id/no-show — mark no-show
  POST /api/pax-out              — log cctv_manual pax-out event
```

---

#### 2B. Core Admin Screens

```
Build the remaining admin screens. Each has a mockup in mockups/admin/.

## Screen → Mockup → Production path → Primary API

Reports
  mockups/admin/Reports.jsx
  frontend/src/apps/admin/screens/Reports.jsx
  GET /api/admin/reports/revenue?from=&to=&branch_id=
  GET /api/admin/pax-out?from=&to=&branch_id=
  GET /api/admin/delay-incidents?from=&to=&branch_id=&barber_id=
  GET /api/admin/barbers/:id/transactions?from=&to=
  3 tabs: Revenue, Demand (pax-out analytics), Delay

Barbers
  mockups/admin/Barbers.jsx
  frontend/src/apps/admin/screens/Barbers.jsx
  GET/POST/PATCH /api/barbers
  GET/PUT /api/barbers/:id/services — service capability toggles

Branches
  mockups/admin/Branches.jsx
  frontend/src/apps/admin/screens/Branches.jsx
  GET/POST/PATCH /api/branches
  GET/POST/PATCH/DELETE /api/branches/:id/chairs
  GET/POST/PATCH/DELETE /api/chair-overrides
  GET/POST/DELETE /api/admin/kiosk-tokens
  3-tab BranchModal: Details, Operations, Kiosk Devices
  Operations tab includes: online booking toggle, backoffice alert phone,
    speaker on/off, Web Push (P2), late start alert stepper, ack grace stepper,
    auto-cancel minutes stepper (DEFAULT 15, 0=disabled), tip presets,
    escalation interval stepper, escalation max count stepper
  ChairPanel + OverrideModal

Services
  mockups/admin/Services.jsx
  frontend/src/apps/admin/screens/Services.jsx
  GET/POST/PATCH /api/services
  PUT /api/services/:id/branch-config
  GET/PUT /api/services/:id/consumables

Customers
  mockups/admin/Customers.jsx
  frontend/src/apps/admin/screens/Customers.jsx
  GET /api/customers — list with search/filter
  GET /api/customers/:id — profile detail
  GET /api/customers/:id/history — paginated visit history

Expenses
  mockups/admin/Expenses.jsx
  frontend/src/apps/admin/screens/Expenses.jsx
  GET/POST /api/expenses
  GET /api/expenses/export?format=csv|xlsx
  GET/POST/PATCH /api/expense-categories
  3 expense types: regular, inventory, kasbon
  PO system: purchase_orders + LRM distribution

Inventory
  mockups/admin/Inventory.jsx
  frontend/src/apps/admin/screens/Inventory.jsx
  GET /api/inventory?branch_id=
  GET /api/inventory/movements?item_id=&branch_id=
  POST /api/inventory/distribute
  GET/POST/PATCH /api/inventory/items
  GET /api/inventory/menu?branch_id=
  PUT /api/inventory/menu?branch_id=
  3 tabs: Items, Stock Levels, Movement Log
  + Kiosk Menu config (per-branch price + kiosk_visible)

Attendance
  mockups/admin/Attendance.jsx
  frontend/src/apps/admin/screens/Attendance.jsx
  GET /api/attendance/monthly?barber_id=&month=&branch_id=
  GET/POST/PATCH/DELETE /api/off-records
  POST /api/attendance/log-off

Payroll
  mockups/admin/Payroll.jsx
  frontend/src/apps/admin/screens/Payroll.jsx
  POST /api/payroll/generate — create period + entries
  GET /api/payroll/periods?branch_id=&status=
  GET /api/payroll/periods/:id — full detail
  PATCH /api/payroll/periods/:id/status — draft→reviewed→communicated
  PATCH /api/payroll/entries/:id — override deductions
  GET/POST/DELETE /api/payroll/adjustments
  GET /api/payroll/periods/:id/export?format=csv|xlsx
  GET/PUT /api/payroll/settings

  IMPORTANT known gaps to fix during build:
  - Add "All Branches" selector option (F2.1 from pre-build-audit)
  - Add period status controls: Mark Reviewed / Mark Communicated (F2.2)
  - Add xlsx export option alongside CSV (F2.3)
  - Add freelancer mock/test row (F2.4)

Online Booking
  mockups/admin/OnlineBooking.jsx
  frontend/src/apps/admin/screens/OnlineBooking.jsx
  GET/PATCH /api/branches/:id/online-booking
  GET /api/reports/online-bookings?branch_id=&from=&to=

Kiosk Config
  mockups/admin/KioskConfig.jsx
  frontend/src/apps/admin/screens/KioskConfig.jsx
  GET /api/kiosk-settings?branch_id=
  PATCH /api/branches/:id/settings — saves + emits SSE kiosk_settings_update
  GET/POST/PATCH /api/feedback-tags

Settings
  mockups/admin/Settings.jsx
  frontend/src/apps/admin/screens/Settings.jsx
  6 tabs: Catalog, Loyalty, Payroll, WhatsApp, Users, Audit Log

  Catalog: GET/POST/PATCH /api/expense-categories
  Loyalty: GET/PUT /api/settings/loyalty (points_expiry_months, warning_days)
  Payroll: GET/PUT /api/payroll/settings (deduction rates, OT commission)
  WhatsApp: GET/PUT /api/settings/whatsapp + POST /api/settings/whatsapp/test
  Users: GET/POST/PATCH /api/users + GET/PUT /api/users/:id/permissions (owner-only)
  Audit Log: GET /api/audit-log (owner-only, paginated)
  Settings sub-routes:
    GET/PUT /api/settings/loyalty — points expiry config
    GET/PUT /api/payroll/settings — deduction rates, OT config
    GET/PUT /api/settings/whatsapp — provider credentials + 6 templates
    POST /api/settings/whatsapp/test — test send to a phone number

## Backend routes for this phase
backend/routes/reports.js — revenue, pax-out analytics, delay incidents, barber TX log
backend/routes/barbers.js — CRUD + service capability (already started Phase 1)
backend/routes/branches.js — CRUD + chairs + overrides + kiosk tokens
backend/routes/services.js — CRUD + branch config + consumables
backend/routes/customers.js — list, detail, history
backend/routes/expenses.js — CRUD + PO lifecycle + CSV/xlsx export
backend/routes/inventory.js — stock, movements, distribute, items, menu
backend/routes/attendance.js — monthly view + off records (extend Phase 1)
backend/routes/payroll.js — generate, periods, entries, adjustments, export, settings
backend/routes/settings.js — loyalty, whatsapp, users, permissions, audit log
backend/routes/online-booking.js — branch config + stats
backend/routes/kiosk-config.js — read/write kiosk settings + feedback tags
```

---

### Phase 3 — Services Layer (Background Logic)

```
Build the backend service modules that run independently of screen interactions.

## backend/services/slotGenerator.js
Pure function: given barber schedule, existing bookings, breaks, and service duration,
return available slot times.
- 30-minute block generation within shift hours
- Subtract booked slots (+ 15-min buffer)
- Subtract active breaks
- Subtract past times (if today)
- Subtract slots where remaining time < service duration
- Export: getAvailableSlots(barberId, date, serviceDurationMinutes, branchId)

## backend/services/notifications.js
All notification logic in one place.
- emitSSE(branchId, type, data) — wraps events.js emitEvent
- speakAnnouncement(branchId, text) — emits SSE { type: 'announcement', text } for kiosk Web Speech
- sendWhatsApp({ to, templateKey, params }) — routes to Fonnte or WA Business API based on provider
  → Fonnte: POST https://api.fonnte.com/send, Header: Authorization: <token>, Body: form-data
  → 6 templates: booking_confirmation, receipt, late_customer_reminder,
                  barber_new_booking, barber_escalation, client_not_arrived

## backend/services/escalation.js
Background job checking every 30s for unacknowledged bookings.
- If booking not acknowledged within acknowledge_grace_minutes: trigger WA escalation
- Recurring: re-send barber_escalation every barber_escalation_interval_minutes
- Cap at barber_escalation_max_count
- Stop on: booking_started SSE, admin cancel, no-show, max reached
- Track: bookings.escalation_count, escalation_stopped_at, escalation_stop_reason

## backend/services/pointsExpiry.js
Nightly cron job (node-cron or setInterval).
- Find customers where now > points_last_activity_at + expiry interval
- Insert 'expired' row in point_transactions
- Zero out customers.points_balance
- Set customers.points_last_expired_at = now

## backend/services/inventoryDeduction.js
Called when booking_service status transitions to completed.
- Look up service_consumables for each service_id
- Deduct qty_per_use from inventory_stock.current_stock at the booking's branch
- Insert inventory_movements (type='out', note='Auto-deducted on service completion')

## backend/services/autoCancel.js
Background job running every 60s.
- auto_cancel_at is set per booking at creation time using branches.auto_cancel_minutes
  (default 15 min, configurable per branch; 0 = disabled → auto_cancel_at stays NULL)
- Find bookings where status='confirmed' AND auto_cancel_at IS NOT NULL AND auto_cancel_at < now()
- Transition to 'cancelled' with cancellation_reason='Auto-cancelled: customer did not arrive'
- Emit SSE: { type: 'booking_cancelled', booking_id, reason: 'auto_cancel' }
- If points_redeemed > 0: refund points back to customer.points_balance
- Insert point_transactions row (type='earn', note='refund_auto_cancel')
- Log in audit_log (user_id = NULL, action = 'booking.auto_cancelled')

## backend/services/receiptPrinter.js
Thermal receipt printing via ESC/POS.
- printReceipt(bookingId) — formats booking summary, itemised services, tip, total
- Connection: USB (/dev/usb/lp0 or COM port) or network (IP:9100)
- Called on payment_complete + admin reprint action
- If printer offline: fail silently (log warning, never block payment)

## backend/services/payrollCalculator.js
Called by POST /api/payroll/generate.
For each active barber in the branch for the period:
- attendance_days = COUNT DISTINCT DATE(clock_in_at) within attendance window
- gross_service_revenue = SUM booking_services.price_charged (completed, not paid_with_points) within commission window
- commission_regular = SUM(branch_services.commission_rate ?? barbers.commission_rate × price_charged)
- commission_ot = SUM(ot_bonus_pct × price_charged) for late-hour qualifying services
- tips_earned = SUM tips.amount within tips window
- late_minutes = total late minutes (clock_in vs shift start, applying grace period)
- off counts: excused (within/over quota), inexcused, doctor note exemptions
- kasbon: auto-import from expenses where type=kasbon, barber_id match, deduct_period=current
- Net pay: base + commission + tips - late_ded - inexcused_ded - excused_ded + additions - deductions

## backend/services/excelExport.js
Shared xlsx export utility using exceljs.
- exportPayroll(periodId) → xlsx buffer with Summary + Transactions sheets
- exportExpenses(filters) → xlsx buffer with Summary + Transactions sheets
  (PO multi-branch expenses → one row per branch attribution)
- exportReports(filters) → xlsx buffer with Revenue + P&L summary
- All exports: bold headers, auto-column-width, number formatting, ISO dates
```

---

### Phase 4 — Deployment & Staging

```
Build the deployment configuration for Rumahweb VPS.

## deploy/nginx.conf
server {
  listen 80;
  server_name bercut.id;
  return 301 https://$host$request_uri;   # force HTTPS
}

server {
  listen 443 ssl http2;
  server_name bercut.id;

  ssl_certificate     /etc/letsencrypt/live/bercut.id/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/bercut.id/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options nosniff;
  add_header X-Frame-Options DENY;

  location /api/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;        # CRITICAL for SSE
    proxy_cache off;
    proxy_read_timeout 86400s;  # Keep SSE connections alive (24h)
    chunked_transfer_encoding on;
  }

  # Receipt / uploaded files
  location /uploads/ {
    alias /var/www/bercut/backend/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  location / {
    root /var/www/bercut/backend/public;
    try_files $uri $uri/ /index.html;   # SPA fallback
    expires 7d;
  }
}

## deploy/ecosystem.config.js (PM2)
module.exports = {
  apps: [{
    name: 'bercut-api',
    script: './server.js',
    cwd: '/var/www/bercut/backend',
    instances: 1,           # MUST be 1 for SSE (in-memory client map)
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://bercut:password@localhost:5432/bercut'
    }
  }]
};

## deploy/setup.sh
One-time VPS setup script:
  - Install Node.js 20 LTS
  - Install PostgreSQL 16
  - Create bercut database + user
  - Run schema.sql + seed.sql
  - Install PM2 globally
  - Configure Nginx
  - Enable firewall (ufw: 22, 80, 443)
  - Setup Let's Encrypt SSL via certbot
  - Create /var/www/bercut/backend/uploads/ directory (receipt file storage)
  - Set up daily pg_dump backup cron (→ /var/backups/bercut/)

## deploy/deploy.sh
Repeatable deployment script:
  cd /var/www/bercut
  git pull origin main
  cd frontend && npm ci && npm run build
  cd ../backend && npm ci
  pm2 restart bercut-api
  echo "Deployed $(date)" >> /var/log/bercut-deploy.log

## Frontend build
cd frontend && npm run build
  → outputs to backend/public/
Nginx serves directly from there — no separate frontend server.

## Environment files
backend/.env:
  DATABASE_URL=postgresql://bercut:password@localhost:5432/bercut
  JWT_SECRET=<random-64-char>
  XENDIT_API_KEY=<from-xendit-dashboard>
  XENDIT_WEBHOOK_SECRET=<from-xendit-dashboard>
  FONNTE_API_KEY=<from-fonnte-dashboard>
  NODE_ENV=production
  PORT=3000
  UPLOAD_DIR=/var/www/bercut/backend/uploads

frontend/.env:
  VITE_API_URL=          # empty = same origin (production)
  # VITE_API_URL=http://localhost:3000   # dev only
```

---

## 04 — Porting Mockups to Production: Rules

When converting a mockup file to a production screen:

1. **Keep the visual output identical.** The mockup IS the approved design. **DO NOT change any UI, UX, or anything else** other than optimizing for the new 1366 x 768 resolution.
2. **Replace mock data with API calls.** Every `const MOCK_*` or `const DUMMY_*` array becomes a `useEffect` fetch.
3. **Replace inline `C.xxx` tokens** with imports from `shared/tokens.js`.
4. **Replace `fmt()` / `fmtM()`** with shared formatting utilities.
5. **Keep inline styles.** Do not convert to Tailwind or CSS modules. Mockups use inline styles — production should too for consistency.
6. **Wire SSE listeners** where the mockup has comments like `// SSE: listen for...`
7. **Add error states and loading states** that mockups don't have.
8. **Add proper error handling** for all API calls (try/catch, toast/banner).
9. **Keep all existing comments and docstrings** from mockups — they document business rules.
10. **Port the file header comment** — update the path from `mockups/` to `frontend/src/apps/`.

---

## 05 — Per-Screen Handoff Reference

Quick-reference table mapping every mockup to its production path and primary API.

### Kiosk

| Mockup | Production Path | Primary API |
|---|---|---|
| `mockups/kiosk/BercutKiosk.jsx` | `frontend/src/apps/kiosk/KioskApp.jsx` | `POST /api/kiosk/register`, SSE |
| `mockups/kiosk/Welcome.jsx` | `frontend/src/apps/kiosk/screens/Welcome.jsx` | — (kiosk settings from register response) |
| `mockups/kiosk/ServiceSelection.jsx` | `frontend/src/apps/kiosk/screens/ServiceSelection.jsx` | `GET /api/services?branch_id=` |
| `mockups/kiosk/BarberSelection.jsx` | `frontend/src/apps/kiosk/screens/BarberSelection.jsx` | `GET /api/barbers?branch_id=` |
| `mockups/kiosk/TimeSlot.jsx` | `frontend/src/apps/kiosk/screens/TimeSlot.jsx` | `GET /api/slots?barber_id=&date=&service_ids=` |
| `mockups/kiosk/Confirm.jsx` | `frontend/src/apps/kiosk/screens/Confirm.jsx` | `GET /api/customers?phone=`, `POST /api/bookings` |
| `mockups/kiosk/QueueNumber.jsx` | `frontend/src/apps/kiosk/screens/QueueNumber.jsx` | `POST /api/bookings/:id/announce`, SSE |
| `mockups/kiosk/PaymentTakeover.jsx` | `frontend/src/apps/kiosk/screens/PaymentTakeover.jsx` | `POST /api/payments`, `GET /api/feedback-tags` |
| `mockups/kiosk/BarberPanel.jsx` | `frontend/src/apps/kiosk/screens/BarberPanel.jsx` | Bookings CRUD, attendance, breaks |
| `mockups/kiosk/StaffPanel.jsx` | `frontend/src/apps/kiosk/screens/StaffPanel.jsx` | `POST /api/booking-groups` |
| `mockups/kiosk/AdminPanel.jsx` | `frontend/src/apps/kiosk/screens/AdminPanel.jsx` | Branch overview, manual payment |

### Admin

| Mockup | Production Path | Primary API |
|---|---|---|
| `mockups/admin/BercutAdmin.jsx` | `frontend/src/apps/admin/AdminApp.jsx` | `GET /api/auth/me` |
| `mockups/admin/Overview.jsx` | `frontend/src/apps/admin/screens/Overview.jsx` | `GET /api/admin/overview` |
| `mockups/admin/LiveMonitor.jsx` | `frontend/src/apps/admin/screens/LiveMonitor.jsx` | `GET /api/live-monitor`, SSE |
| `mockups/admin/BranchDetail.jsx` | `frontend/src/apps/admin/screens/BranchDetail.jsx` | Bookings actions, escalation |
| `mockups/admin/Reports.jsx` | `frontend/src/apps/admin/screens/Reports.jsx` | Revenue, pax-out, delay reports |
| `mockups/admin/Barbers.jsx` | `frontend/src/apps/admin/screens/Barbers.jsx` | Barbers CRUD + services |
| `mockups/admin/Branches.jsx` | `frontend/src/apps/admin/screens/Branches.jsx` | Branches + chairs + overrides + tokens |
| `mockups/admin/Services.jsx` | `frontend/src/apps/admin/screens/Services.jsx` | Services + branch config + consumables |
| `mockups/admin/Customers.jsx` | `frontend/src/apps/admin/screens/Customers.jsx` | Customer profiles + history |
| `mockups/admin/Expenses.jsx` | `frontend/src/apps/admin/screens/Expenses.jsx` | Expenses + POs + export |
| `mockups/admin/Inventory.jsx` | `frontend/src/apps/admin/screens/Inventory.jsx` | Inventory + distribute + menu |
| `mockups/admin/Attendance.jsx` | `frontend/src/apps/admin/screens/Attendance.jsx` | Attendance + off records |
| `mockups/admin/Payroll.jsx` | `frontend/src/apps/admin/screens/Payroll.jsx` | Payroll periods + entries + adjustments |
| `mockups/admin/OnlineBooking.jsx` | `frontend/src/apps/admin/screens/OnlineBooking.jsx` | Branch online booking config |
| `mockups/admin/KioskConfig.jsx` | `frontend/src/apps/admin/screens/KioskConfig.jsx` | Kiosk settings + feedback tags |
| `mockups/admin/Settings.jsx` | `frontend/src/apps/admin/screens/Settings.jsx` | All settings tabs |

---

## 06 — Backend Route Building Guide

For each route file in `backend/routes/`, follow this pattern:

```js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireKiosk, requireAdmin } = require('../middleware/auth');
const { emitEvent } = require('./events');

// GET /api/[resource]
router.get('/', requireAuth, async (req, res) => {
  try {
    const { branch_id } = req.query;
    const result = await pool.query(
      'SELECT * FROM [table] WHERE branch_id = $1 ORDER BY created_at DESC',
      [branch_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[resource] GET error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

**Rules for every route:**
1. Always include `branch_id` filter where applicable
2. Use parameterised queries ($1, $2...) — never string concatenation
3. Use DB transactions (`BEGIN; ... COMMIT;`) for multi-table writes
4. Log to `audit_log` on every create/update/delete for admin actions
5. Emit SSE events where real-time updates are needed
6. Return appropriate HTTP status codes (201 created, 400 validation, 404 not found, 403 forbidden)

---

## 07 — Known Gaps to Address During Build

From `_ai/pre-build-audit.md` Section F2:

| ID | Gap | Fix |
|---|---|---|
| F2.1 | Payroll: "All Branches" selector missing | Add as first option in branch dropdown; API returns all when branch_id omitted |
| F2.2 | Payroll: period status controls absent | Add status pill + "Mark Reviewed" / "Mark Communicated" buttons in header |
| F2.3 | Payroll + Expenses: xlsx export missing | Add split Export button (CSV / Excel); backend uses exceljs |
| F2.4 | Payroll: no freelancer mock row | Add daily_rate row to test data; net_pay = days × rate, no commission |
| F2.5 | Branches Operations: escalation interval/max controls absent | Add two steppers or document as backend-only defaults |

---

## 07B — Online Booking Public Page

Not covered elsewhere. This is the customer-facing booking page accessible via `bercut.id/book/:slug`.

```
Build the public online booking page.

## Production file
frontend/src/apps/public/BookingPage.jsx

## Route
App.jsx: /book/:slug → BookingPage

## Flow
1. GET /api/public/branch-by-slug/:slug → returns branch info, services, barbers
2. If branch.online_booking_enabled = false, show WA redirect (use branch.backoffice_alert_phone)
3. Same flow as kiosk: ServiceSelection → BarberSelection → TimeSlot → Confirm
4. Mobile-responsive (portrait, touch-friendly)
5. booking.source = 'online'
6. No payment — postpaid at kiosk counter after service
7. Customer must provide name + phone (both required for online)

## Backend route
backend/routes/public.js
  GET /api/public/branch-by-slug/:slug — no auth required, public endpoint
  POST /api/bookings — same endpoint, source='online'
```

---

## 07C — Pre-Staging QA Checklist

Before declaring staging-ready, verify ALL of these:

```
## Database
- [ ] schema.sql runs clean on fresh PostgreSQL 16
- [ ] seed.sql creates realistic test data (6+ branches, 15+ barbers, 3+ services per category)
- [ ] All indexes created
- [ ] All ENUMs match system-plan exactly
- [ ] All FK constraints in place
- [ ] Singleton rows created (payroll_settings, whatsapp_settings)

## Backend API
- [ ] Every endpoint from system-plan Section 07 exists and returns correct shape
- [ ] All routes include branch_id scoping
- [ ] JWT auth works for admin routes
- [ ] X-Kiosk-Token auth works for kiosk routes
- [ ] SSE endpoint streams events correctly (test with curl)
- [ ] Xendit webhook handler verifies signature
- [ ] Error responses use consistent { error: string } format
- [ ] Audit log writes on all admin mutations
- [ ] CORS disabled in production (same-origin)

## Frontend
- [ ] All 11 kiosk screens render and navigate correctly
- [ ] All 16 admin screens render and navigate correctly
- [ ] No hardcoded mock data remaining (grep for MOCK_, DUMMY_, DEMO_)
- [ ] Design tokens match CLAUDE.md exactly
- [ ] Yellow never used as text colour on light backgrounds
- [ ] All kiosk touch targets ≥ 72px
- [ ] BarberPanel fully in Bahasa Indonesia
- [ ] SSE reconnects on connection loss
- [ ] Offline banner shows when navigator.onLine = false
- [ ] PWA manifest + service worker registered

## Services Layer
- [ ] Slot generator returns correct available slots
- [ ] Escalation loop sends WA + respects max count
- [ ] Points expiry cron runs nightly
- [ ] Inventory deduction fires on service completion
- [ ] Auto-cancel fires for expired confirmed bookings
- [ ] Payroll calculator produces correct net pay
- [ ] Receipt printer gracefully handles offline printer
- [ ] Excel export produces valid .xlsx files

## Deployment
- [ ] Vite build outputs to backend/public/
- [ ] Nginx config includes SSE proxy_buffering off
- [ ] Nginx config includes 24h proxy_read_timeout for SSE
- [ ] SSL/HTTPS configured via Let's Encrypt
- [ ] PM2 ecosystem config uses 1 instance
- [ ] .env file has all required variables
- [ ] uploads/ directory exists with write permissions
- [ ] Daily database backup cron configured
- [ ] Firewall allows only ports 22, 80, 443
```

---

## 08 — Prompt Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Buttons not clickable | Used onTouchStart | Always onClick |
| Yellow text on white cards | Accent as text colour | Yellow is background only; text on white = #111110 |
| Selected card text invisible | Muted text on yellow bg | All text → #111110 on yellow |
| Layout breaks on resize | Fixed pixel widths | Use clamp(min, fluid, max) |
| Payment in booking flow | AI assumes prepaid | POSTPAID — payment is a separate mode triggered by barber Complete |
| Tip on confirm screen | Common POS pattern | Tip is on PaymentTakeover only |
| Wrong language in barber panel | AI defaults English | BarberPanel is Bahasa Indonesia ONLY |
| branch_id missing | AI forgets multi-tenant | Every query MUST include branch_id |
| proxy_buffering on | Default Nginx config | Always proxy_buffering off for SSE |
| Multiple PM2 instances | Default cluster mode | Must be 1 instance for SSE in-memory map |
| Mock data left in production | Forgot to replace | Every MOCK_* constant must become an API call |
| Kiosk shows all branches data | No auth boundary | Kiosk reads branch_id from device token, scopes all queries |

---

## 09 — Design Tokens Reference

### Colour Tokens

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FAFAF8` | Page background |
| `surface` | `#F2F0EB` | Input fields, secondary surfaces |
| `surface2` | `#ECEAE4` | Disabled states, tertiary |
| `accent` | `#F5E200` | CTA buttons, selected states ONLY |
| `accentText` | `#111110` | Text ON yellow backgrounds |
| `text` / `topBg` | `#111110` | Primary text, topbar, dark buttons |
| `text2` | `#3a3a38` | Secondary text |
| `muted` | `#88887e` | Placeholders, helper text |
| `border` | `#DDDBD4` | Card borders, dividers |
| `white` | `#FFFFFF` | Card surfaces |
| `topText` | `#F5E200` | Yellow text in dark topbar |
| `danger` | `#C0272D` | Destructive actions only |

### Typography Scale

| Use | Font | Weight |
|---|---|---|
| Screen titles | Inter | 800 |
| Service / barber names | Inter | 700 |
| Prices | Inter | 700–800 |
| Queue number hero | Inter | 800 |
| Primary CTA buttons | DM Sans | 700 |
| Body / descriptions | DM Sans | 400 |
| Labels / eyebrows | DM Sans | 700, uppercase |

### Component Patterns

| Component | Key Properties |
|---|---|
| Primary button (kiosk) | bg #111110, white text, border-radius 14px, min-height 72px |
| Ghost button | transparent bg, border #DDDBD4, text2 colour, border-radius 12px |
| Card (default) | white bg, 1.5px border #DDDBD4, border-radius 14px |
| Card (selected) | bg #F5E200, border #F5E200, ALL text → #111110 |
| Category pill | border-radius 999px, min-height 44px, active = #111110 bg white text |
| Admin card | white bg, 1px border, border-radius 12px, box-shadow subtle |

---

## 10 — File Dependency Map

```
backend/
  server.js                    ← Express app entry point
  config/db.js                 ← PostgreSQL pool
  middleware/auth.js            ← JWT + kiosk token verification
  middleware/branchScope.js     ← branch_id extraction
  routes/
    auth.js                    ← login, me
    branches.js                ← CRUD + chairs + overrides + kiosk tokens
    services.js                ← CRUD + branch config + consumables
    barbers.js                 ← CRUD + service capability
    slots.js                   ← slot availability
    bookings.js                ← full lifecycle (create → complete → payment)
    payments.js                ← Xendit Terminal + webhook
    attendance.js              ← clock in/out, log-off
    expenses.js                ← 3-type + PO + export
    inventory.js               ← stock, movements, distribute, menu
    reports.js                 ← revenue, pax-out, delay
    events.js                  ← SSE endpoint + emitEvent
    payroll.js                 ← generate, periods, entries, adjustments, export
    customers.js               ← list, detail, history
    settings.js                ← loyalty, whatsapp, users, permissions, audit log
    kiosk.js                   ← /api/kiosk/register
    kiosk-config.js            ← kiosk settings + feedback tags
    online-booking.js          ← branch online booking config + stats
    public.js                  ← /api/public/branch-by-slug/:slug (no auth)
  services/
    slotGenerator.js           ← pure slot availability logic
    notifications.js           ← SSE + WA (Fonnte) + Web Speech
    escalation.js              ← booking acknowledgement timer + WA escalation loop
    pointsExpiry.js            ← nightly cron: expire inactive loyalty points
    inventoryDeduction.js      ← auto-deduct consumables on service completion
    autoCancel.js              ← 60s loop: cancel expired confirmed bookings
    receiptPrinter.js          ← ESC/POS thermal receipt formatting + printing
    excelExport.js             ← xlsx export via exceljs (payroll, expenses, reports)
    payrollCalculator.js       ← generate payroll entries from attendance/bookings data
  db/
    schema.sql                 ← full PostgreSQL schema (35+ tables)
    seed.sql                   ← realistic dev data

frontend/src/
  main.jsx                     ← React entry
  App.jsx                      ← Router: /kiosk, /admin, /mockup/*
  shared/
    tokens.js                  ← design tokens
    api.js                     ← fetch wrapper (kiosk token + JWT)
    useSSE.js                  ← EventSource hook
    components/
      Topbar.jsx
      Button.jsx
      Card.jsx
  apps/
    kiosk/
      KioskApp.jsx             ← shell (device setup, idle, offline, panels)
      screens/                 ← all kiosk screens (11 files)
    admin/
      AdminApp.jsx             ← shell (sidebar, auth, permissions)
      screens/                 ← all admin screens (16 files)
```
