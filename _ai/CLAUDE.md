# Bercut Barber Shop — CLAUDE.md
*Auto-loaded by Claude Code every session.*

---

## Your Role

You are the **sole engineer** for the Bercut project. You own everything: planning, mockups, shared frontend, production screens, backend, and deploy config. There is no other agent.

**You build:**
- Feature planning and technical specs
- Architecture decisions
- Visual mockups (`mockups/`) — frozen; change only if Bercut requests it
- Shared frontend foundation (`frontend/src/shared/`, `frontend/src/App.jsx`)
- Production screens (`frontend/src/apps/`)
- Entire backend (`backend/`)
- Deploy configuration (`deploy/`)
- `_ai/decisions-log.md` — update after every session where a decision is made

---

## Build Gate — PASSED ✅

**Pre-build audit completed 2026-04-20. All 28 checklist items PASS.**
See `_ai/pre-build-audit.md` for the full audit.

Current phase: **PRODUCTION BUILD**
- Mockups in `mockups/` are the approved visual contract — frozen unless Bercut requests a change
- `backend/` and `frontend/src/apps/` are actively being built
- Any mockup change requires re-audit of affected schema/API sections

If Bercut requests a UI change during build:
1. Check whether it affects DB schema or API contract in `_ai/system-plan.md`
2. If yes → update `system-plan.md` and `decisions-log.md` first
3. Then update the mockup for visual reference
4. Then update the production code

---

## Workflow — Production Build Phase

```
Step 1 — READ
  decisions-log.md (ground truth — read this first, every session)
  system-plan.md (schema, API contracts, business rules)
  prompting-guide.md (build phases, per-screen handoff, route specs)
  pre-build-audit.md (known gaps in Section F2)

Step 2 — BUILD
  Follow prompting-guide.md build phases in order:
    Phase 0: Foundation (schema, backend skeleton, frontend foundation, SSE)
    Phase 1: Kiosk booking flow (services → confirm → queue → payment → barber panel)
    Phase 2: Admin dashboard (all 16 screens)
    Phase 3: Services layer (background jobs, escalation, payroll calculator)
    Phase 4: Deployment config (nginx, PM2, setup script)

  For each screen:
    a. Read the mockup file as the visual contract
    b. Read the matching section in prompting-guide.md for API + logic
    c. Build the production screen in frontend/src/apps/[app]/screens/
    d. Build the backend route(s) it needs
    e. Use shared/api.js for all fetch calls, shared/useSSE.js for real-time
    f. Wire real API calls; remove mock data

Step 3 — LOG
  Append to decisions-log.md for any decision made this session
```

---

## Project

Bercut Barber Shop — self-service kiosk POS system.
Barbershop chain, 6+ branches across Bali, Indonesia.
Two PWA apps in one Vite build: **Kiosk** (includes BarberPanel) and **Admin Dashboard**.
One Node.js + Express backend. Self-hosted on Rumahweb VPS.

**Always read before starting any session:**
- `_ai/decisions-log.md` — ground truth for all decisions (read first)
- `_ai/system-plan.md` — full system design, DB schema, user flows, business rules
- `_ai/prompting-guide.md` — build phases, per-screen handoff, API contracts
- `_ai/pre-build-audit.md` — gap analysis, known issues, checklist

---

## Repo Structure

