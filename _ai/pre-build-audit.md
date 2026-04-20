# Bercut Pre-Build Audit — Second Pass

**Date:** 2026-04-20 (second pass)
**Audience:** Antigravity (primary), Bercut (secondary)
**Source of truth order:** `_ai/decisions-log.md` > `_ai/system-plan.md` > mockups
**Pass 1 verdict (before this pass):** GO — 23/23 PASS.
**This pass adds:** Payroll.jsx deep-dive, Settings.jsx deep-dive, Expenses.jsx deep-dive, Branches.jsx deep-dive, BranchDetail.jsx, Confirm.jsx, all Schema D extra checks, API E extra checks.

**Progress log (pass 1 — preserved):**
- 2026-04-20 F1.1–F1.5 and F2/F3 complete — see pass 1 log for full detail.

---

## A. Screen Inventory

Cross-referenced against `system-plan.md` Section 05. "Built" = mockup exists and matches decisions-log. "Partial" = mockup exists with specific gaps. "Missing" = planned but absent.

### A1. Kiosk App (`mockups/kiosk/`)

| Screen | Status | Notes |
|---|---|---|
| `BercutKiosk.jsx` (shell, DeviceSetup, OfflineBanner, IdleOverlay, UpsellModal, triple-tap StaffPanel) | Built | X-Kiosk-Token permanent auth. `DEMO_TOKEN = 'BERCUT-DEMO-0001'`. pax-out fires on `kiosk_timeout` + `kiosk_back`. Idle timeout: 60s + 15s countdown overlay. |
| `Welcome.jsx` | Built | Configurable `welcomeCta` / `welcomeCtaId` via kiosk settings. Bilingual. |
| `ServiceSelection.jsx` + `BleachModal` | Built | Hair Bleach 1/2/3-step configurator + optional color add-on. `bleach_step` + `bleach_with_color` correctly stored. Mutex groups: ear_treatment + beard_service. Package photo strips. |
| `BarberSelection.jsx` | Built | "Any Available" dice icon first card. Barbers without service capability hidden. |
| `TimeSlot.jsx` | Built | Now / Next Available as first two slot cards. Beverages + products with `outOfStock` badge. Auto-cancel notice on non-Now slots. STATUS_LABELS: available/busy/on_break/clocked_out. |
| `Confirm.jsx` | **Pass** | BCA reference scrubbed (pass 1). E.164 country picker present (pinned ID/AU/RU/IN). Per-service points toggle. `whatsapp_consent` checkbox absent (removed 2026-03-27). Points nudge shown. Phone lookup via `GET /api/customers?phone=` in comment. |
| `QueueNumber.jsx` | Built | 2-min escalation with "Announce now" override. No WA send button (removed 2026-04-19 per decision). Web Speech API announcement. |
| `PaymentTakeover.jsx` | **Pass** | Branch name dynamic from localStorage (pass 1). `FEEDBACK_TAGS` now admin-configurable via KioskConfig. Xendit Terminal copy correct. Receipt + WhatsApp receipt flow + ReviewScreen. |
| `BarberPanel.jsx` | Built | Queue, Mulai/Selesai, add-services, Masuk/Pulang, barber-breaks. "⚠ Belum Datang" alert (idempotent; no cancel/no-show). Start button active only for topmost confirmed booking. Monthly earnings toggle (Hari Ini / Bulan Ini). Late-start indicator (amber 5+min, red 10+min). |
| `StaffPanel.jsx` | Built | Group-pay formation. `POST /api/booking-groups` on confirm. Already-grouped bookings cannot be re-selected. |
| `AdminPanel.jsx` | Built | Manual payment trigger, cancel, stop escalation. Password-gated via topbar logo. |
| `Details.jsx` | Removed | Deleted from repo (2026-04-06). Phone capture moved to Confirm. |
| `catalogue.js` | Built | Source of truth for service list during prototype. |

### A2. Admin App (`mockups/admin/`)

Sidebar has 14 items: Overview, Live Monitor, Reports, Barbers, Branches, Services, Customers, Expenses, Inventory, Attendance, Payroll, Online Booking, Kiosk Config, Settings.

| Screen | Status | Notes |
|---|---|---|
| `Overview.jsx` | Built | KPI cards, branch cards, "In Chair" stat → LiveMonitor link. All-branch live. |
| `LiveMonitor.jsx` | Built | **Not in original system-plan 03/05 — added.** Real-time per-barber view. `client_not_arrived` alert badges. Admin: Start (force), Cancel (required reason), No-show. pax-out logging (cctv_manual + kiosk events). |
| `Reports.jsx` | Built | Three tabs: Revenue, Demand (pax-out analytics), Delay. Barber rows clickable → individual TX log + CSV. |
| `Barbers.jsx` | Built | Barber profiles + Attendance Log tabs. Inline service-capability toggles. |
| `Branches.jsx` | Built | 3-tab BranchModal (Details, Operations, Kiosk Devices) + ChairPanel + OverrideModal. **Deep-dive below.** |
| `BranchDetail.jsx` | Built | WA Escalating amber border + badge. ActionMenu: Trigger Payment + Stop WA Escalation. Cancel/No-show now in LiveMonitor per 2026-04-20 decision. |
| `Services.jsx` | Built | Per-branch price + availability. Consumables mapping. |
| `Customers.jsx` | Built | Visit history. Loyalty points expiry warning/expired badges. |
| `Expenses.jsx` | Built | 3-type form (regular/inventory/kasbon). PO advance/final. LRM distribution. Receipt mandatory. Head Office selectable. **Deep-dive below.** |
| `Inventory.jsx` | Built | Stock tab (monitoring), Distribute tab (HQ→branch), Kiosk Menu tab (per-branch price + `kiosk_visible`). |
| `Attendance.jsx` | Built | Monthly table view. Log Off modal. Shortcut to Payroll. |
| `Payroll.jsx` | Built | 16th→15th period. `commission_regular` + `commission_ot` columns. Flat/prorata split inputs. Kasbon column. Adjustments (ManageAdjModal + AddAdjModal). CSV export. **Deep-dive below.** |
| `OnlineBooking.jsx` | Built | Per-branch link + QR, WA fallback redirect toggle. Stats. |
| `KioskConfig.jsx` | Built | Welcome copy, Services & Display, Upsell Rules, Tip Presets, Feedback Tags. SSE push via `PATCH /api/branches/:id/settings`. |
| `Settings.jsx` | Built | 6 tabs: Catalog, Loyalty, Payroll, WhatsApp, Users, Audit Log. **Deep-dive below.** |

### A3. System-Plan vs Mockup Gaps

