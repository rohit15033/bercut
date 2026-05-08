# Bercut Barber Shop — CLAUDE.md
*Auto-loaded by Claude Code every session.*

---

## Agency Knowledge Base

<<<<<<< Updated upstream
You are the **primary brain** for the Bercut project. You do everything except physically run
the app. Antigravity (Google IDE AI agent) is the executor — it reads your output, runs it on
localhost, and wires it to a real backend.

**You build:**
- Feature planning and technical specs
- Architecture decisions
- Visual mockups (`mockups/`) — frozen; change only if Bercut requests it
- Shared frontend foundation (`frontend/src/shared/`, `frontend/src/App.jsx`)
- Production screens (`frontend/src/apps/`)
- Entire backend (`backend/`)
- Deploy configuration (`deploy/`)
- Reviewing and correcting Antigravity's output when needed
- Keeping `_ai/decisions-log.md` updated after every session

**Antigravity owns:**
- Building production screens in `frontend/src/apps/`
- Building the entire `backend/`
- Running the app on localhost and verifying it looks and works correctly
- Wiring real API calls into the screens you prototyped
=======
Vault path: `C:\Users\krisn\documents\github\headstart\headstart-brain\`

Client page: `clients/bercut.md`

Rules:
- Use `claude-obsidian` plugin to read client context, SOPs, and project briefs
- Do not hardcode vault path elsewhere

## graphify

Knowledge graph at `graphify-out/`.

Rules:
- Before architecture or cross-module questions, read `graphify-out/GRAPH_REPORT.md`
- If `graphify-out/wiki/index.md` exists, navigate it instead of raw files
- For "how does X relate to Y" questions, prefer `graphify query/path/explain` over grep
- After modifying code files, run `graphify update .` to keep graph current
>>>>>>> Stashed changes

---

## Tech Lead

You are Tech Lead for Bercut — a client project of Headstart AI Agency. You orchestrate the agent team. You have two modes.

<<<<<<< Updated upstream
The current phase is: **PRODUCTION BUILD**.
- Mockups in `mockups/` are frozen — they are the approved visual contract
- `backend/` and `frontend/src/apps/` are now actively being built by Antigravity
- Any mockup changes require re-audit of affected sections

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
=======
### Partner Mode (default)

Activate when Rohit brings idea, feature request, or design question. For status checks and technical lookups, answer directly.

- Read `_ai/decisions-log.md` (ground truth — always first)
- Read `_ai/system-plan.md` for schema + API contracts
- Read `headstart-brain/clients/bercut.md` for client context
- Ask clarifying questions before accepting feature scope
- Challenge scope creep, bad UX assumptions, over-engineering
- Propose decomposed task list with role assignments before dispatching
- Dispatch Product Agent before any code discussion when Rohit describes new feature — no exceptions

### Execution Mode

Activate once Rohit approves a feature. No explicit approval phrase = default to Partner Mode.

1. **Assemble context packet** — read `_ai/decisions-log.md`, `_ai/system-plan.md`, `_ai/prompting-guide.md`, relevant `headstart-brain/` pages
2. **Dependency analysis** — determine parallel vs sequential dispatch:
   - Product Agent runs first — no code work starts until PRD approved by Rohit
   - UI/UX Design Agent + Backend Engineer fire in parallel after PRD approval
   - Frontend Engineer waits until both design frames AND backend API contract exist
   - QA Engineer runs after Frontend PR is open (pre-deploy), then after VPS preview exists (post-deploy)
   - DevOps deploys only after QA sign-off
3. **Dispatch specialists** — load role skill first (via Skill tool), dispatch via Agent tool into isolated git worktree (`superpowers:using-git-worktrees`), one worktree per role
4. **Review PRs** — use github-mcp to review, approve, request changes, or escalate to Rohit
5. **Report back** — summarise what merged, what's in review, what's blocked

### Global Rules

- Stack: React + Vite PWA, inline styles via `tokens.js`, Node.js + Express, PostgreSQL, SSE, Xendit Terminal H2H + QRIS
- Branch naming: `feat/<name>`, `fix/<name>`, `chore/<name>`
- No direct commits to main — all work via PR
- PR size: focused and reviewable — decompose large features into stacked PRs
- Specialists own strict boundaries:
  - Frontend never touches `backend/`, `db/`, `deploy/`
  - Backend never touches `frontend/src/apps/` or `frontend/src/shared/` (except when API contract change requires frontend type update — flag to Rohit first)
  - DevOps owns `deploy/`, `.github/workflows/`, nginx config, PM2

### Specialist Roles

Dispatch via Agent tool. Load role skill before dispatch.

| Role | Skill | Owns | Stack Context |
|------|-------|------|---------------|
| Product Agent | product-agent | PRD, user stories, acceptance criteria, task breakdown | — |
| UI/UX Design Agent | uiux-design-agent | Design brief, mockup updates in `mockups/` | Inline styles, `tokens.js`, 30-inch kiosk landscape |
| Frontend Engineer | frontend-engineer | `frontend/src/` | React + Vite PWA, no Tailwind, tokens.js design system |
| Backend Engineer | backend-engineer | `backend/`, `backend/db/` | Express + PostgreSQL, SSE single-instance, Xendit H2H |
| QA Engineer | qa-engineer | E2E suite, regression checks, bug report — also Validation Agent | Test against VPS preview URL |
| DevOps Engineer | devops-engineer | `deploy/`, `.github/workflows/`, nginx, PM2 | Rumahweb VPS, Ubuntu 22.04, PM2 single instance |

---

## Project Context
>>>>>>> Stashed changes

Bercut Barber Shop — self-service kiosk POS system.
Barbershop chain, 6+ branches across Bali, Indonesia.
Two PWA apps in one Vite build: **Kiosk** (includes BarberPanel) and **Admin Dashboard**.
One Node.js + Express backend. Self-hosted on Rumahweb VPS.

<<<<<<< Updated upstream
**Always read before starting any session:**
- `_ai/decisions-log.md` — ground truth for all decisions (read first)
- `_ai/system-plan.md` — full system design, DB schema, user flows, business rules
- `_ai/prompting-guide.md` — build phases, per-screen handoff, API contracts
- `_ai/pre-build-audit.md` — gap analysis, known issues, checklist
=======
**Always read before any session:**
- `_ai/decisions-log.md` — ground truth for all decisions (read first, every session)
- `_ai/system-plan.md` — full schema, API contracts, business rules
- `_ai/prompting-guide.md` — build phases, per-screen handoff
- `_ai/pre-build-audit.md` — known gaps
>>>>>>> Stashed changes

---

## Repo Structure

```
bercut/
│
<<<<<<< Updated upstream
├── _ai/                              ← Read every session
│   ├── CLAUDE.md                     ← This file
=======
├── CLAUDE.md                             ← Root pointer
├── _ai/                                  ← Read every session
│   ├── CLAUDE.md                         ← This file
>>>>>>> Stashed changes
│   ├── system-plan.md
│   ├── prompting-guide.md
│   ├── decisions-log.md
│   └── pre-build-audit.md
│
├── mockups/                              ← Frozen visual contract
│   ├── kiosk/
<<<<<<< Updated upstream
│   │   ├── BercutKiosk.jsx           ← main kiosk router
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
=======
│   └── admin/
│
├── frontend/                             ← Production frontend
│   ├── vite.config.js
│   └── src/
│       ├── shared/                       ← tokens.js, api.js, useSSE.js, components/
│       └── apps/
│           ├── kiosk/
│           └── admin/
>>>>>>> Stashed changes
│
├── backend/                              ← Production backend
│   ├── server.js
<<<<<<< Updated upstream
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
│       ├── schema.sql
│       └── seed.sql
│
└── deploy/
    ├── nginx.conf
    ├── ecosystem.config.js
    └── setup.sh
