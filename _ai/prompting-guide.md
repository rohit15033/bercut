# Bercut Barber Shop — Antigravity Prompting Guide
*v1.0 · March 2026 · Confidential*

---

## 01 — How to Use This Guide

This guide contains ready-to-paste prompts for building each module of the Bercut system in Antigravity. Every prompt is self-contained but assumes the Master System Prompt (Section 02) has already been pasted at the start of the session.

**Session structure:**
1. Paste the Master System Prompt (Section 02) — every session, every module, no exceptions
2. Reference the prototype: "The design follows bercut-kiosk.jsx — same tokens, same component patterns."
3. Paste the specific feature prompt
4. Validate colour usage immediately — is yellow used as text on white anywhere? Fix before moving on.
5. Test on Android touchscreen landscape dimensions and verify layout before declaring a screen done. No code changes needed vs Windows — same PWA, same Chrome, same behaviour.

---

## 02 — Master System Prompt

> Paste this entire block at the start of every new Antigravity session. Without this context, the AI will make wrong assumptions about payment flow, colour usage, and language requirements.

```
# Bercut Barber Shop — System Context

## Project
You are building the Bercut Barber Shop POS and self-service system.
Bercut is a barbershop chain with 6+ branches in Bali, Indonesia.
The system has three PWA apps sharing one codebase: Kiosk, Barber App, Admin Dashboard.

## Tech Stack
- Frontend: React PWA (all three apps)
- Backend: Node.js + Express REST API
- Database: PostgreSQL (self-hosted on Rumahweb VPS — no cloud DB)
- Real-time: Server-Sent Events (SSE) on the Node.js backend — native browser EventSource API,
  zero extra cost or infrastructure. Kiosk listens on GET /api/events?branch_id= for booking
  and payment events.
- Payments: Xendit Terminal H2H — REST API from Node.js backend to Xendit cloud. Terminal
  displays payment prompt, customer taps card/QRIS, Xendit sends webhook confirmation back to
  backend. Internet required for payments (accepted trade-off). BRI is the live Indonesia
  acquirer; no BRI merchant account needed — funds settle to Xendit Balance T+1. BCA EDC is
  NOT used. Midtrans is NOT used.
- Notifications Phase 1: Web Speech API kiosk speaker announcement — completely free, zero setup.
- Notifications Phase 2: Web Push API via PWA — free, Android Chrome, no per-message cost.
- IMPORTANT (Meeting 2): No separate Barber App. Barber functions (clock in/out, breaks,
  start/finish service) are accessed via the kiosk Topbar logo tap → PIN-protected barber panel.
  The kiosk has two access modes: Admin (full dashboard) and Barber (queue + clock management).
- Receipts: ESC/POS thermal printer per kiosk
- Hosting: Rumahweb VPS (Nginx + PM2 + PostgreSQL self-hosted). Vite build outputs to
  backend/public — Nginx serves from there (single origin, no CORS).

## Design Tokens (use these exact values — never deviate)
bg:         #FAFAF8   // warm off-white page background
surface:    #F2F0EB   // secondary surface, input backgrounds
surface2:   #ECEAE4   // tertiary surface, disabled states
accent:     #F5E200   // Bercut signature yellow — CTAs and selected states ONLY
accentText: #111110   // text ON yellow backgrounds
text:       #111110   // primary text
text2:      #3a3a38   // secondary text
muted:      #88887e   // placeholder, helper text
border:     #DDDBD4   // card borders, dividers
topBg:      #111110   // topbar, primary dark buttons
topText:    #F5E200   // text in topbar (yellow on black)
white:      #FFFFFF   // card surfaces
danger:     #C0272D   // destructive actions only

## Typography
Display/Headings: Inter (800 weight) — Barlow Condensed was rejected (too blocky for Bercut brand)
Body/UI copy:     DM Sans (400/500/600 weight)
Both loaded via Google Fonts.

## Colour Rules — CRITICAL
1. Yellow (#F5E200) is NEVER used as text colour on white/light backgrounds — contrast fails.
2. Yellow ONLY appears as: filled button background, selected card background, booking number hero.
3. Text ON yellow must always be #111110 (accentText).
4. Selected card state: background flips to yellow, ALL text inside flips to #111110.
5. topBg (#111110) is the primary action colour for dark buttons — not yellow.

## Business Rules
- Payment model: POSTPAID. Customers never pay during booking. Pay after service at kiosk counter.
- Payment methods: QRIS and card — both via Xendit Terminal H2H (REST API). NO CASH. NO BCA EDC.
- Tip: collected at payment time via kiosk. Presets configurable per branch (defaults: Rp 5k/10k/20k/50k/100k) + custom + skip. Individual per barber — NOT pooled.
- Barber triggers payment: when barber taps Complete, kiosk switches to payment mode.
- Staff panel: triple-tap top-right corner of topbar to open (while barber app doesn't exist yet).
- No front desk: no cashier role. Kiosk handles booking. Barber app handles queue + payment trigger.
- All data is branch-scoped. Every DB query must include branch_id.
- Booking status lifecycle: confirmed → in_progress → pending_payment → completed | no_show | cancelled

## Languages
- Kiosk: bilingual — English (primary label) + Bahasa Indonesia (subtitle below each label)
- Barber App: Bahasa Indonesia only
- Admin Dashboard: English primary

## Touch / UX Rules (Kiosk)
- Minimum 72px height for all tappable elements
- Use clamp() for all font sizes and spacing (responsive to any screen size)
- onClick for all interactions (not onTouchStart — breaks in browser environments)
- overscroll-behavior: none on body (prevents rubber-band scroll)
- -webkit-overflow-scrolling: touch on all scrollable containers
- No hover-only states — must work on touch-only devices
```

---

## 03 — Kiosk: Booking Flow

Customer self-service screens. Already prototyped in `bercut-kiosk.jsx` — use these prompts to rebuild cleanly with real backend connections.

> **Reference file:** The full working prototype is in `bercut-kiosk.jsx`. Use it as the visual and structural reference.

---

### Screen 1 — Welcome / Idle Screen
*Step 0 — No backend needed*

```
Build the Bercut kiosk Welcome screen as a React component.

## Visual requirements
- Full viewport height minus topbar (calc(100vh - 56px))
- Yellow accent bar (5px, #F5E200) at the very top
- Centered layout with three sections stacked vertically:
  1. BERCUT BARBERSHOP logo: large Barlow Condensed 900 weight, flanked by 2px vertical
     dividers, with "SEMINYAK · BALI" tag in yellow below
  2. Live clock: Barlow Condensed 900, ~88px, letterSpacing -0.04em, updates every second
     via useEffect/setInterval
  3. CTA button: full width max 520px, dark (#111110) background, white text,
     "✂ Mulai Booking / Start Booking", Barlow Condensed 800, 24px
- Bottom ticker: dark (#111110) bar with scrolling text animation listing branch locations
  in yellow/dark alternating colours
- onStart prop called when CTA is tapped

## Copy (bilingual)
Logo: BERCUT / BARBERSHOP
Tagline: SEMINYAK · BALI
CTA: Mulai Booking / Start Booking
Subtitle: Sentuh layar untuk memulai · Touch screen to begin
Ticker items: BERCUT BARBERSHOP, SEMINYAK, CANGGU, UBUD, ULUWATU, SANUR, DEWI SRI,
  NO.1 BARBERSHOP IN BALI, BUKA 10:00–20:00

## Animations
- Logo, clock, CTA each fade up with 0.08s stagger (animation: fadeUp 0.3s ease both)
- Ticker: infinite horizontal scroll animation (translateX 0 → -50%, 20s linear)
```

