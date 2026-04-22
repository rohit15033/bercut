import { useState, useRef, memo } from 'react'
import { tokens as C } from '../../../shared/tokens.js'

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

// 150ms debounce per key — prevents touchscreen ghosting (rrrr effect)
const DEBOUNCE_MS = 150

function OnScreenKeyboard({ value, onChange, mode = 'alpha', onDone }) {
  const [shifted, setShifted]     = useState(true) // caps for first letter
  const [pressedKey, setPressedKey] = useState(null)
  const lastPressRef = useRef({})

  const handleKey = (key) => {
    if (key === '') return
    const now = Date.now()
    if (now - (lastPressRef.current[key] || 0) < DEBOUNCE_MS) return
    lastPressRef.current[key] = now

    if (key === '⌫') { onChange(value.slice(0, -1)); return }
    if (key === '⇧') { setShifted(s => !s); return }

    const char = mode === 'alpha' && !shifted ? key.toLowerCase() : key
    onChange(value + char)
    if (mode === 'alpha' && shifted) setShifted(false)
  }

  const rows = mode === 'numeric' ? NUM_ROWS : ALPHA_ROWS

  const keyStyle = (key) => {
    const isSpecial = key === '⇧' || key === '⌫'
    const isEmpty   = key === ''
    const isPressed = pressedKey === key && !isEmpty

    let bg    = '#FFFFFF'
    let color = C.text

    if (key === '⇧')   { bg = shifted ? C.topBg : '#C4C4C4'; color = shifted ? '#FFF' : C.text }
    else if (key === '⌫') { bg = '#C4C4C4' }
    else if (isEmpty)     { bg = 'transparent' }

    if (isPressed) {
      bg    = (key === '⇧' || key === '⌫') ? '#888' : C.accent
      color = (key === '⇧' || key === '⌫') ? '#FFF' : C.accentText
    }

    return {
      flex:       isSpecial ? 1.4 : 1,
      height:     'clamp(32px, 4.2vh, 42px)',
      borderRadius: 6,
      border:     'none',
      fontSize:   isSpecial ? 'clamp(13px, 1.6vw, 17px)' : 'clamp(12px, 1.5vw, 16px)',
      fontWeight: 700,
      fontFamily: "'Inter', sans-serif",
      cursor:     isEmpty ? 'default' : 'pointer',
      background: bg,
      color,
      boxShadow:  isEmpty  ? 'none'
                : isPressed ? 'inset 0 1px 3px rgba(0,0,0,0.2)'
                : '0 1px 2px rgba(0,0,0,0.13)',
      transform:  isPressed ? 'scale(0.91)' : 'scale(1)',
      transition: 'transform 60ms, background 60ms',
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'manipulation',
    }
  }

  const spaceStyle = (pressed) => ({
    flex: 1,
    height: 'clamp(32px, 4.2vh, 42px)',
    borderRadius: 6,
    border: 'none',
    fontSize: 'clamp(10px, 1.2vw, 13px)',
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    background: pressed ? C.accent : '#FFFFFF',
    color:      pressed ? C.accentText : C.muted,
    boxShadow:  pressed ? 'inset 0 1px 3px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.13)',
    transform:  pressed ? 'scale(0.96)' : 'scale(1)',
    transition: 'transform 60ms, background 60ms',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'manipulation',
  })

  const doneStyle = (pressed) => ({
    width:  'clamp(68px, 8.5vw, 96px)',
    height: 'clamp(32px, 4.2vh, 42px)',
    borderRadius: 6,
    border: 'none',
    fontSize: 'clamp(11px, 1.2vw, 13px)',
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    background: pressed ? '#333' : C.topBg,
    color: '#FFF',
    transform:  pressed ? 'scale(0.96)' : 'scale(1)',
    transition: 'transform 60ms, background 60ms',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'manipulation',
    flexShrink: 0,
  })

  // Returns pointer event handlers for a key; preventDefault stops ghost clicks
  const press = (key) => ({
    onPointerDown:   (e) => { e.preventDefault(); setPressedKey(key); handleKey(key) },
    onPointerUp:     ()  => setPressedKey(null),
    onPointerLeave:  ()  => setPressedKey(null),
    onPointerCancel: ()  => setPressedKey(null),
  })

  return (
    <div style={{
      background: '#D1D5DB',
      borderTop: '1px solid #B2B6BB',
      padding: 'clamp(4px, 0.55vh, 7px) clamp(6px, 0.7vw, 10px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(3px, 0.38vh, 5px)',
    }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 'clamp(3px, 0.36vw, 5px)', justifyContent: 'center' }}>
          {ri === 1 && mode === 'alpha' && <div style={{ flex: 0.5 }} />}
          {row.map((key, ki) => (
            <button key={ki} style={keyStyle(key)} {...(key !== '' ? press(key) : {})}>
              {key === '⇧' ? (shifted ? '⇧' : '⇪')
               : key === '⌫' ? '⌫'
               : mode === 'alpha' && !shifted ? key.toLowerCase() : key}
            </button>
          ))}
          {ri === 1 && mode === 'alpha' && <div style={{ flex: 0.5 }} />}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 'clamp(3px, 0.36vw, 5px)' }}>
        {mode === 'alpha' && (
          <button style={spaceStyle(pressedKey === ' ')} {...press(' ')}>space</button>
        )}
        {mode === 'numeric' && <div style={{ flex: 1 }} />}
        <button
          style={doneStyle(pressedKey === '__done__')}
          onPointerDown={(e) => { e.preventDefault(); setPressedKey('__done__') }}
          onPointerUp={() => { setPressedKey(null); onDone?.() }}
          onPointerLeave={() => setPressedKey(null)}
          onPointerCancel={() => setPressedKey(null)}
        >
          Done ✓
        </button>
      </div>
    </div>
  )
}

export default memo(OnScreenKeyboard)
