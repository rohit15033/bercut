# Bercut Barber Shop — System Planning Document
*v1.0 · Prepared March 2026 · Confidential*

---

## 01 — Project Overview

Bercut is a barbershop chain with 6+ branches across Bali, Indonesia. This system replaces all front desk staff with a self-service kiosk, a barber queue app, and an admin dashboard.

**Three PWA apps, one shared codebase:**
- **Kiosk** — customer-facing, Windows touchscreen, landscape, no login required
- **Barber App** — staff-facing, mobile PWA, portrait, PIN login
- **Admin Dashboard** — owner/manager/accountant, desktop, full access across all branches

**Key design constraint:** Because there is no cashier, the system must handle payment confirmation automatically — via QRIS or BCA EDC card integration — triggered after service completion.

### Core Features at a Glance
- Self-service kiosk booking (select service → barber → time slot → confirm)
- Real-time barber queue with start/complete controls
- Postpaid payment via BCA EDC (QRIS + card) — pay after service, not during booking
- Tipping at payment screen (presets Rp 10k/20k/50k + custom)
- Multi-branch admin dashboard with live queues, revenue reports, barber management
- GPS-geofenced attendance for barbers
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
| Barber Selection | P1 | Pick preferred barber or "Any Available" (first card, dice icon). Shows name, specialty, rating, cut count, next available time. |
| Time Slot Booking | P1 | Live slots based on barber availability, service duration, existing queue. "Now" and "Next Available" appear as first two slot cards; remaining slots fill the grid. Blocks in real time. |
| Payment at Kiosk — Postpaid | P1 | Customer pays **after service** at the kiosk counter. Kiosk switches to payment mode when barber marks job complete. Supports QRIS and card via BCA EDC direct integration. |
| Booking Confirmation & Queue Number | P1 | Unique booking number shown on screen. Optionally printed or sent via WhatsApp. Kiosk announces barber name via Web Speech API. |
| Dual-Mode Kiosk Screen | P1 | Two modes: Booking Mode (next walk-in) and Payment Mode (triggered by barber completing job). Must coexist — payment overlay or split screen. |
| Post-Service Rating + Feedback Tags | P1 | 1–5 star rating shown immediately after payment (in the same PaymentTakeover flow). Contextual tag chips appear based on star rating (e.g. "Amazing cut!" at 5 stars, "Too rushed" at 1 star). 5-minute timeout + skip. Rating and selected tags stored per booking. |
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
| No-Show Flagging | P2 | Barber flags a no-show, slot freed automatically. |
| Schedule Overview | P2 | Full day at a glance — total bookings, estimated finish time. |

### C. Admin Dashboard

| Feature | Priority | Description |
|---|---|---|
| Multi-Branch Overview | P1 | Single screen: all branches live — queue status, today's revenue, active barbers. |
| Revenue & Sales Reports | P1 | Daily/weekly/monthly breakdowns per branch. Filter by barber, service, payment method. Export CSV/Excel. |
| Barber Management | P1 | Add, edit, deactivate barbers. Assign to branches. Set working hours. View performance stats. |
| Service Catalogue Management | P1 | Create, update, deactivate services. Set pricing (optionally per branch). |
| Customer Data & History | P1 | View customers who provided contact info. See visit history, preferred barber, total spend. |
| Notification & Operations Settings | P1 | Per branch: late start threshold, speaker on/off, tip presets, Web Push settings. |
| Kiosk UI Configuration | P2 | Per branch (or global): configure upsell popup copy, upsell rules, package badge text, service display order, welcome screen copy, CTA labels (bilingual), and colour/logo overrides. Changes propagate to kiosk on next load or via SSE push. |
| Barber Scheduling & Attendance | P2 | Set weekly schedules. Track clock-in/out. View attendance records, flag absences. |
| Barber Commission Tracking | P2 | Set commission rate per barber (% of service revenue). Part of payroll system. |
| Payroll Management | P2 | Monthly payroll runs per branch. Barbers on salary + commission. Auto-calculates base salary, commission from completed services, individual tips. Admin adds uang rajin and other bonuses with configurable reasons. Kasbon (salary advance) tracked with configurable deduction month (current or next). Draft → Reviewed → Finalized workflow. Export payslips. |
| Service Delay Report | P2 | All late start incidents per barber per branch. Timestamp, scheduled time, actual start, delay duration. |
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
| Expense Logging | P1 | Any admin/owner logs an expense per branch. Fields: amount (IDR), category, description, date. Categories: petty cash, supplies, utilities, equipment, other. No approval step — logged immediately. |
| Receipt Photo Upload | P2 | Optional photo attachment (stored in cloud storage). |
| Expense vs Revenue Summary | P2 | Net revenue (service revenue minus expenses) per branch — lightweight P&L per location. |