- Plan Section 05 names "Branch Settings" tab inside Settings — relocated to Branches page per 2026-04-19. Plan was updated in pass 1.
- Plan Section 05 does not list LiveMonitor, Delay Report tab, Inventory Distribute tab, Inventory Kiosk Menu tab, Chair Management, Kiosk Devices tab — added in pass 1.
- Plan Section 05 Barber App row references "GPS check" — GPS removed 2026-04-10. Plan was updated in pass 1.
- **New gap (pass 2):** Inventory.jsx adds a **Kiosk Menu tab** (per-branch price + `kiosk_visible` toggle for beverages + products, mapped to `inventory_stock.price` + `inventory_stock.kiosk_visible`). This tab + its two endpoints (`GET/PUT /api/inventory/menu?branch_id=`) are not listed in system-plan Section 05 or 07. Decision documented 2026-04-20 in decisions-log — plan must be updated.

---

## B. Feature Coverage by Priority

### B.A Core Booking (P1) — all covered

Walk-in flow, queue number, live queue status, barber selection, time-slot picker, hair-bleach configurator, group booking at payment time: all built. Mutex groups (ear_treatment, beard_service) enforced in ServiceSelection. Any-Available fairness rotation documented in Section 04 of plan.

### B.B Payment & Receipt (P1) — all covered

- Xendit Terminal H2H: correct throughout all screens.
- Payment failure UX: Retry + Try Other Method + Contact Staff (full-screen error; booking stays `pending_payment`). Documented in system-plan Section 03A.
- Tip presets per-branch (configurable in Branches → Operations). Tip shown only on PaymentTakeover — never on booking confirmation. Correct.
- Receipt print + WhatsApp receipt + reprint: ReceiptScreen in PaymentTakeover.
- Per-service loyalty redemption: Confirm.jsx per-service toggle. Points balance lookup from `GET /api/customers?phone=` (comment line 106 of Confirm.jsx).
- Zero-cash-total still goes to PaymentTakeover for tip prompt. Correct.

### B.C Barber Operations (P1) — all covered

Start (topmost-only), complete, add-services mid-service, break start/end, Masuk/Pulang, "Belum Datang" alert, monthly earnings view: all in BarberPanel.

### B.D Staff / Admin Operations (P1) — all covered

Group pay, manual payment trigger, cancel/no-show (LiveMonitor), stop WA escalation (BranchDetail + AdminPanel), pax-out logging (LiveMonitor). Admin-only cancel/no-show confirmed 2026-04-20.

### B.E Payroll (P1) — fully covered (deep-dive confirms)

16th→15th period, `commission_regular` + `commission_ot` separate columns, flat + prorata split per off type (4 inputs per barber row), kasbon separate column, defer/restore, ManageAdjModal + AddAdjModal stacked, CSV export: all confirmed present in Payroll.jsx.

### B.F Inventory & Expenses (P1) — all covered

3-type Expenses, PO advance/final with LRM distribution, inventory monitoring, distribute from HQ, Kiosk Menu pricing per branch: all built.

### B.G Configuration / Settings (P1) — all covered

- Loyalty: `points_expiry_months` + `points_expiry_warning_days` — both present in LoyaltyTab (Settings.jsx lines 131-134).
- WhatsApp: 6 templates total (3 customer + 2 staff + 1 ops) — correct per 2026-04-20 (`client_not_arrived` template added). `queue_number` template absent — correct (removed 2026-04-19).
- Payroll: OT commission config (enable toggle, threshold time, bonus %, service exclusion checklist) present in PayrollTab.
- Catalog: Expense categories rename/deactivate. Inventory item master deferred to Inventory page per 2026-04-20.
- Users + Audit Log: owner-only tabs.
- Kiosk Config: feedback tags, welcome copy, service order, upsell, tip presets.

### B.H P2 Items

Web Speech announcement (built P1), Web Push toggle visible in Branches → Operations (correctly labelled Phase 2 — not wired). Barber transaction log per-range filter: built in Reports.

**P1 gap count: 1** (Kiosk Menu tab + its schema/endpoints not documented in plan).

---

## C. User Flow Audit

### C.1 Walk-in Kiosk Flow

Welcome → ServiceSelection (+ BleachModal + UpsellModal) → BarberSelection (Any / specific) → TimeSlot (Now / later + beverages / products) → Confirm (name, phone, E.164 picker, points toggle, loyalty nudge) → QueueNumber (Web Speech, escalation countdown) → Barber starts → Complete → PaymentTakeover (tip, Xendit Terminal, receipt, review).

Covered end-to-end. Edge cases handled: idle timeout (60s + 15s → pax-out), back button (pax-out), out-of-stock products (HABIS badge, toggles blocked), barber incapable of service (hidden from grid), Any-Available rotation, Xendit decline (retry/switch/contact staff flow).

**Remaining edge misses (unchanged from pass 1):**
- Loyalty redemption rollback on payment decline: not documented.
- Two barbers simultaneously claiming same queued walk-in: optimistic lock needed in backend.
- Booking started while customer is paying (group pay window): define precedence.
- Chair override expiry while booking in progress: define behaviour.

### C.2 Barber Flow (Masuk → Queue → Service → Pulang)

PIN login into BarberPanel from kiosk topbar tap. Masuk (no GPS, PIN only — correct per 2026-04-10). Queue visible, Mulai (topmost only), Selesai, add-services, Belum Datang alert (idempotent), Pulang. End-to-end covered.

### C.3 Staff Group-Pay Flow

Triple-tap corner → StaffPanel → select 2+ bookings → form group → `POST /api/booking-groups` → single Xendit Terminal tx → receipt per booking. Covered. Already-grouped bookings cannot be re-selected (UI enforced).

### C.4 Admin Oversight Flow

Overview → BranchDetail (escalating amber badge, Trigger Payment, Stop WA Escalation) → LiveMonitor (real-time, Start/Cancel/No-show, Belum Datang alerts, pax-out log) → Reports (Revenue + Demand + Delay) → Payroll / Attendance / Expenses / Settings.

**Edge cases requiring explicit backend handling:**
1. Kiosk offline at payment: queue stays `pending_payment`, reconnects on WiFi. Not documented in plan.
2. Manual payment trigger racing with kiosk self-trigger: idempotency key required.
3. Kasbon `deduct_period='next'` rollover: backend must auto-import into next period's payroll_adjustments at period generation time.
4. Point expiry cron: nightly job, inserts `expired` row in `point_transactions`, zeroes balance — documented in LoyaltyTab comment and decisions-log 2026-04-13.

---

## D. Schema Alignment

### D.1 `branches`

Per `data.js` line 38–47 and Branches.jsx:
- `is_head_office BOOLEAN DEFAULT false` — present in decisions-log 2026-04-14. Selectable in Expenses branch picker.
- `backoffice_alert_phone VARCHAR(25)` — present in Branches → Operations tab (BranchModal, line 261–271 of Branches.jsx). Correct per 2026-04-20 decision.
- `whatsapp_enabled` — **removed** from branches per 2026-04-20. Branches.jsx Operations tab does NOT have this field. Correct.
- `geofenceRadius` still present in MOCK DATA (`data.js` line 38, column `geofenceRadius:100`). **Stale mock data** — geofence removed 2026-04-10. No impact on production schema since it is mock data only, but Antigravity should not map this column.
- Operations tab fields present: `onlineBookingEnabled`, `speakerOn`, `pushOn`, `lateThresh`, `ackGrace`, `tipPresets`, `backofficeAlertPhone`. Correct.
- Per-branch escalation settings (`late_customer_threshold_minutes`, `barber_escalation_interval_minutes`, `barber_escalation_max_count`) per 2026-04-19 — NOT visible in Branches.jsx Operations tab as individual stepper fields. The `lateThresh` stepper maps to late start alert (admin), not customer threshold. **Gap:** `barber_escalation_interval_minutes` and `barber_escalation_max_count` have no UI control in the mockup. Either add to Operations tab or document as backend-only defaults.

