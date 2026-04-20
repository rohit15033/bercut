# Bercut Barber Shop — CLAUDE.md
*Auto-loaded by Claude Code every session.*

---

## Your Role

You are the **primary brain** for the Bercut project. You do everything except physically run
the app. Antigravity (Google IDE AI agent) is the executor — it reads your output, runs it on
localhost, and wires it to a real backend.

**You own:**
- Feature planning and technical specs
- Architecture decisions
- Visual mockups (`mockups/`)
- Shared frontend foundation (`frontend/src/shared/`, `frontend/src/App.jsx`)
- Deploy configuration (`deploy/`)
- Reviewing and correcting Antigravity's output when needed
- Keeping `_ai/decisions-log.md` updated after every session

**Antigravity owns:**
- Building production screens in `frontend/src/apps/`
- Building the entire `backend/`
- Running the app on localhost and verifying it looks and works correctly
- Wiring real API calls into the screens you prototyped

---

## Build Gate — PASSED ✅

**Pre-build audit completed 2026-04-20. All 28 checklist items PASS.**
See `_ai/pre-build-audit.md` for the full audit.

The current phase is: **PRODUCTION BUILD**.
- Mockups in `mockups/` are frozen — they are the approved visual contract
- `backend/` and `frontend/src/apps/` are now actively being built by Antigravity
- Any mockup changes require re-audit of affected sections

If Bercut requests changes during production build:
1. Check whether the change affects DB schema or API contract in `_ai/system-plan.md`
2. If it does, update `system-plan.md` and `decisions-log.md` first
3. Then update the mockup for visual reference
4. Then update the production code

---

## Workflow — Production Build Phase

```
Step 1 — PLAN
  Read _ai/system-plan.md, _ai/decisions-log.md, and _ai/pre-build-audit.md
  Identify which module/phase to build next (see prompting-guide.md Section 03)
  Check for known gaps in pre-build-audit.md Section F2

Step 2 — BUILD (Antigravity)
  Follow prompting-guide.md build phases in order:
    Phase 0: Foundation (schema, backend skeleton, frontend foundation, SSE)
    Phase 1: Kiosk booking flow (services → confirm → queue → payment → barber panel)
    Phase 2: Admin dashboard (all 16 screens)
    Phase 3: Services layer (background jobs, escalation, payroll calculator)
    Phase 4: Deployment config (nginx, PM2, setup script)
  For each screen:
    a. Read the mockup file as visual reference
    b. Build the production screen in frontend/src/apps/
    c. Build the backend route(s) it needs
    d. Replace mock data with real API calls
    e. Test on localhost, verify visually against mockup

Step 3 — REVIEW (Claude Code, when needed)
  If Antigravity's output has structural or logic problems, review and correct
  Update _ai/decisions-log.md with anything that changed

Step 4 — DEPLOY
  Build frontend: cd frontend && npm run build → outputs to backend/public/
  Transfer to VPS, run schema + seed, start with PM2
```

---

## Project

Bercut Barber Shop — self-service kiosk POS system.
Barbershop chain, 6+ branches across Bali, Indonesia.
Two PWA apps in one Vite build: **Kiosk** (includes BarberPanel) and **Admin Dashboard**.
One Node.js + Express backend. Self-hosted on Rumahweb VPS.

**Always read before starting any session:**
- `_ai/system-plan.md` — full system design, DB schema, user flows, business rules
- `_ai/prompting-guide.md` — build phases, per-screen handoff, API contracts
- `_ai/decisions-log.md` — running log of all decisions (most recent = ground truth)
- `_ai/pre-build-audit.md` — gap analysis, known issues, checklist

---

## Repo Structure

