import { useEffect, useRef, useState, memo } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

const COUNTRIES = [
  { name:'Indonesia',           code:'+62',  abbr:'ID' },
  { name:'Australia',           code:'+61',  abbr:'AU' },
  { name:'United Kingdom',      code:'+44',  abbr:'GB' },
  { name:'United States',       code:'+1',   abbr:'US' },
  { name:'Singapore',           code:'+65',  abbr:'SG' },
  { name:'Malaysia',            code:'+60',  abbr:'MY' },
  { name:'Japan',               code:'+81',  abbr:'JP' },
  { name:'China',               code:'+86',  abbr:'CN' },
  { name:'South Korea',         code:'+82',  abbr:'KR' },
  { name:'India',               code:'+91',  abbr:'IN' },
  { name:'Germany',             code:'+49',  abbr:'DE' },
  { name:'France',              code:'+33',  abbr:'FR' },
  { name:'Netherlands',         code:'+31',  abbr:'NL' },
  { name:'Russia',              code:'+7',   abbr:'RU' },
  { name:'New Zealand',         code:'+64',  abbr:'NZ' },
  { name:'Canada',              code:'+1',   abbr:'CA' },
  { name:'Brazil',              code:'+55',  abbr:'BR' },
  { name:'Thailand',            code:'+66',  abbr:'TH' },
  { name:'Philippines',         code:'+63',  abbr:'PH' },
  { name:'Vietnam',             code:'+84',  abbr:'VN' },
  { name:'Taiwan',              code:'+886', abbr:'TW' },
  { name:'Hong Kong',           code:'+852', abbr:'HK' },
  { name:'Macau',               code:'+853', abbr:'MO' },
  { name:'Saudi Arabia',        code:'+966', abbr:'SA' },
  { name:'United Arab Emirates',code:'+971', abbr:'AE' },
  { name:'Qatar',               code:'+974', abbr:'QA' },
  { name:'Kuwait',              code:'+965', abbr:'KW' },
  { name:'Italy',               code:'+39',  abbr:'IT' },
  { name:'Spain',               code:'+34',  abbr:'ES' },
  { name:'Switzerland',         code:'+41',  abbr:'CH' },
  { name:'Sweden',              code:'+46',  abbr:'SE' },
  { name:'Norway',              code:'+47',  abbr:'NO' },
  { name:'Denmark',             code:'+45',  abbr:'DK' },
  { name:'Finland',             code:'+358', abbr:'FI' },
  { name:'Belgium',             code:'+32',  abbr:'BE' },
  { name:'Austria',             code:'+43',  abbr:'AT' },
  { name:'Portugal',            code:'+351', abbr:'PT' },
  { name:'Poland',              code:'+48',  abbr:'PL' },
  { name:'Turkey',              code:'+90',  abbr:'TR' },
  { name:'Israel',              code:'+972', abbr:'IL' },
  { name:'South Africa',        code:'+27',  abbr:'ZA' },
  { name:'Egypt',               code:'+20',  abbr:'EG' },
  { name:'Nigeria',             code:'+234', abbr:'NG' },
  { name:'Kenya',               code:'+254', abbr:'KE' },
  { name:'Mexico',              code:'+52',  abbr:'MX' },
  { name:'Argentina',           code:'+54',  abbr:'AR' },
  { name:'Chile',               code:'+56',  abbr:'CL' },
  { name:'Colombia',            code:'+57',  abbr:'CO' },
  { name:'Papua New Guinea',    code:'+675', abbr:'PG' },
  { name:'Timor-Leste',         code:'+670', abbr:'TL' },
]
const PINNED = ['ID', 'AU', 'GB', 'US', 'SG']
const pinnedCountries = COUNTRIES.filter(c => PINNED.includes(c.abbr))

const DEBOUNCE_MS = 150

const ALPHA_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['⇧','Z','X','C','V','B','N','M','⌫'],
]

