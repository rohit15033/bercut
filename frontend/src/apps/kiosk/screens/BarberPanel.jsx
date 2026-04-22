import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

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

// ── Add Service Modal ─────────────────────────────────────────────────────────

function AddServiceModal({ booking, services, onConfirm, onClose }) {
  const cats = [...new Set(services.map(s => s.category || 'Layanan'))]
  const [cat, setCat] = useState(cats[0] || '')
  const [added, setAdded] = useState([])
  const existing = (booking.booking_services || []).map(s => s.service_id || s.id)
  const filtered = services.filter(s => (s.category || 'Layanan') === cat && !existing.includes(s.id))
  const toggle = id => setAdded(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const total = services.filter(s => added.includes(s.id)).reduce((a, s) => a + parseFloat(s.price || s.base_price || 0), 0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 600, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '72vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: 'clamp(14px,1.8vw,20px) clamp(20px,2.6vw,28px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1.5px solid ${C.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', fontWeight: 700, letterSpacing: '0.12em', color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Tambah Layanan · Add Service</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.9vw,18px)', color: C.text }}>untuk {booking.customer_name || 'Guest'}</div>
          </div>
          <button onClick={onClose} style={{ background: C.surface, border: 'none', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', color: C.text2 }}>×</button>
        </div>
        {cats.length > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '10px clamp(20px,2.6vw,28px)', borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
            {cats.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${cat === c ? C.text : C.border}`, background: cat === c ? C.text : C.white, color: cat === c ? C.white : C.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px,1.6vw,16px) clamp(20px,2.6vw,28px)', WebkitOverflowScrolling: 'touch' }}>
          {filtered.map(s => {
            const sel = added.includes(s.id)
            const dur = s.duration_minutes || 0
            return (
              <div key={s.id} onClick={() => toggle(s.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(12px,1.6vw,14px)', marginBottom: 8, borderRadius: 12, border: `1.5px solid ${sel ? C.accent : C.border}`, background: sel ? C.accent : C.white, cursor: 'pointer', minHeight: 60 }}>
                <div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', color: sel ? C.accentText : C.text }}>{s.name}</div>
                  <div style={{ fontSize: 'clamp(11px,1.3vw,12px)', color: sel ? C.accentText : C.muted, marginTop: 2 }}>⏱ {dur} min</div>
                </div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.7vw,16px)', color: sel ? C.accentText : C.text }}>{fmt(parseFloat(s.price || s.base_price || 0))}</div>
              </div>
            )
          })}
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: '24px 0', fontSize: 'clamp(13px,1.5vw,14px)' }}>Tidak ada layanan tersedia</div>}
        </div>
        {added.length > 0 && (
          <div style={{ padding: 'clamp(12px,1.6vw,16px) clamp(20px,2.6vw,28px)', borderTop: `1.5px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: C.muted }}>Tambahan total</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(16px,2vw,20px)', color: C.text }}>+{fmt(total)}</div>
            </div>
            <button onClick={() => onConfirm(added)}
              style={{ padding: 'clamp(13px,1.7vw,15px) clamp(20px,2.6vw,26px)', borderRadius: 12, background: C.topBg, color: C.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', border: 'none', cursor: 'pointer', minHeight: 52 }}>
              Konfirmasi ({added.length}) →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── PIN Screen ────────────────────────────────────────────────────────────────

function PinScreen({ barber, onUnlock, onBack }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const tryPin = async () => {
    if (pin.length < 4) return
    setBusy(true); setError('')
    try {
      await kioskApi.post(`/barbers/${barber.id}/verify-pin`, { pin })
      onUnlock()
    } catch {
      setError('PIN salah. Coba lagi.')
      setPin('')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: C.topBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: '#0a0a08', padding: '0 clamp(16px,2.4vw,28px)', height: 'clamp(52px,6.5vh,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #1a1a18' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height: 'clamp(22px,2.8vh,28px)', objectFit: 'contain' }} />
          <div style={{ width: 1, height: 24, background: '#2a2a28' }} />
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.8vw,18px)', color: C.white }}>Masukkan PIN</div>
            <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', color: '#555' }}>Enter your PIN to continue</div>
          </div>
        </div>
        <button onClick={onBack}
          style={{ padding: 'clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)', borderRadius: 8, background: '#1a1a18', color: '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(12px,1.4vw,14px)', border: '1px solid #2a2a28', cursor: 'pointer' }}>
          ← Kembali
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px,4vw,48px)' }}>
        <div style={{ width: 'clamp(64px,8vw,80px)', height: 'clamp(64px,8vw,80px)', borderRadius: '50%', background: '#111110', border: `2px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 'clamp(20px,2.6vw,28px)', color: C.accent }}>{barber.name.slice(0, 2).toUpperCase()}</span>
        </div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(20px,2.6vw,26px)', color: C.white, marginBottom: 4 }}>{barber.name}</div>
        {(barber.specialization || barber.spec) && (
          <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: '#555', marginBottom: 24 }}>{barber.specialization || barber.spec}</div>
        )}
        <div style={{ background: '#1a1a18', borderRadius: 16, padding: 'clamp(24px,3vw,36px)', width: '100%', maxWidth: 360 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: 8 }}>PIN Kapster</label>
          <input type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={e => { setPin(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && tryPin()}
            placeholder="● ● ● ●"
            autoFocus
            style={{ width: '100%', padding: 'clamp(14px,1.8vw,18px) 16px', borderRadius: 12, border: `2px solid ${error ? C.danger : '#2a2a28'}`, fontSize: 'clamp(20px,2.6vw,26px)', fontFamily: 'monospace', letterSpacing: '0.3em', textAlign: 'center', background: '#111', color: C.white, marginBottom: 8 }} />
          {error && <div style={{ color: C.danger, fontSize: 'clamp(12px,1.4vw,14px)', marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={onBack}
              style={{ flex: 1, padding: 'clamp(12px,1.6vw,16px)', borderRadius: 10, background: '#2a2a28', color: '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(14px,1.6vw,16px)', border: 'none', cursor: 'pointer' }}>
              Batal
            </button>
            <button onClick={tryPin} disabled={pin.length < 4 || busy}
              style={{ flex: 2, padding: 'clamp(12px,1.6vw,16px)', borderRadius: 10, background: pin.length >= 4 ? C.accent : '#2a2a28', color: pin.length >= 4 ? C.accentText : '#555', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(14px,1.6vw,16px)', border: 'none', cursor: pin.length >= 4 ? 'pointer' : 'not-allowed' }}>
              {busy ? 'Memeriksa…' : 'Masuk →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Barber Picker ─────────────────────────────────────────────────────────────

function BarberPicker({ branchId, onSelect, onClose, lastQueueUpdate }) {
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(null)

  const loadBarbers = () => {
    kioskApi.get(`/barbers?branch_id=${branchId}`)
      .then(data => setBarbers(Array.isArray(data) ? data.filter(b => b.is_active !== false) : []))
      .catch(() => setBarbers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadBarbers() }, [branchId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (lastQueueUpdate) loadBarbers() }, [lastQueueUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCall = (e, barber) => {
    e.stopPropagation()
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(`Panggil kapster ${barber.name}. Tamu sedang menunggu.`)
    u.lang = 'id-ID'
    window.speechSynthesis.speak(u)
    setCalling(barber.id)
    setTimeout(() => setCalling(c => c === barber.id ? null : c), 3000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: C.topBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: '#0a0a08', padding: '0 clamp(16px,2.4vw,28px)', height: 'clamp(52px,6.5vh,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #1a1a18' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height: 'clamp(22px,2.8vh,28px)', objectFit: 'contain' }} />
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
                          {(rawStatus === 'busy' || rawStatus === 'in_service') ? '⚡ Melayani' : '→ Berikutnya'}
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
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', color: (rawStatus === 'busy' || rawStatus === 'in_service') ? C.accent : C.white }}>
                        {(rawStatus === 'busy' || rawStatus === 'in_service') ? b.serving_customer_name : b.next_customer_name}
                      </div>
                    </div>
                  ) : (rawStatus === 'busy' || rawStatus === 'in_service') && b.serving_customer_name && (
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

function BarberDetail({ barber, branchId, onBack, onClose, triggerPayment, lastQueueUpdate }) {
  const today = new Date().toISOString().slice(0, 10)

  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState([])
  const [status, setStatus] = useState(barber.current_status || barber.status || 'clocked_out')
  const [attendanceId, setAttendanceId] = useState(null)
  const [breakId, setBreakId] = useState(null)
  const [breakEnd, setBreakEnd] = useState(null)
  const [breakLeft, setBreakLeft] = useState(0)
  const [showBreak, setShowBreak] = useState(false)
  const [showAddSvc, setShowAddSvc] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [announced, setAnnounced] = useState(false)
  const [alertSent, setAlertSent] = useState(false)
  const [earningsView, setEarningsView] = useState('today')
  const [busyId, setBusyId] = useState(null)
  const [now, setNow] = useState(Date.now())

  const active = queue.find(b => b.status === 'in_progress') || null
  const next = queue.find(b => b.status === 'confirmed') || null
  const done = queue.filter(b => b.status === 'completed')

  const commissionRate = barber.commission_rate ?? 35
  const commissionEarned = done.reduce((a, b) => {
    const services = b.booking_services || b.services || []
    const svcComm = services.reduce((acc, s) => acc + Math.round((parseFloat(s.price) || 0) * (parseFloat(s.commission_rate) || commissionRate) / 100), 0)
    return a + svcComm
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
    kioskApi.get(`/services?branch_id=${branchId}`)
      .then(data => setServices(Array.isArray(data) ? data.filter(s => s.is_active !== false) : []))
      .catch(() => { })
  }, [branchId])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!active?.started_at) return
    const startMs = new Date(active.started_at).getTime()
    const t = setInterval(() => setElapsed(Date.now() - startMs), 1000)
    return () => clearInterval(t)
  }, [active?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!breakEnd) return
    const t = setInterval(() => {
      const left = breakEnd - Date.now()
      if (left <= 0) { setBreakLeft(0); setBreakEnd(null); setStatus('available') }
      else setBreakLeft(left)
    }, 1000)
    return () => clearInterval(t)
  }, [breakEnd])

  const nextLateMin = (() => {
    if (!next?.slot_time) return 0
    const [h, m] = next.slot_time.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return 0
    const slotMs = new Date().setHours(h, m, 0, 0)
    const overMs = now - slotMs
    return overMs > 0 ? Math.floor(overMs / 60000) : 0
  })()

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

  const handleStart = async (bookingId) => {
    setBusyId(bookingId)
    try {
      await kioskApi.patch(`/bookings/${bookingId}/start`)
      setStatus('busy'); setElapsed(0); setAnnounced(false)
      loadQueue()
    } catch (err) { alert(err.message || 'Start failed') }
    finally { setBusyId(null) }
  }

  const handleComplete = async (bookingId) => {
    setBusyId(bookingId)
    try {
      console.log('[BarberPanel] Completing booking:', bookingId)
      const res = await kioskApi.patch(`/bookings/${bookingId}/complete`)
      console.log('[BarberPanel] Complete response:', res)
      
      setStatus('available')
      
      // Crucial: Trigger payment immediately using the response data
      if (typeof triggerPayment === 'function') {
        console.log('[BarberPanel] Triggering payment takeover...')
        triggerPayment({ 
          ...res, 
          id: res.id || bookingId, 
          booking_id: res.id || bookingId, 
          amount: res.total_amount 
        })
      } else {
        console.warn('[BarberPanel] triggerPayment prop is missing or not a function')
      }
      
      onClose()
    } catch (err) { 
      console.error('[BarberPanel] Complete failed:', err)
      alert(err.message || 'Complete failed') 
    }
    finally { setBusyId(null) }
  }

  const handleNoShow = async (bookingId) => {
    setBusyId(bookingId)
    try {
      await kioskApi.patch(`/bookings/${bookingId}/no-show`)
      loadQueue()
    } catch (err) { alert(err.message || 'No-show failed') }
    finally { setBusyId(null) }
  }

  const handleAddServices = async (serviceIds) => {
    if (!active) return
    setBusyId(active.id)
    try {
      await kioskApi.patch(`/bookings/${active.id}/add-services`, { service_ids: serviceIds })
      setShowAddSvc(false)
      loadQueue()
    } catch (err) { alert(err.message || 'Add services failed') }
    finally { setBusyId(null) }
  }

  const handleRemoveService = async (serviceId) => {
    if (!active) return
    if (!window.confirm('Hapus layanan tambahan ini?')) return
    setBusyId(active.id)
    try {
      await kioskApi.delete(`/bookings/${active.id}/services/${serviceId}`)
      loadQueue()
    } catch (err) { alert(err.message || 'Remove service failed') }
    finally { setBusyId(null) }
  }

  const handleCall = (name) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(`Panggil kapster ${barber.name}. Tamu atas nama ${name} sedang menunggu.`)
      u.lang = 'id-ID'; u.rate = 0.95
      window.speechSynthesis.speak(u)
    }
    setAnnounced(true)
  }

  const handleClientNotArrived = (id) => {
    setAlertSent(true)
    kioskApi.post(`/bookings/${id}/client-not-arrived`).catch(() => { })
  }

  const isOut = status === 'clocked_out'
  const isBreak = status === 'on_break'
  const isBusy = status === 'busy'

  const allBookings = [
    ...done,
    ...(active ? [active] : []),
    ...(next ? [next] : []),
    ...queue.filter(b => b.status === 'confirmed' && b !== next),
    ...queue.filter(b => b.status === 'no_show' || b.status === 'cancelled'),
  ].filter((b, i, arr) => arr.indexOf(b) === i)

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
      {showAddSvc && active && <AddServiceModal booking={active} services={services} onConfirm={handleAddServices} onClose={() => setShowAddSvc(false)} />}

      {/* Top bar */}
      <div style={{ background: '#0a0a08', padding: '0 clamp(16px,2.4vw,28px)', height: 'clamp(52px,6.5vh,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #1a1a18' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height: 'clamp(22px,2.8vh,28px)', objectFit: 'contain' }} />
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

      {/* Body — two columns */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left — Queue */}
        <div style={{ width: 'clamp(320px,42vw,480px)', borderRight: '1px solid #1a1a18', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>

          {/* Sekarang */}
          <div style={{ padding: 'clamp(14px,1.8vw,20px)', borderBottom: '1px solid #1a1a18', flexShrink: 0 }}>
            <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', fontWeight: 700, letterSpacing: '0.14em', color: '#444', textTransform: 'uppercase', marginBottom: 10 }}>⚡ Sekarang</div>
            {loading ? (
              <div style={{ background: '#1a1a18', borderRadius: 14, padding: 'clamp(16px,2vw,22px)', textAlign: 'center' }}>
                <div style={{ color: '#555', fontSize: 'clamp(12px,1.4vw,14px)' }}>Loading…</div>
              </div>
            ) : active ? (
              <div style={{ background: '#1a1a18', borderRadius: 14, padding: 'clamp(12px,1.6vw,16px)', border: '1.5px solid #2a2a28' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(16px,2vw,22px)', color: C.white }}>{active.customer_name || 'Guest'}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {(active.booking_services || active.services || []).map((s, si) => {
                        const isAdded = s.added_mid_cut === true
                        return (
                          <div key={si} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isAdded ? '#1a1a0a' : '#111', border: `1px solid ${isAdded ? '#3a3a1a' : '#222'}`, borderRadius: 6, padding: '4px 10px' }}>
                            <span style={{ fontSize: 'clamp(10px,1.2vw,12px)', color: isAdded ? C.accent : '#999', fontWeight: 600 }}>
                              {isAdded ? '+ ' : ''}{s.service_name || s.name}
                            </span>
                            {isAdded && (
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveService(s.service_id || s.id) }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', padding: 0, fontSize: 14, cursor: 'pointer', marginLeft: 4, fontWeight: 900, display: 'flex', alignItems: 'center' }}>
                                ×
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {active.queue_number && <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(11px,1.3vw,13px)', color: '#555' }}>#{active.queue_number}</div>}
                </div>
                {(() => {
                  const estMin = (active.booking_services || []).reduce((a, s) => a + (parseInt(s.duration_minutes) || 0), 0) || 30
                  const estMs = estMin * 60 * 1000
                  const diffMs = elapsed - estMs
                  const isOver = diffMs > 0
                  const diffMin = Math.abs(Math.floor(diffMs / 60000))
                  return (
                    <div style={{ background: '#111110', borderRadius: 9, padding: '9px 13px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 'clamp(10px,1.2vw,11px)', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Waktu berjalan</span>
                        <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 'clamp(18px,2.4vw,24px)', color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{formatElapsed(elapsed)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 'clamp(10px,1.2vw,11px)', color: '#444' }}>Estimasi: {formatElapsed(estMs)}</span>
                        <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(11px,1.3vw,13px)', color: elapsed < 5000 ? '#555' : isOver ? '#ef5350' : '#4caf50' }}>
                          {elapsed < 5000 ? '—' : isOver ? `+${diffMin}m melebihi` : diffMin === 0 ? 'tepat waktu' : `−${diffMin}m tersisa`}
                        </span>
                      </div>
                      <div style={{ marginTop: 7, height: 3, borderRadius: 2, background: '#1a1a18', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, estMs > 0 ? (elapsed / estMs) * 100 : 0)}%`, background: isOver ? '#ef5350' : C.accent, transition: 'width 1s linear' }} />
                      </div>
                    </div>
                  )
                })()}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowAddSvc(true)}
                    style={{ flex: 1, padding: 'clamp(11px,1.5vw,13px)', borderRadius: 9, background: '#2a2a28', color: C.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(12px,1.4vw,13px)', border: 'none', cursor: 'pointer', minHeight: 48 }}>
                    + Tambah
                  </button>
                  <button onClick={() => handleComplete(active.id)} disabled={busyId === active.id}
                    style={{ flex: 2, padding: 'clamp(11px,1.5vw,13px)', borderRadius: 9, background: C.accent, color: C.accentText, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', border: 'none', cursor: 'pointer', minHeight: 48 }}>
                    {busyId === active.id ? '…' : 'Selesai ✓'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: '#1a1a18', borderRadius: 14, padding: 'clamp(16px,2vw,22px)', textAlign: 'center', border: '1px dashed #2a2a28' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✂</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', color: '#555' }}>
                  {isBreak ? 'Sedang istirahat' : isOut ? 'Belum clock in' : 'Tidak ada pelanggan aktif'}
                </div>
              </div>
            )}
          </div>

          {/* Berikutnya */}
          {next && (
            <div style={{ padding: 'clamp(14px,1.8vw,20px)', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', fontWeight: 700, letterSpacing: '0.14em', color: '#444', textTransform: 'uppercase' }}>→ Berikutnya</div>
                {nextLateMin >= 5 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#2a0a0a', border: '1px solid #7a1a1a', borderRadius: 5, padding: '2px 8px' }}>
                    <span style={{ fontSize: 10 }}>⚠</span>
                    <span style={{ fontSize: 'clamp(9px,1.1vw,10px)', fontWeight: 700, color: '#ef5350', letterSpacing: '0.06em' }}>TERLAMBAT {nextLateMin}M</span>
                  </div>
                )}
              </div>
              <div style={{ background: '#1a1a18', borderRadius: 14, padding: 'clamp(12px,1.6vw,16px)', border: `1.5px solid ${nextLateMin >= 10 ? '#7a1a1a' : nextLateMin >= 5 ? '#5a3a0a' : '#2a2a28'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.8vw,18px)', color: C.white }}>{next.customer_name || 'Guest'}</div>
                    <div style={{ fontSize: 'clamp(11px,1.3vw,12px)', color: '#666', marginTop: 2 }}>
                      {(next.booking_services || []).map(s => s.service_name || s.name).filter(Boolean).join(' + ') || next.service_name || ''}
                    </div>
                    <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', color: nextLateMin >= 5 ? '#ef9a50' : '#444', marginTop: 4 }}>
                      Slot: {next.slot_time}{nextLateMin >= 5 ? ` · ${nextLateMin} menit terlambat` : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(13px,1.7vw,16px)', color: C.accent }}>{fmt(parseFloat(next.total_amount || 0))}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => handleCall(next.customer_name)}
                    style={{ flex: 1, minWidth: 60, padding: 'clamp(10px,1.3vw,12px)', borderRadius: 9, background: announced ? '#1a3a1a' : '#2a2a28', color: announced ? '#4caf50' : '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', border: 'none', cursor: 'pointer', minHeight: 44 }}>
                    {announced ? '✓ Dipanggil' : '📢 Panggil'}
                  </button>
                  <button onClick={() => !alertSent && handleClientNotArrived(next.id)} disabled={alertSent}
                    style={{ flex: 1, minWidth: 60, padding: 'clamp(10px,1.3vw,12px)', borderRadius: 9, background: alertSent ? '#1a2a1a' : '#2a2a28', color: alertSent ? '#4caf50' : '#888', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(11px,1.3vw,13px)', border: 'none', cursor: alertSent ? 'not-allowed' : 'pointer', minHeight: 44 }}>
                    {alertSent ? '✓ Admin diberitahu' : '⚠ Belum Datang'}
                  </button>
                  <button onClick={() => !active && !isBreak && !isOut && handleStart(next.id)}
                    disabled={!!active || isBreak || isOut || busyId === next.id}
                    style={{ flex: 2, minWidth: 100, padding: 'clamp(10px,1.3vw,12px)', borderRadius: 9, background: (!active && !isBreak && !isOut) ? C.white : '#2a2a28', color: (!active && !isBreak && !isOut) ? C.text : '#555', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 'clamp(12px,1.5vw,14px)', border: 'none', cursor: (!active && !isBreak && !isOut) ? 'pointer' : 'not-allowed', minHeight: 44 }}>
                    {busyId === next.id ? '…' : active ? 'Selesaikan dulu ↑' : isBreak ? 'Sedang istirahat' : isOut ? 'Clock in dulu' : 'Mulai Layanan →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!next && !loading && (
            <div style={{ padding: 'clamp(14px,1.8vw,20px)', flex: 1 }}>
              <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', fontWeight: 700, letterSpacing: '0.14em', color: '#2a2a28', textTransform: 'uppercase', marginBottom: 10 }}>→ Berikutnya</div>
              <div style={{ color: '#333', fontSize: 'clamp(12px,1.4vw,13px)', textAlign: 'center', paddingTop: 16 }}>Antrian kosong</div>
            </div>
          )}
        </div>

        {/* Right — Earnings + list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Earnings */}
          <div style={{ padding: 'clamp(10px,1.3vw,14px) clamp(14px,1.8vw,20px)', flexShrink: 0, borderBottom: '1px solid #1a1a18' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[['today', 'Hari Ini'], ['month', 'Bulan Ini']].map(([k, lbl]) => (
                <button key={k} onClick={() => setEarningsView(k)}
                  style={{ padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${earningsView === k ? C.accent : '#2a2a28'}`, background: earningsView === k ? '#1a1a0a' : '#111110', color: earningsView === k ? C.accent : '#555', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 'clamp(10px,1.2vw,12px)', cursor: 'pointer' }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(earningsView === 'today' ? [
                { label: 'Komisi', value: fmt(commissionEarned), sub: 'Layanan Selesai', accent: '#4caf50' },
                { label: 'Tips', value: tipsEarned > 0 ? fmt(tipsEarned) : '—', sub: '100% untuk kamu', accent: C.accent },
                { label: 'Selesai', value: done.length, sub: `dari ${queue.length} booking`, accent: C.white },
              ] : [
                { label: 'Komisi Bulan Ini', value: fmt(commissionEarned * 16), sub: 'Estimasi Pendapatan', accent: '#4caf50' },
                { label: 'Tips Bulan Ini', value: tipsEarned > 0 ? fmt(tipsEarned * 16) : '—', sub: '100% untuk kamu', accent: C.accent },
                { label: 'Total Layanan', value: done.length * 16, sub: 'estimasi bulan ini', accent: C.white },
              ]).map(s => (
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

export default function BarberPanel({ barbers: _barbers, branchId, onClose, onHome, triggerPayment, lastQueueUpdate }) {
  const [step, setStep] = useState('picker')
  const [barber, setBarber] = useState(null)

  if (step === 'pin' && barber) {
    return (
      <PinScreen
        barber={barber}
        onUnlock={() => setStep('detail')}
        onBack={() => { setStep('picker'); setBarber(null) }}
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
        onClose={onClose || onHome}
        triggerPayment={triggerPayment}
      />
    )
  }
  return (
    <BarberPicker
      branchId={branchId}
      lastQueueUpdate={lastQueueUpdate}
      onSelect={b => { setBarber(b); setStep('detail') }}
      onClose={onClose}
    />
  )
}