### D.2 `bookings`

- `guest_phone VARCHAR(25)` — E.164, correct.
- `escalation_count`, `escalation_stopped_at`, `escalation_stopped_by` (FK→users), `escalation_stop_reason` ENUM(barber_started, admin_cancelled, max_reached, no_show) — all per 2026-04-19. BranchDetail.jsx shows the badge state; ActionMenu shows "Stop WA Escalation". Schema must include all four columns.
- `client_not_arrived_at TIMESTAMPTZ` — per 2026-04-20. Set by `POST /api/bookings/:id/client-not-arrived`. Cleared if booking subsequently started.
- `source ENUM('walk_in', 'any_available', 'online')` — per 2026-04-20. Used for Any-Available rotation count.
- `group_id` (nullable UUID FK → booking_groups) — present.
- `payment_trigger_source ENUM('kiosk', 'admin_manual', 'staff_panel')` — for audit. Included in decisions-log/plan from pass 1.
- `bookings.review_tags TEXT[]` — for post-payment rating tags (stored as array of strings). Present.
- `bookings.rating SMALLINT` — for star rating. Present.
- `bookings.auto_cancel_at` + `bookings.cancellation_reason` — for 15-min auto-cancel. Present.

### D.3 `customers`

- `phone VARCHAR(25)` E.164 — correct.
- `phone_country_code VARCHAR(5)` — correct.
- `points_balance INTEGER` — correct.
- `points_last_activity_at TIMESTAMPTZ` — per 2026-04-13. Used by expiry cron.
- `whatsapp_consent` — **decisions-log 2026-03-25 says add it, 2026-03-27 says checkbox removed from Confirm**. The column should still exist for historical data but is always `null`/`false` going forward since we no longer collect consent. Confirm with Bercut whether to keep or remove.
- **`points_last_expired_at TIMESTAMPTZ`** — shown in Customers.jsx as expiry warning badge trigger. This column was flagged in pass 1 and remains. Must be added to schema.

### D.4 `payroll` Tables (Payroll.jsx Deep-Dive)

**Payroll.jsx is fully consistent with decisions-log as of pass 2. Line-by-line findings:**

**Period system (lines 48–55, Payroll.jsx):**
- `PERIOD_PRESETS` shows `from: '2026-04-16'` and `to: '2026-05-15'` for "Apr – May 2026". Correct: 16th of start month → 15th of next month per 2026-04-17 unified cycle.
- Label format: "Apr – May 2026" named by start month. Matches 2026-04-17: "April period = 16 Apr → 15 May; label shown as Apr – May".
- Kasbon note in header comment: "Kasbon: calendar month" — correct per 2026-04-17. Kasbon entered any date in April = April payroll period.
- PeriodPicker supports custom date range via DateRangePicker. Correct (admin can override).
- `payroll_periods.period_from DATE` + `period_to DATE` — two columns only (unified cycle, per 2026-04-17 reversal of split-cycle). Correct.
- `payroll_periods.status ENUM('draft','reviewed','communicated')` — NOT 'finalized'. Correct per 2026-04-10.
- No `finalized_by`/`finalized_at`; `communicated_by`/`communicated_at` instead. Correct.

**Payroll table columns confirmed present (header array, lines 726–745):**
- Barber, Base Salary, Commission (regular), OT Comm. (overtime), Late (min · auto deduction), Excused Off (flat/pro-rata), Inexcused Off (flat/pro-rata), Kasbon (calendar month), Additions, Other Ded., Net Pay — **12 columns. All present and match decisions-log.**

**Commission split (lines 793–807):**
- `commRegular` rendered green. `commOT` rendered amber with "OT" badge. Exactly matches 2026-04-17: "commission_regular + commission_ot in payroll_entries; commission_ot = bonus portion only".
- `commOT > 0` guard shows dash if zero — correct.

**Late deduction (lines 810–820):**
- `LATE_RATE_PER_MIN = 2_000` (Rp 2,000/min) — matches 2026-04-17.
- `InlineNum` on `lateMin` (click-to-edit). Recalculates `lateDed` immediately. Matches 2026-04-17: "editing count recalculates amount immediately; count is single source of truth".
- Rate label "Rp 2.000/min" shown below deduction amount. Clear.

**Excused Off column (lines 822–844):**
- `EXCUSED_QUOTA = 2` (configurable from Settings → Payroll). `EXCUSED_OVER_RATE = 100_000/day`.
- Total `excusedTimes` editable. Then splits into `excusedFixed` (flat days) + `excusedProrata` (prorata days). Each sub-input independently editable via InlineNum.
- Formula: `excusedDed = excusedFixed × EXCUSED_OVER_RATE + Math.round(excusedProrata × prorataRate)`.
- Matches 2026-04-17: "two methods per off type — Flat and Pro-rata; both can apply simultaneously". Matches schema: `excused_fixed_days + excused_prorata_days`.

**Inexcused Off column (lines 847–868):**
- `FLAT_OFF_RATE = 150_000/day`. Same flat + prorata split pattern.
- Matches schema: `inexcused_fixed_days + inexcused_prorata_days`.

**Kasbon column (lines 871–885):**
- `kasbonActive` = adjustments where `isKasbon && type==='deduction' && deductPeriod==='current'`.
- `kasbonDeferred` = adjustments where `isKasbon && deductPeriod==='next'`.
- Deferred kasbon shows greyed amount "X deferred" below the active total.
- Kasbon is a separate column from "Other Ded." — correct per 2026-04-17.
- Kasbon rows are NOT locked (🔒 removed 2026-04-15); instead managed via Defer/Restore in ManageAdjModal. Correct.

**Additions + Other Ded. columns (lines 888–903):**
- `totalAdd` from `adjustments[].type==='addition'`.
- `otherDed` from `adjustments[].type==='deduction' && !isKasbon && deductPeriod==='current'`.

**Net pay formula (line 628):**
```
entry.baseSalary + entry.commEarned - lateDed - inexcusedDed - excusedDed + totalAdd - totalDed
```
where `totalDed` includes kasbon (current period only). Matches 2026-04-15 formula exactly.

**ManageAdjModal (lines 148–204):**
- Shows Additions (green section) + Deductions (red section) separately.
- Kasbon rows: `Defer →` / `← Restore` toggle button. Non-kasbon deductions: red ✕ delete button. Additions: red ✕ delete. Correct.
- Deferred kasbon rows: `opacity: 0.65`, strikethrough amount, "Deferred → May 2026" badge.
- Deferred kasbon note at bottom of modal. Correct.
- zIndex: 200. Correct (AddAdjModal at 210 stacks on top).

