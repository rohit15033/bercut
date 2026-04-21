import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

const TIP_PRESETS = [10000, 20000, 50000]

export default function PaymentTakeover({ bookingData, branchId, feedbackTags = [], settings = {}, onDone }) {
  const [booking, setBooking]   = useState(null)
  const [phase,   setPhase]     = useState('loading') // loading | payment | tip | review | receipt
  const [tip,     setTip]       = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [rating,  setRating]    = useState(0)
  const [comment, setComment]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  const bookingId = bookingData?.booking_id || bookingData?.id

  // Load full booking details
  useEffect(() => {
    if (!bookingId) return
    kioskApi.get(`/bookings/${bookingId}`)
      .then(data => { setBooking(data); setPhase('payment') })
      .catch(() => setPhase('payment'))
  }, [bookingId])

  const amount = parseFloat(booking?.total_amount || bookingData?.amount || 0)
  const tipAmount = customTip ? parseInt(customTip.replace(/\D/g, ''), 10) || 0 : tip

  const handlePaymentDone = () => setPhase('tip')

  const handleTipContinue = async () => {
    if (tipAmount > 0 && booking) {
      try {
        await kioskApi.post('/payments/tip', { booking_id: booking.id, amount: tipAmount })
      } catch { /* non-critical */ }
    }
    setPhase('review')
  }

  const handleSubmitReview = async () => {
    setSubmitting(true)
    try {
      if (rating > 0 && booking) {
        await kioskApi.post(`/bookings/${booking.id}/rate`, {
          rating, feedback_tag_ids: selectedTags, comment: comment || undefined
        })
      }
      setPhase('receipt')
    } catch { setPhase('receipt') }
    finally { setSubmitting(false) }
  }

  const totalPaid = amount + tipAmount

  return (
    <div style={{ position:'fixed', inset:0, zIndex:8000, background:C.topBg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(24px,4vw,48px)' }}>

      {/* PAYMENT PHASE */}
      {(phase === 'loading' || phase === 'payment') && (
        <div className="si" style={{ maxWidth:'clamp(360px,52vw,520px)', width:'100%', textAlign:'center' }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height:'clamp(26px,3.5vh,36px)', width:'auto', objectFit:'contain', marginBottom:8 }} />
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:'clamp(22px,3.5vw,36px)', color:C.white, marginBottom:4 }}>Payment Time</div>
          <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#888', marginBottom:'clamp(20px,3vh,32px)' }}>Tap or insert card · Ketuk atau masukkan kartu</div>

          {/* Amount */}
          <div style={{ background:'#1a1a18', borderRadius:18, padding:'clamp(24px,3.5vw,40px)', marginBottom:'clamp(18px,2.4vh,28px)' }}>
            <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#666', marginBottom:8 }}>Total amount · Jumlah total</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(44px,7vw,72px)', fontWeight:900, color:C.accent, letterSpacing:'-0.03em', lineHeight:1 }}>{fmt(amount)}</div>
            {booking?.barber_name && (
              <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#555', marginTop:8 }}>
                {booking.customer_name || 'Guest'} · {booking.barber_name}
              </div>
            )}
          </div>

          {/* Payment methods */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:'clamp(18px,2.4vh,28px)' }}>
            {[{ icon:'💳', label:'Card / Kartu', sub:'Tap or insert' }, { icon:'📱', label:'QRIS', sub:'Scan QR code' }].map(m => (
              <div key={m.label} style={{ background:'#1a1a18', border:`1px solid #2a2a28`, borderRadius:14, padding:'clamp(16px,2.2vw,22px)', textAlign:'center' }}>
                <div style={{ fontSize:'clamp(24px,3.5vw,36px)', marginBottom:6 }}>{m.icon}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'clamp(13px,1.5vw,16px)', color:C.white }}>{m.label}</div>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#555', marginTop:2 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          <button onClick={handlePaymentDone}
            style={{ width:'100%', padding:'clamp(16px,2.2vw,20px)', borderRadius:12, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'clamp(15px,1.8vw,18px)', border:'none', cursor:'pointer' }}>
            Payment Received ✓ · Pembayaran Diterima
          </button>
        </div>
      )}

      {/* TIP PHASE */}
      {phase === 'tip' && (
        <div className="si" style={{ maxWidth:'clamp(360px,52vw,480px)', width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:'clamp(32px,5vw,52px)', marginBottom:12 }}>🙏</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:'clamp(22px,3vw,30px)', color:C.white, marginBottom:6 }}>Leave a Tip?</div>
          <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#888', marginBottom:'clamp(20px,3vh,28px)' }}>Beri tip untuk barber Anda · Optional</div>

          <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:16, flexWrap:'wrap' }}>
            {(settings.tip_presets || TIP_PRESETS).map(t => (
              <button key={t} onClick={() => { setTip(t); setCustomTip('') }}
                style={{ padding:'clamp(12px,1.6vw,16px) clamp(20px,2.8vw,28px)', borderRadius:12, background:tip === t && !customTip ? C.accent : '#1a1a18', color:tip === t && !customTip ? C.accentText : C.white, fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'clamp(14px,1.8vw,18px)', border:`1.5px solid ${tip === t && !customTip ? C.accent : '#2a2a28'}`, cursor:'pointer' }}>
                {fmt(t)}
              </button>
            ))}
          </div>

          <input value={customTip} onChange={e => { setCustomTip(e.target.value); setTip(0) }}
            placeholder="Custom amount · Jumlah lain"
            inputMode="numeric"
            style={{ width:'100%', padding:'clamp(12px,1.6vw,16px) 16px', borderRadius:12, border:`1.5px solid #2a2a28`, background:'#1a1a18', color:C.white, fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(14px,1.7vw,16px)', textAlign:'center', marginBottom:16 }} />

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={handleTipContinue}
              style={{ width:'100%', padding:'clamp(14px,2vw,18px)', borderRadius:12, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'clamp(14px,1.8vw,17px)', border:'none', cursor:'pointer' }}>
              {tipAmount > 0 ? `Add ${fmt(tipAmount)} tip & Continue →` : 'No tip · Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* REVIEW PHASE */}
      {phase === 'review' && (
        <div className="si" style={{ maxWidth:'clamp(360px,52vw,520px)', width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:'clamp(32px,5vw,48px)', marginBottom:12 }}>⭐</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:'clamp(22px,3vw,30px)', color:C.white, marginBottom:6 }}>How was your experience?</div>
          <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#888', marginBottom:'clamp(20px,3vh,28px)' }}>Bagaimana pengalaman Anda?</div>

          {/* Star rating */}
          <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:'clamp(16px,2.2vh,22px)' }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setRating(s)}
                style={{ fontSize:'clamp(32px,5vw,48px)', background:'none', border:'none', cursor:'pointer', opacity:s <= rating ? 1 : 0.25, transition:'all 0.15s', filter:s <= rating ? 'none' : 'grayscale(1)' }}>
                ⭐
              </button>
            ))}
          </div>

          {/* Feedback tags */}
          {feedbackTags.length > 0 && rating > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginBottom:'clamp(14px,2vw,20px)' }}>
              {feedbackTags.filter(t => (rating >= 4 ? t.sentiment === 'positive' : t.sentiment !== 'positive')).map(tag => (
                <button key={tag.id} onClick={() => setSelectedTags(p => p.includes(tag.id) ? p.filter(x => x !== tag.id) : [...p, tag.id])}
                  style={{ padding:'8px 16px', borderRadius:999, fontSize:'clamp(12px,1.4vw,14px)', fontWeight:600, background:selectedTags.includes(tag.id) ? C.accent : '#1a1a18', color:selectedTags.includes(tag.id) ? C.accentText : '#888', border:`1px solid ${selectedTags.includes(tag.id) ? C.accent : '#2a2a28'}`, cursor:'pointer', transition:'all 0.15s' }}>
                  {tag.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={handleSubmitReview} disabled={submitting}
              style={{ width:'100%', padding:'clamp(14px,2vw,18px)', borderRadius:12, background:rating > 0 ? C.accent : '#2a2a28', color:rating > 0 ? C.accentText : '#555', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'clamp(14px,1.8vw,17px)', border:'none', cursor:rating > 0 ? 'pointer' : 'default' }}>
              {submitting ? 'Submitting…' : rating > 0 ? 'Submit & Finish →' : 'Skip · Lewati →'}
            </button>
            <button onClick={() => setPhase('receipt')}
              style={{ background:'transparent', border:'none', color:'#555', fontSize:'clamp(12px,1.4vw,14px)', cursor:'pointer', padding:8 }}>
              Skip review · Lewati
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT PHASE */}
      {phase === 'receipt' && (
        <div className="si" style={{ maxWidth:'clamp(360px,52vw,480px)', width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:'clamp(48px,7vw,72px)', marginBottom:12 }}>✅</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:'clamp(26px,4vw,38px)', color:C.accent, marginBottom:6 }}>Terima Kasih!</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'clamp(18px,2.5vw,24px)', color:C.white, marginBottom:4 }}>Thank You!</div>
          <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#888', marginBottom:'clamp(24px,3.5vh,36px)' }}>
            See you next time at Bercut · Sampai jumpa lagi
          </div>

          {booking?.customer_phone && (
            <div style={{ background:'#1a1a18', borderRadius:14, padding:'clamp(14px,2vw,20px)', marginBottom:'clamp(16px,2.2vh,24px)', fontSize:'clamp(12px,1.4vw,14px)', color:'#888' }}>
              📱 Receipt &amp; loyalty points sent to your WhatsApp
            </div>
          )}

          <div style={{ background:'#1a1a18', borderRadius:14, padding:'clamp(16px,2.2vw,22px)', marginBottom:'clamp(16px,2.2vh,24px)', textAlign:'left' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ color:'#888' }}>Services</span>
              <span style={{ color:C.white, fontFamily:"'Inter',sans-serif", fontWeight:700 }}>{fmt(amount)}</span>
            </div>
            {tipAmount > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ color:'#888' }}>Tip · Terima kasih 🙏</span>
                <span style={{ color:C.accent, fontFamily:"'Inter',sans-serif", fontWeight:700 }}>{fmt(tipAmount)}</span>
              </div>
            )}
            <div style={{ height:1, background:'#2a2a28', margin:'8px 0' }} />
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:C.white, fontWeight:700 }}>Total Paid</span>
              <span style={{ color:C.accent, fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:'clamp(16px,2.2vw,22px)' }}>{fmt(totalPaid)}</span>
            </div>
          </div>

          <button onClick={onDone}
            style={{ width:'100%', padding:'clamp(16px,2.2vw,20px)', borderRadius:12, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'clamp(15px,1.8vw,18px)', border:'none', cursor:'pointer' }}>
            Done · Selesai →
          </button>
        </div>
      )}
    </div>
  )
}
