import { useEffect, useState, useCallback } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const PAY_TYPE_META = {
  salary_plus_commission: { label: 'Salary + Comm', color: '#2563EB', bg: '#EFF6FF' },
  commission_only:        { label: 'Commission',    color: '#7C3AED', bg: '#EDE9FE' },
  daily_rate:             { label: 'Freelance',     color: '#D97706', bg: '#FFFBEB' },
}

const DEFAULT_COMM_RATE = 35

const SVC_CAT_META = {
  haircut:    { label: 'Haircut',     color: '#1D4ED8', bg: '#DBEAFE' },
  beard:      { label: 'Beard',       color: '#065F46', bg: '#D1FAE5' },
  treatment:  { label: 'Treatment',   color: '#6D28D9', bg: '#EDE9FE' },
  hair_color: { label: 'Hair Color',  color: '#B45309', bg: '#FEF3C7' },
  package:    { label: 'Package',     color: '#1E40AF', bg: '#DBEAFE' },
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36, inactive }) {
  const initials = name?.slice(0, 2).toUpperCase() || '??'
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: inactive ? T.surface2 : T.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: size * 0.36, color: inactive ? T.muted : T.white, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

// ── BarberModal ───────────────────────────────────────────────────────────────

function BarberModal({ barber, branches, onClose, onSaved }) {
  const isNew = !barber
  const [form, setForm] = useState(barber ? {
    name: barber.name || '', specialty: barber.specialty || '', phone: barber.phone || '',
    branch_id: barber.branch_id || '', base_salary: barber.base_salary || 0,
    daily_rate: barber.daily_rate || 350000, pay_type: barber.pay_type || 'salary_plus_commission',
    is_active: barber.is_active !== false, pin: '',
  } : {
    name: '', specialty: '', phone: '', branch_id: branches[0]?.id || '',
    base_salary: 2500000, daily_rate: 350000, pay_type: 'salary_plus_commission', is_active: true, pin: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isFreelance = form.pay_type === 'daily_rate'

  const fldStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, boxSizing: 'border-box', background: T.white }
  const lblStyle = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: 5 }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    try {
      const payload = {
        name: form.name, specialty: form.specialty, phone: form.phone,
        branch_id: isFreelance ? null : form.branch_id,
        base_salary: form.pay_type === 'salary_plus_commission' ? form.base_salary : 0,
        daily_rate: form.daily_rate, pay_type: form.pay_type, is_active: form.is_active,
      }
      if (form.pin) payload.pin = form.pin
      if (isNew) await api.post('/barbers', payload)
      else await api.patch(`/barbers/${barber.id}`, payload)
      onSaved()
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 520, padding: '24px 28px', animation: 'scaleIn 0.2s ease both', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 18, color: T.text }}>{isNew ? 'Add Barber' : 'Edit Barber'}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
          {[
            { label: 'Full Name',       key: 'name',      full: true  },
            { label: 'Specialty',       key: 'specialty', full: false },
            { label: 'WhatsApp Number', key: 'phone',     full: false },
            { label: 'PIN (4 digits)', key: 'pin',      full: false, type: 'password', placeholder: isNew ? 'Set PIN' : 'Leave blank to keep' },
          ].map(({ label, key, full, type, placeholder }) => (
            <div key={key} style={{ gridColumn: full ? '1 / -1' : undefined }}>
              <label style={lblStyle}>{label}</label>
              <input type={type || 'text'} value={form[key] || ''} onChange={e => set(key, e.target.value)}
                placeholder={placeholder} style={fldStyle} />
            </div>
          ))}

          {/* Pay Type */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lblStyle}>Pay Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'salary_plus_commission', label: 'Salary + Commission' },
                { key: 'commission_only',         label: 'Commission Only'     },
                { key: 'daily_rate',              label: 'Freelance (Daily)'   },
              ].map(opt => (
                <button key={opt.key} onClick={() => set('pay_type', opt.key)}
                  style={{ flex: 1, padding: '9px 8px', borderRadius: 8, border: `1.5px solid ${form.pay_type === opt.key ? T.topBg : T.border}`, background: form.pay_type === opt.key ? T.topBg : 'transparent', color: form.pay_type === opt.key ? T.white : T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {isFreelance && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
                Freelance barbers have no home branch and earn no commission. They are paid a fixed daily rate for each day they work.
              </div>
            )}
          </div>

          {/* Branch */}
          {!isFreelance ? (
            <div>
              <label style={lblStyle}>Home Branch</label>
              <select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}
                style={{ ...fldStyle, padding: '9px 11px' }}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Chair assignment is managed in Branches.</div>
            </div>
          ) : (
            <div>
              <label style={lblStyle}>Home Branch</label>
              <div style={{ padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.surface2}`, background: T.surface, fontSize: 13, color: T.muted, fontStyle: 'italic' }}>None — Freelance</div>
            </div>
          )}

          {form.pay_type === 'salary_plus_commission' && (
            <div>
              <label style={lblStyle}>Base Salary (IDR/mo)</label>
              <input type="number" value={form.base_salary} onChange={e => set('base_salary', parseInt(e.target.value) || 0)} style={fldStyle} />
            </div>
          )}
          {form.pay_type === 'commission_only' && (
            <div>
              <label style={lblStyle}>Base Salary</label>
              <div style={{ padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.surface2}`, background: T.surface, fontSize: 13, color: T.muted, fontStyle: 'italic' }}>None — Commission only</div>
            </div>
          )}
          {isFreelance && (
            <div>
              <label style={lblStyle}>Daily Rate (IDR/day)</label>
              <input type="number" value={form.daily_rate} onChange={e => set('daily_rate', parseInt(e.target.value) || 0)} style={fldStyle} />
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Paid per day present. No deductions.</div>
            </div>
          )}
        </div>

        {!isNew && (
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: form.is_active ? T.bg : '#FEF2F2', borderRadius: 8, border: `1px solid ${form.is_active ? T.border : '#FECACA'}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: form.is_active ? T.text : '#DC2626' }}>{form.is_active ? 'Active' : 'Deactivated'}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>Deactivated barbers are hidden from the kiosk but history is preserved.</div>
            </div>
            <button onClick={() => set('is_active', !form.is_active)}
              style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${form.is_active ? T.danger : '#16A34A'}`, background: 'transparent', color: form.is_active ? T.danger : '#16A34A', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {form.is_active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name}
            style={{ flex: 2, padding: 11, borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : isNew ? 'Add Barber' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ServicePanel ──────────────────────────────────────────────────────────────

function ServicePanel({ barber, services, barberSvcs, onToggle, barberSvcRates, onRateChange }) {
  const [editingRate, setEditingRate] = useState(null)
  const categories = ['haircut', 'beard', 'treatment', 'hair_color', 'package']

  function startEditRate(e, serviceId, currentRate) {
    e.stopPropagation()
    setEditingRate({ serviceId, draft: String(currentRate ?? DEFAULT_COMM_RATE) })
  }

  function commitRate(serviceId) {
    if (!editingRate) return
    const val = parseInt(editingRate.draft, 10)
    if (!isNaN(val) && val >= 0 && val <= 100) {
      onRateChange(barber.id, serviceId, val === DEFAULT_COMM_RATE ? null : val)
    }
    setEditingRate(null)
  }

  return (
    <div style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: '14px 20px 16px 72px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 12 }}>
        Service Capability — <span style={{ color: T.text }}>{barber.name}</span>
        <span style={{ fontWeight: 400, marginLeft: 8, color: T.muted }}>Toggle capability · click % to set commission rate per service.</span>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ padding: '1px 5px', borderRadius: 3, background: T.surface2, color: T.muted, fontWeight: 700, fontSize: 9 }}>{DEFAULT_COMM_RATE}%</span>
          Default rate
        </span>
        <span style={{ fontSize: 10, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ padding: '1px 5px', borderRadius: 3, background: '#FEF9C3', color: '#854D0E', fontWeight: 700, fontSize: 9 }}>40%</span>
          Custom rate — click % badge to edit
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map(cat => {
          const meta     = SVC_CAT_META[cat] || { label: cat, color: T.text, bg: T.surface }
          const catSvcs  = services.filter(s => s.category === cat && s.is_active !== false)
          if (!catSvcs.length) return null
          return (
            <div key={cat}>
              <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: meta.bg, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'inline-block', marginBottom: 6 }}>{meta.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {catSvcs.map(s => {
                  const enabled       = barberSvcs[barber.id]?.[s.id] !== false
                  const rateOverride  = barberSvcRates[barber.id]?.[s.id] ?? null
                  const displayRate   = rateOverride ?? DEFAULT_COMM_RATE
                  const isCustomRate  = rateOverride !== null
                  const isEditingThis = editingRate?.serviceId === s.id

                  const pillBorder   = `1.5px solid ${enabled ? T.topBg : T.border}`
                  const pillBg       = enabled ? T.topBg : T.white
                  const pillColor    = enabled ? T.white : T.muted
                  const dividerColor = enabled ? 'rgba(255,255,255,0.2)' : T.border

                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'stretch', borderRadius: 6, border: pillBorder, overflow: 'hidden', transition: 'all 0.15s' }}>
                      <button onClick={() => onToggle(barber.id, s.id)}
                        title={enabled ? 'Click to disable' : 'Click to enable'}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', background: pillBg, color: pillColor, border: 'none', borderRight: `1px solid ${dividerColor}`, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {enabled ? <span style={{ fontSize: 9 }}>✓</span> : <span style={{ fontSize: 9, opacity: 0.4 }}>✕</span>}
                        {s.name}
                      </button>

                      {isEditingThis ? (
                        <div style={{ display: 'flex', alignItems: 'center', background: T.white, padding: '0 6px', gap: 1 }}>
                          <input autoFocus type="number" min="0" max="100"
                            value={editingRate.draft}
                            onChange={e => setEditingRate(r => ({ ...r, draft: e.target.value }))}
                            onBlur={() => commitRate(s.id)}
                            onKeyDown={e => { if (e.key === 'Enter') commitRate(s.id); if (e.key === 'Escape') setEditingRate(null) }}
                            style={{ width: 36, padding: '2px 4px', border: `1px solid ${T.topBg}`, borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: "'Inter',sans-serif", color: T.text, textAlign: 'center', background: T.white }} />
                          <span style={{ fontSize: 10, color: T.muted }}>%</span>
                        </div>
                      ) : (
                        <button onClick={e => startEditRate(e, s.id, rateOverride)}
                          title="Click to set commission rate"
                          style={{ display: 'flex', alignItems: 'center', padding: '5px 7px', background: isCustomRate ? '#FEF9C3' : enabled ? T.white : T.surface, color: isCustomRate ? '#854D0E' : enabled ? T.text : T.muted, border: 'none', fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 10, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                          {displayRate}%
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Barbers() {
  const [activeTab,      setActiveTab]      = useState('barbers')
  const [branches,       setBranches]       = useState([])
  const [barbers,        setBarbers]        = useState([])
  const [services,       setServices]       = useState([])
  const [attendance,     setAttendance]     = useState([])
  const [branchFilter,   setBranchFilter]   = useState('all')
  const [showInactive,   setShowInactive]   = useState(false)
  const [showModal,      setShowModal]      = useState(false)
  const [editBarber,     setEditBarber]     = useState(null)
  const [expandedBarber, setExpandedBarber] = useState(null)
  const [flagged,        setFlagged]        = useState(new Set())
  const [loading,        setLoading]        = useState(true)

  // Per-barber per-service enabled state (loaded from API per barber on expand)
  const [barberSvcs,     setBarberSvcs]     = useState({})
  // Per-barber per-service commission rate overrides
  const [barberSvcRates, setBarberSvcRates] = useState({})

  const loadData = useCallback(async () => {
    try {
      const [brs, bars, svcs] = await Promise.all([
        api.get('/branches'),
        api.get('/barbers/all'),
        api.get('/services'),
      ])
      setBranches(Array.isArray(brs) ? brs : [])
      setBarbers(Array.isArray(bars) ? bars : [])
      setServices(Array.isArray(svcs) ? svcs : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function loadBarberServices(barberId) {
    if (barberSvcs[barberId]) return
    try {
      const rows = await api.get(`/barbers/${barberId}/services`)
      const svcMap = {}
      const rateMap = {}
      for (const r of rows) {
        svcMap[r.id] = r.is_enabled !== false
        rateMap[r.id] = r.commission_rate
      }
      setBarberSvcs(prev => ({ ...prev, [barberId]: svcMap }))
      setBarberSvcRates(prev => ({ ...prev, [barberId]: rateMap }))
    } catch (_) {}
  }

  async function loadAttendanceLogs() {
    if (attendance.length) return
    try {
      const rows = await api.get('/attendance?limit=200')
      setAttendance(Array.isArray(rows) ? rows : [])
    } catch (_) {}
  }

  async function toggleService(barberId, serviceId) {
    const current = barberSvcs[barberId]?.[serviceId] !== false
    const rate = barberSvcRates[barberId]?.[serviceId]
    setBarberSvcs(prev => ({ ...prev, [barberId]: { ...prev[barberId], [serviceId]: !current } }))
    try {
      await api.put(`/barbers/${barberId}/services/${serviceId}`, { is_enabled: !current, commission_rate: rate })
    } catch (_) {
      setBarberSvcs(prev => ({ ...prev, [barberId]: { ...prev[barberId], [serviceId]: current } }))
    }
  }

  async function setServiceRate(barberId, serviceId, rate) {
    const enabled = barberSvcs[barberId]?.[serviceId] !== false
    setBarberSvcRates(prev => ({ ...prev, [barberId]: { ...(prev[barberId] || {}), [serviceId]: rate } }))
    try {
      await api.put(`/barbers/${barberId}/services/${serviceId}`, { is_enabled: enabled, commission_rate: rate })
    } catch (_) {}
  }

  function handleExpandBarber(barberId) {
    if (expandedBarber === barberId) { setExpandedBarber(null); return }
    setExpandedBarber(barberId)
    loadBarberServices(barberId)
  }

  const filtered = barbers
    .filter(b => {
      if (branchFilter === 'all') return true
      if (branchFilter === 'freelance') return b.pay_type === 'daily_rate'
      return b.branch_id && branches.find(br => br.id === b.branch_id && br.name === branchFilter)
    })
    .filter(b => showInactive ? true : b.is_active !== false)

  const totalBarbers   = barbers.filter(b => b.is_active !== false && b.pay_type !== 'daily_rate').length
  const totalFreelance = barbers.filter(b => b.is_active !== false && b.pay_type === 'daily_rate').length

  function toggleFlag(i) {
    setFlagged(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  if (loading) return <div style={{ padding: 40, color: T.muted }}>Loading…</div>

  return (
    <div style={{ padding: '28px 32px' }}>
      <style>{`@keyframes scaleIn { from { transform: scale(0.96); opacity:0; } to { transform: scale(1); opacity:1; } }`}</style>

      {showModal && (
        <BarberModal barber={editBarber} branches={branches}
          onClose={() => { setShowModal(false); setEditBarber(null) }}
          onSaved={loadData} />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Barbers</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Manage barber profiles and service capability</div>
        </div>
        <button onClick={() => { setEditBarber(null); setShowModal(true) }}
          style={{ padding: '9px 16px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          + Add Barber
        </button>
      </div>

      {/* Stat card */}
      <div style={{ marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: '16px 24px', display: 'inline-flex', gap: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted }}>Active Barbers</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 28, color: T.text, marginTop: 4 }}>{totalBarbers}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Across all branches</div>
          </div>
          <div style={{ borderLeft: `1px solid ${T.border}`, paddingLeft: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted }}>Freelancers</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 28, color: '#D97706', marginTop: 4 }}>{totalFreelance}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Daily rate</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
        {[{ key: 'barbers', label: 'Barbers' }, { key: 'attendance', label: 'Attendance Log' }].map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); if (t.key === 'attendance') loadAttendanceLogs() }}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === t.key ? `2px solid ${T.topBg}` : '2px solid transparent', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, color: activeTab === t.key ? T.text : T.muted, cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Barbers tab ── */}
      {activeTab === 'barbers' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {[{ key: 'all', label: 'All Branches' }, ...branches.map(b => ({ key: b.name, label: b.name })), { key: 'freelance', label: 'Freelance' }].map(f => (
              <button key={f.key} onClick={() => setBranchFilter(f.key)}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${branchFilter === f.key ? T.topBg : T.border}`, background: branchFilter === f.key ? T.topBg : 'transparent', color: branchFilter === f.key ? T.white : T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                {f.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Show inactive</span>
              <div onClick={() => setShowInactive(v => !v)} style={{ width: 36, height: 20, borderRadius: 99, background: showInactive ? T.topBg : T.surface2, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', width: 14, height: 14, background: T.white, borderRadius: '50%', top: 3, left: showInactive ? 19 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>Click a row to manage service capability.</div>

          <div className="admin-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.6fr 1fr 1fr 0.8fr 0.5fr', padding: '10px 18px', borderBottom: `1px solid ${T.surface}` }}>
              {['Barber', 'Branch', 'Chair', 'Pay Type', 'Pay Details', 'Services', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
              ))}
            </div>

            <div style={{ maxHeight: 'calc(100vh - 390px)', minHeight: 200, overflowY: 'auto' }}>
              {filtered.length === 0 && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 14 }}>No barbers match this filter</div>
              )}
              {filtered.map((b, i) => {
                const ptm        = PAY_TYPE_META[b.pay_type] ?? PAY_TYPE_META.salary_plus_commission
                const svcCount   = barberSvcs[b.id] ? Object.values(barberSvcs[b.id]).filter(Boolean).length : '—'
                const isExpanded = expandedBarber === b.id
                const isFreelance = b.pay_type === 'daily_rate'
                const branchObj  = branches.find(br => br.id === b.branch_id)
                const branchName = branchObj?.name || '—'

                return (
                  <div key={b.id} style={{ animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}>
                    <div onClick={() => handleExpandBarber(b.id)}
                      style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.6fr 1fr 1fr 0.8fr 0.5fr', padding: '12px 18px', borderBottom: `1px solid ${T.surface}`, alignItems: 'center', transition: 'background 0.1s', opacity: b.is_active !== false ? 1 : 0.5, cursor: 'pointer', background: isExpanded ? T.surface : 'transparent' }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = T.bg }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={b.name} inactive={b.is_active === false} />
                        <div>
                          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{b.name}</div>
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                            {b.specialty}
                            {b.is_active === false && <span style={{ marginLeft: 6, fontSize: 10, color: T.danger, fontStyle: 'italic' }}>Inactive</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 12, color: isFreelance ? T.muted : T.text2, fontStyle: isFreelance ? 'italic' : 'normal' }}>
                        {isFreelance ? 'Freelance' : branchName}
                      </div>

                      <div>
                        {b.chair_label
                          ? <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 12, padding: '3px 8px', borderRadius: 5, background: T.topBg, color: T.accent }}>{b.chair_label}</span>
                          : <span style={{ fontSize: 12, color: T.muted }}>—</span>
                        }
                      </div>

                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: ptm.bg, color: ptm.color }}>{ptm.label}</span>
                      </div>

                      <div style={{ fontSize: 12, color: T.text2 }}>
                        {b.pay_type === 'salary_plus_commission' && b.base_salary > 0
                          ? 'Rp ' + (b.base_salary / 1000000).toFixed(1).replace('.0', '') + 'jt/mo'
                          : b.pay_type === 'daily_rate' && b.daily_rate
                          ? 'Rp ' + Math.round(b.daily_rate / 1000) + 'rb/day'
                          : <span style={{ color: T.muted }}>—</span>
                        }
                      </div>

                      <div style={{ fontSize: 12, color: isExpanded ? T.topBg : T.muted, fontWeight: isExpanded ? 700 : 400 }}>
                        {isFreelance ? <span style={{ color: T.muted }}>—</span> : (typeof svcCount === 'number' ? `${svcCount} enabled` : svcCount)}
                      </div>

                      <button onClick={e => { e.stopPropagation(); setEditBarber(b); setShowModal(true) }}
                        style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        Edit
                      </button>
                    </div>

                    {isExpanded && !isFreelance && (
                      <ServicePanel
                        barber={b} services={services}
                        barberSvcs={barberSvcs} onToggle={toggleService}
                        barberSvcRates={barberSvcRates} onRateChange={setServiceRate}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Attendance Log tab ── */}
      {activeTab === 'attendance' && (
        <>
          <div style={{ padding: '10px 16px', borderRadius: 9, background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: 16, fontSize: 12, color: '#1D4ED8' }}>
            This is the raw clock-in/out log. For monthly attendance summaries, off-day tracking, and payroll, see <strong>Attendance &amp; Payroll</strong>.
          </div>
          <div className="admin-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 2fr 1.3fr 0.8fr 0.8fr 0.6fr 0.8fr', padding: '10px 18px', borderBottom: `1px solid ${T.surface}` }}>
              {['Date', 'Barber', 'Branch', 'Clock In', 'Clock Out', 'Hours', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
              ))}
            </div>
            <div style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 200, overflowY: 'auto' }}>
              {attendance.length === 0 && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 14 }}>No attendance records</div>
              )}
              {attendance.map((a, i) => {
                const isFlagged = flagged.has(i)
                const barberObj = barbers.find(b => b.id === a.barber_id)
                const branchObj = branches.find(b => b.id === a.branch_id)
                const dateStr   = a.date || (a.clock_in ? a.clock_in.slice(0, 10) : '—')
                const clockIn   = a.clock_in ? new Date(a.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'
                const clockOut  = a.clock_out ? new Date(a.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null
                const hours     = a.clock_in && a.clock_out
                  ? ((new Date(a.clock_out) - new Date(a.clock_in)) / 3600000).toFixed(1) + 'h'
                  : '—'
                return (
                  <div key={i}
                    style={{ display: 'grid', gridTemplateColumns: '0.7fr 2fr 1.3fr 0.8fr 0.8fr 0.6fr 0.8fr', padding: '12px 18px', borderBottom: i < attendance.length - 1 ? `1px solid ${T.surface}` : 'none', alignItems: 'center', background: isFlagged ? '#FFFBEB' : 'transparent', animation: `fadeUp 0.2s ease ${i * 0.02}s both` }}
                    onMouseEnter={e => { if (!isFlagged) e.currentTarget.style.background = T.bg }}
                    onMouseLeave={e => { if (!isFlagged) e.currentTarget.style.background = 'transparent' }}>
                    <div style={{ fontSize: 11, color: T.muted }}>{dateStr}</div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{barberObj?.name || a.barber_name || '—'}</div>
                    <div style={{ fontSize: 12, color: T.text2 }}>{branchObj?.name || a.branch_name || '—'}</div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{clockIn}</div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: clockOut ? T.text : T.muted }}>{clockOut ?? '—'}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{hours}</div>
                    <button onClick={() => toggleFlag(i)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${isFlagged ? '#D97706' : T.border}`, background: isFlagged ? '#FFFBEB' : 'transparent', color: isFlagged ? '#D97706' : T.muted, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {isFlagged ? '⚑ Flagged' : 'Flag'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