```
bercut-kiosk/
│
├── CLAUDE.md                             ← Root pointer (auto-loaded)
├── _ai/                                  ← Read every session
│   ├── CLAUDE.md                         ← This file (full context)
│   ├── system-plan.md
│   ├── prompting-guide.md
│   ├── decisions-log.md
│   └── pre-build-audit.md
│
├── mockups/                              ← Frozen visual contract
│   ├── kiosk/
│   │   ├── BercutKiosk.jsx
│   │   ├── Welcome.jsx
│   │   ├── ServiceSelection.jsx
│   │   ├── BarberSelection.jsx
│   │   ├── TimeSlot.jsx
│   │   ├── Confirm.jsx
│   │   ├── QueueNumber.jsx
│   │   ├── PaymentTakeover.jsx
│   │   ├── StaffPanel.jsx
│   │   ├── BarberPanel.jsx
│   │   └── AdminPanel.jsx
│   └── admin/
│       ├── BercutAdmin.jsx
│       ├── Overview.jsx
│       ├── LiveMonitor.jsx
│       ├── BranchDetail.jsx
│       ├── Reports.jsx
│       ├── Barbers.jsx
│       ├── Branches.jsx
│       ├── Services.jsx
│       ├── Customers.jsx
│       ├── Expenses.jsx
│       ├── Inventory.jsx
│       ├── Attendance.jsx
│       ├── Payroll.jsx
│       ├── OnlineBooking.jsx
│       ├── KioskConfig.jsx
│       ├── Settings.jsx
│       └── data.js                       ← Mock data (reference only)
│
├── frontend/                             ← Production frontend
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── .env / .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                       ← Root router
│       ├── shared/                       ← Shared infrastructure
│       │   ├── tokens.js
│       │   ├── api.js
│       │   ├── useSSE.js
│       │   └── components/
│       │       ├── Topbar.jsx
│       │       ├── Button.jsx
│       │       └── Card.jsx
│       └── apps/                         ← Production screens
│           ├── kiosk/
│           │   ├── KioskApp.jsx
│           │   ├── screens/
│           │   └── components/
│           └── admin/
│               ├── AdminApp.jsx
│               ├── screens/
│               └── components/
│
├── backend/                              ← Production backend
│   ├── server.js
│   ├── config/db.js
│   ├── routes/                           ← One file per resource
│   ├── middleware/auth.js + branchScope.js
│   ├── services/                         ← slotGenerator, notifications, escalation
│   └── db/
│       ├── schema.sql
│       └── seed.sql
│
└── deploy/
    ├── nginx.conf
    ├── ecosystem.config.js
    └── setup.sh
```

---

## Mockup File Rules

Every mockup file must:
- Cover one screen
- Use hardcoded realistic mock data at the top (IDR prices, Indonesian names, bilingual copy)
- Be fully self-contained with `useState` — zero props required
- Use inline styles only — no Tailwind, no CSS modules, no imports from `src/`
- Make no API calls

Required header on every mockup:
```jsx
/**
 * MOCKUP — Bercut [Kiosk | Admin]: [Screen Name]
 *
 * What it does: [one sentence]
 * State managed: [useState variables]
 * Production API: [real endpoint]
 * Feeds into: [next screen or event]
 * Production file: frontend/src/apps/[kiosk|admin]/screens/[ScreenName].jsx
 *
 * VISUAL PROTOTYPE — no backend calls.
 */
```

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite PWA | Single app, two routes: /kiosk and /admin |
| Styling | Inline styles in mockups, tokens.js in production | No Tailwind |
| Backend | Node.js + Express | REST + SSE |
| Database | PostgreSQL | Self-hosted on VPS |
| Real-time | Server-Sent Events | `GET /api/events?branch_id=` |
| Payment — Card | Xendit Terminal H2H | REST API: backend → terminal → webhook confirm |
| Payment — QRIS | Xendit QR Codes v2 | `POST /v2/qr_codes` on api.xendit.co; QR rendered on kiosk screen |
| Notifications P1 | Web Speech API | Kiosk speaker, zero setup |
| Notifications P2 | Web Push PWA | Android Chrome |
| WhatsApp | Fonnte (P2) | Customer confirmations; abstracted in notifications.js |
| Receipts | ESC/POS thermal printer | Epson TM-T82 or equivalent |
| Hosting | Rumahweb VPS | Nginx + PM2 + PostgreSQL self-hosted |
| Kiosk device | Windows touchscreen | Assigned Access for browser lockdown |

### Key Vite config
```js
server: { proxy: { '/api': 'http://localhost:3000' } },  // dev only
build: { outDir: '../backend/public' }                   // Nginx serves from here
```

### Key Nginx rules
```nginx
location /api/ {
  proxy_pass http://localhost:3000;
  proxy_buffering off;    # CRITICAL — SSE breaks without this
  proxy_cache off;
  chunked_transfer_encoding on;
}
location / {
  try_files $uri $uri/ /index.html;  # SPA fallback
}
```

---

## Design Tokens

```js
// frontend/src/shared/tokens.js
export const tokens = {
  bg:         '#FAFAF8',  // warm off-white page background
  surface:    '#F2F0EB',  // input fields, secondary surfaces
  surface2:   '#ECEAE4',  // disabled states, tertiary
  accent:     '#F5E200',  // Bercut yellow — CTA buttons and selected card states ONLY
  accentText: '#111110',  // text ON yellow backgrounds
  text:       '#111110',  // primary text
  text2:      '#3A3A38',  // secondary text
  muted:      '#88887E',  // placeholder, helper, bilingual subtitles
  border:     '#DDDBD4',  // card borders, dividers
  topBg:      '#111110',  // topbar, primary dark buttons
  topText:    '#F5E200',  // text in topbar (yellow on black)
  white:      '#FFFFFF',  // card surfaces
  danger:     '#C0272D',  // destructive actions only
}
```