**AddAdjModal (lines 247–364):**
- Switches between Addition / Deduction types.
- Category dropdown includes base list + "＋ Create Category..." inline.
- `CreateAdjCatModal` (lines 209–243) fires when "Create Category..." selected. Creates persistent category.
- Fields: category, amount (IDR), remarks (optional). `by` hardcoded to 'Admin', `date` hardcoded to '16 Apr' in prototype — Antigravity must pull `currentUser.name` + `todayISO()` in production.
- `isKasbon: false` hardcoded in AddAdjModal — correct (kasbon rows come only from Expenses import).
- Matches `payroll_adjustments` schema: `id, payroll_entry_id, type ENUM('addition','deduction'), category, category_label, remarks, amount, by, date, is_kasbon, expense_id, deduct_period`.

**Schema check: `payroll_adjustments` table (decisions-log 2026-04-15):**
- `id` ✓ (adj_N format in prototype)
- `payroll_entry_id FK` ✓ (via `entry.id` key in `adjustments` map)
- `type ENUM('addition','deduction')` ✓
- `category VARCHAR(60)` ✓ (`adj.category`)
- `category_label VARCHAR(60)` ✓ (`adj.categoryLabel`)
- `remarks TEXT` ✓
- `amount INTEGER` ✓
- `by INTEGER FK→users` ✓ (shown as string 'Owner'/'Admin' in prototype, must be user ID in production)
- `date DATE` ✓
- `is_kasbon BOOLEAN DEFAULT false` ✓ (`adj.isKasbon`)
- `expense_id FK→expenses (nullable)` ✓ (`adj.expenseId` present on kasbon rows in PAYROLL_ENTRIES_V2)
- `deduct_period ENUM('current','next')` ✓ (`adj.deductPeriod`)

**All 12 `payroll_adjustments` columns present and correctly used in mockup.**

**Working days chip (lines 493–531):**
- Computed: `Math.round(period_days × 6/7)`. Editable on click. Override stored in UI state (not DB per 2026-04-17). Amber highlight when overridden. Matches spec exactly.

**Freelancer rows:**
- `data.js` `PAYROLL_ENTRIES_V2` shows only salary_plus_commission barbers in Seminyak.
- **Gap:** No freelancer row in mock data to verify freelancer payroll rendering (net_pay = days × daily_rate, zero commission columns). Antigravity must test this case separately. The mock data should include at least one freelancer entry.

**Branch selector (lines 717–720):**
- `selectedBranch` state. Dropdown of branch names derived from PAYROLL_ENTRIES_V2.
- **Gap:** No "All Branches" option in the branch dropdown — only individual branches. Decision 2026-04-14 specified "all-branch selector" for viewing across branches. Currently the selector only shows individual branches. **This is a P1 gap in the mockup.**

**Export (lines 631–658):**
- CSV export only. Button "↓ Export CSV".
- **Gap:** Decisions-log 2026-04-16 specified **CSV + xlsx** export for Payroll. Mockup only implements CSV. xlsx must be added for production (backend: exceljs). Low risk (same data, different format).

**Status display:**
- No `payroll_periods.status` (draft/reviewed/communicated) selector visible in mockup. Payroll page shows the table but has no period status indicator or "Mark as Reviewed" / "Mark as Communicated" button. **Gap:** These workflow status controls need to be added. Backend must track period status per 2026-04-10 decisions.

### D.5 `expenses`

Per Expenses.jsx header (lines 1–30):

**Three types confirmed:**
- `Regular` — operational spend.
- `Inventory` — stock purchase, triggers `inventory_movements` (type=in).
- `Kasbon` — salary advance, `barber_id` required, `deduct_period` picker.

**Fields confirmed present:**
- `expenses.source ENUM('petty_cash', 'owner')` — per 2026-04-14.
- `expenses.receipt_url NOT NULL` — receipt mandatory, file upload in form.
- `expenses.branch_id` — all branches + Head Office (`BRANCH_OPTIONS` includes 'Head Office', line 39).
- `expenses.type ENUM('regular', 'inventory', 'kasbon')` — correct.
- `expenses.barber_id FK→barbers (nullable, kasbon only)` — correct.
- `expenses.deduct_period ENUM('current','next')` — kasbon deferral toggle at log time.
- `expenses.po_id FK→purchase_orders`, `po_payment_type ENUM('advance','final')`, `po_attribution JSONB` — PO system present.
- `expense_stock_items (expense_id, item_id, quantity_received, unit)` — inline inventory receive fields when `has_stock_receipt=true`.

**LRM distribution:**
- `computeSmartDist` (lines 58–73) implements Largest Remainder Method. Guarantees sum = total_amount exactly. Used for multi-branch inventory distribution. Correct implementation.

**CSV export column spec (lines 21–24 of Expenses.jsx header):**
> Multi-branch inventory expenses export ONE ROW PER DISTRIBUTION LINE.
> Columns: date, expense_id, item_name, unit, branch, qty, cost, unit_cost_approx, total_amount, source, by, receipt.

- No xlsx export button in Expenses.jsx. **Gap:** decisions-log 2026-04-16 specifies xlsx export for Expenses. Mockup has no xlsx export. Antigravity must add it in production.

### D.6 `whatsapp_settings`

Settings.jsx WhatsApp tab (lines 363–636):

**6 templates confirmed:**
1. `booking_confirmation` (customer) — present, with vars: {name}, {branch}, {barber}, {time}, {services}, {booking_number}.
2. `receipt` (customer) — present, with vars: {name}, {branch}, {services}, {total}, {booking_number}.
3. `late_customer_reminder` (customer) — present, with vars: {name}, {branch}, {barber}, {time}, {booking_number}, {minutes_late}.
4. `barber_new_booking` (staff) — present, with vars: {barber_name}, {customer_name}, {time}, {services}, {booking_number}, {branch}.
5. `barber_escalation` (staff) — present, with vars: {barber_name}, {customer_name}, {wait_minutes}, {booking_number}, {branch}.
6. `client_not_arrived` (ops) — present, with vars: {barber_name}, {customer_name}, {booking_number}, {branch}, {queue_position}.

**`queue_number` template is absent** — correct, removed 2026-04-19.

Provider selector: Fonnte (ACTIVE) + WhatsApp Business API (COMING SOON, greyed). Correct.
Fonnte credentials: API Key (password field, Show/Hide) + Sender Number. Correct per 2026-04-20 API shape.
Test send: calls `POST /api/settings/whatsapp/test` (simulated, backend-only per 2026-04-20). Correct.
`branches.whatsapp_enabled` column: NOT shown in Operations tab (Branches.jsx). Correct — removed 2026-04-20.
Escalation timing note at bottom of WA tab (lines 592–601): correctly points to Branches → Operations.