### F. Attendance & Location Tracking

| Feature | Priority | Description |
|---|---|---|
| GPS Geofenced Clock-In | P1 | Barber clocks in via PWA. GPS coordinates checked against branch location. Clock-in only permitted within configured radius (default 100m). |
| Clock-In / Clock-Out Log | P1 | Every movement timestamped per barber per branch. Admin can view full history. |
| Optional Face ID Verification | P2 | Selfie compared against profile photo at clock-in. Prevents proxy clock-ins. |
| Late & Absence Alerts | P2 | If barber hasn't clocked in within 15 min of shift start, admin notified. |

### G. Inventory Tracking

| Feature | Priority | Description |
|---|---|---|
| Three-Category Stock Management | P1 | **Beverages** (drinks offered to customers), **Products** (retail/resale items like pomade — received centrally, assigned to branch on arrival), **Service Consumables** (foil, blades, wax strips — tracked per branch as consumed). |
| Branch Assignment on Product Arrival | P1 | Admin logs delivery and assigns quantities to specific branches. Creates stock-in records per branch. |
| Stock In / Stock Out Logging | P1 | Branch staff log movements. Each entry: quantity, date, category, who logged. |
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
5. **Card: Tap BCA EDC** — Auto-confirmed via direct integration
6. **Booking Closed** — Receipt optional

> **Payment model — decided: Postpaid, cashless only.** Payment is via BCA EDC terminal (direct integration — Serial/USB ISO 8583 or local TCP/LAN, protocol TBC with BCA). No third-party payment gateway. Cash not accepted.

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
| Clock-In | GPS check, "Masuk" button enabled only when within geofence |

### Admin Dashboard — Owner Facing (Desktop / Tablet, Wide)

| Screen | Notes |
|---|---|
| All Branches Overview | Live status per branch — revenue, active barbers, queue counts, alerts |
| Revenue Report | Daily/weekly/monthly, filter by branch/barber/service, export CSV |
| Service Management | Catalogue editor with per-branch price overrides |
| Barber Management | Profiles, schedules, commission rates, attendance |
| Expenses | Logging form, P&L summary per branch |
| Inventory | Three-category stock table, movement log, low stock alerts |
| Settings | Per-branch notification thresholds, tip presets, toggles |
| Kiosk Configuration | Per-branch kiosk UI settings — welcome copy, upsell on/off, popup labels, service display order. Changes pushed live via SSE or applied on next kiosk load. |

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
| geofence_lat | DECIMAL(9,6) | | Branch GPS latitude |
| geofence_lng | DECIMAL(9,6) | | Branch GPS longitude |
| geofence_radius_m | INTEGER | | Default 100m |
| tip_distribution_method | ENUM | | `individual` \| `equal_split` \| `proportional` — default `individual` |
| pay_period_type | VARCHAR(10) | | Default `monthly`. Future: `weekly`, `biweekly`. |
| is_active | BOOLEAN | | Soft-disable without deleting |
| created_at | TIMESTAMPTZ | | |

### users
Admin/owner/accountant accounts — NOT barbers.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| email | VARCHAR(200) | UNIQUE | |
| password_hash | TEXT | | |
| name | VARCHAR(100) | | |
| role | VARCHAR(20) | | Default 'admin' |
| is_active | BOOLEAN | | |
| created_at | TIMESTAMPTZ | | |

