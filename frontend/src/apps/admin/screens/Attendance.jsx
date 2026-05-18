import { useEffect, useState, useCallback } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const CAL_DAY_HDRS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const STATUS_CFG = {
  P:  { label: 'Present',         bg: '#F0FDF4', color: '#15803D', dot: '#16A34A' },
  L:  { label: 'Late',            bg: '#FFFBEB', color: '#92400E', dot: '#D97706' },
  OE: { label: 'Off (Excused)',   bg: '#EFF6FF', color: '#1D4ED8', dot: '#2563EB' },
  OI: { label: 'Off (No Excuse)', bg: '#FEF2F2', color: '#991B1B', dot: '#DC2626' },
  OS: { label: 'Off (Doctor)',    bg: '#F3E8FF', color: '#6B21A8', dot: '#9333EA' },
  DO: { label: 'Day Off',         bg: 'transparent', color: T.muted, dot: T.border },
}

// ── Time helpers ──────────────────────────────────────────────────────────────

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false,
  }) : '—'

const computeLateMin = (timeStr, shiftStart = '10:00', grace = 5) => {
  const [ih, im] = timeStr.split(':').map(Number)
  const [sh, sm] = shiftStart.split(':').map(Number)
  return Math.max(0, (ih * 60 + im) - (sh * 60 + sm) - grace)
}

// ── OffTypeRadioGroup ─────────────────────────────────────────────────────────

function OffTypeRadioGroup({ value, onChange }) {
  const TYPE_OPTIONS = [
    { key: 'OE', label: 'Excused Off',         desc: 'Approved absence — counts toward weekly quota'  },
    { key: 'OI', label: 'Inexcused Off',        desc: 'No prior approval — flat deduction applies'    },
    { key: 'OS', label: 'Off with Doctor Note', desc: 'Medical — no deduction'                       },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {TYPE_OPTIONS.map(opt => (
        <label key={opt.key} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 12px', borderRadius: 8,
          border: `1.5px solid ${value === opt.key ? T.topBg : T.border}`,
          background: value === opt.key ? T.surface : 'transparent',
          cursor: 'pointer', transition: 'all 0.15s',
        }}>
          <input type="radio" name="offType" value={opt.key} checked={value === opt.key}
            onChange={() => onChange(opt.key)} style={{ marginTop: 2, accentColor: T.topBg }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{opt.desc}</div>
          </div>
        </label>
      ))}
    </div>
  )
}

// ── ModalOverlay ──────────────────────────────────────────────────────────────

function ModalOverlay({ onClose, children, width = 440 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-card" style={{ width, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        {children}
      </div>
    </div>
  )
}

// ── ModalHeader ───────────────────────────────────────────────────────────────

function ModalHeader({ barberName, dayLabel, badge, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 17, color: T.text }}>{barberName}</span>
        {dayLabel && <span style={{ fontSize: 13, fontWeight: 600, color: T.text2 }}>{dayLabel}</span>}
        {badge}
      </div>
      <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
    </div>
  )
}

// ── CalendarCell ──────────────────────────────────────────────────────────────