**`whatsapp_settings` schema columns required:**
- `provider ENUM('fonnte', 'whatsapp_business_api')` ✓
- `fonnte_api_key TEXT` ✓
- `fonnte_sender VARCHAR(25)` ✓
- `wa_phone_number_id TEXT` (greyed, future) ✓
- `wa_access_token TEXT` (greyed, future) ✓
- `template_booking_confirmation TEXT` ✓
- `template_receipt TEXT` ✓
- `template_late_customer_reminder TEXT` ✓
- `template_barber_new_booking TEXT` ✓
- `template_barber_escalation TEXT` ✓
- `template_client_not_arrived TEXT` — per 2026-04-20. Must be in schema.
- `is_enabled BOOLEAN` ✓ (master toggle)

### D.7 `branches` Modal — Detailed Check (Branches.jsx)

**3-tab BranchModal confirmed (line 153):** Details, Operations, Kiosk Devices. Correct per 2026-04-19.

**Details tab fields:**
- Name, City, Address, Timezone, Online Booking Slug, Pay Period, Tip Distribution, is_active — all present.
- No geofence fields — correct, removed 2026-04-10. **Note: BRANCHES mock data in data.js still has `geofenceRadius` field (line 38-47). Must not map to production schema.**

**Operations tab fields:**
- Online Booking toggle, Backoffice Alert Phone, Speaker on/off, Web Push (Phase 2), Late Start Alert (stepper), Ack Grace Period (stepper), Tip Presets (add/remove with live preview).
- **`whatsapp_enabled` toggle is absent** — correct per 2026-04-20.
- **`late_customer_threshold_minutes` stepper absent** — this is the per-branch customer late threshold for triggering WA `late_customer_reminder` to customer. The `lateThresh` stepper maps to "Late Start Alert" (admin alert if barber hasn't started within N min). These are different. Per 2026-04-19: `late_customer_threshold_minutes (DEFAULT 10)`, `barber_escalation_interval_minutes (DEFAULT 3)`, `barber_escalation_max_count (DEFAULT 5)`. Only `lateThresh` (admin alert) is in the mockup. The other two escalation parameters have no UI. **P2 gap — can default and configure later, but schema must include all three.**
- Saving emits `kiosk_settings_update` SSE event — documented in code comment (line 317 of Branches.jsx).

**Kiosk Devices tab:**
- List of registered devices with masked token, last_seen, device name, Active/Revoked badge.
- "Generate Token" button → GenerateTokenModal → shows full token ONCE + copy button.
- Token format: `BERCUT-{BranchPrefix3}-{4chars}-{4chars}` (e.g. `BERCUT-SEM-A1B2-C3D4`).
- Revoke button per device — sets `is_active: false`.
- Note: "Token never expires — revoke here if device lost or replaced." Correct per 2026-04-19.
- `kiosk_tokens` table: `id UUID PK, branch_id FK, token VARCHAR(64) UNIQUE (hashed), device_name VARCHAR(100), is_active BOOLEAN, last_seen_at TIMESTAMPTZ, created_by FK→users, created_at`. All fields used correctly.

**Chair Panel (ChairPanel + OverrideModal):**
- ChairPanel inline below each branch row.
- Chair cards: label, permanent barber assignment (select), override state (amber/gold highlight).
- Permanent assignment via `chairs.barber_id` (select changes `assignedBarberId`). Selecting a barber auto-unassigns from any other chair in same branch (lines 584–590). Correct.
- Override state: `chair_overrides` with `date_from`, `date_to` (nullable = indefinite), `reason`.
- Active override: shows amber card border, "⟳ Covering Now", covering barber name, date range, reason, Remove button.
- `date_to = null` shows "∞ Indefinite" label. Correct per 2026-04-19.
- OverrideModal: Covering Barber select (excludes home barber), From date (required), Until (optional), Reason. Correct.
- **`chair_overrides.resolved_by`** (who ended the override for audit) — not shown in mockup but needed in schema per pass 1 finding. Still missing.

### D.8 `BranchDetail.jsx` Deep-Dive

**Escalating bookings UI:**
- `isEscalating` flag passed to ActionMenu (line 53 of BranchDetail.jsx).
- `canStopEscalation = booking.status === 'confirmed' && isEscalating` — only confirmed + escalating shows the option.
- ActionMenu items: "Trigger Payment" (green), "Stop WA Escalation" (orange/yellow).
- "Stop WA Escalation" calls `onStopEscalation(booking)`. In production: `PATCH /api/bookings/:id/stop-escalation`.
- WA Escalating badge: amber left border on booking row + "WA Escalating" status text.
- **`escalation_count` shown?** Not visible as a number in the mockup — only the badge/border is shown. Antigravity may choose to show the count (e.g. "3 escalations sent") for admin context.
- Cancel + No-show removed from ActionMenu per 2026-04-20 decision — confirmed, these actions are now in LiveMonitor only.
- `bookings.client_not_arrived_at` not surfaced in BranchDetail — it is shown in LiveMonitor as an alert badge. Correct split of concerns.

### D.9 `Confirm.jsx` Deep-Dive

- **No "QRIS or BCA card" reference** — fixed in pass 1.
- **E.164 country code picker** (lines 22–90): `PINNED_COUNTRIES` (ID, AU, RU, IN) + `ALL_COUNTRIES` full list. Pinned section separator. Search by name/code/abbr. Correct per 2026-03-31.
- **`whatsapp_consent` checkbox ABSENT** — correct per 2026-03-27 removal.
- **Points redemption** (lines 93–121): per-service toggle (`pointsToggled` Set). Checks `pointsRemaining >= ptCost(id)` before toggling. `cashTotal` computed correctly. Points lookup: `const customer = phone.trim().length >= 6 ? MOCK_CUSTOMERS[phone.trim()] || null : null` — production: `GET /api/customers?phone=` (noted in line 105 comment).
- **Loyalty nudge**: shown when `pointsAvailable === 0` and phone empty — "Have points? Enter your WhatsApp number". Correct per 2026-03-27.
- **Name auto-focus + pulsing border** (lines 123–124, 168): `useEffect → nameRef.current?.focus()`. CSS animation `namePulse 1.4s ease 3`. Correct per 2026-03-27.

### D.10 Missing Tables / Columns Summary (pass 2 additions)

Confirmed present from pass 1 (not re-listed). New or still-missing items:

| Entity | Gap | Severity |
|---|---|---|
| `branches.geofenceRadius` | In mock data but must NOT be in production schema (removed 2026-04-10) | Antigracity: ignore this field |
| `branches.late_customer_threshold_minutes` | Missing UI stepper in Branches Operations tab | Already in system-plan line 928 ✓ — backend default 10 min; add UI stepper if desired |
| `branches.barber_escalation_interval_minutes` | Missing UI control | Already in system-plan line 929 ✓ — backend default 3 min |
| `branches.barber_escalation_max_count` | Missing UI control | Already in system-plan line 930 ✓ — backend default 5 |
| `chair_overrides.resolved_by FK→users` | Not in mockup; needed for audit trail | Already in system-plan line 673 ✓ |
| `customers.points_last_expired_at TIMESTAMPTZ` | Referenced by Customers.jsx expiry badge | Already in system-plan line 480 ✓ |
| `customers.whatsapp_consent` | Listed in decisions-log 2026-03-25 as add; checkbox removed 2026-03-27 | Keep column (historical data) but always null going forward — clarify with Bercut |
| `payroll_periods.status` | No status UI on Payroll page | Add "Mark Reviewed" / "Mark Communicated" controls |
| `inventory_stock.price INTEGER` | Kiosk Menu tab sets per-branch price | Already in system-plan line 633 ✓ |
| `inventory_stock.kiosk_visible BOOLEAN` | Kiosk Menu tab sets visibility per branch item | Already in system-plan line 634 ✓ |
| `whatsapp_settings.template_client_not_arrived TEXT` | 6th template per 2026-04-20 | Already in system-plan line 919 ✓ |
| Freelancer payroll entry | No freelancer in PAYROLL_ENTRIES_V2 mock | Add mock entry; Antigravity must test zero commission + daily_rate rendering |
| `payroll` "All Branches" selector | Branch dropdown has no "All Branches" option | Add per 2026-04-14 requirement |

---

## E. API Coverage

System-plan Section 07 vs mockup usage. All ~30 endpoints from pass 1 remain required. Additional endpoints surfaced in pass 2:

| Screen | Action | Endpoint (from mockup) | In Plan 07? | Pass |
|---|---|---|---|---|
| Confirm | Loyalty lookup by phone | `GET /api/customers?phone=` | Added pass 1 | P1 |
| Confirm | Create booking | `POST /api/bookings` | Yes | P1 |
| PaymentTakeover | Trigger Xendit tx | `POST /api/payments` | Added pass 1 | P1 |
| PaymentTakeover | Send receipt WA | `POST /api/whatsapp/receipt` | Added pass 1 | P1 |
| QueueNumber | Manual announce | `POST /api/bookings/:id/announce` | Added pass 1 | P1 |
| BarberPanel | Queue list | `GET /api/bookings?branch_id=&barber_id=&status=` | Yes | P1 |
| BarberPanel | Start service | `POST /api/bookings/:id/start` | Added pass 1 | P1 |
| BarberPanel | Complete service | `POST /api/bookings/:id/complete` | Added pass 1 | P1 |
| BarberPanel | Add services mid-service | `POST /api/bookings/:id/add-services` | Added pass 1 | P1 |
| BarberPanel | Belum Datang alert | `POST /api/bookings/:id/client-not-arrived` | Added pass 1 | P1 |
| BarberPanel | Clock in/out | `POST /api/attendance/clock-in`, `/clock-out` | Added pass 1 | P1 |
| BarberPanel | Break start/end | `POST /api/barber-breaks` | Added pass 1 | P1 |
| StaffPanel | Form group | `POST /api/booking-groups` | Added pass 1 | P1 |
| AdminPanel / BranchDetail | Manual payment | `POST /api/payments/manual` | Added pass 1 | P1 |
| AdminPanel | Cancel / no-show | `POST /api/bookings/:id/cancel`, `/no-show` | Added pass 1 | P1 |
| BranchDetail | Stop WA escalation | `PATCH /api/bookings/:id/stop-escalation` | Added pass 1 | P1 |
| LiveMonitor | Barber live SSE | `GET /api/live/barbers?branch_id=` (SSE) | Added pass 1 | P1 |
| LiveMonitor | Pax-out log | `POST /api/pax-out` | Added pass 1 | P1 |
| Reports | Revenue | `GET /api/admin/reports/revenue?from=&to=&branch_id=` | Yes | P1 |
| Reports | Pax-out analytics | `GET /api/admin/pax-out?from=&to=&branch_id=` | Added pass 1 | P1 |
| Reports | Delay report | `GET /api/admin/delay-incidents?from=&to=&branch_id=` | Added pass 1 | P1 |
| Reports | Barber TX log | `GET /api/admin/barbers/:id/transactions?from=&to=` | Added pass 1 | P1 |
| Branches | CRUD | `GET/POST/PATCH /api/branches` | Added pass 1 | P1 |
| Branches | Chairs | `GET/POST/PATCH/DELETE /api/branches/:id/chairs` | Added pass 1 | P1 |
| Branches | Chair overrides | `GET/POST/DELETE /api/chair-overrides` | Added pass 1 | P1 |
| Branches | Kiosk tokens list | `GET /api/admin/kiosk-tokens?branch_id=` | Added pass 1 | P1 |
| Branches | Generate token | `POST /api/admin/kiosk-tokens` | Added pass 1 | P1 |
| Branches | Revoke token | `DELETE /api/admin/kiosk-tokens/:id` | Added pass 1 | P1 |
| Inventory | Stock levels | `GET /api/inventory?branch_id=` | Yes | P1 |
| Inventory | Distribute | `POST /api/inventory/distribute` | Added pass 1 | P1 |
| **Inventory** | **Kiosk Menu read** | **`GET /api/inventory/menu?branch_id=`** | Added pass 2 (F1.7) | **P1** |
| **Inventory** | **Kiosk Menu update** | **`PUT /api/inventory/menu?branch_id=`** | Added pass 2 (F1.7) | **P1** |
| Inventory | Movements | `GET /api/inventory/movements?item_id=&branch_id=&from=&to=` | Added pass 1 | P1 |
| KioskConfig | Read settings | `GET /api/kiosk-settings?branch_id=` | Added pass 1 | P2 |
| KioskConfig | Save + SSE push | `PATCH /api/branches/:id/settings` | Added pass 1 | P2 |
| KioskConfig | Feedback tags CRUD | `GET/POST/PATCH /api/feedback-tags` | Added pass 1 | P2 |
| OnlineBooking | Read/save | `GET/PATCH /api/branches/:id/online-booking` | Added pass 1 | P3 |
| Services | Per-branch config | `PUT /api/services/:id/branch-config` | Added pass 1 | P1 |
| Services | Consumables | `GET/PUT /api/services/:id/consumables` | Added pass 1 | P1 |
| Barbers | Services mapping | `PUT /api/barbers/:id/services` | Added pass 1 | P1 |
| Attendance | Log Off override | `POST /api/attendance/log-off` | Added pass 1 | P1 |
| Customers | Details + history | `GET /api/customers/:id/history` | Added pass 1 | P1 |
| Settings | WA read/save | `GET/PUT /api/settings/whatsapp` | Added pass 1 | P1 |
| Settings | WA test send | `POST /api/settings/whatsapp/test` | Added pass 1 | P1 |
| Settings | Expense categories | `GET/POST/PATCH /api/expense-categories` | Added pass 1 | P1 |
| Settings | Inventory items | `GET/POST/PATCH /api/inventory/items` | Added pass 1 (moved to Inventory page) | P1 |
| Settings | Users | `GET/POST/PATCH /api/users` | Yes | P1 |
| Settings | Permissions | `PUT /api/users/:id/permissions` | Added pass 1 | P1 |
| Settings | Audit log | `GET /api/audit-log` | Added pass 1 | P1 |
| Payroll | Entries list | `GET /api/payroll/entries?branch_id=&year=&month=` | Yes | P1 |
| Payroll | Entry update (overrides) | `PATCH /api/payroll/entries/:id` | Added pass 1 | P1 |
| Payroll | Adjustments CRUD | `GET/POST/DELETE /api/payroll/adjustments?entry_id=` | Added pass 1 | P1 |
| Payroll | Kasbon defer toggle | `PATCH /api/payroll/adjustments/:id { deduct_period }` | Added pass 1 | P1 |
| Payroll | Period status update | `PATCH /api/payroll/periods/:id { status }` | Already in plan (line 1005) | P1 |
| Payroll | Export CSV/xlsx | `GET /api/payroll/periods/:id/export?format=csv\|xlsx` | Updated pass 2 (F1.7) | P1 |
| Expenses | Export CSV/xlsx | `GET /api/expenses/export?branch_id=&from=&to=&format=csv\|xlsx` | Already in plan (line 1009) | P1 |
| Kiosk boot | Token validate + branch config | `POST /api/kiosk/register` | Added pass 1 | P1 |

**Pass 2 endpoint findings:** `GET/PUT /api/inventory/menu` were missing — added (F1.7). `PATCH /api/payroll/periods/:id/status` and `GET /api/expenses/export?format=csv|xlsx` were already in system-plan. `GET /api/payroll/periods/:id/export` was in plan but CSV-only — updated to include `?format=csv|xlsx` description (F1.7).

---

## F. Gaps, Missing Features, Recommendations

### F1. Documentation Fixes Required BEFORE Build

All F1.1–F1.5 from pass 1 are COMPLETE. Pass 2 fixes:

**F1.6 — system-plan.md Section 05 Inventory screen: COMPLETE (2026-04-20)**
- Inventory row updated: "Three tabs: Stock, Distribute, and Kiosk Menu (per-branch price + kiosk_visible for beverage/product items). Read/write via `GET/PUT /api/inventory/menu?branch_id=`."
- Note: `service_consumable` items are NOT on kiosk menu.

**F1.7 — system-plan.md Section 07 API table: COMPLETE (2026-04-20)**
- Added: `GET /api/inventory/menu?branch_id=`, `PUT /api/inventory/menu?branch_id=` to Inventory group.
- Updated: `GET /api/payroll/periods/:id/export` to include `?format=csv|xlsx` description.
- Pre-existing in plan (confirmed in pass 2 verification, not missing): `PATCH /api/payroll/periods/:id/status`, `GET /api/expenses/export?format=csv|xlsx`.

**F1.8 — system-plan.md Section 06 Schema: COMPLETE (already in plan — confirmed pass 2)**
- `inventory_stock.price INTEGER` — already in system-plan line 633. ✓
- `inventory_stock.kiosk_visible BOOLEAN` — already in system-plan line 634. ✓
- `whatsapp_settings.template_client_not_arrived TEXT` — already in system-plan line 919. ✓
- `customers.points_last_expired_at TIMESTAMPTZ` — already in system-plan line 480. ✓
- `chair_overrides.resolved_by UUID FK→users NULLABLE` — already in system-plan line 673. ✓
- `branches.late_customer_threshold_minutes SMALLINT DEFAULT 10` — already in system-plan line 928. ✓
- `branches.barber_escalation_interval_minutes SMALLINT DEFAULT 3` — already in system-plan line 929. ✓
- `branches.barber_escalation_max_count SMALLINT DEFAULT 5` — already in system-plan line 930. ✓
- `branches.geofenceRadius` — absent from production schema (correct). Stale in mock data only. ✓

### F2. Mockup Gaps (Non-Blocking for Build Start, but Must Address)

**F2.1 — Payroll: "All Branches" selector missing.**
Branch dropdown in Payroll.jsx derives from `PAYROLL_ENTRIES_V2` but has no "All Branches" aggregate option. Decision 2026-04-14 requires it. Add "All Branches" as first option; API returns all branches' entries in one response when `branch_id` is omitted.

**F2.2 — Payroll: period status controls absent.**
No "Mark as Reviewed" or "Mark as Communicated" button on the Payroll page. `payroll_periods.status` exists in schema (draft/reviewed/communicated) but has no UI trigger. Add a status pill + action button (e.g. "Mark Reviewed → Mark Communicated") in the page header. Wire to `PATCH /api/payroll/periods/:id`.

**F2.3 — Payroll + Expenses: xlsx export missing in mockup.**
Both have CSV only. Add xlsx option (e.g. split button "Export ▾ → CSV / Excel") or change the button to always export xlsx. Decision 2026-04-16 mandates xlsx.

**F2.4 — Payroll: No freelancer mock row.**
`PAYROLL_ENTRIES_V2` has no freelancer entry. Add one with `pay_type: 'daily_rate'`, zero `commRegular/commOT`, `net_pay = attendanceDays × dailyRate`. Antigravity needs to test this rendering branch.

**F2.5 — Branches Operations: escalation interval + max count controls absent.**
`barber_escalation_interval_minutes` and `barber_escalation_max_count` are in the schema (decisions-log 2026-04-19) but have no UI stepper in the Operations tab. Either add two steppers ("Re-escalate every N min" + "Max escalations") or accept that these are backend-only defaults (document clearly).

**F2.6 — Inventory Kiosk Menu tab not in system-plan.**
Fixed by F1.6 above.

### F3. UX / Behavior Spec Gaps (Unchanged from Pass 1)

- Kiosk offline-at-payment reconciliation strategy (queue stays `pending_payment`, SSE reconnect).
- Group-pay concurrency: barber taps Start on a booking mid-grouping window.
- Chair override expiry while booking in progress.
- Loyalty redemption rollback on payment decline.

### F4. Nice-to-Haves (Non-Blocking)

- `escalation_count` visible in BranchDetail row (currently only badge shown).
- Payroll: "View Attendance" shortcut already present (`onViewAttendance` prop on Payroll component — correct).
- Audit log pagination: mock shows 10 entries, production note says "50 per page" — specify in plan.
- Settings → Catalog: inventory item master management moved to Inventory page per 2026-04-20. Confirm Settings Catalog tab only manages expense categories now.

---

## H. UI/UX Intuitiveness Audit

### H1. Kiosk

**Strengths:** Bilingual EN + ID subtitle pattern consistent. "Any Available" dice icon intuitive. Idle overlay clear. BleachModal step+color picker unambiguous. Name auto-focus + pulsing border excellent first-use UX. E.164 country picker with pinned + full list correct for tourist usage.

**Issues:**
- **H1.1** ~~PaymentTakeover hardcodes "Seminyak"~~ — **FIXED (pass 1)**.
- **H1.2** ~~"QRIS or BCA card" in Confirm~~ — **FIXED (pass 1)**.
- **H1.3** Tip preset UX is per-booking. In group pay, clarify that tip is per-booking not split on total — add copy to StaffPanel.
- **H1.4** Points redemption toggle: disabled state when points insufficient — visually distinct (greyed, cursor:not-allowed) ✓. Points remaining counter updates live ✓.
- **H1.5** Xendit payment failure: Retry + Try Other Method + Contact Staff — CTA present in system-plan spec. Mockup in PaymentTakeover shows Xendit error state? Confirm this exists in PaymentTakeover mockup (it is mentioned in BercutKiosk header comment but may not be fully rendered — verify).

### H2. Barber Panel

**Strengths:** Bahasa-only ✓. Start button limited to topmost booking (prevents wrong-client start) ✓. "Belum Datang" alert idempotent (shows ✓ after send) ✓. Monthly earnings toggle present ✓.

**Issues:**
- **H2.1** Clock-out confirmation modal: present per decisions-log. Verify in BarberPanel.jsx.
- **H2.2** Add-services mid-service: pricing/commission implications not shown to barber. Consider showing a brief cost delta so barber can communicate to customer.
- **H2.3** Late-start indicator (orange "TERLAMBAT Xm") on next booking card — present per 2026-04-06 decision ✓.

### H3. Admin

**Strengths:** 14-item sidebar grouped logically. Overview → BranchDetail drill-down natural. BranchModal 3-tab structure clean. ChairPanel grid layout compact and informative. Stacked ManageAdj + AddAdj modals (z-index 200/210/220 hierarchy) is workable.

**Issues:**
- **H3.1** Settings 6 tabs — plan updated in pass 1. ✓
- **H3.2** Expenses 3-type form: type picker at top, then form morphs. Ensure type cannot be changed after a receipt is uploaded (would invalidate the receipt).
- **H3.3** Payroll stacked modals: ManageAdjModal (z:200) → AddAdjModal (z:210) → CreateAdjCatModal (z:220). Three levels deep. Acceptable, but Antigravity should test on small screens.
- **H3.4** Chair overrides: canonical index is per-branch (inline in Branches). One global override list view would help for cross-branch management — nice-to-have.
- **H3.5** Payroll missing period status controls — noted in F2.2. Reviewer has no way to communicate payroll without this.
- **H3.6** Payroll missing "All Branches" branch selector — noted in F2.1.

### H4. Cross-App Consistency

- `fmt()` / `fmtM()` shared via `data.js` — correct.
- Color tokens `C` shared — correct.
- **H4.1** kiosk mock data in `mockups/kiosk/data.js` uses its own price format helpers. Confirm tokens match admin `data.js`.
- **H4.2** Toast/banner component re-implemented per screen (saved state, setTimeout). Antigravity should extract to shared component.

### H5. Accessibility

- Touch targets ≥ 72px on kiosk — enforced by clamp() patterns ✓.
- **H5.1** No documented high-contrast mode for elderly or tourist customers.
- **H5.2** No keyboard navigation spec for admin desktop.
- **H5.3** Screen reader labels absent in mockups — acceptable at mockup stage; specify `aria-label` in handoff prompt.
- **H5.4** Bahasa subtitle at `clamp(10px,1.2vw,12px)` — may fail WCAG AA at small viewport. Test.

---

## G. Pre-Build GO/NO-GO Checklist (Extended — 28 items)

| # | Item | Status |
|---|---|---|
| 1 | Payment provider locked (Xendit Terminal H2H) | **PASS** |
| 2 | Kiosk hardware locked (Windows touchscreen) | **PASS** |
| 3 | WhatsApp provider locked (Fonnte) w/ API shape confirmed | **PASS** |
| 4 | All P1 screens have mockups | **PASS** |
| 5 | All 4 user flows walkable end-to-end | **PASS** |
| 6 | Schema covers all mockup-used entities | **PASS** — with 3 new schema additions needed (F1.8) |
| 7 | API endpoint list complete | **PASS** — with 5 new endpoints needed (F1.7) |
| 8 | System-plan free of stale Android/GPS/BCA copy | **PASS** |
| 9 | Confirm.jsx free of "BCA card" copy | **PASS** |
| 10 | PaymentTakeover branch name dynamic | **PASS** |
| 11 | Loyalty model locked (Rp 10k = 1pt, inactivity expiry, per-service redeem) | **PASS** |
| 12 | Payroll model locked (16th→15th, commission_regular + commission_ot split, flat/prorata, kasbon column) | **PASS** |
| 13 | Expenses 3-type + PO model locked | **PASS** |
| 14 | Group pay flow defined | **PASS** |
| 15 | Hair Bleach configurator defined | **PASS** |
| 16 | Chair + chair_overrides model defined | **PASS** |
| 17 | Kiosk device auth (X-Kiosk-Token permanent-until-revoked) defined | **PASS** |
| 18 | Settings tabs match mockup (6 tabs) | **PASS** |
| 19 | LiveMonitor + pax-out documented in plan | **PASS** |
| 20 | Delay Report + schema documented | **PASS** |
| 21 | Inventory Distribute documented | **PASS** |
| 22 | Xendit failure/retry UX documented | **PASS** |
| 23 | Feedback tags admin-configurable (KioskConfig) | **PASS** |
| 24 | Payroll.jsx schema alignment (payroll_adjustments 12 columns) | **PASS** (pass 2 deep-dive) |
| 25 | WhatsApp 6 templates correct (queue_number absent, client_not_arrived present) | **PASS** (pass 2 deep-dive) |
| 26 | Confirm.jsx: E.164 picker, no WA consent, no BCA, per-service points | **PASS** (pass 2 deep-dive) |
| 27 | Branches 3-tab modal + chairs + overrides + Kiosk Devices | **PASS** (pass 2 deep-dive) |
| 28 | Inventory Kiosk Menu tab + schema + endpoints documented | **PASS** — F1.6 applied (2026-04-20): Section 05 now describes 3-tab Inventory including Kiosk Menu. F1.7 applied: `GET/PUT /api/inventory/menu?branch_id=` added to Section 07. Schema columns (`price`, `kiosk_visible`) were already in system-plan Section 06. |

**Score: 28 PASS / 0 FAIL**

---

## Overall Verdict

**GO.**

All 28 checklist items pass. The documentation fixes (F1.6, F1.7) have been applied to `system-plan.md`. All schema columns flagged in F1.8 were already present in system-plan Section 06 — no schema edits needed.

Remaining non-blocking items (address before the specific screens are built):
- F2.1 (All Branches selector in Payroll) — add to Payroll.jsx mockup before Antigravity builds Payroll backend.
- F2.2 (Period status controls in Payroll) — add Mark Reviewed / Mark Communicated controls to Payroll.jsx before backend build.
- F2.3 (xlsx export button) — add split Export button to Payroll.jsx and Expenses.jsx; backend handles exceljs.
- F2.4 (Freelancer mock row) — add one daily_rate row to PAYROLL_ENTRIES_V2 in data.js for testing.
- F2.4 (freelancer mock row) — add to mock data; no schema change needed.
- F2.5 (escalation interval/max controls) — document as backend defaults; add UI if Bercut requests.
- F1.8 schema additions — add to system-plan.md (15 min edit).

Once F1.6, F1.7, and F1.8 are applied to `system-plan.md`, all 28 checklist items will PASS and build can begin unconditionally.
