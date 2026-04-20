# Bercut Barber Shop — System Planning Document
*v1.0 · Prepared March 2026 · Confidential*

---

## 01 — Project Overview

Bercut is a barbershop chain with 6+ branches across Bali, Indonesia. This system replaces all front desk staff with a self-service kiosk, a barber queue app, and an admin dashboard.

**Three PWA apps, one shared codebase:**
- **Kiosk** — customer-facing, Windows touchscreen, landscape, no login required
- **Barber App** — staff-facing, mobile PWA, portrait, PIN login
- **Admin Dashboard** — owner/manager/accountant, desktop, full access across all branches

**Key design constraint:** Because there is no cashier, the system must handle payment confirmation automatically — via QRIS or card terminal — triggered after service completion. Payment via Xendit Terminal H2H.

### Core Features at a Glance
- Self-service kiosk booking (select service → barber → time slot → confirm)
- Real-time barber queue with start/complete controls
- Postpaid payment via card terminal (QRIS + card) — pay after service, not during booking
- Tipping at payment screen (presets Rp 10k/20k/50k + custom)
- Multi-branch admin dashboard with live queues, revenue reports, barber management
- Kiosk-based attendance for barbers (clock-in/out via BarberPanel PIN — no GPS)
- Inventory tracking (beverages, products, service consumables)
- Expense logging per branch
- Speaker announcements via Web Speech API (Phase 1) and Web Push (Phase 2)

---

## 02 — User Roles & Personas

Three roles. No front desk.

### Customer (Walk-in Guest)
- No login required — interacts via kiosk only
- Browses services & prices, picks barber & time slot
- Optional: selects beverages/products during time selection
- Optional: enters name (required) and WhatsApp (optional) at confirmation
- Receives reservasi number, sits and waits
- Pays at kiosk counter after service (QRIS or card — cashless only)

### Barber (Staff Member)
- Accesses barber functions via kiosk — no separate mobile app (Meeting 2)
- Logs in with 4–6 digit PIN via Topbar logo tap → "Barber" option
- Clock in / clock out (absencing)
- Start lunch break (15 / 30 / 45 min) — lunch blocks time slots
- Start service / Finish service → triggers payment
- Can add beverages and extra services before payment
- Sees own queue within kiosk barber panel

### Owner / Admin (Owner, Manager & Accountant)
- Full login with email + password credentials
- Sees all branches simultaneously
- Inputs and reviews expenses
- Manages service catalogue and pricing
- Manages barber accounts and commission rates
- Views and exports all reports
- Manages inventory centrally
- Receives low stock and attendance alerts
- Multiple staff can share this role

---

## 03 — Feature Specifications

Priority levels: **P1 Must Have** | **P2 Should Have** | **P3 Nice to Have**

### A. Self-Service Kiosk

| Feature | Priority | Description |
|---|---|---|
| Service Selection | P1 | Browse and select one or more services (Haircut, Beard, Treatment, Hair Color, Packages). Shows price, duration, description, image. Category pills filter the grid. |
| Hair Bleach Configurator | P1 | Step-based bleach modal triggered when Hair Bleach is selected. 3 intensity tiers (1 step Rp 260k / 2 steps Rp 415k / 3 steps Rp 525k) each with optional +Color add-on. Visual gradient slider shows expected lift result. Step and color_added are stored on the booking_service row. |
| Barber Selection | P1 | Pick preferred barber or "Any Available" (first card, dice icon). Shows name, specialty, rating, cut count, next available time. "Any Available" assignment happens at confirm time — barber name is not shown to customer during selection. Assignment uses fairness rotation logic (see Section 04 — Any Available Assignment). |
| Time Slot Booking | P1 | Live slots based on barber availability, service duration, existing queue. "Now" and "Next Available" appear as first two slot cards; remaining slots fill the grid. Blocks in real time. |
| Payment at Kiosk — Postpaid | P1 | Customer pays **after service** at the kiosk counter. Kiosk switches to payment mode when barber marks job complete. Supports QRIS and card via Xendit Terminal H2H (REST API from Rumahweb backend). |
| Payment Failure & Retry UX | P1 | If Xendit Terminal declines or times out: kiosk shows a full-screen error state with three options — **Retry** (re-triggers the same terminal session), **Try other method** (switches between QRIS and card), and **Contact staff** (displays a prominent CTA to call for help — triggers an SSE alert to admin). Staff can then use the Manual Trigger Payment button in BranchDetail or AdminPanel to re-initiate from the admin side. Booking remains in `pending_payment` status throughout — never auto-cancelled due to payment failure. |
| Booking Confirmation & Queue Number | P1 | Unique booking number shown on screen. Optionally printed or sent via WhatsApp. Kiosk announces barber name via Web Speech API. |
| Dual-Mode Kiosk Screen | P1 | Two modes: Booking Mode (next walk-in) and Payment Mode (triggered by barber completing job). Must coexist — payment overlay or split screen. |
| Post-Service Rating + Feedback Tags | P1 | 1–5 star rating shown immediately after payment (in the same PaymentTakeover flow). Contextual tag chips appear based on star rating — tags are admin-configurable from **Kiosk Config** (not hardcoded). Tags have a `context` field: `good` (4–5 stars), `bad` (1–2 stars), `neutral` (3 stars). Default tags seeded on first deploy. 5-minute timeout + skip. Rating and selected tags stored per booking. |
| Optional Name & Phone Capture | P2 | Name required, WhatsApp optional. Phone field has international country code picker (pinned: ID, AU, RU, IN + full list). Phone stored in E.164 format. If phone entered, kiosk looks up loyalty points balance. |
| Group Booking | P2 | Multiple customers can be linked into a single payment session at PaymentTakeover. StaffPanel shows grouped bookings with per-person breakdown and combined total. Group formed at payment time (not at booking time). |
| Live Wait Time Display | P2 | Estimated wait per barber, updates in real time. |
| Notify Barber — Escalation | P1 | After queue number shown, kiosk plays Web Speech announcement calling the barber. Re-announces automatically after 2 minutes if barber has not tapped Start. Escalation cancelled on `booking_started` SSE event. |

### B. Barber Queue App

| Feature | Priority | Description |
|---|---|---|
| Personal Queue View | P1 | Barber sees only their own bookings — upcoming, current, completed. Real-time updates. |
| Start / Complete Job | P1 | "Start" clocks the session. "Complete" triggers kiosk payment screen for that booking. |
| Add Services Mid-Cut | P1 | Barber adds extra services to an open order. Total updates immediately on payment screen. |
| Phased Notifications | P1 | Phase 1: Web Speech API speaker announcement. Phase 2: Web Push via PWA. No Fonnte, no Zenziva, no per-message cost. |
| Acknowledge New Booking | P1 | Prominent "Acknowledge" button on new booking alert. Tapping stops the escalation timer. |
| Late Start & Long Wait Tracking | P1 | System tracks time from booking to "Start". If threshold exceeded (e.g. 10 min), admin receives alert. All delay incidents logged per barber per branch. |
| Client Not Arrived Alert | P1 | Barber taps "⚠ Belum Datang" (Client Not Arrived) — sends WA message to the branch `backoffice_alert_phone` number and emits SSE `client_not_arrived` event which displays an alert badge in Live Queue Management. Barber does NOT mark no-show — admin resolves from LiveMonitor (cancel, no-show, reorder). Only the topmost confirmed booking has an active Start button to prevent accidental wrong-client starts. |
| Schedule Overview | P2 | Full day at a glance — total bookings, estimated finish time. |

### C. Admin Dashboard

| Feature | Priority | Description |
|---|---|---|
| Multi-Branch Overview | P1 | Single screen: all branches live — queue status, today's revenue, active barbers. "In Chair" stat links to Live Monitor. |
| Live Queue Management (LiveMonitor) | P1 | Primary operations screen — replaces read-only monitor concept. Real-time view of every barber's queue across all branches via SSE. **Admin actions per booking:** Start (force-start any confirmed booking, same effect as barber tapping Mulai), Cancel (with required reason field), No-show. Alert badges appear when a barber taps "Belum Datang" (client not arrived) — admin resolves from here. Also logs pax-out events (CCTV manual + kiosk auto-events). All queue interventions are admin-only — barbers have no cancel or no-show access. Accessible to all admin roles; monitoring role sees only this + Overview. |
| Revenue & Sales Reports | P1 | Three-tab report page. **Revenue tab:** daily/weekly/monthly breakdowns per branch, filter by barber/service/payment method, export CSV/Excel. Barber performance rows clickable → individual transaction log. **Demand tab:** pax-out analytics — how many customers walked in vs completed booking, drop-off by step, trend over time. Sourced from `pax_out_events`. **Delay tab:** all late-start incidents per barber per branch — scheduled time, actual start, delay minutes, reason code. Sourced from `delay_incidents`. Consistent filter UX across all three tabs. |
| Branch Management | P1 | Create, edit, deactivate branches. Each branch has a 3-tab modal: **Details** (name, address, city, timezone), **Operations** (late threshold, speaker, tip presets, escalation config, online booking toggle), **Kiosk Devices** (registered kiosk tokens — device name, last seen, revoke). Branch page also manages **chairs**: add/remove chairs, assign permanent barbers, create/edit/remove chair overrides (temporary replacements with date range + reason). Chair overrides display as active/upcoming/expired with a clear canonical list. |
| Barber Management | P1 | Add, edit, deactivate barbers. Assign to branches. Inline service-capability expansion per barber (toggle which services they can perform). View performance stats. |
| Service Catalogue Management | P1 | Create, update, deactivate services. Per-branch price + availability overrides. Per-barber service capability managed on Barbers page. Consumables mapping per service. |
| Customer Data & History | P1 | View customers who provided contact info. See visit history, preferred barber, total spend. Loyalty points balance with expiry warning/expired badges. |
| Notification & Operations Settings | P1 | Per branch (in Branches page → Operations tab): late start threshold, speaker on/off, tip presets, online booking toggle, Web Push settings. |
| User Management | P1 | Owner-only. Create, edit, deactivate admin accounts (owner/manager/accountant). Configure per-section permissions per user. All users get full access by default; owner toggles off specific sections. Owner accounts are immutable. Lives in Settings → Users tab. |
| Audit Log | P1 | Full global activity history — who changed what, when, with before/after diff. Owner-only. Lives in Settings → Audit Log tab. |
| Kiosk UI Configuration | P2 | Per branch (or global): configure upsell popup copy, upsell rules, package badge text, service display order, welcome screen copy, CTA labels (bilingual), and colour/logo overrides. Also manages **feedback tags** — admin can create, edit, reorder, and deactivate the tag chips shown on the post-payment review screen (context: good / bad / neutral). Changes propagate to kiosk on next load or via SSE push. |
| Attendance + Payroll (unified page) | P1 | Two-tab page replacing the schedule screen. **Attendance tab:** monthly table per barber — present days, off count (excused/inexcused/doctor note flagged), late minutes, branch per day for rotation. Barber rows clickable for day-by-day detail. Admin logs off records manually. **Payroll tab:** same monthly data + calculated deductions (late per-minute, inexcused off flat, over-quota excused off flat). All deduction amounts editable per row for per-case leniency. Fixed monthly salary + commission. No kasbon. No manual adjustment categories (accountant handles in Excel). Export CSV. All-branch selector. |
| Barber Commission Tracking | P1 | Commission configured per-branch per service in branch_services. Falls back to barbers.commission_rate. Auto-calculated at payroll generation time. |
| Online Booking Link | P3 | Shareable URL or WhatsApp flow mirroring kiosk experience. Deferred to Phase 2. |