---

### Screen 2 — Service Selection (Step 1)
*Connects to GET /api/services?branch_id=*

```
Build the Bercut kiosk Service Selection screen.

## Layout
Two-column layout: main content area (flex:1) + right sidebar (width clamp(240px, 28vw, 300px))
On screens under 768px: stack vertically (sidebar below, max-height 280px)
Main area scrollable, sidebar fixed height with internal scroll for cart items.

## Main area
- Step header: eyebrow "Pilih layanan Anda", title "Choose Your Service" in Barlow Condensed 900 ~40px
- Category filter pills: Semua, Haircut, Beard, Color, Package — pill style,
  active = dark (#111110) bg white text, inactive = white bg with border
- Service card grid: auto-fill minmax(clamp(200px,28vw,300px), 1fr), gap clamp(10px,1.4vw,16px)

## Service card (unselected state)
- White background, 1.5px border (#DDDBD4), border-radius 14px, min-height 72px,
  padding clamp(14px,1.8vw,20px)
- Badge (if present): dark background, yellow text, top-left, font-size 10px
- Service name: Barlow Condensed 800, ~22px, color #111110
- Indonesian name: DM Sans 12px, color #88887e
- Bottom row: duration left (⏱ Xmin), price right (Barlow Condensed 800, ~20px, color #111110)

## Service card (selected state — class "sel")
- Background: #F5E200 (yellow), border: #F5E200
- ALL text: #111110 (accentText) — name, nameId, duration, price ALL flip to dark
- Checkmark circle top-right: #111110 background, #F5E200 check mark, 22px circle
- Badge: #111110 background, #F5E200 text (inverted)
- NEVER leave any text in muted/grey colour on yellow — contrast fails

## Sidebar cart
- Label: "Pilihan Anda" uppercase muted
- Empty state: scissors icon + "Belum ada pilihan / No services selected"
- Cart items: name + price left, × remove button right (min 44px touch target)
- Footer (when cart has items): duration row, Total row with Barlow Condensed 900 price
- Buttons: "Lanjutkan →" (primary dark, disabled if cart empty), "← Kembali" (ghost)

## State
cart: number[] (array of service IDs)
toggle(id): add if not present, remove if present
Filtered services by active category
Props: cart, setCart, onNext, onBack
```

---

### Screen 3 — Barber Selection (Step 2)
*Connects to GET /api/barbers?branch_id=*

```
Build the Bercut kiosk Barber Selection screen.

## Layout
Full scrollable page. Grid of barber cards: auto-fill minmax(clamp(180px,22vw,240px),1fr)
Below grid: full-width "Any barber" option card.
Footer: back button (width 160px) + primary continue button.

## Barber card (unselected)
- White bg, border #DDDBD4, border-radius 14px, padding clamp(16px,2vw,24px), text-align center
- Avatar: SVG circle, 80×80px, bg #ECEAE4 with subtle head/shoulder silhouette shapes
  Shows first 2 letters of name in Barlow Condensed 900 inside the circle.
  In production: replace SVG with <img> of barber's actual photo, object-fit cover, border-radius 50%
- Name: Barlow Condensed 900, ~26px
- Specialty: DM Sans 12px, muted
- Stats row: ★ rating | vertical divider | cut count — Barlow Condensed 800 18px each
- "Next: HH:MM" pill: #F2F0EB background, muted text

## Barber card (selected)
- Background: #F5E200, border: #F5E200
- ALL text flips to #111110 (accentText)
- Avatar SVG: bg flips to #111110, initials flip to #F5E200
- Stats text: #111110
- Next pill: semi-transparent #111110 bg, #111110 text
- White checkmark circle (22px) overlaid bottom-right of avatar

## "Any barber" card
- Full-width card below the grid
- 🎲 emoji in circle avatar (56px), left-aligned with text
- Title: "Kapster Mana Saja / Any Available Barber" Barlow Condensed 800
- Subtitle: "Antrian tercepat · Fastest available queue"
- Same selected state as barber cards

## Data shape
barber: { id, name, spec, specId, slots: string[], rating: number, cuts: number }
Props: barber (selected), setBarber, onNext, onBack
```

---

### Screen 4 — Time Slot (Step 3)
*Connects to GET /api/slots?barber_id=&date=*

```
Build the Bercut kiosk Time Slot selection screen.

## Layout
Full scrollable page. Step header. Slot grid. Selected slot confirmation card. Navigation buttons.

## Step header
Eyebrow: "Pilih waktu"
Title: "Pick Your Time" — Barlow Condensed 900 ~40px
Subtitle: "{barber.name} · {today in Indonesian long format}"

## Slot grid
Section label: "Slot Tersedia / Available Slots" uppercase muted 11px
Flex wrap, gap clamp(8px,1.2vw,14px)
Each slot button:
- padding clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)
- Barlow Condensed 800, ~18px
- Unselected: white bg, #DDDBD4 border, #111110 text
- Selected: #111110 bg, #111110 border, white text
- min-width clamp(80px,10vw,110px), min-height clamp(52px,7vh,64px)
- Stagger fade-up animation (i * 0.04s delay)

## Selection confirmation
When slot is selected, show a yellow (#F5E200) confirmation card with scaleIn animation:
- Large checkmark (✓) in Barlow Condensed 900 32px, colour #111110
- "Slot dipilih: {slot}" in Barlow Condensed 800 22px, colour #111110
- Barber name + date subtitle in muted dark text

## Slot generation logic (backend)
Slots are 30-minute blocks within barber's shift hours.
Exclude: already-booked slots, slots too short for selected service duration, past times.
Add 15-minute buffer between appointments.

## Props
barber, slot (selected), setSlot, onNext, onBack
```

---

### Screen 5 — Confirm & Queue Number (Steps 4 & 5)
*POST /api/bookings*

