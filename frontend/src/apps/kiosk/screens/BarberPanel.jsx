import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

// ── PIN screen shown before the panel ─────────────────────────────────────────
function PinScreen({ barbers, onUnlock, onClose }) {
  const [pin,       setPin]    = useState('')
  const [error,     setError]  = useState('')
  const [busy,      setBusy]   = useState(false)
  const [barberId,  setBarberId] = useState(barbers[0]?.id || '')

  const tryPin = async () => {
    if (pin.length < 4) return
    setBusy(true); setError('')
    try {
      await kioskApi.post(`/barbers/${barberId}/verify-pin`, { pin })
      const b = barbers.find(x => x.id === barberId)
      onUnlock(b)
    } catch {
      setError('PIN salah. Coba lagi.')
      setPin('')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100%', padding:'clamp(24px,4vw,48px)' }}>
      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:'clamp(20px,3vw,28px)', color:C.white, marginBottom:24, textAlign:'center' }}>
        Barber Login / Masuk Kapster
      </div>

      <div style={{ background:'#1a1a18', borderRadius:16, padding:'clamp(24px,3vw,36px)', width:'100%', maxWidth:400 }}>
        {/* Select barber */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#555', marginBottom:6 }}>Select Barber</label>
          <select value={barberId} onChange={e => setBarberId(e.target.value)}
            style={{ width:'100%', padding:'clamp(12px,1.6vw,14px)', borderRadius:10, border:'1.5px solid #2a2a28', background:'#111', color:C.white, fontSize:'clamp(14px,1.6vw,16px)', fontFamily:"'DM Sans',sans-serif" }}>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#555', marginBottom:6 }}>PIN</label>
        <input type="password" inputMode="numeric" maxLength={6} value={pin}
          onChange={e => { setPin(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && tryPin()}
          placeholder="● ● ● ●"
          autoFocus
          style={{ width:'100%', padding:'clamp(14px,1.8vw,18px) 16px', borderRadius:12, border:`2px solid ${error ? C.danger : '#2a2a28'}`, fontSize:'clamp(20px,2.6vw,26px)', fontFamily:'monospace', letterSpacing:'0.3em', textAlign:'center', background:'#111', color:C.white, marginBottom:8 }} />
        {error && <div style={{ color:C.danger, fontSize:'clamp(12px,1.4vw,14px)', marginBottom:12 }}>{error}</div>}

        <div style={{ display:'flex', gap:10, marginTop:12 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'clamp(12px,1.6vw,16px)', borderRadius:10, background:'#2a2a28', color:'#888', fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:'clamp(14px,1.6vw,16px)', border:'none', cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={tryPin} disabled={pin.length < 4 || busy}
            style={{ flex:2, padding:'clamp(12px,1.6vw,16px)', borderRadius:10, background:pin.length >= 4 ? C.accent : '#2a2a28', color:pin.length >= 4 ? C.accentText : '#555', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'clamp(14px,1.6vw,16px)', border:'none', cursor:pin.length >= 4 ? 'pointer' : 'not-allowed' }}>
            {busy ? 'Checking…' : 'Login →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Barber Panel after unlock ──────────────────────────────────────────────────
function BarberPanelInner({ barber, branchId, onClose, onHome }) {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [busy,     setBusy]     = useState(null)

  const today = new Date().toISOString().slice(0, 10)

  const load = () => {
    setLoading(true)
    kioskApi.get(`/bookings?branch_id=${branchId}&barber_id=${barber.id}&date=${today}`)
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const action = async (bookingId, endpoint) => {
    setBusy(bookingId)
    try {
      await kioskApi.patch(`/bookings/${bookingId}/${endpoint}`)
      load()
    } catch (err) {
      alert(err.message)
    } finally { setBusy(null) }
  }

  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const inProgress = bookings.filter(b => b.status === 'in_progress')
  const done = bookings.filter(b => ['completed', 'pending_payment', 'cancelled', 'no_show'].includes(b.status))

  const BookingCard = ({ bk }) => (
    <div style={{ background:'#1a1a18', borderRadius:12, padding:'clamp(12px,1.6vw,16px)', marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'clamp(14px,1.7vw,17px)', color:C.white }}>{bk.customer_name || 'Guest'}</div>
          <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#666', marginTop:2 }}>{bk.slot_time || 'Now'} · {fmt(bk.total_amount)}</div>
        </div>
        <span style={{ padding:'3px 8px', borderRadius:6, fontSize:'clamp(10px,1.1vw,11px)', fontWeight:700, background:bk.status === 'confirmed' ? '#1d4ed8' : bk.status === 'in_progress' ? '#15803d' : '#2a2a28', color:C.white }}>
          {bk.status.replace('_', ' ')}
        </span>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        {bk.status === 'confirmed' && (
          <>
            <button onClick={() => action(bk.id, 'start')} disabled={busy === bk.id}
              style={{ flex:1, padding:'clamp(10px,1.4vw,12px)', borderRadius:8, background:C.accent, color:C.accentText, fontWeight:700, fontSize:'clamp(12px,1.4vw,14px)', border:'none', cursor:'pointer' }}>
              {busy === bk.id ? '…' : '▶ Mulai'}
            </button>
            <button onClick={() => action(bk.id, 'no-show')} disabled={busy === bk.id}
              style={{ padding:'clamp(10px,1.4vw,12px) clamp(12px,1.6vw,16px)', borderRadius:8, background:'#2a2a28', color:'#888', fontWeight:600, fontSize:'clamp(11px,1.3vw,13px)', border:'none', cursor:'pointer' }}>
              No Show
            </button>
          </>
        )}
        {bk.status === 'in_progress' && (
          <button onClick={() => action(bk.id, 'complete')} disabled={busy === bk.id}
            style={{ flex:1, padding:'clamp(10px,1.4vw,12px)', borderRadius:8, background:'#16a34a', color:C.white, fontWeight:700, fontSize:'clamp(12px,1.4vw,14px)', border:'none', cursor:'pointer' }}>
            {busy === bk.id ? '…' : '✓ Selesai → Payment'}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div style={{ background:'#0a0a08', padding:'0 clamp(16px,2.4vw,28px)', height:'clamp(52px,6.5vh,64px)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, borderBottom:'1px solid #1a1a18' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height:'clamp(22px,2.8vh,28px)', objectFit:'contain' }} />
          <div style={{ width:1, height:24, background:'#2a2a28' }} />
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:'clamp(16px,2vw,20px)', color:C.white }}>{barber.name}</div>
            <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#555' }}>Barber Panel · {today}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} style={{ background:'#2a2a28', border:'none', borderRadius:8, padding:'8px 14px', color:'#888', fontSize:'clamp(12px,1.4vw,14px)', cursor:'pointer' }}>↻ Refresh</button>
          <button onClick={onClose} style={{ background:'#2a2a28', border:'none', borderRadius:8, width:36, height:36, color:'#888', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
      </div>

      {/* Queue */}
      <div className="scroll-y" style={{ flex:1, padding:'clamp(12px,1.6vw,18px) clamp(16px,2.2vw,24px)' }}>
        {loading && <div style={{ color:'#555', textAlign:'center', paddingTop:40 }}>Loading…</div>}

        {!loading && inProgress.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'#15803d', marginBottom:8 }}>In Progress</div>
            {inProgress.map(b => <BookingCard key={b.id} bk={b} />)}
          </div>
        )}
        {!loading && confirmed.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'#888', marginBottom:8 }}>Queue · Antrian ({confirmed.length})</div>
            {confirmed.map(b => <BookingCard key={b.id} bk={b} />)}
          </div>
        )}
        {!loading && confirmed.length === 0 && inProgress.length === 0 && (
          <div style={{ textAlign:'center', color:'#555', paddingTop:48, fontSize:'clamp(14px,1.6vw,16px)' }}>
            No bookings in queue<br />
            <span style={{ fontSize:'clamp(11px,1.3vw,13px)' }}>Tidak ada antrian saat ini</span>
          </div>
        )}
        {!loading && done.length > 0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'#2a2a28', marginBottom:8 }}>Completed Today</div>
            {done.map(b => (
              <div key={b.id} style={{ background:'#111', borderRadius:10, padding:'clamp(8px,1.2vw,12px) clamp(10px,1.4vw,14px)', marginBottom:6, display:'flex', justifyContent:'space-between', opacity:0.5 }}>
                <span style={{ fontSize:'clamp(12px,1.4vw,14px)', color:'#555' }}>{b.customer_name || 'Guest'}</span>
                <span style={{ fontSize:'clamp(11px,1.3vw,13px)', color:'#444' }}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:'clamp(12px,1.6vw,16px) clamp(16px,2.2vw,24px)', borderTop:'1px solid #1a1a18', flexShrink:0 }}>
        <button onClick={onHome}
          style={{ width:'100%', padding:'clamp(12px,1.6vw,14px)', borderRadius:10, background:'#2a2a28', color:'#888', fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:'clamp(13px,1.5vw,15px)', border:'none', cursor:'pointer' }}>
          ← Back to Kiosk
        </button>
      </div>
    </div>
  )
}

export default function BarberPanel({ barbers, branchId, onClose, onHome }) {
  const [unlockedBarber, setUnlockedBarber] = useState(null)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:7000, background:C.topBg, display:'flex', flexDirection:'column' }}>
      {!unlockedBarber
        ? <PinScreen barbers={barbers} onUnlock={setUnlockedBarber} onClose={onClose} />
        : <BarberPanelInner barber={unlockedBarber} branchId={branchId} onClose={onClose} onHome={onHome} />
      }
    </div>
  )
}
