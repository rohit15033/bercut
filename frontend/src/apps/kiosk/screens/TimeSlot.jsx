import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

export default function TimeSlot({ barber, branchId, serviceIds, services, menuItems, slot, setSlot, selectedExtras, setSelectedExtras, onNext, onBack }) {
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(true)

  const today = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', timeZone:'Asia/Makassar' })
  const dateStr = new Date().toISOString().slice(0, 10)

  const totalDur = serviceIds.reduce((s, id) => {
    const svc = services.find(x => x.id === id)
    return s + (svc?.duration_minutes || svc?.duration_min || 30)
  }, 0)

  const isAnyAvailable = barber?.source === 'any_available'

  useEffect(() => {
    setLoadingSlots(true)
    const url = isAnyAvailable
      ? `/slots/any-available?branch_id=${branchId}&date=${dateStr}&duration_min=${totalDur}`
      : barber?.id ? `/slots?barber_id=${barber.id}&date=${dateStr}&duration_min=${totalDur}` : null
    if (!url) { setSlots([]); setLoadingSlots(false); return }
    kioskApi.get(url)
      .then(data => {
        const parsedSlots = Array.isArray(data) ? data : (data.slots || [])
        // #region agent log
        fetch('http://127.0.0.1:7929/ingest/c67916ff-c4d9-4efd-b5ce-fcefcdb4f598',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'85c6ae'},body:JSON.stringify({sessionId:'85c6ae',runId:'initial',hypothesisId:'H4',location:'frontend/src/apps/kiosk/screens/TimeSlot.jsx:fetchSlots',message:'Fetched timeslot payload for UI',data:{isAnyAvailable,barberId:barber?.id||null,branchId,totalDur,slotCount:parsedSlots.length,firstThree:parsedSlots.slice(0,3)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setSlots(parsedSlots)
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [isAnyAvailable, barber?.id, branchId, dateStr, totalDur]) // eslint-disable-line react-hooks/exhaustive-deps

  const barberAvailable = isAnyAvailable ? slots.length > 0 : barber?.status === 'available'

  // Current WITA time as "HH:MM"
  const nowWitaStr = (() => {
    const d = new Date()
    const witaMs = d.getTime() + (d.getTimezoneOffset() * 60000) + (8 * 3600000)
    const w = new Date(witaMs)
    return w.getHours().toString().padStart(2, '0') + ':' + w.getMinutes().toString().padStart(2, '0')
  })()

  const nowMin = (() => {
    const [h, m] = nowWitaStr.split(':').map(Number)
    return h * 60 + m
  })()

  // "Now" is available if barber is active and current time + service duration
  // doesn't overlap any taken slot (first available slot is at or before now)
  const firstSlotMin = slots.length > 0 ? (() => { const [h, m] = slots[0].split(':').map(Number); return h * 60 + m })() : null
  const nowWindow = isAnyAvailable ? 4 : 30
  const canNow = barberAvailable && (firstSlotMin !== null && firstSlotMin <= nowMin + nowWindow)
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7929/ingest/c67916ff-c4d9-4efd-b5ce-fcefcdb4f598',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'85c6ae'},body:JSON.stringify({sessionId:'85c6ae',runId:'initial',hypothesisId:'H4',location:'frontend/src/apps/kiosk/screens/TimeSlot.jsx:canNow',message:'Computed canNow and first slot relationship',data:{isAnyAvailable,barberStatus:barber?.status||null,nowWitaStr,nowMin,firstSlot:slots[0]||null,firstSlotMin,nowWindow,canNow},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isAnyAvailable, barber?.status, nowWitaStr, nowMin, firstSlotMin, nowWindow, canNow, slots])

  // If barber busy but slots available, offer first slot as "Next"
  const nextSlot = !canNow && slots.length > 0 ? slots[0] : null

  useEffect(() => {
    if (!canNow && slot === 'Now') setSlot(null)
  }, [canNow, slot, setSlot])

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
                <button onClick={() => canNow && setSlot('Now')}
                  style={{
                    padding:'clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)', borderRadius:12,
                    fontSize:'clamp(15px,2vw,20px)', fontFamily:"'Inter',sans-serif", fontWeight:700,
                    background:slot === 'Now' ? C.topBg : canNow ? C.white : C.surface2,
                    color:slot === 'Now' ? C.white : canNow ? C.text : C.muted,
                    border:`2px solid ${slot === 'Now' ? C.topBg : C.border}`,
                    transition:'all 0.15s', minWidth:'clamp(80px,10vw,110px)', minHeight:'clamp(52px,7vh,64px)',
                    cursor: canNow ? 'pointer' : 'not-allowed', opacity: canNow ? 1 : 0.6,
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2
                  }}>
                  <span>Now ⚡</span>
                  <span style={{ fontSize:'clamp(9px,1.1vw,11px)', fontWeight:400, color:slot === 'Now' ? 'rgba(255,255,255,0.7)' : C.muted }}>
                    {canNow ? nowWitaStr : (isAnyAvailable ? 'No one free now' : barber?.status === 'on_break' ? 'On Break' : 'Busy')}
                  </span>
                </button>

                {!canNow && nextSlot && (
                  <button onClick={() => setSlot(nextSlot)}
                    style={{
                      padding:'clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)', borderRadius:12,
                      fontSize:'clamp(15px,2vw,20px)', fontFamily:"'Inter',sans-serif", fontWeight:700,
                      background:slot === nextSlot ? C.topBg : C.white,
                      color:slot === nextSlot ? C.white : C.text,
                      border:`2px solid ${slot === nextSlot ? C.topBg : C.border}`,
                      transition:'all 0.15s', minWidth:'clamp(80px,10vw,110px)', minHeight:'clamp(52px,7vh,64px)',
                      cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2
                    }}>
                    <span>Next →</span>
                    <span style={{ fontSize:'clamp(9px,1.1vw,11px)', fontWeight:400, color:slot === nextSlot ? 'rgba(255,255,255,0.7)' : C.muted }}>{nextSlot}</span>
                  </button>
                )}

                {slots.map((s, i) => (
                  <button key={s} onClick={() => setSlot(s)}
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
        <button className="btnP" disabled={!slot} onClick={onNext} style={{ flex:1 }}>
          {slot ? 'Continue →' : 'Pick a time first'}
        </button>
      </div>
    </div>
  )
}