=======
│   ├── config/db.js
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── db/schema.sql
│
├── deploy/
│   ├── nginx.conf
│   ├── ecosystem.config.js
│   └── setup.sh
│
└── .github/
    └── workflows/
        └── deploy.yml                    ← CI/CD: push to main → VPS deploy
>>>>>>> Stashed changes
```

---

<<<<<<< Updated upstream
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
  try_files $uri $uri/ /index.html;   # SPA fallback for React Router
}
```
=======
## Business Rules (Critical)

- **POSTPAID** — payment after barber taps Complete, never during booking
- **Cashless only** — QRIS (kiosk screen) + Xendit Terminal card
- **Branch-scoped** — every DB query includes `branch_id`
- **Booking lifecycle**: `confirmed → in_progress → pending_payment → completed | no_show | cancelled`
- **Kiosk device auth** — permanent token in localStorage, sent as `X-Kiosk-Token` header
- **Any Available assignment** — fewest any-available bookings today, tiebreak by `sort_order`
- **No-show / cancel** — admin-only via Live Queue Management
- **Barber taps Complete** → backend emits SSE `payment_trigger` → kiosk opens PaymentTakeover
- **SSE requires single PM2 instance** — never cluster; subscriber map is in-process
>>>>>>> Stashed changes

---

## Design Tokens

```js
// frontend/src/shared/tokens.js
export const tokens = {
  bg:         '#FAFAF8',
  surface:    '#F2F0EB',
  surface2:   '#ECEAE4',
  accent:     '#F5E200',  // yellow — CTA backgrounds ONLY
  accentText: '#111110',  // text ON yellow
  text:       '#111110',
  text2:      '#3A3A38',
  muted:      '#88887E',
  border:     '#DDDBD4',
  topBg:      '#111110',
  topText:    '#F5E200',
  white:      '#FFFFFF',
  danger:     '#C0272D',
}
```

<<<<<<< Updated upstream
---

## Colour Rules — Critical

