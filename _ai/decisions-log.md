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
