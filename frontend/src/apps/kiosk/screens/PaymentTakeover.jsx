import { memo, useEffect, useRef, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt  = n => 'Rp ' + Number(n).toLocaleString('id-ID')
const fmtK = n => n >= 1000 ? `${n / 1000}K` : String(n)

const TIP_PAD = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']]
const DEBOUNCE_MS = 150

const TipNumpad = memo(function TipNumpad({ value, onChange }) {
  const [pressedKey, setPressedKey] = useState(null)
  const lastPressRef = useRef({})

  const handleKey = (key) => {
    if (!key) return
    const now = Date.now()
    if (now - (lastPressRef.current[key] || 0) < DEBOUNCE_MS) return
    lastPressRef.current[key] = now
    if (key === '⌫') { onChange(value.slice(0, -1)); return }
    onChange(value + key)
  }

  const press = (key) => ({
    onPointerDown:   (e) => { e.preventDefault(); setPressedKey(key); handleKey(key) },
    onPointerUp:     ()  => setPressedKey(null),
    onPointerLeave:  ()  => setPressedKey(null),
    onPointerCancel: ()  => setPressedKey(null),
  })

  const displayVal = parseInt(value, 10) || 0

  return (
    <div style={{ background:'#1a1a18', borderRadius:12, padding:'clamp(8px,1.1vh,12px) clamp(8px,1vw,12px)', display:'flex', flexDirection:'column', gap:'clamp(4px,0.55vh,6px)', marginTop:10 }}>
      {/* Display */}
      <div style={{ background:'#111', borderRadius:8, padding:'clamp(8px,1vh,11px) clamp(12px,1.4vw,16px)', fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,26px)', fontWeight:700, color: displayVal > 0 ? C.accent : '#555', letterSpacing:'0.04em', textAlign:'right' }}>
        {displayVal > 0 ? fmt(displayVal) : 'Enter amount…'}
      </div>
      {/* Numpad rows */}
      {TIP_PAD.map((row, ri) => (
        <div key={ri} style={{ display:'flex', gap:'clamp(4px,0.48vw,5px)' }}>
          {row.map((key, ki) => {
            if (!key) return <div key={ki} style={{ flex:1 }} />
            const isBs = key === '⌫'
            const isP  = pressedKey === key
            return (
              <button key={ki} {...press(key)}
                style={{ flex:1, height:'clamp(44px,5.9vh,56px)', borderRadius:8, border:'none', fontSize: isBs ? 'clamp(16px,2vw,21px)' : 'clamp(18px,2.2vw,23px)', fontWeight:700, fontFamily:"'Inter',sans-serif", cursor:'pointer', background: isP ? (isBs ? '#555' : C.accent) : (isBs ? '#333' : '#2a2a28'), color: isP ? (isBs ? '#FFF' : C.accentText) : '#FFF', boxShadow: isP ? 'inset 0 2px 4px rgba(0,0,0,0.4)' : '0 2px 3px rgba(0,0,0,0.3)', transform: isP ? 'scale(0.9)' : 'scale(1)', transition:'transform 60ms, background 60ms', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation' }}>
                {key}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
})

// ── Receipt Screen ─────────────────────────────────────────────────────────────
function ReceiptScreen({ booking, grand, onNext }) {
  const [printing, setPrinting] = useState(true)
  const [waSent,   setWaSent]   = useState(false)
  const hasPhone = !!(booking?.customer_phone || booking?.guest_phone)

  useEffect(() => {
    const t1 = setTimeout(() => setPrinting(false), 2500)
    const t2 = setTimeout(() => onNext(), 8000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onNext])

  return (
    <div style={{ position:'fixed', inset:0, background:C.topBg, zIndex:8100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(20px,3vw,40px)', textAlign:'center' }}>
      <div className="si" style={{ maxWidth:'clamp(340px,44vw,460px)', width:'100%' }}>

        <div style={{ width:72, height:72, background:'#1a2a1a', border:'2px solid #2d7a2d', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto clamp(16px,2.2vh,22px)' }}>✓</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(20px,2.8vw,28px)', fontWeight:800, color:C.white, marginBottom:4 }}>Pembayaran Berhasil</div>
        <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#666', marginBottom:4 }}>Payment Confirmed</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(20px,2.6vw,28px)', fontWeight:800, color:C.accent, marginBottom:'clamp(20px,3vh,28px)' }}>{fmt(grand)}</div>

        <div style={{ width:'100%', height:1, background:'#1a1a18', marginBottom:'clamp(18px,2.6vh,26px)' }} />

        <div style={{ background:'#0d0d0b', border:'1px solid #2a2a28', borderRadius:14, padding:'clamp(16px,2.2vw,22px)', marginBottom:'clamp(14px,2vh,20px)' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🧾</div>
          {printing ? (
            <>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,17px)', fontWeight:700, color:C.white, marginBottom:6 }}>Mencetak Struk…</div>
              <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#666', marginBottom:14 }}>Printing receipt…</div>
              <div style={{ height:4, background:'#1a1a18', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', background:C.accent, borderRadius:2, animation:'printProgress 2.5s linear forwards' }} />
              </div>
              <style>{`@keyframes printProgress { from{width:0%} to{width:100%} }`}</style>
            </>
          ) : (
            <>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,17px)', fontWeight:700, color:'#6fcf6f', marginBottom:4 }}>Struk Tercetak ✓</div>
              <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#666' }}>Receipt printed</div>
            </>
          )}
        </div>

        {hasPhone && !waSent && (
          <button onClick={() => setWaSent(true)}
            style={{ width:'100%', background:'#0d2b1a', border:'1.5px solid #1a5c35', color:'#4caf82', padding:'clamp(11px,1.6vh,15px)', borderRadius:12, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(13px,1.5vw,15px)', fontWeight:600, cursor:'pointer', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:8, border:'none' }}>
            <span>📱</span><span>Kirim ke WhatsApp · Send to WhatsApp</span>
          </button>
        )}
        {waSent && (
          <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#4caf82', fontWeight:600, marginBottom:10 }}>📱 Sent to WhatsApp ✓</div>
        )}

        <button onClick={onNext}
          style={{ width:'100%', background:C.accent, color:C.accentText, padding:'clamp(14px,2vh,18px)', borderRadius:12, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(14px,1.7vw,17px)', fontWeight:700, border:'none', cursor:'pointer' }}>
          Lanjut · Continue
        </button>
        <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#444', marginTop:10 }}>Auto-continues in a few seconds</div>
      </div>
    </div>
  )
}

// ── Review Screen ──────────────────────────────────────────────────────────────
function ReviewScreen({ booking, grand, feedbackTags, onDone }) {
  const [stars,     setStars]     = useState(0)
  const [hovered,   setHovered]   = useState(0)
  const [tags,      setTags]      = useState([])
  const [comment,   setComment]   = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting,setSubmitting]= useState(false)

  const availTags = stars > 0
    ? feedbackTags.filter(t => stars >= 4 ? (t.context === 'positive' || !t.context) : (t.context !== 'positive'))
    : []

  const LABELS = ['', 'Kurang Baik', 'Di Bawah Rata-rata', 'Lumayan', 'Bagus!', 'Luar Biasa! 🎉']

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (stars > 0 && booking) {
        await kioskApi.post(`/bookings/${booking.id}/rate`, {
          rating: stars,
          feedback_tag_ids: tags,
          comment: comment || undefined
        })
      }
      setSubmitted(true)
    } catch { setSubmitted(true) }
    finally { setSubmitting(false) }
  }

  if (submitted) return (
    <div style={{ position:'fixed', inset:0, background:C.topBg, zIndex:8100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:32 }}>
      <div className="si">
        <div style={{ fontSize:64, marginBottom:16 }}>🙏</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(24px,3.5vw,34px)', fontWeight:800, color:C.white, marginBottom:8 }}>Terima Kasih! · Thank You!</div>
        <div style={{ fontSize:'clamp(13px,1.5vw,15px)', color:'#666', marginBottom:32 }}>Sampai jumpa lagi di Bercut · See you again!</div>
        <button onClick={onDone}
          style={{ padding:'clamp(14px,2vh,18px) clamp(32px,4vw,48px)', borderRadius:12, fontSize:'clamp(15px,1.8vw,18px)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, background:C.accent, color:C.accentText, border:'none', cursor:'pointer' }}>
          Selesai · Done
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:C.topBg, zIndex:8100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(16px,3vw,40px)', overflowY:'auto' }}>
      <div className="si" style={{ maxWidth:'clamp(360px,52vw,540px)', width:'100%', textAlign:'center' }}>

        <div style={{ width:60, height:60, background:C.accent, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto clamp(12px,1.8vh,18px)' }}>✓</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(20px,2.8vw,28px)', fontWeight:800, color:C.white, lineHeight:1.1, marginBottom:4 }}>Pembayaran Berhasil</div>
        <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#666', marginBottom:4 }}>Payment Successful</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,26px)', fontWeight:800, color:C.accent, marginBottom:4 }}>{fmt(grand)}</div>
        {booking && (
          <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#555', marginBottom:'clamp(16px,2.4vh,24px)' }}>
            {booking.customer_name || booking.guest_name || 'Guest'} · ✂ {booking.barber_name}
          </div>
        )}

        <div style={{ width:'100%', height:1, background:'#1a1a18', marginBottom:'clamp(16px,2.4vh,24px)' }} />

        <div style={{ fontSize:'clamp(10px,1.2vw,12px)', letterSpacing:'0.16em', textTransform:'uppercase', color:'#555', marginBottom:6 }}>Bagaimana pengalamanmu? · How was your visit?</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,24px)', fontWeight:800, color:C.white, marginBottom:'clamp(12px,1.8vh,18px)' }}>Rate Your Visit</div>

        <div style={{ display:'flex', justifyContent:'center', gap:'clamp(6px,1.2vw,14px)', marginBottom:'clamp(12px,1.8vh,18px)' }}>
          {[1,2,3,4,5].map(s => (
            <button key={s}
              onClick={() => { setStars(s); setTags([]) }}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              style={{ fontSize:'clamp(34px,5.5vw,50px)', background:'none', border:'none', cursor:'pointer', transition:'transform 0.1s', transform:(hovered >= s || stars >= s) ? 'scale(1.15)' : 'scale(1)', filter:(hovered >= s || stars >= s) ? 'none' : 'grayscale(1) opacity(0.25)' }}>
              ⭐
            </button>
          ))}
        </div>

        {stars > 0 && (
          <div className="fi">
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.9vw,19px)', fontWeight:700, color:C.white, marginBottom:'clamp(10px,1.4vh,14px)' }}>{LABELS[stars]}</div>
            {availTags.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'clamp(6px,1vw,10px)', justifyContent:'center', marginBottom:'clamp(12px,1.8vh,18px)' }}>
                {availTags.map(tag => (
                  <button key={tag.id} onClick={() => setTags(p => p.includes(tag.id) ? p.filter(x => x !== tag.id) : [...p, tag.id])}
                    style={{ padding:'clamp(8px,1.2vh,12px) clamp(14px,1.8vw,18px)', borderRadius:999, fontSize:'clamp(12px,1.4vw,14px)', fontWeight:600, cursor:'pointer', background:tags.includes(tag.id) ? C.accent : '#1a1a18', color:tags.includes(tag.id) ? C.accentText : '#888', border:`1.5px solid ${tags.includes(tag.id) ? C.accent : '#2a2a28'}`, transition:'all 0.15s' }}>
                    {tag.label}
                  </button>
                ))}
              </div>
            )}
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Komentar tambahan (opsional) · Additional comments"
              style={{ width:'100%', padding:'clamp(10px,1.4vh,14px)', borderRadius:12, border:'1.5px solid #2a2a28', fontSize:'clamp(13px,1.5vw,14px)', fontFamily:"'DM Sans',sans-serif", resize:'none', minHeight:70, background:'#1a1a18', color:C.white, marginBottom:'clamp(12px,1.8vh,18px)' }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = '#2a2a28'} />
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={stars > 0 ? handleSubmit : onDone} disabled={submitting}
            style={{ padding:'clamp(14px,2vh,18px)', borderRadius:12, fontSize:'clamp(14px,1.7vw,17px)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, background:C.accent, color:C.accentText, border:'none', cursor:'pointer' }}>
            {submitting ? 'Mengirim…' : stars > 0 ? 'Submit Review · Kirim Ulasan' : 'Done · Selesai'}
          </button>
          {stars > 0 && (
            <button onClick={onDone}
              style={{ padding:'clamp(10px,1.4vh,14px)', borderRadius:12, fontSize:'clamp(12px,1.4vw,14px)', fontFamily:"'DM Sans',sans-serif", fontWeight:500, background:'none', color:'#555', border:'none', cursor:'pointer' }}>
              Lewati · Skip
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Payment Failed Screen ──────────────────────────────────────────────────────
function PaymentFailedScreen({ method, onRetry, onSwitchMethod }) {
  const [notified, setNotified] = useState(false)
  return (
    <div style={{ position:'fixed', inset:0, background:C.topBg, zIndex:8100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(24px,4vw,56px)', textAlign:'center' }}>
      <div style={{ width:80, height:80, borderRadius:'50%', background:'#2a0a0a', border:'2px solid #7f1d1d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, marginBottom:28 }}>✕</div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(22px,3.2vw,30px)', fontWeight:800, color:C.white, marginBottom:8 }}>Payment Unsuccessful</div>
      <div style={{ fontSize:'clamp(13px,1.6vw,15px)', color:'#888', marginBottom:6 }}>Pembayaran tidak berhasil</div>
      <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#555', marginBottom:40, maxWidth:380 }}>
        {method === 'qris' ? 'QRIS transaction could not be completed.' : 'Card terminal did not confirm payment.'} Your booking is still held.
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:400 }}>
        <button onClick={onRetry}
          style={{ width:'100%', padding:'clamp(15px,2.2vh,19px)', borderRadius:14, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(15px,1.8vw,18px)', fontWeight:700, border:'none', cursor:'pointer' }}>
          Try Again · Coba Lagi
        </button>
        <button onClick={onSwitchMethod}
          style={{ width:'100%', padding:'clamp(13px,1.9vh,17px)', borderRadius:14, background:'transparent', color:C.white, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(14px,1.6vw,16px)', fontWeight:600, border:'1.5px solid #333', cursor:'pointer' }}>
          {method === 'qris' ? 'Try Card Instead · Coba Kartu' : 'Try QRIS Instead · Coba QRIS'}
        </button>
        <button onClick={() => setNotified(true)} disabled={notified}
          style={{ width:'100%', padding:'clamp(13px,1.9vh,17px)', borderRadius:14, background:notified ? '#1a2a1a' : '#1a1a18', color:notified ? '#6fcf6f' : '#DC2626', fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(14px,1.6vw,16px)', fontWeight:700, border:`1.5px solid ${notified ? '#166534' : '#7f1d1d'}`, cursor:notified ? 'default' : 'pointer', transition:'all 0.2s' }}>
          {notified ? '✓ Staff Notified — Please Wait' : '⚠ Contact Staff · Hubungi Staff'}
        </button>
      </div>
    </div>
  )
}

// ── Group Booking Tip Row ──────────────────────────────────────────────────────
function GroupTipRow({ bk, tipPresets, groupTips, setGroupTips }) {
  const [showNumpad, setShowNumpad] = useState(false)
  const [customVal, setCustomVal] = useState('')
  const currentTip = groupTips[bk.id] || null

  const setTip = (val) => {
    setGroupTips(prev => ({ ...prev, [bk.id]: val }))
    setShowNumpad(false)
    setCustomVal('')
  }
  const clearTip = () => {
    setGroupTips(prev => { const n = { ...prev }; delete n[bk.id]; return n })
    setShowNumpad(false)
    setCustomVal('')
  }

  const customerName = bk.customer_name || bk.guest_name || 'Guest'
  const serviceNames = Array.isArray(bk.booking_services)
    ? bk.booking_services.map(s => s.name).join(', ')
    : (bk.booking_services ? String(bk.booking_services) : '')
  const rowTotal = parseFloat(bk.total_amount ?? (parseFloat(bk.subtotal || 0) + parseFloat(bk.extras_total || 0) - (bk.points_redeemed || 0) * 10000))

  return (
    <div style={{ background:'#1a1a18', borderRadius:10, padding:'clamp(10px,1.4vw,14px)', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:8, borderBottom:'1px solid #2a2a28', marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, color:C.accent, fontSize:'clamp(13px,1.6vw,16px)' }}>{customerName}</div>
          {bk.barber_name && <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#666', marginTop:1 }}>✂ {bk.barber_name}</div>}
          {serviceNames && <div style={{ fontSize:'clamp(10px,1.1vw,11px)', color:'#555', marginTop:1 }}>{serviceNames}</div>}
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,16px)', fontWeight:700, color:C.white }}>
          {fmt(rowTotal)}
        </div>
      </div>
      <div style={{ fontSize:'clamp(10px,1.2vw,11px)', color:'#555', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.1em' }}>Tip for {bk.barber_name}?</div>
      <div style={{ display:'flex', gap:6, flexWrap:'nowrap' }}>
        {tipPresets.map(t => (
          <button key={t} onClick={() => currentTip === t ? clearTip() : setTip(t)}
            style={{ flex:1, padding:'clamp(7px,1vh,10px) 0', borderRadius:9, fontSize:'clamp(11px,1.4vw,13px)', fontFamily:"'Inter',sans-serif", fontWeight:800, background:currentTip === t ? C.accent : '#2a2a28', color:currentTip === t ? C.accentText : C.white, border:`2px solid ${currentTip === t ? C.accent : '#3a3a38'}`, transition:'all 0.15s', cursor:'pointer' }}>
            {fmtK(t)}
          </button>
        ))}
        <button onClick={() => setShowNumpad(p => !p)}
          style={{ flex:1, padding:'clamp(7px,1vh,10px) 0', borderRadius:9, fontSize:'clamp(10px,1.2vw,12px)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, background:showNumpad ? C.accent : '#2a2a28', color:showNumpad ? C.accentText : C.white, border:`2px solid ${showNumpad ? C.accent : '#3a3a38'}`, cursor:'pointer' }}>
          {currentTip && !tipPresets.includes(currentTip) ? fmt(currentTip) : 'Custom'}
        </button>
      </div>
      {showNumpad && (
        <TipNumpad value={customVal} onChange={setCustomVal} />
      )}
      {showNumpad && (
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={() => { const v = parseInt(customVal.replace(/\D/g,''),10); if (v > 0) setTip(v) }}
            style={{ flex:1, padding:'8px', borderRadius:8, background:C.accent, color:C.accentText, fontWeight:700, fontSize:'clamp(12px,1.4vw,13px)', border:'none', cursor:'pointer' }}>
            Set Tip ✓
          </button>
          <button onClick={clearTip}
            style={{ padding:'8px 14px', borderRadius:8, background:'transparent', color:'#555', fontSize:'clamp(11px,1.3vw,12px)', border:'none', cursor:'pointer', textDecoration:'underline' }}>
            No tip
          </button>
        </div>
      )}
      {!showNumpad && (
        <button onClick={clearTip}
          style={{ background:'none', border:'none', color:'#555', fontSize:'clamp(9px,1.1vw,10px)', fontFamily:"'DM Sans',sans-serif", textDecoration:'underline', cursor:'pointer', marginTop:4, padding:'2px 0' }}>
          No tip, maybe next time
        </button>
      )}
    </div>
  )
}

// ── Payment Method Panel (shared) ─────────────────────────────────────────────
function PaymentMethodPanel({ method, setMethod, grand, confirming, isPointsCovered, onConfirm, confirmLabel }) {
  return (
    <div style={{ width:'clamp(260px,30vw,370px)', borderLeft:'1px solid #1a1a18', background:'#0d0d0b', padding:'clamp(18px,2.6vw,28px)', display:'flex', flexDirection:'column', flexShrink:0 }}>
      {isPointsCovered ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', gap:14 }}>
          <div style={{ fontSize:44 }}>⭐</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2.2vw,22px)', fontWeight:800, color:'#6fcf6f' }}>Fully Covered by Points!</div>
          <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#555' }}>No payment needed · Tidak perlu bayar</div>
        </div>
      ) : (
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', marginBottom:14 }}>
          <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, letterSpacing:'0.14em', color:'#555', textTransform:'uppercase', marginBottom:14 }}>Payment Method</div>
          <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#555', marginBottom:14 }}>Barber selects method, customer pays.</div>

          {/* QRIS */}
          <div onClick={() => setMethod('qris')} style={{ background:method === 'qris' ? '#1a1a18' : '#111110', border:`2px solid ${method === 'qris' ? C.accent : '#222'}`, borderRadius:14, padding:'clamp(14px,2vw,20px)', cursor:'pointer', marginBottom:10, transition:'all 0.18s' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:method === 'qris' ? 14 : 0 }}>
              <div style={{ width:42, height:42, background:method === 'qris' ? C.accent : '#1a1a18', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>⬛</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2.2vw,22px)', fontWeight:700, color:C.white }}>QRIS</div>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#666' }}>GoPay · OVO · Dana · Bank</div>
              </div>
              {method === 'qris' && <div style={{ width:20, height:20, background:C.accent, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:C.accentText, flexShrink:0 }}>✓</div>}
            </div>
            {method === 'qris' && (
              <div style={{ background:'#0d0d0b', borderRadius:10, padding:14, textAlign:'center' }}>
                <div style={{ width:110, height:110, background:C.white, borderRadius:8, margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="90" height="90" viewBox="0 0 100 100">
                    <rect x="5" y="5" width="35" height="35" rx="4" fill="none" stroke="#111" strokeWidth="3" />
                    <rect x="13" y="13" width="19" height="19" rx="2" fill="#111" />
                    <rect x="60" y="5" width="35" height="35" rx="4" fill="none" stroke="#111" strokeWidth="3" />
                    <rect x="68" y="13" width="19" height="19" rx="2" fill="#111" />
                    <rect x="5" y="60" width="35" height="35" rx="4" fill="none" stroke="#111" strokeWidth="3" />
                    <rect x="13" y="68" width="19" height="19" rx="2" fill="#111" />
                    <rect x="60" y="60" width="8" height="8" fill="#111" /><rect x="72" y="60" width="8" height="8" fill="#111" />
                    <rect x="84" y="60" width="11" height="8" fill="#111" /><rect x="60" y="72" width="11" height="8" fill="#111" />
                    <rect x="76" y="72" width="8" height="8" fill="#111" /><rect x="60" y="84" width="8" height="11" fill="#111" />
                    <rect x="72" y="84" width="23" height="11" fill="#111" />
                  </svg>
                </div>
                <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#666' }}>Scan QR code to pay</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2.2vw,22px)', fontWeight:700, color:C.accent, marginTop:6 }}>{fmt(grand)}</div>
              </div>
            )}
          </div>

          {/* Card */}
          <div onClick={() => setMethod('card')} style={{ background:method === 'card' ? '#1a1a18' : '#111110', border:`2px solid ${method === 'card' ? C.accent : '#222'}`, borderRadius:14, padding:'clamp(14px,2vw,20px)', cursor:'pointer', transition:'all 0.18s' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:method === 'card' ? 14 : 0 }}>
              <div style={{ width:42, height:42, background:method === 'card' ? C.accent : '#1a1a18', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>💳</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2.2vw,22px)', fontWeight:700, color:C.white }}>Card</div>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#666' }}>Tap, Insert, or Swipe</div>
              </div>
              {method === 'card' && <div style={{ width:20, height:20, background:C.accent, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:C.accentText, flexShrink:0 }}>✓</div>}
            </div>
            {method === 'card' && (
              <div style={{ background:'#0d0d0b', borderRadius:10, padding:14, textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:6 }}>🏦</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.7vw,16px)', fontWeight:700, color:C.white, marginBottom:3 }}>Tap or insert card</div>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#666', marginBottom:6 }}>Use the terminal on the counter</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2.2vw,22px)', fontWeight:700, color:C.accent }}>{fmt(grand)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <button onClick={onConfirm} disabled={(!method && !isPointsCovered) || confirming}
        style={{ width:'100%', background:(!method && !isPointsCovered) || confirming ? '#2a2a28' : C.accent, color:(!method && !isPointsCovered) || confirming ? '#555' : C.accentText, padding:'clamp(15px,2.2vh,19px)', borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(14px,1.8vw,17px)', fontWeight:700, border:'none', cursor:(!method && !isPointsCovered) || confirming ? 'not-allowed' : 'pointer', flexShrink:0, transition:'all 0.2s' }}>
        {confirming ? 'Processing…' : confirmLabel || (isPointsCovered ? 'Confirm & Complete ✓' : method === 'qris' ? 'Confirm QRIS Payment ✓' : method === 'card' ? 'Confirm Card Payment ✓' : 'Select Payment Method')}
      </button>
    </div>
  )
}

// ── Main PaymentTakeover ───────────────────────────────────────────────────────
export default function PaymentTakeover({ bookingData, branchId, feedbackTags = [], settings = {}, onDone }) {
  const isGroup   = !!(bookingData?.group_id)
  const groupId   = bookingData?.group_id
  const bookingId = bookingData?.booking_id || bookingData?.id

  const [booking,    setBooking]    = useState(null)
  const [groupBks,   setGroupBks]   = useState([])
  const [phase,      setPhase]      = useState('loading')
  const [method,     setMethod]     = useState(null)
  const [tip,        setTip]        = useState(null)
  const [customTip,  setCustomTip]  = useState('')
  const [groupTips,  setGroupTips]  = useState({})
  const [confirming, setConfirming] = useState(false)

  const tipPresets = settings.tipPresets || [10000, 20000, 50000, 100000]

  useEffect(() => {
    if (isGroup && groupId) {
      kioskApi.get(`/booking-groups/${groupId}`)
        .then(data => { setGroupBks(data); setPhase('payment') })
        .catch(() => setPhase('payment'))
    } else if (bookingId) {
      kioskApi.get(`/bookings/${bookingId}`)
        .then(data => { setBooking(data); setPhase('payment') })
        .catch(() => setPhase('payment'))
    }
  }, [isGroup, groupId, bookingId])

  // Single booking flow
  const amount    = parseFloat(booking?.total_amount ?? bookingData?.amount ?? 0)
  const tipAmount = tip === 'custom' ? (parseInt(customTip.replace(/\D/g, ''), 10) || 0) : (tip || 0)
  const grand     = amount + tipAmount
  const isPointsCovered = amount <= 0 && booking

  // Group flow
  const groupSubtotal = groupBks.reduce((s, bk) => s + parseFloat(bk.total_amount || 0), 0)
  const groupTipsTotal = Object.values(groupTips).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const groupGrand = groupSubtotal + groupTipsTotal

  const handleConfirmSingle = async () => {
    if (!method && !isPointsCovered) return
    setConfirming(true)
    try {
      await kioskApi.post('/payments/manual-confirm', {
        booking_id:     bookingId,
        payment_method: isPointsCovered ? 'points' : method,
        tip_amount:     tipAmount || undefined
      })
      setPhase('receipt')
    } catch { setPhase('failed') }
    finally { setConfirming(false) }
  }

  const handleConfirmGroup = async () => {
    if (!method) return
    setConfirming(true)
    try {
      await kioskApi.post('/payments/group-confirm', {
        group_id:       groupId,
        payment_method: method,
        tip_amounts:    groupTips,
      })
      setPhase('receipt')
    } catch { setPhase('failed') }
    finally { setConfirming(false) }
  }

  const firstBk  = isGroup ? groupBks[0] : booking
  const headerName = isGroup
    ? `Group · ${groupBks.length} people`
    : (booking?.customer_name || booking?.guest_name || 'Guest')

  if (phase === 'receipt') return <ReceiptScreen booking={firstBk} grand={isGroup ? groupGrand : grand} onNext={() => setPhase('review')} />
  if (phase === 'review')  return <ReviewScreen  booking={firstBk} grand={isGroup ? groupGrand : grand} feedbackTags={feedbackTags} onDone={onDone} />
  if (phase === 'failed')  return (
    <PaymentFailedScreen
      method={method}
      onRetry={() => setPhase('payment')}
      onSwitchMethod={() => { setMethod(method === 'qris' ? 'card' : 'qris'); setPhase('payment') }}
    />
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:8000, background:C.topBg, display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ background:'#0a0a08', padding:'0 clamp(20px,3vw,32px)', height:'clamp(52px,6.5vh,62px)', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #1a1a18', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height:'clamp(22px,3vh,30px)', width:'auto', objectFit:'contain' }} />
          <span style={{ color:'#555', fontSize:'clamp(11px,1.3vw,13px)' }}>Payment</span>
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,18px)', fontWeight:700, color:C.accent }}>
          {phase !== 'loading' ? headerName : ''}
        </div>
      </div>

      {/* Loading */}
      {phase === 'loading' && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#555', fontSize:'clamp(14px,1.6vw,16px)' }}>
          Loading…
        </div>
      )}

      {/* Payment Phase — Group */}
      {phase === 'payment' && isGroup && (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'clamp(18px,2.6vw,28px)' }}>
            <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, letterSpacing:'0.14em', color:'#555', textTransform:'uppercase', marginBottom:14 }}>
              Group Order — {groupBks.length} Bookings
            </div>

            {groupBks.map(bk => (
              <GroupTipRow
                key={bk.id}
                bk={bk}
                tipPresets={tipPresets}
                groupTips={groupTips}
                setGroupTips={setGroupTips}
              />
            ))}

            {/* Grand total */}
            <div style={{ background:'#1a1a18', borderRadius:12, padding:'clamp(12px,1.6vw,18px)', marginTop:10 }}>
              {groupTipsTotal > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#888' }}>Tips Total 🙌</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:C.accent }}>{fmt(groupTipsTotal)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,18px)', fontWeight:800, color:C.white }}>TOTAL</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(26px,3.8vw,36px)', fontWeight:800, color:C.accent }}>{fmt(groupGrand)}</span>
              </div>
            </div>
          </div>

          <PaymentMethodPanel
            method={method}
            setMethod={setMethod}
            grand={groupGrand}
            confirming={confirming}
            isPointsCovered={false}
            onConfirm={handleConfirmGroup}
            confirmLabel={method === 'qris' ? 'Confirm QRIS Payment ✓' : method === 'card' ? 'Confirm Card Payment ✓' : 'Select Payment Method'}
          />
        </div>
      )}

      {/* Payment Phase — Single */}
      {phase === 'payment' && !isGroup && (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Left — order summary + tip */}
          <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'clamp(18px,2.6vw,28px)' }}>
            <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, letterSpacing:'0.14em', color:'#555', textTransform:'uppercase', marginBottom:14 }}>Order Summary</div>

            <div style={{ background:'#1a1a18', borderRadius:14, padding:'clamp(14px,2vw,20px)', marginBottom:'clamp(16px,2.2vw,22px)' }}>

              {/* Customer + barber */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:'clamp(10px,1.4vh,14px)', borderBottom:'1px solid #2a2a28', marginBottom:'clamp(10px,1.4vh,14px)' }}>
                <div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, color:C.accent, fontSize:'clamp(14px,1.8vw,17px)' }}>{booking?.customer_name || booking?.guest_name || 'Guest'}</div>
                  {booking?.barber_name && <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#666', marginTop:2 }}>✂ {booking.barber_name}</div>}
                </div>
                {booking?.slot_time && <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#555' }}>{booking.slot_time}</div>}
              </div>

              {/* Services */}
              {(booking?.services || []).map((s, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(7px,1vh,10px) 0', borderBottom:'1px solid #1a1a18' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:C.white, fontFamily:"'Inter',sans-serif" }}>{s.name}</div>
                      {s.added_mid_cut && <div style={{ background:'#2a2a18', border:'1px solid #c9a050', color:'#c9a050', fontSize:'clamp(8px,1vw,10px)', fontWeight:700, padding:'1px 6px', borderRadius:4 }}>+ ADDED</div>}
                    </div>
                    {s.duration_min > 0 && <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#666' }}>{s.duration_min} min</div>}
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,17px)', fontWeight:700, color:s.added_mid_cut ? '#c9a050' : C.white }}>{fmt(s.price)}</div>
                </div>
              ))}

              {/* Extras */}
              {(booking?.extras || []).map((e, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(7px,1vh,10px) 0', borderBottom:'1px solid #1a1a18' }}>
                  <div style={{ fontSize:'clamp(13px,1.6vw,15px)', fontWeight:600, color:'#aaa' }}>{e.name}{e.qty > 1 ? ` ×${e.qty}` : ''}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:'#aaa' }}>{fmt(e.price)}</div>
                </div>
              ))}

              {/* Points discount */}
              {booking?.points_redeemed > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', padding:'clamp(7px,1vh,10px) 0', borderBottom:'1px solid #1a1a18' }}>
                  <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#6fcf6f' }}>⭐ Points Redeemed</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:'#6fcf6f' }}>−{fmt(booking.points_redeemed)}</div>
                </div>
              )}

              {/* Tip row (if selected) */}
              {tipAmount > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', padding:'clamp(7px,1vh,10px) 0', borderBottom:'1px solid #1a1a18' }}>
                  <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#888' }}>Tip 🙌</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:C.accent }}>{fmt(tipAmount)}</div>
                </div>
              )}

              {/* Grand total */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:14 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,18px)', fontWeight:800, color:C.white }}>TOTAL</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(26px,3.8vw,36px)', fontWeight:800, color:C.accent }}>{fmt(grand)}</span>
              </div>
            </div>

            {/* Tip section */}
            {!isPointsCovered && (
              <div style={{ background:'#1c1c1a', border:'1.5px solid #333', borderRadius:16, padding:'clamp(14px,2vw,20px)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.white, fontWeight:800, fontFamily:"'Inter',sans-serif", textTransform:'uppercase', letterSpacing:'0.02em' }}>
                      Support {booking?.barber_name || 'your barber'}? 🙌
                    </div>
                    <div style={{ fontSize:'clamp(10px,1.2vw,11px)', color:'#555', marginTop:2 }}>100% of tips go directly to your barber</div>
                  </div>
                </div>

                <div style={{ display:'flex', gap:8, flexWrap:'nowrap' }}>
                  {tipPresets.map(t => (
                    <button key={t} onClick={() => { setTip(prev => prev === t ? null : t); setCustomTip('') }}
                      style={{ flex:1, padding:'clamp(10px,1.4vh,13px) 0', borderRadius:12, fontSize:'clamp(13px,1.7vw,15px)', fontFamily:"'Inter',sans-serif", fontWeight:800, background:tip === t ? C.accent : '#2a2a28', color:tip === t ? C.accentText : C.white, border:`2px solid ${tip === t ? C.accent : '#3a3a38'}`, transition:'all 0.15s', cursor:'pointer' }}>
                      {fmtK(t)}
                    </button>
                  ))}
                  <button onClick={() => setTip(prev => prev === 'custom' ? null : 'custom')}
                    style={{ flex:1, padding:'clamp(10px,1.4vh,13px) 0', borderRadius:12, fontSize:'clamp(12px,1.5vw,13px)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, background:tip === 'custom' ? C.accent : '#2a2a28', color:tip === 'custom' ? C.accentText : C.white, border:`2px solid ${tip === 'custom' ? C.accent : '#3a3a38'}`, cursor:'pointer' }}>
                    Custom
                  </button>
                </div>

                {tip === 'custom' && (
                  <TipNumpad value={customTip} onChange={setCustomTip} />
                )}

                <div style={{ display:'flex', justifyContent:'center', marginTop:10 }}>
                  <button onClick={() => { setTip(null); setCustomTip('') }}
                    style={{ background:'none', border:'none', color:'#555', fontSize:'clamp(10px,1.2vw,11px)', fontFamily:"'DM Sans',sans-serif", textDecoration:'underline', cursor:'pointer', padding:'4px 10px' }}>
                    No tip, maybe next time
                  </button>
                </div>

                {tipAmount > 0 && (
                  <div style={{ marginTop:8, fontSize:'clamp(12px,1.4vw,13px)', color:C.accent, fontWeight:700, textAlign:'center', fontFamily:"'Inter',sans-serif" }}>
                    +{fmt(tipAmount)} tip added ✓
                  </div>
                )}
              </div>
            )}
          </div>

          <PaymentMethodPanel
            method={method}
            setMethod={setMethod}
            grand={grand}
            confirming={confirming}
            isPointsCovered={isPointsCovered}
            onConfirm={handleConfirmSingle}
          />
        </div>
      )}
    </div>
  )
}
