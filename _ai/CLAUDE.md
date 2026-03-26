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

## Build Gate — Mockup Approval Required

**No backend will be built until Bercut has reviewed and approved all mockups.**

The current phase is: **MOCKUP ITERATION**.
- All work happens in `mockups/` only
- `backend/` and `frontend/src/apps/` are not touched until approval is given
- Bercut must explicitly sign off on every app (Kiosk, Barber App, Admin) before
  Antigravity moves to production build

When Bercut requests changes to a mockup:
1. Make the visual change in `mockups/`
2. **Before finalising**: check whether the change affects the DB schema or API contract
   in `_ai/system-plan.md` Sections 06–09. If it does, update those sections first.
3. Log the decision in `_ai/decisions-log.md`
4. Only then update the mockup JSX

**Schema/backend compatibility is non-negotiable.** If a UI change implies a new field,
a new table, a changed status lifecycle, or a different API shape — that must be resolved
in the plan before the mockup is considered final.

---

## Workflow Per Feature

```
Step 1 — PLAN (Claude Code)
  Read _ai/system-plan.md and _ai/decisions-log.md before touching anything
  Think through: data shape, edge cases, component breakdown, API contract
  For complex features: write a short spec as a comment block before any code

Step 2 — MOCKUP (Claude Code)
  Build the screen in mockups/ as a self-contained JSX prototype
  Hardcoded mock data, inline styles, zero backend calls
  Must look exactly right — this is Antigravity's visual contract

Step 2b — MOCKUP CHANGE REQUEST (when Bercut asks for changes)
  Before touching the mockup JSX, ask:
    - Does this change add/remove a field that needs a DB column?
    - Does this change alter a status, lifecycle, or flow that backend enforces?
    - Does this change require a new or modified API endpoint?
  If yes to any → update _ai/system-plan.md Sections 06–09 first, log in decisions-log.md
  If no → update mockup directly

Step 3 — HANDOFF (Claude Code → Antigravity) ← only after Bercut approves all mockups
  Tell Antigravity:
    - Which mockup to reference: e.g. "mockups/kiosk/ServiceSelection.jsx"
    - Which prompting guide section to read: e.g. "_ai/prompting-guide.md Section 03"
    - Which API to connect: e.g. "GET /api/services?branch_id="
    - Which backend route to build: e.g. "backend/routes/services.js"
    - Where production file goes: e.g. "frontend/src/apps/kiosk/screens/ServiceSelection.jsx"

Step 4 — EXECUTE (Antigravity)
  Antigravity builds production screen + backend route
  Runs on localhost, checks it visually against the mockup
  Fixes until it matches

Step 5 — REVIEW (Claude Code, when needed)
  If Antigravity's output has structural or logic problems, review and correct
  Update _ai/decisions-log.md with anything that changed
```

---

## Project

Bercut Barber Shop — self-service kiosk POS system.
Barbershop chain, 6+ branches across Bali, Indonesia.
Three PWA apps in one Vite build: **Kiosk**, **Barber App**, **Admin Dashboard**.
One Node.js + Express backend. Self-hosted on Rumahweb VPS.

**Always read before starting any session:**
- `_ai/system-plan.md` — full system design, DB schema, user flows, business rules
- `_ai/prompting-guide.md` — screen-by-screen design specs and API prompts
- `_ai/decisions-log.md` — running log of all decisions (most recent = ground truth)

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
│   │   ├── Welcome.jsx
│   │   ├── ServiceSelection.jsx
│   │   ├── BarberSelection.jsx
│   │   ├── TimeSlot.jsx
│   │   ├── Confirm.jsx
│   │   ├── QueueNumber.jsx
│   │   ├── PaymentTakeover.jsx
│   │   └── StaffPanel.jsx
│   ├── barber-app/
│   │   ├── Login.jsx
│   │   ├── ClockIn.jsx
│   │   ├── QueueView.jsx
│   │   └── AddServiceModal.jsx
│   └── admin/
│       ├── Overview.jsx
│       ├── BranchDetail.jsx
│       ├── Reports.jsx
│       ├── Expenses.jsx
│       ├── Inventory.jsx
│       └── Settings.jsx
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
│           │   ├── KioskApp.jsx
│           │   ├── screens/
│           │   └── components/
│           ├── barber/
│           │   ├── BarberApp.jsx
│           │   ├── screens/
│           │   └── components/
│           └── admin/
│               ├── AdminApp.jsx
│               ├── screens/
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
| Payment | BCA EDC — Serial/USB ISO 8583 or local TCP | No Midtrans, no gateway |
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
- **Cashless only.** QRIS and card via BCA EDC. No cash.
- **Tip** is shown on PaymentTakeover — never on booking confirmation.
- **Barber taps Complete** → backend emits SSE `payment_trigger` → kiosk opens PaymentTakeover.
- **Staff panel** → triple-tap top-right corner of kiosk topbar. No PIN, no visual indicator.
- **All data is branch-scoped.** Every DB query includes `branch_id`. Every API call filters by branch.
- **Booking lifecycle:** `confirmed → in_progress → pending_payment → completed | no_show | cancelled`

---

## Languages

| App | Language rule |
|---|---|
| Kiosk | Bahasa Indonesia primary label + English subtitle below every label |
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
2026-03-25 | BCA EDC direct integration — no payment gateway | client requirement, works offline
2026-03-25 | Web Speech API for P1 notifications — no Fonnte/Zenziva | free, zero setup, barbers on premises
```

This file is read first every session. It is the ground truth for what has been decided.