function CalendarCell({ day, record, isWeekend, isPast, onClick }) {
  const [hovered, setHovered] = useState(false)
  if (!day) return <div style={{ minHeight: 78 }} />
  if (record?.s === 'DO') {
    return (
      <div style={{ minHeight: 78, borderRadius: 10, background: T.surface, padding: '7px 9px',
                    cursor: isPast ? 'pointer' : 'default',
                    boxShadow: hovered && isPast ? 'inset 0 0 0 9999px rgba(0,0,0,0.04)' : 'none' }}
        onClick={isPast ? onClick : undefined}
        onMouseEnter={() => { if (isPast) setHovered(true) }}
        onMouseLeave={() => setHovered(false)}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.border }}>{day}</span>
      </div>
    )
  }
  if (!record) {
    return (
      <div style={{ minHeight: 78, borderRadius: 10, background: T.surface, padding: '7px 9px',
                    border: `1px dashed ${T.border}`,
                    cursor: isPast ? 'pointer' : 'default',
                    boxShadow: hovered && isPast ? 'inset 0 0 0 9999px rgba(0,0,0,0.04)' : 'none' }}
        onClick={isPast ? onClick : undefined}
        onMouseEnter={() => { if (isPast) setHovered(true) }}
        onMouseLeave={() => setHovered(false)}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.border }}>{day}</span>
      </div>
    )
  }
  const cfg = STATUS_CFG[record.s] || STATUS_CFG.P
  return (
    <div style={{ minHeight: 78, borderRadius: 10, background: cfg.bg, padding: '7px 9px',
                  border: `1px solid ${cfg.dot}44`,
                  cursor: isPast ? 'pointer' : 'default',
                  boxShadow: hovered && isPast ? 'inset 0 0 0 9999px rgba(0,0,0,0.04)' : 'none' }}
      onClick={isPast ? onClick : undefined}
      onMouseEnter={() => { if (isPast) setHovered(true) }}
      onMouseLeave={() => setHovered(false)}>
      <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{day}</span>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: cfg.color, background: cfg.dot + '28', padding: '2px 6px', borderRadius: 4, alignSelf: 'flex-start' }}>{record.s}</span>
        {record.s === 'L' && record.lateMin > 0 && (
          <span style={{ fontSize: 10, color: cfg.color, fontWeight: 600 }}>{record.lateMin} min</span>
        )}
      </div>
    </div>
  )
}

// ── BarberSummaryCard ─────────────────────────────────────────────────────────

function BarberSummaryCard({ barber, records, weekends, daysInMonth, isSelected, onClick }) {
  const days    = records || {}
  const pCount  = Object.values(days).filter(d => d.s === 'P').length
  const lCount  = Object.values(days).filter(d => d.s === 'L').length
  const lMins   = Object.values(days).filter(d => d.s === 'L').reduce((s, d) => s + (d.lateMin || 0), 0)
  const oeCount = Object.values(days).filter(d => d.s === 'OE').length
  const oiCount = Object.values(days).filter(d => d.s === 'OI').length
  const osCount = Object.values(days).filter(d => d.s === 'OS').length
  const badges  = [
    { val: pCount, color: '#16A34A', label: 'P' },
    lCount  > 0 && { val: lCount,  color: '#D97706', label: `L · ${lMins}min` },
    oeCount > 0 && { val: oeCount, color: '#2563EB', label: 'OE' },
    oiCount > 0 && { val: oiCount, color: '#DC2626', label: 'OI' },
    osCount > 0 && { val: osCount, color: '#9333EA', label: 'OS' },
  ].filter(Boolean)
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div onClick={onClick}
      style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: isSelected ? '#EEF2FF' : 'transparent', borderLeft: isSelected ? `3px solid ${T.topBg}` : '3px solid transparent', transition: 'background 0.12s' }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bg }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 11, color: '#F5E200' }}>
            {barber.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{barber.name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {badges.map((b, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: b.color }}>{b.val}× {b.label}</span>
            ))}
          </div>
        </div>
        {isSelected && <span style={{ fontSize: 12, color: T.topBg }}>▶</span>}
      </div>
      <div style={{ display: 'flex', gap: 2, marginTop: 8, paddingLeft: 41 }}>
        {monthDays.map(d => {
          const rec      = days[d]
          const isWknd   = weekends.includes(d)
          const dotColor = isWknd ? T.border : rec ? (STATUS_CFG[rec.s]?.dot || T.border) : '#E5E5E5'
          return <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        })}
      </div>
    </div>
  )
}

// ── LogOffModal ───────────────────────────────────────────────────────────────

