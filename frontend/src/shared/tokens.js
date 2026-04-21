// frontend/src/shared/tokens.js
// Single source of truth for all design tokens.
// COLOUR RULE: yellow (#F5E200) is NEVER text on white/light backgrounds.
// Yellow is a filled background only. Text ON yellow must always be #111110.

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

export const font = {
  heading: "'Inter', sans-serif",
  body:    "'DM Sans', sans-serif",
}

// 1366x768 kiosk — clamp values tuned for this exact resolution
export const size = {
  titleKiosk: 'clamp(24px, 2.8vw, 36px)',
  nameLarge:  'clamp(14px, 1.5vw, 18px)',
  price:      'clamp(14px, 1.4vw, 18px)',
  queueHero:  'clamp(72px, 10vw, 120px)',
  cta:        'clamp(15px, 1.4vw, 17px)',
  body:       'clamp(12px, 1.1vw, 14px)',
  label:      'clamp(10px, 1vw, 12px)',
  tapMin:     '72px',  // minimum touch target height — kiosk rule
}

// JWT helpers — used by api.js for admin auth
export function getToken() {
  return localStorage.getItem('bercut_token') ?? null
}

export function setToken(t) {
  if (t) localStorage.setItem('bercut_token', t)
  else   localStorage.removeItem('bercut_token')
}

// Kiosk device token helpers
export function getKioskToken() {
  return localStorage.getItem('kiosk_token') ?? null
}

export function setKioskToken(t) {
  if (t) localStorage.setItem('kiosk_token', t)
  else   localStorage.removeItem('kiosk_token')
}