### barbers

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches | Home branch |
| name | VARCHAR(100) | | Display name on kiosk and queue |
| specialty | VARCHAR(100) | | English descriptor |
| specialty_id | VARCHAR(100) | | Indonesian descriptor |
| phone | VARCHAR(20) | | WhatsApp number |
| pin_hash | TEXT | | Hashed 4–6 digit PIN |
| commission_rate | DECIMAL(5,2) | | e.g. 35.00 — percentage of their completed service revenue |
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

### service_branch_prices
Optional price overrides per branch.

| Column | Type | Key |
|---|---|---|
| service_id | UUID | FK → services |
| branch_id | UUID | FK → branches |
| price | INTEGER | Override price in IDR |

### barber_schedules

| Column | Type | Key | Description |
|---|---|---|---|
| barber_id | UUID | FK → barbers | |
| day_of_week | SMALLINT | PK | 0 = Sunday … 6 = Saturday |
| start_time | TIME | | Shift start e.g. 09:00 |
| end_time | TIME | | Shift end e.g. 18:00 |
| is_off | BOOLEAN | | Flag day as off (overrides start/end) |

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
| guest_phone | VARCHAR(20) | | Phone entered at kiosk |
| scheduled_at | TIMESTAMPTZ | | Selected time slot start |
| started_at | TIMESTAMPTZ | | When barber tapped "Start" |
| completed_at | TIMESTAMPTZ | | When barber tapped "Complete" |
| paid_at | TIMESTAMPTZ | | |
| acknowledged_at | TIMESTAMPTZ | | When barber acknowledged the booking |
| status | ENUM | | `confirmed` → `in_progress` → `pending_payment` → `completed` \| `no_show` \| `cancelled` |
| payment_status | ENUM | | `unpaid` \| `paid` \| `refunded` |
| payment_method | ENUM | | `qris` \| `card` \| null |
| payment_ref | VARCHAR(100) | | EDC transaction reference |
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
Pooled per branch, tracked separately from service revenue.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| booking_id | UUID | FK → bookings (UNIQUE) | |
| branch_id | UUID | FK → branches | |
| amount | INTEGER | | IDR |
| payment_method | VARCHAR(10) | | |
| created_at | TIMESTAMPTZ | | |

### expenses

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches | |
| submitted_by | UUID | FK → users | |
| category | VARCHAR(40) | | `petty_cash` \| `supplies` \| `utilities` \| `equipment` \| `other` |
| amount | INTEGER | | IDR |
| description | TEXT | | |
| receipt_url | TEXT | | |
| expense_date | DATE | | |
| created_at | TIMESTAMPTZ | | |

### attendance

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| barber_id | UUID | FK → barbers | |
| branch_id | UUID | FK → branches | |
| clock_in_at | TIMESTAMPTZ | | |
| clock_out_at | TIMESTAMPTZ | | |
| clock_in_lat | DECIMAL(9,6) | | |
| clock_in_lng | DECIMAL(9,6) | | |
| within_geofence | BOOLEAN | | |
| face_verified | BOOLEAN | | |
| selfie_url | TEXT | | |

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
One row per chair per branch. Each barber is assigned one chair.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches | |
| label | VARCHAR(10) | | e.g. "A1", "B2" |
| barber_id | UUID | FK → barbers (nullable) | Assigned barber |

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

### adjustment_reasons
Admin-defined reasons for payroll adjustments. Can be global (branch_id = NULL) or per-branch. Used for uang rajin, bonuses, deductions, and kasbon labels.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches (nullable) | NULL = applies to all branches |
| type | VARCHAR(20) | | `uang_rajin` \| `bonus` \| `deduction` \| `kasbon` |
| label | VARCHAR(100) | | e.g. "Full Month Attendance", "Top Barber", "Equipment Damage", "Salary Advance" |
| is_active | BOOLEAN | | Soft-delete |
| created_at | TIMESTAMPTZ | | |

