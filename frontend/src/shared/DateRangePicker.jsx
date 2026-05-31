import { useState } from 'react'
import { tokens as T } from './tokens.js'

export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function fmtDate(s) {
  if (!s) return '—'
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return s
  return `${MONTH_NAMES[parseInt(m[2])-1]} ${parseInt(m[3])} ${m[1]}`
}

// ── DateRangePicker ───────────────────────────────────────────────────────────

export default function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen]           = useState(false)
  const [hover, setHover]         = useState(null)
  const [phase, setPhase]         = useState('idle')       // 'idle' | 'selecting'
  const [rangeStart, setRangeStart] = useState(null)
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const rightMonth = viewMonth === 11 ? 0            : viewMonth + 1
  const rightYear  = viewMonth === 11 ? viewYear + 1 : viewYear

  function prev() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) } else setViewMonth(m => m-1) }
  function next() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) } else setViewMonth(m => m+1) }

  function closeAndReset() {
    setOpen(false)
    setPhase('idle')
    setRangeStart(null)
    setHover(null)
  }

  function handleDay(iso) {
    if (phase === 'idle') {
      // First click: immediately fire single-day selection, enter selecting phase
      setRangeStart(iso)
      setPhase('selecting')
      onChange(iso, iso)
    } else {
      // Second click
      if (iso > rangeStart) {
        // Extend range
        onChange(rangeStart, iso)
        closeAndReset()
      } else {
        // Reset: restart with new anchor
        setRangeStart(iso)
        onChange(iso, iso)
        // Stay in 'selecting' phase, don't close
      }
    }
  }

  function handleOpenToggle() {
    const next = !open
    setOpen(next)
    if (!next) {
      // Picker closing
      setPhase('idle')
      setRangeStart(null)
      setHover(null)
    } else {
      // Picker opening: if there's already a complete range selected, start fresh
      setPhase('idle')
      setRangeStart(null)
      setHover(null)
    }
  }

  function renderMonth(year, month, showPrev, showNext) {
    const firstDow = new Date(year, month, 1).getDay()
    const daysInM  = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInM; d++) cells.push(`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
    while (cells.length % 7 !== 0) cells.push(null)

    // Use rangeStart for phase=selecting, else from for display
    const displayFrom = phase === 'selecting' ? rangeStart : from
    const displayTo   = phase === 'selecting' ? (hover && hover >= rangeStart ? hover : (to && to !== from ? to : null)) : to

    const hoverEnd    = phase === 'selecting' && rangeStart && hover && hover >= rangeStart ? hover : null
    const effectiveTo = displayTo || hoverEnd

    return (
      <div style={{ width: 216 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {showPrev ? <button onClick={prev}  style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: T.surface, color: T.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button> : <div style={{ width: 26 }} />}
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{MONTH_NAMES[month]} {year}</div>
          {showNext ? <button onClick={next} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: T.surface, color: T.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button> : <div style={{ width: 26 }} />}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontSize: 9, fontWeight: 700, color: T.muted, textAlign: 'center', padding: '2px 0', textTransform: 'uppercase' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {cells.map((iso, idx) => {
            if (!iso) return <div key={`e${idx}`} />
            const isStart = iso === displayFrom, isEnd = iso === effectiveTo
            const inRange = !!displayFrom && !!effectiveTo && iso > displayFrom && iso < effectiveTo
            const isTod   = iso === todayISO()
            const active  = isStart || isEnd
            const isHoverEnd = iso === hoverEnd
            const bg  = active ? T.topBg : isHoverEnd ? 'rgba(17,17,16,0.2)' : inRange ? '#F5E20055' : 'transparent'
            const clr = active || isHoverEnd ? '#fff' : T.text
            return (
              <div key={iso} onClick={() => handleDay(iso)}
                onMouseEnter={() => { if (phase === 'selecting') setHover(iso) }}
                onMouseLeave={() => { if (phase === 'selecting') setHover(null) }}
                style={{ textAlign: 'center', padding: '6px 2px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : isTod ? 600 : 400, background: bg, color: clr, outline: isTod && !active ? '1.5px solid ' + T.border : 'none', outlineOffset: -1, transition: 'background 0.08s', userSelect: 'none' }}>
                {parseInt(iso.split('-')[2])}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const label = from && to ? `${fmtDate(from)}  –  ${fmtDate(to)}` : from ? `From ${fmtDate(from)}` : 'Pick range'

  return (
    <div style={{ position: 'relative' }}>
      {open && <div onClick={closeAndReset} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />}
      <button onClick={handleOpenToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid ' + (from || to ? T.topBg : T.border), background: from || to ? 'rgba(17,17,16,0.06)' : T.white, color: from || to ? T.topBg : T.text, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: from || to ? 600 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
        <span style={{ fontSize: 12 }}>📅</span>
        <span>{label}</span>
        {(from || to) && (
          <span onClick={e => { e.stopPropagation(); onChange(null, null); setPhase('idle'); setRangeStart(null) }}
            style={{ marginLeft: 2, width: 15, height: 15, borderRadius: 3, background: T.surface2, color: T.muted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>✕</span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, background: T.white, borderRadius: 12, border: '1px solid ' + T.border, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '18px 20px', minWidth: 'fit-content' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            {renderMonth(viewYear, viewMonth, true, false)}
            <div style={{ width: 1, background: T.surface, alignSelf: 'stretch' }} />
            {renderMonth(rightYear, rightMonth, false, true)}
          </div>
          {phase === 'selecting' && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + T.surface, textAlign: 'center', fontSize: 11, color: T.muted }}>
              Click another date to extend to a range
            </div>
          )}
          {phase === 'idle' && from && to && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + T.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(from)} – {fmtDate(to)}</span>
              <button onClick={() => { onChange(null, null); setPhase('idle'); setRangeStart(null) }} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: T.surface, color: T.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
            </div>
          )}
          {phase === 'idle' && !from && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + T.surface, textAlign: 'center', fontSize: 11, color: T.muted }}>Click a date to select · click another to set a range</div>
          )}
        </div>
      )}
    </div>
  )
}
