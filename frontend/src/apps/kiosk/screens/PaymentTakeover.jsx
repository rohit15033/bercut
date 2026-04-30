import { memo, useEffect, useRef, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt  = n => 'Rp ' + Number(n).toLocaleString('id-ID')
const fmtK = n => n >= 1000 ? `${n / 1000}K` : String(n)

const TIP_PAD = [['1','2','3'],['4','5','6'],['7','8','9'],['000','0','⌫']]
const DEBOUNCE_MS = 150

const TipNumpad = memo(function TipNumpad({ value, onChange }) {
  const [pressedKey, setPressedKey] = useState(null)
  const lastPressRef = useRef({})
  const deleteTimerRef = useRef(null)
  const deleteIntervalRef = useRef(null)

  const handleKey = (key) => {
    if (!key) return
    const now = Date.now()
    if (now - (lastPressRef.current[key] || 0) < DEBOUNCE_MS) return
    lastPressRef.current[key] = now
    if (key === '000') { onChange(prev => prev + '000'); return }
    onChange(prev => prev + key)
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
      onPointerDown:   (e) => { e.preventDefault(); stopDelete(); setPressedKey(key); handleKey(key) },
      onPointerUp:     ()  => setPressedKey(null),
      onPointerLeave:  ()  => setPressedKey(null),
      onPointerCancel: ()  => setPressedKey(null),
    }
  }

  const displayVal = parseInt(value, 10) || 0

  return (
    <div style={{ background:'#D1D5DB', borderRadius:12, padding:'clamp(8px,1.1vh,12px) clamp(8px,1vw,12px)', display:'flex', flexDirection:'column', gap:'clamp(4px,0.55vh,6px)', marginTop:10 }}>
      <div style={{ background:C.white, borderRadius:8, padding:'clamp(8px,1vh,11px) clamp(12px,1.4vw,16px)', fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,26px)', fontWeight:700, color: displayVal > 0 ? C.text : C.muted, letterSpacing:'0.04em', textAlign:'right' }}>
        {displayVal > 0 ? fmt(displayVal) : 'Enter amount…'}
      </div>
      {TIP_PAD.map((row, ri) => (
        <div key={ri} style={{ display:'flex', gap:'clamp(4px,0.48vw,5px)' }}>
          {row.map((key, ki) => {
            if (!key) return <div key={ki} style={{ flex:1 }} />
            const isBs  = key === '⌫'
            const is000 = key === '000'
            const isP   = pressedKey === key
            return (
              <button key={ki} {...press(key)}
                style={{ flex:1, height:'clamp(44px,5.9vh,56px)', borderRadius:8, border:'none', fontSize: isBs ? 'clamp(16px,2vw,21px)' : is000 ? 'clamp(13px,1.6vw,16px)' : 'clamp(18px,2.2vw,23px)', fontWeight:700, fontFamily:"'Inter',sans-serif", cursor:'pointer', background: isP ? (isBs ? '#888' : C.accent) : (isBs || is000 ? '#C4C4C4' : C.white), color: isP ? (isBs ? C.white : C.accentText) : C.text, boxShadow: isP ? 'inset 0 2px 4px rgba(0,0,0,0.18)' : '0 2px 3px rgba(0,0,0,0.14)', transform: isP ? 'scale(0.9)' : 'scale(1)', transition:'transform 60ms, background 60ms', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation' }}>
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
  const [waSent, setWaSent] = useState(false)
  const hasPhone = !!(booking?.customer_phone || booking?.guest_phone)

  useEffect(() => {
    const t = setTimeout(() => onNext(), 8000)
    return () => clearTimeout(t)
  }, [onNext])

  return (
    <div style={{ position:'fixed', inset:0, background:C.bg, zIndex:8100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(20px,3vw,40px)', textAlign:'center' }}>
      <div className="si" style={{ maxWidth:'clamp(340px,44vw,460px)', width:'100%' }}>

        <div style={{ width:72, height:72, background:'#e8f5e9', border:'2px solid #4caf50', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto clamp(16px,2.2vh,22px)' }}>✓</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(20px,2.8vw,28px)', fontWeight:800, color:C.text, marginBottom:4 }}>Pembayaran Berhasil</div>
        <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.muted, marginBottom:4 }}>Payment Confirmed</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(20px,2.6vw,28px)', fontWeight:800, color:C.text, marginBottom:'clamp(20px,3vh,28px)' }}>{fmt(grand)}</div>

        <div style={{ width:'100%', height:1, background:C.border, marginBottom:'clamp(18px,2.6vh,26px)' }} />


        {hasPhone && !waSent && (
          <button onClick={() => setWaSent(true)}
            style={{ width:'100%', background:'#f0faf4', border:'1.5px solid #a5d6a7', color:'#2e7d32', padding:'clamp(11px,1.6vh,15px)', borderRadius:12, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(13px,1.5vw,15px)', fontWeight:600, cursor:'pointer', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <span>📱</span><span>Kirim ke WhatsApp · Send to WhatsApp</span>
          </button>
        )}
        {waSent && (
          <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#2e7d32', fontWeight:600, marginBottom:10 }}>📱 Sent to WhatsApp ✓</div>
        )}

        <button onClick={onNext}
          style={{ width:'100%', background:C.accent, color:C.accentText, padding:'clamp(14px,2vh,18px)', borderRadius:12, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(14px,1.7vw,17px)', fontWeight:700, border:'none', cursor:'pointer' }}>
          Lanjut · Continue
        </button>
        <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted, marginTop:10 }}>Auto-continues in a few seconds</div>
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
    <div style={{ position:'fixed', inset:0, background:C.bg, zIndex:8100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:32 }}>
      <div className="si">
        <div style={{ fontSize:64, marginBottom:16 }}>🙏</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(24px,3.5vw,34px)', fontWeight:800, color:C.text, marginBottom:8 }}>Terima Kasih! · Thank You!</div>
        <div style={{ fontSize:'clamp(13px,1.5vw,15px)', color:C.muted, marginBottom:32 }}>Sampai jumpa lagi di Bercut · See you again!</div>
        <button onClick={onDone}
          style={{ padding:'clamp(14px,2vh,18px) clamp(32px,4vw,48px)', borderRadius:12, fontSize:'clamp(15px,1.8vw,18px)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, background:C.accent, color:C.accentText, border:'none', cursor:'pointer' }}>
          Selesai · Done
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:C.bg, zIndex:8100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(16px,3vw,40px)', overflowY:'auto' }}>
      <div className="si" style={{ maxWidth:'clamp(360px,52vw,540px)', width:'100%', textAlign:'center' }}>

        <div style={{ width:60, height:60, background:C.accent, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto clamp(12px,1.8vh,18px)' }}>✓</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(20px,2.8vw,28px)', fontWeight:800, color:C.text, lineHeight:1.1, marginBottom:4 }}>Pembayaran Berhasil</div>
        <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.muted, marginBottom:4 }}>Payment Successful</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,26px)', fontWeight:800, color:C.text, marginBottom:4 }}>{fmt(grand)}</div>
        {booking && (
          <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted, marginBottom:'clamp(16px,2.4vh,24px)' }}>
            {booking.customer_name || booking.guest_name || 'Guest'} · ✂ {booking.barber_name}
          </div>
        )}

        <div style={{ width:'100%', height:1, background:C.border, marginBottom:'clamp(16px,2.4vh,24px)' }} />

        <div style={{ fontSize:'clamp(10px,1.2vw,12px)', letterSpacing:'0.16em', textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Bagaimana pengalamanmu? · How was your visit?</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,24px)', fontWeight:800, color:C.text, marginBottom:'clamp(12px,1.8vh,18px)' }}>Rate Your Visit</div>

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
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.9vw,19px)', fontWeight:700, color:C.text, marginBottom:'clamp(10px,1.4vh,14px)' }}>{LABELS[stars]}</div>
            {availTags.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'clamp(6px,1vw,10px)', justifyContent:'center', marginBottom:'clamp(12px,1.8vh,18px)' }}>
                {availTags.map(tag => (
                  <button key={tag.id} onClick={() => setTags(p => p.includes(tag.id) ? p.filter(x => x !== tag.id) : [...p, tag.id])}
                    style={{ padding:'clamp(8px,1.2vh,12px) clamp(14px,1.8vw,18px)', borderRadius:999, fontSize:'clamp(12px,1.4vw,14px)', fontWeight:600, cursor:'pointer', background:tags.includes(tag.id) ? C.accent : C.surface, color:tags.includes(tag.id) ? C.accentText : C.text2, border:`1.5px solid ${tags.includes(tag.id) ? C.accent : C.border}`, transition:'all 0.15s' }}>
                    {tag.label}
                  </button>
                ))}
              </div>
            )}
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Komentar tambahan (opsional) · Additional comments"
              style={{ width:'100%', padding:'clamp(10px,1.4vh,14px)', borderRadius:12, border:`1.5px solid ${C.border}`, fontSize:'clamp(13px,1.5vw,14px)', fontFamily:"'DM Sans',sans-serif", resize:'none', minHeight:70, background:C.surface, color:C.text, marginBottom:'clamp(12px,1.8vh,18px)', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor = C.topBg}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={stars > 0 ? handleSubmit : onDone} disabled={submitting}
            style={{ padding:'clamp(14px,2vh,18px)', borderRadius:12, fontSize:'clamp(14px,1.7vw,17px)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, background:C.accent, color:C.accentText, border:'none', cursor:'pointer' }}>
            {submitting ? 'Mengirim…' : stars > 0 ? 'Submit Review · Kirim Ulasan' : 'Done · Selesai'}
          </button>
          {stars > 0 && (
            <button onClick={onDone}
              style={{ padding:'clamp(10px,1.4vh,14px)', borderRadius:12, fontSize:'clamp(12px,1.4vw,14px)', fontFamily:"'DM Sans',sans-serif", fontWeight:500, background:'none', color:C.muted, border:'none', cursor:'pointer' }}>
              Lewati · Skip
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── QRIS Screen — QR code displayed on kiosk, customer scans with phone ────────
function QRISScreen({ qrString, qrId, bookingId, grand, expiresAt, onSuccess, onFail, onCancel }) {
  const [expired,  setExpired]  = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const doneRef = useRef(false)

  const succeed = () => { if (!doneRef.current) { doneRef.current = true; onSuccess() } }

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return
    const end = new Date(expiresAt).getTime()
    const tick = () => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000))
      setTimeLeft(left)
      if (left === 0) setExpired(true)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  // Poll Xendit QR status every 2s — COMPLETED means money moved
  useEffect(() => {
    if (!qrId || expired) return
    const poll = setInterval(async () => {
      try {
        const data = await kioskApi.get(`/payments/qris/${qrId}/status?booking_id=${bookingId}`)
        if (data.status === 'COMPLETED') { clearInterval(poll); succeed() }
        else if (data.status === 'EXPIRED') { clearInterval(poll); setExpired(true) }
      } catch { /* keep polling on network error */ }
    }, 2000)
    return () => clearInterval(poll)
  }, [qrId, expired]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll DB every 3s as backup — webhook updates DB faster than Xendit API reflects COMPLETED
  useEffect(() => {
    if (!bookingId || expired) return
    const poll = setInterval(async () => {
      try {
        const data = await kioskApi.get(`/bookings/${bookingId}`)
        if (data.payment_status === 'paid') { clearInterval(poll); succeed() }
      } catch { /* keep polling */ }
    }, 3000)
    return () => clearInterval(poll)
  }, [bookingId, expired]) // eslint-disable-line react-hooks/exhaustive-deps

  const qrImageUrl = qrString
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrString)}&size=260x260&margin=8`
    : null

  const mins = timeLeft != null ? Math.floor(timeLeft / 60) : null
  const secs = timeLeft != null ? String(timeLeft % 60).padStart(2, '0') : null

  return (
    <div style={{ position:'fixed', inset:0, background:C.bg, zIndex:8100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(20px,3vw,40px)', textAlign:'center' }}>
      <div style={{ maxWidth:480, width:'100%' }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(20px,2.8vw,28px)', fontWeight:800, color:C.text, marginBottom:4 }}>
          Scan to Pay
        </div>
        <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.muted, marginBottom:20 }}>
          Buka GoPay, OVO, Dana, atau app bank · Open any payment app
        </div>

        {/* QR code */}
        <div style={{ background:C.white, border:`3px solid ${expired ? C.border : C.accent}`, borderRadius:20, padding:16, display:'inline-block', marginBottom:16, position:'relative' }}>
          {expired ? (
            <div style={{ width:260, height:260, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:C.muted, gap:12 }}>
              <div style={{ fontSize:48 }}>⏱</div>
              <div style={{ fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:C.text }}>QR Expired</div>
              <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted }}>Go back and try again</div>
            </div>
          ) : qrImageUrl ? (
            <img src={qrImageUrl} alt="QRIS" width={260} height={260} style={{ display:'block', borderRadius:8 }} />
          ) : (
            <div style={{ width:260, height:260, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted }}>Loading…</div>
          )}
        </div>

        {/* Amount + timer */}
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(26px,4vw,38px)', fontWeight:800, color:C.text, marginBottom:4 }}>
          {fmt(grand)}
        </div>
        {timeLeft != null && !expired && (
          <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color: timeLeft < 60 ? C.danger : C.muted, fontWeight:600, marginBottom:16 }}>
            Expires in {mins}:{secs}
          </div>
        )}

        {/* App logos */}
        <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:24 }}>
          {['GoPay','OVO','Dana','BCA','BRI','Mandiri'].map(name => (
            <div key={name} style={{ fontSize:'clamp(10px,1.1vw,12px)', color:C.muted, background:C.surface, borderRadius:6, padding:'4px 8px', fontWeight:600 }}>{name}</div>
          ))}
        </div>

        <button onClick={onCancel}
          style={{ padding:'clamp(12px,1.8vh,16px) clamp(28px,3.5vw,40px)', borderRadius:12, background:'none', border:`1.5px solid ${C.border}`, color:C.muted, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(13px,1.5vw,15px)', fontWeight:600, cursor:'pointer' }}>
          ← Back · Kembali
        </button>
      </div>
    </div>
  )
}

// ── PIN Overlay — staff-only gate ─────────────────────────────────────────────
function PinOverlay({ adminPin, onSuccess, onClose }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const KEYS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']]

  const press = (k) => {
    if (k === '⌫') { setError(false); setPin(p => p.slice(0, -1)); return }
    if (!k) return
    const next = pin + k
    setPin(next)
    setError(false)
    if (next.length === 4) {
      if (next === String(adminPin)) { onSuccess() }
      else { setError(true); setTimeout(() => { setPin(''); setError(false) }, 600) }
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:C.white, borderRadius:20, padding:'clamp(24px,3.5vw,36px)', width:'clamp(280px,36vw,340px)', textAlign:'center' }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:'clamp(16px,2.2vw,20px)', color:C.text, marginBottom:6 }}>Staff PIN</div>
        <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted, marginBottom:20 }}>Enter admin PIN to continue</div>
        <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:20 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width:14, height:14, borderRadius:'50%', background: i < pin.length ? (error ? '#ef5350' : C.accent) : C.border, transition:'background 0.15s' }} />
          ))}
        </div>
        {KEYS.map((row, ri) => (
          <div key={ri} style={{ display:'flex', gap:8, marginBottom:8 }}>
            {row.map((k, ki) => (
              <button key={ki} onClick={() => press(k)} disabled={!k}
                style={{ flex:1, height:'clamp(44px,6vh,56px)', borderRadius:10, border:'none', fontSize:k === '⌫' ? 18 : 'clamp(18px,2.4vw,24px)', fontWeight:700, fontFamily:"'Inter',sans-serif", background:k ? C.surface : 'transparent', color:k ? C.text : 'transparent', cursor:k ? 'pointer' : 'default', opacity:k ? 1 : 0 }}>
                {k}
              </button>
            ))}
          </div>
        ))}
        <button onClick={onClose} style={{ marginTop:8, width:'100%', background:'none', border:'none', color:C.muted, fontSize:'clamp(12px,1.4vw,14px)', cursor:'pointer', padding:'8px' }}>
          Batal · Cancel
        </button>
      </div>
    </div>
  )
}

// ── Awaiting Terminal Screen — display only, polling lives in parent ───────────
function AwaitingTerminalScreen({ method, grand, elapsed, onBack, onManualOverride }) {
  return (
    <div style={{ position:'fixed', inset:0, background:C.bg, zIndex:8100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(24px,4vw,56px)', textAlign:'center' }}>
      <div style={{ maxWidth:460, width:'100%' }}>
        <div style={{ width:80, height:80, borderRadius:'50%', background:C.surface, border:`2px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 28px' }}>
          💳
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(22px,3.2vw,30px)', fontWeight:800, color:C.text, marginBottom:8 }}>
          Use Terminal at the Counter
        </div>
        <div style={{ fontSize:'clamp(13px,1.6vw,15px)', color:C.text2, marginBottom:6 }}>
          Tap atau masukkan kartu pada terminal
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(28px,4.5vw,40px)', fontWeight:800, color:C.text, margin:'28px 0 32px' }}>
          {fmt(grand)}
        </div>

        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:32 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:C.accent, animation:`pulse 1.2s ease-in-out ${i*0.4}s infinite` }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.25;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>

        <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted, marginBottom:32 }}>
          Waiting for payment confirmation… {elapsed > 0 ? `(${elapsed}s)` : ''}
        </div>

        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={onBack}
            style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:'clamp(10px,1.4vh,13px) clamp(20px,2.8vw,28px)', color:C.text2, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(12px,1.4vw,14px)', fontWeight:600, cursor:'pointer' }}>
            ← Kembali · Back
          </button>
          <button onClick={onManualOverride}
            style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:'clamp(10px,1.4vh,13px) clamp(20px,2.8vw,28px)', color:C.text2, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(12px,1.4vw,14px)', fontWeight:600, cursor:'pointer' }}>
            Bayar Manual · Staff Override
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Payment Failed Screen ──────────────────────────────────────────────────────
function PaymentFailedScreen({ method, onRetry, onSwitchMethod, adminPin, onManualOverride }) {
  const [notified,  setNotified]  = useState(false)
  const [showPin,   setShowPin]   = useState(false)
  return (
    <>
      <div style={{ position:'fixed', inset:0, background:C.bg, zIndex:8100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(24px,4vw,56px)', textAlign:'center' }}>
        <div style={{ width:80, height:80, borderRadius:'50%', background:'#fdecea', border:'2px solid #ef9a9a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, marginBottom:28 }}>✕</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(22px,3.2vw,30px)', fontWeight:800, color:C.text, marginBottom:8 }}>Payment Unsuccessful</div>
        <div style={{ fontSize:'clamp(13px,1.6vw,15px)', color:C.text2, marginBottom:6 }}>Pembayaran tidak berhasil</div>
        <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted, marginBottom:40, maxWidth:380 }}>
          {method === 'qris' ? 'QRIS transaction could not be completed.' : 'Card terminal did not confirm payment.'} Your booking is still held.
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:400 }}>
          <button onClick={onRetry}
            style={{ width:'100%', padding:'clamp(15px,2.2vh,19px)', borderRadius:14, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(15px,1.8vw,18px)', fontWeight:700, border:'none', cursor:'pointer' }}>
            Try Again · Coba Lagi
          </button>
          <button onClick={onSwitchMethod}
            style={{ width:'100%', padding:'clamp(13px,1.9vh,17px)', borderRadius:14, background:C.white, color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(14px,1.6vw,16px)', fontWeight:600, border:`1.5px solid ${C.border}`, cursor:'pointer' }}>
            {method === 'qris' ? 'Try Card Instead · Coba Kartu' : 'Try QRIS Instead · Coba QRIS'}
          </button>
          {onManualOverride && (
            <button onClick={() => setShowPin(true)}
              style={{ width:'100%', padding:'clamp(13px,1.9vh,17px)', borderRadius:14, background:'#fff8e1', color:'#7c5800', fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(14px,1.6vw,16px)', fontWeight:700, border:'1.5px solid #f9a825', cursor:'pointer', transition:'all 0.2s' }}>
              🔑 Staff Override · Konfirmasi Staff
            </button>
          )}
          <button onClick={() => setNotified(true)} disabled={notified}
            style={{ width:'100%', padding:'clamp(13px,1.9vh,17px)', borderRadius:14, background:notified ? '#f0faf4' : '#fdecea', color:notified ? '#2e7d32' : '#c62828', fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(14px,1.6vw,16px)', fontWeight:700, border:`1.5px solid ${notified ? '#a5d6a7' : '#ef9a9a'}`, cursor:notified ? 'default' : 'pointer', transition:'all 0.2s' }}>
            {notified ? '✓ Staff Notified — Please Wait' : '⚠ Contact Staff · Hubungi Staff'}
          </button>
        </div>
      </div>
      {showPin && (
        <PinOverlay
          adminPin={adminPin}
          onSuccess={() => { setShowPin(false); onManualOverride() }}
          onClose={() => setShowPin(false)}
        />
      )}
    </>
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
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'clamp(10px,1.4vw,14px)', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:8, borderBottom:`1px solid ${C.border}`, marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, color:C.text, fontSize:'clamp(13px,1.6vw,16px)' }}>{customerName}</div>
          {bk.barber_name && <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted, marginTop:1 }}>✂ {bk.barber_name}</div>}
          {serviceNames && <div style={{ fontSize:'clamp(10px,1.1vw,11px)', color:C.muted, marginTop:1 }}>{serviceNames}</div>}
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,16px)', fontWeight:700, color:C.text }}>
          {fmt(rowTotal)}
        </div>
      </div>
      <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.text, fontWeight:700, fontFamily:"'Inter',sans-serif", marginBottom:8 }}>
        Leave a tip for {bk.barber_name || 'your barber'}? 🙌
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'nowrap' }}>
        {tipPresets.map(t => (
          <button key={t} onClick={() => currentTip === t ? clearTip() : setTip(t)}
            style={{ flex:1, padding:'clamp(7px,1vh,10px) 0', borderRadius:9, fontSize:'clamp(11px,1.4vw,13px)', fontFamily:"'Inter',sans-serif", fontWeight:800, background:currentTip === t ? C.accent : C.white, color:currentTip === t ? C.accentText : C.text, border:`2px solid ${currentTip === t ? C.accent : C.border}`, transition:'all 0.15s', cursor:'pointer' }}>
            {fmtK(t)}
          </button>
        ))}
        <button onClick={() => setShowNumpad(p => !p)}
          style={{ flex:1, padding:'clamp(7px,1vh,10px) 0', borderRadius:9, fontSize:'clamp(10px,1.2vw,12px)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, background:showNumpad ? C.accent : C.white, color:showNumpad ? C.accentText : C.text2, border:`2px solid ${showNumpad ? C.accent : C.border}`, cursor:'pointer' }}>
          {currentTip && !tipPresets.includes(currentTip) && currentTip !== 'none' ? fmt(currentTip) : 'Custom'}
        </button>
        <button onClick={() => { setGroupTips(prev => ({ ...prev, [bk.id]: 'none' })); setShowNumpad(false); setCustomVal('') }}
          style={{ flex:1, padding:'clamp(7px,1vh,10px) 0', borderRadius:9, fontSize:'clamp(10px,1.2vw,12px)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, background:currentTip === 'none' ? C.surface2 : C.white, color:C.text2, border:`2px solid ${currentTip === 'none' ? C.text2 : C.border}`, cursor:'pointer', transition:'all 0.15s' }}>
          No Tip
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
        </div>
      )}
    </div>
  )
}

// ── Payment Method Panel (shared) ─────────────────────────────────────────────
function PaymentMethodPanel({ method, setMethod, grand, confirming, isPointsCovered, onConfirm, confirmLabel, terminalSession }) {
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!terminalSession?.expiresAt) { setTimeLeft(null); return }
    const tick = () => {
      const left = Math.max(0, Math.round((terminalSession.expiresAt - Date.now()) / 1000))
      setTimeLeft(left)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [terminalSession?.expiresAt])

  const sessionActive = terminalSession && timeLeft !== null && timeLeft > 0
  const sessionMethod = terminalSession?.method
  const sessionMins   = timeLeft != null ? Math.floor(timeLeft / 60) : 0
  const sessionSecs   = timeLeft != null ? String(timeLeft % 60).padStart(2, '0') : '00'

  const isBlocked = (m) => sessionActive && m !== sessionMethod

  return (
    <div style={{ width:'clamp(260px,30vw,370px)', borderLeft:`1px solid ${C.border}`, background:C.white, padding:'clamp(18px,2.6vw,28px)', display:'flex', flexDirection:'column', flexShrink:0 }}>
      {isPointsCovered ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', gap:14 }}>
          <div style={{ fontSize:44 }}>⭐</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2.2vw,22px)', fontWeight:800, color:'#2e7d32' }}>Fully Covered by Points!</div>
          <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted }}>No payment needed · Tidak perlu bayar</div>
        </div>
      ) : (
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', marginBottom:14 }}>
          <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, letterSpacing:'0.14em', color:C.muted, textTransform:'uppercase', marginBottom:14 }}>Payment Method</div>

          {/* QRIS — always available */}
          <div onClick={() => setMethod('qris')} style={{ background:method === 'qris' ? C.surface : C.bg, border:`2px solid ${method === 'qris' ? C.accent : C.border}`, borderRadius:14, padding:'clamp(14px,2vw,20px)', cursor:'pointer', marginBottom:10, transition:'all 0.18s' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:42, height:42, background:method === 'qris' ? C.accent : C.surface2, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>⬛</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2.2vw,22px)', fontWeight:700, color:C.text }}>QRIS</div>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted }}>Scan QR on this screen · GoPay · OVO · Dana</div>
              </div>
              {method === 'qris' && <div style={{ width:20, height:20, background:C.accent, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:C.accentText, flexShrink:0 }}>✓</div>}
            </div>
          </div>

          {/* Card — insert */}
          <div onClick={() => !isBlocked('card') && setMethod('card')}
            style={{ background:method === 'card' ? C.surface : C.bg, border:`2px solid ${method === 'card' ? C.accent : C.border}`, borderRadius:14, padding:'clamp(14px,2vw,20px)', cursor:isBlocked('card') ? 'not-allowed' : 'pointer', marginBottom:10, transition:'all 0.18s', opacity:isBlocked('card') ? 0.38 : 1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:42, height:42, background:method === 'card' ? C.accent : C.surface2, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>💳</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2.2vw,22px)', fontWeight:700, color:C.text }}>Card</div>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted }}>
                  {isBlocked('card') ? 'Mohon tunggu · Please wait' : 'Insert or Swipe'}
                </div>
              </div>
              {method === 'card' && <div style={{ width:20, height:20, background:C.accent, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:C.accentText, flexShrink:0 }}>✓</div>}
            </div>
          </div>

          {/* Tap — contactless */}
          <div onClick={() => !isBlocked('tap') && setMethod('tap')}
            style={{ background:method === 'tap' ? C.surface : C.bg, border:`2px solid ${method === 'tap' ? C.accent : C.border}`, borderRadius:14, padding:'clamp(14px,2vw,20px)', cursor:isBlocked('tap') ? 'not-allowed' : 'pointer', transition:'all 0.18s', opacity:isBlocked('tap') ? 0.38 : 1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:42, height:42, background:method === 'tap' ? C.accent : C.surface2, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📲</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2.2vw,22px)', fontWeight:700, color:C.text }}>
                  Tap {sessionActive && sessionMethod === 'tap' ? <span style={{ fontSize:'clamp(12px,1.4vw,14px)', color: timeLeft < 20 ? C.danger : C.muted, fontWeight:600 }}>({sessionMins}:{sessionSecs})</span> : null}
                </div>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted }}>
                  {isBlocked('tap') ? 'Mohon tunggu · Please wait' : 'Contactless card · Phone · Watch'}
                </div>
              </div>
              {method === 'tap' && <div style={{ width:20, height:20, background:C.accent, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:C.accentText, flexShrink:0 }}>✓</div>}
            </div>
          </div>
        </div>
      )}

      {/* Total hero — sits above confirm button, always visible */}
      {!isPointsCovered && (
        <div style={{ textAlign:'center', padding:'clamp(12px,1.8vh,18px) 0', borderTop:`1px solid ${C.border}`, marginBottom:'clamp(10px,1.4vh,14px)', flexShrink:0 }}>
          <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, letterSpacing:'0.14em', color:C.muted, textTransform:'uppercase', marginBottom:4 }}>Total to Pay</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(28px,4vw,44px)', fontWeight:800, color:C.text, lineHeight:1 }}>{fmt(grand)}</div>
        </div>
      )}

      <button onClick={onConfirm} disabled={(!method && !isPointsCovered) || confirming}
        style={{ width:'100%', background:(!method && !isPointsCovered) || confirming ? C.surface2 : C.accent, color:(!method && !isPointsCovered) || confirming ? C.muted : C.accentText, padding:'clamp(15px,2.2vh,19px)', borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(14px,1.8vw,17px)', fontWeight:700, border:'none', cursor:(!method && !isPointsCovered) || confirming ? 'not-allowed' : 'pointer', flexShrink:0, transition:'all 0.2s' }}>
        {confirming ? 'Processing…' : confirmLabel || (isPointsCovered ? 'Confirm & Complete ✓' : method === 'qris' ? 'Confirm QRIS Payment ✓' : method === 'card' ? 'Confirm Card Payment ✓' : method === 'tap' ? 'Confirm Tap Payment ✓' : 'Select Payment Method')}
      </button>
    </div>
  )
}

// ── Main PaymentTakeover ───────────────────────────────────────────────────────
export default function PaymentTakeover({ bookingData, branchId, feedbackTags = [], settings = {}, refreshKey = 0, onDone }) {
  const isGroup   = !!(bookingData?.group_id)
  const groupId   = bookingData?.group_id
  const bookingId = bookingData?.booking_id || bookingData?.id

  const [booking,          setBooking]          = useState(null)
  const [groupBks,         setGroupBks]         = useState([])
  const [phase,            setPhase]            = useState('loading')
  const [method,           setMethod]           = useState(null)
  const [tip,              setTip]              = useState(null)
  const [customTip,        setCustomTip]        = useState('')
  const [groupTips,        setGroupTips]        = useState({})
  const [confirming,       setConfirming]       = useState(false)
  const [sessionId,        setSessionId]        = useState(null)
  const [sessionMethod,    setSessionMethod]    = useState(null)   // 'card' | 'tap'
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null)  // timestamp ms
  const [sessionElapsed,   setSessionElapsed]   = useState(0)
  const [qrData,           setQrData]           = useState(null)
  const [showPin,          setShowPin]          = useState(false)

  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // Elapsed timer for awaiting_terminal display
  useEffect(() => {
    if (phase !== 'awaiting_terminal') { setSessionElapsed(0); return }
    const t = setInterval(() => setSessionElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  // Terminal session polling — lives here so it continues even when user goes back
  useEffect(() => {
    if (!sessionId) return
    const poll = setInterval(async () => {
      try {
        const data = await kioskApi.get(`/payments/terminal/session/${sessionId}/status`)
        if (data.status === 'COMPLETED') {
          clearInterval(poll)
          setPhase('receipt')
        } else if (data.status === 'FAILED' || data.status === 'CANCELED') {
          clearInterval(poll)
          setSessionId(null); setSessionMethod(null); setSessionExpiresAt(null)
          if (phaseRef.current === 'awaiting_terminal') setPhase('failed')
          // if on payment screen (user went back), just silently clear so methods unlock
        }
      } catch { /* keep polling on network error */ }
    }, 3000)
    return () => clearInterval(poll)
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const tipPresets = settings.tipPresets || [10000, 20000, 50000, 100000]

  useEffect(() => {
    if (phase === 'receipt' || phase === 'failed') return
    if (isGroup && groupId) {
      kioskApi.get(`/booking-groups/${groupId}`)
        .then(data => { setGroupBks(data); setPhase('payment') })
        .catch(() => setPhase('payment'))
    } else if (bookingId) {
      kioskApi.get(`/bookings/${bookingId}`)
        .then(data => { setBooking(data); setPhase('payment') })
        .catch(() => setPhase('payment'))
    }
  }, [isGroup, groupId, bookingId, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const amount    = parseFloat(booking?.total_amount ?? bookingData?.amount ?? 0)
  const tipAmount = tip === 'custom' ? (parseInt(customTip.replace(/\D/g, ''), 10) || 0) : (typeof tip === 'number' ? tip : 0)
  const grand     = amount + tipAmount
  const isPointsCovered = amount <= 0 && booking

  const groupSubtotal  = groupBks.reduce((s, bk) => s + parseFloat(bk.total_amount || 0), 0)
  const groupTipsTotal = Object.values(groupTips).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const groupGrand     = groupSubtotal + groupTipsTotal

  const handleConfirmSingle = async () => {
    if (!method && !isPointsCovered) return
    setConfirming(true)
    try {
      // Points or cash → manual confirm
      if (isPointsCovered || method === 'cash') {
        await kioskApi.post('/payments/manual-confirm', {
          booking_id:     bookingId,
          payment_method: isPointsCovered ? 'points' : 'cash',
          tip_amount:     tipAmount || undefined
        })
        setPhase('receipt')
        return
      }

      // QRIS → show QR code on kiosk screen
      if (method === 'qris') {
        const res = await kioskApi.post('/payments/qris/session', {
          booking_id: bookingId,
          tip_amount: tipAmount || 0
        })
        setQrData({ qr_id: res.qr_id, qr_string: res.qr_string, expires_at: res.expires_at })
        setPhase('awaiting_qris')
        return
      }

      // Card / Tap → Xendit terminal session (EDC)
      const terminalId = settings.xenditTerminalId
      if (!terminalId) {
        await kioskApi.post('/payments/manual-confirm', {
          booking_id: bookingId, payment_method: 'card', tip_amount: tipAmount || undefined
        })
        setPhase('receipt')
        return
      }

      // Resume existing active session if same method — no API call needed
      if (sessionId && sessionMethod === method && sessionExpiresAt && Date.now() < sessionExpiresAt) {
        setPhase('awaiting_terminal')
        return
      }

      const res = await kioskApi.post('/payments/terminal/session', {
        booking_id:     bookingId,
        tip_amount:     tipAmount || 0,
        payment_method: method,
        terminal_id:    terminalId
      })
      setSessionId(res.session_id)
      setSessionMethod(method)
      setSessionExpiresAt(Date.now() + 60 * 1000)
      setPhase('awaiting_terminal')
    } catch (err) {
      if (err?.status === 409) setPhase('receipt')
      else setPhase('failed')
    }
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
    } catch (err) {
      if (err?.status === 409) setPhase('receipt')
      else setPhase('failed')
    }
    finally { setConfirming(false) }
  }

  const handleManualOverridePinSuccess = async () => {
    setShowPin(false)
    setConfirming(true)
    try {
      await kioskApi.post('/payments/manual-confirm', {
        booking_id:     bookingId,
        payment_method: 'manual_card',
        tip_amount:     undefined
      })
      setPhase('receipt')
    } catch (err) {
      if (err?.status === 409) setPhase('receipt')
      else setPhase('failed')
    }
    finally { setConfirming(false) }
  }

  const firstBk    = isGroup ? groupBks[0] : booking
  const headerName = isGroup
    ? `Group · ${groupBks.length} people`
    : (booking?.customer_name || booking?.guest_name || 'Guest')

  if (phase === 'receipt') return <ReceiptScreen booking={firstBk} grand={isGroup ? groupGrand : grand} onNext={onDone} />
  if (phase === 'awaiting_qris') return (
    <QRISScreen
      qrString={qrData?.qr_string}
      qrId={qrData?.qr_id}
      bookingId={bookingId}
      grand={isGroup ? groupGrand : grand}
      expiresAt={qrData?.expires_at}
      onSuccess={() => setPhase('receipt')}
      onFail={() => setPhase('failed')}
      onCancel={() => { setQrData(null); setPhase('payment') }}
    />
  )
  if (phase === 'awaiting_terminal') return (
    <>
      <AwaitingTerminalScreen
        method={method}
        grand={isGroup ? groupGrand : grand}
        elapsed={sessionElapsed}
        onBack={() => setPhase('payment')}
        onManualOverride={() => setShowPin(true)}
      />
      {showPin && (
        <PinOverlay
          adminPin={settings.kioskAdminPin || '1234'}
          onSuccess={handleManualOverridePinSuccess}
          onClose={() => setShowPin(false)}
        />
      )}
    </>
  )
  if (phase === 'failed')  return (
    <PaymentFailedScreen
      method={method}
      onRetry={() => setPhase('payment')}
      onSwitchMethod={() => { setMethod(method === 'qris' ? 'card' : 'qris'); setPhase('payment') }}
      adminPin={settings.kioskAdminPin || '1234'}
      onManualOverride={handleManualOverridePinSuccess}
    />
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:8000, background:C.bg, display:'flex', flexDirection:'column' }}>

      {/* Header — dark topbar, consistent with all kiosk screens */}
      <div style={{ background:C.topBg, padding:'0 clamp(20px,3vw,32px)', height:'clamp(52px,6.5vh,62px)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height:'clamp(22px,3vh,30px)', width:'auto', objectFit:'contain' }} />
          <span style={{ color:'#888', fontSize:'clamp(11px,1.3vw,13px)' }}>Payment</span>
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,18px)', fontWeight:700, color:C.topText }}>
          {phase !== 'loading' ? headerName : ''}
        </div>
      </div>

      {/* Loading */}
      {phase === 'loading' && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, fontSize:'clamp(14px,1.6vw,16px)' }}>
          Loading…
        </div>
      )}

      {/* Payment Phase — Group */}
      {phase === 'payment' && isGroup && (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'clamp(18px,2.6vw,28px)' }}>
            <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, letterSpacing:'0.14em', color:C.muted, textTransform:'uppercase', marginBottom:14 }}>
              Group Order — {groupBks.length} Bookings
            </div>

            {groupBks.map(bk => (
              <GroupTipRow key={bk.id} bk={bk} tipPresets={tipPresets} groupTips={groupTips} setGroupTips={setGroupTips} />
            ))}

            {/* Grand total */}
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'clamp(12px,1.6vw,18px)', marginTop:10 }}>
              {groupTipsTotal > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.muted }}>Tips Total 🙌</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:C.text }}>{fmt(groupTipsTotal)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,18px)', fontWeight:800, color:C.text }}>TOTAL</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(26px,3.8vw,36px)', fontWeight:800, color:C.text }}>{fmt(groupGrand)}</span>
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
            confirmLabel={method === 'qris' ? 'Confirm QRIS Payment ✓' : method === 'card' ? 'Confirm Card Payment ✓' : method === 'tap' ? 'Confirm Tap Payment ✓' : 'Select Payment Method'}
            terminalSession={sessionId ? { method: sessionMethod, expiresAt: sessionExpiresAt } : null}
          />
        </div>
      )}

      {/* Payment Phase — Single */}
      {phase === 'payment' && !isGroup && (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Left — order summary + tip */}
          <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'clamp(18px,2.6vw,28px)' }}>
            <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, letterSpacing:'0.14em', color:C.muted, textTransform:'uppercase', marginBottom:14 }}>Order Summary</div>

            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'clamp(14px,2vw,20px)', marginBottom:'clamp(16px,2.2vw,22px)' }}>

              {/* Customer + barber */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:'clamp(10px,1.4vh,14px)', borderBottom:`1px solid ${C.border}`, marginBottom:'clamp(10px,1.4vh,14px)' }}>
                <div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, color:C.text, fontSize:'clamp(14px,1.8vw,17px)' }}>{booking?.customer_name || booking?.guest_name || 'Guest'}</div>
                  {booking?.barber_name && <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted, marginTop:2 }}>✂ {booking.barber_name}</div>}
                </div>
                {booking?.slot_time && <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted }}>{booking.slot_time}</div>}
              </div>

              {/* Services */}
              {(booking?.services || []).map((s, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(7px,1vh,10px) 0', borderBottom:`1px solid ${C.surface}` }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:C.text, fontFamily:"'Inter',sans-serif" }}>{s.name}</div>
                      {s.added_mid_cut && <div style={{ background:'#fffbea', border:'1px solid #c9a050', color:'#92660a', fontSize:'clamp(8px,1vw,10px)', fontWeight:700, padding:'1px 6px', borderRadius:4 }}>+ ADDED</div>}
                    </div>
                    {s.duration_min > 0 && <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted }}>{s.duration_min} min</div>}
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,17px)', fontWeight:700, color:s.added_mid_cut ? '#92660a' : C.text }}>{fmt(s.price)}</div>
                </div>
              ))}

              {/* Extras */}
              {(booking?.extras || []).map((e, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(7px,1vh,10px) 0', borderBottom:`1px solid ${C.surface}` }}>
                  <div style={{ fontSize:'clamp(13px,1.6vw,15px)', fontWeight:600, color:C.text2 }}>{e.name}{e.qty > 1 ? ` ×${e.qty}` : ''}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:C.text2 }}>{fmt(e.price)}</div>
                </div>
              ))}

              {/* Points discount */}
              {booking?.points_redeemed > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', padding:'clamp(7px,1vh,10px) 0', borderBottom:`1px solid ${C.surface}` }}>
                  <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#2e7d32' }}>⭐ Points Redeemed</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:'#2e7d32' }}>−{fmt(booking.points_redeemed)}</div>
                </div>
              )}

              {/* Tip row — always rendered to reserve space; invisible until tip is selected */}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'clamp(7px,1vh,10px) 0', borderBottom:`1px solid ${C.surface}`, opacity:tipAmount > 0 ? 1 : 0, transition:'opacity 0.2s' }}>
                <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.muted }}>Tip 🙌</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:C.text }}>{tipAmount > 0 ? fmt(tipAmount) : ''}</div>
              </div>

              {/* Grand total — updates live as tip changes */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:14 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,18px)', fontWeight:800, color:C.text }}>TOTAL</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(26px,3.8vw,36px)', fontWeight:800, color:C.text }}>{fmt(grand)}</span>
              </div>
            </div>

            {/* Tip section */}
            {!isPointsCovered && (
              <div style={{ background:'#FEFDE8', border:`2px solid ${C.accent}`, borderRadius:16, padding:'clamp(16px,2.2vw,24px)' }}>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:'clamp(14px,1.7vw,17px)', color:C.text, fontWeight:800, fontFamily:"'Inter',sans-serif" }}>
                    Leave a tip for {booking?.barber_name || 'your barber'}? 🙌
                  </div>
                  <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted, marginTop:3 }}>100% goes directly to your barber</div>
                </div>

                {tip === 'custom' ? (
                  <>
                    <TipNumpad value={customTip} onChange={setCustomTip} />
                    <button onClick={() => { setTip(null); setCustomTip('') }}
                      style={{ marginTop:8, width:'100%', background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'clamp(8px,1.2vh,11px)', color:C.muted, fontSize:'clamp(11px,1.3vw,13px)', fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>
                      ← Back to tip options
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display:'flex', gap:8, flexWrap:'nowrap' }}>
                      {tipPresets.map(t => (
                        <button key={t} onClick={() => { setTip(prev => prev === t ? null : t); setCustomTip('') }}
                          style={{ flex:1, padding:'clamp(10px,1.4vh,14px) 0', borderRadius:12, fontSize:'clamp(13px,1.7vw,15px)', fontFamily:"'Inter',sans-serif", fontWeight:800, background:tip === t ? C.accent : C.white, color:tip === t ? C.accentText : C.text, border:`2px solid ${tip === t ? C.accent : C.border}`, transition:'all 0.15s', cursor:'pointer' }}>
                          {fmtK(t)}
                        </button>
                      ))}
                      <button onClick={() => setTip('custom')}
                        style={{ flex:1, padding:'clamp(10px,1.4vh,14px) 0', borderRadius:12, fontSize:'clamp(12px,1.5vw,13px)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, background:C.white, color:C.text2, border:`2px solid ${C.border}`, cursor:'pointer' }}>
                        Custom
                      </button>
                      <button onClick={() => { setTip('none'); setCustomTip('') }}
                        style={{ flex:1, padding:'clamp(10px,1.4vh,14px) 0', borderRadius:12, fontSize:'clamp(12px,1.5vw,13px)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, background:tip === 'none' ? C.surface2 : C.white, color:C.text2, border:`2px solid ${tip === 'none' ? C.text2 : C.border}`, cursor:'pointer', transition:'all 0.15s' }}>
                        No Tip
                      </button>
                    </div>
                    {tipAmount > 0 && (
                      <div style={{ marginTop:10, fontSize:'clamp(12px,1.4vw,13px)', color:C.text, fontWeight:700, textAlign:'center', fontFamily:"'Inter',sans-serif" }}>
                        +{fmt(tipAmount)} added ✓
                      </div>
                    )}
                  </>
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
            terminalSession={sessionId ? { method: sessionMethod, expiresAt: sessionExpiresAt } : null}
          />
        </div>
      )}
    </div>
  )
}