### payroll_periods
One row per monthly payroll run per branch. Lifecycle: `draft → reviewed → finalized`.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| branch_id | UUID | FK → branches | |
| period_month | DATE | | First day of the month, e.g. `2026-03-01`. UNIQUE per branch. |
| status | ENUM | | `draft` \| `reviewed` \| `finalized` |
| notes | TEXT | | Optional admin notes for this run |
| finalized_by | UUID | FK → users (nullable) | Who finalized |
| finalized_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | | |

> **Payroll flow:** Admin clicks "Generate Payroll" for a branch + month → system creates this row (status `draft`) and auto-creates one `payroll_entries` row per active barber. Admin reviews, adds adjustments, then finalizes. Finalized rows are immutable.

### payroll_entries
One row per barber per payroll period. All monetary components stored separately so the admin can see exactly how net pay was calculated.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| period_id | UUID | FK → payroll_periods | |
| barber_id | UUID | FK → barbers | |
| pay_type_snapshot | ENUM | | Copied from `barbers.pay_type` at generation time (immutable record) |
| base_salary_snapshot | INTEGER | | Copied from `barbers.base_salary` at generation time |
| commission_rate_snapshot | DECIMAL(5,2) | | Copied from `barbers.commission_rate` at generation time |
| gross_service_revenue | INTEGER | | Sum of `booking_services.price_charged` for this barber's completed bookings in the period |
| commission_earned | INTEGER | | `gross_service_revenue × commission_rate_snapshot / 100` |
| tips_earned | INTEGER | | Sum of `tips.amount` for this barber's individual bookings in the period |
| attendance_days | SMALLINT | | Count of distinct days with a clock-in record in the period |
| uang_rajin_total | INTEGER | | Sum of all `uang_rajin` adjustments linked to this entry. DEFAULT 0. |
| bonus_total | INTEGER | | Sum of all `bonus` adjustments linked to this entry. DEFAULT 0. |
| kasbon_deducted | INTEGER | | Sum of kasbon adjustments scheduled for this period. DEFAULT 0. |
| other_deductions | INTEGER | | Sum of `deduction` adjustments linked to this entry. DEFAULT 0. |
| net_pay | INTEGER | | `base_salary + commission_earned + tips_earned + uang_rajin_total + bonus_total − kasbon_deducted − other_deductions` |
| bookings_completed | SMALLINT | | Count of completed bookings in the period |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

### payroll_adjustments
Individual line items (uang rajin, bonuses, deductions, kasbon). Linked to an entry. Kasbon can be pre-logged against a future period before payroll is generated.

| Column | Type | Key | Description |
|---|---|---|---|
| id | UUID | PK | |
| entry_id | UUID | FK → payroll_entries (nullable) | NULL while kasbon is pending assignment to a period |
| barber_id | UUID | FK → barbers | Always set — used for pre-period kasbon lookup |
| branch_id | UUID | FK → branches | |
| type | ENUM | | `uang_rajin` \| `bonus` \| `deduction` \| `kasbon` |
| amount | INTEGER | | Always positive (IDR) |
| reason_id | UUID | FK → adjustment_reasons (nullable) | Selected reason template |
| reason_text | VARCHAR(200) | | Free-text label — copied from reason template or typed manually |
| deduct_in | ENUM | | `current` \| `next` — **kasbon only.** Which period's payroll this deducts from. |
| target_period_month | DATE | | Computed from `deduct_in` at logging time. Null for non-kasbon types. |
| logged_by | UUID | FK → users | |
| applied | BOOLEAN | | DEFAULT FALSE. Set TRUE when included in a finalized payroll entry. |
| created_at | TIMESTAMPTZ | | |

**Kasbon deduction logic:**
- When `type = kasbon` and `deduct_in = current`: `target_period_month` = current month.
- When `type = kasbon` and `deduct_in = next`: `target_period_month` = first day of next month.
- When payroll generation runs for a given month, it queries all `payroll_adjustments` where `type = kasbon AND target_period_month = period_month AND barber_id = this barber` and sums them into `kasbon_deducted`.