```
Build the Bercut kiosk Confirm screen and Done/Queue Number screen.

## Confirm screen layout
Two-column grid: left (flex:1) + right (clamp(260px,30vw,340px))
Single column under 900px.

## Left column — Order summary card
White card, border, border-radius 14px, padding clamp(14px,2vw,22px)
Header: "Ringkasan / Order Summary" uppercase muted 11px
Each service row: name (bold 14px) + Indonesian name + duration (muted 12px) left,
price (Barlow Condensed 700 18px) right, border-bottom
Info rows: Kapster/Barber, Waktu/Time, Estimasi Durasi — label left (muted), value right (bold)
Footer: "ESTIMASI TOTAL" label (Barlow Condensed 800) left, total price (Barlow Condensed 900 ~28px) right
Sub-note under total: "Kapster bisa menambah layanan saat potong" (muted 11px)

## Postpaid info banner
Dark (#111110) card below order summary:
- 💳 icon left
- Title: "Bayar Setelah Selesai / Pay After Service" white Barlow Condensed 800
- Body: explanation that barber handles payment via QRIS or BCA card, grey text

## Right column
1. Optional details card: Nama/Name input, WhatsApp input (both optional, focus border #111110)
2. Note: "Opsional — digunakan untuk konfirmasi WhatsApp / Optional — used for WhatsApp booking confirmation"
3. Primary button: "Konfirmasi Booking ✓" (full width, dark, Barlow Condensed 800 18px)
4. Ghost back button

## On confirm — POST /api/bookings
Request body: { branch_id, barber_id, slot (scheduled_at), service_ids[], guest_name?, guest_phone? }
Response: { booking_number, booking_id, status: "confirmed" }
Then show Done screen.

## Done / Queue Number screen
Centred layout, max-width clamp(340px,60vw,600px)
- Eyebrow: "Nomor Antrian Anda / Your Queue Number" uppercase muted
- Queue number: Barlow Condensed 900, clamp(88px,18vw,136px), colour #111110,
  pop animation (scale 1→1.08→1 on mount)
- Yellow accent bar: 5px tall, 100px wide, below number
- Booking details card: 2-column grid, Kapster, Waktu, Layanan, Durasi, Est. Total, Nama (if provided)
- Wait instruction: "Silakan duduk dan tunggu kapster memanggil nomor Anda / Please sit and wait..."
- Payment note: dark card — "Pembayaran setelah selesai. Kapster akan memproses pembayaran saat layanan selesai."
- Buttons: "🖨 Cetak Struk" (ghost, toggles to "✓ Tercetak") and "Selesai ✓" (dark, calls onReset)

## Props
Confirm: cart, barber, slot, name, setName, phone, setPhone, onConfirm, onBack
Done: cart, barber, slot, name, onReset
```

---

## 04 — Kiosk: Payment Takeover
*Full-screen postpaid payment flow. Triggered when barber taps Complete (via SSE event) or staff select from Staff Panel.*

```
Build the PaymentTakeover component for the Bercut kiosk.

## Overview
Full-screen dark overlay (position fixed, inset 0, z-index 999, background #111110).
Two-column layout: left (flex:1, scrollable) + right (width clamp(260px,32vw,380px), dark sidebar).
This appears on top of the normal kiosk flow — the kiosk is still in booking mode underneath.

## Dark topbar
Background: #0a0a08, border-bottom 1px solid #1a1a18
Left: BERCUT logo (yellow) + "Seminyak · Pembayaran / Payment" (muted)
Right: booking number "#{booking.number}" in yellow Barlow Condensed 800

## Left column — Order + Tip

Order summary card (background #1a1a18, border-radius 14px):
- Each service row: name (white bold) + duration (dark muted) left,
  price (white Barlow Condensed 700) right, border-bottom #2a2a28
- Kapster row: label (#666) left, barber name (white bold) right
- Tip row (if tip > 0): "Tip" label left, amount in yellow right
- Total row: "TOTAL" (white Barlow Condensed 800) left,
  grand total in YELLOW (#F5E200) Barlow Condensed 900 ~36px right

Tip section below:
- Label: "Tambahkan Tip? / Add a Tip?" uppercase muted
- Preset buttons: Rp 10k, Rp 20k, Rp 50k — each Barlow Condensed 800
  Unselected: #1a1a18 bg, white text, #2a2a28 border
  Selected: #F5E200 bg, #111110 text, #F5E200 border
- "Custom" button (same toggle style)
- "Tidak / No" button (grey, clears selection)
- Custom input: appears when "custom" selected, yellow border, dark bg

## Right column — Payment method (barber selects)
Background: #0d0d0b, padding clamp(20px,3vw,32px)

Label: "Metode Pembayaran / Payment Method" uppercase muted
Sub-note: "Kapster pilih metode, pelanggan bayar. / Barber selects method, customer pays."

QRIS option card:
- Background: #1a1a18 when selected, #111110 unselected
- Border: #F5E200 (selected), #222 (unselected)
- Icon (⬛), "QRIS" Barlow Condensed 800 white, "GoPay · OVO · Dana · Bank Transfer" subtitle
- When selected: expand to show QR code placeholder (120×120px white SVG QR) + amount in yellow

Card option:
- Same toggle pattern as QRIS
- Icon (💳), "Kartu / Card" title, "BCA EDC · Tap or Insert" subtitle
- When selected: expand to show "Tap atau masukkan kartu / Tap or insert card on BCA EDC terminal" + amount

Confirm button (bottom of sidebar, margin-top auto):
- Disabled (grey) until method selected
- When QRIS: "Konfirmasi Pembayaran QRIS ✓"
- When card: "Konfirmasi Pembayaran Kartu ✓"
- Background: #F5E200 (yellow), text #111110 when active

## On payment confirmed
setPaid(true) → show success screen:
- Full dark bg, yellow checkmark circle (80px)
- "Pembayaran Berhasil! / Payment Successful" Barlow Condensed 900 white
- Grand total in yellow
- Booking summary pill (dark card)
- "Selesai — Kembali ke Booking" yellow button → calls onDone

## API call
POST /api/payments { booking_id, method: 'qris'|'card', tip_amount, total_amount }
Both QRIS and card processed through BCA EDC terminal via direct local integration
(Serial/USB ISO 8583 or local TCP — exact protocol TBC with BCA technical team).
Kiosk sends payment instruction to EDC, EDC processes transaction, returns approval code.
On EDC approval: set booking.payment_status = 'paid', booking.status = 'completed'.

## Props
booking: { number, barber, slot, services, cartItems: Service[], total }
onDone: () => void
```

---

## 05B — Kiosk: Barber Panel
*Opens after barber selects "Barber / Kapster" and enters PIN in the Topbar AccessModal.*

