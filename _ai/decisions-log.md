# decisions-log.md
*Append one line per decision. Most recent at the bottom. Read this before every session.*

---

```
2026-03-25 | Single Vite app with routing (not monorepo) | simpler for one dev, one VPS deployment
2026-03-25 | Rumahweb VPS self-hosted — not Railway or Render | client already has VPS
2026-03-25 | PostgreSQL self-hosted on VPS — not Supabase | keeps everything on one server, no cloud DB cost
2026-03-25 | Nginx as reverse proxy, PM2 for Node process | standard self-hosted Node stack
2026-03-25 | Vite build outputs to backend/public — Nginx serves from there | single origin, no CORS issues
2026-03-25 | SSE for real-time — not WebSockets | zero extra infra, native Node/browser, sufficient for queue updates
2026-03-25 | BCA EDC direct integration — Serial/USB ISO 8583 or local TCP | client requirement, offline-capable, no Midtrans
2026-03-25 | Payment model: POSTPAID — pay after service not during booking | client requirement
2026-03-25 | Cashless only — QRIS and card, no cash | client requirement
2026-03-25 | Web Speech API for P1 barber notifications — no Fonnte/Zenziva | free, zero setup, barbers are on premises
2026-03-25 | Web Push PWA for P2 barber notifications | free, works on Android Chrome, no per-message cost
2026-03-25 | Kiosk hardware: Windows touchscreen per branch, not iPad | client requirement, Windows Assigned Access for lockdown
2026-03-25 | No loyalty programme | client decision, not required
2026-03-25 | No expense approval flow — logged immediately | client decision, owner reviews and edits directly
2026-03-25 | Commission: fully configurable per barber, auto-calculated | client requirement
2026-03-25 | Tip: preset Rp 10k/20k/50k + custom + skip, pooled per branch | client decision
2026-03-25 | Inventory: 3 categories — beverages, products, service consumables | client decision
2026-03-25 | EDC integration method: TBC with BCA technical team | open question — confirm before Phase 1 build
2026-03-25 | Claude Code = feature planning + mockups + deploy config + review | workflow decision
2026-03-25 | Antigravity = production execution — frontend/src/apps/ and backend/ | workflow decision
2026-03-25 | Inline styles in mockups — not Tailwind | keeps mockups portable and readable for Antigravity
2026-03-25 | tokens.js as single source of truth for design tokens | prevents drift between mockups and production
2026-03-25 | No backend built until Bercut approves all mockups | avoid rework on schema/routes if UI changes after review
2026-03-25 | Every mockup change request must be checked against schema + API plan before JSX is updated | UI decisions can imply DB columns, status lifecycles, or new endpoints — catch this at mockup stage not build stage
2026-03-25 | No separate Barber App — barber functions moved inside kiosk via PIN-protected panel | Meeting 2 decision; reduces device count, barbers use kiosk for clock-in/out, breaks, start/complete service
2026-03-25 | Kiosk Topbar logo click → Admin or Barber access modal (password-protected) | replaces separate app login; triple-tap StaffPanel remains for payment only
2026-03-25 | Booking terminology is "Reservasi" (not "booking") in all customer-facing UI | client preference; DB column names remain in English
2026-03-25 | Upsell logic defined: Haircut only→suggest beard+treatments; +BlackMask→Mask Cut Pkg; +Beard→Prestige; +Treatment(no beard)→Luxury; +Beard+Treatment→President; if rejected→offer individual services | Meeting 2 final upsell rules
2026-03-25 | Remove "Add On 10K" wash toggle from ServiceSelection; wash now mentioned in service description only | Meeting 2; simplify UI
2026-03-25 | Merge Details screen (name+phone) into Confirm screen — saves one step (4 steps total) | Meeting 2; name required, phone optional
2026-03-25 | Phone number OPTIONAL on confirm screen; WhatsApp checkbox + disclaimer (used for promos, confirmation, points) | Meeting 2
2026-03-25 | TimeSlot: "Now" + "Next Available" are main primary buttons above the time grid | Meeting 2; barber-free = Now enabled; busy/on break = disabled with reason shown
2026-03-25 | Beverages + products (3 each, with image+desc) shown on TimeSlot page after time is selected | Meeting 2; paid at final payment
2026-03-25 | Auto-cancellation: 15 min after booking confirmation; reason added by admin later | Meeting 2; show notice on TimeSlot page
2026-03-25 | Confirm screen shows simple floor plan placeholder with assigned chair highlighted | Meeting 2; chair configurable per branch
2026-03-25 | TOTAL label replaces "ESTIMATED TOTAL" everywhere in booking flow | Meeting 2; barber can still add services, but label is definitive
2026-03-25 | After payment: no "Done" button; auto-redirect to review screen; review has 5-min timeout + skip | Meeting 2
2026-03-25 | DB: add barbers.status ENUM, chairs table, barber_breaks table, booking_extras table, bookings.auto_cancel_at, bookings.cancellation_reason, customers.whatsapp_consent | schema implications of Meeting 2 decisions
2026-03-25 | TV system (queue display, ongoing cuts, wait list, cancellation timer) is out of scope for UI but logic must be captured in SSE event types | Meeting 2
2026-03-25 | Offline mode: kiosk supports reservasi + staff actions without WiFi; sync on reconnect; website booking disabled → redirect to WhatsApp | Meeting 2
2026-03-26 | QueueNumber footer redesigned: "Add Another" + "Done" (onReset) buttons with 72px tap targets; bilingual labels; redundant wait box removed | UI iteration per Bercut feedback
```
2026-03-26 | Font system: Inter for headings/prices/names, DM Sans for body/buttons/labels — Barlow Condensed rejected, too blocky for Bercut brand
2026-03-26 | Tip section redesigned: more aggressive layout with "Popular" badge, removed "No Tip" button for a smaller link, and 100% barber attribution notice.
2026-03-26 | Auto-cancellation disclaimer moved from bottom to the "Selected Time" confirmation box in TimeSlot.jsx for better visibility and a cleaner layout.
2026-03-26 | Package Upsell modal: English-first localization applied to all labels; "Switch to Package" button updated to show savings (e.g. -Rp 10.000) instead of total price.
2026-03-26 | TimeSlot UI: 'Next Available' button hidden if 'Now' is available to prioritize the immediate booking CTA.
2026-03-26 | Auto-cancellation disclaimer in TimeSlot.jsx is now hidden if 'Now' is selected, as immediate chair assignment makes the rule irrelevant.
2026-03-26 | BarberPanel.jsx mockup created — full-screen kiosk panel for logged-in barber (queue, active timer, start/complete, add service, break, clock out); Antigravity prompt added as Section 05B in prompting-guide.md
2026-03-27 | Points reward system added — Meeting 3 decision (reverses "no loyalty programme" from Meeting 1) | Bercut requested customer loyalty via points
2026-03-27 | Points earn rate: Rp 10,000 = 1 point. Earned on cash-paid services + beverages + products. Not earned on points-redeemed services | Meeting 3
2026-03-27 | Points redemption at Confirm screen (Step 4), not PaymentTakeover — customer decides before service starts; mid-cut barber additions are always cash | Meeting 3
2026-03-27 | Points tied to phone number — phone stays optional but kiosk shows nudge "Have points? Enter your WhatsApp number" if phone field is empty | Meeting 3
2026-03-27 | Per-service points toggle in Confirm order summary — customer picks which services to cover with points; packages eligible too | Meeting 3
2026-03-27 | Zero cash total still goes to PaymentTakeover for tip prompt; if no tip either, "Confirm & Complete" skips EDC entirely | Meeting 3
2026-03-27 | DB: add customers.points_balance, booking_services.paid_with_points, bookings.points_redeemed + points_earned, new point_transactions table | schema implications of Meeting 3
2026-03-27 | Kiosk language rule corrected: English primary + Bahasa Indonesia subtitle (was incorrectly documented as Bahasa primary + English subtitle) | Meeting 3 clarification
2026-03-27 | WA consent checkbox removed from Confirm screen; points loyalty nudge/balance moved to that position | Meeting 3
2026-03-27 | Any Available on BarberSelection redesigned as first grid card (same size as barber cards) with 🎲 dice icon | Meeting 3
2026-03-27 | Now and Next Available on TimeSlot redesigned as first two slot cards in the grid (not separate header buttons) | Meeting 3
2026-03-27 | Upsell popup package cards: treatment photos displayed as horizontal strip at top of card; dark gradient overlay; white text floated over | Meeting 3
2026-03-27 | Confirm screen columns flipped: inputs (name/phone/points) on LEFT, order summary on RIGHT | Meeting 3; testing showed users missed input fields when summary was dominant on left
2026-03-27 | Name field on Confirm: auto-focus on mount + pulsing yellow border animation (3 pulses) + instructional placeholder | Meeting 3; user testing showed customers struggled to find/fill name field
2026-03-27 | Floor plan removed from Confirm screen | Meeting 3; chairs table stays in DB for backend logic, not shown in kiosk UI
2026-03-27 | Ear Wax and Ear Candle are mutually exclusive (mutex_group: ear_treatment) — selecting one deselects the other | Meeting 3
2026-03-27 | Beard Trim and Beard Shaving are mutually exclusive (mutex_group: beard_service) — selecting one deselects the other | Meeting 3
2026-03-27 | Package descriptions updated: Ear Wax + Candle → Ear Wax or Candle; Beard Trim or Shave → Beard Trim or Shaving | Meeting 3
2026-03-27 | Package treatment images displayed as horizontal photo strip on package cards in ServiceSelection | Meeting 3; big screen warrants visual treatment representation
2026-03-27 | DB: add image_url TEXT and mutex_group VARCHAR(50) to services table | schema implications of Meeting 3 visual and constraint decisions
2026-03-27 | Kiosk screen is portrait orientation (40-inch); current mockups remain landscape for laptop review, portrait layout revisit deferred | Meeting 3
2026-03-30 | Kiosk upsell popup: chip row split into two states — ✓ muted (already in cart) vs + yellow (new from package); price delta strip added showing +/−/= vs current cart total | UX feedback: users need to see what's new and how much more they'll pay
2026-03-30 | Kiosk UI elements (upsell popups, service ordering, welcome copy, CTA labels, package badge text) must be configurable from admin backoffice — not only hardcoded or on-device | Requirement: kiosk must be modular and remotely manageable per branch without touching code
2026-03-31 | services.category ENUM updated: added `treatment` (was missing — 7 treatment services exist in mockup), renamed `color` → `hair_color` to match mockup cat keys | Schema alignment after kiosk mockup audit
2026-03-31 | booking_services: added bleach_step SMALLINT + bleach_with_color BOOLEAN — needed to store Hair Bleach Configurator choice (1/2/3 steps + optional color add-on) per booking row | Hair Bleach is a variable-price service with step selector in mockup
2026-03-31 | booking_groups table added; bookings.group_id FK added — group payment support seen in StaffPanel (multiple customers pay as one) | Formed at payment time not booking time; points not available for group payments
2026-03-31 | bookings.review_tags TEXT[] added — stores feedback tag strings from ReviewScreen (contextual tags per star rating) alongside existing rating SMALLINT | Post-service rating is now P1 and is part of PaymentTakeover flow, not a separate P3 feature
2026-03-31 | customers.phone changed to VARCHAR(25) E.164 format; phone_country_code VARCHAR(5) added — Confirm screen now has international country code picker (pinned: ID, AU, RU, IN + full list) | Kiosk serves tourists; international phone support required
2026-03-31 | kiosk_settings.tip_presets JSONB added — default [5000, 10000, 20000, 50000, 100000] (mockup updated presets vs original plan's 10k/20k/50k); configurable per branch | Tip amounts need to be remotely adjustable
2026-03-31 | SSE event types and key kiosk API endpoints documented in system-plan.md Section 07 — includes notify-barber, payment-trigger (admin manual), branch-overview, booking-groups | Extracted from mockup API comments during audit
2026-03-31 | Post-service rating + feedback tags promoted from P3 → P1; loyalty/rating removed from Phase 3 roadmap — both fully implemented in kiosk mockup | Phase roadmap updated to reflect actual mockup scope
2026-03-31 | Payroll system added to plan — monthly cycles, salary_plus_commission pay type, individual tip distribution (no pooling), kasbon configurable as current or next month deduction, uang rajin as manual additions with configurable reasons | Meeting 4 decisions
2026-03-31 | Payroll workflow: draft → reviewed → finalized; finalized rows are immutable; only owner role can finalize | Prevents accidental edits after payslips are communicated to barbers
2026-03-31 | Payroll: gross_service_revenue excludes points-redeemed services — barber earns commission only on cash-paid portion | Points redemption reduces the revenue base, consistent with business intent
2026-03-31 | adjustment_reasons table: admin-configurable labels per type (uang_rajin, bonus, deduction, kasbon); can be global or branch-scoped; pre-seeded with common reasons | Reason management in admin Settings sub-section
2026-03-31 | Kasbon pre-logging: admin can log kasbon mid-month before payroll is generated (entry_id = null); system assigns to correct period_month at payroll generation time using target_period_month | Allows kasbon to be recorded immediately when advance is given, not only at payroll time
2026-03-31 | branches.tip_distribution_method added, default individual; branches.pay_period_type added, default monthly | Schema implications of payroll decisions
2026-03-31 | barbers: added pay_type ENUM, base_salary INTEGER, daily_rate INTEGER alongside existing commission_rate | Supports future barber arrangements beyond salary+commission
