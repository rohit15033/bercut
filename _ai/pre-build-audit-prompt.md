# Pre-Build Audit Prompt
*Give this entire prompt to a fresh Claude Code session before Antigravity starts the backend.*

---

## Context

You are auditing the Bercut Barber Shop system — a self-service kiosk POS for a barbershop chain with 6+ branches in Bali, Indonesia. The project has three PWA apps (Kiosk, Barber Panel, Admin Dashboard) sharing one React + Vite codebase, with a Node.js + Express backend on a Rumahweb VPS.

**Current phase:** All UI work is complete as visual mockups. No backend has been built yet. This audit is the final gate before Antigravity begins production build. The goal is to catch every gap, mismatch, and missing detail NOW — not during build.

---

## Step 1 — Read everything first

Read these files in full before writing a single word of output:

**Planning docs:**
- `_ai/system-plan.md` — full system design, DB schema, user flows, API endpoints, business rules
- `_ai/decisions-log.md` — every decision ever made (most recent = ground truth; overrides anything in system-plan)
- `_ai/prompting-guide.md` — screen-by-screen design specs

**Kiosk mockups:**
- `mockups/kiosk/BercutKiosk.jsx` — main router, idle timeout, offline banner, step flow
- `mockups/kiosk/Welcome.jsx`
- `mockups/kiosk/ServiceSelection.jsx`
- `mockups/kiosk/BarberSelection.jsx` (note: file may be named BarberSelection)
- `mockups/kiosk/TimeSlot.jsx`
- `mockups/kiosk/Confirm.jsx`
- `mockups/kiosk/QueueNumber.jsx`
- `mockups/kiosk/PaymentTakeover.jsx`
- `mockups/kiosk/StaffPanel.jsx`
- `mockups/kiosk/BarberPanel.jsx`
- `mockups/kiosk/AdminPanel.jsx` (if exists)
- `mockups/kiosk/data.js`

**Admin mockups:**
- `mockups/admin/BercutAdmin.jsx` — main admin router + sidebar nav
- `mockups/admin/Overview.jsx`
- `mockups/admin/BranchDetail.jsx`
- `mockups/admin/LiveMonitor.jsx`
- `mockups/admin/Reports.jsx`
- `mockups/admin/Barbers.jsx`
- `mockups/admin/Services.jsx`
- `mockups/admin/Customers.jsx`
- `mockups/admin/Expenses.jsx`
- `mockups/admin/Inventory.jsx`
- `mockups/admin/Attendance.jsx`
- `mockups/admin/Payroll.jsx`
- `mockups/admin/Branches.jsx`
- `mockups/admin/KioskConfig.jsx`
- `mockups/admin/OnlineBooking.jsx`
- `mockups/admin/Settings.jsx`
- `mockups/admin/data.js`

---

## Step 2 — Produce the audit

Output a structured audit across these seven sections. Be specific — cite file names and line numbers where relevant. Do not generalise. If something is fine, say it's fine and move on. Spend words on problems, not praise.

---

### Section A — Screen Inventory

For every screen listed in `system-plan.md` Section 05 (UI / Screen Structure), state:
- **Built / Partially Built / Missing**
- If partially built: what is implemented vs what is missing
- If missing: what is needed and which P-level it belongs to

Include screens for: Kiosk App, Barber App (note: barber functions live inside kiosk panels — see decisions-log), and Admin Dashboard.

---

### Section B — Feature Coverage by Priority

Go through every feature row in `system-plan.md` Section 03 (Feature Specifications), tables A through G. For each row:

- **Built in mockup** — full or partial, note what's shown
- **Not in mockup** — call out clearly
- **P-level** (P1/P2/P3)
- **Backend work implied** — note the key API calls or DB operations this feature will require

Flag any P1 feature that is not fully represented in the mockup — these block go-live.

---

### Section C — User Flow Audit

Walk through each of the four core flows in `system-plan.md` Section 04:

**Flow 1 — Customer Walk-In Booking**
Step through: Welcome → ServiceSelection → BarberSelection → TimeSlot → Confirm → QueueNumber. For each transition:
- Is the step fully implemented in the mockup?
- Are all data fields captured and passed to the next screen?
- Are edge cases handled (no barber available, cart empty, phone not entered, Now vs future slot, group booking, loyalty points redemption, Hair Bleach configurator, upsell popup, beverage/product selection, idle timeout)?

**Flow 2 — Barber Serves a Customer**
Step through: PIN login → BarberPanel queue → acknowledge booking → Start → add mid-cut services → Complete → payment trigger. For each step:
- Is the UI present?
- Does it correctly reflect the booking lifecycle (`confirmed → in_progress → pending_payment → completed`)?
- Does the escalation timer / re-announce logic connect correctly to QueueNumber?

**Flow 3 — Payment (PaymentTakeover)**
Step through: payment trigger → tip selection → QRIS / card → Xendit Terminal H2H simulation → receipt screen → review screen. Check:
- Group payment path
- Zero-cash path (fully points-paid)
- Tip handling
- Receipt + reprint flow
- Post-payment star rating + feedback tags

**Flow 4 — Admin Daily Operations**
Step through: login → Overview → BranchDetail (queue + barber status + escalation UI) → Reports → Expenses → Payroll. Check:
- Cross-screen data consistency (same booking numbers, same statuses)
- Does BranchDetail escalation flow (amber border, WA Escalating badge, Stop Escalation action) match the backend model in system-plan?

---

### Section D — Schema Alignment

For every UI element in the mockups that reads or writes data, verify it maps to a column in `system-plan.md` Section 06. Check:

1. **bookings table** — does every status the UI uses exist in the `status` ENUM? Does every field shown (booking_number, guest_name, guest_phone, scheduled_at, started_at, rating, review_tags, points_redeemed, group_id, escalation_count, escalation_stopped_at, escalation_stop_reason) have a matching column?

2. **services / branch_services** — does the Hair Bleach configurator (step 1/2/3 + color add-on) map to `booking_services.bleach_step` and `bleach_with_color`? Are mutex groups (ear treatment, beard) handled?

3. **customers table** — are loyalty points fields (points_balance, points_last_activity_at, whatsapp_consent) all accounted for? Is phone stored in E.164 format consistent with the international picker in Confirm?

4. **payroll schema** — does the Payroll mockup (base salary, commission_regular, commission_ot, kasbon, deductions, additions, net pay) match `payroll_entries` columns exactly? Do the two adjustment modals (ManageAdjModal, AddAdjModal) map to `payroll_adjustments`?

5. **expenses schema** — does the three-type expense form (regular / inventory / kasbon) with PO system map to `expenses.type`, `po_id`, `po_payment_type`, `po_attribution`, `expense_stock_items`?

6. **whatsapp_settings** — does the Settings WhatsApp tab (5 templates: booking_confirmation, receipt, late_customer_reminder, barber_new_booking, barber_escalation) match the schema exactly? No queue_number template should be present.

7. **chair_overrides** — does the ChairPanel override modal (dateFrom, dateTo nullable, reason, barberName) map to the `chair_overrides` table columns?

8. **kiosk_tokens** — does the Branches → Kiosk Devices tab (generate, revoke, masked token, last_seen) map to `kiosk_tokens` columns?

Flag any field shown in the UI that has no corresponding schema column. Flag any schema column added in decisions-log that has no corresponding UI representation.

---

### Section E — API Coverage

For every interactive action in the mockups (button clicks, form submits, toggles), check whether `system-plan.md` Section 07 (API Endpoints) has a matching endpoint. Format as a table:

| Screen | Action | Endpoint in plan | Gap? |
|--------|--------|-----------------|------|