function LogOffModal({ barbers, branchId, onClose, onSaved }) {
  const [barberId, setBarberId] = useState(barbers[0]?.id || '')
  const [date,     setDate]     = useState('')
  const [type,     setType]     = useState('OE')
  const [note,     setNote]     = useState('')
  const [errors,   setErrors]   = useState({})
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    const e = {}
    if (!barberId) e.barber = true
    if (!date)     e.date   = true
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const typeMap = { OE: 'excused', OI: 'inexcused', OS: 'excused' }
      await api.post('/attendance/log-off', {
        barber_id: barberId, branch_id: branchId, date, type: typeMap[type] || 'excused',
        note, has_doctor_note: type === 'OS',
      })
      onSaved()
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-card" style={{ width: 440, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 17, color: T.text }}>Log Off Record</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: errors.barber ? T.danger : T.muted, marginBottom: 5 }}>Barber *</label>
            <select value={barberId} onChange={e => setBarberId(e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${errors.barber ? T.danger : T.border}`, fontSize: 13, color: T.text, background: T.white }}>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: errors.date ? T.danger : T.muted, marginBottom: 5 }}>Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${errors.date ? T.danger : T.border}`, fontSize: 13, color: T.text, background: T.white, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>Off Type *</label>
            <OffTypeRadioGroup value={type} onChange={setType} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Family event, confirmed by manager"
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.white, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: 11, borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Off Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PresentModal (Modal A) ────────────────────────────────────────────────────

function PresentModal({ barberName, dayLabel, record, onClose }) {
  return (
    <ModalOverlay onClose={onClose} width={360}>
      <ModalHeader barberName={barberName} dayLabel={dayLabel} onClose={onClose}
        badge={<span style={{ fontSize: 11, fontWeight: 800, color: '#15803D', background: '#16A34A28', padding: '2px 8px', borderRadius: 5 }}>P</span>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[['CLOCK IN', fmtTime(record._row?.clock_in_at)], ['CLOCK OUT', fmtTime(record._row?.clock_out_at)]].map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text, fontFamily: "'Inter',sans-serif" }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22 }}>
        <button onClick={onClose} style={{ width: '100%', padding: 11, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Close</button>
      </div>
    </ModalOverlay>
  )
}

// ── LateModal (Modal B) ───────────────────────────────────────────────────────

function LateModal({ barberName, dayLabel, record, workDate, onClose, onSaved }) {
  const initTime = fmtTime(record._row?.clock_in_at)
  const [timeInput, setTimeInput] = useState(initTime === '—' ? '' : initTime)
  const [zeroOut,   setZeroOut]   = useState(false)
  const [reason,    setReason]    = useState('')
  const [saving,    setSaving]    = useState(false)

  const lateMin = zeroOut ? 0 : computeLateMin(timeInput || initTime)

  async function handleSave() {
    setSaving(true)
    try {
      if (zeroOut) {
        await api.patch(`/attendance/${record._row.id}`, { late_minutes: 0 })
      } else {
        const newClockIn = `${workDate}T${timeInput}:00+08:00`
        await api.patch(`/attendance/${record._row.id}`, { clock_in_at: newClockIn })
      }
      onSaved()
      onClose()
    } catch (err) { alert(err.message || 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader barberName={barberName} dayLabel={dayLabel} onClose={onClose}
        badge={<span style={{ fontSize: 11, fontWeight: 800, color: '#92400E', background: '#D9770628', padding: '2px 8px', borderRadius: 5 }}>L</span>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Clock In</div>
          <input type="time" value={timeInput} onChange={e => setTimeInput(e.target.value)}
            disabled={zeroOut}
            style={{ padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: zeroOut ? T.surface2 : T.white, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>Clock Out</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text2 }}>{fmtTime(record._row?.clock_out_at)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>Late</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: lateMin > 0 ? '#D97706' : '#15803D' }}>
            {zeroOut ? '0 min (zeroed out)' : `${lateMin} min late`}
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Reason for correction (optional)</div>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. WiFi down, system issue"
            style={{ padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.white, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: T.surface, cursor: 'pointer' }}>
          <input type="checkbox" checked={zeroOut} onChange={e => setZeroOut(e.target.checked)} style={{ marginTop: 3, accentColor: T.topBg }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Zero Out Late</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>WiFi issue, system down — sets late to 0 min</div>
          </div>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 11, borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save Correction'}
        </button>
      </div>
    </ModalOverlay>
  )
}

// ── OffRecordModal (Modal C) ──────────────────────────────────────────────────

function OffRecordModal({ barberName, dayLabel, record, onClose, onSaved }) {
  const initType = record._row?.has_doctor_note ? 'OS' : record._row?.type === 'inexcused' ? 'OI' : 'OE'
  const [offType,  setOffType]  = useState(initType)
  const [note,     setNote]     = useState(record._row?.note || '')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const BADGE = {
    OE: { color: '#1D4ED8', bg: '#2563EB28', label: 'OE' },
    OI: { color: '#991B1B', bg: '#DC262628', label: 'OI' },
    OS: { color: '#6B21A8', bg: '#9333EA28', label: 'OS' },
  }
  const badgeKey = initType
  const badge = BADGE[badgeKey] || BADGE.OE

  async function handleSave() {
    setSaving(true)
    try {
      const typeMap = { OE: 'excused', OI: 'inexcused', OS: 'excused' }
      await api.patch(`/attendance/off-records/${record._row.id}`, {
        type: typeMap[offType], has_doctor_note: offType === 'OS', note: note || null,
      })
      onSaved(); onClose()
    } catch (err) { alert(err.message || 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this off record?')) return
    setDeleting(true)
    try {
      await api.delete(`/attendance/off-records/${record._row.id}`)
      onSaved(); onClose()
    } catch (err) { alert(err.message || 'Delete failed') }
    finally { setDeleting(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader barberName={barberName} dayLabel={dayLabel} onClose={onClose}
        badge={<span style={{ fontSize: 11, fontWeight: 800, color: badge.color, background: badge.bg, padding: '2px 8px', borderRadius: 5 }}>{badge.label}</span>} />
      {record._row?.is_auto && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, color: T.muted, background: T.surface2, padding: '2px 8px', borderRadius: 20 }}>Auto-classified</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>Off Type</div>
          <OffTypeRadioGroup value={offType} onChange={setOffType} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Note (optional)</div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Doctor visit, family emergency"
            style={{ padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.white, width: '100%', boxSizing: 'border-box' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: 11, borderRadius: 9, background: 'transparent', color: T.danger, border: `1.5px solid ${T.danger}`, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: deleting ? 0.7 : 1 }}>
          {deleting ? '…' : 'Delete'}
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 11, borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </ModalOverlay>
  )
}

// ── EmptyDayModal (Modal D) ───────────────────────────────────────────────────

function EmptyDayModal({ barberName, dayLabel, workDate, branchId, barberId, onClose, onSaved }) {
  const [mode,     setMode]    = useState('off')
  const [offType,  setOffType] = useState('OE')
  const [note,     setNote]    = useState('')
  const [clockIn,  setClockIn] = useState('')
  const [clockOut, setClockOut]= useState('')
  const [saving,   setSaving]  = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      if (mode === 'off') {
        const typeMap = { OE: 'excused', OI: 'inexcused', OS: 'excused' }
        await api.post('/attendance/log-off', {
          barber_id: barberId, branch_id: branchId, date: workDate,
          type: typeMap[offType], note: note || null, has_doctor_note: offType === 'OS',
        })
      } else {
        if (!clockIn) { alert('Clock-in time is required'); setSaving(false); return }
        await api.post('/attendance/backdate-clock-in', {
          barber_id: barberId, branch_id: branchId,
          clock_in_at: `${workDate}T${clockIn}:00+08:00`,
          clock_out_at: clockOut ? `${workDate}T${clockOut}:00+08:00` : null,
        })
      }
      onSaved(); onClose()
    } catch (err) { alert(err.message || 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader barberName={barberName} dayLabel={`Log Record — ${dayLabel}`} onClose={onClose} />
      {/* Segment toggle */}
      <div style={{ display: 'flex', borderRadius: 8, border: `1.5px solid ${T.border}`, overflow: 'hidden', marginBottom: 16 }}>
        {[['off', 'Log Off'], ['clockin', 'Log Clock-in']].map(([key, label], i) => (
          <button key={key} onClick={() => setMode(key)} style={{
            flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, border: 'none',
            borderRight: i === 0 ? `1px solid ${T.border}` : 'none',
            background: mode === key ? T.topBg : T.white,
            color: mode === key ? T.white : T.text2,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {mode === 'off' ? (
          <>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>Off Type</div>
              <OffTypeRadioGroup value={offType} onChange={setOffType} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Note (optional)</div>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Family event"
                style={{ padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.white, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </>
        ) : (
          <>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Clock In Time *</div>
              <input type="time" value={clockIn} onChange={e => setClockIn(e.target.value)}
                style={{ padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.white, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Clock Out Time (optional)</div>
              <input type="time" value={clockOut} onChange={e => setClockOut(e.target.value)}
                style={{ padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.white, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Note (optional)</div>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Clocked in manually — kiosk was offline"
                style={{ padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.white, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 11, borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </ModalOverlay>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCalendarData(attendanceRows, offRows, barberId, year, month) {
  const records = {}
  const daysInMonth = new Date(year, month, 0).getDate()

  for (const row of attendanceRows) {
    if (row.barber_id !== barberId) continue
    const d = new Date(row.clock_in_at || row.work_date)
    if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue
    const day = d.getDate()
    const lateMin = row.late_minutes || 0
    if (!records[day]) records[day] = { s: lateMin > 0 ? 'L' : 'P', lateMin, _row: row }
  }

  for (const row of offRows) {
    if (row.barber_id !== barberId) continue
    const d = new Date(row.date)
    if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue
    const day = d.getDate()
    const s = row.has_doctor_note ? 'OS' : row.type === 'inexcused' ? 'OI' : 'OE'
    records[day] = { s, _row: row }
  }

  return { records, daysInMonth }
}

function getWeekends(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const weekends = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow === 0 || dow === 6) weekends.push(d)
  }
  return weekends
}

function getCalLeadDays(year, month) {
  const dow = new Date(year, month - 1, 1).getDay()
  return dow === 0 ? 6 : dow - 1
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Attendance({ onPayroll }) {
  const now  = new Date()
  const [year,       setYear]       = useState(now.getFullYear())
  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [branches,   setBranches]   = useState([])
  const [barbers,    setBarbers]    = useState([])
  const [attendance, setAttendance] = useState([])
  const [offRecords, setOffRecords] = useState([])
  const [branchId,   setBranchId]   = useState('')
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [showLogOff,   setShowLogOff]   = useState(false)
  const [activeModal,  setActiveModal]  = useState(null)
  const [loading,    setLoading]    = useState(true)

  const loadBranches = useCallback(async () => {
    const brs = await api.get('/branches')
    const list = Array.isArray(brs) ? brs.filter(b => b.is_active !== false) : []
    setBranches(list)
    if (list.length && !branchId) setBranchId(list[0].id)
    return list
  }, [branchId])

  const loadData = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    try {
      const [bars, att, off] = await Promise.all([
        api.get(`/barbers?branch_id=${branchId}`),
        api.get(`/attendance?branch_id=${branchId}&month=${month}&year=${year}`),
        api.get(`/attendance/off-records?branch_id=${branchId}&month=${month}&year=${year}`),
      ])
      setBarbers(Array.isArray(bars) ? bars : [])
      setAttendance(Array.isArray(att) ? att : [])
      setOffRecords(Array.isArray(off) ? off : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [branchId, month, year])

  useEffect(() => { loadBranches() }, [loadBranches])
  useEffect(() => { if (branchId) loadData() }, [branchId, month, year, loadData])

  const weekends    = getWeekends(year, month)
  const calLead     = getCalLeadDays(year, month)
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthDays   = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthLabel  = new Date(year, month - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  // Past day detection (WITA = Asia/Makassar = UTC+8)
  const todayLocal = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Makassar' })
  const todayDay   = parseInt(todayLocal.slice(8, 10))
  const todayMonth = parseInt(todayLocal.slice(5, 7))
  const todayYear  = parseInt(todayLocal.slice(0, 4))
  const isPast = (d) => {
    if (year < todayYear) return true
    if (year > todayYear) return false
    if (month < todayMonth) return true
    if (month > todayMonth) return false
    return d < todayDay
  }

  function handleCellClick(day, record) {
    if (!isPast(day)) return
    if (!record || !record._row) {
      setActiveModal({ type: 'EMPTY', day })
    } else if (record.s === 'P') {
      setActiveModal({ type: 'P', day, record })
    } else if (record.s === 'L') {
      setActiveModal({ type: 'L', day, record })
    } else if (['OE', 'OI', 'OS'].includes(record.s)) {
      setActiveModal({ type: 'OFF', day, record })
    } else {
      setActiveModal({ type: 'EMPTY', day })
    }
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
    setSelectedBarber(null)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
    setSelectedBarber(null)
  }

  const selectedCalData = selectedBarber
    ? buildCalendarData(attendance, offRecords, selectedBarber.id, year, month)
    : null

  return (
    <div style={{ padding: '28px 32px' }}>
      <style>{`@keyframes scaleIn { from { transform: scale(0.96); opacity:0; } to { transform: scale(1); opacity:1; } }`}</style>

      {showLogOff && (
        <LogOffModal barbers={barbers} branchId={branchId}
          onClose={() => setShowLogOff(false)}
          onSaved={loadData} />
      )}

      {activeModal?.type === 'P' && (
        <PresentModal
          barberName={selectedBarber?.name}
          dayLabel={`${CAL_DAY_HDRS[(new Date(year, month - 1, activeModal.day).getDay() + 6) % 7]} ${activeModal.day}`}
          record={activeModal.record}
          onClose={() => setActiveModal(null)} />
      )}
      {activeModal?.type === 'L' && (
        <LateModal
          barberName={selectedBarber?.name}
          dayLabel={`${CAL_DAY_HDRS[(new Date(year, month - 1, activeModal.day).getDay() + 6) % 7]} ${activeModal.day}`}
          record={activeModal.record}
          workDate={`${year}-${String(month).padStart(2, '0')}-${String(activeModal.day).padStart(2, '0')}`}
          onClose={() => setActiveModal(null)}
          onSaved={loadData} />
      )}
      {activeModal?.type === 'OFF' && (
        <OffRecordModal
          barberName={selectedBarber?.name}
          dayLabel={`${CAL_DAY_HDRS[(new Date(year, month - 1, activeModal.day).getDay() + 6) % 7]} ${activeModal.day}`}
          record={activeModal.record}
          onClose={() => setActiveModal(null)}
          onSaved={loadData} />
      )}
      {activeModal?.type === 'EMPTY' && (
        <EmptyDayModal
          barberName={selectedBarber?.name}
          dayLabel={`${CAL_DAY_HDRS[(new Date(year, month - 1, activeModal.day).getDay() + 6) % 7]} ${activeModal.day}`}
          workDate={`${year}-${String(month).padStart(2, '0')}-${String(activeModal.day).padStart(2, '0')}`}
          branchId={branchId}
          barberId={selectedBarber?.id}
          onClose={() => setActiveModal(null)}
          onSaved={loadData} />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Attendance</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{monthLabel} · Monthly attendance record</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onPayroll && (
            <button onClick={onPayroll}
              style={{ padding: '9px 16px', borderRadius: 8, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
              → Payroll
            </button>
          )}
          <button onClick={() => setShowLogOff(true)}
            style={{ padding: '9px 16px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            + Log Off
          </button>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text2 }}>‹</button>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: T.text, minWidth: 120, textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={nextMonth} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text2 }}>›</button>
        </div>
        <select value={branchId} onChange={e => { setBranchId(e.target.value); setSelectedBarber(null) }}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.white, fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CFG).filter(([k]) => k !== 'DO').map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot }} />
            <span style={{ fontSize: 10, color: T.muted }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, color: T.muted }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', height: 'calc(100vh - 270px)', minHeight: 520 }}>
          {/* Left panel — barber list */}
          <div style={{ width: 290, flexShrink: 0, borderRight: `1px solid ${T.border}`, overflowY: 'auto', background: T.white, borderRadius: '12px 0 0 12px', border: `1px solid ${T.border}` }}>
            {barbers.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>No barbers for this branch.</div>
            )}
            {barbers.map(b => {
              const { records } = buildCalendarData(attendance, offRecords, b.id, year, month)
              return (
                <BarberSummaryCard key={b.id} barber={b} records={records} weekends={weekends} daysInMonth={daysInMonth}
                  isSelected={selectedBarber?.id === b.id}
                  onClick={() => setSelectedBarber(selectedBarber?.id === b.id ? null : b)} />
              )
            })}
          </div>

          {/* Right panel — calendar */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: T.bg, borderRadius: '0 12px 12px 0', border: `1px solid ${T.border}`, borderLeft: 'none' }}>
            {!selectedBarber ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ fontSize: 32, opacity: 0.2 }}>📅</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.muted }}>Select a barber to view their {monthLabel} attendance</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>{selectedBarber.name}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{monthLabel}</div>
                  </div>
                  <button onClick={() => setSelectedBarber(null)} style={{ fontSize: 12, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>✕ Close</button>
                </div>

                {/* Calendar grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                  {CAL_DAY_HDRS.map(h => (
                    <div key={h} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: h === 'Sat' || h === 'Sun' ? T.border : T.muted, paddingBottom: 4 }}>{h}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {Array.from({ length: calLead }).map((_, i) => <div key={'lead-' + i} style={{ minHeight: 78 }} />)}
                  {monthDays.map(d => (
                    <CalendarCell
                      key={d}
                      day={d}
                      record={selectedCalData?.records[d]}
                      isWeekend={weekends.includes(d)}
                      isPast={isPast(d)}
                      onClick={() => handleCellClick(d, selectedCalData?.records[d])}
                    />
                  ))}
                </div>

                {/* Incidents */}
                {(() => {
                  const incidents = Object.entries(selectedCalData?.records || {})
                    .filter(([, d]) => ['L', 'OE', 'OI', 'OS'].includes(d.s))
                    .sort(([a], [b]) => Number(a) - Number(b))
                  if (!incidents.length) return null
                  return (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, marginBottom: 8 }}>Incidents this month</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {incidents.map(([day, d]) => {
                          const cfg = STATUS_CFG[d.s]
                          return (
                            <div key={day}
                              onClick={() => handleCellClick(Number(day), d)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.dot}33`, cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background = cfg.bg + 'cc'}
                              onMouseLeave={e => e.currentTarget.style.background = cfg.bg}>
                              <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 12, color: cfg.color, width: 52 }}>{monthLabel.slice(0, 3)} {day}</span>
                              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: cfg.dot + '28', color: cfg.color }}>{cfg.label}</span>
                              {d.s === 'L' && <span style={{ fontSize: 12, color: cfg.color }}>{d.lateMin} minutes late</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