```
Build the BarberPanel component for the Bercut kiosk.

## Reference mockup
mockups/kiosk/BarberPanel.jsx — match this exactly.

## Overview
Full-screen dark overlay (position fixed, inset 0, z-index 400, background #111110).
Appears when barber logs in via Topbar logo click → Barber → PIN.
Two-column layout: left column (clamp(340px,42vw,500px)) + right column (flex:1).
Close button returns to customer booking flow — booking flow is paused, not destroyed.

## Top bar (background #0a0a08, height clamp(52px,6.5vh,64px))
Left: BERCUT logo (yellow) + divider + barber name (white bold) + chair label (muted) + status badge
Right: Break button (☕ Istirahat) when available | End break countdown when on_break | Clock Out button | ← Kembali ke Booking button

Status badges:
- available: green (#4caf50) text on #1a3a1a bg, "AVAILABLE"
- busy: red (#ef5350) text on #3a1a1a bg, "MELAYANI"
- on_break: yellow (#F5E200) text on #2a2a10 bg, "ISTIRAHAT"

## Left column — Active job + Next up

### SEKARANG section (active booking)
When active booking exists:
- Dark card (#1a1a18), border #2a2a28
- Customer name (Inter 800 white large), services list (muted), booking number + total (yellow, right)
- Elapsed timer: tabular-nums Inter 900, yellow, counts up from started_at
  → useEffect/setInterval every 1000ms: setElapsed(Date.now() - startedAt)
- Buttons: "Tambah Layanan +" (dark #2a2a28) | "Selesai ✓" (yellow #F5E200, text #111110, flex:2)
  → Selesai: PATCH /api/bookings/:id/complete → status: pending_payment
  → Backend emits SSE event { type: 'payment_trigger', booking_id } on branch channel
  → Kiosk SSE listener opens PaymentTakeover — call onPaymentTrigger(booking)

When no active booking:
- Empty state card with scissors icon, "Tidak ada pelanggan aktif"

### BERIKUTNYA section (next confirmed booking)
Dark card with customer name, services, slot time, total
Two buttons:
- "📢 Panggil" → window.speechSynthesis: "Pelanggan atas nama {name}, silakan menuju kursi {chair}" (lang: id-ID)
  → Button text flips to "✓ Dipanggil" after call
- "Mulai Layanan →" → PATCH /api/bookings/:id/start → status: in_progress, started_at: now
  → Disabled if active booking exists (text: "Selesaikan dulu ↑") or on_break (text: "Sedang istirahat")
  → Button bg: white with dark text when enabled, #2a2a28 with #555 text when disabled

## Right column — Today's queue list
Header: "📋 Hari Ini — {count} antrian" + "Est. selesai: ~HH:MM"
Scrollable list of all today's bookings (all statuses except cancelled):
Each row card (#1a1a18, border #2a2a28):
- Booking number pill (dark) + slot time + status badge
- Customer name (Inter 700 white) + services (muted)
- Total (yellow if active, #888 otherwise, right)
Active booking row: green-tinted border (#3a4010 bg, #3a4010 border)
Pending payment row: 50% opacity, green "PEMBAYARAN" badge
Fade-up stagger animation (i * 0.06s delay)

## Add Service modal (bottom sheet)
Triggered by "Tambah Layanan +" on active booking.
Slides up from bottom (alignItems: flex-end on backdrop).
White card, borderRadius 20px 20px 0 0, maxHeight 75vh.
Header: barber name + customer name.
Category filter pills (same 5 categories as kiosk ServiceSelection).
Service list: each row toggleable — selected = yellow bg (#F5E200), text #111110. Existing services hidden.
Footer (when items selected): total added amount + "Konfirmasi Tambahan (N) →" dark button.
On confirm: PATCH /api/bookings/:id/add-services { service_ids[] }
            → DB: insert booking_services rows with added_mid_cut: true
            → Running total updates immediately in UI.

## Break selector modal
3 options: 15 menit, 30 menit, 45 menit.
On select: POST /api/barber-breaks { barber_id, branch_id, duration_minutes, started_at: now }
           → barbers.status = 'on_break' → blocks time slots for that duration
Countdown in top bar counts down from duration. When hits 0: auto end break.
"Akhiri Istirahat" button: PATCH /api/barber-breaks/:id/end { ended_at: now }
                           → barbers.status = 'available'

## Clock out
"Clock Out" button → confirm dialog → POST /api/attendance/clock-out { barber_id, clock_out_at: now }
→ clears barber session from localStorage → closes BarberPanel

## API connections
GET  /api/bookings?barber_id=&date=today&branch_id=        — load today's queue
PATCH /api/bookings/:id/start                               — { started_at: now, status: 'in_progress' }
PATCH /api/bookings/:id/complete                            — { completed_at: now, status: 'pending_payment' }
PATCH /api/bookings/:id/add-services                        — { service_ids: [], added_mid_cut: true }
POST  /api/barber-breaks                                    — start break
PATCH /api/barber-breaks/:id/end                            — end break
POST  /api/attendance/clock-out                             — clock out
SSE   GET /api/events?branch_id=                            — listen for new_booking events (show alert badge)

## Props
onClose: () => void         — return to customer booking flow
onPaymentTrigger: (booking) — open PaymentTakeover for this booking
```

---

## 05 — Kiosk: Staff Panel
*Triple-tap hidden access. Temporary — replaced by barber app SSE trigger later.*

```
Build the StaffPanel component and triple-tap detection for the Bercut kiosk.

## Triple-tap detection
In the Root component, place an invisible div:
- position: fixed, top: 0, right: 0, width: 60px, height: 60px
- z-index: 500, -webkit-tap-highlight-color: transparent
- onClick: increment tapCount ref, clear timer, reset after 600ms
- On 3rd tap within 600ms: open staff panel

Implementation:
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const handleCornerTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 600);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      setStaffPanelOpen(true);
    }
  };

Location: top-right corner — staff know to tap here, customers never interact with corners.
No PIN required. No visual indicator this zone exists.

## StaffPanel component
Slide-in panel from right side:
- Backdrop: position fixed, inset 0, background rgba(0,0,0,0.7), onClick closes panel
- Panel: dark bg (#111110), width clamp(300px,38vw,440px), full height, box-shadow left

Header:
- "Staff Panel" eyebrow (muted uppercase)
- "Pilih Booking" Barlow Condensed 900 white
- "Select booking to process payment" subtitle
- × close button (top right, 36×36px)

Active queue list (GET /api/bookings?branch_id=&status=in_progress,confirmed):
Each booking card (dark #1a1a18, yellow border on hover):
- Booking number in yellow Barlow Condensed 900 (left) + total amount white Barlow Condensed 800 (right)
- Barber name + slot time (white bold) below
- Services list (grey)
- "Proses Pembayaran →" yellow pill button at bottom
- onClick: call onSelect(booking) → opens PaymentTakeover

Footer note: "Ketuk pojok kanan atas 3x untuk membuka panel ini."

## When barber app launches
The triple-tap panel stays as a fallback.
The barber app sends SSE event via POST /api/bookings/:id/complete: { type: 'payment_trigger', booking_id }
The kiosk subscribes on GET /api/events?branch_id= and auto-opens PaymentTakeover for that booking_id.
No kiosk code changes needed — just add the subscription listener.

## Props
StaffPanel: onSelect(booking), onClose()
Root state: staffPanelOpen, paymentPending, activeBooking
```

---

## 06 — Barber PWA
*Mobile-first PWA. Portrait orientation. Bahasa Indonesia only. Same design tokens as kiosk.*

### Queue View (Main Screen)
*GET /api/bookings?barber_id=&date=today + SSE subscription*

```
Build the Bercut Barber PWA Queue View screen.

## Overall app setup
Mobile-first PWA. Portrait orientation. Same design tokens as kiosk (white/yellow theme).
Barber logs in with 6-digit PIN. Session stored in localStorage.
All text in Bahasa Indonesia only.

## Queue screen layout
Dark topbar: "BERCUT" yellow logo + barber name + "Antrian Saya" (My Queue)
Below: today's date, shift summary (X bookings, estimated finish time)

Three sections:
1. SEKARANG (Now) — current in-progress booking (if any)
2. BERIKUTNYA (Up Next) — next confirmed booking
3. HARI INI (Today) — full list of remaining bookings

## NEW BOOKING alert
When a new booking arrives (SSE event from backend), show a full-screen notification overlay:
- Yellow background (#F5E200)
- "PELANGGAN BARU!" Barlow Condensed 900 large, #111110
- Customer name, service, time
- Large "ACKNOWLEDGE ✓" button (dark bg, white text, full width, min-height 72px)
- Tapping acknowledge: dismiss overlay, stop escalation timer,
  send PATCH /api/bookings/{id}/acknowledge
- If not acknowledged within X minutes (configurable): trigger voice call via backend

## Booking card — in queue
White card, border, border-radius 12px
Left: booking number (yellow Barlow Condensed 800) + customer name (bold) + services list (muted)
Right: time slot (Barlow Condensed 800) + status badge

## Active job card (current customer)
Yellow (#F5E200) card:
- "SEDANG DILAYANI" badge
- Customer name Barlow Condensed 900 large, #111110
- Service list, elapsed timer (HH:MM:SS counting up)
- "Tambah Layanan +" button (dark, opens add-service modal)
- "Selesai ✓" button (dark, full width, triggers payment on kiosk)

## Add service mid-cut modal
Bottom sheet modal (slides up from bottom):
- Full service catalogue list (same categories as kiosk)
- Toggle to add services — selected = yellow bg
- "Konfirmasi Tambahan" button
- PATCH /api/bookings/{id}/add-services { service_ids[] }
- Running total updates immediately

## Start job flow
Tap "Mulai" (Start) on next booking:
- PATCH /api/bookings/{id}/start → status: in_progress, started_at: now
- Card moves to "SEKARANG" section
- Timer starts

## Complete job flow
Tap "Selesai" (Complete) on active booking:
- PATCH /api/bookings/{id}/complete → status: pending_payment, completed_at: now
- Backend emits SSE event on branch channel: { type: 'payment_trigger', booking_id }
- Kiosk receives and switches to PaymentTakeover for this booking
- Barber app shows "Menunggu pembayaran..." (Waiting for payment) state

## No-show flagging
Long-press or swipe on a booking card to reveal "Tidak Datang" (No-show) option
PATCH /api/bookings/{id}/no-show → status: no_show, slot freed
```