Pay special attention to:
- `POST /api/bookings` — does the Confirm screen capture all required fields?
- `POST /api/bookings/:id/notify-barber` — called from QueueNumber after speech
- `PATCH /api/bookings/:id/stop-escalation` — called from BranchDetail ActionMenu
- `POST /api/booking-groups` — called from StaffPanel group pay flow
- `GET /api/customers?phone=` — called from Confirm on phone input for loyalty lookup
- `GET/PUT /api/settings/whatsapp` + `POST /api/settings/whatsapp/test` — Settings WhatsApp tab
- `POST /api/kiosk/register` — kiosk boot token validation
- Payroll generate, period list, entry update, export endpoints
- Expense export endpoint with xlsx support
- Chair override CRUD endpoints (not yet in system-plan API table — flag if missing)

---

### Section F — Gaps, Missing Features, and Recommended Additions

List everything that should be addressed before the backend build starts. Organise as:

**1. Schema additions needed** — columns or tables visible in the UI that are not yet in system-plan Section 06

**2. API endpoints needed** — actions in the mockup with no matching endpoint in system-plan Section 07

**3. Missing P1 screens or states** — any P1 feature with no mockup representation

**4. Missing P2 features worth adding now** — if a P2 feature is trivial to add to an existing screen (one extra field, one extra toggle), flag it so it can be included in the initial backend build rather than retrofitted

**5. system-plan.md inconsistencies** — places where the plan contradicts the decisions-log (decisions-log wins; plan needs updating)

**6. Mockup-to-mockup inconsistencies** — e.g., a status used in one screen that doesn't match another screen's status handling

**7. UX/flow improvements** — things that are technically complete but will cause confusion or friction for real customers or barbers in production (keep this list short and specific — not style preferences)

---

### Section H — UI/UX Intuitiveness Audit

Evaluate each app as if you are the actual user encountering it for the first time. Apply the user personas from `system-plan.md` Section 02. Be ruthlessly practical — this is a real barbershop in Bali serving walk-in tourists and local customers, barbers who are not tech-savvy, and an admin team managing finances across 6 branches.

---

**H1 — Kiosk (Customer-Facing)**

The customer is a walk-in — they've never used this system before, they may not speak English or Indonesian, and they're standing at a touchscreen in a barbershop. Evaluate:

- **Discoverability:** On each screen (Welcome, ServiceSelection, BarberSelection, TimeSlot, Confirm, QueueNumber), would a first-time user know what to do next without being told? Is the primary action obvious? Is there anything that looks tappable but isn't, or anything tappable that doesn't look it?

- **Error prevention:** Can the customer get stuck? What happens if they tap Back mid-flow — is there a back button, and does it behave predictably? What happens if they sit idle and the timeout fires — is the countdown warning clear enough that they won't lose their booking progress by accident?

- **Cognitive load:** How many decisions does each screen require? Flag any screen that asks for too much at once (e.g. Confirm screen — does it feel overwhelming?). Does the step indicator (step 1 of 4, etc.) exist and is it clear?

- **Touch target safety:** Are any interactive elements smaller than 72px tall? Are any two tappable elements close enough that a fat-finger tap could hit the wrong one? Flag specific components.

- **Bilingual clarity:** Is the Bahasa Indonesia subtitle always present and legible? Are there any screens where the English label is ambiguous or would confuse a non-English speaker, and the Indonesian doesn't clarify?

- **Loyalty points UX:** Is the points redemption flow (per-service toggle at Confirm) understandable to a customer who has never redeemed points before? Is the balance shown before they're asked to act on it?

- **Hair Bleach configurator:** Is the step-selector modal clear enough that a customer can choose the right intensity without needing staff help? Is the price at each step shown before confirmation?

- **Group booking:** Is it clear to customer 2 onwards that they are being added to an existing group? Is it clear that everyone pays together at the end?

- **Payment (PaymentTakeover):** After a barber marks Complete and the screen switches to payment mode, is the transition jarring or smooth? Does the customer know what's happening and what they need to do? Is the QRIS vs card choice clear? Is the tip prompt pressure-free or does it feel forced?

