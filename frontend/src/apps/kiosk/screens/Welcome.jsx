import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'

export default function Welcome({ onStart, settings = {}, branchName = 'Bercut' }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])

  const cta   = settings.welcome_cta    || 'Start Booking'
  const ctaId = settings.welcome_cta_id || 'Mulai Booking'
  const sub   = settings.welcome_subtitle    || 'Touch screen to begin'
  const subId = settings.welcome_subtitle_id || 'Sentuh layar untuk memulai'

  const tickerItems = ['BERCUT BARBERSHOP', 'SEMINYAK', 'CANGGU', 'UBUD', 'ULUWATU', 'SANUR', 'NO.1 BARBERSHOP IN BALI', 'OPEN 10:00 – 20:00 EVERY DAY']

  return (
    <div style={{ minHeight:'calc(100vh - clamp(48px,6vh,60px))', display:'flex', flexDirection:'column', background:C.topBg, position:'relative', overflow:'hidden' }}>
      {/* Background texture */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', bottom:'-10%', right:'-5%', width:'clamp(200px,35vw,420px)', height:'clamp(200px,35vw,420px)', background:C.accent, opacity:0.04, borderRadius:'50%', filter:'blur(60px)' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, #ffffff08 1px, transparent 1px)', backgroundSize:'clamp(28px,4vw,40px) clamp(28px,4vw,40px)' }} />
      </div>

      {/* Main content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(12px,2vw,24px)', gap:0, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div className="fu" style={{ textAlign:'center', marginBottom:'clamp(8px,1.2vw,14px)' }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut Barbershop"
            style={{ width:'clamp(200px,32vw,420px)', maxHeight:'clamp(80px,16vh,140px)', height:'auto', objectFit:'contain', display:'block', margin:'0 auto' }} />
          <div style={{ marginTop:'clamp(8px,1vw,12px)', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <div style={{ height:1, width:'clamp(24px,4vw,48px)', background:'#333' }} />
            <span style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:600, letterSpacing:'0.26em', color:'#666', textTransform:'uppercase' }}>{branchName.toUpperCase()} · BALI</span>
            <div style={{ height:1, width:'clamp(24px,4vw,48px)', background:'#333' }} />
          </div>
        </div>

        {/* Clock */}
        <div className="fu" style={{ textAlign:'center', marginBottom:'clamp(16px,2.4vw,28px)', animationDelay:'0.08s' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(36px,5.5vw,64px)', fontWeight:800, color:C.white, lineHeight:1, letterSpacing:'-0.04em' }}>
            {time.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
          </div>
          <div style={{ fontSize:'clamp(12px,1.4vw,15px)', color:'#888', marginTop:7, letterSpacing:'0.04em' }}>
            {time.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </div>
        </div>

        {/* CTA */}
        <div className="fu" style={{ width:'100%', maxWidth:'clamp(320px,58vw,700px)', animationDelay:'0.16s' }}>
          <button onClick={onStart}
            style={{ width:'100%', background:C.accent, color:C.accentText, padding:'clamp(20px,3vh,28px) 28px', borderRadius:14, border:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,24px)', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:14, transition:'transform 0.12s', letterSpacing:'0.01em' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
            <span style={{ fontSize:'clamp(18px,2.4vw,24px)' }}>✂</span>
            {cta} / {ctaId}
          </button>
          <div style={{ textAlign:'center', marginTop:14, fontSize:'clamp(11px,1.3vw,13px)', color:'#555' }}>
            {sub} · {subId}
          </div>
        </div>
      </div>

      {/* Ticker */}
      <div style={{ background:'#080808', borderTop:`1px solid ${C.accent}33`, overflow:'hidden', padding:'clamp(9px,1.3vh,13px) 0', position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', gap:'clamp(32px,5vw,56px)', animation:'ticker 22s linear infinite', width:'max-content', willChange:'transform' }}>
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <span key={i} style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, letterSpacing:'0.14em', color:i % 2 === 0 ? C.accent : '#333', whiteSpace:'nowrap' }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
