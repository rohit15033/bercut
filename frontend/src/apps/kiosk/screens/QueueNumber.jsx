import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { speak } from '../../../shared/speak.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

export default function QueueNumber({ booking, group = [], name, cart = [], services = [], barber, barbers = [], slot, pointsUsed = 0, onAddAnother, onReset, settings }) {
  const [calling,    setCalling]    = useState(false)
  const [escalateIn, setEscalateIn] = useState(null)
  const ESCALATE_AFTER = 120

  const displayName = name || booking?.customer_name || 'Guest'
  const isNow       = slot === 'Now' || !booking?.slot_time
  const isGrouped   = group.length > 0

  const callBarber = () => {
    if (calling) return
    setCalling(true)
    const barberName   = barber?.name || booking?.barber_name || 'kapster'
    const customerName = displayName
    const text = `Panggil kapster ${barberName}. Customer atas nama ${customerName} sedang menunggu.`
    speak(text, {
      rate: 0.95,
      onend:  () => setCalling(false),
      onerror: () => setCalling(false),
    }).catch(() => setCalling(false))
    setEscalateIn(ESCALATE_AFTER)
  }

  useEffect(() => { if (isNow) callBarber() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (escalateIn === null) return
    if (escalateIn <= 0) { callBarber(); return }
    const t = setTimeout(() => setEscalateIn(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [escalateIn]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const secs = (settings?.queue_redirect_secs || 300) * 1000
    const t = setTimeout(() => onReset(), secs)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const total = parseFloat(booking?.total_amount || 0)
  const groupTotal = group.reduce((s, b) => s + parseFloat(b.total_amount || b.total || 0), 0) + total
  const dur   = cart.reduce((s, id) => s + (services.find(x => x.id === id)?.duration_min || services.find(x => x.id === id)?.duration_minutes || 30), 0)
  
  const targetBarber = barber || barbers.find(b => b.id === booking?.barber_id)
  const barberName   = targetBarber?.name || booking?.barber_name || '—'
  const chairNum     = targetBarber?.chair || null
  const slotDisplay = slot === 'Now' ? 'Now ⚡' : (slot || booking?.slot_time || '—')
  const serviceNames = cart.map(id => services.find(x => x.id === id)?.name).filter(Boolean).join(', ')

  return (
    <div style={{ height:'calc(100vh - clamp(51px,6.5vh,63px))', display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(10px,2vw,20px)', overflowY:'auto' }}>
      <div className="si" style={{ maxWidth:'clamp(360px,58vw,600px)', width:'100%', textAlign:'center' }}>

        {/* Status eyebrow */}
        <div style={{ fontSize:'clamp(10px,1.1vw,11px)', letterSpacing:'0.18em', textTransform:'uppercase', color:C.muted, marginBottom:4 }}>
          {isGrouped ? 'Group Booking / Reservasi Grup' : 'Reservation Confirmed · Dikonfirmasi'}
        </div>

        {/* Name hero */}
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:isGrouped ? 'clamp(20px,3vw,36px)' : 'clamp(28px,5vw,50px)', fontWeight:800, lineHeight:1.1, color:C.text, letterSpacing:'-0.02em', animation:'pop 0.5s ease 0.2s both', marginBottom:12 }}>
          {isGrouped
            ? [...group.map(b => b.customer_name || b.name || 'Guest'), displayName].join(' + ') + ' ✓'
            : displayName
          }
        </div>

        <div style={{ background:C.accent, height:3, borderRadius:999, margin:'0 auto clamp(12px,1.8vh,18px)', width:'clamp(50px,8vw,80px)' }} />

        {/* Group summary */}
        {isGrouped && (
          <div className="fi" style={{ background:C.topBg, borderRadius:14, padding:'clamp(12px,1.6vw,18px) clamp(16px,2vw,22px)', marginBottom:'clamp(12px,1.6vw,16px)', textAlign:'left' }}>
            <div style={{ fontSize:'clamp(10px,1.2vw,12px)', letterSpacing:'0.14em', color:'#555', textTransform:'uppercase', marginBottom:10, fontWeight:700 }}>Group Booking</div>
            {group.map((b, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'clamp(6px,0.9vh,9px) 0', borderBottom:'1px solid #1a1a18', gap:12 }}>
                <div style={{ minWidth:0 }}>
                  <span style={{ fontWeight:700, color:C.accent, fontSize:'clamp(13px,1.6vw,15px)' }}>{b.customer_name || b.name || 'Guest'}</span>
                  <span style={{ fontSize:'clamp(11px,1.3vw,12px)', color:'#aaa', marginLeft:8 }}>{b.barber_name || b.barber}</span>
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, color:C.white, fontSize:'clamp(13px,1.5vw,15px)', flexShrink:0 }}>{fmt(b.total_amount || b.total || 0)}</span>
              </div>
            ))}
            {/* Current person */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'clamp(6px,0.9vh,9px) 0', borderBottom:'1px solid #1a1a18', gap:12 }}>
              <div style={{ minWidth:0 }}>
                <span style={{ fontWeight:700, color:C.accent, fontSize:'clamp(13px,1.6vw,15px)' }}>{displayName}</span>
                <span style={{ fontSize:'clamp(11px,1.3vw,12px)', color:'#aaa', marginLeft:8 }}>{barberName}</span>
                {serviceNames && <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#555', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{serviceNames}</div>}
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, color:C.white, fontSize:'clamp(13px,1.5vw,15px)', flexShrink:0 }}>{fmt(total)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,17px)', fontWeight:800, color:C.white }}>GROUP TOTAL</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(17px,2.4vw,24px)', fontWeight:800, color:C.accent }}>{fmt(groupTotal)}</span>
            </div>
          </div>
        )}

        {/* Single booking details */}
        {!isGrouped && (
          <div style={{ background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'clamp(10px,1.6vw,16px)', marginBottom:'clamp(10px,1.5vw,14px)', textAlign:'left' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'clamp(12px,1.6vw,16px) clamp(16px,2.2vw,24px)' }}>
              {[
                ['Barber',            barberName],
                ['Chair / Kursi',     chairNum || '—'],
                ['Time / Waktu',      slotDisplay],
                ['Services / Layanan', serviceNames || '—'],
                ['Duration / Durasi', `${dur} min`],
                ['Total',             fmt(total)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted, marginBottom:3 }}>{k}</div>
                  <div style={{ fontSize:'clamp(12px,1.5vw,14px)', fontWeight:600, wordBreak:'break-word' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barber status card */}
        {!isGrouped && (
          <div style={{ background:isNow ? '#e8f5e9' : C.surface, border:`1.5px solid ${isNow ? '#4caf50' : C.border}`, borderRadius:12, padding:'clamp(10px,1.4vh,15px) clamp(14px,2vw,20px)', marginBottom:'clamp(8px,1.2vw,12px)', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:4 }}>
            <span style={{ fontSize:'clamp(20px,2.4vw,24px)' }}>{isNow ? '✂' : '⏳'}</span>
            {isNow ? (
              <>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,16px)', fontWeight:700, color:'#1a5c1a', marginBottom:2 }}>
                  Take a seat at:
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(28px,5vw,48px)', fontWeight:900, color:'#1a5c1a', lineHeight:1, marginBottom:4, letterSpacing:'-0.02em' }}>
                  {chairNum || 'Barber Chair'}
                </div>
                <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#2e7d32', fontWeight:600 }}>
                  {barberName} will serve you now · Siap sekarang
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2vw,20px)', fontWeight:800, color:C.text }}>
                  Please Wait · Silakan Tunggu
                </div>
                <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.text2 }}>
                  <strong style={{ fontWeight:800 }}>{barberName}</strong> ✂ akan memanggil nama Anda · will call your name
                </div>
              </>
            )}
          </div>
        )}



        {/* Points used note */}
        {pointsUsed > 0 && (
          <div style={{ background:'#0d1f0d', border:'1px solid #1a4d1a', borderRadius:12, padding:'clamp(8px,1.2vh,12px) clamp(14px,2vw,20px)', marginBottom:'clamp(8px,1.2vw,12px)', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>⭐</span>
            <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#6fcf6f', lineHeight:1.5 }}>
              <strong>{pointsUsed} points applied</strong> to this reservation · {pointsUsed} poin digunakan untuk reservasi ini
            </div>
          </div>
        )}

        {/* Payment note */}
        <div style={{ background:C.topBg, borderRadius:12, padding:'clamp(8px,1.2vh,12px) clamp(14px,2vw,20px)', marginBottom:'clamp(12px,1.8vw,18px)', fontSize:'clamp(11px,1.3vw,13px)', color:'#888', lineHeight:1.5, textAlign:'left' }}>
          <span style={{ color:C.accent, fontWeight:700 }}>
            💳 {isGrouped ? 'One payment for all.' : 'Pay after your service · Bayar setelah selesai.'}
          </span>{' '}
          Your barber will process payment via QRIS or card terminal.
        </div>

        <div style={{ display:'flex', gap:12, marginBottom:12 }}>
          <button onClick={onAddAnother}
            style={{ flex:1, minHeight:60, background:C.white, border:`1.5px solid ${C.border}`, color:C.text, borderRadius:14, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,17px)', fontWeight:800, textTransform:'uppercase', lineHeight:1 }}>
              + Add Another Person
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(9px,1.1vw,11px)', fontWeight:500, color:C.muted }}>
              Tambah Orang
            </div>
          </button>
          <button onClick={onReset}
            style={{ flex:1, minHeight:60, background:C.topBg, border:'none', color:C.white, borderRadius:14, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(14px,1.8vw,17px)', fontWeight:800, textTransform:'uppercase', lineHeight:1 }}>
              Done
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(9px,1.1vw,11px)', fontWeight:400, color:'#888' }}>
              Selesai
            </div>
          </button>
        </div>

        <div style={{ color:C.muted, fontSize:'clamp(10px,1.2vw,12px)', textAlign:'center' }}>
          Layar kembali otomatis dalam 5 menit · Screen returns in 5 min
        </div>
      </div>
    </div>
  )
}