- **Post-payment:** After payment succeeds, does the customer know they're done? Is the rating screen skippable without feeling guilty? Is the 5-minute timeout on the rating screen appropriate or too short/long?

---

**H2 — Barber Panel (Staff-Facing, Inside Kiosk)**

The barber is mid-cut, hands may be wet or greasy, phone is in their pocket. They access the kiosk panel via PIN. Evaluate:

- **PIN login:** Is the PIN entry keypad large enough for quick, accurate input under pressure? Is there feedback on each digit press?

- **Queue clarity:** In the BarberPanel queue view, can the barber instantly identify which booking is theirs right now and what the next one is? Is SEKARANG / BERIKUTNYA / HARI INI separation obvious at a glance?

- **Start / Complete buttons:** Are these the most visually dominant elements on the screen? Would a barber in a hurry ever accidentally miss them or tap the wrong thing?

- **Late-start indicator:** When a booking is overdue (amber/red border after 5/10 min), is the visual alert strong enough to be noticed without looking for it? Does it feel urgent without being alarming?

- **Add services mid-cut:** Is it clear when mid-cut additions are available? Is the flow to add them fast (2 taps max)?

- **Clock in / out and breaks:** Are these actions clearly separated from the queue actions so a barber doesn't accidentally clock out while trying to start a booking?

- **Monthly earnings toggle:** Is the earnings display useful in context, or is it a distraction during a busy session?

- **Language:** Is every single label, button, and notification in Bahasa Indonesia? Are there any English strings remaining?

---

**H3 — Admin Dashboard (Owner/Manager/Accountant-Facing)**

The admin is at a desktop managing operations across 6 branches. They may be non-technical. Evaluate:

- **Navigation:** Is the sidebar nav order logical? Are the most-used screens (Overview, BranchDetail, Reports, Expenses) easily reachable? Are there screens buried in sub-tabs that should be top-level, or top-level screens that should be merged?

- **Overview → BranchDetail drill-down:** Is it clear that branch stat cards are clickable? Is the transition from Overview to BranchDetail obvious and reversible?

- **BranchDetail queue table:** Can a manager immediately understand the live queue state? Are the status badges (Waiting, In Progress, Done, No-show) distinguishable at a glance? Is the WA Escalating badge prominent enough to prompt action?

- **Expenses — three-type form:** When creating an expense, is the type picker (Regular / Inventory / Kasbon) the first decision, and does it clearly change what follows? Would an accountant understand the PO advance vs PO final distinction without training?

- **Payroll — deduction overrides:** The payroll table has many columns. Is it scannable? Is it obvious which cells are editable vs calculated? Are the override inputs clearly distinguished from auto-calculated values?

- **Payroll — adjustment modals:** ManageAdjModal stacks on top of a row expansion, AddAdjModal stacks on top of that (z-index 300 over 200). Does this modal-on-modal pattern feel manageable or confusing?

- **Settings — WhatsApp tab:** Is the template editor self-explanatory? Are variable chips (`{name}`, `{branch}`, etc.) clear enough that an admin knows they can't delete them from the template without breaking the message?