const SearchKeyboard = memo(function SearchKeyboard({ value, onChange, onClose }) {
  const [shifted, setShifted] = useState(false)
  const [pressedKey, setPressedKey] = useState(null)
  const lastPressRef = useRef({})
  const deleteTimerRef = useRef(null)
  const deleteIntervalRef = useRef(null)

  const handleKey = (key) => {
    if (!key) return
    const now = Date.now()
    if (now - (lastPressRef.current[key] || 0) < DEBOUNCE_MS) return
    lastPressRef.current[key] = now
    if (key === '⇧') { setShifted(s => !s); return }
    if (key === ' ') { onChange(value + ' '); return }
    const char = shifted ? key : key.toLowerCase()
    onChange(value + char)
    if (shifted) setShifted(false)
  }

  const stopDelete = () => {
    setPressedKey(null)
    clearTimeout(deleteTimerRef.current)
    clearInterval(deleteIntervalRef.current)
  }

  const press = (key) => {
    if (key === '⌫') return {
      onPointerDown:   (e) => { e.preventDefault(); setPressedKey('⌫'); onChange(prev => prev.slice(0, -1)); deleteTimerRef.current = setTimeout(() => { deleteIntervalRef.current = setInterval(() => onChange(prev => prev.slice(0, -1)), 80) }, 400) },
      onPointerUp:     stopDelete,
      onPointerLeave:  stopDelete,
      onPointerCancel: stopDelete,
    }
    return {
      onPointerDown:   (e) => { e.preventDefault(); setPressedKey(key); handleKey(key) },
      onPointerUp:     () => setPressedKey(null),
      onPointerLeave:  () => setPressedKey(null),
      onPointerCancel: () => setPressedKey(null),
    }
  }

  const keyBg = (key) => {
    const p = pressedKey === key
    if (p) return key === '⇧' || key === '⌫' ? '#888' : C.accent
    if (key === '⇧') return shifted ? C.topBg : '#C4C4C4'
    if (key === '⌫') return '#C4C4C4'
    return '#FFFFFF'
  }
  const keyColor = (key) => {
    const p = pressedKey === key
    if (p) return key === '⇧' || key === '⌫' ? '#FFF' : C.accentText
    if (key === '⇧') return shifted ? '#FFF' : C.text
    return C.text
  }

  return (
    <div style={{ background:'#D1D5DB', borderTop:'1px solid #B2B6BB', padding:'clamp(6px,0.9vh,10px) clamp(8px,1vw,12px)', display:'flex', flexDirection:'column', gap:'clamp(4px,0.55vh,6px)', flexShrink:0 }}>
      {ALPHA_ROWS.map((row, ri) => (
        <div key={ri} style={{ display:'flex', gap:'clamp(4px,0.48vw,6px)', justifyContent:'center' }}>
          {ri === 1 && <div style={{ flex:0.5 }} />}
          {row.map((key, ki) => {
            const isSpecial = key === '⇧' || key === '⌫'
            const isPressed = pressedKey === key
            return (
              <button key={ki} {...press(key)}
                style={{ flex:isSpecial ? 1.5 : 1, height:'clamp(44px,5.9vh,56px)', borderRadius:8, border:'none', fontSize:'clamp(14px,1.8vw,19px)', fontWeight:700, fontFamily:"'Inter',sans-serif", cursor:'pointer', background:keyBg(key), color:keyColor(key), boxShadow:isPressed ? 'inset 0 2px 4px rgba(0,0,0,0.22)' : '0 2px 3px rgba(0,0,0,0.14)', transform:isPressed ? 'scale(0.9)' : 'scale(1)', transition:'transform 60ms, background 60ms', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation' }}>
                {key === '⇧' ? (shifted ? '⇧' : '⇪') : key === '⌫' ? '⌫' : shifted ? key : key.toLowerCase()}
              </button>
            )
          })}
          {ri === 1 && <div style={{ flex:0.5 }} />}
        </div>
      ))}
      <div style={{ display:'flex', gap:'clamp(4px,0.48vw,6px)' }}>
        <button {...press(' ')}
          style={{ flex:1, height:'clamp(44px,5.9vh,56px)', borderRadius:8, border:'none', fontSize:'clamp(11px,1.3vw,14px)', fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:'pointer', background:pressedKey === ' ' ? C.accent : '#FFFFFF', color:pressedKey === ' ' ? C.accentText : C.muted, boxShadow:pressedKey === ' ' ? 'inset 0 2px 4px rgba(0,0,0,0.22)' : '0 2px 3px rgba(0,0,0,0.14)', transform:pressedKey === ' ' ? 'scale(0.96)' : 'scale(1)', transition:'transform 60ms, background 60ms', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation' }}>
          space
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); setPressedKey('__hide__') }}
          onPointerUp={() => { setPressedKey(null); onClose() }}
          onPointerLeave={() => setPressedKey(null)}
          onPointerCancel={() => setPressedKey(null)}
          style={{ width:'clamp(80px,9.5vw,112px)', height:'clamp(44px,5.9vh,56px)', flexShrink:0, borderRadius:8, border:'none', fontSize:'clamp(12px,1.4vw,15px)', fontWeight:800, fontFamily:"'Inter',sans-serif", cursor:'pointer', background:pressedKey === '__hide__' ? '#333' : C.topBg, color:'#FFF', boxShadow:pressedKey === '__hide__' ? 'inset 0 2px 4px rgba(0,0,0,0.22)' : '0 2px 3px rgba(0,0,0,0.14)', transform:pressedKey === '__hide__' ? 'scale(0.94)' : 'scale(1)', transition:'transform 60ms, background 60ms', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation' }}>
          Hide ▼
        </button>
      </div>
    </div>
  )
})

function CountryPicker({ selected, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [showKeyboard, setShowKeyboard] = useState(false)
  const q = search.toLowerCase().trim()

  const Row = ({ c }) => (
    <div onClick={() => { onSelect(c); onClose() }}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'clamp(10px,1.4vh,13px) clamp(12px,1.6vw,16px)', cursor:'pointer', borderRadius:8, background:selected?.abbr === c.abbr ? C.surface : 'transparent', transition:'background 0.12s' }}
      onMouseEnter={e => e.currentTarget.style.background = C.surface}
      onMouseLeave={e => e.currentTarget.style.background = selected?.abbr === c.abbr ? C.surface : 'transparent'}>
      <img src={`https://flagcdn.com/w40/${c.abbr.toLowerCase()}.png`} alt={c.abbr} width={28} height={20} style={{ borderRadius:3, objectFit:'cover', flexShrink:0, border:'1px solid #e0e0e0' }} />
      <span style={{ flex:1, fontSize:'clamp(13px,1.5vw,15px)', fontWeight:500, color:C.text }}>{c.name}</span>
      <span style={{ fontSize:'clamp(13px,1.5vw,15px)', fontWeight:700, color:C.muted, fontFamily:"'Inter',sans-serif" }}>{c.code}</span>
    </div>
  )

  const filtered = q
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.includes(q) || c.abbr.toLowerCase().includes(q))
    : null

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(16px,2.4vw,28px)' }} onClick={onClose}>
      <div className="si" style={{ background:C.white, borderRadius:18, width:'min(680px, 90vw)', height:'86vh', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'clamp(14px,2vw,20px) clamp(16px,2.2vw,22px)', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(15px,2vw,19px)', fontWeight:800, color:C.text }}>Select Country Code</div>
            <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted, marginTop:2 }}>Pilih kode negara</div>
          </div>
          <button onClick={onClose} style={{ background:C.surface2, border:'none', borderRadius:8, width:34, height:34, fontSize:18, cursor:'pointer', color:C.text2, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Search display — readOnly, driven by SearchKeyboard below */}
        <div style={{ padding:'clamp(10px,1.4vw,14px) clamp(16px,2.2vw,22px)', borderBottom:`1px solid ${C.border}`, flexShrink:0 }} onClick={() => setShowKeyboard(true)}>
          <input readOnly value={search} placeholder="🔍  Tap to search country or code…"
            style={{ width:'100%', padding:'clamp(10px,1.4vh,13px) 14px', borderRadius:9, border:`1.5px solid ${showKeyboard ? C.topBg : C.border}`, fontSize:'clamp(13px,1.5vw,15px)', background:C.surface, fontFamily:"'DM Sans',sans-serif", color:search ? C.text : C.muted, cursor:'pointer', transition:'border-color 0.15s' }} />
        </div>

        {/* Country list */}
        <div style={{ overflowY:'auto', flex:1, WebkitOverflowScrolling:'touch' }}>
          {!q && (
            <>
              <div style={{ padding:'clamp(6px,0.8vw,8px) clamp(16px,2.2vw,22px) 4px', fontSize:'clamp(9px,1.1vw,11px)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.muted }}>Pinned</div>
              {pinnedCountries.map(c => <Row key={c.abbr} c={c} />)}
              <div style={{ height:1, background:C.border, margin:'clamp(6px,0.8vw,8px) clamp(16px,2.2vw,22px)' }} />
              <div style={{ padding:'clamp(6px,0.8vw,8px) clamp(16px,2.2vw,22px) 4px', fontSize:'clamp(9px,1.1vw,11px)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.muted }}>All Countries</div>
              {COUNTRIES.map(c => <Row key={c.abbr} c={c} />)}
            </>
          )}
          {q && (
            filtered.length > 0
              ? filtered.map(c => <Row key={c.abbr} c={c} />)
              : <div style={{ padding:'clamp(20px,3vw,28px)', textAlign:'center', color:C.muted, fontSize:'clamp(12px,1.4vw,14px)' }}>No countries found</div>
          )}
        </div>

        {/* On-screen keyboard — shown only after tapping search bar */}
        {showKeyboard && <SearchKeyboard value={search} onChange={setSearch} onClose={() => setShowKeyboard(false)} />}
      </div>
    </div>
  )
}

const NUM_PAD = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']]

const InlineQwerty = memo(function InlineQwerty({ value, onChange, onDone }) {
  const [shifted, setShifted] = useState(true)
  const [pressedKey, setPressedKey] = useState(null)
  const lastPressRef = useRef({})
  const deleteTimerRef = useRef(null)
  const deleteIntervalRef = useRef(null)

  const handleKey = (key) => {
    if (!key) return
    const now = Date.now()
    if (now - (lastPressRef.current[key] || 0) < DEBOUNCE_MS) return
    lastPressRef.current[key] = now
    if (key === '⇧') { setShifted(s => !s); return }
    if (key === ' ') { onChange(value + ' '); return }
    const char = !shifted ? key.toLowerCase() : key
    onChange(value + char)
    if (shifted) setShifted(false)
  }

  const stopDelete = () => {
    setPressedKey(null)
    clearTimeout(deleteTimerRef.current)
    clearInterval(deleteIntervalRef.current)
  }

  const press = (key) => {
    if (key === '⌫') return {
      onPointerDown:   (e) => { e.preventDefault(); setPressedKey('⌫'); onChange(prev => prev.slice(0, -1)); deleteTimerRef.current = setTimeout(() => { deleteIntervalRef.current = setInterval(() => onChange(prev => prev.slice(0, -1)), 80) }, 400) },
      onPointerUp:     stopDelete,
      onPointerLeave:  stopDelete,
      onPointerCancel: stopDelete,
    }
    return {
      onPointerDown:   (e) => { e.preventDefault(); setPressedKey(key); handleKey(key) },
      onPointerUp:     ()  => setPressedKey(null),
      onPointerLeave:  ()  => setPressedKey(null),
      onPointerCancel: ()  => setPressedKey(null),
    }
  }

  const keyBg = (key) => {
    const p = pressedKey === key
    if (p) return key === '⇧' || key === '⌫' ? '#888' : C.accent
    if (key === '⇧') return shifted ? C.topBg : '#C4C4C4'
    if (key === '⌫') return '#C4C4C4'
    return '#FFFFFF'
  }
  const keyColor = (key) => {
    const p = pressedKey === key
    if (p) return key === '⇧' || key === '⌫' ? '#FFF' : C.accentText
    if (key === '⇧') return shifted ? '#FFF' : C.text
    return C.text
  }

  return (
    <div style={{ background:'#D1D5DB', borderRadius:12, padding:'clamp(8px,1.1vh,12px) clamp(8px,1vw,12px)', display:'flex', flexDirection:'column', gap:'clamp(4px,0.55vh,6px)' }}>
      {ALPHA_ROWS.map((row, ri) => (
        <div key={ri} style={{ display:'flex', gap:'clamp(4px,0.48vw,5px)', justifyContent:'center' }}>
          {ri === 1 && <div style={{ flex:0.5 }} />}
          {row.map((key, ki) => {
            const isSpecial = key === '⇧' || key === '⌫'
            const isPressed = pressedKey === key
            return (
              <button key={ki} {...press(key)}
                style={{ flex: isSpecial ? 1.5 : 1, height:'clamp(44px,5.9vh,56px)', borderRadius:8, border:'none', fontSize:'clamp(14px,1.8vw,19px)', fontWeight:700, fontFamily:"'Inter',sans-serif", cursor:'pointer', background:keyBg(key), color:keyColor(key), boxShadow: isPressed ? 'inset 0 2px 4px rgba(0,0,0,0.22)' : '0 2px 3px rgba(0,0,0,0.14)', transform: isPressed ? 'scale(0.9)' : 'scale(1)', transition:'transform 60ms, background 60ms', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation' }}>
                {key === '⇧' ? (shifted ? '⇧' : '⇪') : key === '⌫' ? '⌫' : !shifted ? key.toLowerCase() : key}
              </button>
            )
          })}
          {ri === 1 && <div style={{ flex:0.5 }} />}
        </div>
      ))}
      {/* Space + Done row */}
      <div style={{ display:'flex', gap:'clamp(4px,0.48vw,5px)' }}>
        <button {...press(' ')}
          style={{ flex:1, height:'clamp(44px,5.9vh,56px)', borderRadius:8, border:'none', fontSize:'clamp(12px,1.4vw,14px)', fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:'pointer', background: pressedKey === ' ' ? C.accent : '#FFFFFF', color: pressedKey === ' ' ? C.accentText : C.muted, boxShadow: pressedKey === ' ' ? 'inset 0 2px 4px rgba(0,0,0,0.22)' : '0 2px 3px rgba(0,0,0,0.14)', transform: pressedKey === ' ' ? 'scale(0.96)' : 'scale(1)', transition:'transform 60ms, background 60ms', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation' }}>
          space
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); setPressedKey('__done__') }}
          onPointerUp={() => { setPressedKey(null); onDone() }}
          onPointerLeave={() => setPressedKey(null)}
          onPointerCancel={() => setPressedKey(null)}
          style={{ width:'clamp(80px,10vw,108px)', height:'clamp(44px,5.9vh,56px)', flexShrink:0, borderRadius:8, border:'none', fontSize:'clamp(13px,1.5vw,16px)', fontWeight:800, fontFamily:"'Inter',sans-serif", cursor:'pointer', background: pressedKey === '__done__' ? '#333' : C.topBg, color:'#FFF', boxShadow: pressedKey === '__done__' ? 'inset 0 2px 4px rgba(0,0,0,0.22)' : '0 2px 3px rgba(0,0,0,0.14)', transform: pressedKey === '__done__' ? 'scale(0.94)' : 'scale(1)', transition:'transform 60ms, background 60ms', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation' }}>
          Done ✓
        </button>
      </div>
    </div>
  )
})

const InlineNumpad = memo(function InlineNumpad({ value, onChange, country, onDone }) {
  const [pressedKey, setPressedKey] = useState(null)
  const lastPressRef = useRef({})
  const deleteTimerRef = useRef(null)
  const deleteIntervalRef = useRef(null)

  const handleKey = (key) => {
    if (!key) return
    const now = Date.now()
    if (now - (lastPressRef.current[key] || 0) < DEBOUNCE_MS) return
    lastPressRef.current[key] = now
    onChange(value + key)
  }

  const stopDelete = () => {
    setPressedKey(null)
    clearTimeout(deleteTimerRef.current)
    clearInterval(deleteIntervalRef.current)
  }

  const press = (key) => {
    if (key === '⌫') return {
      onPointerDown:   (e) => { e.preventDefault(); setPressedKey('⌫'); onChange(prev => prev.slice(0, -1)); deleteTimerRef.current = setTimeout(() => { deleteIntervalRef.current = setInterval(() => onChange(prev => prev.slice(0, -1)), 80) }, 400) },
      onPointerUp:     stopDelete,
      onPointerLeave:  stopDelete,
      onPointerCancel: stopDelete,
    }
    return {
      onPointerDown:   (e) => { e.preventDefault(); setPressedKey(key); handleKey(key) },
      onPointerUp:     ()  => setPressedKey(null),
      onPointerLeave:  ()  => setPressedKey(null),
      onPointerCancel: ()  => setPressedKey(null),
    }
  }

  return (
    <div style={{ background:'#D1D5DB', borderRadius:12, padding:'clamp(8px,1.1vh,12px) clamp(8px,1vw,12px)', display:'flex', flexDirection:'column', gap:'clamp(4px,0.55vh,6px)' }}>
      {/* Number display — compact single line */}
      <div style={{ background:C.white, borderRadius:8, padding:'clamp(6px,0.8vh,9px) clamp(10px,1.2vw,14px)', fontSize:'clamp(15px,2vw,20px)', fontWeight:700, fontFamily:"'Inter',sans-serif", color:value ? C.text : C.muted, letterSpacing:'0.06em' }}>
        {value ? `${country.code} ${value}` : `${country.code} Enter number…`}
      </div>

      {/* Numpad rows */}
      {NUM_PAD.map((row, ri) => (
        <div key={ri} style={{ display:'flex', gap:'clamp(4px,0.48vw,5px)', justifyContent:'center' }}>
          {row.map((key, ki) => {
            if (!key) return <div key={ki} style={{ flex:1 }} />
            const isBs = key === '⌫'
            const isP  = pressedKey === key
            return (
              <button key={ki} {...press(key)}
                style={{ flex:1, height:'clamp(44px,5.9vh,56px)', borderRadius:8, border:'none', fontSize: isBs ? 'clamp(16px,2vw,21px)' : 'clamp(18px,2.2vw,23px)', fontWeight:700, fontFamily:"'Inter',sans-serif", cursor:'pointer', background: isP ? (isBs ? '#888' : C.accent) : (isBs ? '#C4C4C4' : '#FFFFFF'), color: isP ? (isBs ? '#FFF' : C.accentText) : C.text, boxShadow: isP ? 'inset 0 2px 4px rgba(0,0,0,0.22)' : '0 2px 3px rgba(0,0,0,0.14)', transform: isP ? 'scale(0.9)' : 'scale(1)', transition:'transform 60ms, background 60ms', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation' }}>
                {key}
              </button>
            )
          })}
        </div>
      ))}

      {/* Done row — mirrors QWERTY space+Done row */}
      <div style={{ display:'flex', gap:'clamp(4px,0.48vw,5px)' }}>
        <button
          onPointerDown={(e) => { e.preventDefault(); setPressedKey('__done__') }}
          onPointerUp={() => { setPressedKey(null); onDone() }}
          onPointerLeave={() => setPressedKey(null)}
          onPointerCancel={() => setPressedKey(null)}
          style={{ flex:1, height:'clamp(44px,5.9vh,56px)', borderRadius:8, border:'none', fontSize:'clamp(13px,1.5vw,16px)', fontWeight:800, fontFamily:"'Inter',sans-serif", cursor:'pointer', background: pressedKey === '__done__' ? '#333' : C.topBg, color:'#FFF', boxShadow: pressedKey === '__done__' ? 'inset 0 2px 4px rgba(0,0,0,0.22)' : '0 2px 3px rgba(0,0,0,0.14)', transform: pressedKey === '__done__' ? 'scale(0.94)' : 'scale(1)', transition:'transform 60ms, background 60ms', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation' }}>
          Done ✓
        </button>
      </div>
    </div>
  )
})

export default function Confirm({ cart, services, barber, slot, selectedExtras, menuItems, name, setName, phone, setPhone, branchId, settings, groupId, onConfirm, onBack }) {
  const [country,       setCountry]       = useState(COUNTRIES[0])
  const [showCP,        setShowCP]        = useState(false)
  const [customer,      setCustomer]      = useState(null)
  const [pointsToggled, setPointsToggled] = useState(new Set())
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [activeField,   setActiveField]   = useState(null)
  const nameRef = useRef(null)
  const phoneRef = useRef(null)

  useEffect(() => { setActiveField('name') }, [])

  const valid = name.trim().length >= 2

  const selectedServices    = cart.map(id => services.find(s => s.id === id)).filter(Boolean)
  const selectedExtrasItems = selectedExtras.map(id => menuItems.find(m => (m.stock_id || m.id) === id)).filter(Boolean)

  const svcTotal    = selectedServices.reduce((s, svc) => s + parseFloat(svc?.price ?? svc?.base_price ?? 0), 0)
  const extrasTotal = selectedExtrasItems.reduce((s, item) => s + parseFloat(item?.price || 0), 0)
  const totalDur    = selectedServices.reduce((s, svc) => s + (svc.duration_min || svc.duration_minutes || 30), 0)

  // Loyalty settings
  const gs         = settings?.loyalty || {}
  const redeemRate = gs.redeem_value_per_point || 100
  const minRedeem  = gs.min_redeem_points || 100
  const points     = customer?.loyalty_points || 0
  const canRedeem  = points >= minRedeem

  const ptCost = svc => Math.ceil(parseFloat(svc?.price ?? svc?.base_price ?? 0) / redeemRate)

  const pointsUsed = [...pointsToggled].reduce((s, id) => {
    const svc = selectedServices.find(x => x.id === id)
    return s + (svc ? ptCost(svc) : 0)
  }, 0)
  const pointsRemaining = points - pointsUsed

  const togglePoints = id => {
    const svc = selectedServices.find(x => x.id === id)
    if (!svc) return
    setPointsToggled(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); return next }
      if (pointsRemaining >= ptCost(svc)) { next.add(id); return next }
      return prev
    })
  }

  const pointsDiscount = [...pointsToggled].reduce((s, id) => {
    const svc = selectedServices.find(x => x.id === id)
    return s + parseFloat(svc?.price ?? svc?.base_price ?? 0)
  }, 0)
  const cashTotal = svcTotal + extrasTotal - pointsDiscount

  // Phone loyalty lookup
  useEffect(() => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 8) { setCustomer(null); return }
    const timer = setTimeout(() => {
      kioskApi.get(`/customers?phone=${encodeURIComponent(country.code + digits)}`)
        .then(data => setCustomer(data))
        .catch(() => setCustomer(null))
    }, 600)
    return () => clearTimeout(timer)
  }, [phone, country.code])

  const handleConfirm = async () => {
    if (!valid) return
    setLoading(true); setError('')
    try {
      const e164 = country.code + phone.replace(/\D/g, '').replace(/^0/, '')
      const bk = await kioskApi.post('/bookings', {
        branch_id:      branchId,
        customer_phone: phone ? e164 : undefined,
        customer_name:  name,
        barber_id:      barber.source === 'any_available' ? null : barber.id,
        service_ids:    cart,
        extra_ids:      selectedExtras,
        slot_time:      slot,
        date:           new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' }),
        source:         barber.source === 'any_available' ? 'any_available' : 'kiosk',
        use_points:     pointsUsed > 0,
        group_id:       groupId || undefined,
      })
      onConfirm(bk, pointsUsed)
    } catch (err) {
      setError(err.message || 'Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height:'calc(100vh - clamp(51px,6.5vh,63px))', display:'flex', flexDirection:'column' }}>
      {showCP && <CountryPicker selected={country} onSelect={setCountry} onClose={() => setShowCP(false)} />}

      <div className="scroll-y" style={{ flex:1, padding:'clamp(6px,1vw,12px) clamp(16px,2.4vw,28px)' }}>

      <div className="step-header fu" style={{ marginBottom:'clamp(4px,0.8vw,8px)' }}>
        <div className="step-eyebrow">Step 4 of 4 · Confirm</div>
        <h2 className="step-title" style={{ fontSize:'clamp(20px,2.6vw,30px)' }}>Confirm Your Reservation</h2>
        <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted, marginTop:2 }}>Confirm Reservation · Konfirmasi Reservasi</div>
      </div>

      <div className="confirm-layout">
        {/* LEFT — name + phone + loyalty + CTA */}
        <div style={{ display:'flex', flexDirection:'column', gap:'clamp(6px,0.8vw,8px)' }}>
          <div className="fu" style={{ animationDelay:'0.05s', background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'clamp(10px,1.2vw,14px)' }}>

            {/* Prominent name heading */}
            <div style={{ marginBottom:'clamp(6px,0.8vw,10px)' }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(15px,1.8vw,19px)', fontWeight:800, color:C.text, marginBottom:0 }}>
                What's your name?
              </div>
              <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted }}>
                Required for your reservation
              </div>
            </div>

            {/* Name — required */}
            <div style={{ marginBottom:'clamp(6px,0.8vw,10px)' }}>
              <label style={{ fontSize:'clamp(12px,1.4vw,14px)', fontWeight:700, display:'block', marginBottom:4, color:C.text }}>
                Name / Nama <span style={{ color:C.danger }}>*</span>
              </label>
              <input ref={nameRef} value={name} type="text" autoComplete="off" readOnly
                placeholder="Tap here and type your name"
                style={{ width:'100%', padding:'clamp(10px,1.4vh,13px) 14px', borderRadius:10, border:`2px solid ${activeField === 'name' ? C.topBg : name.trim().length > 0 ? C.topBg : C.accent}`, fontSize:'clamp(14px,1.6vw,16px)', background:activeField === 'name' ? '#FFFDE7' : C.white, fontFamily:"'DM Sans',sans-serif", animation:name.trim().length === 0 && activeField !== 'name' ? 'namePulse 1.4s ease 3' : 'none', transition:'border-color 0.15s, background 0.15s', cursor:'pointer' }}
                onClick={() => setActiveField('name')}
              />
              <div style={{ fontSize:'clamp(10px,1.2vw,11px)', color:C.danger, marginTop:4, minHeight:'clamp(14px,1.6vw,16px)' }}>
                {name.trim().length > 0 && name.trim().length < 2 ? 'Name must be at least 2 characters · Minimal 2 karakter' : ''}
              </div>
            </div>

            {/* WhatsApp — optional */}
            <div style={{ marginBottom:'clamp(6px,0.8vw,8px)' }}>
              <label style={{ fontSize:'clamp(12px,1.4vw,14px)', fontWeight:700, display:'block', marginBottom:5, color:C.text }}>
                WhatsApp <span style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:400, color:C.muted }}>(Optional / Opsional)</span>
              </label>
              <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
                <button type="button" onClick={() => setShowCP(true)}
                  style={{ display:'flex', alignItems:'center', gap:'clamp(4px,0.6vw,7px)', padding:'0 clamp(10px,1.4vw,14px)', borderRadius:10, border:`1.5px solid ${phone.trim().length > 0 ? C.topBg : C.border}`, background:C.white, cursor:'pointer', flexShrink:0, minHeight:'clamp(40px,5.2vh,48px)', transition:'border-color 0.15s, background 0.12s', whiteSpace:'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface}
                  onMouseLeave={e => e.currentTarget.style.background = C.white}>
                  <img src={`https://flagcdn.com/w40/${country.abbr.toLowerCase()}.png`} alt={country.abbr} width={24} height={17} style={{ borderRadius:2, objectFit:'cover', border:'1px solid #e0e0e0' }} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(12px,1.4vw,14px)', fontWeight:700, color:C.text }}>{country.code}</span>
                  <span style={{ fontSize:'clamp(9px,1vw,10px)', color:C.muted, marginLeft:1 }}>▾</span>
                </button>
                <input ref={phoneRef} value={phone} type="tel" autoComplete="off" readOnly
                  placeholder="812 3456 7890"
                  style={{ flex:1, minWidth:0, padding:'clamp(10px,1.3vh,13px) 14px', borderRadius:10, border:`1.5px solid ${activeField === 'phone' ? C.topBg : phone.trim().length > 0 ? C.topBg : C.border}`, fontSize:'clamp(13px,1.5vw,15px)', background:activeField === 'phone' ? '#FFFDE7' : C.white, fontFamily:"'DM Sans',sans-serif", transition:'border-color 0.15s, background 0.15s', cursor:'pointer' }}
                  onClick={() => setActiveField('phone')}
                />
              </div>
            </div>

          </div>

          {/* Inline keyboards — part of left column flow */}
          {activeField === 'name' && (
            <InlineQwerty value={name} onChange={setName} onDone={() => setActiveField(null)} />
          )}
          {activeField === 'phone' && (
            <InlineNumpad value={phone} onChange={setPhone} country={country} onDone={() => setActiveField(null)} />
          )}

          {error && (
            <div style={{ padding:'clamp(8px,1vw,11px)', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA', color:C.danger, fontSize:'clamp(12px,1.4vw,13px)' }}>{error}</div>
          )}

          <button className="btnP" disabled={!valid || loading} onClick={handleConfirm}
            style={{ fontSize:'clamp(14px,1.6vw,16px)', padding:'clamp(10px,1.4vh,13px)' }}>
            {loading ? 'Confirming…' : valid ? 'Confirm Reservation ✓' : 'Enter your name to continue'}
          </button>
          <button className="btnG" onClick={onBack} style={{ width:'100%', minHeight:40, padding:'8px 20px' }}>← Back / Kembali</button>
        </div>

        {/* RIGHT — order summary */}
        <div>
          <div className="fu" style={{ animationDelay:'0.08s', background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'clamp(8px,1.2vw,12px)' }}>
            <div style={{ fontSize:'clamp(10px,1.1vw,11px)', fontWeight:700, letterSpacing:'0.12em', color:C.muted, textTransform:'uppercase', marginBottom:6 }}>Order Summary · Ringkasan</div>

            {/* Loyalty state — lives here so it never shifts the keyboard */}
            {customer && points > 0 && (
              <div className="fi" style={{ background:'#f0faf0', border:'1.5px solid #a8d5a8', borderRadius:10, padding:'clamp(6px,0.8vw,9px)', display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:18 }}>⭐</span>
                <div>
                  <div style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:'#1a7a1a' }}>Welcome back, {customer.name}! · Selamat datang kembali!</div>
                  <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#2e7d32' }}>You have <strong>{points} points</strong> — tap a service below to redeem · Tekan layanan untuk gunakan poin</div>
                </div>
              </div>
            )}
            {customer && points === 0 && (
              <div className="fi" style={{ background:C.surface, borderRadius:10, padding:'clamp(6px,0.8vw,9px)', marginBottom:8 }}>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted }}>⭐ Welcome back, {customer.name}! You have 0 points. Earn points today. · Kamu belum punya poin.</div>
              </div>
            )}
            {!customer && !phone.trim() && (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'clamp(6px,0.8vw,9px) clamp(10px,1.4vw,14px)', display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:14 }}>⭐</span>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.text2 }}>
                  Have points? Enter your WhatsApp number to redeem. <span style={{ color:C.muted }}>· Punya poin? Masukkan nomor WhatsApp.</span>
                </div>
              </div>
            )}

            {/* Services with per-service points toggle */}
            {selectedServices.map(svc => {
              const isToggled = pointsToggled.has(svc.id)
              const cost      = ptCost(svc)
              const canToggle = canRedeem && (isToggled || pointsRemaining >= cost)
              const price     = parseFloat(svc.price ?? svc.base_price ?? 0)
              return (
                <div key={svc.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(5px,0.8vh,8px) 0', borderBottom:`1px solid ${C.border}`, gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'clamp(12px,1.4vw,14px)', fontWeight:600 }}>{svc.name}</div>
                    <div style={{ fontSize:'clamp(9px,1.1vw,11px)', color:C.muted }}>
                      {svc.name_id || ''}{svc.name_id ? ' · ' : ''}{svc.duration_min || svc.duration_minutes || 30} min
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    {canRedeem && (
                      <button onClick={() => togglePoints(svc.id)}
                        style={{ padding:'4px 8px', borderRadius:999, fontSize:'clamp(9px,1vw,10px)', fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:canToggle ? 'pointer' : 'not-allowed', border:`1.5px solid ${isToggled ? C.topBg : C.border}`, background:isToggled ? C.topBg : C.white, color:isToggled ? C.white : canToggle ? C.text2 : C.muted, transition:'all 0.15s', opacity:canToggle ? 1 : 0.45 }}>
                        {isToggled ? `✓ ${cost} pts` : `${cost} pts`}
                      </button>
                    )}
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,17px)', fontWeight:700, textDecoration:isToggled ? 'line-through' : 'none', color:isToggled ? C.muted : C.text }}>
                      {fmt(price)}
                    </div>
                    {isToggled && (
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:'#1a7a1a' }}>Free</div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Extras */}
            {selectedExtrasItems.map(item => (
              <div key={item.stock_id || item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(4px,0.7vh,7px) 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.text2 }}>{item.name}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(12px,1.4vw,14px)', fontWeight:600 }}>{fmt(item.price)}</div>
              </div>
            ))}

            {/* Booking meta */}
            {[
              ['Barber', `${barber?.name}${barber?.source === 'any_available' ? ' (Any)' : ''}`],
              ['Time / Waktu', slot === 'Now' ? 'Now ⚡' : slot],
              ['Duration / Durasi', `${totalDur} min`],
            ].map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'clamp(4px,0.7vh,7px) 0', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted }}>{k}</span>
                <span style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:600 }}>{v}</span>
              </div>
            ))}

            {/* Points deduction row */}
            {pointsUsed > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(6px,0.9vh,9px) 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:13 }}>⭐</span>
                  <div>
                    <div style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:'#1a7a1a' }}>Points Applied · Poin Digunakan</div>
                    <div style={{ fontSize:'clamp(9px,1.1vw,11px)', color:C.muted }}>{pointsUsed} pts used · {pointsRemaining} pts remaining</div>
                  </div>
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,16px)', fontWeight:700, color:'#1a7a1a' }}>−{fmt(pointsDiscount)}</div>
              </div>
            )}

            {/* Total */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:10, marginBottom:8 }}>
              <div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,17px)', fontWeight:800 }}>{pointsUsed > 0 ? 'CASH TOTAL' : 'TOTAL'}</div>
                {pointsUsed > 0 && <div style={{ fontSize:'clamp(9px,1.1vw,11px)', color:C.muted }}>Bayar Tunai</div>}
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,26px)', fontWeight:800 }}>
                {cashTotal === 0 ? <span style={{ color:'#1a7a1a' }}>Rp 0</span> : fmt(cashTotal)}
              </span>
            </div>

            {/* Payment note */}
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
              <span style={{ fontSize:14, flexShrink:0 }}>{cashTotal === 0 ? '⭐' : '💳'}</span>
              <div>
                {cashTotal === 0
                  ? <div style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:'#1a7a1a' }}>Fully covered by points! · Dibayar penuh dengan poin</div>
                  : <>
                      <div style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:C.text }}>Pay after service · Bayar setelah selesai</div>
                      <div style={{ fontSize:'clamp(9px,1.1vw,11px)', color:C.muted }}>Xendit Terminal (QRIS / Card) — at the kiosk when done</div>
                    </>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

    </div>
  )
}
