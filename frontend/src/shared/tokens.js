// frontend/src/shared/tokens.js
// Single source of truth for all design tokens.
// COLOUR RULE: yellow (#F5E200) is NEVER text on white/light backgrounds.
// Yellow is a filled background only. Text ON yellow must always be #111110.

export const BERCUT_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA7sAAAEtCAYAAADJOneBAAEAAElEQVR4nOz9d5xs2VXfDX/X3idUVfeNk5OyhASSQAZEjgYZ2YCwAMODSbaxH3gM9mvw6wA22CYKTMbYgAk2tsnIfmxylAMgJCMDQmkkzYxmRhNv7O6qOmHv9fyx9z7nVHV1953uvnPvlep3P3VPddWpc/bZYe2VF6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxhprrLHGGmusscYaa6yxxvUIOZ7LZEAJ1FhpsPFTL6DLN1RQ6b832n9+I0MHPbnwLELXCRr/8wz6Jf1OTXzjFz4XTecufb/rt4PPDwUTX+k6i+3o72OAFmvCV0YJz3RMM+n9FWk+pH5Moy1L53gPSkmaRUK78PvDwQAWcGA8IuET0TC+w5nVzfPhun0fGXuVvemQLg2Ej8dwGKwd8d05ASvWbffZ8udrrLHGjQgZrPPVJGRpzQ/oqABmPxqaeIjhcS8sn3clR5Z4EgZ0UMLLDO57NXi1rvcEHKAeII+t8iQ6uUiGh30KQ1q6tE3t4pVEQp9317vG/Odw/099Lbo4a5yk/T/vfiW04bfd82WAR+IcM9Jfa+FG1xtMbJoDTxab2Y/7wcjisd39lbDAX6f11vGvRFnlqa6bwfFayy/dHLhB27+AOJcX6YALvJXu5okX5Za9kR14xhWhBG4BznNys0Gr0EgvQAGth9LQN9SENakCJvKH2Y3MMEtclpFQJdZ3SHCrGZgMtqfh3BYTBsr6MKoU8fw5IiAGVMMkDMNou2t1m2VaxJIoxWEZZ0OYUHEjwHX3WBBu7AicQdjm9ttCi2bnIM+g9oEYy+AF/Xs9YDHJdT7+R23/Qb9X4mY2ZCo8WBe+axU2T8FjjxkcpxmPLPP5BXJacgtTd5R9zAJjMDPEep77LHjkQdgsw7ps2shySH80aQpq+LXa/a5//SPqbHYrquLRZIGOCWEsmxqqCpwDh0VtCb5Cco+68LPMWtpaKPKCppkOLmxQLLsUS2usscYNB8Fg6AmgHwq8HaNdEKk8NvPkObQNuBaKyCxkWb9XWgt5HoSbeQVlka7FSmH3Ssmvar8Xpb3ZC1zeAVuE68znkNnAw5VjGJWBzglgpaf5IgPjxQEK7/32P0PgD2sPLoNyAx56EJSNyODOOiWi0f5XPvFQC4jCTPfXQEevkGWbtNVligJuvRkuPgF33g6XLsW9d9DWg/bspwJrF6+3fG2v0CZ+y4ONfZyajoViAg8/Co4xSE6RK64+DwacAbwBzRmPMupqi7vvgnPnYTIB4+JYtfTKWiLrydH5L7Osd1jCcN6l910fGDAFnD4FD90PjhxjRnipaf1OL8ukedu/HTDZiX9tF9fH4HtrM7zbYZKHuW0FNnMQC63p+2S5rVfyfAd8fdX5Wz3i9a+1sDvdgbwIfGVWgB3D9hwuXwbMadDLQNWt7TQHXL9COIiPOiZh14Rv"

export const tokens = {
  bg: '#FAFAF8',  // warm off-white page background
  surface: '#F2F0EB',  // input fields, secondary surfaces
  surface2: '#ECEAE4',  // disabled states, tertiary
  accent: '#F5E200',  // Bercut yellow — CTA buttons and selected card states ONLY
  accentText: '#111110',  // text ON yellow backgrounds
  text: '#111110',  // primary text
  text2: '#3A3A38',  // secondary text
  muted: '#88887E',  // placeholder, helper, bilingual subtitles
  border: '#DDDBD4',  // card borders, dividers
  topBg: '#111110',  // topbar, primary dark buttons
  topText: '#F5E200',  // text in topbar (yellow on black)
  white: '#FFFFFF',  // card surfaces
  danger: '#C0272D',  // destructive actions only
}

export const font = {
  heading: "'Inter', sans-serif",
  body: "'DM Sans', sans-serif",
}

// 1366x768 kiosk — clamp values tuned for this exact resolution
export const size = {
  titleKiosk: 'clamp(24px, 2.8vw, 36px)',
  nameLarge: 'clamp(14px, 1.5vw, 18px)',
  price: 'clamp(14px, 1.4vw, 18px)',
  queueHero: 'clamp(72px, 10vw, 120px)',
  cta: 'clamp(15px, 1.4vw, 17px)',
  body: 'clamp(12px, 1.1vw, 14px)',
  label: 'clamp(10px, 1vw, 12px)',
  tapMin: '72px',  // minimum touch target height — kiosk rule
}

// JWT helpers — used by api.js for admin auth
export function getToken() {
  return localStorage.getItem('bercut_token') ?? null
}

export function setToken(t) {
  if (t) localStorage.setItem('bercut_token', t)
  else localStorage.removeItem('bercut_token')
}

// Kiosk device token helpers
export function getKioskToken() {
  return localStorage.getItem('kiosk_token') ?? null
}

export function setKioskToken(t) {
  if (t) localStorage.setItem('kiosk_token', t)
  else localStorage.removeItem('kiosk_token')
}