```
bercut-kiosk/
│
├── _ai/                              ← Read every session
│   ├── CLAUDE.md                     ← This file
│   ├── system-plan.md
│   ├── prompting-guide.md
│   └── decisions-log.md
│
├── mockups/                          ← Claude Code builds here
│   ├── kiosk/
│   │   ├── BercutKiosk.jsx           ← main kiosk router
│   │   ├── Welcome.jsx
│   │   ├── ServiceSelection.jsx
│   │   ├── BarberSelection.jsx
│   │   ├── TimeSlot.jsx
│   │   ├── Confirm.jsx
│   │   ├── QueueNumber.jsx
│   │   ├── PaymentTakeover.jsx
│   │   ├── StaffPanel.jsx
│   │   ├── BarberPanel.jsx           ← kiosk barber mode (PIN-protected)
│   │   └── AdminPanel.jsx            ← kiosk admin mode (password-protected)
│   │   NOTE: No barber-app/ folder — barber functions live inside kiosk panels (Meeting 2)
│   └── admin/
│       ├── BercutAdmin.jsx           ← main admin router + sidebar (14 nav items)
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
│       └── data.js                  ← mock data (frozen, reference only)
│
├── frontend/                         ← Antigravity builds here (production)
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   └── icons/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                   ← Claude Code writes this
│       ├── shared/                   ← Claude Code owns this entirely
│       │   ├── tokens.js
│       │   ├── api.js
│       │   ├── useSSE.js
│       │   └── components/
│       │       ├── Topbar.jsx
│       │       ├── Button.jsx
│       │       └── Card.jsx
│       └── apps/                     ← Antigravity builds here
│           ├── kiosk/
│           │   ├── KioskApp.jsx     ← shell: device setup, idle, offline, panels
│           │   ├── screens/         ← all kiosk screens (11 files)
│           │   └── components/
│           └── admin/
│               ├── AdminApp.jsx     ← shell: sidebar, auth, permissions
│               ├── screens/         ← all admin screens (16 files)
│               └── components/
│
├── backend/                          ← Antigravity builds here
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   ├── server.js
│   ├── config/
│   │   └── db.js                     ← PostgreSQL pool (node-postgres)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── branches.js
│   │   ├── services.js
│   │   ├── barbers.js
│   │   ├── slots.js
│   │   ├── bookings.js
│   │   ├── payments.js
│   │   ├── attendance.js
│   │   ├── expenses.js
│   │   ├── inventory.js
│   │   ├── reports.js
│   │   └── events.js                 ← SSE endpoint GET /api/events?branch_id=
│   ├── middleware/
│   │   ├── auth.js                   ← JWT verification
│   │   └── branchScope.js            ← Enforces branch_id on every query
│   ├── services/
│   │   ├── slotGenerator.js          ← Slot availability logic (pure, testable)
│   │   ├── notifications.js          ← SSE emit + Web Push Phase 2
│   │   └── escalation.js             ← Acknowledgement timer + escalation
│   └── db/
│       ├── schema.sql                ← Full PostgreSQL schema (run once on VPS)
│       └── seed.sql                  ← Dev seed data
│
└── deploy/                           ← Claude Code builds here
    ├── nginx.conf
    ├── ecosystem.config.js
    └── setup.sh
```

---

## What Claude Code Builds In Detail

### mockups/
Every screen gets a mockup before Antigravity touches production code. No exceptions.

Rules for every mockup file:
- One screen per file
- Hardcoded realistic mock data at the top (IDR prices, Indonesian names, real bilingual copy)
- All state self-contained with `useState` — must run with zero props passed in
- Inline styles only — no Tailwind, no CSS modules, no imports from `src/`
- No API calls whatsoever
- Follow every design token and rule in this file exactly

Required header on every mockup:
```jsx
/**
 * MOCKUP — Bercut [Kiosk | Barber App | Admin]: [Screen Name]
 *
 * What it does: [one sentence]
 * State managed: [useState variables this screen owns]
 * Production API: [the real endpoint Antigravity will connect]
 * Feeds into: [what screen or event comes next]
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/[kiosk|barber|admin]/screens/[ScreenName].jsx
 * Reference prompt: _ai/prompting-guide.md Section [N]
 */
```

### frontend/src/shared/
You write and own all shared infrastructure:

```js
// tokens.js — single source of truth for all design tokens
// api.js — base fetch wrapper, reads VITE_API_URL from env
// useSSE.js — EventSource hook, auto-reconnects, accepts branch_id param
// App.jsx — root router: /kiosk → KioskApp, /barber → BarberApp, /admin → AdminApp
// shared/components/ — Topbar, Button, Card base components used across all three apps
```

### deploy/
```
nginx.conf         — reverse proxy config, SSE buffering off, SPA fallback
ecosystem.config.js — PM2 config, single instance (required for SSE)
setup.sh           — one-time VPS setup: Node, Postgres, Nginx, PM2, firewall rules
```

---

## What Antigravity Builds In Detail

### frontend/src/apps/
For each screen, Antigravity:
1. Opens the mockup from `mockups/` as visual reference
2. Reads the matching section in `_ai/prompting-guide.md` for API and logic details
3. Builds the screen in `frontend/src/apps/[app]/screens/`
4. Uses `shared/api.js` for all fetch calls
5. Uses `shared/useSSE.js` for real-time subscriptions
6. Opens localhost in the IDE browser, verifies it matches the mockup visually

