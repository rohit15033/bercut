import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

export default function TimeSlot({ barber, branchId, serviceIds, services, menuItems, slot, setSlot, selectedExtras, setSelectedExtras, onNext, onBack }) {
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(true)

  const today = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' })
  const dateStr = new Date().toISOString().slice(0, 10)

  const totalDur = serviceIds.reduce((s, id) => {
    const svc = services.find(x => x.id === id)
    return s + (svc?.duration_min || 30)
  }, 0)

  useEffect(() => {
    if (!barber || !barber.id) { setSlots([]); setLoadingSlots(false); return }
    setLoadingSlots(true)
    kioskApi.get(`/slots?barber_id=${barber.id}&date=${dateStr}&duration_min=${totalDur}`)
      .then(data => setSlots(Array.isArray(data) ? data : (data.slots || [])))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [barber?.id, dateStr, totalDur]) // eslint-disable-line react-hooks/exhaustive-deps

  const barberAvailable = barber?.status === 'active'
  const canNow = barberAvailable

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

  const ItemCard = ({ item }) => {
    const itemId = item.stock_id || item.id
    const sel = selectedExtras.includes(itemId)
    const oos = item.qty <= 0

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

  return (
    <div className="scroll-y" style={{ height:'calc(100vh - clamp(51px,6.5vh,63px))', padding:'clamp(16px,2.4vw,28px)' }}>
      <div className="step-header fu">
        <div className="step-eyebrow">Step 3 of 4 · Pick Time</div>
        <h2 className="step-title">When Do You Want Your Cut?</h2>
        <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.muted, marginTop:4 }}>{barber?.name} · {today} · Kapan Anda ingin dipotong?</div>
      </div>

      {/* Slot grid */}
      <div className="fu" style={{ animationDelay:'0.05s', marginBottom:'clamp(20px,3vw,32px)' }}>
        {loadingSlots
          ? <div style={{ color:C.muted, fontSize:'clamp(13px,1.5vw,15px)', padding:16 }}>Loading slots…</div>
          : (
            <div className="slot-grid">
              {/* Now */}
              <button onClick={() => canNow && setSlot('Now')}
                style={{ padding:'clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)', borderRadius:12, fontSize:'clamp(15px,2vw,20px)', fontFamily:"'Inter',sans-serif", fontWeight:700, background:slot === 'Now' ? C.topBg : canNow ? C.white : C.surface2, color:slot === 'Now' ? C.white : canNow ? C.text : C.muted, border:`2px solid ${slot === 'Now' ? C.topBg : canNow ? C.topBg : C.border}`, transition:'all 0.15s', minWidth:'clamp(80px,10vw,110px)', minHeight:'clamp(52px,7vh,64px)', cursor:canNow ? 'pointer' : 'not-allowed', opacity:canNow ? 1 : 0.6, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
                <span>Now ⚡</span>
                <span style={{ fontSize:'clamp(9px,1.1vw,11px)', fontWeight:400, color:slot === 'Now' ? 'rgba(255,255,255,0.7)' : C.muted }}>{canNow ? 'Langsung' : 'Unavailable'}</span>
              </button>

              {/* Time slots */}
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

      {/* Selected slot confirmation */}
      {slot && (
        <div className="si" style={{ background:C.accent, borderRadius:14, padding:'clamp(12px,1.8vw,16px) clamp(18px,2.4vw,24px)', marginBottom:'clamp(18px,2.4vw,24px)', display:'flex', alignItems:'center', gap:'clamp(10px,1.4vw,16px)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(20px,2.8vw,30px)', fontWeight:800, color:C.accentText }}>✓</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(15px,2vw,21px)', fontWeight:700, color:C.accentText }}>Selected: {slot}</div>
            <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#1a1a1899' }}>{barber?.name} · {today}</div>
          </div>
          {slot !== 'Now' && (
            <div style={{ borderLeft:`1.5px solid #11111015`, paddingLeft:'clamp(12px,2.2vw,20px)', maxWidth:'clamp(140px,22vw,220px)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                <span style={{ fontSize:14 }}>⏱</span>
                <span style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:800, color:'#111110', textTransform:'uppercase', letterSpacing:'0.02em' }}>Auto-cancel in 15m</span>
              </div>
              <div style={{ fontSize:'clamp(9px,1.1vw,11px)', color:'#5a4a00', lineHeight:1.3 }}>
                Arrive within 15 mins or booking is canceled.<br />
                <span style={{ opacity:0.7 }}>Batal otomatis jika lewat 15 menit.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add-ons (beverages + products) — shown after slot selected */}
      {slot && (beverages.length > 0 || products.length > 0) && (
        <div className="fu" style={{ marginBottom:'clamp(20px,2.8vw,30px)' }}>
          <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, letterSpacing:'0.12em', color:C.muted, textTransform:'uppercase', marginBottom:'clamp(10px,1.4vw,14px)' }}>
            Add-ons · Minuman &amp; Produk <span style={{ fontSize:'clamp(10px,1.2vw,11px)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(Optional / Opsional)</span>
          </div>
          {beverages.length > 0 && (
            <>
              <div style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:C.text2, marginBottom:'clamp(8px,1.2vw,10px)', display:'flex', alignItems:'center', gap:8 }}>
                <span>☕</span> Beverages / Minuman
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'clamp(8px,1.2vw,12px)', marginBottom:'clamp(12px,1.6vw,16px)' }}>
                {beverages.map(b => <ItemCard key={b.stock_id || b.id} item={b} />)}
              </div>
            </>
          )}
          {products.length > 0 && (
            <>
              <div style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:C.text2, marginBottom:'clamp(8px,1.2vw,10px)', display:'flex', alignItems:'center', gap:8 }}>
                <span>🧴</span> Products / Produk
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'clamp(8px,1.2vw,12px)' }}>
                {products.map(p => <ItemCard key={p.stock_id || p.id} item={p} />)}
              </div>
            </>
          )}
          {extrasTotal > 0 && (
            <div style={{ marginTop:'clamp(10px,1.4vw,14px)', background:C.surface, borderRadius:10, padding:'clamp(10px,1.4vw,14px) clamp(12px,1.6vw,16px)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.text2 }}>Add-ons total</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,18px)', fontWeight:800 }}>{fmt(extrasTotal)}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display:'flex', gap:'clamp(8px,1.2vw,14px)' }}>
        <button className="btnG" onClick={onBack} style={{ width:'clamp(120px,16vw,180px)' }}>← Back</button>
        <button className="btnP" disabled={!slot} onClick={onNext}>
          {slot ? 'Continue →' : 'Pick a time first'}
        </button>
      </div>
    </div>
  )
}
