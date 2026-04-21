import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

export default function QueueNumber({ booking, group = [], name, cart = [], services = [], barber, slot, pointsUsed = 0, onAddAnother, onReset, settings }) {
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
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang   = 'id-ID'
      u.rate   = 0.95
      u.onend  = () => setCalling(false)
      u.onerror = () => setCalling(false)
      window.speechSynthesis.speak(u)
    } else {
      setTimeout(() => setCalling(false), 2000)
    }
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
  const barberName = barber?.name || booking?.barber_name || '—'
  const chairNum   = barber?.chair || null
  const slotDisplay = slot === 'Now' ? 'Now ⚡' : (slot || booking?.slot_time || '—')
  const serviceNames = cart.map(id => services.find(x => x.id === id)?.name).filter(Boolean).join(', ')

  return (
    <div style={{ height:'calc(100vh - clamp(51px,6.5vh,63px))', display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(16px,3vw,32px)', overflowY:'auto' }}>
      <div className="si" style={{ maxWidth:'clamp(360px,58vw,600px)', width:'100%', textAlign:'center' }}>

        {/* Status eyebrow */}
        <div style={{ fontSize:'clamp(10px,1.2vw,12px)', letterSpacing:'0.18em', textTransform:'uppercase', color:C.muted, marginBottom:6 }}>
          {isGrouped ? 'Group Booking / Reservasi Grup' : 'Reservation Confirmed · Dikonfirmasi'}
        </div>

        {/* Name hero */}
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:isGrouped ? 'clamp(22px,4vw,42px)' : 'clamp(32px,6vw,58px)', fontWeight:800, lineHeight:1.1, color:C.text, letterSpacing:'-0.02em', animation:'pop 0.5s ease 0.2s both', marginBottom:16 }}>
          {isGrouped
            ? [...group.map(b => b.customer_name || b.name || 'Guest'), displayName].join(' + ') + ' ✓'
            : displayName
          }
        </div>

        <div style={{ background:C.accent, height:4, borderRadius:999, margin:'0 auto clamp(16px,2.2vh,22px)', width:'clamp(60px,10vw,100px)' }} />

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
          <div style={{ background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'clamp(14px,2vw,20px)', marginBottom:'clamp(12px,1.8vw,18px)', textAlign:'left' }}>
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
          <div style={{ background:isNow ? '#e8f5e9' : C.surface, border:`1.5px solid ${isNow ? '#4caf50' : C.border}`, borderRadius:12, padding:'clamp(12px,1.6vh,18px) clamp(14px,2vw,20px)', marginBottom:'clamp(10px,1.4vw,14px)', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:6 }}>
            <span style={{ fontSize:'clamp(22px,2.8vw,28px)' }}>{isNow ? '✂' : '⏳'}</span>
            {isNow ? (
              <>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2vw,20px)', fontWeight:800, color:'#1a5c1a' }}>
                  {barberName} will greet you{chairNum ? ` at chair ${chairNum}` : ''}
                </div>
                <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#2e7d32' }}>
                  {chairNum ? `Langsung ke kursi ${chairNum} · siap sekarang` : 'Langsung ke kapster · siap sekarang'}
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

        {/* Escalation status — non-Now bookings */}
        {!isGrouped && !isNow && (() => {
          if (escalateIn === null) return (
            <div style={{ background:'#fafaf4', border:`1.5px solid ${C.border}`, borderRadius:12, padding:'clamp(10px,1.4vh,14px) clamp(14px,2vw,20px)', marginBottom:'clamp(10px,1.4vw,14px)', display:'flex', alignItems:'center', gap:12, textAlign:'left' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>📢</span>
              <div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:C.text }}>Barber Notified · Kapster Diberitahu</div>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted, marginTop:2 }}>Announcement played · If no response, will re-announce automatically</div>
              </div>
            </div>
          )
          if (escalateIn > 0) {
            const mins = Math.floor(escalateIn / 60)
            const secs = escalateIn % 60
            const pct  = ((ESCALATE_AFTER - escalateIn) / ESCALATE_AFTER) * 100
            return (
              <div style={{ background:'#fffbea', border:'1.5px solid #e8d84a', borderRadius:12, padding:'clamp(10px,1.4vh,14px) clamp(14px,2vw,20px)', marginBottom:'clamp(10px,1.4vw,14px)', textAlign:'left' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>⏱</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(12px,1.5vw,14px)', fontWeight:700, color:'#7a6000' }}>
                      Re-announcing in {mins > 0 ? `${mins}m ` : ''}{String(secs).padStart(2, '0')}s
                    </div>
                    <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#a08000', marginTop:1 }}>Auto re-announce if barber hasn't started · Otomatis ulang jika belum mulai</div>
                  </div>
                </div>
                <div style={{ height:4, background:'#e8d84a22', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:'#e8d84a', borderRadius:2, width:`${pct}%`, transition:'width 1s linear' }} />
                </div>
                <button onClick={callBarber} style={{ marginTop:10, background:'none', border:'none', fontSize:'clamp(11px,1.3vw,13px)', color:'#a08000', fontFamily:"'DM Sans',sans-serif", textDecoration:'underline', cursor:'pointer', padding:0 }}>
                  Announce now · Umumkan sekarang
                </button>
              </div>
            )
          }
          return (
            <div style={{ background:'#fff3e0', border:'1.5px solid #ff9800', borderRadius:12, padding:'clamp(10px,1.4vh,14px) clamp(14px,2vw,20px)', marginBottom:'clamp(10px,1.4vw,14px)', display:'flex', alignItems:'center', gap:12, textAlign:'left' }}>
              <span style={{ fontSize:22, flexShrink:0, animation:'pulse 0.8s ease infinite' }}>📢</span>
              <div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,15px)', fontWeight:700, color:'#e65100' }}>Re-announcing now…</div>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#bf360c', marginTop:2 }}>Calling {barberName} again · Memanggil kapster kembali</div>
              </div>
            </div>
          )
        })()}

        {/* Points used note */}
        {pointsUsed > 0 && (
          <div style={{ background:'#0d1f0d', border:'1px solid #1a4d1a', borderRadius:12, padding:'clamp(10px,1.4vh,14px) clamp(14px,2vw,20px)', marginBottom:'clamp(10px,1.4vw,14px)', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>⭐</span>
            <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#6fcf6f', lineHeight:1.5 }}>
              <strong>{pointsUsed} points applied</strong> to this reservation · {pointsUsed} poin digunakan untuk reservasi ini
            </div>
          </div>
        )}

        {/* Payment note */}
        <div style={{ background:C.topBg, borderRadius:12, padding:'clamp(10px,1.4vh,14px) clamp(14px,2vw,20px)', marginBottom:'clamp(16px,2.2vw,22px)', fontSize:'clamp(11px,1.3vw,13px)', color:'#888', lineHeight:1.6, textAlign:'left' }}>
          <span style={{ color:C.accent, fontWeight:700 }}>
            💳 {isGrouped ? 'One payment for all.' : 'Pay after your service · Bayar setelah selesai.'}
          </span>{' '}
          Your barber will process payment via QRIS or card terminal.
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:12, marginBottom:16 }}>
          <button onClick={onAddAnother}
            style={{ flex:1, minHeight:72, background:C.white, border:`1.5px solid ${C.border}`, color:C.text, borderRadius:14, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2vw,19px)', fontWeight:800, textTransform:'uppercase', lineHeight:1 }}>
              + Add Another Person
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(10px,1.2vw,12px)', fontWeight:500, color:C.muted }}>
              Tambah Orang · Pay together at the end
            </div>
          </button>
          <button onClick={onReset}
            style={{ flex:1, minHeight:72, background:C.topBg, border:'none', color:C.white, borderRadius:14, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(16px,2vw,19px)', fontWeight:800, textTransform:'uppercase', lineHeight:1 }}>
              Done
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'clamp(10px,1.2vw,12px)', fontWeight:400, color:'#888' }}>
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
