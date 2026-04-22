import { useEffect, useState } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const C = T  // alias

const lbl = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 5 }
const inp = { width: '100%', padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.white, boxSizing: 'border-box' }
const sel = { width: '100%', padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.white }

const TIP_METHODS = [
  { key: 'individual',   label: 'Individual',   sub: 'Each barber keeps their own tips' },
  { key: 'equal_split',  label: 'Equal Split',  sub: 'Tips split evenly across all staff' },
  { key: 'proportional', label: 'Proportional', sub: 'Split by revenue share' },
]
const TIMEZONES = ['Asia/Makassar', 'Asia/Jakarta', 'Asia/Jayapura']

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ width: 44, height: 24, borderRadius: 12, background: checked ? T.topBg : T.surface, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: checked ? T.accent : T.muted, transition: 'left 0.2s' }} />
    </div>
  )
}

// ── Stepper ────────────────────────────────────────────────────────────────────
function Stepper({ value, onChange, min, max, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: T.white, color: T.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, minWidth: 32, textAlign: 'center', color: T.text }}>{value}</div>
      <button onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: T.white, color: T.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      {unit && <span style={{ fontSize: 12, color: T.muted, marginLeft: 4 }}>{unit}</span>}
    </div>
  )
}

// ── SettingRow ─────────────────────────────────────────────────────────────────
function SettingRow({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '13px 0', borderBottom: `1px solid ${T.surface}` }}>
      <div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 2, maxWidth: 400, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