---

### GPS Clock-In
*POST /api/attendance/clock-in*

```
Build the Bercut Barber PWA Clock-In screen.

## When barber opens the app
If not clocked in today: show Clock-In screen before queue view.
If already clocked in: go straight to queue.

## Clock-in screen
Centred layout:
- "Selamat pagi, {name}!" greeting
- Current time (live)
- Branch name
- GPS status indicator (checking location...)
- "Masuk / Clock In" primary button — disabled until GPS confirmed within radius

## GPS check
navigator.geolocation.getCurrentPosition()
Compare against branch lat/lng (from GET /api/branches/{id})
Geofence radius: configurable per branch (default 100m), use Haversine formula
If within radius: enable button, show "📍 Lokasi terverifikasi"
If outside radius: show "📍 Anda di luar area cabang" error, keep button disabled

## On clock-in
POST /api/attendance/clock-in {
  barber_id, branch_id, clock_in_lat, clock_in_lng, within_geofence: true
}
Store session, go to queue view.

## Clock-out
Available from settings menu (hamburger top-right).
POST /api/attendance/clock-out { barber_id, clock_out_at: now }
Returns to login screen.
```

---

## 07 — Admin Dashboard
*Desktop-first web app. English primary. Full access across all branches.*

### Multi-Branch Overview
*GET /api/admin/overview?date= + SSE*

```
Build the Bercut Admin Dashboard overview screen.

## Layout
Left sidebar navigation (220px) + main content area (flex:1)
Sidebar: BERCUT logo, nav links (Overview, Branches, Barbers, Services, Reports,
  Expenses, Inventory, Settings)
Active nav item: yellow (#F5E200) left border accent, dark bg

## Overview screen — top stats bar
4 metric cards in a row:
- Today's Revenue (sum across all branches, green accent)
- Active Bookings (in_progress count, yellow accent)
- Waiting (confirmed count, muted)
- Completed Today (done count, blue accent)
Each card: muted label 12px top, value Barlow Condensed 900 28px below

## Branch cards grid (main content)
One card per branch, grid auto-fill minmax(280px,1fr)
Each card:
- Branch name (Barlow Condensed 800) + city
- Live status: X in chair, X waiting, X done
- Today's revenue (Barlow Condensed 900, green)
- Barber availability: avatar row showing who is clocked in (green dot) or absent (grey)
- Any alerts: delay alerts (⚠ orange), low stock alerts (📦 yellow), absence (🔴 red)
- "View Details →" link — drills into branch

## Branch detail view
Live queue table: booking number, customer name, barber, service, status, time, amount
Filter by: all / waiting / in-progress / completed / no-show
Each row has quick actions: start, complete, flag no-show

## Notification settings panel (per branch)
- Acknowledge grace period before voice call (default 3 min)
- Late start threshold for delay alert (default 10 min)
- WhatsApp notifications: on/off toggle
- Voice call escalation: on/off toggle
- Speaker announcement: on/off toggle
- Tip preset amounts: three inputs (default 10000, 20000, 50000)
```

---

### Revenue Reports
*GET /api/admin/reports?branch_id=&period=&from=&to=*

```
Build the Bercut Admin Revenue Reports screen.

## Filters
Branch selector (All or specific branch)
Period: Today, This Week, This Month, Custom range (date pickers)
Group by: Day, Week, Month
Export button: CSV download

## Summary cards row
Total Revenue, Total Bookings, Average Order Value, Tips Collected —
each with period-over-period change %

## Revenue breakdown table
Columns: Date | Branch | Barber | Service | Payment Method | Amount | Tip | Total
Sortable columns, pagination 50 per page

## Barber performance section
Table: Barber | Branch | Bookings | Services | Revenue | Commission (%) | Earnings
Commission = revenue × commission_rate (stored per barber)
Commission rate editable inline

## Payment method breakdown
Pie/bar chart: QRIS vs Card split by branch
Use recharts or chart.js
```

---

### Expense Tracking
*GET/POST /api/expenses*

```
Build the Bercut Admin Expense Tracking screen.

## Expense log
Table: Date | Branch | Category | Description | Amount | Submitted by | Receipt
Categories: petty_cash, supplies, utilities, equipment, other
Sortable, filterable by branch + category + date range

## Add expense form
Branch selector (required)
Category dropdown
Amount input (IDR, number)
Description textarea
Date picker (defaults to today)
Receipt photo upload (optional) — stored in cloud storage (e.g. Cloudflare R2 or S3),
URL saved to DB
Submit → POST /api/expenses → appears immediately in log (no approval step)

## P&L summary
Per branch per period: Service Revenue - Expenses = Net
Table showing each line item, subtotals, net figure
Note: "Tips tracked separately — not included in service revenue"

## DB schema reminder
expenses table: id, branch_id, submitted_by (FK users), category, amount, description,
receipt_url, expense_date, created_at
No approval_status column — expenses are logged immediately.
```

---

### Inventory Tracking
*GET/POST /api/inventory*

```
Build the Bercut Admin Inventory Tracking screen.

## Three categories
beverage           — drinks offered to customers (water, coffee, etc.)
product            — retail/resale items (pomade, wax, etc.) — received centrally, assigned to branches
service_consumable — items used during services (foil, blades, wax strips, etc.)

## Inventory overview table
Columns: Item | Category | Unit | [Branch1] | [Branch2] | ... | Total
Color code: red if below reorder threshold, yellow if within 20% of threshold, green if healthy
Filter by category

## Stock movement log
Per branch: Item | Type (in/out) | Quantity | Note | Logged by | Date
POST /api/inventory/movement { item_id, branch_id, movement_type, quantity, note }

## Product arrival — branch assignment
When products arrive: "Receive Stock" form
Select item, enter total quantity received, then distribute across branches
Each branch gets an input — quantities must sum to total received
POST /api/inventory/receive { item_id, branch_allocations: [{branch_id, quantity}] }

## Low stock alerts
Badge count on Inventory nav item = number of items below threshold across all branches
Alert card per item at top of page when stock critical
```

---

## 07B — Admin Dashboard: Payroll
*GET /api/payroll/periods + POST /api/payroll/generate*

