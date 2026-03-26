// frontend/src/shared/components/Topbar.jsx
// Shared topbar used across all three apps.
// Dark background (#111110), Bercut yellow (#F5E200) logo text.
// Triple-tap top-right corner → onStaffAccess callback (kiosk staff panel).
// Use useRef for tap counter — useState would cause re-render gaps in timing.
//
// Props:
//   title        string   — screen title (left side)
//   subtitle     string?  — optional bilingual subtitle below title
//   right        node?    — optional right-side content
//   onStaffAccess fn?     — called after 3 taps on top-right corner (kiosk only)

import { useRef } from 'react'
import { tokens, font, size } from '../tokens.js'

const TRIPLE_TAP_WINDOW_MS = 800

export default function Topbar({ title, subtitle, right, onStaffAccess }) {
  const tapCount = useRef(0)
  const tapTimer = useRef(null)

  function handleCornerTap() {
    if (!onStaffAccess) return
    tapCount.current += 1
    clearTimeout(tapTimer.current)
    if (tapCount.current >= 3) {
      tapCount.current = 0
      onStaffAccess()
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0 }, TRIPLE_TAP_WINDOW_MS)
    }
  }

  return (
    <header style={{
      background:      tokens.topBg,
      color:           tokens.topText,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'space-between',
      padding:         '0 clamp(16px, 3vw, 32px)',
      height:          'clamp(56px, 7vw, 72px)',
      flexShrink:      0,
      userSelect:      'none',
    }}>
      {/* Left — logo mark */}
      <span style={{
        fontFamily:  font.heading,
        fontSize:    'clamp(20px, 2.8vw, 28px)',
        fontWeight:  900,
        color:       tokens.topText,
        letterSpacing: '0.04em',
      }}>
        BERCUT
      </span>

      {/* Centre — title */}
      {title && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: font.heading,
            fontSize:   size.cta,
            fontWeight: 800,
            color:      tokens.topText,
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{
              fontFamily: font.body,
              fontSize:   size.label,
              fontWeight: 700,
              color:      tokens.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}>
              {subtitle}
            </div>
          )}
        </div>
      )}

      {/* Right — custom content + invisible staff tap target */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
        {/* Invisible 44×44 tap target for triple-tap staff access */}
        <div
          onClick={handleCornerTap}
          style={{ width: 44, height: 44, cursor: 'default' }}
          aria-hidden="true"
        />
      </div>
    </header>
  )
}
