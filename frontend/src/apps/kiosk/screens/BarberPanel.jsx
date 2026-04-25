import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'
import { speak } from '../../../shared/speak.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const p = n => String(n).padStart(2, '0')
  return h > 0 ? `${p(h)}:${p(m % 60)}:${p(s % 60)}` : `${p(m)}:${p(s % 60)}`
}

const STATUS_META = {
  available: { dot: '#4caf50', label: 'Siap', bg: '#1a3a1a' },
  busy: { dot: '#ef9a50', label: 'Melayani', bg: '#3a2a0a' },
  in_service: { dot: '#ef9a50', label: 'Melayani', bg: '#3a2a0a' },
  on_break: { dot: C.accent, label: 'Istirahat', bg: '#2a2a0a' },
  clocked_out: { dot: '#444', label: 'Belum Masuk', bg: '#1a1a1a' },
}

// ── Break Selector ────────────────────────────────────────────────────────────

function BreakSelector({ onStart, onCancel, availableUntil, nextTime }) {
  const opts = [
    { dur: 15, label: '15 menit', sub: 'Istirahat singkat' },
    { dur: 30, label: '30 menit', sub: 'Makan siang' },
    { dur: 45, label: '45 menit', sub: 'Istirahat panjang' },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onCancel}>
      <div style={{ background: C.white, borderRadius: 20, width: '100%', maxWidth: 'clamp(300px,38vw,360px)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: C.topBg, padding: 'clamp(16px,2vw,20px) clamp(20px,2.6vw,24px)' }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.9vw,18px)', color: C.white }}>Pilih Durasi Istirahat</div>
          <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: '#888', marginTop: 3 }}>Slot Anda diblokir selama istirahat</div>
        </div>
        <div style={{ padding: 'clamp(14px,1.8vw,18px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opts.map(o => {
            const disabled = o.dur > availableUntil
            return (
              <button key={o.dur} onClick={() => !disabled && onStart(o.dur)}
                style={{
                  padding: 'clamp(14px,1.8vw,16px)', borderRadius: 12,
                  background: disabled ? '#f9f9f9' : C.surface,
                  border: `1.5px solid ${disabled ? '#eee' : C.border}`,
                  textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(14px,1.8vw,17px)', color: disabled ? '#aaa' : C.text }}>{o.label}</div>
                    <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: disabled ? '#ccc' : C.muted, marginTop: 2 }}>{o.sub}</div>
                  </div>
                  {disabled && (
                    <div style={{ background: '#fee2e2', color: '#ef4444', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                      Booked {nextTime}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
          <button onClick={onCancel}
            style={{ padding: 'clamp(12px,1.5vw,14px)', borderRadius: 10, background: 'none', border: `1.5px solid ${C.border}`, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(13px,1.5vw,14px)', color: C.text2, cursor: 'pointer' }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PIN Screen ────────────────────────────────────────────────────────────────

function PinScreen({ barber, onUnlock, onBack, onHome }) {
  const [pin,   setPin]   = useState('')
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  const tryPin = async () => {
    if (pin.length < 4 || busy) return
    setBusy(true); setError('')
    try {
      await kioskApi.post(`/barbers/${barber.id}/verify-pin`, { pin })
      onUnlock()
    } catch {
      setError('PIN salah. Coba lagi.')
      setPin('')
    } finally { setBusy(false) }
  }

  useEffect(() => {
    if (pin.length === 4) {
      tryPin()
    }
  }, [pin])

  const pressKey = (key) => {
    setError('')
    if (key === 'C')  { setPin(''); return }
    if (key === '⌫')  { setPin(p => p.slice(0, -1)); return }
    if (pin.length < 4) setPin(p => p + key)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: C.topBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: '#0a0a08', padding: '0 clamp(16px,2.4vw,28px)', height: 'clamp(52px,6.5vh,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #1a1a18' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" onClick={onHome} style={{ height: 'clamp(22px,2.8vh,28px)', objectFit: 'contain', cursor: 'pointer' }} />
          <div style={{ width: 1, height: 24, background: '#2a2a28' }} />
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.8vw,18px)', color: C.white }}>Masukkan PIN (4 digits)</div>
          </div>
        </div>
        <button onClick={onBack}
          style={{ padding: 'clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)', borderRadius: 8, background: '#1a1a18', color: '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(12px,1.4vw,14px)', border: '1px solid #2a2a28', cursor: 'pointer' }}>
          ← Kembali
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,3vw,36px)' }}>

        {/* Avatar + name */}
        <div style={{ width: 'clamp(64px,8vw,84px)', height: 'clamp(64px,8vw,84px)', borderRadius: '50%', background: '#111110', border: `2px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 'clamp(20px,2.6vw,28px)', color: C.accent }}>{barber.name.slice(0, 2).toUpperCase()}</span>
        </div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(20px,2.6vw,26px)', color: C.white, marginBottom: 4 }}>{barber.name}</div>
        {(barber.specialization || barber.spec) && (
          <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: '#555', marginBottom: 20 }}>{barber.specialization || barber.spec}</div>
        )}

        {/* Boxed PIN Display */}
        <div style={{ width: '100%', maxWidth: 'clamp(260px,32vw,320px)', padding: 'clamp(14px,1.8vw,18px) 16px', borderRadius: 16, border: `2px solid ${error ? C.danger : '#2a2a28'}`, fontSize: 'clamp(20px,2.6vw,26px)', fontFamily: 'monospace', letterSpacing: '0.3em', textAlign: 'center', background: '#111110', marginBottom: error ? 12 : 28, minHeight: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white }}>
          {pin ? pin.split('').map(() => '●').join('') : <span style={{ color: '#888', letterSpacing: 0 }}>● ● ● ●</span>}
        </div>
        
        {error && <div style={{ color: C.danger, fontSize: 'clamp(13px,1.6vw,15px)', marginBottom: 16, fontWeight: 600 }}>{error}</div>}

        {/* Keypad */}
        <div style={{ width: '100%', maxWidth: 'clamp(300px,38vw,420px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(10px,1.4vw,14px)' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map(key => {
              const isAction = typeof key === 'string'
              return (
                <button key={key} onClick={() => pressKey(String(key))}
                  style={{
                    padding: 'clamp(18px,2.4vw,24px) 0',
                    borderRadius: 14,
                    background: key === 'C' ? '#2a0a0a' : isAction ? '#1e1e1c' : C.white,
                    border: `1.5px solid ${key === 'C' ? '#5a1a1a' : '#2a2a28'}`,
                    color: key === 'C' ? C.danger : isAction ? '#888' : C.text,
                    fontFamily: "'Inter',sans-serif",
                    fontSize: 'clamp(20px,2.6vw,28px)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minHeight: 'clamp(64px,8vh,80px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.1s, background 0.1s',
                    transform: 'scale(1)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {key}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Barber Picker ─────────────────────────────────────────────────────────────

function BarberPicker({ branchId, onSelect, onClose, onHome, lastQueueUpdate }) {
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(null)

  const loadBarbers = () => {
    kioskApi.get(`/barbers?branch_id=${branchId}`)
      .then(data => setBarbers(Array.isArray(data) ? data : []))
      .catch(() => setBarbers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadBarbers() }, [branchId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (lastQueueUpdate) loadBarbers() }, [lastQueueUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCall = (e, barber) => {
    e.stopPropagation()
    speak(`Panggil kapster ${barber.name}. Tamu sedang menunggu.`)
    setCalling(barber.id)
    setTimeout(() => setCalling(c => c === barber.id ? null : c), 3000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: C.topBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: '#0a0a08', padding: '0 clamp(16px,2.4vw,28px)', height: 'clamp(52px,6.5vh,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #1a1a18' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" onClick={onHome} style={{ height: 'clamp(22px,2.8vh,28px)', objectFit: 'contain', cursor: 'pointer' }} />
          <div style={{ width: 1, height: 24, background: '#2a2a28' }} />
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.8vw,18px)', color: C.white }}>Pilih Kapster</div>
            <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', color: '#555' }}>Ketuk nama Anda untuk masuk · Tap your name to continue</div>
          </div>
        </div>
        <button onClick={onClose}
          style={{ padding: 'clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)', borderRadius: 8, background: '#1a1a18', color: '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(12px,1.4vw,14px)', border: '1px solid #2a2a28', cursor: 'pointer' }}>
          ← Kembali ke Booking
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(16px,2vw,24px) clamp(16px,2.4vw,28px)', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', paddingTop: 60, fontSize: 'clamp(14px,1.6vw,16px)' }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(200px,22vw,260px), 1fr))', gap: 'clamp(10px,1.4vw,14px)' }}>
            {barbers.map((b, i) => {
              const rawStatus = b.current_status || b.status || 'clocked_out'
              const sm = STATUS_META[rawStatus] || STATUS_META.clocked_out
              const isCalling = calling === b.id

              return (
                <div key={b.id} onClick={() => onSelect(b)}
                  style={{ background: '#1a1a18', borderRadius: 16, padding: 'clamp(16px,2vw,20px)', border: '1.5px solid #2a2a28', cursor: 'pointer', animation: `fadeUp 0.25s ease ${i * 0.05}s both`, transition: 'border-color 0.15s, background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a38'; e.currentTarget.style.background = '#1e1e1c' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a28'; e.currentTarget.style.background = '#1a1a18' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ width: 'clamp(44px,5.5vw,56px)', height: 'clamp(44px,5.5vw,56px)', borderRadius: '50%', background: '#111110', border: `2px solid ${rawStatus === 'clocked_out' ? '#2a2a28' : C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 'clamp(13px,1.6vw,16px)', color: rawStatus === 'clocked_out' ? '#444' : C.accent }}>{b.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: sm.bg, padding: '4px 9px', borderRadius: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 'clamp(9px,1.1vw,11px)', fontWeight: 700, color: sm.dot, letterSpacing: '0.08em' }}>{sm.label}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.8vw,18px)', color: rawStatus === 'clocked_out' ? '#555' : C.white, marginBottom: 3 }}>{b.name}</div>
                  <div style={{ fontSize: 'clamp(10px,1.2vw,12px)', color: '#555', marginBottom: 12 }}>
                    {b.specialization || b.spec || 'Barber'}
                    {(b.chair_number || b.chair) ? ` · Kursi ${b.chair_number || b.chair}` : ''}
                  </div>
                  {b.next_customer_name ? (
                    <div style={{ background: '#111110', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <div style={{ fontSize: 'clamp(9px,1.1vw,10px)', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {(rawStatus === 'in_service') ? '⚡ Melayani' : '→ Berikutnya'}
                        </div>
                        {b.next_slot_time && (
                          <div style={{
                            fontSize: 'clamp(9px,1.1vw,10px)', fontWeight: 700, color: (() => {
                              const [h, m] = b.next_slot_time.split(':').map(Number)
                              const now = new Date()
                              const slot = new Date()
                              slot.setHours(h, m, 0, 0)
                              const diff = Math.floor((slot - now) / 60000)
                              return diff < 0 ? '#ef5350' : diff < 10 ? '#ef9a50' : '#4caf50'
                            })()
                          }}>
                            {(() => {
                              const [h, m] = b.next_slot_time.split(':').map(Number)
                              const now = new Date()
                              const slot = new Date()
                              slot.setHours(h, m, 0, 0)
                              const diff = Math.floor((slot - now) / 60000)
                              if (diff < 0) return `${Math.abs(diff)}m terlambat`
                              if (diff < 60) return `${diff}m lagi`
                              return b.next_slot_time
                            })()}
                          </div>
                        )}
                      </div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', color: (rawStatus === 'in_service') ? C.accent : C.white }}>
                        {(rawStatus === 'in_service') ? b.serving_customer_name : b.next_customer_name}
                      </div>
                    </div>
                  ) : (rawStatus === 'in_service') && b.serving_customer_name && (
                    <div style={{ background: '#111110', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                      <div style={{ fontSize: 'clamp(9px,1.1vw,10px)', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>⚡ Melayani</div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', color: C.accent }}>{b.serving_customer_name}</div>
                    </div>
                  )}
                  <button onClick={e => handleCall(e, b)}
                    style={{ width: '100%', padding: 'clamp(9px,1.2vw,11px)', borderRadius: 9, background: isCalling ? '#1a3a1a' : '#2a2a28', color: isCalling ? '#4caf50' : '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', border: 'none', cursor: 'pointer', minHeight: 40, transition: 'all 0.2s' }}>
                    {isCalling ? '✓ Dipanggil' : '📢 Panggil Kapster'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}

// ── Barber Detail ─────────────────────────────────────────────────────────────

function BarberDetail({ barber, branchId, onBack, onHome, lastQueueUpdate }) {
  const today = new Date().toISOString().slice(0, 10)

  const [queue,        setQueue]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [status,       setStatus]       = useState(barber.current_status || barber.status || 'clocked_out')
  const [attendanceId, setAttendanceId] = useState(null)
  const [breakId,      setBreakId]      = useState(null)
  const [breakEnd,     setBreakEnd]     = useState(null)
  const [breakLeft,    setBreakLeft]    = useState(0)
  const [showBreak,    setShowBreak]    = useState(false)
  const [earningsView, setEarningsView] = useState('today')

  const active = queue.find(b => b.status === 'in_progress') || null
  const done   = queue.filter(b => b.status === 'completed')

  const commissionRate   = barber.commission_rate ?? 35
  const commissionEarned = done.reduce((a, b) => {
    const svcs = b.booking_services || b.services || []
    return a + svcs.reduce((acc, s) => acc + Math.round((parseFloat(s.price) || 0) * (parseFloat(s.commission_rate) || commissionRate) / 100), 0)
  }, 0)
  const tipsEarned = done.reduce((a, b) => a + parseFloat(b.tip || 0), 0)

  const loadQueue = () => {
    kioskApi.get(`/bookings?barber_id=${barber.id}&date=${today}`)
      .then(data => setQueue(Array.isArray(data) ? data : []))
      .catch(() => setQueue([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadQueue() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (lastQueueUpdate) loadQueue() }, [lastQueueUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!breakEnd) return
    const t = setInterval(() => {
      const left = breakEnd - Date.now()
      if (left <= 0) { setBreakLeft(0); setBreakEnd(null); setStatus('available') }
      else setBreakLeft(left)
    }, 1000)
    return () => clearInterval(t)
  }, [breakEnd])

  const handleClockIn = async () => {
    try {
      const res = await kioskApi.post('/attendance/clock-in', { barber_id: barber.id, branch_id: branchId })
      setAttendanceId(res?.id || res?.attendance_id || null)
      setStatus('available')
    } catch (err) { alert(err.message || 'Clock in failed') }
  }

  const hasRemaining = queue.some(b => ['confirmed', 'in_progress'].includes(b.status))

  const handleClockOut = async () => {
    if (hasRemaining) {
      alert('Tidak bisa clock out. Masih ada booking yang harus diselesaikan atau dibatalkan.')
      return
    }
    if (!window.confirm('Yakin ingin clock out?')) return
    try {
      await kioskApi.post('/attendance/clock-out', { barber_id: barber.id })
      onBack()
    } catch (err) { alert(err.message || 'Clock out failed') }
  }

  const handleStartBreak = async (dur) => {
    try {
      const res = await kioskApi.post('/barber-breaks', { barber_id: barber.id, duration_minutes: dur })
      setBreakId(res?.id || null)
      setBreakEnd(Date.now() + dur * 60 * 1000)
      setStatus('on_break')
      setShowBreak(false)
    } catch (err) { alert(err.message || 'Break failed') }
  }

  const handleEndBreak = async () => {
    try {
      if (breakId) await kioskApi.patch(`/barber-breaks/${breakId}/end`)
      setBreakId(null); setBreakEnd(null); setBreakLeft(0); setStatus('available')
    } catch (err) { alert(err.message || 'End break failed') }
  }

  const isOut   = status === 'clocked_out'
  const isBreak = status === 'on_break'
  const isBusy  = status === 'in_service'

  const next       = queue.find(b => b.status === 'confirmed') || null
  const allBookings = [...queue].sort((a, b) => {
    const order = { in_progress: 0, confirmed: 1, completed: 2, no_show: 3, cancelled: 4 }
    return (order[a.status] ?? 5) - (order[b.status] ?? 5)
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: C.topBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {showBreak && (
        <BreakSelector
          availableUntil={(() => {
            if (!next?.slot_time) return 999
            const [h, m] = next.slot_time.split(':').map(Number)
            const slotMin = h * 60 + m
            const d = new Date()
            const witaMs = d.getTime() + (d.getTimezoneOffset() * 60000) + (8 * 3600000)
            const w = new Date(witaMs)
            const nowMin = w.getHours() * 60 + w.getMinutes()
            return slotMin - nowMin
          })()}
          nextTime={next?.slot_time}
          onStart={handleStartBreak}
          onCancel={() => setShowBreak(false)}
        />
      )}

      {/* Top bar */}
      <div style={{ background: '#0a0a08', padding: '0 clamp(16px,2.4vw,28px)', height: 'clamp(52px,6.5vh,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #1a1a18' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" onClick={onHome} style={{ height: 'clamp(22px,2.8vh,28px)', objectFit: 'contain', cursor: 'pointer' }} />
          <div style={{ width: 1, height: 24, background: '#2a2a28' }} />
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.8vw,18px)', color: C.white }}>{barber.name}</div>
            <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', color: '#555' }}>
              {(barber.chair_number || barber.chair) ? `Kursi ${barber.chair_number || barber.chair} · ` : ''}
              {barber.specialization || barber.spec || 'Barber'}
            </div>
          </div>
        </div>
        <button onClick={onBack}
          style={{ padding: 'clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)', borderRadius: 8, background: '#1a1a18', color: '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(12px,1.4vw,14px)', border: '1px solid #2a2a28', cursor: 'pointer' }}>
          ← Ganti Kapster
        </button>
      </div>

      {/* Status action bar */}
      <div style={{ background: '#0d0d0b', padding: 'clamp(12px,1.6vw,16px) clamp(16px,2.4vw,28px)', display: 'flex', gap: 'clamp(10px,1.4vw,14px)', alignItems: 'stretch', flexShrink: 0, borderBottom: '1px solid #1a1a18' }}>
        {isOut ? (
          <button onClick={handleClockIn}
            style={{ flex: 1, padding: 'clamp(14px,1.8vw,18px)', borderRadius: 14, background: C.accent, color: C.accentText, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(14px,1.7vw,17px)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 72 }}>
            <span style={{ fontSize: 'clamp(18px,2.4vw,24px)' }}>🟢</span>
            <span>Clock In / Masuk</span>
            <span style={{ fontSize: 'clamp(10px,1.2vw,11px)', fontWeight: 400, opacity: 0.7 }}>Ketuk untuk mulai shift</span>
          </button>
        ) : (
          <button onClick={handleClockOut} disabled={hasRemaining}
            style={{
              flex: 1, padding: 'clamp(14px,1.8vw,18px)', borderRadius: 14,
              background: hasRemaining ? '#0d0d0b' : '#1a1a18',
              color: hasRemaining ? '#333' : '#888',
              fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(14px,1.7vw,17px)',
              border: `2px solid ${hasRemaining ? '#1a1a18' : '#2a2a28'}`,
              cursor: hasRemaining ? 'not-allowed' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 72
            }}>
            <span style={{ fontSize: 'clamp(18px,2.4vw,24px)', opacity: hasRemaining ? 0.3 : 1 }}>🔴</span>
            <span style={{ color: hasRemaining ? '#333' : C.white }}>Clock Out / Keluar</span>
            <span style={{ fontSize: 'clamp(10px,1.2vw,11px)', fontWeight: 400, color: hasRemaining ? '#222' : '#555' }}>
              {hasRemaining ? 'Selesaikan booking dulu' : 'Akhiri shift hari ini'}
            </span>
          </button>
        )}

        {isBreak ? (
          <button onClick={handleEndBreak}
            style={{ flex: 1.5, padding: 'clamp(14px,1.8vw,18px)', borderRadius: 14, background: '#2a2a10', color: C.accent, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(14px,1.7vw,17px)', border: '2px solid #3a3a10', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 72 }}>
            <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 'clamp(20px,2.6vw,28px)', fontVariantNumeric: 'tabular-nums', color: C.accent }}>{formatElapsed(breakLeft)}</span>
            <span>Akhiri Istirahat ☕</span>
            <span style={{ fontSize: 'clamp(10px,1.2vw,11px)', fontWeight: 400, color: '#888' }}>Ketuk untuk kembali bertugas</span>
          </button>
        ) : (
          <button onClick={() => !isOut && !isBusy && !active && setShowBreak(true)} disabled={isOut || isBusy || !!active}
            style={{ flex: 1.5, padding: 'clamp(14px,1.8vw,18px)', borderRadius: 14, background: (isOut || isBusy || active) ? '#111110' : '#1a1a18', color: (isOut || isBusy || active) ? '#333' : '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(14px,1.7vw,17px)', border: `2px solid ${(isOut || isBusy || active) ? '#1a1a18' : '#2a2a28'}`, cursor: (isOut || isBusy || active) ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 72, transition: 'all 0.15s' }}>
            <span style={{ fontSize: 'clamp(18px,2.4vw,24px)', opacity: (isOut || isBusy || active) ? 0.3 : 1 }}>☕</span>
            <span style={{ color: (isOut || isBusy || active) ? '#333' : C.white }}>Istirahat</span>
            <span style={{ fontSize: 'clamp(10px,1.2vw,11px)', fontWeight: 400, color: (isOut || isBusy || active) ? '#222' : '#444' }}>
              {active ? 'Selesaikan layanan dulu' : '15 · 30 · 45 menit'}
            </span>
          </button>
        )}

        <div style={{ flex: 1, padding: 'clamp(14px,1.8vw,18px)', borderRadius: 14, background: '#111110', border: '2px solid #1a1a18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 72 }}>
          {isOut && <><span style={{ fontSize: 'clamp(18px,2.4vw,24px)' }}>😴</span><span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', color: '#444' }}>Belum Masuk</span></>}
          {isBreak && <><span style={{ fontSize: 'clamp(18px,2.4vw,24px)' }}>🌿</span><span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', color: C.accent }}>Istirahat</span></>}
          {isBusy && <><span style={{ fontSize: 'clamp(18px,2.4vw,24px)' }}>✂️</span><span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', color: '#ef9a50' }}>Melayani</span></>}
          {!isOut && !isBreak && !isBusy && <><span style={{ fontSize: 'clamp(18px,2.4vw,24px)' }}>✅</span><span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', color: '#4caf50' }}>Siap Bertugas</span></>}
          <span style={{ fontSize: 'clamp(9px,1.1vw,10px)', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Status Shift</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Stats — full width */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>


          {/* Earnings */}
          <div style={{ padding: 'clamp(10px,1.3vw,14px) clamp(14px,1.8vw,20px)', flexShrink: 0, borderBottom: '1px solid #1a1a18' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'Komisi Hari Ini', value: fmt(commissionEarned), sub: 'Layanan Selesai', accent: '#4caf50' },
                { label: 'Tips Hari Ini', value: tipsEarned > 0 ? fmt(tipsEarned) : '—', sub: '100% untuk kamu', accent: C.accent },
                { label: 'Selesai', value: done.length, sub: `dari ${queue.length} booking`, accent: C.white },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: '#1a1a18', borderRadius: 12, padding: 'clamp(10px,1.4vw,14px)', border: '1.5px solid #2a2a28' }}>
                  <div style={{ fontSize: 'clamp(9px,1.1vw,10px)', fontWeight: 700, letterSpacing: '0.12em', color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 'clamp(17px,2.2vw,24px)', color: s.accent, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 'clamp(9px,1.1vw,11px)', color: '#444', marginTop: 5 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(10px,1.4vw,14px) clamp(14px,1.8vw,20px)', WebkitOverflowScrolling: 'touch' }}>
            {loading && <div style={{ color: '#555', textAlign: 'center', paddingTop: 32, fontSize: 'clamp(13px,1.5vw,14px)' }}>Loading…</div>}
            {!loading && allBookings.length === 0 && (
              <div style={{ color: '#555', textAlign: 'center', paddingTop: 32, fontSize: 'clamp(13px,1.5vw,14px)' }}>Belum ada booking hari ini</div>
            )}
            {allBookings.map((b, i) => {
              const isCompleted = b.status === 'completed'
              const isActive = b.status === 'in_progress'
              const isUpcoming = b.status === 'confirmed'
              const isBad = b.status === 'no_show' || b.status === 'cancelled'
              const accent = isCompleted ? '#4caf50' : isActive ? C.accent : isUpcoming ? '#888' : '#555'
              const labelText = isCompleted ? 'Selesai' : isActive ? 'Dilayani' : isUpcoming ? (b.slot_time || 'Antri') : b.status === 'no_show' ? 'Tidak Hadir' : 'Dibatalkan'
              const labelBg = isCompleted ? '#0d1f0d' : isActive ? '#1a1a0a' : isUpcoming ? '#1a1a1a' : '#1a0d0d'
              const commission = isCompleted ? Math.round(parseFloat(b.total_amount || 0) * commissionRate / 100) : null

              const rawSvcs = b.booking_services || b.services || []
              const svcList = Array.isArray(rawSvcs)
                ? rawSvcs.map(s => ({ name: s.service_name || s.name || '', dur: parseInt(s.duration_minutes || s.duration_min || 0) }))
                : []

              return (
                <div key={b.id}
                  style={{ display: 'flex', marginBottom: 8, borderRadius: 12, overflow: 'hidden', background: '#1a1a18', border: '1px solid #222', animation: `fadeUp 0.2s ease ${i * 0.05}s both`, opacity: isBad ? 0.5 : 1 }}>
                  <div style={{ width: 4, flexShrink: 0, background: accent }} />
                  <div style={{ flex: 1, padding: 'clamp(10px,1.4vw,13px) clamp(11px,1.5vw,14px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 'clamp(10px,1.2vw,11px)', fontWeight: 700, color: accent, background: labelBg, borderRadius: 4, padding: '2px 8px', letterSpacing: '0.06em' }}>{labelText}</span>
                        {!isUpcoming && b.slot_time && <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.4vw,13px)', color: '#666' }}>{b.slot_time}</span>}
                        {b.queue_number && <span style={{ fontSize: 'clamp(10px,1.2vw,11px)', color: '#333', background: '#111', borderRadius: 4, padding: '2px 6px' }}>#{b.queue_number}</span>}
                      </div>
                      {isCompleted && commission !== null ? (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(13px,1.6vw,15px)', color: '#4caf50' }}>+{fmt(commission)}</div>
                          <div style={{ fontSize: 'clamp(9px,1.1vw,10px)', color: '#3a6a3a', letterSpacing: '0.07em' }}>KOMISI{parseFloat(b.tip || 0) > 0 ? ` · +${fmt(parseFloat(b.tip))} tip` : ''}</div>
                        </div>
                      ) : (
                        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', color: isBad ? '#444' : '#666', flexShrink: 0 }}>{fmt(parseFloat(b.total_amount || 0))}</div>
                      )}
                    </div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', color: isBad ? '#555' : C.white, marginBottom: 7 }}>{b.customer_name || 'Guest'}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {svcList.map((s, si) => (
                        <span key={si} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'clamp(10px,1.2vw,12px)', fontWeight: 600, color: isBad ? '#444' : isCompleted ? '#5aaa5a' : isActive ? C.accentText : '#888', background: isBad ? '#111' : isCompleted ? '#0d1f0d' : isActive ? C.accent : '#111110', border: `1px solid ${isBad ? '#1a1a18' : isCompleted ? '#1e3a1e' : isActive ? C.accent : '#2a2a28'}`, borderRadius: 5, padding: '3px 9px' }}>
                          {s.name}{s.dur > 0 && <span style={{ opacity: 0.6, fontWeight: 400 }}>· {s.dur}m</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function BarberPanel({ branchId, onClose, onHome, lastQueueUpdate }) {
  const [step, setStep] = useState('picker')
  const [barber, setBarber] = useState(null)

  if (step === 'pin' && barber) {
    return (
      <PinScreen
        barber={barber}
        onUnlock={() => setStep('detail')}
        onBack={() => { setStep('picker'); setBarber(null) }}
        onHome={onHome}
      />
    )
  }
  if (step === 'detail' && barber) {
    return (
      <BarberDetail
        barber={barber}
        branchId={branchId}
        lastQueueUpdate={lastQueueUpdate}
        onBack={() => { setStep('picker'); setBarber(null) }}
        onHome={onHome}
      />
    )
  }
  return (
    <BarberPicker
      branchId={branchId}
      lastQueueUpdate={lastQueueUpdate}
      onSelect={b => { setBarber(b); setStep('pin') }}
      onClose={onClose}
      onHome={onHome}
    />
  )
}
