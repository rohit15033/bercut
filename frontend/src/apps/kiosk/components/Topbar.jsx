import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

function AccessModal({ onBarberAccess, onStaffAccess, onClose, settings }) {
  const [view,  setView]  = useState('choose')
  const [pin,   setPin]   = useState('')
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  const tryAccess = async () => {
    if (pin.length < 4) return
    setError('')
    
    const adminPin = settings?.kioskAdminPin || '1234'
    const barberPin = settings?.kioskBarberPin || '0000'

    if (view === 'staff') {
      if (pin === adminPin) {
        onStaffAccess(pin)
        onClose()
      } else {
        setError('PIN Staff salah.')
        setPin('')
      }
    } else if (view === 'barber') {
      if (pin === barberPin) {
        onBarberAccess(pin)
        onClose()
      } else {
        setError('PIN Barber salah.')
        setPin('')
      }
    }
  }

  const label = view === 'staff' ? 'Staff' : 'Barber / Kapster'

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:900, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }} onClick={onClose}>
      <div style={{ background:C.white, borderRadius:20, width:'100%', maxWidth:'clamp(320px,44vw,420px)', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ background:C.topBg, padding:'clamp(16px,2vw,22px) clamp(20px,2.6vw,28px)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:'clamp(16px,2vw,20px)', color:C.topText }}>
            {view === 'choose' ? 'Staff Access / Akses Staf' : `Login — ${label}`}
          </span>
          <button onClick={onClose} style={{ background:'#2a2a28', border:'none', borderRadius:8, width:32, height:32, color:'#888', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:'clamp(20px,2.6vw,28px)' }}>
          {view === 'choose' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <button onClick={() => setView('staff')}
                style={{ padding:'clamp(16px,2.2vw,22px)', borderRadius:14, background:C.topBg, color:C.white, fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'clamp(16px,2vw,20px)', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:28 }}>🔑</span>
                <div><div>Staff / Admin</div><div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#888', fontWeight:400, marginTop:2 }}>Dashboard &amp; settings</div></div>
              </button>
              <button onClick={() => setView('barber')}
                style={{ padding:'clamp(16px,2.2vw,22px)', borderRadius:14, background:C.surface, color:C.text, fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'clamp(16px,2vw,20px)', border:`2px solid ${C.border}`, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:28 }}>✂</span>
                <div><div>Barber / Kapster</div><div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted, fontWeight:400, marginTop:2 }}>Clock in · Breaks · Queue</div></div>
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:'clamp(13px,1.5vw,15px)', color:C.text2, marginBottom:16 }}>Enter PIN for {label}</div>
              
              {/* Display */}
              <div style={{ width:'100%', padding:'clamp(14px,1.8vw,18px) 16px', borderRadius:12, border:`2px solid ${error ? C.danger : C.border}`, fontSize:'clamp(20px,2.6vw,26px)', fontFamily:'monospace', letterSpacing:'0.3em', textAlign:'center', background:C.bg, marginBottom:20, minHeight:68, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {pin ? pin.split('').map(() => '●').join('') : <span style={{ color:'#ccc', letterSpacing:0 }}>● ● ● ●</span>}
              </div>

              {error && <div style={{ color:C.danger, fontSize:'clamp(12px,1.4vw,14px)', marginBottom:12, textAlign:'center' }}>{error}</div>}

              {/* Keypad */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:20 }}>
                {[1,2,3,4,5,6,7,8,9, 'C', 0, '⌫'].map(key => {
                  const isAction = typeof key === 'string'
                  return (
                    <button key={key}
                      onClick={() => {
                        setError('')
                        if (key === 'C') setPin('')
                        else if (key === '⌫') setPin(p => p.slice(0, -1))
                        else if (pin.length < 6) setPin(p => p + key)
                      }}
                      style={{ 
                        padding:'clamp(14px,1.8vw,18px) 0', 
                        borderRadius:12, 
                        background: isAction ? C.surface : C.white, 
                        border:`1.5px solid ${C.border}`,
                        color: key === 'C' ? C.danger : C.text,
                        fontSize:'clamp(18px,2.4vw,22px)',
                        fontWeight:700,
                        cursor:'pointer'
                      }}>
                      {key}
                    </button>
                  )
                })}
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => { setView('choose'); setPin(''); setError('') }}
                  style={{ flex:1, padding:'clamp(12px,1.6vw,16px)', borderRadius:10, background:C.surface, color:C.text2, border:`1.5px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:'clamp(14px,1.6vw,16px)', cursor:'pointer' }}>
                  ← Back
                </button>
                <button onClick={tryAccess} disabled={pin.length < 4 || busy}
                  style={{ flex:2, padding:'clamp(12px,1.6vw,16px)', borderRadius:10, background:pin.length >= 4 ? C.topBg : C.surface2, color:pin.length >= 4 ? C.white : C.muted, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'clamp(14px,1.6vw,16px)', border:'none', cursor:pin.length >= 4 ? 'pointer' : 'not-allowed' }}>
                  {busy ? 'Checking…' : 'Login / Masuk →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Topbar({ step, cartTotal, groupCount, branchName, onHome, onBarberAccess, onStaffAccess, settings }) {
  const [time, setTime] = useState(new Date())
  const [showAccess, setShowAccess] = useState(false)
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])
  const steps = ['Services', 'Barber', 'Time', 'Confirm']

  return (
    <>
      {showAccess && (
        <AccessModal
          onBarberAccess={(pin) => { onBarberAccess?.(pin); setShowAccess(false) }}
          onStaffAccess={(pin)  => { onStaffAccess?.(pin);  setShowAccess(false) }}
          onClose={() => setShowAccess(false)}
          settings={settings}
        />
      )}
      <div style={{ background:C.topBg, userSelect:'none' }}>
        <div style={{ padding:'0 clamp(16px,3vw,28px)', display:'flex', alignItems:'center', justifyContent:'space-between', height:'clamp(48px,6vh,60px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img
              src="/assets/bercut-logo-transparent.png"
              alt="Bercut"
              onClick={() => setShowAccess(true)}
              style={{ height:'clamp(24px,3.2vh,34px)', width:'auto', objectFit:'contain', cursor:'pointer' }}
            />
            {branchName && <span style={{ color:'#555', fontSize:'clamp(11px,1.3vw,13px)', cursor:'pointer' }} onClick={() => setShowAccess(true)}>{branchName}</span>}
          </div>
          {step > 0 && step < 5 && (
            <div style={{ display:'flex', gap:'clamp(4px,0.8vw,8px)', alignItems:'center' }}>
              {steps.map((s, i) => (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:'clamp(3px,0.5vw,5px)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'clamp(3px,0.5vw,5px)', opacity:i+1 <= step ? 1 : 0.3, transition:'opacity 0.3s' }}>
                    <div style={{ width:'clamp(18px,2.2vw,22px)', height:'clamp(18px,2.2vw,22px)', borderRadius:'50%', background:i+1 < step ? C.accent : i+1 === step ? C.white : 'transparent', border:`1.5px solid ${i+1 <= step ? C.accent : '#333'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(8px,1vw,10px)', fontWeight:700, color:i+1 < step ? C.accentText : i+1 === step ? C.topBg : '#555', transition:'all 0.3s', flexShrink:0 }}>
                      {i+1 < step ? '✓' : i+1}
                    </div>
                    <span style={{ fontSize:'clamp(9px,1.1vw,11px)', fontWeight:i+1 === step ? 700 : 400, color:i+1 === step ? C.white : '#555' }}>{s}</span>
                  </div>
                  {i < 3 && <span style={{ color:'#333', fontSize:10 }}>›</span>}
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:'clamp(8px,1.2vw,16px)' }}>
            {cartTotal > 0 && step > 0 && step < 5 && (
              <div style={{ background:'#1a1a18', padding:'5px clamp(8px,1.2vw,12px)', borderRadius:7 }}>
                <span style={{ color:C.accent, fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'clamp(13px,1.6vw,16px)' }}>{fmt(cartTotal)}</span>
                {groupCount > 0 && <span style={{ color:'#888', fontSize:'clamp(10px,1.2vw,12px)', marginLeft:6 }}>{groupCount+1} people</span>}
              </div>
            )}
            {step === 0 && <button onClick={onHome} style={{ background:'transparent', border:'none', color:'#555', fontSize:'clamp(11px,1.3vw,13px)', cursor:'pointer' }}>Reset</button>}
            <span style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#555' }}>{time.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</span>
          </div>
        </div>
        {step > 0 && step < 5 && (
          <div style={{ display:'flex', gap:2 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ flex:1, height:3, background:i <= step ? C.accent : '#222', transition:'background 0.4s' }} />)}
          </div>
        )}
      </div>
    </>
  )
}