- **Branches — chair overrides:** Is the override flow (who's covering, from when, until when, indefinite option) clear to a non-technical branch manager?

- **Reports — date range pickers:** Are the default date ranges (today / this week / this month) sensible for daily use? Is the export to CSV/xlsx clearly available?

- **Destructive actions (cancel booking, no-show, revoke token, deactivate barber):** Is there always a confirmation step before irreversible actions? Are destructive buttons visually distinct (red / danger colour) from normal actions?

- **Permission-gated screens (Users, Audit Log — owner only):** Is it clear to a non-owner why they can't see these tabs, or do they just silently disappear?

---

**H4 — Cross-App Consistency**

- Does the design language (colours, fonts, card style, button shapes) feel consistent between the Kiosk and the Admin Dashboard, even though they're different apps?
- Are status labels consistent? If the kiosk shows "Reservasi Dikonfirmasi" and BranchDetail shows "Waiting" for the same `confirmed` status — does that create confusion in cross-app communication between staff and customers?
- Are Indonesian number formats (Rp 165.000 not Rp 165,000) consistent everywhere currency appears?

---

**H5 — Accessibility and Real-World Conditions**

- **Screen glare:** The kiosk is a 40-inch touchscreen in a barbershop — potentially bright ambient light. Are contrast ratios sufficient on all key text + background combinations? Flag any low-contrast pairing.
- **Font sizes at distance:** Customers stand at arm's length from the kiosk. Are the primary CTAs and service names legible at ~60cm viewing distance on a 40-inch screen?
- **One-handed use (barber panel):** The barber may be holding clippers or scissors. Can they navigate the panel with one hand?
- **Network degradation:** The offline banner shows when `navigator.onLine` is false. Is there any intermediate state (slow connection, Xendit timeout) that the UI doesn't handle and would leave a customer or barber confused?

---

### Section G — Pre-Build Checklist

Produce a binary GO / NO-GO checklist. Each item is either ✅ ready or ❌ needs work before build:

- [ ] All P1 screens fully represented in mockups
- [ ] All P1 booking flow edge cases handled in UI
- [ ] Payment flow (Xendit Terminal H2H) fully mocked end-to-end
- [ ] Barber escalation flow (WA, re-announce, admin stop) consistent across QueueNumber, BarberPanel, BranchDetail
- [ ] WhatsApp integration (Settings, 5 templates, Fonnte API shape: POST https://api.fonnte.com/send · Authorization: <token> header · multipart form body · countryCode: "62") fully documented for Antigravity
- [ ] Schema covers every field shown in every mockup
- [ ] No orphaned UI fields (shown in mockup, missing from schema)
- [ ] API endpoint exists in plan for every mockup action
- [ ] decisions-log decisions reflected in system-plan (no stale contradictions)
- [ ] Kiosk device auth flow (token → /api/kiosk/register → branch config) documented end-to-end
- [ ] Group booking formation and payment path fully covered
- [ ] Loyalty points earn/redeem/expiry cycle covered in both UI and schema
- [ ] Payroll full cycle (generate → review → communicated, all deduction types, kasbon, adjustments) covered
- [ ] Expense PO system (advance → attribution → close) covered in both UI and schema
- [ ] Chair override system covered in both UI and schema
- [ ] Kiosk primary CTAs are visually dominant and unambiguous on every screen
- [ ] No touch target smaller than 72px on any kiosk or barber panel interactive element
- [ ] Idle timeout countdown is visible and dismissible before session resets
- [ ] Barber Panel is entirely in Bahasa Indonesia — no English strings remaining
- [ ] Destructive admin actions (cancel, no-show, revoke, deactivate) all have a confirmation step
- [ ] PaymentTakeover transition (barber completes → payment mode) is clear to the customer
- [ ] Bilingual labels present on every kiosk screen (English primary + Bahasa subtitle)
- [ ] Currency formatted as Rp X.XXX consistently across all screens

For every ❌ item, write one sentence on what specifically is missing and where to fix it.

---

## Output format

Write the audit as a single continuous document. Use the section headers above. Be direct. Use tables where they help. Cite mockup file names and system-plan section numbers.

**Primary audience:** The developer (Antigravity) reading this before writing a single line of backend code — they need to know exactly what to build, in what shape, with no ambiguity.

**Secondary audience:** The product owner (Bercut) who needs to know which mockup screens need a revision before sign-off.

For Section H (UX), frame findings as actionable mockup fixes — not vague suggestions. Instead of "the confirm screen is overwhelming", write "Confirm.jsx: the loyalty points toggle section and the order summary compete for attention — consider collapsing the points section behind a 'Use Points' toggle that expands inline."

End with a one-paragraph **overall verdict**: is this system ready to move to production build, or are there specific mockup screens or schema gaps that must be resolved first?