### D. Tipping

| Feature | Priority | Description |
|---|---|---|
| Tip Prompt at Payment Screen | P1 | After barber taps Complete, kiosk shows tip options before payment. Presets: Rp 10k, 20k, 50k + custom + "No tip" skip. Tip added to total and processed in same transaction. |
| Barber Welcomes & Sees Out Customer | P1 | UI nudge on barber app to greet and walk customer to kiosk. |
| Tip Reporting | P2 | Tips tracked separately from service revenue. Pooled per branch per day/week/month. |

### E. Expense Management

| Feature | Priority | Description |
|---|---|---|
| Expense Logging | P1 | Any admin/owner logs an expense. Fields: amount (IDR), category (configurable), source (petty cash / owner), branch (any branch or Head Office), description, date, receipt (mandatory). No approval step — logged immediately. |
| Stock Receipt via Expense | P1 | Checkbox on expense form: "This expense received stock." When checked, inline fields appear to log received inventory items + quantities. Backend creates inventory_movements (type=in) automatically. No stock receipt without an associated expense. |
| Receipt Photo Upload | P1 | Mandatory — no exceptions. File upload on admin desktop. |
| Expense vs Revenue Summary | P2 | Net revenue (service revenue minus expenses) per branch — lightweight P&L per location. |

### F. Attendance Tracking

| Feature | Priority | Description |
|---|---|---|
| Kiosk Clock-In / Clock-Out | P1 | Barber clocks in and out via the kiosk BarberPanel (PIN login). Physical kiosk presence confirms location — no GPS or geofencing needed. Every movement timestamped per barber per branch. Admin can view full history. |
| Late & Absence Alerts | P2 | If barber hasn't clocked in within 15 min of shift start, admin notified. |

### G. Inventory Tracking

| Feature | Priority | Description |
|---|---|---|
| Three-Category Stock Management | P1 | **Beverages** (drinks offered to customers), **Products** (retail/resale items like pomade), **Service Consumables** (foil, blades, wax strips — auto-deducted when booking_service completes). |
| Stock Receipt via Expense | P1 | Stock-in is logged through the Expenses screen. Expense form has "This expense received stock" checkbox → inline item + quantity fields. Inventory page is monitoring only (no receive action). |
| Inventory Distribution (HQ → Branch) | P1 | Head Office distributes stock to branches via the Inventory page → Distribute tab. Admin selects item, source branch (Head Office), destination branch, quantity, and an optional note. Backend creates two `inventory_movements` rows (out from HQ, in at destination). Service consumable deductions are logged automatically when a `booking_service` row transitions to `completed`. |
| Low Stock Alerts | P2 | When stock falls below reorder threshold, admin notified. |
| Cross-Branch Inventory Report | P2 | All branch stock levels in one screen, filterable by category. |

---

## 04 — User Flows

### Flow 1 — Customer Walk-In Booking (4 Steps — Meeting 2)
1. **Pilih Layanan / Select Services** — 1 or more items; upsell modal suggests packages based on cart
2. **Pilih Barber / Pick Barber** — Or "Any Available"
3. **Pilih Waktu / Choose Slot** — "Now" or "Next Available" as primary options; after slot picked → optional beverages + products (3 each shown); cancellation notice shown (15 min auto-cancel)
4. **Konfirmasi / Confirm** — Name (required) + WhatsApp (optional) + WA consent checkbox; TOTAL (not estimated); floor plan with assigned chair; confirm → Reservasi number shown

> Terminology: "Reservasi" replaces "booking" in all customer-facing UI.

> No payment at this stage. Customer pays at the counter on the way out after the barber marks the job complete.

### Any Available — Barber Assignment Logic

When a customer selects "Any Available" on the Barber Selection screen, no barber is shown to them. The backend assigns a barber at confirm time using the following fairness rotation:

**Algorithm:**
1. Query all barbers at the branch who are available at the requested slot (not busy, not on break, capable of all selected services)
2. Among available barbers, pick the one with the **fewest any-available assignments today** — i.e. `COUNT(bookings WHERE source='any_available' AND date=today AND barber_id=X)`
3. Tiebreak: if two or more barbers have equal any-available count, pick by `barbers.sort_order ASC`

**Why this is fair:**
- Direct bookings are excluded from the count — popular barbers are not penalised for earning their own customers
- Only any-available distribution is equalised across the team
- If a barber was skipped earlier (busy at a slot), their count stays low so they get priority on the next any-available request automatically — no manual pointer management needed
- Resets at midnight per branch

**Schema:** No new column needed. `bookings.source ENUM('walk_in', 'any_available', 'online')` tracks the booking origin. Backend derives count at query time.

**Booking source field:** `bookings.source` must be set to `any_available` when this path is used, and `walk_in` when a specific barber was chosen at the kiosk.

### Flow 2 — Barber Serves a Customer (Kiosk-based — Meeting 2)
1. **Taps Logo → Barber → PIN** — Accesses barber panel within kiosk
2. **Clock In / Start Break / End Break** — Controls absencing and lunch blocks
3. **Calls Customer** — By name (announced via Web Speech API)
4. **Taps "Mulai" (Start)** — Clock starts; barber assigned to chair
5. **Adds Services/Beverages** — If upsell mid-cut
6. **Taps "Selesai" (Complete)** — Order finalised
7. **Kiosk Triggers Payment** — Customer pays at counter

### Flow 3 — Admin Reviews Daily Performance
1. **Login** — Email + password
2. **Branch Overview** — All branches live
3. **Select Branch** — Drill down
4. **View Reports** — Revenue & staff
5. **Export / Share** — CSV or PDF

### Flow 4 — Customer Pays After Service
1. **Barber Taps Complete** — Order locked
2. **Kiosk Shows Total** — "Order #B042 — Rp 165.000"
3. **Customer Chooses** — QRIS or Card
4. **QRIS: Scan & Pay** — Auto-confirmed
5. **Card: Tap Xendit Terminal** — Auto-confirmed via webhook
6. **Booking Closed** — Receipt optional

> **Payment model — decided: Postpaid, cashless only.** Cash not accepted.
> **Payment provider: Xendit Terminal H2H.** Rumahweb backend calls `POST /v1/terminal/sessions` via Xendit cloud REST API. Terminal displays payment prompt, customer taps card, Xendit sends webhook confirmation back to backend. Internet required for payments (accepted by Bercut). BRI is the live Indonesia acquirer; no BRI merchant account needed — settles to Xendit Balance T+1.

---

## 05 — UI / Screen Structure

### Kiosk App — Customer Facing (Windows Touchscreen, Landscape)

| Screen | Layout |
|---|---|
| Welcome / Idle | Full screen — Bercut logo, live clock, "Mulai Booking / Start Booking" CTA, scrolling ticker |
| Service Selection | Step 1 of 4 — category pills, service card grid, sidebar cart |
| Barber Selection | Step 2 of 4 — barber cards grid + "Any barber" option |
| Time Slot | Step 3 of 4 — slot grid, selection confirmation card |
| Confirm + Queue Number | Step 4 + 5 — order summary, optional name/phone, then full-screen booking number display |
| Payment Takeover | Full-screen dark overlay — order summary, tip selection, payment method, success screen |
| Staff Panel | Slide-in from right — triple-tap top-right corner to open, lists active bookings for payment processing |

### Barber App — Staff Facing (Phone, Portrait)