### Column additions to existing tables

**barbers** — add:
| Column | Type | Description |
|---|---|---|
| status | ENUM | `available \| busy \| on_break \| clocked_out` |
| chair_id | UUID | FK → chairs (nullable) |

**bookings** — add:
| Column | Type | Description |
|---|---|---|
| auto_cancel_at | TIMESTAMPTZ | Set to confirmed_at + 15 min; cleared when customer arrives |
| cancellation_reason | TEXT | Admin-entered reason (stored after cancellation) |
| points_redeemed | INTEGER | DEFAULT 0. Points used at Confirm to cover services. |
| points_earned | INTEGER | DEFAULT 0. Points credited to customer after payment completes. |
| review_tags | TEXT[] | Nullable array of feedback tag strings selected after payment (e.g. ["Amazing cut!", "Will come back"]). Populated together with `rating`. |
| group_id | UUID | Nullable FK → booking_groups. Set when this booking is part of a group payment session. |

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
| Database | PostgreSQL | Hosted on Railway or Render (or Supabase Pro at ~$25/mo) |
| Real-time | Server-Sent Events (SSE) | Native browser EventSource, zero extra cost or infrastructure. Kiosk listens on `GET /api/events?branch_id=` for booking and payment events. |
| Payment | BCA EDC terminal | Direct integration — handles both QRIS and card. Serial/USB (ISO 8583) or local TCP/LAN. No third-party payment gateway (no Midtrans). Protocol TBC with BCA technical team. |
| Notifications Phase 1 | Web Speech API | Kiosk speaker announcement in Bahasa Indonesia. Free, zero setup, works immediately since barbers are on premises. |
| Notifications Phase 2 | Web Push API via PWA | Free. Works on Android Chrome. Pops up even when app is closed. No Fonnte, no Zenziva, no per-message cost. |
| Receipt Printing | ESC/POS thermal printer | One per kiosk. Recommended: Epson TM-T82 or equivalent. Prints automatically on payment confirmation. |
| Hosting | Railway or Render | Both support PostgreSQL and Node.js |
| Kiosk Hardware | Windows touchscreen per branch | Runs kiosk PWA in fullscreen locked browser via Windows Assigned Access (single-app kiosk mode). No Android/iPad. |

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
| POST | `/api/payroll/generate` | `{ branch_id, period_month }` — creates `payroll_periods` row (draft) + one `payroll_entries` row per active barber. Idempotent: calling again returns existing draft. |
| GET | `/api/payroll/periods` | `?branch_id=&status=` — list payroll periods for a branch. |
| GET | `/api/payroll/periods/:id` | Full period detail: entries + adjustments per barber. |
| PATCH | `/api/payroll/periods/:id/status` | `{ status: 'reviewed' \| 'finalized' }` — advance lifecycle. Finalized periods are immutable. |
| POST | `/api/payroll/adjustments` | Log a new adjustment (uang_rajin, bonus, deduction, kasbon). `entry_id` optional for pre-period kasbon. |
| DELETE | `/api/payroll/adjustments/:id` | Remove an adjustment — only allowed if linked period is not finalized. |
| GET | `/api/payroll/adjustment-reasons` | `?branch_id=&type=` — list configurable reason templates. |
| POST | `/api/payroll/adjustment-reasons` | Create a new reason template. |
| PATCH | `/api/payroll/adjustment-reasons/:id` | Edit or soft-delete a reason template. |
| GET | `/api/payroll/periods/:id/export` | Returns CSV payslip data for all barbers in the period. |

---

## 08 — Non-Functional Requirements

### Performance
- Kiosk load time under 2 seconds
- Real-time queue updates under 1 second (delivered via SSE)
- Kiosk must remain usable for basic walk-in queuing even offline — payments may pause, queue numbers must still issue