```
Build the Bercut Admin Payroll screen.

## Overview
Monthly payroll management per branch. Barbers are on salary_plus_commission.
Tips: individual (each barber keeps tips from their own bookings — no pooling).
Pay cycle: monthly. Workflow: draft → reviewed → finalized (immutable).

## Layout
Same left sidebar as other admin screens.
Main content: two-panel layout.
Left (narrower): period selector + branch selector + status.
Right (wider): barber entry table + adjustment panel.

## Period selector (top of page)
Month/year picker (defaults to current month).
Branch dropdown.
"Generate Payroll" button — calls POST /api/payroll/generate { branch_id, period_month }.
  If draft already exists, loads it. Button label changes to "Regenerate" if draft exists.
Status badge: DRAFT (grey) | REVIEWED (yellow) | FINALIZED (green, lock icon).
"Mark as Reviewed" button (visible in draft state, requires owner role).
"Finalize & Lock" button (visible in reviewed state, requires owner role, shows confirmation dialog).
"Export CSV" button (always visible once entries exist).

## Barber entries table
Columns:
  Barber name + avatar
  Days worked (attendance_days)
  Service revenue (gross_service_revenue — formatted IDR)
  Commission % (commission_rate_snapshot — shown as "35%")
  Commission earned (commission_earned)
  Tips earned (tips_earned)
  Uang Rajin (uang_rajin_total — green text if > 0)
  Bonus (bonus_total)
  Kasbon (kasbon_deducted — red text if > 0)
  Deductions (other_deductions)
  NET PAY (net_pay — Inter 700, larger, yellow highlight if finalized)

Each row is expandable (click to open adjustment panel below the row).
Non-finalized rows show an "+ Add Adjustment" button at the end.

## Adjustment panel (expanded row)
Shows all payroll_adjustments for this entry as a list:
  Type badge (UANG RAJIN green | BONUS blue | KASBON red | DEDUCTION orange)
  Reason label
  Amount (IDR)
  Logged by + date
  Delete button (× — only if period not finalized)

"+ Add Adjustment" button opens an inline form:
  Type selector: Uang Rajin | Bonus | Kasbon | Deduction
  Reason dropdown: shows adjustment_reasons filtered by type + branch, + "Other (type manually)" option
  Amount input (IDR)
  If type = Kasbon: radio — "Deduct this month" | "Deduct next month"
  Save button → POST /api/payroll/adjustments
  On save: entry row recalculates net_pay live.

## Kasbon (Salary Advance) standalone log
Separate tab: "Kasbon Log"
Table: Barber | Amount | Reason | Deduct Month | Logged by | Date | Status (Pending/Applied)
"+ Log Kasbon" button — opens same inline form but entry_id is null (pre-period kasbon).
Useful for logging kasbon mid-month before payroll is generated.

## Reason Management (Settings sub-section)
Tab or link: "Manage Reasons"
List of adjustment_reasons grouped by type.
Each row: Label | Type | Scope (global / branch-specific) | Active toggle | Edit | Delete
"+ New Reason" form: label input, type selector, branch scope (all / specific branch).
Default global reasons pre-seeded:
  uang_rajin: "Full Month Attendance", "Zero Late Arrivals", "Top Barber of the Month", "Customer Compliment"
  bonus: "Holiday Bonus", "Performance Bonus"
  deduction: "Late Arrivals", "Equipment Damage", "Uniform Deduction"
  kasbon: "Salary Advance"

## Calculation rules (backend must implement)
net_pay = base_salary_snapshot
        + commission_earned (gross_service_revenue × commission_rate_snapshot / 100)
        + tips_earned (SUM tips.amount WHERE booking.barber_id = this barber AND paid_at IN period)
        + uang_rajin_total (SUM adjustments WHERE type = uang_rajin)
        + bonus_total (SUM adjustments WHERE type = bonus)
        − kasbon_deducted (SUM adjustments WHERE type = kasbon AND target_period_month = period_month)
        − other_deductions (SUM adjustments WHERE type = deduction)

gross_service_revenue = SUM booking_services.price_charged
  WHERE booking.barber_id = this barber
  AND booking.status = 'completed'
  AND booking.paid_at >= period start
  AND booking.paid_at < period end
  AND booking_services.paid_with_points = false  ← points-redeemed services excluded

attendance_days = COUNT DISTINCT DATE(clock_in_at)
  FROM attendance WHERE barber_id = this barber AND clock_in_at IN period

## Period immutability
Once status = finalized:
  - All entry and adjustment rows become read-only
  - DELETE /api/payroll/adjustments/:id returns 403
  - PATCH /api/payroll/periods/:id/status only allows finalized → no rollback
  - UI: all edit controls hidden, lock icon shown on header

## Export
GET /api/payroll/periods/:id/export
Returns CSV with columns:
  Barber, Days Worked, Base Salary, Service Revenue, Commission %, Commission Earned,
  Tips, Uang Rajin, Bonus, Kasbon Deducted, Other Deductions, Net Pay
One row per barber. Period month and branch name in filename.
```

---

## 08 — Database Schema
*PostgreSQL. Run tables in this order due to FK dependencies.*