### backend/
1. Reads `_ai/system-plan.md` Sections 06–09 for schema, business rules, and API contracts
2. Reads `_ai/prompting-guide.md` Sections 08–09 for schema SQL and endpoint logic
3. Creates `backend/db/schema.sql` and runs it on Postgres
4. Builds each route file in `backend/routes/`
5. Tests each endpoint before moving to the next

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite PWA | Single app, three routes |
| Styling | Inline styles in mockups, tokens.js in production | No Tailwind |
| Backend | Node.js + Express | REST + SSE |
| Database | PostgreSQL | Self-hosted on VPS |
| Real-time | Server-Sent Events | `GET /api/events?branch_id=` |
| Payment | Xendit Terminal H2H | REST API from backend → terminal → webhook confirm. No BCA EDC, no Midtrans. |
| Notifications P1 | Web Speech API | Kiosk speaker, free, zero setup |
| Notifications P2 | Web Push PWA | Free, Android Chrome |
| Receipts | ESC/POS thermal printer | Epson TM-T82 or equivalent |
| Hosting | Rumahweb VPS | Nginx + PM2 + PostgreSQL self-hosted |

### Key Vite config
```js
server: { proxy: { '/api': 'http://localhost:3000' } },  // dev only
build: { outDir: '../backend/public' }  // Nginx serves from here in production
```

### Key Nginx rules
```nginx
location /api/ {
  proxy_pass http://localhost:3000;
  proxy_buffering off;    # CRITICAL — never remove, SSE breaks without this
  proxy_cache off;
  chunked_transfer_encoding on;
}
location / {
  try_files $uri $uri/ /index.html;   # SPA fallback for React Router
}
```

---

## Design Tokens

```js
// frontend/src/shared/tokens.js — use these exact values everywhere
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

1. **Yellow (`#F5E200`) is NEVER text on white or light backgrounds.** Contrast fails. Yellow is a filled background only.
2. **Text ON yellow must always be `#111110`.**
3. **Selected card state:** background → `#F5E200`, ALL text inside including muted labels, durations, prices → `#111110`. No exceptions.
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

- **POSTPAID.** Customers never pay during or after the booking flow. Payment is a separate mode triggered when barber taps Complete.
- **Cashless only.** QRIS and card via Xendit Terminal H2H. No cash.
- **Tip** is shown on PaymentTakeover — never on booking confirmation.
- **Barber taps Complete** → backend emits SSE `payment_trigger` → kiosk opens PaymentTakeover.
- **Staff panel** → triple-tap top-right corner of kiosk topbar. No PIN, no visual indicator.
- **All data is branch-scoped.** Every DB query includes `branch_id`. Every API call filters by branch.
- **Booking lifecycle:** `confirmed → in_progress → pending_payment → completed | no_show | cancelled`

---

## Languages

| App | Language rule |
|---|---|
| Kiosk | English primary label + Bahasa Indonesia subtitle below every label |
| Barber App | Bahasa Indonesia only — no English anywhere |
| Admin Dashboard | English primary |

---

## Touch / UX Rules (Kiosk)

- Minimum **72px height** for all tappable elements
- **`clamp()`** for all font sizes, padding, widths — no fixed pixel layout
- **`onClick`** for all interactions — never `onTouchStart`
- **`overscroll-behavior: none`** on body
- **`-webkit-overflow-scrolling: touch`** on scrollable containers
- No hover-only states

---

## Common Mistakes — Never Do These

| Mistake | Correct |
|---|---|
| Yellow as text on white/light background | Yellow is a background only — text on yellow is `#111110` |
| Grey/muted text left on selected yellow card | All text flips to `#111110` on yellow background |
| `onTouchStart` for interactions | Always `onClick` |
| Fixed pixel widths for layout | Use `clamp(min, fluid, max)` |
| Payment step inside the booking flow | PaymentTakeover only — triggered post-service via SSE |
| Tip on booking confirmation screen | Tip is on PaymentTakeover only |
| English copy in barber app | Bahasa Indonesia only |
| DB query without `branch_id` filter | Every query must be branch-scoped |
| `useState` for triple-tap counter | Use `useRef` — re-renders break tap timing |
| `proxy_buffering on` in Nginx for SSE | Always `proxy_buffering off` |

---

## decisions-log.md Format

Append one line after every session where a decision is made:

```
YYYY-MM-DD | [decision] | [reason]
```

```
2026-03-25 | Single Vite app with routing — not monorepo | simpler for one dev, one VPS
2026-03-25 | Rumahweb VPS self-hosted | client already has VPS, avoids Railway/Render cost
2026-03-25 | SSE for real-time — not WebSockets | zero extra infra, sufficient for queue updates
2026-04-04 | Xendit Terminal H2H — replaces BCA EDC entirely | Android kiosk is half the cost of Windows; Xendit is internet-based REST so no platform constraint; internet dependency on payments accepted by Bercut
2026-03-25 | Web Speech API for P1 notifications — no Fonnte/Zenziva | free, zero setup, barbers on premises
```

This file is read first every session. It is the ground truth for what has been decided.