### Security
- **Kiosk lockdown mode:** Windows Assigned Access (single-app kiosk mode) via Group Policy. No access to other apps, URLs, or desktop.
- **PIN-based barber authentication:** 6-digit PINs, bcrypt-hashed in database.
- **RBAC:** Barbers see only their own branch and queue. Admin sees everything. No barber can modify pricing or other barbers' data.
- **Payment data never stored raw:** Card numbers, CVV, and full QRIS payloads never stored. All tokenisation handled by BCA EDC.

### Scalability
- **Multi-branch from day one:** Every query, API call, and data model is branch-scoped. Adding a new branch = inserting one row.
- **Indexing:** Bookings table indexed on `(branch_id, barber_id, scheduled_at)` for fast slot-generation queries as data grows across 6+ branches.

---

## 09 — Open Questions

| Status | Item | Resolution |
|---|---|---|
| ✅ | Payment Model | Postpaid, cashless only. QRIS and card via BCA EDC direct integration. Cash not accepted. |
| ✅ | Receipt Printer | ESC/POS thermal printer per kiosk. Auto-prints after payment. |
| ✅ | Loyalty Programme | Points system added (Meeting 3). Rp 10,000 = 1 point. Earned on cash spend. Redeemable per service at Confirm screen. Tracked per phone number. |
| ✅ | Online Booking | Via WhatsApp. Admin manually inputs — no bot for Phase 1. |
| ✅ | Tipping | Prompt at payment screen. Presets Rp 10k/20k/50k + custom. Pooled per branch. |
| ✅ | Attendance Tracking | GPS-based clock-in via barber PWA. Geofenced per branch. Optional Face ID. |
| ✅ | Kiosk Hardware | Windows touchscreen per branch. Fullscreen kiosk mode via Windows Assigned Access. |
| ✅ | Inventory Categories | Beverages, Products, Service Consumables. |
| ✅ | Expense Approval Flow | No approval step. Logged immediately by any admin/owner. |
| ✅ | Commission Structure | Rates set per barber, fully configurable by admin. System auto-calculates. |
| ✅ | Real-Time & Notifications | SSE for real-time. Web Speech API (Phase 1). Web Push (Phase 2). No per-message cost. |
| ❓ | **EDC Integration Method** | **Confirm with BCA.** Option 1 (Serial/USB, ISO 8583) or Option 2 (local TCP/LAN) preferred — fully local, offline-capable, no API overhead. Option 3 (BCA Merchant API) easier to build but requires internet. Need to confirm which protocol BCA's issued terminal model supports. |

---

## 10 — Build Roadmap

### Phase 1 — Foundation
Database setup, API, kiosk booking flow (service → barber → time → confirm including hair bleach configurator, loyalty points redemption, international phone picker), barber kiosk panel (queue, start/complete, add services mid-cut, break, clock in/out), postpaid payment screen (tip, QRIS + card via BCA EDC direct integration, post-payment star rating + feedback tags), thermal receipt printer (ESC/POS), admin kiosk panel (branch queue, barber status board, manual payment trigger, cancel/no-show), admin dashboard branch overview and daily revenue report.

### Phase 2 — Operations (3–4 weeks)
Full service catalogue management, barber scheduling and attendance (GPS geofenced clock-in), customer database and history, commission tracking, no-show flagging, group booking payment, WhatsApp booking confirmations, Web Push notifications for barbers, kiosk UI remote configuration from admin.

### Phase 3 — Growth (4–5 weeks)
Online booking page or WhatsApp flow, promo codes and discounts, advanced reporting (by service, by barber, multi-branch comparison), receipt printer integration, optional face ID at clock-in.

### Phase 4 — Scale (ongoing)
Performance optimisation for high-traffic branches, multi-language kiosk (Indonesian + English), analytics dashboard, potential integration with accounting software (Jurnal/Accurate), franchise management features.

> **Recommended start:** Begin with one pilot branch to validate the kiosk flow and barber app experience before rolling out to all 6+ branches.
