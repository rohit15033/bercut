import { useEffect, useRef, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')
const OVERLAP_MIN = 15  // customers can wait up to 15 min for next booking

export default function TimeSlot({ barber, branchId, serviceIds, setServiceIds, services, menuItems, slot, setSlot, selectedExtras, setSelectedExtras, onNext, onBack }) {
  const [slots, setSlots]               = useState([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [nowWindow, setNowWindow]       = useState(null)
  const [nowPickerOpen, setNowPickerOpen] = useState(false)
  const originalCartRef = useRef(serviceIds)

  const today   = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', timeZone:'Asia/Makassar' })
  const dateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' })

  const totalDur = serviceIds.reduce((s, id) => {
    const svc = services.find(x => x.id === id)
    return s + (svc?.duration_minutes || svc?.duration_min || 30)
  }, 0)

  const isAnyAvailable = barber?.source === 'any_available'

  useEffect(() => {
    setLoadingSlots(true)
    setNowWindow(null)
    const url = isAnyAvailable
      ? `/slots/any-available?branch_id=${branchId}&date=${dateStr}&duration_min=${totalDur}&walkin=true`
      : barber?.id ? `/slots?barber_id=${barber.id}&date=${dateStr}&duration_min=${totalDur}&walkin=true` : null
    if (!url) { setSlots([]); setLoadingSlots(false); return }
    kioskApi.get(url)
      .then(data => setSlots(Array.isArray(data) ? data : (data.slots || [])))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [isAnyAvailable, barber?.id, branchId, dateStr, totalDur]) // eslint-disable-line react-hooks/exhaustive-deps

  const nowWitaStr = (() => {
    const d = new Date()
    const witaMs = d.getTime() + (d.getTimezoneOffset() * 60000) + (8 * 3600000)
    const w = new Date(witaMs)
    return w.getHours().toString().padStart(2, '0') + ':' + w.getMinutes().toString().padStart(2, '0')
  })()
  const nowMin = (() => { const [h, m] = nowWitaStr.split(':').map(Number); return h * 60 + m })()

  const firstSlotMin = slots.length > 0 ? (() => { const [h, m] = slots[0].split(':').map(Number); return h * 60 + m })() : null
  const barberAvailableNow = !['clocked_out', 'off', 'on_break', 'busy', 'in_service'].includes(barber?.status)
  const canNowFromSlots = barberAvailableNow && firstSlotMin !== null && firstSlotMin <= nowMin + 4

  // Determine if we can book NOW:
  // - canNowFromSlots: a slot exists in the next 4 minutes
  // - nowWindowFitsAll: total duration fits within the max available window
  const nowWindowFitsAll = nowWindow?.freeNow && nowWindow?.windowMin >= totalDur
  const canNow = canNowFromSlots || nowWindowFitsAll
  const nextSlot = !canNow && slots.length > 0 ? slots[0] : null

  // showNowPicker: user can't book NOW, but could if they pick shorter services
  const maxWindow = nowWindow?.windowMin ?? 0
  const barberWindows = nowWindow?.barberWindows ?? {}
  const showNowPicker = !canNow && nowWindow?.freeNow && maxWindow > 0 && totalDur > maxWindow && totalDur <= 500

  useEffect(() => {
    if (!canNow && slot === 'Now') setSlot(null)
  }, [canNow, slot, setSlot])

  useEffect(() => {
    if (loadingSlots || canNowFromSlots) { setNowWindow(null); return }
    const url = isAnyAvailable
      ? `/slots/now-window?branch_id=${branchId}&date=${dateStr}`
      : barber?.id ? `/slots/now-window?barber_id=${barber.id}&date=${dateStr}` : null
    if (!url) { setNowWindow(null); return }
    kioskApi.get(url)
      .then(w => setNowWindow(w))
      .catch(() => setNowWindow(null))
  }, [loadingSlots, canNowFromSlots, isAnyAvailable, barber?.id, branchId, dateStr]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickGridSlot = (s) => {
    if (slot === 'Now') setServiceIds(originalCartRef.current)
    setSlot(s)
  }

  const confirmNow = (selectedIds) => {
    if (!selectedIds.length) return
    setServiceIds(selectedIds)
    setSlot('Now')
    onNext()
  }

  const beverages = menuItems.filter(m => m.category === 'beverage' || m.category === 'Beverage')
  const products  = menuItems.filter(m => m.category === 'product'  || m.category === 'Product')

  const toggleExtra = id => {
    setSelectedExtras(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const extrasTotal = selectedExtras.reduce((s, id) => {
    const item = menuItems.find(x => (x.stock_id || x.id) === id)
    return s + parseFloat(item?.price || 0)
  }, 0)

  const ItemCard = ({ item, compact = false }) => {
    const itemId = item.stock_id || item.id
    const sel = selectedExtras.includes(itemId)
    const oos = item.qty <= 0

    if (compact) return (
      <div onClick={() => !oos && toggleExtra(itemId)}
        style={{ position:'relative', flex:'1 1 0', minWidth:0, background: sel ? C.topBg : C.white, border:`2px solid ${sel ? C.topBg : C.border}`, borderRadius:10, padding:'clamp(7px,1vw,10px) clamp(6px,0.8vw,10px)', cursor:oos ? 'not-allowed' : 'pointer', textAlign:'center', transition:'all 0.15s', opacity:oos ? 0.5 : 1 }}>
        {sel && <div style={{ position:'absolute', top:4, right:4, width:14, height:14, borderRadius:'50%', background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:C.accentText }}>✓</div>}
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, color: sel ? C.white : C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(10px,1.1vw,11px)', fontWeight:700, color: sel ? 'rgba(255,255,255,0.75)' : C.muted, marginTop:2 }}>{fmt(item.price)}</div>
      </div>
    )

    return (
      <div onClick={() => !oos && toggleExtra(itemId)}
        style={{ position:'relative', background:oos ? C.surface2 : sel ? C.topBg : C.white, border:`2px solid ${oos ? C.border : sel ? C.topBg : C.border}`, borderRadius:12, padding:'clamp(12px,1.6vw,16px)', cursor:oos ? 'not-allowed' : 'pointer', textAlign:'center', transition:'all 0.15s', minHeight:80, opacity:oos ? 0.65 : 1 }}>
        {oos && (
          <div style={{ position:'absolute', top:6, right:6, background:C.danger, color:C.white, fontSize:'clamp(8px,1vw,10px)', fontWeight:700, padding:'1px 7px', borderRadius:4 }}>HABIS</div>
        )}
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(12px,1.4vw,14px)', fontWeight:700, color:oos ? C.muted : sel ? C.white : C.text, marginBottom:4 }}>{item.name}</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(12px,1.4vw,14px)', fontWeight:700, color:oos ? C.muted : sel ? C.topText : C.text }}>{fmt(item.price)}</div>
      </div>
    )
  }

  const hasAddons = beverages.length > 0 || products.length > 0

  return (
    <div style={{ height:'calc(100vh - clamp(51px,6.5vh,63px))', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Scrollable content */}
      <div className="scroll-y" style={{ flex:1, padding:'clamp(16px,2.4vw,28px)', paddingBottom:'clamp(12px,1.6vw,16px)' }}>
        <div className="step-header fu">
          <div className="step-eyebrow">Step 3 of 4 · Pick Time</div>
          <h2 className="step-title">When Do You Want Your Cut?</h2>
          <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.muted, marginTop:4 }}>{isAnyAvailable ? 'Any Available' : barber?.name} · {today} · Kapan Anda ingin dipotong?</div>
        </div>

        {/* Slot grid */}
        <div className="fu" style={{ animationDelay:'0.05s', marginBottom:'clamp(10px,1.4vw,14px)' }}>
          {loadingSlots
            ? <div style={{ color:C.muted, fontSize:'clamp(13px,1.5vw,15px)', padding:16 }}>Loading slots…</div>
            : (
              <div className="slot-grid">
                <button
                  data-testid="now-btn"
                  onClick={() => {
                    if (canNow) setSlot('Now')
                    else if (showNowPicker) setNowPickerOpen(true)
                  }}
                  style={{
                    padding:'clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)', borderRadius:12,
                    fontSize:'clamp(15px,2vw,20px)', fontFamily:"'Inter',sans-serif", fontWeight:700,
                    background: slot === 'Now' ? C.topBg : canNow ? C.white : C.surface2,
                    color: slot === 'Now' ? C.white : canNow ? C.text : C.muted,
                    border: `2px solid ${slot === 'Now' ? C.topBg : C.border}`,
                    transition:'all 0.15s', minWidth:'clamp(80px,10vw,110px)', minHeight:'clamp(52px,7vh,64px)',
                    cursor: (canNow || showNowPicker) ? 'pointer' : 'not-allowed',
                    opacity: (canNow || showNowPicker) ? 1 : 0.55,
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2
                  }}>
                  <span>Now ⚡</span>
                  <span style={{ fontSize:'clamp(9px,1.1vw,11px)', fontWeight:400, color: slot === 'Now' ? 'rgba(255,255,255,0.7)' : showNowPicker ? C.text2 : C.muted }}>
                    {canNow ? nowWitaStr : showNowPicker ? 'Adjust services →' : isAnyAvailable ? 'No one free now' : barber?.status === 'on_break' ? 'On Break' : 'Busy'}
                  </span>
                </button>

                {!canNow && nextSlot && (
                  <button onClick={() => pickGridSlot(nextSlot)}
                    style={{ padding:'clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)', borderRadius:12, fontSize:'clamp(15px,2vw,20px)', fontFamily:"'Inter',sans-serif", fontWeight:700, background:slot === nextSlot ? C.topBg : C.white, color:slot === nextSlot ? C.white : C.text, border:`2px solid ${slot === nextSlot ? C.topBg : C.border}`, transition:'all 0.15s', minWidth:'clamp(80px,10vw,110px)', minHeight:'clamp(52px,7vh,64px)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
                    <span>Next →</span>
                    <span style={{ fontSize:'clamp(9px,1.1vw,11px)', fontWeight:400, color:slot === nextSlot ? 'rgba(255,255,255,0.7)' : C.muted }}>{nextSlot}</span>
                  </button>
                )}

                {slots.map((s, i) => (
                  <button key={s} data-testid={`slot-${s}`} onClick={() => setSlot(s)}
                    style={{ padding:'clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)', borderRadius:12, fontSize:'clamp(15px,2vw,20px)', fontFamily:"'Inter',sans-serif", fontWeight:700, background:slot === s ? C.topBg : C.white, color:slot === s ? C.white : C.text, border:`2px solid ${slot === s ? C.topBg : C.border}`, transition:'all 0.15s', minWidth:'clamp(80px,10vw,110px)', minHeight:'clamp(52px,7vh,64px)', animation:`fadeUp 0.28s ease ${i * 0.04}s both` }}>
                    {s}
                  </button>
                ))}
                {!loadingSlots && slots.length === 0 && (
                  <div style={{ color:C.muted, fontSize:'clamp(12px,1.4vw,14px)', padding:'16px 0' }}>
                    No available slots today. Try a different barber.
                  </div>
                )}
              </div>
            )
          }
        </div>

        {/* Selected slot bar — beverages inline, products below */}
        {slot && (
          <div className="si">
            {/* Single bar: slot info + beverages in one line */}
            <div style={{ background:C.accent, borderRadius: products.length > 0 ? '14px 14px 0 0' : 14, padding:'clamp(7px,1vw,10px) clamp(12px,1.6vw,18px)', display:'flex', alignItems:'center', gap:'clamp(8px,1.2vw,14px)' }}>
              {/* Slot info */}
              <div style={{ display:'flex', alignItems:'center', gap:'clamp(8px,1.2vw,12px)', flexShrink:0 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,26px)', fontWeight:800, color:C.accentText }}>✓</span>
                <div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,19px)', fontWeight:700, color:C.accentText, lineHeight:1.1 }}>Selected: {slot}</div>
                  <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#1a1a1899', marginTop:2 }}>{barber?.name} · {today}</div>
                </div>
              </div>

              {/* Beverages — horizontal strip */}
              {beverages.length > 0 && (
                <>
                  <div style={{ width:'1.5px', alignSelf:'stretch', background:'rgba(0,0,0,0.12)', flexShrink:0 }} />
                  <div style={{ display:'flex', gap:'clamp(6px,0.9vw,10px)', flex:1, overflow:'hidden' }}>
                    {beverages.map(b => <ItemCard key={b.stock_id || b.id} item={b} compact />)}
                  </div>
                </>
              )}

              {/* Add-ons total */}
              {extrasTotal > 0 && (
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:'auto' }}>
                  <div style={{ fontSize:'clamp(9px,1vw,10px)', color:'#5a4a00', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Add-ons</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,16px)', fontWeight:800, color:C.accentText }}>+{fmt(extrasTotal)}</div>
                </div>
              )}
            </div>

            {/* Products row — below the bar */}
            {products.length > 0 && (
              <div style={{ background:C.surface, borderRadius:'0 0 14px 14px', padding:'clamp(6px,0.9vw,9px) clamp(12px,1.6vw,18px)', borderTop:`1.5px solid ${C.border}`, display:'flex', alignItems:'center', gap:'clamp(8px,1.2vw,12px)' }}>
                <span style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, color:C.text2, flexShrink:0 }}>🧴 Produk</span>
                <div style={{ width:'1.5px', alignSelf:'stretch', background:C.border, flexShrink:0 }} />
                <div style={{ display:'flex', gap:'clamp(6px,0.9vw,10px)', flex:1, overflow:'hidden' }}>
                  {products.map(p => <ItemCard key={p.stock_id || p.id} item={p} compact />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div style={{ flexShrink:0, padding:'clamp(10px,1.4vw,14px) clamp(16px,2.4vw,28px)', borderTop:`1.5px solid ${C.border}`, background:C.bg, display:'flex', gap:'clamp(8px,1.2vw,14px)', alignItems:'center' }}>
        <button className="btnG" onClick={onBack} style={{ width:'clamp(120px,16vw,180px)', flexShrink:0 }}>← Back</button>
        <button data-testid="timeslot-continue-btn" className="btnP" disabled={!slot} onClick={onNext} style={{ flex:1 }}>
          {slot ? 'Continue →' : 'Pick a time first'}
        </button>
      </div>

      {nowPickerOpen && showNowPicker && (
        <NowPickerModal
          windowMin={nowWindow.windowMin}
          maxWindow={maxWindow}
          barberWindows={barberWindows}
          nextSlot={nextSlot}
          originalServices={originalCartRef.current.map(id => services.find(x => x.id === id)).filter(Boolean)}
          allServices={services}
          onConfirm={confirmNow}
          onClose={() => setNowPickerOpen(false)}
        />
      )}
    </div>
  )
}

// ── Now Picker Modal ────────────────────────────────────────────────────────────
const NOW_CATS = [
  { key: 'Haircut',   icon: '✂',  label: 'Haircut'    },
  { key: 'Beard',     icon: '🪒', label: 'Beard'      },
  { key: 'Treatment', icon: '✨', label: 'Treatments' },
  { key: 'HairColor', icon: '🎨', label: 'Hair Color' },
  { key: 'Package',   icon: '📦', label: 'Packages'   },
]
const normCat = cat => {
  const m = { haircut:'Haircut', beard:'Beard', treatment:'Treatment', hair_color:'HairColor', package:'Package' }
  return m[cat?.toLowerCase?.()] || cat || 'Haircut'
}
const normSvc = s => ({
  ...s,
  cat:    normCat(s.category || s.cat),
  dur:    s.duration_minutes || s.dur || 30,
  img:    s.image_url || s.img || null,
  price:  parseFloat(s.price ?? s.base_price ?? 0),
  nameId: s.name_id || s.nameId || '',
})

function NowPickerModal({ windowMin, maxWindow, barberWindows, nextSlot, originalServices = [], allServices = [], onConfirm, onClose, isBlocked, totalDur }) {
  const [currentServices, setCurrentServices] = useState(originalServices)
  const [checkedIds, setCheckedIds]           = useState(new Set(originalServices.map(s => s.id)))
  const [changingId, setChangingId]           = useState(null)

  const getDur = s => s.duration_minutes || s.duration_min || 30

  const checkedDur = currentServices
    .filter(s => checkedIds.has(s.id))
    .reduce((sum, s) => sum + getDur(s), 0)

  const overflowMin = checkedDur - maxWindow
  const fits        = checkedDur <= maxWindow && checkedIds.size > 0
  const pct         = maxWindow > 0 ? Math.round((checkedDur / maxWindow) * 100) : 100

  const toggleCheck = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const swapService = (newSvc) => {
    setCurrentServices(prev => prev.map(s => s.id === changingId ? newSvc : s))
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.delete(changingId)
      next.add(newSvc.id)
      return next
    })
    setChangingId(null)
  }

  const pickerSvcs = allServices
    .filter(s => getDur(s) <= maxWindow && (s.id === changingId || !currentServices.some(c => c.id === s.id)))
    .map(normSvc)
  const catsPresent = NOW_CATS.filter(c => pickerSvcs.some(s => s.cat === c.key))

  const renderPickerCard = (s) => {
    const onTap = () => swapService(allServices.find(x => x.id === s.id) || s)
    if (s.cat === 'Package') return (
      <div key={s.id} onClick={onTap}
        style={{ position:'relative', background:C.topBg, borderRadius:14, overflow:'hidden', border:'1.5px solid rgba(255,255,255,0.08)', display:'flex', height:'clamp(130px,16vw,170px)', cursor:'pointer' }}>
        <div style={{ flex:1, padding:'clamp(10px,1.4vw,14px) clamp(12px,1.6vw,18px)', display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.7vw,17px)', fontWeight:800, color:C.white, lineHeight:1.1 }}>{s.name}</div>
          {s.nameId && <div style={{ fontSize:'clamp(10px,1.1vw,12px)', color:'rgba(255,255,255,0.45)', marginTop:2 }}>{s.nameId}</div>}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'clamp(6px,0.8vw,10px)' }}>
            <span style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'rgba(255,255,255,0.4)' }}>⏱ {s.dur} min</span>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,20px)', fontWeight:800, color:C.white }}>{fmt(s.price)}</span>
          </div>
        </div>
      </div>
    )
    if (s.img) return (
      <div key={s.id} onClick={onTap}
        style={{ position:'relative', borderRadius:14, overflow:'hidden', height:'clamp(130px,16vw,170px)', border:'1.5px solid transparent', cursor:'pointer' }}>
        <img src={s.img} alt={s.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.18) 55%,transparent 100%)' }} />
        <div style={{ position:'relative', zIndex:2, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'clamp(10px,1.4vw,12px)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <div style={{ flex:1, paddingRight:8 }}>
              <div style={{ fontWeight:700, fontSize:'clamp(12px,1.5vw,14px)', lineHeight:1.2, color:'#fff' }}>{s.name}</div>
              <div style={{ fontSize:'clamp(10px,1.1vw,11px)', color:'rgba(255,255,255,0.65)', marginTop:2 }}>⏱ {s.dur} min</div>
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:'clamp(12px,1.5vw,15px)', color:'#fff', flexShrink:0 }}>{fmt(s.price)}</span>
          </div>
        </div>
      </div>
    )
    return (
      <div key={s.id} onClick={onTap}
        style={{ position:'relative', background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'clamp(12px,1.6vw,16px)', cursor:'pointer', transition:'all 0.15s', minHeight:'clamp(80px,10vh,96px)', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'clamp(12px,1.5vw,14px)', color:C.text }}>{s.name}</div>
          {s.nameId && <div style={{ fontSize:'clamp(10px,1.1vw,11px)', color:C.muted, marginTop:2 }}>{s.nameId}</div>}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
          <span style={{ fontSize:'clamp(10px,1.2vw,11px)', color:C.muted }}>⏱ {s.dur} min</span>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,16px)', fontWeight:800, color:C.text }}>{fmt(s.price)}</span>
        </div>
      </div>
    )
  }

  const checkedPrice = currentServices
    .filter(s => checkedIds.has(s.id))
    .reduce((sum, s) => sum + parseFloat(s.price ?? s.base_price ?? 0), 0)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(16px,3vw,32px)' }}
      onClick={changingId ? () => setChangingId(null) : onClose}>
      <div style={{ background:C.white, borderRadius:20, width:'100%', maxWidth: changingId ? 'clamp(400px,64vw,740px)' : 'clamp(360px,44vw,520px)', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', transition:'max-width 0.2s' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:C.topBg, padding:'clamp(14px,1.8vw,20px) clamp(20px,2.6vw,28px)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:'clamp(16px,2.1vw,22px)', color:C.topText }}>
                {changingId ? '↔ Change Service' : 'Change to a shorter service to book now'}
              </div>
              <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#aaa', marginTop:4 }}>
                {changingId
                  ? `Pick a replacement · must fit in ${windowMin} min`
                  : fits
                    ? `${checkedDur} min · Ready to go`
                    : `${overflowMin} min over limit · uncheck or change services`}
              </div>
            </div>
            <button
              onClick={changingId ? () => setChangingId(null) : onClose}
              style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:8, width:34, height:34, fontSize:18, cursor:'pointer', color:'#aaa', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:12 }}>
              {changingId ? '←' : '✕'}
            </button>
          </div>

          {!changingId && (
            <>
              <div style={{ background:'rgba(255,255,255,0.12)', borderRadius:999, height:8, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(pct, 100)}%`, background: fits ? C.accent : C.danger, borderRadius:999, transition:'width 0.2s' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                <div style={{ fontSize:'clamp(10px,1.1vw,12px)', color: fits ? '#888' : C.danger, fontWeight: fits ? 400 : 700 }}>
                  {checkedDur} / {maxWindow} min
                </div>
                <div style={{ fontSize:'clamp(10px,1.1vw,12px)', color: fits ? '#888' : C.danger }}>
                  {fits ? `${maxWindow - checkedDur} min free` : `−${overflowMin} min to go`}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Body */}
        <div className="scroll-y" style={{ flex:1, padding:'clamp(14px,2vw,20px) clamp(16px,2.4vw,24px)' }}>

          {!changingId && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {currentServices.map(s => {
                const dur     = getDur(s)
                const checked = checkedIds.has(s.id)
                return (
                  <div key={s.id}
                    data-testid={`nowpicker-service-${s.id}`}
                    onClick={() => toggleCheck(s.id)}
                    style={{ display:'flex', alignItems:'center', gap:12, background: checked ? C.white : C.surface, border:`1.5px solid ${checked ? C.border : 'transparent'}`, borderRadius:12, padding:'clamp(10px,1.4vw,14px) clamp(12px,1.6vw,16px)', cursor:'pointer', opacity: checked ? 1 : 0.5, transition:'all 0.15s' }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background: checked ? C.accent : 'transparent', border:`2px solid ${checked ? C.accent : C.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                      {checked && <span style={{ fontSize:12, fontWeight:800, color:C.accentText }}>✓</span>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:C.text }}>{s.name}</div>
                      <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted, marginTop:2 }}>{dur} min · {fmt(parseFloat(s.price ?? s.base_price ?? 0))}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setChangingId(s.id) }}
                      style={{ background:'transparent', border:`1.5px solid ${C.border}`, borderRadius:8, color:C.text2, fontFamily:"'Inter',sans-serif", fontSize:'clamp(11px,1.3vw,13px)', fontWeight:600, padding:'clamp(6px,0.9vh,8px) clamp(10px,1.4vw,12px)', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
                      ↔ Change
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {changingId && (
            catsPresent.length === 0
              ? <div style={{ textAlign:'center', padding:'clamp(24px,4vh,40px) 0', color:C.muted, fontSize:'clamp(12px,1.4vw,14px)' }}>No other services fit in {windowMin} min.</div>
              : catsPresent.map(cat => {
                  const catSvcs = pickerSvcs.filter(s => s.cat === cat.key)
                  if (!catSvcs.length) return null
                  return (
                    <div key={cat.key} style={{ marginBottom:'clamp(18px,2.4vw,26px)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'clamp(8px,1.2vw,12px)' }}>
                        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,16px)', fontWeight:700, color:C.text }}>{cat.icon} {cat.label}</div>
                        <div style={{ flex:1, height:1, background:C.border }} />
                      </div>
                      <div style={ cat.key === 'Package'
                        ? { display:'flex', flexDirection:'column', gap:'clamp(10px,1.4vw,14px)' }
                        : { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(clamp(130px,16vw,190px),1fr))', gap:'clamp(8px,1.2vw,12px)' }
                      }>
                        {catSvcs.map(s => renderPickerCard(s))}
                      </div>
                    </div>
                  )
                })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'clamp(12px,1.6vw,16px) clamp(16px,2.4vw,24px)', borderTop:`1.5px solid ${C.border}`, display:'flex', gap:10, flexShrink:0, alignItems:'center' }}>
          {changingId
            ? <button className="btnG" onClick={() => setChangingId(null)} style={{ flex:1 }}>← Back to selection</button>
            : (
              <>
                <button className="btnG" onClick={onClose} style={{ flexShrink:0 }}>Cancel</button>
                {checkedIds.size > 0 && (
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(12px,1.4vw,14px)', fontWeight:700, color:C.text, flexShrink:0 }}>
                    {fmt(checkedPrice)}
                  </div>
                )}
                <button data-testid="nowpicker-confirm-btn" onClick={() => onConfirm([...checkedIds])} disabled={!fits} className="btnP" style={{ flex:1 }}>
                  {fits ? `Start Now → (${checkedDur} min)` : `${overflowMin} min over`}
                </button>
              </>
            )
          }
        </div>
      </div>
    </div>
  )
}