| Screen | Notes |
|---|---|
| My Queue — Today | Live queue: SEKARANG (now), BERIKUTNYA (next), HARI INI (today's list) |
| Active Job Detail | In-progress card with elapsed timer, add services, complete button |
| Clock-In | PIN-based clock-in via BarberPanel — no GPS or geofence |

### Admin Dashboard — Owner Facing (Desktop / Tablet, Wide)

| Screen | Notes |
|---|---|
| All Branches Overview | Live status per branch — revenue, active barbers, queue counts, alerts. "In Chair" stat is clickable → opens LiveMonitor. |
| Live Monitor | All branches live — every barber's current customer, services, next booking, elapsed/estimated time. Updates in real time via SSE. Accessible to all roles; primary screen for monitoring role. |
| Revenue Report | Daily/weekly/monthly, filter by branch/barber/service, export CSV. Barber Performance section: barber rows clickable → individual transaction log with date-range filter + CSV export. |
| Service Management | Catalogue editor with per-branch price + availability config. Per-barber service capability managed on Barbers page. |
| Barber Management | Profiles, commission rates, service capability (Services tab per barber). |
| Expenses | Logging form with source (petty cash / owner), all-branch + Head Office selector, mandatory receipt upload, optional inline stock receipt. P&L summary per branch. |
| Inventory | Three tabs: **Stock** (monitoring — levels, movement history, low stock alerts), **Distribute** (Head Office → branch transfer: select item, source, destination, quantity), and **Kiosk Menu** (per-branch price + `kiosk_visible` toggle for beverage and product items shown on the kiosk TimeSlot add-on step — not applicable to service consumables). Receiving stock is still done via Expenses with "received stock" checkbox. Kiosk Menu read/write via `GET/PUT /api/inventory/menu?branch_id=`. |
| Attendance | Separate page. Monthly calendar view per barber — present days, off days (excused/inexcused/doctor note), late minutes, branch per day. Log Off button. Shortcut to Payroll page. |
| Payroll | Separate page. Period picker (16th→15th, named by start month). All-branch selector (no filter = all branches). Period status lifecycle: draft → reviewed → communicated. Barber table with: base salary, commission (regular + OT breakdown), late deduction (auto-recalc from minutes), excused off (flat days + prorata days split), inexcused off (same split), kasbon column (auto-imported from Expenses), additions, other deductions, net pay. Working days chip (computed as period_days × 6/7, admin-editable for holidays). OT commission config in Settings > Payroll tab. CSV + xlsx export. |
| Settings | Global system config — 6 tabs: Catalog (expense categories + inventory master list governance), Loyalty (points earn rate, redemption rules, expiry config), Payroll (global deduction rates: late/min, inexcused off flat, over-quota excused off flat, off quota/month, OT commission config), WhatsApp (provider, API key, message templates), Users (owner-only: admin accounts + permission toggles per section + monitoring role), Audit Log (owner-only: full global activity history). Note: branch-specific operational settings (late threshold, speaker, tip presets, online booking toggle) live in the Branches page → Operations tab — not here. |
| Kiosk Configuration | Per-branch kiosk UI settings — welcome copy, upsell on/off, popup labels, service display order, tip presets, **feedback tags** (create/edit/reorder/deactivate tag chips for post-payment review screen). Changes pushed live via SSE or applied on next kiosk load. |

---

## 05B — UI Design System

### Brand Context
Bercut positions itself as "No.1 Barber in The Island of Paradise" with 6 branches across Bali and 53K Instagram followers. Confirmed theme: **White & Yellow**. Clean white surfaces, dark topbar as brand frame, Bercut signature yellow used exclusively for CTAs and selected states.

### Colour Palette

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FAFAF8` | Warm off-white page background |
| `surface` | `#F2F0EB` | Input fields, secondary surfaces |
| `surface2` | `#ECEAE4` | Disabled states, tertiary surfaces |
| `accent` | `#F5E200` | **Bercut yellow — CTA buttons and selected card states ONLY** |
| `accentText` | `#111110` | Text ON yellow backgrounds |
| `text` | `#111110` | Primary text — all headings, prices, labels |
| `text2` | `#3A3A38` | Secondary text |
| `muted` | `#88887E` | Placeholder, helper copy, bilingual subtitles |
| `border` | `#DDDBD4` | Card borders, dividers |
| `topBg` | `#111110` | Topbar, primary dark buttons |
| `topText` | `#F5E200` | Text in topbar (yellow on black) |
| `white` | `#FFFFFF` | Card surfaces |
| `danger` | `#C0272D` | Destructive actions only |

### Colour Rules — Critical

1. **Yellow (`#F5E200`) is NEVER used as text on white/light backgrounds.** Contrast fails. Yellow only appears as a filled background (button, selected card) with dark text on top.
2. **Yellow on dark (`#111110`) = always valid.** Used in topbar logo and topText.
3. **Dark text on yellow = always valid.** `#111110` on `#F5E200` — primary interactive state.
4. **Selected card text must flip.** When a card goes from unselected (white bg) to selected (yellow bg), ALL text inside must become `#111110`. Muted grey on yellow fails contrast.

### Typography

| Use | Font | Size | Weight |
|---|---|---|---|
| Screen titles (kiosk) | Inter | `clamp(26px, 3.5vw, 38px)` | 800 |
| Service / barber names | Inter | `clamp(13px, 1.6vw, 15px)` | 700 |
| Prices | Inter | `clamp(15px, 2vw, 20px)` | 700–800 |
| Queue number hero | Inter | `clamp(32px, 6vw, 58px)` | 800 |
| Primary CTA buttons | DM Sans | `clamp(15px, 1.8vw, 18px)` | 700 |
| Body / descriptions | DM Sans | `clamp(12px, 1.4vw, 14px)` | 400 |
| Labels / eyebrows | DM Sans | `clamp(10px, 1.2vw, 12px)` | 700 — uppercase, letterSpacing 0.12–0.18em |

Both fonts loaded via Google Fonts.

### Kiosk UX Principles

- **Minimum 72px tap targets.** All tappable elements (service cards, barber cards, slots, CTAs) must be at least 72px tall.
- **Yellow = action only, never decorative.** Reserved for primary CTA buttons, selected card states, and queue number hero. Nothing else is yellow.
- **Barber photos prominent.** Large, full-colour, consistent circle crop. Makes the experience personal.
- **Bilingual — Bahasa Indonesia (primary) + English (subtitle below each label).** Covers local and tourist footfall.
- **Max 4 steps to booking confirmed.** Service → Barber → Time → Confirm. No forced account creation.
- **Booking number is the hero.** Shown at 128px Barlow Condensed 900. Yellow accent bar below.

### App-by-App Design Direction

- **Kiosk:** White background, dark topbar, Barlow Condensed headings, real barber photos, bilingual labels, yellow CTAs. Windows touchscreen landscape.
- **Barber App:** Same white & yellow theme. Mobile-first, portrait, thumb-friendly. Bahasa Indonesia only. Acknowledge and Start/Complete buttons are large yellow — impossible to miss mid-cut.
- **Admin Dashboard:** White surface, same colour tokens. Data-dense, desktop-optimised. Yellow for key metrics, alerts, primary actions. English-primary.

---

## 06 — Database Design

Designed for PostgreSQL. All entities scoped to `branch_id` where applicable.

### branches
One row per physical location.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| name | VARCHAR(100) | | e.g. "Bercut Seminyak" |
| address | TEXT | | |
| city | VARCHAR(80) | | e.g. "Seminyak", "Kuta" |
| timezone | VARCHAR(50) | | e.g. "Asia/Makassar" (WITA) |
| tip_distribution_method | ENUM | | `individual` \| `equal_split` \| `proportional` — default `individual` |
| pay_period_type | VARCHAR(10) | | Default `monthly`. Future: `weekly`, `biweekly`. |
| is_active | BOOLEAN | | Soft-disable without deleting |
| is_head_office | BOOLEAN | | DEFAULT false. One special row marks "Head Office" — selectable as branch in expenses but not a physical location. |
| created_at | TIMESTAMPTZ | | |

### users
Admin/owner/accountant accounts — NOT barbers.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| email | VARCHAR(200) | UNIQUE | |
| password_hash | TEXT | | |
| name | VARCHAR(100) | | |
| role | ENUM | | `owner` \| `manager` \| `accountant` \| `monitoring` — role is a label/template only except `monitoring` which has hard restricted access (Overview + LiveMonitor only) |
| is_active | BOOLEAN | | |
| last_login_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | | |

**Role rules:**
- `owner` — immutable full access. Permission config is ignored entirely for owner accounts. No one can restrict an owner.
- `manager` / `accountant` — full access by default on creation. Owner can toggle individual section permissions off via `user_permissions`.
- `monitoring` — hard-restricted role. Can only see Overview and LiveMonitor. Permissions matrix is ignored. Cannot be granted additional access.
- User management (create/edit/deactivate accounts) is owner-only — not subject to the permissions matrix.

### user_permissions
One row per non-owner user per section. Only rows that differ from default (full access) need to exist — absence of a row means access is granted.

| Column | Type | Key | Description |
|---|---|---|---|
| user_id | UUID | FK → users | |
| section | VARCHAR(50) | | Section key: `reports` \| `barbers` \| `services` \| `customers` \| `expenses` \| `inventory` \| `payroll` \| `online_booking` \| `kiosk_config` \| `branches` \| `settings` \| `live_monitor` |
| is_enabled | BOOLEAN | | DEFAULT TRUE. Set FALSE to revoke access. |

> `overview` is always visible to all users — no permission row needed.

### audit_log
Immutable record of every meaningful admin action. Written by the backend on any create/update/delete operation.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users | Who performed the action |
| action | VARCHAR(100) | | e.g. `barber.updated`, `service.created`, `payroll.status_changed` |
| entity_type | VARCHAR(50) | | e.g. `barber`, `service`, `branch`, `payroll_period` |
| entity_id | UUID | | The affected row's ID |
| diff | JSONB | | `{ before: {...}, after: {...} }` — null for create actions |
| branch_id | UUID | FK → branches (nullable) | Branch context — null for global actions (e.g. user management) |
| created_at | TIMESTAMPTZ | | |

### barbers

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches (nullable) | Home branch. NULL for freelancers (pay_type = daily_rate) who have no fixed branch. |
| name | VARCHAR(100) | | Display name on kiosk and queue |
| specialty | VARCHAR(100) | | English descriptor |
| specialty_id | VARCHAR(100) | | Indonesian descriptor |
| phone | VARCHAR(20) | | WhatsApp number |
| pin_hash | TEXT | | Hashed 4–6 digit PIN |
| commission_rate | DECIMAL(5,2) | | Fallback rate only — used when a service has no commission_rate set. Production: server uses services.commission_rate first, then falls back to this. |
| base_salary | INTEGER | | Monthly base salary in IDR. 0 for commission_only barbers. |
| pay_type | ENUM | | `salary_plus_commission` \| `commission_only` \| `daily_rate` |
| daily_rate | INTEGER | | Flat IDR per working day. Only used when pay_type = daily_rate. |
| avatar_url | TEXT | | Photo URL for kiosk |
| is_active | BOOLEAN | | Deactivate without deleting history |
| created_at | TIMESTAMPTZ | | |

### services
Global catalogue — price can be overridden per branch.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| name | VARCHAR(100) | | e.g. "Fade & Style" |
| name_id | VARCHAR(100) | | Indonesian name |
| category | ENUM | | haircut \| beard \| treatment \| hair_color \| package |
| base_price | INTEGER | | Default price in IDR |
| duration_minutes | SMALLINT | | For slot blocking |
| badge | VARCHAR(50) | | Optional badge text |
| description | TEXT | | Short description for kiosk |
| is_active | BOOLEAN | | |
| sort_order | SMALLINT | | Display order on kiosk |
| image_url | TEXT | | Photo for service card background and package treatment strips |
| mutex_group | VARCHAR(50) | | Nullable. Services sharing a group are mutually exclusive (e.g. `ear_treatment`, `beard_service`) |

### branch_services
Per-branch service configuration. Absence of a row means the service is available at base price. A row is only needed when availability is false OR there is a price override.

| Column | Type | Key | Description |
|---|---|---|---|
| service_id | UUID | FK → services | PK (composite) |
| branch_id | UUID | FK → branches | PK (composite) |
| is_available | BOOLEAN | | DEFAULT true. false = service hidden from kiosk at this branch. |
| price | INTEGER | | Override price in IDR. NULL = use services.base_price. |
| commission_rate | DECIMAL(5,2) | | Override commission % for this service at this branch. NULL = use services.commission_rate, then barbers.commission_rate. |

### barber_services
Tracks which services each barber is capable of performing. Global per barber (not per branch). Branch availability (`branch_services`) is a separate concern — kiosk filters on both.

| Column | Type | Key | Description |
|---|---|---|---|
| barber_id | UUID | FK → barbers | PK (composite) |
| service_id | UUID | FK → services | PK (composite) |
| is_enabled | BOOLEAN | | DEFAULT true. false = barber cannot perform this service; hidden from kiosk barber selection when that service is in cart. |

> **Kiosk filter logic:** A barber appears on the selection screen only if `barber_services.is_enabled = true` (or no row exists, defaulting true) AND `branch_services.is_available = true` (or no row exists, defaulting true) for every service in the customer's cart.

### service_consumables
Links a service to the consumable inventory items it uses. Backend deducts stock when a booking_service row transitions to `completed`.

| Column | Type | Key | Description |
|---|---|---|---|
| service_id | UUID | FK → services | PK (composite) |
| item_id | UUID | FK → inventory_items | PK (composite) — must be category = `service_consumable` |
| qty_per_use | DECIMAL(8,3) | | Qty to deduct per service booking (e.g. 0.5 for half a box, 2 for 2 blades) |

### off_records
Tracks individual off days per barber. Replaces fixed schedule concept. Admin logs these manually. Doctor's note flag suppresses all deductions for that off.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| barber_id | UUID | FK → barbers | |
| branch_id | UUID | FK → branches | Branch context for the off day |
| date | DATE | | The specific off day |
| type | ENUM | | `excused` \| `inexcused` |
| has_doctor_note | BOOLEAN | | DEFAULT false. If true, no deduction is applied regardless of quota status. Can be flagged at time of logging or retroactively. |
| note | TEXT | | Optional admin note |
| logged_by | UUID | FK → users | |
| created_at | TIMESTAMPTZ | | |

> **Off-day quota rule (from payroll_settings.off_quota_per_month):** By default 4 excused offs per month. Excused offs within quota = no deduction. Excused offs over quota = flat deduction (unless has_doctor_note = true). Inexcused offs always deduct. All calculated deductions are editable per row in the payroll table.

### customers
Optional — only created when customer provides contact info at kiosk.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| name | VARCHAR(100) | | |
| phone | VARCHAR(25) | UNIQUE | WhatsApp number in E.164 format (e.g. "+62812345678") — unique identifier |
| phone_country_code | VARCHAR(5) | | Dial code selected at kiosk (e.g. "+62"). Stored separately for display. |
| total_visits | INTEGER | | Denormalised counter |
| total_spend | INTEGER | | Running total in IDR |
| points_balance | INTEGER | | DEFAULT 0. Current redeemable points. |
| preferred_barber_id | UUID | FK → barbers | Most frequently booked barber |
| first_visit | DATE | | |
| last_visit | DATE | | |
| points_last_expired_at | TIMESTAMPTZ | nullable | Timestamp of last points expiry event. Used to show warning/expired badge in Customers admin view. |

### bookings
Core transactional table. Order opens at booking, closes at payment after service.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| booking_number | VARCHAR(10) | | Human-readable e.g. "B042" |
| branch_id | UUID | FK → branches | |
| barber_id | UUID | FK → barbers | |
| customer_id | UUID | FK → customers (nullable) | NULL if walk-in with no contact info |
| guest_name | VARCHAR(100) | | Name entered at kiosk |
| guest_phone | VARCHAR(25) | | Phone entered at kiosk (E.164, matches customers.phone) |
| scheduled_at | TIMESTAMPTZ | | Selected time slot start |
| started_at | TIMESTAMPTZ | | When barber tapped "Start" |
| completed_at | TIMESTAMPTZ | | When barber tapped "Complete" |
| paid_at | TIMESTAMPTZ | | |
| acknowledged_at | TIMESTAMPTZ | | When barber acknowledged the booking |
| status | ENUM | | `confirmed` → `in_progress` → `pending_payment` → `completed` \| `no_show` \| `cancelled` |
| payment_status | ENUM | | `unpaid` \| `paid` \| `refunded` |
| payment_method | ENUM | | `qris` \| `card` \| null |
| payment_ref | VARCHAR(100) | | Xendit transaction reference (from webhook payload) |
| notes | TEXT | | |
| rating | SMALLINT | | 1–5 star rating |
| created_at | TIMESTAMPTZ | | When booking was made at kiosk |

### booking_services
Junction table — one row per service in a booking.

| Column | Type | Key | Description |
|---|---|---|---|
| booking_id | UUID | FK → bookings | |
| service_id | UUID | FK → services | |
| price_charged | INTEGER | | Actual price at time of booking |
| added_mid_cut | BOOLEAN | | True if added after booking was started |
| paid_with_points | BOOLEAN | | DEFAULT FALSE. True if customer redeemed points for this service at Confirm. |
| bleach_step | SMALLINT | | Nullable. 1, 2, or 3 — only set for Hair Bleach service rows. |
| bleach_with_color | BOOLEAN | | Nullable. True if customer added color on top of bleach step. |

### barber_schedules *(see above)*

### tips
Individual per barber, tracked separately from service revenue. Each tip is linked to the barber who served that customer so payroll can auto-sum per barber.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| booking_id | UUID | FK → bookings (UNIQUE) | |
| barber_id | UUID | FK → barbers | Denormalised from booking for fast payroll queries |
| branch_id | UUID | FK → branches | |
| amount | INTEGER | | IDR |
| payment_method | VARCHAR(10) | | |
| created_at | TIMESTAMPTZ | | |

### expense_categories
Admin-configurable category labels for expense logging (replaces the hardcoded VARCHAR category on the expenses table).

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| key | VARCHAR(50) | UNIQUE | Slug used in code (e.g. `petty_cash`) |
| label | VARCHAR(100) | | Display name shown in UI |
| color | VARCHAR(7) | | Hex text colour for badge |
| bg | VARCHAR(7) | | Hex background colour for badge |
| is_active | BOOLEAN | | Default true — inactive categories hidden from new expense form |
| sort_order | SMALLINT | | Display order |

Pre-seeded: `petty_cash`, `supplies`, `utilities`, `equipment`, `other`

### expenses

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches (nullable) | Single branch for regular expenses. NULL for multi-branch inventory expenses (PO payments and full-payment multi-branch stock). Can reference Head Office row (branches.is_head_office = true). |
| submitted_by | UUID | FK → users | |
| type | ENUM | | `regular` \| `inventory` \| `kasbon` |
| category_id | UUID | FK → expense_categories (nullable) | Required for `regular` type; NULL for `inventory` and `kasbon` types |
| source | ENUM | | `petty_cash` \| `owner` — funding origin (where the money came from physically) |
| amount | INTEGER | | IDR |
| description | TEXT | | |
| receipt_url | TEXT | NOT NULL | Receipt upload is mandatory — no exceptions |
| has_stock_receipt | BOOLEAN | | DEFAULT false. True only for `inventory` type — final PO payment or full single-payment purchase. Backend creates `inventory_movements` (type=`in`) for each linked `expense_stock_items` row on save. |
| expense_date | DATE | | |
| barber_id | UUID | FK → barbers (nullable) | Required for `kasbon` type only |
| deduct_period | ENUM | | `current` \| `next` — kasbon type only. Controls whether deduction applies this payroll period or is deferred |
| po_id | VARCHAR(20) | FK → purchase_orders (nullable) | Set for advance and final payments against a PO. NULL for full single payments and regular expenses. |
| po_payment_type | ENUM | | `advance` \| `final` — only set when `po_id` is not null. `advance` = down payment before stock received; `final` = last payment that closes the PO. |
| po_attribution | JSONB | | `[{ branch_id, branch, amount }]` — proportional attribution of this payment's cost per branch. NULL while PO is open (advance sitting unattributed). Populated retroactively on all prior PO payments when the order is closed. Computed via Largest Remainder Method (LRM) on the payment amount × each branch's qty share. |
| created_at | TIMESTAMPTZ | | |

> **Multi-branch attribution logic:** When a PO closes (final payment logged), the backend runs LRM attribution on every payment expense linked to that PO. Each payment gets its own `po_attribution` array reflecting each branch's proportional share of *that payment* (not the total order). This means Feb's advance correctly shows as a Feb cash-out with Mar's distribution applied retroactively — accurate cash basis accounting.

### purchase_orders

Tracks multi-payment inventory orders (advance → final payment lifecycle). One row per order.

| Column | Type | Key | Description |
|---|---|---|---|
| id | VARCHAR(20) | PK | Human-readable slug, e.g. `PO-001`. Auto-generated sequentially per branch. |
| item_id | UUID | FK → inventory_items | The item being ordered |
| item_name | VARCHAR(100) | | Snapshot of item name at creation time |
| unit | VARCHAR(20) | | Snapshot of unit at creation time |
| status | ENUM | | `open` \| `closed` |
| total_order_amount | INTEGER | | Full agreed order value in IDR |
| paid_amount | INTEGER | | Running total of all payments made so far |
| created_date | DATE | | Date first advance payment was logged |
| closed_date | DATE | | NULL while open. Set when final payment is logged. |
| distributions | JSONB | | `[{ branch_id, branch, qty, cost }]` — total stock distribution across all branches for the full order. NULL while open. Populated when PO closes (from the final payment's distribution lines). |
| created_by | UUID | FK → users | |

### expense_stock_items
Links stock received to its expense. Created when `expenses.has_stock_receipt = true`.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| expense_id | UUID | FK → expenses | |
| item_id | UUID | FK → inventory_items | |
| branch_id | UUID | FK → branches | Branch to receive this stock |
| quantity_received | DECIMAL(10,3) | | |
| unit | VARCHAR(20) | | Copied from inventory_items.unit for snapshot |

### attendance
Clock-in/out records per barber per shift. Recorded via the kiosk BarberPanel — no GPS needed since physical kiosk presence confirms location.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| barber_id | UUID | FK → barbers | |
| branch_id | UUID | FK → branches | |
| clock_in_at | TIMESTAMPTZ | | |
| clock_out_at | TIMESTAMPTZ | | NULL while shift is active |

### inventory_items

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| name | VARCHAR(100) | | |
| unit | VARCHAR(20) | | e.g. "pcs", "ml", "box" |
| category | VARCHAR(30) | | `beverage` \| `product` \| `service_consumable` |
| is_active | BOOLEAN | | |

### inventory_stock

| Column | Type | Key | Description |
|---|---|---|---|
| item_id | UUID | FK → inventory_items | PK (composite) |
| branch_id | UUID | FK → branches | PK (composite) |
| current_stock | INTEGER | | |
| reorder_threshold | INTEGER | | Default 5 |
| price | INTEGER | | Selling price in IDR. NULL for service_consumable items (not sold). Set per-branch. |
| kiosk_visible | BOOLEAN | | DEFAULT true. Whether this item appears on the kiosk add-on step at this branch. Only meaningful for beverage/product categories. |
| updated_at | TIMESTAMPTZ | | |

### inventory_movements

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| item_id | UUID | FK → inventory_items | |
| branch_id | UUID | FK → branches | |
| logged_by | UUID | FK → barbers (nullable) | |
| movement_type | VARCHAR(5) | | `in` \| `out` |
| quantity | INTEGER | | |
| note | TEXT | | |
| created_at | TIMESTAMPTZ | | |

### chairs
One row per chair per branch. `barber_id` is the permanent default occupant. Overrides are in `chair_overrides`.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches | |
| label | VARCHAR(10) | | e.g. "A1", "B2" |
| barber_id | UUID | FK → barbers (nullable) | Permanent assigned barber. NULL = unoccupied. |

### chair_overrides
Temporarily (or indefinitely) replaces a chair's permanent barber. Active override takes priority over `chairs.barber_id`.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| chair_id | UUID | FK → chairs | Which chair is being covered |
| barber_id | UUID | FK → barbers | Who is covering — can be any barber or freelancer |
| date_from | DATE | | First day the override is active |
| date_to | DATE | nullable | Last day active. NULL = indefinite (stays until manually removed) |
| reason | TEXT | nullable | Admin note, e.g. "sick leave", "transfer", "fired" |
| created_by | UUID | FK → users | |
| created_at | TIMESTAMPTZ | | |
| resolved_by | UUID | FK → users (nullable) | Admin who manually removed the override. NULL if still active or expired naturally by date_to. |

> **Active barber at a chair on date D:** `COALESCE(override.barber_id, chair.barber_id)` — query `chair_overrides` where `date_from ≤ D AND (date_to IS NULL OR date_to ≥ D)`. Override wins. Original barber resumes automatically when `date_to` passes.
>
> **Kiosk exclusion rule:** If barber X is the `barber_id` in an active `chair_overrides` row at Branch Y, they are excluded from their home branch kiosk on those dates. Cannot be in two places.
>
> **Freelancers:** `barbers.branch_id = NULL`. Assigned to chairs via `chair_overrides` or directly as `chairs.barber_id` at whatever branch they frequent.

### barber_breaks
Tracks lunch breaks. Break blocks corresponding time slots.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| barber_id | UUID | FK → barbers | |
| branch_id | UUID | FK → branches | |
| started_at | TIMESTAMPTZ | | |
| ended_at | TIMESTAMPTZ | | NULL while break is active |
| duration_minutes | SMALLINT | | 15, 30, or 45 |

### booking_extras
Beverages and products added to a booking (by customer at kiosk or by barber mid-service).

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| booking_id | UUID | FK → bookings | |
| item_id | UUID | FK → inventory_items | |
| item_type | VARCHAR(20) | | `beverage` \| `product` |
| price_charged | INTEGER | | IDR price at time of booking |
| quantity | SMALLINT | | Default 1 |
| added_by | VARCHAR(20) | | `customer` \| `barber` |
| created_at | TIMESTAMPTZ | | |

### point_transactions
Immutable log of every points earn and redeem event per customer.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| customer_id | UUID | FK → customers | |
| booking_id | UUID | FK → bookings (nullable) | |
| type | VARCHAR(10) | | `earn` \| `redeem` |
| amount | INTEGER | | Points delta (always positive) |
| balance_after | INTEGER | | Snapshot of points_balance after this transaction |
| created_at | TIMESTAMPTZ | | |

**Points rules:**
- Earn rate: Rp 10,000 = 1 point (rounded up per service)
- Earned on: cash-paid services + beverages + products
- Not earned on: services paid with points
- Points are deducted at `confirmed` status; credited at `completed` status
- Mid-cut barber additions are always cash — never redeemable with points

### booking_groups
Groups multiple individual bookings into one payment session. Formed at payment time (not during booking), when a staff member links bookings together in the StaffPanel or AdminPanel.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches | |
| created_at | TIMESTAMPTZ | | When the group payment was initiated |

> **Group payment rule:** Each booking retains its own `total`, `barber_id`, etc. The `booking_groups` row just links them. PaymentTakeover shows a per-person breakdown and one combined total. Points redemption is not available for group payments — all services are cash. Tips are pooled for the whole group.

### pax_out_events
Logs every session that ended without a booking — customer walked away. Three sources: staff tapping CCTV manual log, kiosk idle timeout, or kiosk back-button. Consumed by LiveMonitor (recent exits) and Reports > Demand tab (aggregate pax-out analytics).

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches | |
| kiosk_id | UUID | FK → kiosk_tokens (nullable) | NULL for cctv_manual entries |
| source | ENUM | | `cctv_manual` \| `kiosk_timeout` \| `kiosk_back` |
| at_step | ENUM (nullable) | | `service_selection` \| `barber_selection` \| `timeslot` \| `confirm` — last screen customer reached before leaving. NULL for cctv_manual. |
| recorded_at | TIMESTAMPTZ | | When the exit was logged |
| created_by | UUID | FK → users (nullable) | Set for cctv_manual entries (the admin who logged it). NULL for automated kiosk events. |

### delay_incidents
Logs every service that started late relative to its scheduled slot. Created automatically when barber taps Start and `started_at > scheduled_at + threshold`. Consumed by Reports > Delay tab.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| booking_id | UUID | FK → bookings | |
| barber_id | UUID | FK → barbers | |
| branch_id | UUID | FK → branches | |
| scheduled_at | TIMESTAMPTZ | | The original scheduled slot start time |
| actual_start_at | TIMESTAMPTZ | | When barber tapped Start |
| delay_minutes | SMALLINT | | `actual_start_at - scheduled_at` in minutes |
| reason_code | VARCHAR(30) (nullable) | | Optional categorisation: `previous_service_overran` \| `barber_late` \| `customer_late` \| `other` |
| notes | TEXT (nullable) | | Free-text admin note |
| created_at | TIMESTAMPTZ | | |

### feedback_tags
Configurable review tags shown on PaymentTakeover ReviewScreen after payment. Tags are context-sensitive — different tags shown based on star rating. Admin can manage via Settings if needed; defaults are seeded.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| label | VARCHAR(100) | | Display text shown on kiosk (e.g. "Amazing cut!") |
| context | ENUM | | `good` (shown on 4–5 stars) \| `bad` (shown on 1–2 stars) \| `neutral` (shown on 3 stars) |
| is_active | BOOLEAN | | DEFAULT true. Inactive tags hidden from kiosk. |
| sort_order | SMALLINT | | Display order within context group |

### payroll_settings
Global (chain-wide) payroll calculation rules. One row, upserted. Configurable in Settings > Payroll tab.

| Column | Type | Key | Description |
|---|---|---|---|
| id | INTEGER | PK DEFAULT 1 | Singleton row |
| off_quota_per_month | SMALLINT | | DEFAULT 4. Excused offs per month before deduction kicks in. |
| late_deduction_per_minute | INTEGER | | IDR deducted per minute late. DEFAULT 2000. |
| late_grace_period_minutes | SMALLINT | | Grace window before late fee kicks in. DEFAULT 5. Arriving ≤ grace = zero fee. Arriving > grace = full late_minutes × rate (grace does NOT reduce the count — it is a binary threshold). |
| inexcused_off_flat_deduction | INTEGER | | Flat IDR deducted per inexcused off day (flat method). DEFAULT 150000. |
| overlimit_excused_off_flat_deduction | INTEGER | | Flat IDR deducted per excused off day over quota (flat method). DEFAULT 150000. |
| ot_commission_enabled | BOOLEAN | | DEFAULT false. Whether overtime commission bonus is active. |
| ot_commission_threshold | TIME | | Time at/after which a booking qualifies for OT bonus. DEFAULT '19:30'. |
| ot_commission_bonus_pct | DECIMAL(4,2) | | Additional commission % on top of barber's standard rate. DEFAULT 10. |
| ot_excluded_service_ids | INTEGER[] | | Service IDs excluded from OT bonus. DEFAULT ARRAY[1] (Just a Haircut). |
| updated_at | TIMESTAMPTZ | | |
| updated_by | UUID | FK → users | |

### payroll_periods
One row per monthly payroll run per branch. Lifecycle: `draft → reviewed → communicated`.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches | |
| period_month | DATE | | First day of the month, e.g. `2026-03-01`. UNIQUE per branch. |
| attendance_from | DATE | | Start of Base Salary & Offs calculation window. Default: 1st of `period_month`. Admin-editable at generate time. |
| attendance_to | DATE | | End of Base Salary & Offs window. Default: last day of `period_month`. |
| commission_from | DATE | | Start of Commission & Late Fees window. Default: 16th of the month prior to `period_month`. |
| commission_to | DATE | | End of Commission & Late Fees window. Default: 15th of `period_month`. |
| tips_from | DATE (nullable) | | Start of Tips window. NULL = TBD / not yet decided. Default when set: same as `attendance_from`. |
| tips_to | DATE (nullable) | | End of Tips window. NULL = TBD. |
| status | ENUM | | `draft` \| `reviewed` \| `communicated` |
| notes | TEXT | | Optional admin notes for this run |
| communicated_by | UUID | FK → users (nullable) | Who marked as communicated |
| communicated_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | | |

> **Unified cycle:** All components (base salary, commission, late fees, tips) use a single 16th→15th window. Period named by start month — "April" = 16 Apr → 15 May, paid out 30 Apr. Kasbon is an exception: assigned by calendar month of entry date regardless of the 16th–15th boundary.

> **Payroll flow:** Admin clicks "Generate Payroll" → a modal shows three independent date range pickers (Base Salary & Offs, Commission & Late Fees, Tips) pre-filled with the period defaults described above. Admin can adjust before confirming. System creates this row (status `draft`) and auto-creates one `payroll_entries` row per active barber. Admin reviews deductions. When numbers have been shared with barbers, owner ticks "Mark as Communicated" — a soft marker only, rows remain fully editable. Audit log captures every change.

### payroll_entries
One row per barber per payroll period. Deductions are auto-calculated from attendance/off data then stored as editable overrides so admin can adjust individual cases (e.g. lenient on a bad month).

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| period_id | UUID | FK → payroll_periods | |
| barber_id | UUID | FK → barbers | |
| base_salary_snapshot | INTEGER | | Copied from `barbers.base_salary` at generation time |
| gross_service_revenue | INTEGER | | Sum of `booking_services.price_charged` for this barber's completed bookings in the period |
| commission_regular | INTEGER | | Base commission portion: Σ(commission_rate × price_charged) for all completed services. |
| commission_ot | INTEGER | | Overtime bonus only: Σ(ot_bonus_pct × price_charged) for qualifying late-hour non-excluded services. DEFAULT 0. |
| commission_earned | INTEGER | | commission_regular + commission_ot. Used as the payroll total. |
| tips_earned | INTEGER | | Sum of `tips.amount` for this barber's individual bookings in the period |
| attendance_days | SMALLINT | | Count of distinct days with a clock-in record in the period |
| late_minutes_total | SMALLINT | | Total minutes late across the period |
| late_minutes_override | SMALLINT | | Nullable. Admin override for late_minutes_total. |
| inexcused_off_count | SMALLINT | | Count of inexcused off days in the period |
| inexcused_off_count_override | SMALLINT | | Nullable. Admin override for inexcused_off_count. |
| inexcused_fixed_days | SMALLINT | | Days charged at flat rate. DEFAULT = inexcused_off_count. |
| inexcused_prorata_days | SMALLINT | | Days charged at pro-rata rate (baseSalary ÷ workingDays). DEFAULT 0. |
| overlimit_excused_off_count | SMALLINT | | Count of excused offs over quota (excluding has_doctor_note = true) in the period |
| excused_off_count_override | SMALLINT | | Nullable. Admin override for overlimit_excused_off_count. |
| excused_fixed_days | SMALLINT | | Days over quota charged at flat rate. DEFAULT = overlimit_excused_off_count. |
| excused_prorata_days | SMALLINT | | Days over quota charged at pro-rata rate. DEFAULT 0. |
| net_pay | INTEGER | | `base_salary + commission_earned + tips_earned − late_ded − inexcused_ded − excused_ded + total_additions − total_deductions`. Recomputed on save. Late ded = late_minutes × rate/min. Inexcused ded = (fixed_days × flat_rate) + (prorata_days × base_salary/working_days). Same for excused. |
| bookings_completed | SMALLINT | | Count of completed bookings in the period |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

> **Effective deduction rule:** `effective_X = override_X ?? calc_X`. If override is set, it replaces the calculated value. Override of 0 is valid (full leniency). Null override = use calculated value.

### Column additions to existing tables

**barbers** — add:
| Column | Type | Description |
|---|---|---|
| status | ENUM | `available \| busy \| on_break \| clocked_out` |
| chair_id | UUID | FK → chairs (nullable) |

**bookings** — add:
| Column | Type | Description |
|---|---|---|
| auto_cancel_at | TIMESTAMPTZ | Set to scheduled_at + branches.auto_cancel_minutes; NULL for "Now" bookings and when auto_cancel_minutes = 0 |
| cancellation_reason | TEXT | Admin-entered reason (stored after cancellation) |
| points_redeemed | INTEGER | DEFAULT 0. Points used at Confirm to cover services. |
| points_earned | INTEGER | DEFAULT 0. Points credited to customer after payment completes. |
| review_tags | TEXT[] | Nullable array of feedback tag strings selected after payment (e.g. ["Amazing cut!", "Will come back"]). Populated together with `rating`. |
| group_id | UUID | Nullable FK → booking_groups. Set when this booking is part of a group payment session. |
| escalation_count | SMALLINT | DEFAULT 0. Number of barber escalation WA messages sent so far. |
| escalation_stopped_at | TIMESTAMPTZ | Set when escalation is halted. NULL while active. |
| escalation_stopped_by | UUID | FK → users (nullable). NULL if stopped automatically (barber started or max reached). Set to admin user ID if stopped manually. |
| escalation_stop_reason | VARCHAR(30) | `barber_started` \| `admin_cancelled` \| `max_reached` \| `no_show`. |
| payment_trigger_source | ENUM (nullable) | `kiosk` \| `admin_manual` \| `staff_panel`. Set when payment is triggered. Useful for audit and dispute resolution. |
| source | ENUM | DEFAULT `walk_in`. `walk_in` = customer chose a specific barber. `any_available` = customer tapped Any Available; barber assigned by fairness rotation at confirm time. `online` = booked via online booking link. |
| client_not_arrived_at | TIMESTAMPTZ | Nullable. Set when barber taps "Belum Datang". Cleared if booking is subsequently started normally. Used to surface alert badges in Live Queue Management. |

**customers** — add:
| Column | Type | Description |
|---|---|---|
| whatsapp_consent | BOOLEAN | DEFAULT FALSE — customer opted in to WA promos/confirmation |

### kiosk_settings
Per-branch kiosk UI configuration. One row per branch (upserted). Global fallback row uses branch_id = NULL.

| Column | Type | Key | Description |
|---|---|---|---|
| branch_id | UUID | FK → branches (nullable, PK) | NULL = global default |
| welcome_heading | VARCHAR(200) | | Welcome screen headline (English) |
| welcome_heading_id | VARCHAR(200) | | Welcome screen headline (Bahasa) |
| welcome_cta | VARCHAR(100) | | Start booking button label (English) |
| welcome_cta_id | VARCHAR(100) | | Start booking button label (Bahasa) |
| upsell_enabled | BOOLEAN | | Whether upsell popup fires at all |
| upsell_popup_heading | VARCHAR(200) | | Popup headline copy (English) |
| upsell_popup_heading_id | VARCHAR(200) | | Popup headline copy (Bahasa) |
| upsell_switch_cta | VARCHAR(100) | | "Switch to package" button label |
| upsell_keep_cta | VARCHAR(100) | | "Keep my selection" button label |
| service_sort_override | JSONB | | Array of service IDs — overrides sort_order on kiosk display |
| tip_presets | JSONB | | Array of tip amounts in IDR. Default: [5000, 10000, 20000, 50000, 100000]. Configurable per branch from Admin. |
| updated_at | TIMESTAMPTZ | | |
| updated_by | UUID | FK → users | Last admin to save settings |

### whatsapp_settings
Global singleton (one row). Stores provider config and message templates. Switching from Fonnte to WhatsApp Business API = change `provider` + credentials, zero code changes to the rest of the system. Templates are provider-agnostic — same copy works for both.

| Column | Type | Key | Description |
|---|---|---|---|
| id | INTEGER | PK DEFAULT 1 | Singleton row |
| is_enabled | BOOLEAN | | DEFAULT false. Master on/off for all WA sends. |
| provider | ENUM | | `fonnte` \| `whatsapp_business_api` — DEFAULT `fonnte` |
| fonnte_api_key | TEXT | | Stored encrypted at rest. Masked in API responses. |
| fonnte_sender | VARCHAR(25) | | WhatsApp number registered on Fonnte (E.164). |
| wa_phone_number_id | VARCHAR(100) | | Future: Meta phone number ID (WhatsApp Business API). |
| wa_access_token | TEXT | | Future: permanent system user token (WA Business API). |
| template_booking_confirmation | TEXT | | **Customer.** Sent when customer confirms booking (if phone provided). Vars: `{name}`, `{branch}`, `{barber}`, `{time}`, `{services}`, `{booking_number}`. |
| template_receipt | TEXT | | **Customer.** Sent after payment completes. Vars: `{name}`, `{branch}`, `{services}`, `{total}`, `{booking_number}`. |
| template_late_customer_reminder | TEXT | | **Customer.** Auto-sent when customer hasn't arrived by `scheduled_at + late_customer_threshold_minutes`. Vars: `{name}`, `{branch}`, `{barber}`, `{time}`, `{booking_number}`, `{minutes_late}`. |
| template_barber_new_booking | TEXT | | **Staff.** Sent to barber's WhatsApp when a new booking is confirmed for them. Vars: `{barber_name}`, `{customer_name}`, `{time}`, `{services}`, `{booking_number}`, `{branch}`. |
| template_barber_escalation | TEXT | | **Staff.** Sent on a recurring interval when barber hasn't tapped Start. Re-sent every `barber_escalation_interval_minutes` until barber starts, admin stops escalation, or `barber_escalation_max_count` is reached. Vars: `{barber_name}`, `{customer_name}`, `{wait_minutes}`, `{booking_number}`, `{branch}`. |
| template_client_not_arrived | TEXT | | **Operations.** Sent to branch `backoffice_alert_phone` when barber taps "Belum Datang". Vars: `{barber_name}`, `{customer_name}`, `{booking_number}`, `{branch}`, `{queue_position}`. |
| updated_at | TIMESTAMPTZ | | |
| updated_by | UUID | FK → users | |

> **Provider abstraction:** Backend service `notifications.js` exposes a single `sendWhatsApp({ to, templateKey, params })` function. Internally it reads `whatsapp_settings.provider` and routes to either Fonnte REST API or WhatsApp Business API. No call sites change when switching providers.

**branches — add:**
| Column | Type | Description |
|---|---|---|
| late_customer_threshold_minutes | SMALLINT | DEFAULT 10. Minutes after `scheduled_at` before customer late-reminder WA is sent. |
| barber_escalation_interval_minutes | SMALLINT | DEFAULT 3. How often to re-send escalation WA to barber if they haven't started. |
| barber_escalation_max_count | SMALLINT | DEFAULT 5. Max escalation messages before system gives up and alerts admin. |
| backoffice_alert_phone | VARCHAR(25) | E.164 WhatsApp number for the branch operations/backoffice contact. Receives "client not arrived" alerts sent by barbers. Configurable per branch in Branches → Operations tab. |
| auto_cancel_minutes | SMALLINT | DEFAULT 15. Minutes after `scheduled_at` before a future-slot booking is auto-cancelled if barber hasn't started. Configurable per branch in Branches → Operations tab. Set to 0 to disable auto-cancel. |

### kiosk_tokens
One row per registered Windows kiosk device. Token is permanent until revoked by admin.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches | Which branch this device is registered to |
| token | VARCHAR(64) | UNIQUE | Randomly generated token stored hashed. Shown to admin once at generation time only. |
| device_name | VARCHAR(100) | | Admin-assigned label e.g. "Kiosk A — Main Counter" |
| is_active | BOOLEAN | | DEFAULT true. Set false on revoke — device immediately loses API access. |
| last_seen_at | TIMESTAMPTZ | | Updated on every authenticated API request from the device. |
| created_by | UUID | FK → users | Admin who generated the token. |
| created_at | TIMESTAMPTZ | | |

> **Authentication flow:** On boot, kiosk reads token from `localStorage`. Every API request sends `X-Kiosk-Token: <token>` header. Backend validates token, confirms `is_active = true`, updates `last_seen_at`. If missing or invalid → 401, kiosk shows Device Not Registered screen. Token never expires — admin revokes manually from Branches → Kiosk Devices tab.

### Indexes

```sql
CREATE INDEX idx_bookings_branch_date ON bookings(branch_id, scheduled_at);
CREATE INDEX idx_bookings_barber_date ON bookings(barber_id, scheduled_at);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_attendance_barber_date ON attendance(barber_id, clock_in_at);
CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id, branch_id, created_at);
```

---

## 07 — Architecture & Tech Stack

### Stack Decisions

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React PWA | All three apps share one codebase |
| Backend | Node.js + Express REST API | Existing choice, SSE support built-in |
| Database | PostgreSQL | Self-hosted on Rumahweb VPS — no cloud DB |
| Real-time | Server-Sent Events (SSE) | Native browser EventSource, zero extra cost or infrastructure. Kiosk listens on `GET /api/events?branch_id=` for booking and payment events. |
| Payment | Xendit Terminal H2H | Backend calls Xendit cloud REST API (`POST /v1/terminal/sessions`). Terminal shows payment prompt, webhook confirms result. Handles QRIS and card (Visa, Mastercard, JCB, GPN). Internet required for payments — accepted by Bercut. Provider: BRI (live). No BRI merchant account needed; settles to Xendit Balance T+1. Simulation testing available before hardware arrives. |
| Notifications Phase 1 | Web Speech API | Kiosk speaker announcement in Bahasa Indonesia. Free, zero setup, works immediately since barbers are on premises. |
| Notifications Phase 2 | Web Push API via PWA | Free. Works on Android Chrome. Pops up even when app is closed. No Fonnte, no Zenziva, no per-message cost. |
| Receipt Printing | ESC/POS thermal printer | One per kiosk. Recommended: Epson TM-T82 or equivalent. Prints automatically on payment confirmation. |
| Hosting | Rumahweb VPS | Nginx + PM2 + PostgreSQL self-hosted. Vite build → backend/public. |
| Kiosk Hardware | Windows touchscreen per branch | Runs kiosk PWA in fullscreen locked browser via Windows Assigned Access (Kiosk Mode) — single-app lock to Edge/Chrome at a fixed URL. Xendit Terminal H2H is internet-based REST — no platform constraints. |

> **Offline Resilience:** The kiosk must continue to function if internet drops briefly. PWA should cache service list and barber list locally, and queue bookings for sync when connectivity returns.

### SSE Event Types

All events delivered on `GET /api/events?branch_id=`:

| Event type | Payload | Consumer |
|---|---|---|
| `new_booking` | `{ booking_id, barber_id, number, name }` | Barber kiosk panel — show alert badge |
| `booking_started` | `{ booking_id, barber_id }` | QueueNumber screen — cancel escalation timer |
| `payment_trigger` | `{ booking_id }` | Kiosk main screen — open PaymentTakeover |
| `booking_cancelled` | `{ booking_id, reason }` | Queue display / TV system |
| `kiosk_settings_update` | `{ branch_id, settings }` | Kiosk — hot-reload UI config |

### Key API Endpoints (Kiosk-Specific)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/bookings/:id/notify-barber` | Triggers SSE `new_booking` re-broadcast + logs escalation start. Called from QueueNumber after speech announcement. |
| POST | `/api/bookings/:id/payment-trigger` | Admin manual payment trigger — emits SSE `payment_trigger` for a specific booking_id. Used from AdminPanel. |
| GET | `/api/admin/branch-overview` | `?branch_id=&date=` — full today queue + barber status board for AdminPanel. |
| PATCH | `/api/branches/:id/settings` | Updates `kiosk_settings` row for the branch. Emits `kiosk_settings_update` SSE event. |
| GET | `/api/customers` | `?phone=` — lookup by E.164 phone to retrieve name + points_balance. Called from Confirm screen on phone input. |
| POST | `/api/booking-groups` | Creates a `booking_groups` row and links provided `booking_ids`. Called from StaffPanel when staff initiates group payment. |
| POST | `/api/payroll/generate` | `{ branch_id, period_month, attendance_from, attendance_to, commission_from, commission_to, tips_from, tips_to }` — creates `payroll_periods` row (draft) with explicit date ranges + one `payroll_entries` row per active barber. Auto-calculates deductions from attendance/off_records within the specified windows. Idempotent. |
| GET | `/api/payroll/periods` | `?branch_id=&status=` — list payroll periods. `branch_id=all` returns across all branches. |
| GET | `/api/payroll/periods/:id` | Full period detail: entries per barber with calculated + override deductions. |
| PATCH | `/api/payroll/periods/:id/status` | `{ status: 'reviewed' \| 'communicated' }` — advance lifecycle. No immutability — always editable. |
| PATCH | `/api/payroll/entries/:id` | Update deduction overrides for one barber entry. Body: `{ late_minutes_override, inexcused_off_count_override, inexcused_fixed_days, inexcused_prorata_days, excused_off_count_override, excused_fixed_days, excused_prorata_days }`. Backend recomputes net_pay. |
| GET/PUT | `/api/payroll/settings` | Read or update global payroll_settings row (deduction rates, OT commission config). |
| GET | `/api/payroll/periods/:id/export` | `?format=csv\|xlsx` — export all barber entries for the period. `xlsx` format produced via exceljs. Defaults to CSV if format omitted. |
| GET | `/api/expenses/export` | `?branch_id=&from=&to=&type=&format=csv\|xlsx` — export filtered expenses. `xlsx` format flattens multi-branch/PO entries into one row per branch attribution. |
| GET | `/api/reports/export` | `?branch_id=&from=&to=&format=csv\|xlsx` — export revenue + P&L summary. |
| GET | `/api/payroll/settings` | Get global payroll deduction rates. |
| PUT | `/api/payroll/settings` | Update global payroll deduction rates. Owner-only. |
| GET | `/api/attendance/monthly` | `?barber_id=&month=&branch_id=` — monthly attendance summary for Attendance tab. |
| GET | `/api/off-records` | `?barber_id=&month=&branch_id=` — off records for the period. |
| POST | `/api/off-records` | Log a new off record. Body: `{ barber_id, branch_id, date, type, has_doctor_note, note }`. |
| PATCH | `/api/off-records/:id` | Update type, has_doctor_note, note (retroactive flagging of doctor's note). |
| DELETE | `/api/off-records/:id` | Remove an off record. Logged in audit_log. |
| GET | `/api/live-monitor` | `?branch_id=` — current chair status across all/one branch for LiveMonitor screen. Returns barbers with active booking details, next booking, elapsed time. |
| GET | `/api/barbers/:id/services` | Get service capability list for a barber (all services + is_enabled per barber). |
| PUT | `/api/barbers/:id/services` | Replace full service capability set. Body: `{ services: { service_id: true/false, ... } }`. |
| GET | `/api/expense-categories` | List all expense categories (active + inactive). |
| POST | `/api/expense-categories` | Create a new expense category. Body: `{ label, color, bg }` — key auto-derived from label. |
| PATCH | `/api/expense-categories/:id` | Update label, color, or is_active. |
| GET | `/api/inventory/items` | List all inventory items (master list, not per-branch stock). `?cat=` filter by type. |
| POST | `/api/inventory/items` | Create a new inventory item. Body: `{ name, category, unit, reorder_threshold }`. |
| PATCH | `/api/inventory/items/:id` | Update item name, category, unit, threshold, or is_active. |
| GET | `/api/users` | List all admin users (owner-only). Returns id, name, email, role, is_active, last_login_at. |
| POST | `/api/users` | Create a new admin user (owner-only). Body: `{ name, email, password, role }`. Full access granted by default. |
| PATCH | `/api/users/:id` | Update name, email, role, or is_active (owner-only). Cannot modify owner accounts. |
| GET | `/api/users/:id/permissions` | Get permission map for a user — returns all sections with is_enabled boolean (owner-only). |
| PUT | `/api/users/:id/permissions` | Replace full permission set for a user (owner-only). Body: `{ sections: { reports: true, payroll: false, ... } }`. Ignored if user is owner. |
| GET | `/api/audit-log` | List audit log entries (owner-only). `?user_id=&entity_type=&branch_id=&from=&to=` filters. Paginated. |
| GET | `/api/settings/whatsapp` | Returns current WA settings. `fonnte_api_key` and `wa_access_token` are masked (last 4 chars only). |
| PUT | `/api/settings/whatsapp` | Upserts the singleton row. Body: `{ is_enabled, provider, fonnte_api_key, fonnte_sender, template_booking_confirmation, template_receipt, template_late_customer_reminder, template_barber_new_booking, template_barber_escalation, template_client_not_arrived }`. |
| POST | `/api/settings/whatsapp/test` | Sends a test message via the configured provider. Body: `{ to: "+62..." }`. Returns `{ ok, message }`. |
| PATCH | `/api/bookings/:id/stop-escalation` | Admin halts recurring barber escalation messages. Sets `escalation_stopped_at`, `escalation_stopped_by`, `escalation_stop_reason = 'admin_cancelled'`. Booking status unchanged. |
| POST | `/api/kiosk/register` | Called on kiosk boot. Validates `X-Kiosk-Token` header — returns `{ branch_id, branch_name, settings }` or 401 if invalid/revoked. Updates `last_seen_at`. |
| GET | `/api/admin/kiosk-tokens` | `?branch_id=` — list all tokens for a branch. Returns masked tokens (last 4 chars only), device name, is_active, last_seen_at. |
| POST | `/api/admin/kiosk-tokens` | Generate a new device token. Body: `{ branch_id, device_name }`. Returns `{ token }` — shown once, not stored in plain text. |
| DELETE | `/api/admin/kiosk-tokens/:id` | Revoke a token. Sets `is_active = false`. Device loses API access on next request. |

### Additional API Endpoints (added 2026-04-20 — reconciled from mockups)

**Booking lifecycle**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/bookings/:id/start` | Barber taps Start — sets `started_at`, transitions status to `in_progress`. Creates `delay_incidents` row if `started_at > scheduled_at + threshold`. Emits SSE `booking_started`. |
| POST | `/api/bookings/:id/complete` | Barber taps Complete — sets `completed_at`, transitions to `pending_payment`. Emits SSE `payment_trigger`. |
| POST | `/api/bookings/:id/add-services` | Add services to an in-progress booking. Body: `{ services: [{ service_id, price_charged }] }`. Updates total; emits SSE update. |
| POST | `/api/bookings/:id/cancel` | Cancel a booking. Body: `{ reason }`. Transitions to `cancelled`. Logged in audit_log. |
| POST | `/api/bookings/:id/no-show` | Mark no-show. Transitions to `no_show`. Frees slot. |
| POST | `/api/bookings/:id/announce` | Manual re-announce — replays Web Speech on kiosk for this booking. Emits SSE `new_booking` re-broadcast. Called from QueueNumber "Announce now" button. |
| POST | `/api/bookings/:id/client-not-arrived` | Barber taps "Belum Datang". Sets `client_not_arrived_at = now()`. Sends WA via `template_client_not_arrived` to branch `backoffice_alert_phone`. Emits SSE `client_not_arrived` event for Live Queue Management alert badge. Idempotent — no-op if already flagged. |

**Payments**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments` | Trigger a Xendit Terminal session. Body: `{ booking_id, tip_amount, payment_method }`. Calls Xendit `POST /v1/terminal/sessions`. Returns `{ session_id, status }`. |
| POST | `/api/payments/manual` | Admin manually triggers payment for a booking (from AdminPanel or BranchDetail). Body: `{ booking_id }`. Same as `/api/payments` but `payment_trigger_source = admin_manual`. |

**WhatsApp**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/whatsapp/receipt` | Send receipt via WhatsApp. Body: `{ booking_id }`. Reads `template_receipt`, hydrates vars, sends via Fonnte. Returns `{ ok }`. |

**Attendance & breaks**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/attendance/clock-in` | Barber clocks in. Body: `{ barber_id, branch_id }`. Creates `attendance` row with `clock_in_at = now()`. Sets `barbers.status = available`. |
| POST | `/api/attendance/clock-out` | Barber clocks out. Body: `{ barber_id }`. Sets `clock_out_at = now()` on open attendance row. Sets `barbers.status = clocked_out`. |
| POST | `/api/attendance/log-off` | Manager force-closes a barber's open shift (from Attendance admin page). Body: `{ attendance_id, note }`. Logged in audit_log with `created_by`. |
| POST | `/api/barber-breaks` | Start a break. Body: `{ barber_id, branch_id, duration_minutes }`. Sets `barbers.status = on_break`. Returns `{ break_id }`. |
| PATCH | `/api/barber-breaks/:id/end` | End an active break. Sets `ended_at = now()`. Restores `barbers.status = available`. |

**Branches CRUD + chairs**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/branches` | List all branches. `?include_head_office=true` to include the HQ row. |
| POST | `/api/branches` | Create a new branch. Body: branch fields from schema. |
| PATCH | `/api/branches/:id` | Update branch fields (name, address, city, timezone, operational config). |
| GET | `/api/branches/:id/chairs` | List all chairs at a branch with current occupant info. |
| POST | `/api/branches/:id/chairs` | Add a chair. Body: `{ label, barber_id }`. |
| PATCH | `/api/branches/:id/chairs/:chair_id` | Update chair label or assigned barber. |
| DELETE | `/api/branches/:id/chairs/:chair_id` | Remove a chair (only if no active bookings). |
| GET | `/api/chair-overrides` | `?branch_id=&active_only=true` — list overrides. |
| POST | `/api/chair-overrides` | Create an override. Body: `{ chair_id, barber_id, date_from, date_to, reason }`. |
| PATCH | `/api/chair-overrides/:id` | Update `date_to`, `reason`, or set `resolved_by` to end it. |
| DELETE | `/api/chair-overrides/:id` | Hard-delete if never active. Sets `resolved_by` and `date_to = today` if active. |

**Live / SSE**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events?branch_id=` (SSE) | Main SSE stream — all real-time events for a branch (existing). |
| GET | `/api/live/barbers?branch_id=` (SSE) | LiveMonitor-specific SSE stream — pushes barber state updates (status, current booking, elapsed time) every 10s or on change. Consumed by `LiveMonitor.jsx`. |

**Pax-out & analytics**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/pax-out` | Log a pax-out event. Body: `{ branch_id, kiosk_id, source, at_step }`. Creates `pax_out_events` row. |
| GET | `/api/admin/pax-out` | `?from=&to=&branch_id=` — aggregate pax-out data for Reports > Demand tab. Returns counts grouped by source, at_step, and day. |
| GET | `/api/admin/delay-incidents` | `?from=&to=&branch_id=&barber_id=` — delay incident list for Reports > Delay tab. |

**Inventory**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/inventory/distribute` | Head Office distributes stock to a branch. Body: `{ item_id, from_branch_id, to_branch_id, quantity, note }`. Creates two `inventory_movements` rows (out from HQ, in at branch). |
| GET | `/api/inventory/menu?branch_id=` | Returns all beverage and product items for a branch with their `inventory_stock.price` and `inventory_stock.kiosk_visible` values. Used by Inventory > Kiosk Menu tab. |
| PUT | `/api/inventory/menu?branch_id=` | Upserts `inventory_stock.price` and `inventory_stock.kiosk_visible` for all beverage/product items at a branch. Body: `{ items: [{ item_id, price, kiosk_visible }] }`. |

**Services**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/services` | List all services. `?category=&branch_id=` for filtered kiosk view. |
| POST | `/api/services` | Create a service. Body: service fields from schema. Owner/manager only. |
| PATCH | `/api/services/:id` | Update service fields (name, price, duration, badge, image, sort_order, is_active). |
| PUT | `/api/services/:id/branch-config` | Upsert a `branch_services` row. Body: `{ branch_id, price, is_available, commission_rate }`. |

**Kiosk config read**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/kiosk-settings` | `?branch_id=` — returns merged kiosk settings (branch row falls back to global NULL row). Called on kiosk boot via `/api/kiosk/register` response and also directly by KioskConfig admin screen. |

**Online booking**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/branches/:id/online-booking` | Returns the branch's online booking settings (link slug, WA fallback toggle, is_enabled). |
| PATCH | `/api/branches/:id/online-booking` | Update online booking config. Body: `{ is_enabled, wa_fallback_enabled, slug }`. |
| GET | `/api/reports/online-bookings` | `?branch_id=&from=&to=` — booking count, conversion stats, and link click-throughs for OnlineBooking stats panel. |

**Customers**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/customers/:id` | Full customer profile — name, phone, points_balance, totals, preferred barber. |
| GET | `/api/customers/:id/history` | Paginated visit history — bookings with services, barber, amount, rating, date. `?page=&limit=`. |

**Feedback tags**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/feedback-tags` | List all feedback tags. `?context=good\|bad\|neutral&active_only=true`. Called by kiosk on boot (included in kiosk-settings response). |
| POST | `/api/feedback-tags` | Create a tag. Body: `{ label, context, sort_order }`. Owner/manager only. |
| PATCH | `/api/feedback-tags/:id` | Update label, context, sort_order, or is_active. |

**Fonnte WA — internal contract (Section 07 reference)**

> **Fonnte API shape** (resolved 2026-04-20): `POST https://api.fonnte.com/send` · Header: `Authorization: <token>` (no "Bearer" prefix) · Body: multipart form-data with fields `target` (E.164 number), `message` (plain text), `countryCode: "62"`. Handled exclusively in `backend/services/notifications.js` — no call sites outside that file.

---

## 08 — Non-Functional Requirements

### Performance
- Kiosk load time under 2 seconds
- Real-time queue updates under 1 second (delivered via SSE)
- Kiosk must remain usable for basic walk-in queuing even offline — payments may pause, queue numbers must still issue

### Security
- **Kiosk lockdown mode:** Windows Assigned Access (Kiosk Mode). Single-app lock to Edge/Chrome at a fixed URL — no access to other apps or browser navigation.
- **PIN-based barber authentication:** 6-digit PINs, bcrypt-hashed in database.
- **RBAC:** Barbers see only their own branch and queue. No barber can modify pricing or other barbers' data. Admin roles: `owner` (immutable full access), `manager` / `accountant` (full access by default, owner can toggle sections off via `user_permissions`). User management is owner-only. Overview always visible to all roles.
- **Payment data never stored raw:** Card numbers, CVV, and full QRIS payloads never stored. All tokenisation handled by Xendit.

### Scalability
- **Multi-branch from day one:** Every query, API call, and data model is branch-scoped. Adding a new branch = inserting one row.
- **Indexing:** Bookings table indexed on `(branch_id, barber_id, scheduled_at)` for fast slot-generation queries as data grows across 6+ branches.

---

## 09 — Open Questions

| Status | Item | Resolution |
|---|---|---|
| ✅ | Payment Model | Postpaid, cashless only. QRIS and card via Xendit Terminal H2H. Cash not accepted. |
| ✅ | Receipt Printer | ESC/POS thermal printer per kiosk. Auto-prints after payment. |
| ✅ | Loyalty Programme | Points system added (Meeting 3). Rp 10,000 = 1 point. Earned on cash spend. Redeemable per service at Confirm screen. Tracked per phone number. |
| ✅ | Online Booking | Via WhatsApp. Admin manually inputs — no bot for Phase 1. |
| ✅ | Tipping | Prompt at payment screen. Presets configurable per branch (defaults: Rp 5k/10k/20k/50k/100k) + custom + skip. Individual per barber — not pooled. |
| ✅ | Attendance Tracking | Kiosk-based clock-in/out via BarberPanel. No GPS or geofencing — physical kiosk presence confirms location. |
| ✅ | Kiosk Hardware | Windows touchscreen per branch (resolved 2026-04-19). Runs kiosk PWA in fullscreen via Windows Assigned Access (Kiosk Mode). Xendit Terminal H2H is internet-based REST — no platform constraints. |
| ✅ | Inventory Categories | Beverages, Products, Service Consumables. |
| ✅ | Expense Approval Flow | No approval step. Logged immediately by any admin/owner. |
| ✅ | Commission Structure | Rates set per barber, fully configurable by admin. System auto-calculates. |
| ✅ | Real-Time & Notifications | SSE for real-time. Web Speech API (Phase 1). Web Push (Phase 2). No per-message cost. |
| ❓ | **Xendit Terminal Onboarding** | Email sent to inpersonpayments@xendit.co requesting test terminal and onboarding meeting. Response pending. |

---

## 10 — Build Roadmap

### Phase 1 — Foundation
Database setup, API, kiosk booking flow (service → barber → time → confirm including hair bleach configurator, loyalty points redemption, international phone picker), barber kiosk panel (queue, start/complete, add services mid-cut, break, clock in/out), postpaid payment screen (tip, QRIS + card via Xendit Terminal H2H, post-payment star rating + feedback tags), thermal receipt printer (ESC/POS), admin kiosk panel (branch queue, barber status board, manual payment trigger, cancel/no-show), admin dashboard branch overview and daily revenue report.

### Phase 2 — Operations (3–4 weeks)
Full service catalogue management, barber scheduling and attendance (kiosk clock-in/out), customer database and history, commission tracking, no-show flagging, group booking payment, WhatsApp booking confirmations, Web Push notifications for barbers, kiosk UI remote configuration from admin.

### Phase 3 — Growth (4–5 weeks)
Online booking page or WhatsApp flow, promo codes and discounts, advanced reporting (by service, by barber, multi-branch comparison), receipt printer integration.

### Phase 4 — Scale (ongoing)
Performance optimisation for high-traffic branches, multi-language kiosk (Indonesian + English), analytics dashboard, potential integration with accounting software (Jurnal/Accurate), franchise management features.

---

## 11 — Future Considerations

### Excel Export (xlsx)

All major data screens (Expenses, Reports, Payroll) should support `.xlsx` export in addition to CSV for accountant handoff. Key design decisions:

**Library:** Use [`exceljs`](https://github.com/exceljs/exceljs) on the Node.js backend. Lighter than SheetJS for write-only use cases; supports column widths, bold headers, and number formatting without licensing issues.

**Expenses export — special handling required:**
- Regular expenses: one row per expense, `branch` column is the branch name
- Multi-branch inventory (PO final / full multi-branch): expand into one row per branch using `po_attribution` or `expense_stock_items.distributions` — each row gets its attributed cost in the Amount column, plus a `Source Expense` reference column pointing back to the parent expense ID
- PO advance (open): exported with `branch = "PENDING"` and `amount = full advance amount` — flagged clearly; accountant understands it will be re-attributed when PO closes
- PO advance (closed): exported with per-branch rows using `po_attribution` data — same expansion as final payment

**Recommended sheet structure per export:**
- Sheet 1 `Summary` — totals by branch + category/type, date range header, net per branch
- Sheet 2 `Transactions` — flat, one row per branch-attributed line, pivot-ready (no merged cells, consistent types, `expense_date` as ISO date not string)

**Payroll export:**
- One row per barber, columns: name, branch, base salary, gross revenue, commission, tips, deductions (late/inexcused/excused), adjustments (additions/deductions), kasbon, net pay
- Separate sheet for kasbon detail if any barbers have multiple kasbon entries in the period

**Accounting software integration (future):**
- Jurnal.id and Accurate Online both accept CSV/Excel import in a specific column format
- When this is built, add a `format=jurnal` or `format=accurate` query param option to the export endpoints — backend maps Bercut columns to the required import template
- P&L data maps to: debit account (expense category), credit account (petty cash / owner equity), amount, date, description, branch cost centre

> **Recommended start:** Begin with one pilot branch to validate the kiosk flow and barber app experience before rolling out to all 6+ branches.
