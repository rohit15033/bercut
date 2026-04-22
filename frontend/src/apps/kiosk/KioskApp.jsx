import { useEffect, useRef, useState } from 'react'
import { kioskApi } from '../../shared/api.js'
import { getKioskToken, setKioskToken, tokens as C } from '../../shared/tokens.js'
import { useSSE } from '../../shared/useSSE.js'
import Topbar from './components/Topbar.jsx'
import Welcome from './screens/Welcome.jsx'
import ServiceSelection from './screens/ServiceSelection.jsx'
import BarberSelection from './screens/BarberSelection.jsx'
import TimeSlot from './screens/TimeSlot.jsx'
import Confirm from './screens/Confirm.jsx'
import QueueNumber from './screens/QueueNumber.jsx'
import PaymentTakeover from './screens/PaymentTakeover.jsx'
import BarberPanel from './screens/BarberPanel.jsx'
import StaffPanel from './screens/StaffPanel.jsx'

const GS = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'DM Sans', sans-serif;
      background: ${C.bg};
      color: ${C.text};
      min-height: 100vh;
      overscroll-behavior: none;
      -webkit-overflow-scrolling: touch;
    }
    h1,h2,h3,h4 { font-family: 'Inter', sans-serif; font-weight: 800; }
    button { cursor: pointer; border: none; font-family: 'DM Sans', sans-serif; outline: none; -webkit-tap-highlight-color: transparent; }
    input  { font-family: 'DM Sans', sans-serif; outline: none; }
    .scroll-y { overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
    @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
    @keyframes scaleIn   { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
    @keyframes pop       { 0%{transform:scale(1)} 45%{transform:scale(1.08)} 100%{transform:scale(1)} }
    @keyframes ticker    { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.5} }
    @keyframes namePulse { 0%{box-shadow:0 0 0 0 rgba(245,226,0,0.7)} 60%{box-shadow:0 0 0 8px rgba(245,226,0,0)} 100%{box-shadow:0 0 0 0 rgba(245,226,0,0)} }
    .fu { animation: fadeUp  0.3s  ease both; }
    .fi { animation: fadeIn  0.22s ease both; }
    .si { animation: scaleIn 0.28s ease both; }
    .card { background: ${C.white}; border: 1.5px solid ${C.border}; border-radius: 14px; transition: border-color 0.18s; min-height: 72px; }
    .card.sel { background: ${C.accent}; border-color: ${C.accent}; }
    .btnP { width:100%; background:${C.topBg}; color:${C.white}; padding:16px 24px; border-radius:12px; font-family:'DM Sans',sans-serif; font-size:clamp(15px,1.8vw,18px); font-weight:700; transition:background 0.15s,transform 0.1s; }
    .btnP:active  { transform:scale(0.98); }
    .btnP:disabled{ background:${C.surface2}; color:${C.muted}; cursor:not-allowed; }
    .btnG { background:transparent; color:${C.text2}; padding:14px 20px; border-radius:12px; font-size:clamp(14px,1.5vw,16px); font-weight:500; border:1.5px solid ${C.border}; transition:background 0.15s; min-height:52px; }
    .btnG:active { background:${C.surface}; }
    .pill { padding:clamp(8px,1vw,10px) clamp(14px,1.8vw,20px); border-radius:999px; font-size:clamp(13px,1.4vw,14px); font-weight:600; transition:all 0.15s; min-height:40px; display:inline-flex; align-items:center; gap:6px; -webkit-tap-highlight-color:transparent; cursor:pointer; }
    .card-grid-fluid { display:grid; grid-template-columns:repeat(auto-fill,minmax(clamp(180px,20vw,280px),1fr)); gap:clamp(10px,1.4vw,16px); }
    .barber-grid-fluid { display:grid; grid-template-columns:repeat(auto-fill,minmax(clamp(160px,20vw,220px),1fr)); gap:clamp(10px,1.4vw,16px); }
    .slot-grid { display:flex; flex-wrap:wrap; gap:clamp(8px,1.2vw,14px); }
    .confirm-layout { display:grid; grid-template-columns:1fr clamp(280px,32vw,440px); gap:clamp(20px,2.5vw,36px); }
    @media (max-width:900px) { .confirm-layout { grid-template-columns:1fr; } }
    .step-header { margin-bottom: clamp(14px,2vw,22px); }
    .step-eyebrow { font-size:clamp(11px,1.3vw,13px); color:${C.muted}; margin-bottom:4px; }
    .step-title { font-family:'Inter',sans-serif; font-size:clamp(24px,3.2vw,36px); font-weight:800; letter-spacing:-0.02em; line-height:1.1; }
    ::-webkit-scrollbar { width:3px; }
    ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
  `}</style>
)

// ── Offline Banner ─────────────────────────────────────────────────────────────
function OfflineBanner() {
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:9000, background:C.topBg, borderTop:`3px solid ${C.accent}`, padding:'clamp(8px,1.2vh,12px) clamp(16px,2.4vw,28px)', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef5350', flexShrink:0, animation:'pulse 1.4s ease infinite' }} />
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'clamp(13px,1.6vw,15px)', color:C.white }}>No Internet Connection · Tidak Ada Koneksi</div>
        <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#888', marginTop:2 }}>Queue numbers still work. Card &amp; QRIS payments paused. · Pembayaran ditangguhkan.</div>
      </div>
    </div>
  )
}

// ── Idle Countdown Overlay ─────────────────────────────────────────────────────
function IdleOverlay({ seconds, onDismiss }) {
  return (
    <div onClick={onDismiss} style={{ position:'fixed', inset:0, zIndex:8900, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="si" style={{ background:C.topBg, borderRadius:20, padding:'clamp(28px,4vw,48px)', textAlign:'center', maxWidth:'clamp(300px,42vw,460px)', width:'100%' }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(64px,10vw,96px)', fontWeight:900, color:C.accent, lineHeight:1, marginBottom:12, fontVariantNumeric:'tabular-nums' }}>{seconds}</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,26px)', fontWeight:800, color:C.white, marginBottom:8 }}>Returning to Home Screen</div>
        <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#666', marginBottom:28 }}>Kembali ke layar awal · Tap anywhere to continue</div>
        <button onClick={onDismiss} style={{ padding:'clamp(14px,2vh,18px) clamp(32px,4vw,48px)', borderRadius:12, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'clamp(14px,1.7vw,17px)', border:'none', cursor:'pointer' }}>
          Lanjutkan · Continue
        </button>
      </div>
    </div>
  )
}

// ── Device Setup ───────────────────────────────────────────────────────────────
function DeviceSetup({ onRegistered }) {
  const [token,   setTokenInput] = useState('')
  const [error,   setError]      = useState('')
  const [loading, setLoading]    = useState(false)

  async function handleRegister() {
    const t = token.trim().toUpperCase()
    if (!t) { setError('Enter the device token provided by your admin.'); return }
    setLoading(true)
    try {
      setKioskToken(t)
      const data = await kioskApi.post('/kiosk/register', { token: t })
      localStorage.setItem('kiosk_branch_id',   data.branch_id)
      localStorage.setItem('kiosk_branch_name', data.branch_name)
      localStorage.setItem('kiosk_config',      JSON.stringify(data))
      onRegistered(data)
    } catch (err) {
      setKioskToken(null)
      setError(err.message || 'Invalid token. Contact your admin.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.topBg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(24px,4vw,48px)', fontFamily:"'DM Sans', sans-serif" }}>
      <GS />
      <div style={{ textAlign:'center', marginBottom:'clamp(28px,4vh,44px)' }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:'clamp(28px,4vw,42px)', color:C.accent, letterSpacing:'-0.03em' }}>BERCUT</div>
        <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#444', letterSpacing:'0.2em', textTransform:'uppercase', marginTop:4 }}>Barbershop · Kiosk Setup</div>
      </div>
      <div style={{ background:'#1a1a18', border:'1px solid #2a2a28', borderRadius:20, padding:'clamp(28px,4vw,44px)', width:'100%', maxWidth:'clamp(320px,44vw,480px)', animation:'fadeUp 0.35s ease both' }}>
        <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:'clamp(18px,2.4vw,24px)', color:C.white, marginBottom:8 }}>Device Not Registered</div>
        <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#777', lineHeight:1.65, marginBottom:'clamp(20px,3vh,28px)' }}>
          Enter the device token from your admin dashboard under <strong style={{ color:'#aaa' }}>Branches → Kiosk Devices</strong>.
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#555', marginBottom:6 }}>Device Token</label>
          <input value={token} onChange={e => { setTokenInput(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && !loading && handleRegister()}
            placeholder="e.g. BERCUT-XXX-XXXX"
            style={{ width:'100%', padding:'clamp(12px,1.8vh,16px) 14px', borderRadius:10, border:'1.5px solid ' + (error ? '#ef5350' : '#2a2a28'), background:'#111', color:C.white, fontFamily:'monospace', fontSize:'clamp(13px,1.6vw,15px)', letterSpacing:'0.08em' }} />
          {error && <div style={{ fontSize:12, color:'#ef5350', marginTop:7 }}>{error}</div>}
        </div>
        <button onClick={handleRegister} disabled={loading}
          style={{ width:'100%', padding:'clamp(14px,2vh,18px)', borderRadius:12, background:loading ? '#2a2a28' : C.accent, color:loading ? '#555' : C.accentText, fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:'clamp(14px,1.8vw,16px)', border:'none', cursor:loading ? 'not-allowed' : 'pointer', transition:'background 0.15s' }}>
          {loading ? 'Registering…' : 'Register Kiosk →'}
        </button>
      </div>
    </div>
  )
}

// ── Kiosk Content ──────────────────────────────────────────────────────────────
function KioskContent({ config }) {
  const branchId   = config.branch_id
  const branchName = config.branch_name
  const settings   = config.settings || {}
  const services   = config.services   || []
  const menuItems  = config.menu_items || []

  const feedbackTags = config.feedback_tags || []
  const [barbers, setBarbers] = useState(config.barbers || [])

  useEffect(() => {
    if (config.barbers) setBarbers(config.barbers)
  }, [config])

  const [step,             setStep]             = useState(0)
  const [cart,             setCart]             = useState([])
  const [ownColorToggles,  setOwnColorToggles]  = useState({})
  const [barber,           setBarber]           = useState(null)
  const [slot,             setSlot]             = useState(null)
  const [name,             setName]             = useState('')
  const [phone,            setPhone]            = useState('')
  const [selectedExtras,   setSelectedExtras]   = useState([])
  const [booking,      setBooking]      = useState(null)
  const [pointsUsed,   setPointsUsed]   = useState(0)
  const [paymentPending,  setPaymentPending]  = useState(false)
  const [paymentBooking,  setPaymentBooking]  = useState(null)
  const [barberPanelOpen, setBarberPanelOpen] = useState(false)
  const [staffPanelOpen,  setStaffPanelOpen]  = useState(false)
  const [group, setGroup] = useState([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [idleCountdown, setIdleCountdown] = useState(null)

  const idleTimer  = useRef(null)
  const countTimer = useRef(null)
  const IDLE_SECS  = settings.idle_timeout_sec || 60
  const COUNT_SECS = 15

  // Online detection
  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  // SSE — real-time updates
  useSSE(branchId, {
    payment_trigger: (data) => {
      if (data?.booking_id || data?.id) {
        setPaymentBooking(data)
        setPaymentPending(true)
      }
    },
    kiosk_settings_update: () => {
      window.location.reload()
    },
    barber_update: (data) => {
      if (!data?.barber_id) return
      setBarbers(prev => prev.map(b =>
        b.id == data.barber_id ? { ...b, status: data.status === 'available' ? 'active' : data.status } : b
      ))
    }
  })

  // Idle timer
  const resetIdleTimer = () => {
    clearTimeout(idleTimer.current)
    if (step > 0 && !paymentPending) {
      idleTimer.current = setTimeout(() => setIdleCountdown(COUNT_SECS), IDLE_SECS * 1000)
    }
  }
  const dismissIdle = () => { setIdleCountdown(null); clearTimeout(countTimer.current); resetIdleTimer() }

  useEffect(() => { resetIdleTimer(); return () => clearTimeout(idleTimer.current) }, [step, paymentPending]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (idleCountdown === null) return
    if (idleCountdown <= 0) { reset(); return }
    countTimer.current = setTimeout(() => setIdleCountdown(c => c - 1), 1000)
    return () => clearTimeout(countTimer.current)
  }, [idleCountdown]) // eslint-disable-line react-hooks/exhaustive-deps

  const svcTotal = cart.reduce((s, id) => {
    const svc = services.find(x => x.id === id)
    return s + parseFloat(svc?.price || svc?.base_price || 0)
  }, 0)
  const extrasTotal = selectedExtras.reduce((s, id) => {
    const item = menuItems.find(x => x.stock_id === id || x.id === id)
    return s + parseFloat(item?.price || 0)
  }, 0)
  const cartTotal = svcTotal + extrasTotal

  const reset = () => {
    setStep(0); setCart([]); setBarber(null); setSlot(null)
    setName(''); setPhone(''); setGroup([]); setSelectedExtras([])
    setOwnColorToggles({}); setBooking(null); setPointsUsed(0); setIdleCountdown(null)
    clearTimeout(idleTimer.current); clearTimeout(countTimer.current)
  }

  const addAnother = () => {
    if (booking) setGroup(g => [...g, booking])
    setStep(1); setCart([]); setBarber(null); setSlot(null)
    setName(''); setPhone(''); setSelectedExtras([]); setOwnColorToggles({}); setBooking(null); setPointsUsed(0)
  }

  return (
    <div onClick={resetIdleTimer}>
      <GS />
      {!isOnline && <OfflineBanner />}
      {idleCountdown !== null && <IdleOverlay seconds={idleCountdown} onDismiss={dismissIdle} />}
      {paymentPending && paymentBooking && (
        <PaymentTakeover
          bookingData={paymentBooking}
          branchId={branchId}
          feedbackTags={feedbackTags}
          settings={settings}
          onDone={() => { setPaymentPending(false); setPaymentBooking(null) }}
        />
      )}
      {barberPanelOpen && (
        <BarberPanel
          barbers={barbers}
          branchId={branchId}
          onClose={() => setBarberPanelOpen(false)}
          onHome={() => { setBarberPanelOpen(false); reset() }}
          triggerPayment={(data) => { setPaymentBooking(data); setPaymentPending(true) }}
        />
      )}
      {staffPanelOpen && (
        <StaffPanel
          branchId={branchId}
          onClose={() => setStaffPanelOpen(false)}
        />
      )}
      <Topbar
        step={step}
        cartTotal={cartTotal}
        groupCount={group.length}
        branchName={branchName}
        onHome={reset}
        onBarberAccess={() => setBarberPanelOpen(true)}
        onStaffAccess={() => setStaffPanelOpen(true)}
      />
      {step === 0 && (
        <Welcome
          onStart={() => setStep(1)}
          settings={settings}
          branchName={branchName}
        />
      )}
      {step === 1 && (
        <ServiceSelection
          services={services}
          cart={cart}
          setCart={setCart}
          ownColorToggles={ownColorToggles}
          setOwnColorToggles={setOwnColorToggles}
          settings={settings}
          onNext={() => setStep(2)}
          onBack={() => { if (group.length > 0) { setStep(5) } else { setStep(0) } }}
        />
      )}
      {step === 2 && (
        <BarberSelection
          barbers={barbers}
          services={services}
          serviceIds={cart}
          barber={barber}
          setBarber={setBarber}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <TimeSlot
          barber={barber}
          branchId={branchId}
          serviceIds={cart}
          services={services}
          menuItems={menuItems}
          slot={slot}
          setSlot={setSlot}
          selectedExtras={selectedExtras}
          setSelectedExtras={setSelectedExtras}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <Confirm
          cart={cart}
          services={services}
          barber={barber}
          slot={slot}
          selectedExtras={selectedExtras}
          menuItems={menuItems}
          name={name}
          setName={setName}
          phone={phone}
          setPhone={setPhone}
          branchId={branchId}
          settings={settings}
          onConfirm={(bk, pts) => { setBooking(bk); setPointsUsed(pts || 0); setStep(5) }}
          onBack={() => setStep(3)}
        />
      )}
      {step === 5 && (
        <QueueNumber
          booking={booking}
          group={group}
          name={name}
          cart={cart}
          services={services}
          barber={barber}
          barbers={barbers}
          slot={slot}
          pointsUsed={pointsUsed}
          onAddAnother={addAnother}
          onReset={reset}
          settings={settings}
        />
      )}
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function KioskApp() {
  const [config, setConfig] = useState(() => {
    const stored = localStorage.getItem('kiosk_config')
    if (stored && getKioskToken()) {
      try { return JSON.parse(stored) } catch { return null }
    }
    return null
  })

  // Re-validate token and refresh config on mount
  useEffect(() => {
    if (!getKioskToken()) return
    kioskApi.post('/kiosk/register', { token: getKioskToken() })
      .then(data => {
        localStorage.setItem('kiosk_config', JSON.stringify(data))
        localStorage.setItem('kiosk_branch_id', data.branch_id)
        localStorage.setItem('kiosk_branch_name', data.branch_name)
        setConfig(data)
      })
      .catch(() => {
        // token still valid if we have cached config; just keep it
      })
  }, [])

  if (!config) {
    return <DeviceSetup onRegistered={(data) => setConfig(data)} />
  }
  return <KioskContent config={config} />
}