```
Create the full PostgreSQL schema for the Bercut Barber Shop system.

## Tables to create (in this order):

1. branches
id UUID PK, name VARCHAR(100), address TEXT, city VARCHAR(80), timezone VARCHAR(50),
geofence_lat DECIMAL(9,6), geofence_lng DECIMAL(9,6), geofence_radius_m INTEGER DEFAULT 100,
is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()

2. users (admin/owner/accountant — NOT barbers)
id UUID PK DEFAULT gen_random_uuid(), email VARCHAR(200) UNIQUE,
password_hash TEXT, name VARCHAR(100), role VARCHAR(20) DEFAULT 'admin',
is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()

3. barbers
id UUID PK DEFAULT gen_random_uuid(), branch_id UUID FK branches(id),
name VARCHAR(100), specialty VARCHAR(100), specialty_id VARCHAR(100),
phone VARCHAR(20), pin_hash TEXT, commission_rate DECIMAL(5,2) DEFAULT 35.00,
avatar_url TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()

4. services
id UUID PK DEFAULT gen_random_uuid(), name VARCHAR(100), name_id VARCHAR(100),
category VARCHAR(20) CHECK (category IN ('Haircut','Beard','Color','Package')),
base_price INTEGER NOT NULL, duration_minutes SMALLINT NOT NULL,
badge VARCHAR(50), description TEXT, is_active BOOLEAN DEFAULT true,
sort_order SMALLINT DEFAULT 0

5. service_branch_prices
service_id UUID FK services(id), branch_id UUID FK branches(id),
price INTEGER NOT NULL, PRIMARY KEY (service_id, branch_id)

6. barber_schedules
barber_id UUID FK barbers(id), day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
start_time TIME, end_time TIME, is_off BOOLEAN DEFAULT false,
PRIMARY KEY (barber_id, day_of_week)

7. customers
id UUID PK DEFAULT gen_random_uuid(), name VARCHAR(100), phone VARCHAR(20) UNIQUE,
total_visits INTEGER DEFAULT 0, total_spend INTEGER DEFAULT 0,
preferred_barber_id UUID FK barbers(id), first_visit DATE, last_visit DATE

8. bookings
id UUID PK DEFAULT gen_random_uuid(),
booking_number VARCHAR(10) NOT NULL,
branch_id UUID FK branches(id), barber_id UUID FK barbers(id),
customer_id UUID FK customers(id) NULLABLE,
guest_name VARCHAR(100), guest_phone VARCHAR(20),
scheduled_at TIMESTAMPTZ NOT NULL,
started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, paid_at TIMESTAMPTZ,
status VARCHAR(20) DEFAULT 'confirmed'
  CHECK (status IN ('confirmed','in_progress','pending_payment','completed','no_show','cancelled')),
payment_status VARCHAR(20) DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid','paid','refunded')),
payment_method VARCHAR(10) CHECK (payment_method IN ('qris','card')),
payment_ref VARCHAR(100), notes TEXT, rating SMALLINT,
acknowledged_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT now()

9. booking_services
booking_id UUID FK bookings(id), service_id UUID FK services(id),
price_charged INTEGER NOT NULL, added_mid_cut BOOLEAN DEFAULT false,
PRIMARY KEY (booking_id, service_id)

10. tips
id UUID PK DEFAULT gen_random_uuid(), booking_id UUID FK bookings(id) UNIQUE,
branch_id UUID FK branches(id), amount INTEGER NOT NULL,
payment_method VARCHAR(10), created_at TIMESTAMPTZ DEFAULT now()

11. expenses
id UUID PK DEFAULT gen_random_uuid(), branch_id UUID FK branches(id),
submitted_by UUID FK users(id), category VARCHAR(40)
  CHECK (category IN ('petty_cash','supplies','utilities','equipment','other')),
amount INTEGER NOT NULL, description TEXT, receipt_url TEXT,
expense_date DATE NOT NULL, created_at TIMESTAMPTZ DEFAULT now()

12. attendance
id UUID PK DEFAULT gen_random_uuid(), barber_id UUID FK barbers(id),
branch_id UUID FK branches(id), clock_in_at TIMESTAMPTZ NOT NULL,
clock_out_at TIMESTAMPTZ, clock_in_lat DECIMAL(9,6), clock_in_lng DECIMAL(9,6),
within_geofence BOOLEAN, face_verified BOOLEAN DEFAULT false, selfie_url TEXT

13. inventory_items
id UUID PK DEFAULT gen_random_uuid(), name VARCHAR(100), unit VARCHAR(20),
category VARCHAR(30) CHECK (category IN ('beverage','product','service_consumable')),
is_active BOOLEAN DEFAULT true

14. inventory_stock
item_id UUID FK inventory_items(id), branch_id UUID FK branches(id),
current_stock INTEGER DEFAULT 0, reorder_threshold INTEGER DEFAULT 5,
updated_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (item_id, branch_id)

15. inventory_movements
id UUID PK DEFAULT gen_random_uuid(), item_id UUID FK inventory_items(id),
branch_id UUID FK branches(id), logged_by UUID FK barbers(id) NULLABLE,
movement_type VARCHAR(5) CHECK (movement_type IN ('in','out')),
quantity INTEGER NOT NULL, note TEXT, created_at TIMESTAMPTZ DEFAULT now()

## Indexes (run after table creation)
CREATE INDEX idx_bookings_branch_date ON bookings(branch_id, scheduled_at);
CREATE INDEX idx_bookings_barber_date ON bookings(barber_id, scheduled_at);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_attendance_barber_date ON attendance(barber_id, clock_in_at);
CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id, branch_id, created_at);
```

---

## 09 — API & Backend

### Booking Creation + Slot Generation
*POST /api/bookings + GET /api/slots*

```
Build the booking creation API and slot generation logic for Bercut.

## GET /api/slots?barber_id=&date=&service_ids=
1. Fetch barber's schedule for given day_of_week
2. If is_off = true: return []
3. Generate 30-minute blocks within start_time → end_time
4. Fetch all bookings for that barber on that date (status NOT IN cancelled, no_show)
5. For each existing booking: block start_time to start_time + total_duration + 15min buffer
6. Calculate selected services total duration
7. Filter blocks where: block_start + service_duration + 15min <= next_blocked_slot
8. Remove past times (if date = today)
9. Return available slot times as string[] e.g. ["09:00","09:30","10:30"]

## POST /api/bookings
Body: { branch_id, barber_id, scheduled_at, service_ids[], guest_name?, guest_phone? }

Validation:
- Check slot is still available (race condition: use DB transaction with SELECT FOR UPDATE)
- Check barber belongs to branch
- Check all service_ids are active

Generate booking_number:
- Format: "B" + 3-digit number, incrementing per branch per day
- e.g. B001, B002, ... B099 — reset each day

Create records:
- INSERT INTO bookings (status: 'confirmed')
- INSERT INTO booking_services for each service_id
  (price_charged = branch override or base_price)
- If guest_phone provided: upsert customers table

Trigger notifications (async, don't await):
- Web Speech API announcement via kiosk (emit SSE event to kiosk channel)
- Phase 2: Web Push to barber's PWA
- Start acknowledgement timer (if not acknowledged in X min → trigger escalation)

Response: { booking_id, booking_number, status: 'confirmed', scheduled_at }

## PATCH /api/bookings/:id/start
Set status = 'in_progress', started_at = now()
Check delay: if now() > scheduled_at + late_start_threshold → log delay, alert admin

## PATCH /api/bookings/:id/add-services
Body: { service_ids[] }
Insert new booking_services rows (added_mid_cut: true)
Return updated total

## PATCH /api/bookings/:id/complete
Set status = 'pending_payment', completed_at = now()
Emit SSE event on the branch channel: { type: 'payment_trigger', booking_id }
Kiosk receives this event and opens PaymentTakeover

## POST /api/payments
Body: { booking_id, method: 'qris'|'card', tip_amount, total_amount }

Both QRIS and card handled by BCA EDC terminal via direct local integration:
- Option A (Serial/USB): kiosk sends ISO 8583 payment request over serial/USB cable to EDC
- Option B (Local TCP): kiosk sends payment instruction to EDC over LAN via TCP socket
- EDC processes the transaction (card tap or QRIS scan on EDC screen), returns approval code
- No internet required for the transaction itself — fully local communication
- Exact protocol determined by BCA technical team based on EDC model issued to client

On EDC approval response:
  set booking.payment_status = 'paid', booking.status = 'completed'
  If tip_amount > 0: INSERT INTO tips
  Emit SSE: { type: 'payment_complete', booking_id } → barber app shows "Lunas ✓"
```

---

### Notification Escalation
*Background job / queue worker*

```
Build the notification escalation system for Bercut.

## On new booking created (triggered by POST /api/bookings)

Step 1 — Speaker (immediate, via SSE to kiosk):
Emit { channel: 'branch:{branch_id}', type: 'announcement',
text: '{barber_name}, ada pelanggan baru untuk {service_name} jam {time}' }
Kiosk receives and calls:
window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
Language: id-ID (Bahasa Indonesia)

Step 2 — Acknowledgement timer:
Store in DB: { booking_id, acknowledged: false, created_at: now() }
Background job checks every 30s:
if not acknowledged AND (now - created_at) > acknowledge_grace_minutes → trigger escalation

Step 3 — Voice call (escalation only, Phase 2):
Use configured voice escalation service
"Kapster {name}, ada pelanggan menunggu untuk {service} jam {time}. Segera konfirmasi."

## PATCH /api/bookings/:id/acknowledge
Set acknowledged_at = now()
Cancel escalation timer for this booking

## Admin configurable thresholds (stored per branch)
acknowledge_grace_minutes: INTEGER DEFAULT 3
late_start_threshold_minutes: INTEGER DEFAULT 10
speaker_enabled: BOOLEAN DEFAULT true
voice_call_enabled: BOOLEAN DEFAULT true
tip_presets: INTEGER[] DEFAULT [10000, 20000, 50000]
```