// ── GenerateTokenModal ─────────────────────────────────────────────────────────
function GenerateTokenModal({ branchId, branchName, onGenerated, onClose }) {
  const [deviceName, setDeviceName] = useState('')
  const [token,      setToken]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [copied,     setCopied]     = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await api.post('/kiosk/tokens', { branch_id: branchId, device_name: deviceName })
      setToken(res.token)
      onGenerated(res)
    } catch (err) { alert(err.message) }
    finally { setLoading(false) }
  }

  const copy = () => {
    navigator.clipboard?.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 460, padding: '24px 28px' }}>
        {!token ? (
          <>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 4 }}>Generate Device Token</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 20, lineHeight: 1.6 }}>
              This token is entered once on the Windows kiosk to register it to <strong>{branchName}</strong>. It never expires — revoke if device is replaced.
            </div>
            <label style={lbl}>Device Name *</label>
            <input value={deviceName} onChange={e => setDeviceName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && deviceName.trim() && generate()}
              placeholder="e.g. Kiosk A — Main Counter" style={inp} autoFocus />
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, background: T.surface, color: T.text, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={generate} disabled={!deviceName.trim() || loading}
                style={{ flex: 2, padding: '10px', borderRadius: 8, background: deviceName.trim() ? T.topBg : T.surface, color: deviceName.trim() ? T.white : T.muted, fontWeight: 700, fontSize: 13, border: 'none', cursor: deviceName.trim() ? 'pointer' : 'not-allowed' }}>
                {loading ? 'Generating…' : 'Generate Token'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 4 }}>Token Generated</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16, lineHeight: 1.6 }}>
              Copy this and enter it on the kiosk setup screen. <strong>It will not be shown again.</strong>
            </div>
            <div style={{ background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginBottom: 6 }}>Device Token · {deviceName}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '0.06em', wordBreak: 'break-all' }}>{token}</div>
            </div>
            <button onClick={copy}
              style={{ width: '100%', padding: '11px', borderRadius: 9, background: copied ? '#DCFCE7' : T.accent, color: copied ? '#16A34A' : T.accentText, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', marginBottom: 10 }}>
              {copied ? '✓ Copied!' : '📋 Copy Token'}
            </button>
            <button onClick={onClose}
              style={{ width: '100%', padding: '10px', borderRadius: 8, background: T.surface, color: T.text, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── OverrideModal ──────────────────────────────────────────────────────────────
function OverrideModal({ chair, barbers, branchId, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ barber_id: '', date_from: today, date_to: '', reason: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const options = barbers.filter(b => b.branch_id === branchId && b.id !== chair.barber_id)
  const selected = barbers.find(b => b.id === parseInt(form.barber_id))
  const valid = form.barber_id && form.date_from

  const submit = async () => {
    if (!valid) return
    setLoading(true)
    try {
      await api.post(`/branches/${branchId}/chairs/${chair.id}/overrides`, {
        barber_id: form.barber_id,
        date_from: form.date_from,
        date_to: form.date_to || null,
        reason: form.reason,
      })
      onSave(); onClose()
    } catch (err) { alert(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 460, padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>Override Chair {chair.label}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              {chair.barber_name ? `Covering for ${chair.barber_name}` : 'Assign a barber to this chair'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Covering Barber *</label>
            <select value={form.barber_id} onChange={e => set('barber_id', e.target.value)} style={sel}>
              <option value="">— Select barber —</option>
              {options.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {selected && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{selected.specialty || ''}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>From *</label>
              <input type="date" value={form.date_from} onChange={e => set('date_from', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Until</label>
              <input type="date" value={form.date_to} onChange={e => set('date_to', e.target.value)} style={inp} />
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>Leave blank = indefinite</div>
            </div>
          </div>
          <div>
            <label style={lbl}>Reason</label>
            <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. Home barber on sick leave" style={inp} />
          </div>
          {!form.date_to && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
              No end date — this override stays active until you remove it manually.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, background: T.surface, color: T.text, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={!valid || loading}
            style={{ flex: 2, padding: '10px', borderRadius: 8, background: valid ? T.topBg : T.surface, color: valid ? T.white : T.muted, fontWeight: 700, fontSize: 13, border: 'none', cursor: valid ? 'pointer' : 'not-allowed' }}>
            {loading ? 'Saving…' : 'Set Override'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ChairPanel ─────────────────────────────────────────────────────────────────
function ChairPanel({ branch, allBarbers }) {
  const [chairs,       setChairs]       = useState([])
  const [newLabel,     setNewLabel]     = useState('')
  const [overrideFor,  setOverrideFor]  = useState(null)
  const [loading,      setLoading]      = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.get(`/branches/${branch.id}/chairs`)
      setChairs(Array.isArray(d) ? d : [])
    } catch { setChairs([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [branch.id])

  const addChair = async () => {
    const label = newLabel.trim().toUpperCase()
    if (!label) return
    try {
      await api.post(`/branches/${branch.id}/chairs`, { label })
      setNewLabel('')
      load()
    } catch (err) { alert(err.message) }
  }

  const assignBarber = async (chairId, barberId) => {
    try {
      await api.patch(`/branches/${branch.id}/chairs/${chairId}`, { barber_id: barberId || null })
      load()
    } catch (err) { alert(err.message) }
  }

  const removeOverride = async (chairId) => {
    try {
      await api.delete(`/branches/${branch.id}/chairs/${chairId}/overrides`)
      load()
    } catch (err) { alert(err.message) }
  }

  const branchBarbers = allBarbers.filter(b => b.branch_id === branch.id)
  const assignedIds = chairs.map(c => c.barber_id).filter(Boolean)
  const unassigned = branchBarbers.filter(b => !assignedIds.includes(b.id))

  if (loading) return <div style={{ padding: '20px', color: T.muted, fontSize: 13 }}>Loading chairs…</div>

  return (
    <div style={{ padding: '16px 20px', background: T.bg, borderTop: `1px solid ${T.surface}` }}>
      {overrideFor && (
        <OverrideModal
          chair={overrideFor}
          barbers={allBarbers}
          branchId={branch.id}
          onSave={load}
          onClose={() => setOverrideFor(null)}
        />
      )}

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginBottom: 12 }}>
        Chairs — {chairs.length} total
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 14 }}>
        {chairs.map(chair => {
          const hasOverride = !!chair.override_barber_id
          return (
            <div key={chair.id} style={{ background: T.white, border: `1px solid ${hasOverride ? '#FDE68A' : T.border}`, borderRadius: 10, padding: '12px 14px', boxShadow: hasOverride ? '0 0 0 2px #FEF9C3' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: hasOverride ? '#D97706' : T.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 11, color: hasOverride ? '#fff' : T.accent }}>{chair.label}</span>
                  </div>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>Chair {chair.label}</span>
                </div>
              </div>

              <div style={{ marginBottom: hasOverride ? 8 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, marginBottom: 4 }}>
                  {hasOverride ? 'Home Barber' : 'Assigned Barber'}
                </div>
                <select
                  value={chair.barber_id ?? ''}
                  onChange={e => assignBarber(chair.id, e.target.value)}
                  style={{ width: '100%', padding: '6px 9px', borderRadius: 7, border: `1.5px solid ${chair.barber_id && !hasOverride ? T.topBg : T.border}`, fontSize: 12, color: hasOverride ? T.muted : (chair.barber_id ? T.text : T.muted), background: T.white }}>
                  <option value="">— Unassigned —</option>
                  {branchBarbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {hasOverride ? (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 7, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#D97706', marginBottom: 3 }}>⟳ Covering Now</div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 12, color: T.text }}>{chair.override_barber_name}</div>
                    </div>
                    <button onClick={() => removeOverride(chair.id)}
                      style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setOverrideFor(chair)}
                  style={{ width: '100%', marginTop: 8, padding: '6px', borderRadius: 7, border: `1px dashed ${T.border}`, background: 'transparent', color: T.muted, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                  + Override
                </button>
              )}
            </div>
          )
        })}

        {/* Add chair card */}
        <div style={{ background: 'transparent', border: `1.5px dashed ${T.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addChair()}
            placeholder="Label (A1, B2…)"
            style={{ flex: 1, padding: '6px 9px', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 12, color: T.text, background: T.white }} />
          <button onClick={addChair}
            style={{ padding: '6px 12px', borderRadius: 7, background: T.topBg, color: T.white, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Add
          </button>
        </div>
      </div>

      {unassigned.length > 0 && (
        <div style={{ fontSize: 11, color: T.muted }}>
          {unassigned.length} barber{unassigned.length !== 1 ? 's' : ''} without a chair: {unassigned.map(b => b.name.split(' ')[0]).join(', ')}
        </div>
      )}
    </div>
  )
}

// ── BranchModal (3-tab: Details, Operations, Kiosk Devices) ───────────────────
function BranchModal({ branch, onSave, onClose }) {
  const isNew = !branch
  const [tab, setTab] = useState('details')
  const [devices, setDevices] = useState([])
  const [devicesLoaded, setDevicesLoaded] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name:                         branch?.name || '',
    city:                         branch?.city || '',
    address:                      branch?.address || '',
    timezone:                     branch?.timezone || 'Asia/Makassar',
    online_booking_slug:          branch?.online_booking_slug || '',
    tip_distribution_method:      branch?.tip_distribution_method || 'individual',
    pay_period_type:              branch?.pay_period_type || 'monthly',
    is_active:                    branch?.is_active !== false,
    online_booking_enabled:       branch?.online_booking_enabled !== false,
    speaker_enabled:              branch?.speaker_enabled !== false,
    web_push_enabled:             branch?.web_push_enabled ?? false,
    late_start_threshold_minutes: branch?.late_start_threshold_minutes ?? 10,
    ack_grace_period_minutes:     branch?.ack_grace_period_minutes ?? 3,
    backoffice_alert_phone:       branch?.backoffice_alert_phone || '',
    whatsapp_enabled:             branch?.whatsapp_enabled !== false,
    tip_presets:                  branch?.tip_presets ?? [5000, 10000, 20000, 50000, 100000],
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Load kiosk devices when switching to that tab
  useEffect(() => {
    if (tab === 'devices' && branch?.id && !devicesLoaded) {
      api.get(`/kiosk/tokens?branch_id=${branch.id}`)
        .then(d => setDevices(Array.isArray(d) ? d : []))
        .finally(() => setDevicesLoaded(true))
    }
  }, [tab])

  const setTipPreset = (i, val) => {
    const v = [...form.tip_presets]
    v[i] = (parseInt(val) || 0) * 1000
    set('tip_presets', v)
  }
  const addTipPreset = () => {
    if (form.tip_presets.length >= 6) return
    set('tip_presets', [...form.tip_presets, 20000])
  }
  const removeTipPreset = (i) => {
    if (form.tip_presets.length <= 2) return
    set('tip_presets', form.tip_presets.filter((_, idx) => idx !== i))
  }

  const revokeDevice = async (id) => {
    if (!confirm('Revoke this token? The kiosk will lose access immediately.')) return
    await api.delete(`/kiosk/tokens/${id}`)
    setDevices(ds => ds.map(d => d.id === id ? { ...d, is_active: false } : d))
  }

  const valid = form.name.trim() && form.city.trim() && form.address.trim()

  const submit = async () => {
    if (!valid) return
    setLoading(true); setError('')
    try {
      const payload = { ...form }
      if (branch?.id) await api.patch(`/branches/${branch.id}`, payload)
      else await api.post('/branches', payload)
      onSave(); onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const TABS = [{ key: 'details', label: 'Details' }, { key: 'ops', label: 'Operations' }, { key: 'devices', label: 'Devices & TV' }]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '22px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 18, color: T.text }}>
              {isNew ? 'Add Branch' : `Edit · ${branch.name}`}
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          {error && <div style={{ color: T.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '8px 18px', background: 'none', border: 'none', borderBottom: tab === t.key ? `2px solid ${T.topBg}` : '2px solid transparent', fontWeight: 700, fontSize: 13, color: tab === t.key ? T.text : T.muted, cursor: 'pointer', marginBottom: -1 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

          {/* ── Details ── */}
          {tab === 'details' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginBottom: 10 }}>Identity</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 22 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Branch Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Bercut Kerobokan" style={inp} />
                </div>
                <div>
                  <label style={lbl}>City *</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Kerobokan" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Online Booking Slug</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: `1.5px solid ${T.border}`, overflow: 'hidden', background: T.white }}>
                    <span style={{ padding: '9px 10px', fontSize: 11, color: T.muted, borderRight: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>bercut.id/book/</span>
                    <input value={form.online_booking_slug} onChange={e => set('online_booking_slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="kerobokan" style={{ flex: 1, padding: '9px 10px', border: 'none', fontSize: 13, color: T.text, background: 'transparent' }} />
                  </div>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Address *</label>
                  <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Jl. ..." style={inp} />
                </div>
                <div>
                  <label style={lbl}>Timezone</label>
                  <select value={form.timezone} onChange={e => set('timezone', e.target.value)} style={sel}>
                    {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginBottom: 10 }}>Payroll & Tips</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 22 }}>
                <div>
                  <label style={lbl}>Pay Period</label>
                  <select value={form.pay_period_type} onChange={e => set('pay_period_type', e.target.value)} style={sel}>
                    <option value="monthly">Monthly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tip Distribution</label>
                  <select value={form.tip_distribution_method} onChange={e => set('tip_distribution_method', e.target.value)} style={sel}>
                    {TIP_METHODS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                    {TIP_METHODS.find(t => t.key === form.tip_distribution_method)?.sub}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginBottom: 10 }}>Status</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 9, background: T.bg, border: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>Branch Active</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Inactive branches are hidden from kiosk routing and reports</div>
                </div>
                <Toggle checked={form.is_active} onChange={v => set('is_active', v)} />
              </div>
            </div>
          )}

          {/* ── Operations ── */}
          {tab === 'ops' && (
            <div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 2 }}>Online Booking</div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>Controls whether this branch accepts bookings via the online booking page.</div>
              <SettingRow label="Enable Online Booking" sub="When off, this branch is hidden from online booking. Redirects to WhatsApp.">
                <Toggle checked={form.online_booking_enabled} onChange={v => set('online_booking_enabled', v)} />
              </SettingRow>

              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: T.text, marginTop: 22, marginBottom: 2 }}>Announcements & Escalation</div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>Voice announcements and alert thresholds specific to this branch.</div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Backoffice Alert Phone</label>
                <input type="tel" value={form.backoffice_alert_phone} onChange={e => set('backoffice_alert_phone', e.target.value)} placeholder="+6281234567890" style={inp} />
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>WhatsApp number for barber "Client Not Arrived" alerts. E.164 format.</div>
              </div>

              <SettingRow label="Speaker Announcement" sub="Announce customer names via Web Speech API on the kiosk speaker.">
                <Toggle checked={form.speaker_enabled} onChange={v => set('speaker_enabled', v)} />
              </SettingRow>
              <SettingRow label="Web Push Notifications (Phase 2)" sub="Push to barber PWAs on new booking. Requires VAPID key setup.">
                <Toggle checked={form.web_push_enabled} onChange={v => set('web_push_enabled', v)} />
              </SettingRow>
              <SettingRow label="Late Start Alert" sub="Alert admin if barber hasn't started a confirmed booking within this many minutes.">
                <Stepper value={form.late_start_threshold_minutes} onChange={v => set('late_start_threshold_minutes', v)} min={5} max={30} unit="min" />
              </SettingRow>
              <SettingRow label="Acknowledge Grace Period" sub="Re-announce if barber hasn't acknowledged a new booking within this many minutes.">
                <Stepper value={form.ack_grace_period_minutes} onChange={v => set('ack_grace_period_minutes', v)} min={1} max={10} unit="min" />
              </SettingRow>

              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: T.text, marginTop: 22, marginBottom: 2 }}>Tip Presets</div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>Amounts shown on the kiosk payment screen. Custom + Skip are always available.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                {form.tip_presets.map((val, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 4 }}>#{i + 1}</div>
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.white, overflow: 'hidden' }}>
                      <span style={{ padding: '0 7px', fontSize: 11, color: T.muted, borderRight: `1px solid ${T.border}` }}>Rp</span>
                      <input type="number" value={val / 1000} onChange={e => setTipPreset(i, e.target.value)}
                        style={{ width: 52, padding: '9px 6px', border: 'none', fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: T.text, background: 'transparent', textAlign: 'right' }} />
                      <span style={{ padding: '0 6px', fontSize: 11, color: T.muted, borderLeft: `1px solid ${T.border}` }}>rb</span>
                      {form.tip_presets.length > 2 && (
                        <button onClick={() => removeTipPreset(i)}
                          style={{ padding: '0 7px', background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13 }}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
                {form.tip_presets.length < 6 && (
                  <button onClick={addTipPreset}
                    style={{ padding: '9px 12px', borderRadius: 8, border: `1.5px dashed ${T.border}`, background: 'transparent', color: T.muted, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    + Add
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>
                Live preview: {form.tip_presets.map(p => 'Rp ' + (p / 1000) + 'k').join(' · ')}
              </div>
            </div>
          )}

          {/* ── Devices & TV ── */}
          {tab === 'devices' && (
            <div>
              {/* TV Monitor Link */}
              <div style={{ marginBottom: 24, padding: '16px', borderRadius: 12, background: T.bg, border: `1.5px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: T.text }}>Live TV Monitor</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Dashboard for real-time customer queue and status.</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: form.online_booking_slug ? '#16A34A' : '#EF4444' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: form.online_booking_slug ? '#16A34A' : '#EF4444', textTransform: 'uppercase' }}>
                      {form.online_booking_slug ? 'Active' : 'Missing Slug'}
                    </span>
                  </div>
                </div>

                {form.online_booking_slug ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.white, padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}` }}>
                    <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {window.location.origin}/tv/{form.online_booking_slug}
                    </div>
                    <button onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/tv/${form.online_booking_slug}`);
                      alert('TV Link copied!');
                    }} style={{ padding: '6px 12px', borderRadius: 6, background: T.topBg, color: T.white, border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                      Copy Link
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: T.danger, background: '#FEF2F2', padding: '10px 12px', borderRadius: 8, border: '1px solid #FCA5A5' }}>
                    ⚠ Please set an <strong>Online Booking Slug</strong> in the Details tab to enable the TV monitor.
                  </div>
                )}
              </div>

              {showGenerate && branch?.id && (
                <GenerateTokenModal
                  branchId={branch.id}
                  branchName={branch.name}
                  onGenerated={device => { setDevices(ds => [...ds, device]) }}
                  onClose={() => setShowGenerate(false)}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: T.text }}>Registered Kiosk Devices</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Each Windows touchscreen needs a device token to connect to this branch.</div>
                </div>
                {branch?.id ? (
                  <button onClick={() => setShowGenerate(true)}
                    style={{ padding: '7px 13px', borderRadius: 8, background: T.topBg, color: T.white, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
                    + Generate Token
                  </button>
                ) : (
                  <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>Save branch first to generate tokens</div>
                )}
              </div>

              {devices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: T.muted }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🖥️</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>No devices registered</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Generate a token and enter it on the kiosk setup screen.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {devices.map(device => (
                    <div key={device.id} style={{ padding: '13px 15px', borderRadius: 10, border: `1.5px solid ${device.is_active ? T.border : T.surface}`, background: device.is_active ? T.white : T.bg, opacity: device.is_active ? 1 : 0.6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>🖥 {device.device_name || 'Kiosk'}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: device.is_active ? '#DCFCE7' : T.surface, color: device.is_active ? '#16A34A' : T.muted }}>
                              {device.is_active ? 'Active' : 'Revoked'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: T.muted }}>
                            {device.last_seen_at ? `Last seen ${new Date(device.last_seen_at).toLocaleString('id-ID')}` : 'Never connected'} · Registered {device.created_at?.slice(0, 10)}
                          </div>
                        </div>
                        {device.is_active && (
                          <button onClick={() => revokeDevice(device.id)}
                            style={{ padding: '5px 11px', borderRadius: 6, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontWeight: 600, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
                Token is entered once on the Windows kiosk. It never expires — revoke here if a device is lost or replaced.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 9, background: T.surface, color: T.text, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={!valid || loading}
            style={{ flex: 2, padding: '11px', borderRadius: 9, background: valid ? T.topBg : T.surface, color: valid ? T.white : T.muted, fontWeight: 700, fontSize: 14, border: 'none', cursor: valid ? 'pointer' : 'not-allowed' }}>
            {loading ? 'Saving…' : isNew ? 'Add Branch' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Branches() {
  const [branches,     setBranches]     = useState([])
  const [allBarbers,   setAllBarbers]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showAdd,      setShowAdd]      = useState(false)
  const [editBranch,   setEditBranch]   = useState(null)
  const [expandedId,   setExpandedId]   = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/branches'), api.get('/barbers/all')])
      .then(([brs, bars]) => {
        setBranches(Array.isArray(brs) ? brs : [])
        setAllBarbers(Array.isArray(bars) ? bars : [])
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = filterStatus === 'all'      ? branches
                 : filterStatus === 'active'   ? branches.filter(b => b.is_active)
                 : branches.filter(b => !b.is_active)

  const activeCount = branches.filter(b => b.is_active).length
  const onlineCount = branches.filter(b => b.is_active && b.online_booking_enabled).length

  return (
    <div style={{ padding: '28px 32px' }}>
      {showAdd    && <BranchModal onSave={() => { load(); setShowAdd(false) }}   onClose={() => setShowAdd(false)} />}
      {editBranch && <BranchModal branch={editBranch} onSave={() => { load(); setEditBranch(null) }} onClose={() => setEditBranch(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Branches</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
            {activeCount} active · {onlineCount} online booking on
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding: '9px 16px', borderRadius: 8, background: T.topBg, color: T.white, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          + Add Branch
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[{ k: 'all', l: 'All' }, { k: 'active', l: 'Active' }, { k: 'inactive', l: 'Inactive' }].map(f => (
          <button key={f.k} onClick={() => setFilterStatus(f.k)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filterStatus === f.k ? T.topBg : T.border}`, background: filterStatus === f.k ? T.topBg : 'transparent', color: filterStatus === f.k ? T.white : T.text, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Branch list */}
      {loading ? (
        <div style={{ color: T.muted }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(branch => {
            const isExpanded = expandedId === branch.id
            const tipLabel = { individual: 'Individual', equal_split: 'Equal Split', proportional: 'Proportional' }[branch.tip_distribution_method] || 'Individual'

            return (
              <div key={branch.id} className="admin-card" style={{ overflow: 'hidden', opacity: branch.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.9fr 1fr 1.1fr 0.9fr', padding: '16px 20px', alignItems: 'center', gap: 8, borderBottom: isExpanded ? `1px solid ${T.surface}` : 'none' }}>

                  {/* Name */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>{branch.name}</div>
                      {branch.is_head_office && <span className="adm-badge" style={{ background: '#FEF9C3', color: '#92400E', fontSize: 9 }}>HQ</span>}
                      {!branch.is_active && <span className="adm-badge" style={{ background: T.surface, color: T.muted, fontSize: 9 }}>Inactive</span>}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{branch.city} · {branch.address}</div>
                  </div>

                  {/* Chairs */}
                  <button onClick={() => setExpandedId(v => v === branch.id ? null : branch.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 18, color: T.text }}>{branch.chair_count || 0}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{branch.assigned_chair_count || 0}/{branch.chair_count || 0} assigned</div>
                    <div style={{ fontSize: 10, color: T.topBg, fontWeight: 600, marginTop: 2 }}>{isExpanded ? '▲ Hide' : '▼ Manage'}</div>
                  </button>

                  {/* Barbers */}
                  <div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 18, color: T.text }}>{branch.barber_count || 0}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>barbers</div>
                  </div>

                  {/* Tip method */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: T.surface, color: T.text, display: 'inline-block' }}>{tipLabel}</div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{branch.pay_period_type || 'monthly'} pay</div>
                  </div>

                  {/* Online booking */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: branch.online_booking_enabled ? '#16A34A' : T.surface, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: branch.online_booking_enabled ? '#16A34A' : T.muted }}>
                        {branch.online_booking_enabled ? 'Online On' : 'Online Off'}
                      </span>
                    </div>
                    {branch.online_booking_slug ? (
                      <div style={{ fontSize: 10, color: T.muted }}>Slug: {branch.online_booking_slug}</div>
                    ) : (
                      <div style={{ fontSize: 10, color: '#DC2626' }}>No slug set</div>
                    )}
                  </div>

                  {/* Edit */}
                  <button onClick={() => setEditBranch(branch)}
                    style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Edit
                  </button>
                </div>

                {/* Chair panel */}
                {isExpanded && <ChairPanel branch={branch} allBarbers={allBarbers} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Column legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.9fr 1fr 1.1fr 0.9fr', padding: '8px 20px', marginTop: 4, gap: 8 }}>
        {['Branch', 'Chairs', 'Barbers', 'Payroll', 'Online Booking', ''].map((h, i) => (
          <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.surface }}>{h}</div>
        ))}
      </div>
    </div>
  )
}