---

## Colour Rules — Critical

1. **Yellow (`#F5E200`) is NEVER text on white or light backgrounds.** Yellow is a filled background only.
2. **Text ON yellow must always be `#111110`.**
3. **Selected card state:** background → `#F5E200`, ALL text inside → `#111110`. No exceptions.
4. **`#111110` is the primary button colour** — dark button, white text. Not yellow.
5. **Yellow on dark topbar** = valid. Logo and topText use this.

---

## Typography

| Use | Font | Size | Weight |
|---|---|---|---|
| Screen titles | Inter | `clamp(26px, 3.5vw, 38px)` | 800 |
| Service / barber names | Inter | `clamp(13px, 1.6vw, 15px)` | 700 |
| Prices | Inter | `clamp(15px, 2vw, 20px)` | 700–800 |
| Queue number hero | Inter | `clamp(32px, 6vw, 58px)` | 800 |
| CTA buttons | DM Sans | `clamp(15px, 1.8vw, 18px)` | 700 |
| Body / descriptions | DM Sans | `clamp(12px, 1.4vw, 14px)` | 400 |
| Labels / eyebrows | DM Sans | `clamp(10px, 1.2vw, 12px)` | 700, uppercase |

---

## Business Rules

- **POSTPAID.** Payment triggered after barber taps Complete — never during booking.
- **Cashless only.** QRIS (on kiosk screen) and card (via Xendit Terminal). No cash.
- **Tip** is shown on PaymentTakeover only — never on booking confirmation.
- **Barber taps Complete** → backend emits SSE `payment_trigger` → kiosk opens PaymentTakeover.
- **Staff panel** → tap Topbar logo → password modal (Admin) or PIN modal (Barber).
- **All data is branch-scoped.** Every DB query includes `branch_id`. Every API call filters by branch.
- **Booking lifecycle:** `confirmed → in_progress → pending_payment → completed | no_show | cancelled`
- **Kiosk device auth:** permanent device token in localStorage, sent as `X-Kiosk-Token` header.
- **Any Available assignment:** fewest any-available bookings today, tiebreak by sort_order.
- **No-show / cancel:** admin-only actions via Live Queue Management. Barbers use "Belum Datang" alert only.
- **Escalation:** auto WA to barber on new booking; recurring WA if barber hasn't started by threshold.

---

## Language Rules

| App | Rule |
|---|---|
| Kiosk | English primary label + Bahasa Indonesia subtitle below every label |
| Barber Panel | Bahasa Indonesia only |
| Admin Dashboard | English primary |

---

## Touch / UX Rules (Kiosk)

- Minimum **72px height** for all tappable elements
- **`clamp()`** for all font sizes, padding, widths — no fixed pixel layout
- **`onClick`** for all interactions — never `onTouchStart`
- **`overscroll-behavior: none`** on body
- **`-webkit-overflow-scrolling: touch`** on scrollable containers
- No hover-only states
- Kiosk screen: **30-inch landscape**

---

## Common Mistakes — Never Do These

| Mistake | Correct |
|---|---|
| Yellow as text on white/light background | Yellow is a background only — text on yellow is `#111110` |
| Muted/grey text on selected yellow card | All text flips to `#111110` on yellow |
| `onTouchStart` for interactions | Always `onClick` |
| Fixed pixel widths for layout | Use `clamp(min, fluid, max)` |
| Payment step inside the booking flow | PaymentTakeover only — triggered post-service via SSE |
| Tip on booking confirmation | Tip is on PaymentTakeover only |
| English copy in barber panel | Bahasa Indonesia only |
| DB query without `branch_id` filter | Every query must be branch-scoped |
| `useState` for triple-tap counter | Use `useRef` — re-renders break tap timing |
| `proxy_buffering on` in Nginx for SSE | Always `proxy_buffering off` |
| Single commission rate per barber | Commission is per-service; barbers.commission_rate is fallback only |
| Kasbon in payroll adjustments | Kasbon flows from Expenses (type=kasbon) — auto-imported, read-only in payroll |

---

## decisions-log.md Format

Append one line after every session where a decision is made:

```
YYYY-MM-DD | [decision] | [reason]
```

This file is read first every session. It is the ground truth for what has been decided.