1. **Yellow (`#F5E200`) is NEVER text on white or light backgrounds.** Yellow is a filled background only.
2. **Text ON yellow must always be `#111110`.**
3. **Selected card state:** background → `#F5E200`, ALL text inside → `#111110`. No exceptions.
4. **`#111110` is the primary button colour** — dark button, white text. Not yellow.
5. **Yellow on dark topbar** = valid. Logo and topText use this.
=======
**Colour rules — never violate:**
1. Yellow (`#F5E200`) is NEVER text on white/light backgrounds — background only
2. Text ON yellow = `#111110` always
3. Selected card: bg → `#F5E200`, ALL text inside → `#111110`
4. Primary button = `#111110` dark, white text — not yellow
>>>>>>> Stashed changes

---

## Typography

| Use | Font | Size | Weight |
|-----|------|------|--------|
| Screen titles | Inter | `clamp(26px, 3.5vw, 38px)` | 800 |
| Service/barber names | Inter | `clamp(13px, 1.6vw, 15px)` | 700 |
| Prices | Inter | `clamp(15px, 2vw, 20px)` | 700–800 |
| Queue number hero | Inter | `clamp(32px, 6vw, 58px)` | 800 |
| CTA buttons | DM Sans | `clamp(15px, 1.8vw, 18px)` | 700 |
| Body/descriptions | DM Sans | `clamp(12px, 1.4vw, 14px)` | 400 |
| Labels/eyebrows | DM Sans | `clamp(10px, 1.2vw, 12px)` | 700, uppercase |

---

## Touch / UX Rules (Kiosk)

<<<<<<< Updated upstream
- **POSTPAID.** Customers never pay during or after the booking flow. Payment is a separate mode triggered when barber taps Complete.
- **Cashless only.** QRIS and card via Xendit Terminal H2H. No cash.
- **Tip** is shown on PaymentTakeover — never on booking confirmation.
- **Barber taps Complete** → backend emits SSE `payment_trigger` → kiosk opens PaymentTakeover.
- **Staff panel** → tap Topbar logo → password modal (Admin) or PIN modal (Barber).
- **All data is branch-scoped.** Every DB query includes `branch_id`. Every API call filters by branch.
- **Booking lifecycle:** `confirmed → in_progress → pending_payment → completed | no_show | cancelled`
=======
- Min **72px height** for all tappable elements
- `clamp()` for all font sizes, padding, widths — no fixed pixel layout
- `onClick` for all interactions — never `onTouchStart`
- `overscroll-behavior: none` on body
- `-webkit-overflow-scrolling: touch` on scrollable containers
- No hover-only states
- Kiosk screen: **30-inch landscape**
>>>>>>> Stashed changes

---

## Language Rules

<<<<<<< Updated upstream
| App | Language rule |
|---|---|
=======
| App | Rule |
|-----|------|
>>>>>>> Stashed changes
| Kiosk | English primary label + Bahasa Indonesia subtitle below every label |
| Barber Panel | Bahasa Indonesia only |
| Admin Dashboard | English primary |

---

<<<<<<< Updated upstream
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
=======
## Common Mistakes — Never Do These

| Mistake | Correct |
|---------|---------|
| Yellow as text on white/light background | Yellow is background only |
| Muted/grey text on selected yellow card | All text flips to `#111110` on yellow |
| `onTouchStart` for interactions | Always `onClick` |
| Fixed pixel widths | Use `clamp(min, fluid, max)` |
| Payment step inside booking flow | PaymentTakeover only — post-service via SSE |
| Tip on booking confirmation | Tip is on PaymentTakeover only |
| English copy in barber panel | Bahasa Indonesia only |
| DB query without `branch_id` filter | Every query must be branch-scoped |
| `useState` for triple-tap counter | Use `useRef` — re-renders break tap timing |
| `proxy_buffering on` in nginx for SSE | Always `proxy_buffering off` |
| Single commission rate per barber | Commission is per-service; `barbers.commission_rate` is fallback |
| PM2 `instances: 'max'` | Always `instances: 1` — SSE requires single instance |
>>>>>>> Stashed changes

---

## decisions-log.md Format

Append one line after every session where decision is made:

```
YYYY-MM-DD | [decision] | [reason]
```

<<<<<<< Updated upstream
```
2026-03-25 | Single Vite app with routing — not monorepo | simpler for one dev, one VPS
2026-03-25 | Rumahweb VPS self-hosted | client already has VPS, avoids Railway/Render cost
2026-03-25 | SSE for real-time — not WebSockets | zero extra infra, sufficient for queue updates
2026-04-04 | Xendit Terminal H2H — replaces BCA EDC entirely | Android kiosk is half the cost of Windows; Xendit is internet-based REST so no platform constraint; internet dependency on payments accepted by Bercut
2026-03-25 | Web Speech API for P1 notifications — no Fonnte/Zenziva | free, zero setup, barbers on premises
```

This file is read first every session. It is the ground truth for what has been decided.
=======
This file is read first every session. It is ground truth for what has been decided.
>>>>>>> Stashed changes
