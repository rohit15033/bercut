// frontend/src/shared/components/Card.jsx
// Base card component — used for service cards, barber cards, slot cards.
//
// COLOUR RULE: when selected=true, background flips to accent yellow and ALL
// child text must use accentText (#111110). The caller is responsible for
// passing correct text colours via children; this component sets the background.
//
// Props:
//   selected  boolean   — yellow background when true
//   onClick   fn
//   minHeight string    — default '72px' (kiosk tap target rule)
//   children  node
//   style     object    — merged into container style

import { tokens } from '../tokens.js'

export default function Card({
  selected  = false,
  onClick,
  minHeight = tokens.white,
  children,
  style,
  ...rest
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background:   selected ? tokens.accent : tokens.white,
        border:       `2px solid ${selected ? tokens.accent : tokens.border}`,
        borderRadius: 12,
        padding:      'clamp(12px, 1.5vw, 20px)',
        minHeight:    '72px',
        cursor:       onClick ? 'pointer' : 'default',
        transition:   'background 0.12s, border-color 0.12s',
        boxSizing:    'border-box',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
