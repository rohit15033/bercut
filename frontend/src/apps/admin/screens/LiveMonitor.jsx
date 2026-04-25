import { useState, useEffect, useCallback } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

const BARBER_STATUS = {
  busy:        { dot: '#16A34A', label: 'In Service'     },
  available:   { dot: '#2563EB', label: 'Available'      },
  on_break:    { dot: '#D97706', label: 'On Break'       },
  clocked_out: { dot: '#DDDBD4', label: 'Not Clocked In' },
  off:         { dot: '#DDDBD4', label: 'Day Off'        },
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

const BOOKING_STATUS = {
  in_progress:     { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'In Service'      },
  confirmed:       { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Waiting'         },
  pending_payment: { bg: '#FDF4FF', color: '#7C3AED', border: '#E9D5FF', label: 'Pending Payment' },
}

const EDITABLE_STATUSES = new Set(['confirmed', 'in_progress', 'pending_payment'])

const CANCEL_REASONS = [
  "Customer no-show — didn't arrive", 'Customer request', 'Barber unavailable',
  'Service not available today', 'Duplicate booking', 'Other',
]

const PAX_OUT_REASONS = ['Queue Full', 'Wait Too Long', 'Wrong Branch', 'Price', 'Other']

// ── CancelModal ───────────────────────────────────────────────────────────────

function CancelModal({ booking, barberName, onConfirm, onClose }) {
  const [reason,  setReason]  = useState('')
  const [custom,  setCustom]  = useState('')
  const [touched, setTouched] = useState(false)
  const finalReason = reason === 'Other' ? custom.trim() : reason
  const valid = finalReason.length > 0

  function handleConfirm() {
    setTouched(true)
    if (!valid) return
    onConfirm(booking.id, finalReason)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-card" style={{ width: 440, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>Cancel Booking</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
              {booking.booking_number} · {booking.customer_name} · <span style={{ fontWeight: 600 }}>{barberName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 8 }}>
            Reason <span style={{ color: '#DC2626' }}>*</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {CANCEL_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)}
                style={{ padding: '9px 13px', borderRadius: 8, textAlign: 'left', border: `1.5px solid ${reason === r ? T.topBg : T.border}`, background: reason === r ? T.topBg : T.white, color: reason === r ? T.white : T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.12s' }}>
                {r}
              </button>
            ))}
          </div>
          {reason === 'Other' && (
            <textarea value={custom} onChange={e => setCustom(e.target.value)} placeholder="Describe the reason..."
              style={{ width: '100%', marginTop: 8, padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${touched && !custom.trim() ? '#DC2626' : T.border}`, fontSize: 13, color: T.text, fontFamily: "'DM Sans',sans-serif", resize: 'vertical', minHeight: 70, boxSizing: 'border-box' }} />
          )}
          {touched && !valid && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 5 }}>Please select or enter a reason before cancelling.</div>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Back</button>
          <button onClick={handleConfirm} style={{ flex: 2, padding: 10, borderRadius: 9, background: '#DC2626', color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>Confirm Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── ForceStartModal ───────────────────────────────────────────────────────────

function ForceStartModal({ booking, barberName, onConfirm, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-card" style={{ width: 420, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 6 }}>Force Start Booking?</div>
        <div style={{ display: 'flex', gap: 10, padding: '11px 14px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 16 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
          <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
            <strong>Barber should always start the service themselves.</strong> Only use this if the barber is unable to tap Start and the customer is already seated.
          </div>
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20, lineHeight: 1.5 }}>
          Force-starting <strong style={{ color: T.text }}>{booking.customer_name}</strong> ({booking.booking_number}) on <strong style={{ color: T.text }}>{barberName}</strong>'s queue.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onConfirm(booking)} style={{ flex: 2, padding: 10, borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>Confirm Force Start</button>
        </div>
      </div>
    </div>
  )
}

// ── LogPaxOutModal ────────────────────────────────────────────────────────────

function LogPaxOutModal({ branches, onLog, onClose }) {
  const [branchId, setBranchId] = useState(branches[0]?.id || '')
  const [reason,   setReason]   = useState('Queue Full')

  async function handleLog() {
    try { await api.post('/bookings/pax-out', { branch_id: branchId, reason }) } catch (_) {}
    const time   = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    const branch = branches.find(b => b.id === branchId)
    onLog({ id: Date.now(), time, branch: branch?.city || '', reason, source: 'Admin' })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-card" style={{ width: 400, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>Log Pax Out</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>CCTV-observed walk-away</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Branch *</label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.white }}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>Reason *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {PAX_OUT_REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  style={{ padding: '7px 13px', borderRadius: 20, border: `1.5px solid ${reason === r ? T.topBg : T.border}`, background: reason === r ? T.topBg : 'transparent', color: reason === r ? T.white : T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.12s' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleLog} style={{ flex: 2, padding: 10, borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>Log Pax Out</button>
        </div>
      </div>
    </div>
  )
}

// ── ElapsedBar ────────────────────────────────────────────────────────────────

function ElapsedBar({ startedAt, estDurationMin, nextSlot }) {
  const elapsed   = startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000) : 0
  const total     = parseInt(estDurationMin) || 45
  const pct       = Math.min(100, Math.round((elapsed / total) * 100))
  const leftMin   = Math.max(0, total - elapsed)
  const overMin   = Math.max(0, elapsed - total)
  const isOverrun = elapsed > total

  let finish = '—'
  if (startedAt) {
    const finishDate = new Date(new Date(startedAt).getTime() + total * 60 * 1000)
    finish = finishDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  let conflictsNext = false
  if (!isOverrun && nextSlot) {
    const [h, m]   = nextSlot.split(':').map(Number)
    const slotDate = new Date(); slotDate.setHours(h, m, 0, 0)
    const finishDate = new Date(new Date(startedAt).getTime() + total * 60 * 1000)
    conflictsNext  = finishDate > slotDate
  }

  const barColor = isOverrun || conflictsNext ? '#DC2626' : pct >= 70 ? '#D97706' : '#16A34A'

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ marginBottom: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {isOverrun ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626' }}>+{overMin}m overrun ⚠</span>
        ) : (
          <span style={{ fontSize: 10, color: T.muted }}>
            {elapsed}m elapsed · Est. finish <strong style={{ color: conflictsNext ? '#DC2626' : T.text2 }}>{finish}</strong>
          </span>
        )}
        {conflictsNext && !isOverrun && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            ⚠ Overruns next slot ({nextSlot})
          </span>
        )}
      </div>
      <div style={{ height: 4, borderRadius: 2, background: T.surface2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: barColor, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

// ── NewBookingModal ───────────────────────────────────────────────────────────

function NewBookingModal({ branches, allBarbers, defaultBranchId, onSave, onClose }) {
  const pad = n => String(n).padStart(2, '0')
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`
  // Round time to nearest 30 min
  const rMin = Math.round(now.getMinutes() / 30) * 30
  const rH   = rMin === 60 ? now.getHours() + 1 : now.getHours()
  const initTime = `${pad(rH % 24)}:${pad(rMin % 60)}`

  const [branchId,     setBranchId]     = useState(defaultBranchId || branches[0]?.id || '')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone,setCustomerPhone]= useState('')
  const [barberId,     setBarberId]     = useState('')
  const [date,         setDate]         = useState(todayStr)
  const [time,         setTime]         = useState(initTime)
  const [notes,        setNotes]        = useState('')
  const [allServices,  setAllServices]  = useState([])
  const [selectedSvcs, setSelectedSvcs] = useState([])
  const [svcOpen,      setSvcOpen]      = useState(false)
  const [saving,       setSaving]       = useState(false)

  const branchBarbers = allBarbers.filter(b => b.branch_id === branchId)

  // Reset barber and services when branch changes
  useEffect(() => {
    setBarberId(branchBarbers[0]?.id || '')
    setSelectedSvcs([])
    if (!branchId) return
    api.get(`/services?branch_id=${branchId}`)
      .then(d => setAllServices(Array.isArray(d) ? d.filter(s => s.is_active !== false) : []))
      .catch(() => setAllServices([]))
  }, [branchId]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSvc(svc) {
    setSelectedSvcs(p =>
      p.find(s => s.id === svc.id)
        ? p.filter(s => s.id !== svc.id)
        : [...p, svc])
  }

  const fmt = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
  const total = selectedSvcs.reduce((a, s) => a + Number(s.price ?? 0), 0)

  async function handleSave() {
    if (!customerName.trim()) { alert('Customer name is required'); return }
    if (!barberId)            { alert('Please select a barber'); return }
    if (!selectedSvcs.length) { alert('Please select at least one service'); return }
    setSaving(true)
    try {
      await api.post('/bookings/admin-force', {
        branch_id:       branchId,
        customer_name:   customerName.trim(),
        customer_phone:  customerPhone.trim() || undefined,
        barber_id:       barberId,
        service_ids:     selectedSvcs.map(s => s.id),
        date,
        time,
        notes: notes.trim() || undefined,
      })
      onSave()
      onClose()
    } catch (err) { alert(err.message || 'Failed to create booking') }
    finally { setSaving(false) }
  }

  const labelStyle = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 6, display: 'block' }
  const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white, boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-card" style={{ width: 540, maxHeight: '88vh', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.18s ease both' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid ' + T.border, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>New Booking</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Force-create — bypasses availability conflicts</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Branch */}
          {branches.length > 1 && (
            <div>
              <label style={labelStyle}>Branch</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} style={inputStyle}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          {/* Customer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Customer Name <span style={{ color: '#DC2626' }}>*</span></label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. John Doe"
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone (optional)</label>
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="08xx…"
                style={inputStyle} />
            </div>
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Barber */}
          <div>
            <label style={labelStyle}>Barber <span style={{ color: '#DC2626' }}>*</span></label>
            <select value={barberId} onChange={e => setBarberId(e.target.value)} style={inputStyle}>
              <option value="">— select barber —</option>
              {branchBarbers.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.status === 'clocked_out' ? ' (not clocked in)' : b.status === 'on_break' ? ' (on break)' : b.status === 'busy' ? ' (in service)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Services */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Services <span style={{ color: '#DC2626' }}>*</span></label>
              <button onClick={() => setSvcOpen(o => !o)}
                style={{ padding: '4px 12px', borderRadius: 6, border: '1.5px solid ' + T.topBg, background: svcOpen ? T.topBg : 'transparent', color: svcOpen ? T.white : T.topBg, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {svcOpen ? '▲ Close' : '+ Add'}
              </button>
            </div>

            {svcOpen && (
              <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, marginBottom: 10, maxHeight: 180, overflowY: 'auto' }}>
                {allServices.length === 0 && <div style={{ padding: '12px 14px', fontSize: 12, color: T.muted }}>No services found for this branch</div>}
                {allServices.map(svc => {
                  const sel = selectedSvcs.find(s => s.id === svc.id)
                  return (
                    <button key={svc.id} onClick={() => toggleSvc(svc)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 14px', background: sel ? '#F0FDF4' : 'none', border: 'none', borderBottom: '1px solid ' + T.surface, cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.background = T.white }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'none' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: sel ? '#15803D' : T.text }}>{svc.name}{sel ? ' ✓' : ''}</span>
                      <span style={{ fontSize: 12, color: T.muted }}>{fmt(svc.price)}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedSvcs.length === 0 && !svcOpen && (
              <div style={{ fontSize: 12, color: T.muted, padding: '8px 0' }}>No services selected</div>
            )}
            {selectedSvcs.map(sv => (
              <div key={sv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + T.border, marginBottom: 6, background: T.white }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{sv.name}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{fmt(sv.price)}</div>
                </div>
                <button onClick={() => toggleSvc(sv)}
                  style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}

            {selectedSvcs.length > 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text2, textAlign: 'right', paddingTop: 4 }}>
                Total: {fmt(total)}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions…" rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid ' + T.border, display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: 10, borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating…' : 'Create Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── EditBookingModal ──────────────────────────────────────────────────────────

function EditBookingModal({ booking, allBarbers, onSave, onClose }) {
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [allServices,   setAllServices]   = useState([])
  const [currentSvcs,   setCurrentSvcs]   = useState([])
  const [originalSvcIds, setOriginalSvcIds] = useState([])
  const [barberId,      setBarberId]      = useState(booking.barber_id || '')
  const [saving,        setSaving]        = useState(false)
  const [addOpen,       setAddOpen]       = useState(false)

  // Parse booking's scheduled_at into local date + time strings for inputs
  const initDT = booking.scheduled_at ? new Date(booking.scheduled_at) : new Date()
  const pad = n => String(n).padStart(2, '0')
  const initDate = `${initDT.getFullYear()}-${pad(initDT.getMonth()+1)}-${pad(initDT.getDate())}`
  const initTime = `${pad(initDT.getHours())}:${pad(initDT.getMinutes())}`
  const [schedDate, setSchedDate] = useState(initDate)
  const [schedTime, setSchedTime] = useState(initTime)

  useEffect(() => {
    Promise.all([
      api.get(`/bookings/${booking.id}`),
      api.get(`/services?branch_id=${booking.branch_id}`),
    ]).then(([bk, svcs]) => {
      const loaded = (bk.services || []).map(s => ({ service_id: s.service_id, service_name: s.name, price: s.price }))
      setCurrentSvcs(loaded)
      setOriginalSvcIds(loaded.map(s => s.service_id))
      setAllServices(Array.isArray(svcs) ? svcs.filter(s => s.is_active !== false) : [])
    }).catch(() => {}).finally(() => setLoadingDetail(false))
  }, [booking.id, booking.branch_id])

  const currentIds  = currentSvcs.map(s => s.service_id)
  const addableSvcs = allServices.filter(s => !currentIds.includes(s.id))
  const branchBarbers = allBarbers.filter(b => b.branch_id === booking.branch_id && b.status !== 'clocked_out')

  function removeService(serviceId) {
    setCurrentSvcs(p => p.filter(s => s.service_id !== serviceId))
  }

  function addService(svc) {
    setCurrentSvcs(p => [...p, {
      service_id:    svc.id,
      service_name:  svc.name,
      price_charged: svc.price ?? 0,
    }])
    setAddOpen(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const nowIds   = currentSvcs.map(s => s.service_id)
      const toRemove = originalSvcIds.filter(id => !nowIds.includes(id))
      const toAdd    = nowIds.filter(id => !originalSvcIds.includes(id))

      // Build scheduled_at ISO string from local date+time inputs
      const newISO    = new Date(`${schedDate}T${schedTime}:00`).toISOString()
      const origISO   = booking.scheduled_at ? new Date(booking.scheduled_at).toISOString() : null
      const timeChanged = newISO !== origISO

      await api.patch(`/bookings/${booking.id}/admin-update`, {
        barber_id:          barberId !== booking.barber_id ? barberId : undefined,
        add_service_ids:    toAdd,
        remove_service_ids: toRemove,
        scheduled_at:       timeChanged ? newISO : undefined,
      })
      onSave()
      onClose()
    } catch (err) { alert(err.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  const fmt = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-card" style={{ width: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.18s ease both' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid ' + T.border, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>Edit Booking</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                {booking.booking_number} · {booking.customer_name}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
          {loadingDetail ? (
            <div style={{ textAlign: 'center', color: T.muted, padding: '32px 0' }}>Loading…</div>
          ) : (
            <>
              {/* Barber */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 8 }}>Barber</div>
                <select value={barberId} onChange={e => setBarberId(e.target.value)}
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white, cursor: 'pointer' }}>
                  {branchBarbers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}{b.status === 'busy' ? ' (In Service)' : b.status === 'on_break' ? ' (On Break)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Scheduled time */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 8 }}>Scheduled Time</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                    style={{ flex: 1, padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white }} />
                  <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                    style={{ width: 110, padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white }} />
                </div>
              </div>

              {/* Services */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted }}>Services</div>
                  <button onClick={() => setAddOpen(o => !o)}
                    style={{ padding: '4px 12px', borderRadius: 6, border: '1.5px solid ' + T.topBg, background: addOpen ? T.topBg : 'transparent', color: addOpen ? T.white : T.topBg, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    + Add Service
                  </button>
                </div>

                {/* Add service dropdown */}
                {addOpen && (
                  <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, marginBottom: 10, maxHeight: 180, overflowY: 'auto' }}>
                    {addableSvcs.length === 0 && (
                      <div style={{ padding: '12px 14px', fontSize: 12, color: T.muted }}>All services already added</div>
                    )}
                    {addableSvcs.map(svc => (
                      <button key={svc.id} onClick={() => addService(svc)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid ' + T.surface, cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = T.white}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{svc.name}</span>
                        <span style={{ fontSize: 12, color: T.muted }}>{fmt(svc.price)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Current services */}
                {currentSvcs.length === 0 && (
                  <div style={{ padding: '12px 0', fontSize: 12, color: T.muted }}>No services — add at least one</div>
                )}
                {currentSvcs.map(sv => (
                  <div key={sv.service_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, border: '1px solid ' + T.border, marginBottom: 7, background: T.white }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{sv.service_name || sv.name}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{fmt(sv.price_charged)}</div>
                    </div>
                    <button onClick={() => removeService(sv.service_id)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid ' + T.border, display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || loadingDetail || currentSvcs.length === 0}
            style={{ flex: 2, padding: 10, borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ReopenModal ───────────────────────────────────────────────────────────────

function ReopenModal({ booking, onConfirm, onClose }) {
  const [services,  setServices]  = useState([])
  const [selected,  setSelected]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    api.get(`/services?branch_id=${booking.branch_id}`)
      .then(data => setServices(Array.isArray(data) ? data.filter(s => s.is_active !== false) : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [booking.branch_id])

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  async function handleConfirm() {
    if (!selected.length) return
    setSaving(true)
    try {
      await api.patch(`/bookings/${booking.id}/reopen`, { service_ids: selected })
      onConfirm()
      onClose()
    } catch (err) { alert(err.message || 'Failed to reopen booking') }
    finally { setSaving(false) }
  }

  const newDuration = selected.reduce((s, id) => {
    const svc = services.find(x => x.id === id)
    return s + parseInt(svc?.duration_minutes || 30)
  }, 0)

  const existingServiceIds = new Set((booking.services || []).map(s => s.service_id))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.white, borderRadius: 16, padding: '28px 28px 24px', width: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 17, color: T.text, marginBottom: 4 }}>Add Service & Resume</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 18 }}>
          <b>{booking.booking_number}</b> · {booking.customer_name || booking.guest_name || 'Guest'} · Select additional service(s) to add
        </div>

        {loading ? (
          <div style={{ padding: '24px 0', color: T.muted, fontSize: 13 }}>Loading services…</div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
            {services.map(svc => {
              const sel = selected.includes(svc.id)
              const already = existingServiceIds.has(svc.id)
              return (
                <div key={svc.id} onClick={() => !already && toggle(svc.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${already ? T.border : sel ? '#16A34A' : T.border}`, background: already ? T.surface : sel ? 'rgba(22,163,74,0.06)' : T.white, cursor: already ? 'default' : 'pointer', transition: 'all 0.12s', opacity: already ? 0.6 : 1 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${already ? T.muted : sel ? '#16A34A' : T.border}`, background: already ? T.border : sel ? '#16A34A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {(sel || already) && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: already ? T.muted : T.text }}>{svc.name}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{already ? 'Already in booking' : `${svc.duration_minutes} min`}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: already ? T.muted : T.text2 }}>Rp {Number(svc.base_price || 0).toLocaleString('id-ID')}</div>
                </div>
              )
            })}
          </div>
        )}

        {selected.length > 0 && (
          <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, marginBottom: 14 }}>
            Est. additional time: {newDuration} min
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: `1.5px solid ${T.border}`, background: 'transparent', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: T.text2 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={!selected.length || saving}
            style={{ flex: 2, padding: '11px 0', borderRadius: 9, border: 'none', background: selected.length && !saving ? '#16A34A' : T.surface, color: selected.length && !saving ? '#fff' : T.muted, fontWeight: 700, fontSize: 14, cursor: selected.length && !saving ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Saving…' : `Resume with ${selected.length} service${selected.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── GroupModal ────────────────────────────────────────────────────────────────

function GroupModal({ anchor, allBarberQueues, onConfirm, onClose }) {
  const allBookings = allBarberQueues.flatMap(b => (b.queue || []).map(bk => ({ ...bk, barber_name: b.name })))

  const [selected, setSelected] = useState(() => {
    if (anchor.group_id) {
      const groupMembers = allBookings.filter(bk => bk.group_id === anchor.group_id).map(bk => bk.id)
      return new Set([anchor.id, ...groupMembers])
    }
    return new Set([anchor.id])
  })

  const toggle = id => setSelected(s => { const n = new Set(s); n.has(id) ? (id !== anchor.id && n.delete(id)) : n.add(id); return n })

  async function handleConfirm() {
    try {
      await api.post(`/bookings/merge-group`, { booking_ids: [...selected] })
      onConfirm()
      onClose()
    } catch (err) { alert(err.message || 'Failed to group bookings') }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.white, borderRadius: 16, padding: '28px 28px 24px', width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 17, color: T.text, marginBottom: 6 }}>Group for Payment</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Select bookings to pay together. <b>{anchor.booking_number}</b> is pre-selected.</div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {allBookings.map(bk => {
            const sel = selected.has(bk.id)
            const isAnchor = bk.id === anchor.id
            return (
              <div key={bk.id} onClick={() => toggle(bk.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${sel ? '#2563EB' : T.border}`, background: sel ? 'rgba(37,99,235,0.06)' : T.white, cursor: isAnchor ? 'default' : 'pointer', transition: 'all 0.12s' }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${sel ? '#2563EB' : T.border}`, background: sel ? '#2563EB' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {sel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{bk.booking_number}</span>
                    <span style={{ fontSize: 12, color: T.muted }}>{bk.customer_name || bk.guest_name || 'Guest'}</span>
                    {isAnchor && <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', background: 'rgba(37,99,235,0.1)', padding: '1px 6px', borderRadius: 4 }}>selected</span>}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{bk.barber_name} · {bk.service_names || '—'}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: bk.status === 'in_progress' ? '#16A34A' : T.muted, textTransform: 'uppercase' }}>{bk.status.replace('_', ' ')}</div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: `1.5px solid ${T.border}`, background: 'transparent', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: T.text2 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={selected.size < 2}
            style={{ flex: 2, padding: '11px 0', borderRadius: 9, border: 'none', background: selected.size >= 2 ? '#2563EB' : T.surface, color: selected.size >= 2 ? '#fff' : T.muted, fontWeight: 700, fontSize: 14, cursor: selected.size >= 2 ? 'pointer' : 'not-allowed' }}>
            Group {selected.size} Bookings Together
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ActionMenu ────────────────────────────────────────────────────────────────

function ActionMenu({ booking, barberBusy, onCancel, onStart, onEdit, onGroup, onReopen, onUnassign }) {
  const [open, setOpen] = useState(false)
  const isInProg    = booking.status === 'in_progress'
  const isEditable  = EDITABLE_STATUSES.has(booking.status)
  const isPendingPay = booking.status === 'pending_payment'

  function item(label, color, hoverBg, onClick, disabled = false) {
    return (
      <button onClick={disabled ? undefined : () => { onClick(); setOpen(false) }}
        style={{ width: '100%', padding: '9px 13px', background: 'none', border: 'none', color: disabled ? T.muted : color, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.45 : 1 }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = hoverBg }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
        {label}
      </button>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: 30, height: 30, borderRadius: 6, background: open ? T.surface : 'transparent', border: `1px solid ${open ? T.border : 'transparent'}`, color: T.muted, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', letterSpacing: '0.05em' }}
        onMouseEnter={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.border }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' } }}>
        ···
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 34, background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, zIndex: 9999, minWidth: 210, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden' }}
          onMouseLeave={() => setOpen(false)}>
          {isEditable && item('✏ Edit Barber / Services', T.text, T.bg, () => onEdit(booking))}
          {isEditable && item('⊕ Group for Payment', '#2563EB', 'rgba(37,99,235,0.06)', () => onGroup(booking))}
          {isPendingPay && item('＋ Add Service & Resume', '#16A34A', '#F0FDF4', () => onReopen(booking))}
          {!isInProg && !isPendingPay && item('▶ Force Start', '#15803D', '#F0FDF4', () => onStart(booking), barberBusy)}
          {booking.status === 'confirmed' && booking.barber_id && item('↩ Unassign Barber', '#D97706', '#FFFBEB', () => onUnassign(booking))}
          {item('✕ Cancel Booking', '#DC2626', '#FEF2F2', () => onCancel(booking))}
        </div>
      )}
    </div>
  )
}

// ── BarberActionMenu ──────────────────────────────────────────────────────────
function BarberActionMenu({ barber, onAction }) {
  const [open, setOpen] = useState(false)
  const status = barber.status || 'available'

  function item(label, color, onClick, disabled = false) {
    return (
      <button key={label} onClick={disabled ? undefined : () => { onClick(); setOpen(false) }}
        style={{ width: '100%', padding: '9px 13px', background: 'none', border: 'none', color: disabled ? T.muted : color, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.45 : 1 }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = T.bg }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
        {label}
      </button>
    )
  }

  return (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: 30, height: 30, borderRadius: 6, background: open ? T.surface : 'transparent', border: `1px solid ${open ? T.border : 'transparent'}`, color: T.muted, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        ⋮
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 34, background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, zIndex: 9999, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden' }}
          onMouseLeave={() => setOpen(false)}>
          {status === 'clocked_out' ? (
             item('⚡ Force Clock In', '#15803D', () => onAction(barber, 'clock-in'))
          ) : (
             item('🚪 Force Clock Out', '#DC2626', () => onAction(barber, 'clock-out'))
          )}
          
          {status === 'available' && item('☕ Force Break', '#D97706', () => onAction(barber, 'break'))}
          {status === 'on_break' && item('✅ End Break', '#15803D', () => onAction(barber, 'end-break'))}
        </div>
      )}
    </div>
  )
}

function BookingRow({ booking, onCancel, onStart, onEdit, onGroup, onReopen, onUnassign, allBarbers, barberBusy, nextSlot }) {
  const sm       = BOOKING_STATUS[booking.status] || BOOKING_STATUS.confirmed
  const isInProg = booking.status === 'in_progress'

  const schedTime = formatTime(booking.scheduled_at)
  const startTime = formatTime(booking.started_at)
  const estEnd    = booking.calculatedEstEnd ? booking.calculatedEstEnd.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'
  const serviceNames = booking.service_names || '—'

  const groupMembers = booking.group_id
    ? (allBarbers || []).flatMap(b => b.queue || []).filter(bk => bk.group_id === booking.group_id && bk.id !== booking.id)
    : []

  return (
    <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.surface}`, borderLeft: booking.client_not_arrived ? '3px solid #F59E0B' : booking.group_id ? '3px solid #7C3AED' : '3px solid transparent', background: booking.client_not_arrived ? '#FFFDF5' : 'transparent', transition: 'background 0.1s' }}
      onMouseEnter={e => { if (!booking.client_not_arrived) e.currentTarget.style.background = T.bg }}
      onMouseLeave={e => { e.currentTarget.style.background = booking.client_not_arrived ? '#FFFDF5' : 'transparent' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '45px 1fr 1.2fr 65px 65px 65px 90px 40px', alignItems: 'center', gap: 0 }}>
        <div>
          <span style={{ background: T.topBg, color: '#F5E200', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{booking.booking_number}</span>
        </div>
        <div style={{ paddingRight: 8, overflow: 'hidden' }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {booking.customer_name || 'Walk-in'}
          </div>
          {groupMembers.length > 0 && (
            <div style={{ fontSize: 10, color: '#7C3AED', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ⊕ Grouped · {[booking.customer_name || 'Walk-in', ...groupMembers.map(m => m.customer_name || 'Walk-in')].join(', ')}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
          {serviceNames}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.text2 }}>{schedTime}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: isInProg ? '#16A34A' : T.muted }}>{startTime}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{estEnd}</div>
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, whiteSpace: 'nowrap', display: 'inline-block' }}>
            {sm.label}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ActionMenu booking={booking} barberBusy={barberBusy} onCancel={onCancel} onStart={onStart} onEdit={onEdit} onGroup={onGroup} onReopen={onReopen} onUnassign={onUnassign} allBarbers={allBarbers} />
        </div>
      </div>

      {isInProg && (
        <div style={{ paddingLeft: 45, paddingRight: 40 }}>
          <ElapsedBar startedAt={booking.started_at} estDurationMin={booking.est_duration_min} nextSlot={nextSlot} />
        </div>
      )}
    </div>
  )
}

// ── BarberQueueBlock ──────────────────────────────────────────────────────────

function BarberQueueBlock({ barber, allBarbers, onCancel, onStart, onEdit, onGroup, onReopen, onUnassign, onBarberAction }) {
  const [expanded, setExpanded] = useState(true)
  const cfg        = BARBER_STATUS[barber.status] || BARBER_STATUS.available
  const activeQ    = (barber.queue || []).filter(b => EDITABLE_STATUSES.has(b.status))
  const alertCount = (barber.queue || []).filter(b => b.client_not_arrived).length

  return (
    <div style={{ border: `1px solid ${alertCount > 0 ? '#FDE68A' : T.border}`, borderRadius: 10, background: alertCount > 0 ? '#FEFCE8' : T.white, transition: 'all 0.15s', position: 'relative' }}>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: expanded && activeQ.length > 0 ? `1px solid ${T.border}` : 'none' }}>
        <div style={{ position: 'relative', flexShrink: 0 }} onClick={() => setExpanded(e => !e)}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 11, color: T.text }}>{barber.name?.slice(0, 2).toUpperCase()}</span>
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: cfg.dot, border: '2px solid white' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setExpanded(e => !e)}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{barber.name}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: cfg.dot, marginTop: 1 }}>{cfg.label}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {activeQ.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: T.topBg, color: T.white }}>{activeQ.length} in queue</span>
          )}
          {alertCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#F59E0B', color: '#FFFFFF' }}>⚠ {alertCount}</span>
          )}
          {activeQ.length === 0 && <span style={{ fontSize: 11, color: T.muted }}>No active queue</span>}
          <div style={{ width: 1, height: 20, background: T.border, margin: '0 4px' }} />
          <BarberActionMenu barber={barber} onAction={onBarberAction} />
        </div>
        {activeQ.length > 0 && <span style={{ fontSize: 12, color: T.muted, marginLeft: 4 }} onClick={() => setExpanded(e => !e)}>{expanded ? '▲' : '▼'}</span>}
      </div>

      {expanded && activeQ.length > 0 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '45px 1fr 1.2fr 65px 65px 65px 90px 40px', gap: 0, padding: '6px 14px', background: T.bg, borderBottom: `1px solid ${T.border}` }}>
            {['#', 'Customer', 'Services', 'Sched', 'Started', 'Est.End', 'Status', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.muted }}>{h}</div>
            ))}
          </div>
          {(() => {
            let lastFinish = new Date();
            return activeQ.map((bk, idx) => {
              const duration = parseInt(bk.est_duration_min) || 30;
              let estEnd;
              
              if (bk.status === 'in_progress') {
                const start = new Date(bk.started_at);
                estEnd = new Date(start.getTime() + duration * 60000);
              } else {
                const sched = new Date(bk.scheduled_at);
                const start = sched > lastFinish ? sched : lastFinish;
                estEnd = new Date(start.getTime() + duration * 60000);
              }
              lastFinish = estEnd;

              const nextConfirmed = activeQ.slice(idx + 1).find(q => q.status === 'confirmed')
              const nextSlotTime  = bk.status === 'in_progress' && nextConfirmed && nextConfirmed.scheduled_at
                ? new Date(nextConfirmed.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                : null
              
              return (
                <BookingRow key={bk.id} booking={{ ...bk, calculatedEstEnd: estEnd }}
                  onCancel={onCancel} onStart={onStart} onEdit={onEdit} onGroup={onGroup} onReopen={onReopen} onUnassign={onUnassign}
                  allBarbers={allBarbers} barberBusy={barber.status === 'busy'}
                  nextSlot={nextSlotTime}
                />
              )
            })
          })()}
        </div>
      )}
    </div>
  )
}

// ── BranchSection ─────────────────────────────────────────────────────────────

function UnassignedBlock({ bookings, allBarbers, onCancel, onEdit }) {
  if (!bookings?.length) return null
  return (
    <div style={{ marginBottom: 12, borderRadius: 10, border: '1.5px solid #FDE68A', background: '#FFFBEB', padding: '10px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#92400E', marginBottom: 8 }}>
        🔄 Waiting for Barber Assignment ({bookings.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {bookings.sort((a, z) => new Date(a.created_at) - new Date(z.created_at)).map(bk => (
          <div key={bk.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#FEF9C3', border: '1px solid #FDE68A' }}>
            <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 12, color: '#92400E', flexShrink: 0 }}>{bk.booking_number}</span>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#78350F', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bk.customer_name || bk.guest_name || 'Guest'}
            </span>
            <span style={{ fontSize: 11, color: '#A16207', flexShrink: 0 }}>{bk.service_names}</span>
            <button onClick={() => onEdit(bk)}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #D97706', background: 'transparent', color: '#92400E', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Assign
            </button>
            <button onClick={() => onCancel(bk)}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function BranchSection({ branch, barbers, unassigned = [], allBarbers, onCancel, onStart, onEdit, onGroup, onReopen, onUnassign, onBarberAction }) {
  const inService    = barbers.filter(b => b.status === 'busy').length
  const available    = barbers.filter(b => b.status === 'available').length
  const onBreak      = barbers.filter(b => b.status === 'on_break').length
  const totalWaiting = barbers.reduce((a, b) => a + (b.queue || []).filter(q => q.status === 'confirmed').length, 0) + unassigned.length
  const totalAlerts  = barbers.reduce((a, b) => a + (b.queue || []).filter(q => q.client_not_arrived).length, 0)

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, color: T.text }}>{branch.name}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {inService > 0    && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#F0FDF4', color: '#15803D' }}>{inService} in service</span>}
          {available > 0    && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#EFF6FF', color: '#1D4ED8' }}>{available} available</span>}
          {onBreak > 0      && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#FFFBEB', color: '#92400E' }}>{onBreak} on break</span>}
          {totalWaiting > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#F3F4F6', color: '#374151' }}>{totalWaiting} waiting</span>}
          {totalAlerts > 0  && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#FEF3C7', color: '#92400E' }}>⚠ {totalAlerts} alert{totalAlerts > 1 ? 's' : ''}</span>}
        </div>
      </div>
      <UnassignedBlock bookings={unassigned} allBarbers={allBarbers} onCancel={onCancel} onEdit={onEdit} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {barbers.map(b => (
          <BarberQueueBlock key={b.id} barber={b} allBarbers={allBarbers} onCancel={onCancel} onStart={onStart} onEdit={onEdit} onGroup={onGroup} onReopen={onReopen} onUnassign={onUnassign} onBarberAction={onBarberAction} />
        ))}
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function LiveMonitor() {
  const [branches,        setBranches]        = useState([])
  const [barberQueues,    setBarberQueues]     = useState([])
  const [unassignedByBranch, setUnassignedByBranch] = useState({})
  const [branchFilter,    setBranchFilter]     = useState('all')
  const [cancelModal,     setCancelModal]      = useState(null)
  const [forceStartModal, setForceStartModal]  = useState(null)
  const [editModal,       setEditModal]        = useState(null)
  const [groupModal,      setGroupModal]       = useState(null)
  const [reopenModal,     setReopenModal]      = useState(null)
  const [showPaxModal,    setShowPaxModal]     = useState(false)
  const [showNewBooking,  setShowNewBooking]   = useState(false)
  const [showPaxPanel,    setShowPaxPanel]     = useState(false)
  const [paxOutEvents,    setPaxOutEvents]     = useState([])
  const [lastRefresh,     setLastRefresh]      = useState(new Date())
  const [loading,         setLoading]          = useState(true)

  const today = new Date().toISOString().slice(0, 10)

  const loadData = useCallback(async () => {
    try {
      const [brs, bks, bars] = await Promise.all([
        api.get('/branches'),
        api.get(`/bookings?date=${today}`),
        api.get('/barbers/all'),
      ])
      const branchList = Array.isArray(brs) ? brs.filter(b => b.is_active !== false) : []
      const bookings   = Array.isArray(bks) ? bks.filter(b => EDITABLE_STATUSES.has(b.status)) : []
      const barberList = Array.isArray(bars) ? bars : []

      const assignedBookings   = bookings.filter(bk => bk.barber_id)
      const unassignedBookings = bookings.filter(bk => !bk.barber_id)

      const bkByBarber = {}
      for (const bk of assignedBookings) {
        if (!bkByBarber[bk.barber_id]) bkByBarber[bk.barber_id] = []
        bkByBarber[bk.barber_id].push(bk)
      }

      const enriched = barberList.map(b => ({
        ...b,
        status: b.status || 'available',
        queue:  (bkByBarber[b.id] || []).sort((a, z) => new Date(a.scheduled_at) - new Date(z.scheduled_at)),
      }))

      const unassignedMap = {}
      for (const bk of unassignedBookings) {
        if (!unassignedMap[bk.branch_id]) unassignedMap[bk.branch_id] = []
        unassignedMap[bk.branch_id].push(bk)
      }

      setBranches(branchList)
      setBarberQueues(enriched)
      setUnassignedByBranch(unassignedMap)
      setLastRefresh(new Date())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [today])

  useEffect(() => {
    loadData()
    const id = setInterval(loadData, 10000)
    return () => clearInterval(id)
  }, [loadData])

  async function handleConfirmCancel(bookingId, reason) {
    try { await api.patch(`/bookings/${bookingId}/cancel`, { reason }) } catch (err) { alert(err.message) }
    setCancelModal(null)
    loadData()
  }

  async function handleUnassign(booking) {
    try { await api.patch(`/bookings/${booking.id}/unassign`, {}) } catch (err) { alert(err.message || 'Failed to unassign') }
    loadData()
  }

  async function handleConfirmForceStart(booking) {
    try { await api.patch(`/bookings/${booking.id}/start`, {}) } catch (err) { alert(err.message) }
    setForceStartModal(null)
    loadData()
  }

  async function handleBarberAction(barber, action) {
    try {
      if (action === 'clock-in') {
        await api.post('/attendance/clock-in', { barber_id: barber.id, branch_id: barber.branch_id, force: true })
      } else if (action === 'clock-out') {
        if (barber.status === 'busy') {
          if (!window.confirm('Barber is currently in service. Clocking out will force complete the service. Continue?')) return
        }
        try {
          await api.post('/attendance/clock-out', { barber_id: barber.id })
        } catch (e) {
          // No open attendance record — force status directly
          await api.patch(`/barbers/${barber.id}/status`, { status: 'clocked_out' })
        }
      } else if (action === 'break') {
        await api.post('/barber-breaks', { barber_id: barber.id, duration_minutes: 30, note: 'Admin Force Break' })
      } else if (action === 'end-break') {
        // Need to find the active break ID
        const breaks = await api.get(`/barber-breaks?barber_id=${barber.id}&active=true`)
        const active = Array.isArray(breaks) ? breaks[0] : null
        if (active) {
          await api.patch(`/barber-breaks/${active.id}/end`)
        } else {
          // Fallback: just set status back to available if no break record found
          await api.patch(`/barbers/${barber.id}/status`, { status: 'available' })
        }
      }
      loadData()
    } catch (err) { alert(err.message || 'Action failed') }
  }

  const totalInService = barberQueues.filter(b => b.status === 'busy').length
  const totalWaiting   = barberQueues.reduce((a, b) => a + (b.queue || []).filter(q => q.status === 'confirmed').length, 0)
  const totalAlerts    = barberQueues.reduce((a, b) => a + (b.queue || []).filter(q => q.client_not_arrived).length, 0)
  const refreshStr     = lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const displayBranches  = branchFilter === 'all' ? branches : branches.filter(b => String(b.id) === branchFilter)
  const cancelBarberName = cancelModal
    ? barberQueues.find(b => (b.queue || []).some(q => q.id === cancelModal.booking.id))?.name || ''
    : ''
  const fsBarberName = forceStartModal
    ? barberQueues.find(b => (b.queue || []).some(q => q.id === forceStartModal.booking.id))?.name || ''
    : ''

  if (loading) return <div style={{ padding: 40, color: T.muted }}>Loading live queue…</div>

  return (
    <div style={{ padding: '28px 32px' }}>
      <style>{`
        @keyframes scaleIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes pulse   { 0%{box-shadow:0 0 0 0 rgba(22,163,74,0.5)} 70%{box-shadow:0 0 0 6px rgba(22,163,74,0)} 100%{box-shadow:0 0 0 0 rgba(22,163,74,0)} }
      `}</style>

      {cancelModal && (
        <CancelModal booking={cancelModal.booking} barberName={cancelBarberName}
          onConfirm={handleConfirmCancel} onClose={() => setCancelModal(null)} />
      )}
      {forceStartModal && (
        <ForceStartModal booking={forceStartModal.booking} barberName={fsBarberName}
          onConfirm={handleConfirmForceStart} onClose={() => setForceStartModal(null)} />
      )}
      {editModal && (
        <EditBookingModal
          booking={editModal.booking}
          allBarbers={barberQueues}
          onSave={loadData}
          onClose={() => setEditModal(null)}
        />
      )}
      {groupModal && (
        <GroupModal
          anchor={groupModal.booking}
          allBarberQueues={barberQueues}
          onConfirm={loadData}
          onClose={() => setGroupModal(null)}
        />
      )}
      {reopenModal && (
        <ReopenModal
          booking={reopenModal.booking}
          onConfirm={loadData}
          onClose={() => setReopenModal(null)}
        />
      )}
      {showPaxModal && (
        <LogPaxOutModal branches={branches} onLog={e => setPaxOutEvents(p => [e, ...p])} onClose={() => setShowPaxModal(false)} />
      )}
      {showNewBooking && (
        <NewBookingModal
          branches={branches}
          allBarbers={barberQueues}
          defaultBranchId={branchFilter !== 'all' ? branchFilter : (branches[0]?.id || '')}
          onSave={loadData}
          onClose={() => setShowNewBooking(false)}
        />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Live Queue Management</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>LIVE</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Admin queue control — all branches · Updated {refreshStr}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowNewBooking(true)}
            style={{ padding: '9px 16px', borderRadius: 8, background: '#16A34A', color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            + New Booking
          </button>
          <button onClick={() => setShowPaxModal(true)}
            style={{ padding: '9px 16px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            + Log Pax Out
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20, maxWidth: 560 }}>
        {[
          { label: 'In Service',    value: totalInService,      color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
          { label: 'Waiting',       value: totalWaiting,        color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
          { label: 'Alerts',        value: totalAlerts,         color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
          { label: 'Pax Out Today', value: paxOutEvents.length, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ].map(k => (
          <div key={k.label} style={{ padding: '12px 16px', borderRadius: 10, background: k.bg, border: `1px solid ${k.border}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: k.color, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 28, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Branch filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setBranchFilter('all')}
          style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${branchFilter === 'all' ? T.topBg : T.border}`, background: branchFilter === 'all' ? T.topBg : 'transparent', color: branchFilter === 'all' ? T.white : T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.12s' }}>
          All Branches
        </button>
        {branches.map(b => (
          <button key={b.id} onClick={() => setBranchFilter(String(b.id))}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${branchFilter === String(b.id) ? T.topBg : T.border}`, background: branchFilter === String(b.id) ? T.topBg : 'transparent', color: branchFilter === String(b.id) ? T.white : T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.12s' }}>
            {b.city || b.name}
          </button>
        ))}
      </div>

      {/* Alert banner */}
      {totalAlerts > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 20 }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{totalAlerts} booking{totalAlerts > 1 ? 's' : ''} flagged — client not arrived.</span>
            <span style={{ fontSize: 12, color: '#A16207', marginLeft: 6 }}>Review the amber rows below and take action (No-show or Cancel).</span>
          </div>
        </div>
      )}

      {/* Branch queue sections */}
      {displayBranches.map(branch => {
        const branchBarbers = barberQueues.filter(b => b.branch_id === branch.id)
        return (
          <BranchSection key={branch.id} branch={branch} barbers={branchBarbers}
            unassigned={unassignedByBranch[branch.id] || []}
            allBarbers={barberQueues}
            onCancel={bk => setCancelModal({ booking: bk })}
            onStart={bk => setForceStartModal({ booking: bk })}
            onEdit={bk => setEditModal({ booking: bk })}
            onGroup={bk => setGroupModal({ booking: bk })}
            onReopen={bk => setReopenModal({ booking: bk })}
            onUnassign={handleUnassign}
            onBarberAction={handleBarberAction}
          />
        )
      })}

      {/* Pax Out panel */}
      <div className="admin-card" style={{ overflow: 'hidden', marginTop: 8 }}>
        <button onClick={() => setShowPaxPanel(p => !p)}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div>
            <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: T.text }}>Pax Out Today</span>
            <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, color: '#DC2626', marginLeft: 12 }}>{paxOutEvents.length}</span>
            <span style={{ fontSize: 12, color: T.muted, marginLeft: 6 }}>walk-aways logged</span>
          </div>
          <span style={{ fontSize: 12, color: T.muted }}>{showPaxPanel ? '▲ Collapse' : '▼ Expand'}</span>
        </button>
        {showPaxPanel && (
          <div style={{ borderTop: `1px solid ${T.border}`, padding: '12px 18px', maxHeight: 300, overflowY: 'auto' }}>
            {paxOutEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: T.muted, fontSize: 13 }}>No pax outs logged today.</div>
            )}
            {paxOutEvents.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, background: T.bg, marginBottom: 5 }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 700, color: T.muted, width: 40, flexShrink: 0 }}>{e.time}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text2, width: 72, flexShrink: 0 }}>{e.branch}</span>
                <span style={{ fontSize: 12, color: T.text, flex: 1 }}>{e.reason}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: T.topBg, color: '#F5E200', flexShrink: 0 }}>{e.source}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
