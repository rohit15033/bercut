import { useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'

// ── On-Screen Keyboard for Kiosk (no OS keyboard in signage mode) ──────────
// Modes: 'alpha' (QWERTY + space) | 'numeric' (number pad)
export default function OnScreenKeyboard({ value, onChange, mode = 'alpha', onDone }) {
  const [shifted, setShifted] = useState(true) // start with caps for first letter

  const ALPHA_ROWS = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['⇧','Z','X','C','V','B','N','M','⌫'],
  ]

  const NUM_ROWS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['','0','⌫'],
  ]

  const handleKey = (key) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }
    if (key === '⇧') {
      setShifted(s => !s)
      return
    }
    if (key === '' ) return

    const char = mode === 'alpha' && !shifted ? key.toLowerCase() : key
    onChange(value + char)

    // Auto-lowercase after first letter typed
    if (mode === 'alpha' && shifted && value.length === 0) {
      // keep shifted for now — the first char is uppercase
    }
    if (mode === 'alpha' && shifted) {
      setShifted(false)
    }
  }

  const rows = mode === 'numeric' ? NUM_ROWS : ALPHA_ROWS

  const keyStyle = (key) => ({
    flex: key === '⇧' || key === '⌫' ? 1.4 : 1,
    height: 'clamp(42px, 5.5vh, 56px)',
    borderRadius: 8,
    border: 'none',
    fontSize: key === '⇧' || key === '⌫' ? 'clamp(16px, 2vw, 20px)' : 'clamp(15px, 1.8vw, 19px)',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    cursor: key === '' ? 'default' : 'pointer',
    transition: 'all 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: key === '⇧' ? (shifted ? C.topBg : '#e0e0e0')
              : key === '⌫' ? '#e0e0e0'
              : key === '' ? 'transparent'
              : '#fff',
    color: key === '⇧' ? (shifted ? '#fff' : C.text)
         : key === '⌫' ? C.text
         : C.text,
    boxShadow: key === '' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
  })

  const spaceStyle = {
    flex: 1,
    height: 'clamp(42px, 5.5vh, 56px)',
    borderRadius: 8,
    border: 'none',
    fontSize: 'clamp(13px, 1.5vw, 15px)',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    background: '#fff',
    color: C.muted,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.1s',
  }

  const doneStyle = {
    width: 'clamp(80px, 10vw, 110px)',
    height: 'clamp(42px, 5.5vh, 56px)',
    borderRadius: 8,
    border: 'none',
    fontSize: 'clamp(13px, 1.5vw, 15px)',
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    background: C.topBg,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.1s',
  }

  return (
    <div style={{
      background: '#d1d5db',
      borderTop: '1px solid #bbb',
      padding: 'clamp(6px, 0.8vw, 10px) clamp(8px, 1vw, 14px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(4px, 0.5vw, 6px)',
    }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 'clamp(4px, 0.5vw, 6px)', justifyContent: 'center' }}>
          {ri === 1 && mode === 'alpha' && <div style={{ flex: 0.5 }} />}
          {row.map((key, ki) => (
            <button
              key={ki}
              onClick={() => handleKey(key)}
              onMouseDown={e => e.preventDefault()} // prevent input blur
              style={keyStyle(key)}
            >
              {key === '⇧' ? (shifted ? '⇧' : '⇪') : key === '⌫' ? '⌫' : (mode === 'alpha' && !shifted ? key.toLowerCase() : key)}
            </button>
          ))}
          {ri === 1 && mode === 'alpha' && <div style={{ flex: 0.5 }} />}
        </div>
      ))}

      {/* Bottom row — space (alpha) or just done */}
      <div style={{ display: 'flex', gap: 'clamp(4px, 0.5vw, 6px)' }}>
        {mode === 'alpha' && (
          <button
            onClick={() => handleKey(' ')}
            onMouseDown={e => e.preventDefault()}
            style={spaceStyle}
          >
            space
          </button>
        )}
        {mode === 'numeric' && <div style={{ flex: 1 }} />}
        <button
          onClick={onDone}
          onMouseDown={e => e.preventDefault()}
          style={doneStyle}
        >
          Done ✓
        </button>
      </div>
    </div>
  )
}