---

## 10 — Design Tokens Reference

### Colour Tokens

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FAFAF8` | Page background |
| `surface` | `#F2F0EB` | Input fields, secondary surfaces |
| `surface2` | `#ECEAE4` | Disabled states, tertiary |
| `accent` | `#F5E200` | CTA buttons, selected states ONLY |
| `accentText` | `#111110` | Text ON yellow backgrounds |
| `text` / `topBg` | `#111110` | Primary text, topbar, dark buttons |
| `text2` | `#3a3a38` | Secondary text |
| `muted` | `#88887e` | Placeholders, helper text, subtitles |
| `border` | `#DDDBD4` | Card borders, dividers |
| `white` | `#FFFFFF` | Card surfaces |
| `topText` | `#F5E200` | Yellow text in dark topbar |
| `danger` | `#C0272D` | Destructive actions only |

### Typography Scale

| Use | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Screen titles (kiosk) | Barlow Condensed | `clamp(32px,4.5vw,48px)` | 900 | letterSpacing -0.01em, lineHeight 1 |
| Service / barber names | Barlow Condensed | `clamp(18px,2.4vw,24px)` | 800 | |
| Prices | Barlow Condensed | `clamp(16px,2.2vw,22px)` | 800 | Color: text (not yellow on white) |
| Queue number hero | Barlow Condensed | `clamp(88px,18vw,136px)` | 900 | letterSpacing -0.04em |
| Primary CTA buttons | Barlow Condensed | `clamp(18px,2.2vw,22px)` | 800 | letterSpacing 0.04em |
| Body / descriptions | DM Sans | `clamp(12px,1.4vw,14px)` | 400 | lineHeight 1.65 |
| Labels / eyebrows | DM Sans | `clamp(10px,1.2vw,12px)` | 700 | letterSpacing 0.12–0.18em, uppercase |

### Component Patterns

| Component | Key Properties |
|---|---|
| Primary button | bg `#111110`, white text, Barlow Condensed 800, border-radius 14px, min-height 52px, width 100% |
| Ghost button | transparent bg, border `#DDDBD4`, text2 colour, border-radius 12px, min-height 52px |
| Card (default) | white bg, 1.5px border `#DDDBD4`, border-radius 14px, min-height 72px |
| Card (selected) | bg `#F5E200`, border `#F5E200`, ALL text → `#111110` |
| Category pill | border-radius 999px, min-height 44px, active = `#111110` bg white text |
| Scrollable area | overflow-y auto, -webkit-overflow-scrolling touch, overscroll-behavior contain |

---

## 11 — Prompt Troubleshooting

| Issue | Cause | Fix prompt to add |
|---|---|---|
| Buttons not clickable | Used onTouchStart which blocks onClick in browser | "Use onClick for all interactions, not onTouchStart." |
| Yellow text on white cards | AI used accent colour (#F5E200) as text colour | "Yellow (#F5E200) is NEVER used as text on white/light surfaces. Use #111110 for prices and text on white cards." |
| Selected card text invisible | Muted text (#88887e) left on yellow background | "When a card has class .sel (yellow background), ALL text inside must be #111110 — including muted labels, durations, and descriptions." |
| Layout breaks on screen resize | Fixed pixel widths used instead of clamp() | "Use clamp(min, fluid, max) for all font sizes, padding, and widths. No fixed pixel values for layout." |
| AI adds payment to booking flow | AI assumes prepay is standard | "This system is POSTPAID. Customers NEVER pay during or after the booking flow. Payment is triggered separately by staff after service completion." |
| AI adds tip to confirm screen | Common pattern in other POS apps | "Tip is collected at payment time on the PaymentTakeover screen, NOT on the booking confirmation screen." |
| Wrong language in barber app | AI defaults to English | "The barber app is Bahasa Indonesia ONLY. No English anywhere in the barber PWA." |
| branch_id missing from query | AI forgets multi-tenant requirement | "Every database query that fetches bookings, barbers, or inventory MUST include branch_id as a filter. All data is branch-scoped." |
| Admin dashboard shows all data unfiltered | AI builds single-tenant dashboard | "Admin dashboard is multi-branch. Default view shows ALL branches. Branch filter is a dropdown. When a specific branch is selected, all data filters to that branch." |
| Triple-tap doesn't work | Timer logic or ref not persisting correctly | "Use useRef (not useState) for tapCount and tapTimer — setState causes re-renders that break the tap timing. tapCount.current increments on each click of the hidden div." |

---

## 07B — Admin: Kiosk Configuration
*GET/PUT /api/admin/kiosk-settings?branch_id=*

```
Build the Bercut Admin Kiosk Configuration screen.

## Purpose
Allows the owner/manager to customise the kiosk experience per branch without
touching code or physically accessing the kiosk device. Changes take effect on
the kiosk on next load, or immediately if the kiosk is listening on SSE for a
kiosk_settings_updated event.

## Location in admin nav
Settings → Kiosk Configuration (sub-tab alongside Notifications & Operations)
Or as a standalone "Kiosk" nav item between Services and Settings.

## Branch selector
Dropdown at the top: "Global (all branches)" or specific branch.
When a branch is selected, its overrides are shown on top of the global defaults.
Saving with "Global" selected writes to the NULL branch_id row (fallback for all branches).

## Sections

### Welcome Screen
- Heading (English): text input, default "Welcome to Bercut"
- Heading (Bahasa): text input, default "Selamat Datang di Bercut"
- Start CTA (English): text input, default "Start Booking"
- Start CTA (Bahasa): text input, default "Mulai Booking"
- Live preview: small mockup card shows how it will look

### Upsell Popup
- Enable upsell suggestions: toggle (default on)
- Popup heading (English): text input
- Popup heading (Bahasa): text input
- "Switch to package" button label: text input
- "Keep my selection" button label: text input
- Note: package savings amounts and service lists are derived from the services
  catalogue — not editable here

### Service Display Order
- Drag-and-drop list of all active services (grouped by category: Haircut, Beard, Color, Package)
- Reorder to change how services appear on the kiosk grid
- "Reset to default" link reverts to sort_order from the services catalogue
- Saved as JSONB array of service UUIDs in kiosk_settings.service_sort_override

## Save behaviour
"Save Changes" button → PUT /api/admin/kiosk-settings { branch_id, ...fields }
→ upserts kiosk_settings row
→ emits SSE event on branch channel: { type: 'kiosk_settings_updated' }
→ kiosk receives event, re-fetches settings, applies without full page reload

## API
GET  /api/admin/kiosk-settings?branch_id=   — fetch current settings (merges global + branch overrides)
PUT  /api/admin/kiosk-settings               — upsert { branch_id, welcome_heading, ... }
SSE  GET /api/events?branch_id=              — listen for kiosk_settings_updated event on kiosk side

## DB table
kiosk_settings — see system-plan.md Section 06 for full schema.
Key columns: branch_id (nullable FK, NULL = global), welcome_heading, welcome_heading_id,
welcome_cta, welcome_cta_id, upsell_enabled, upsell_popup_heading, upsell_popup_heading_id,
upsell_switch_cta, upsell_keep_cta, service_sort_override JSONB, updated_at, updated_by
```

