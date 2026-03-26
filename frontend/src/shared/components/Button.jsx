// frontend/src/shared/components/Button.jsx
// Base button component used across all three apps.
//
// Variants:
//   primary   — dark (#111110) background, white text  ← default CTA
//   accent    — yellow (#F5E200) background, dark text ← selected / confirmation
//   ghost     — transparent, dark border
//   danger    — red (#C0272D) background, white text
//
// Props:
//   variant   'primary' | 'accent' | 'ghost' | 'danger'
//   size      'sm' | 'md' | 'lg'
//   disabled  boolean
//   fullWidth boolean
//   onClick   fn
//   children  node

import { tokens, font, size as sz } from '../tokens.js'

const VARIANTS = {
  primary: { background: tokens.topBg,   color: tokens.white,      border: 'none' },
  accent:  { background: tokens.accent,  color: tokens.accentText, border: 'none' },
  ghost:   { background: 'transparent',  color: tokens.text,       border: `2px solid ${tokens.border}` },
  danger:  { background: tokens.danger,  color: tokens.white,      border: 'none' },
}

const SIZES = {
  sm: { fontSize: sz.body,  padding: '0 16px', height: sz.tapMin },
  md: { fontSize: sz.cta,   padding: '0 24px', height: sz.tapMin },
  lg: { fontSize: sz.cta,   padding: '0 32px', height: 'clamp(72px, 8vw, 88px)' },
}

export default function Button({
  variant   = 'primary',
  size      = 'md',
  disabled  = false,
  fullWidth = false,
  onClick,
  children,
  style,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary
  const s = SIZES[size]       ?? SIZES.md

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        fontFamily:      font.heading,
        fontWeight:      800,
        borderRadius:    8,
        cursor:          disabled ? 'not-allowed' : 'pointer',
        opacity:         disabled ? 0.45 : 1,
        transition:      'opacity 0.15s',
        width:           fullWidth ? '100%' : undefined,
        whiteSpace:      'nowrap',
        ...v,
        ...s,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
