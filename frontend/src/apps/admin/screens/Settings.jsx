import { useEffect, useState } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

// ── Shared helpers ────────────────────────────────────────────────────────────
function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

function SettingRow({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '14px 0', borderBottom: '1px solid ' + T.surface }}>
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: T.text }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 3, maxWidth: 480, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ width: 44, height: 24, borderRadius: 12, background: checked ? T.topBg : T.surface2, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: checked ? T.accent : T.muted, transition: 'left 0.2s' }} />
    </div>
  )
}

function Stepper({ value, onChange, min, max, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid ' + T.border, background: T.white, color: T.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, minWidth: 32, textAlign: 'center', color: T.text }}>{value}</div>
      <button onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid ' + T.border, background: T.white, color: T.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      {unit && <span style={{ fontSize: 12, color: T.muted, marginLeft: 4 }}>{unit}</span>}
    </div>
  )
}

function SaveBtn({ saved, busy, onClick, label = 'Save' }) {
  return (
    <button onClick={onClick} disabled={busy}
      style={{ padding: '11px 28px', borderRadius: 9, background: saved ? '#16A34A' : T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
      {saved ? '✓ Saved' : busy ? 'Saving…' : label}
    </button>
  )
}

// ── Catalog tab ───────────────────────────────────────────────────────────────
function CatalogTab() {
  const [cats,    setCats]    = useState([])
  const [adding,  setAdding]  = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [busy,    setBusy]    = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/settings/expense-categories').catch(() => [])
      .then(d => { setCats(Array.isArray(d) ? d : []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!newName.trim() || busy) return
    setBusy(true)
    try {
      await api.post('/settings/expense-categories', { label: newName.trim() })
      setNewName(''); setNewDesc(''); setAdding(false)
      load()
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  const thStyle = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, padding: '8px 14px', borderBottom: '1px solid ' + T.surface }
  const tdStyle = { fontSize: 13, padding: '11px 14px', color: T.text, borderBottom: '1px solid ' + T.surface, verticalAlign: 'middle' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>Expense Categories</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>Categories used when logging expenses. New categories can be added here or inline from the Expenses form.</div>
        </div>
        <button onClick={() => setAdding(v => !v)}
          style={{ padding: '7px 14px', borderRadius: 8, background: adding ? T.surface2 : T.topBg, color: adding ? T.text : T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
          {adding ? '✕ Cancel' : '+ New Category'}
        </button>
      </div>

      {adding && (
        <div style={{ padding: '16px 18px', borderRadius: 10, background: T.bg, border: '1px solid ' + T.border, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 4 }}>Name *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} autoFocus placeholder="e.g. Cleaning Supplies"
                style={{ width: '100%', padding: '8px 11px', borderRadius: 7, border: '1px solid ' + T.border, fontSize: 13, color: T.text, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 4 }}>Key (Identifier)</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. cleaning_supplies"
                style={{ width: '100%', padding: '8px 11px', borderRadius: 7, border: '1px solid ' + T.border, fontSize: 13, color: T.text, boxSizing: 'border-box' }} />
            </div>
          </div>
          <button onClick={handleAdd} disabled={!newName.trim() || busy}
            style={{ padding: '8px 20px', borderRadius: 8, background: newName.trim() && !busy ? T.topBg : T.surface2, color: newName.trim() && !busy ? T.white : T.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: newName.trim() && !busy ? 'pointer' : 'not-allowed' }}>
            {busy ? 'Adding…' : 'Add Category'}
          </button>
        </div>
      )}

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        {loading && <div style={{ padding: '24px', textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>}
        {!loading && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Label', 'Key'].map((h, i) => <th key={i} style={{ ...thStyle, textAlign: 'left' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {cats.length === 0 && (
                <tr><td colSpan={2} style={{ ...tdStyle, textAlign: 'center', color: T.muted }}>No categories yet.</td></tr>
              )}
              {cats.map(cat => (
                <tr key={cat.id}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ transition: 'background 0.1s' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{cat.label}</td>
                  <td style={{ ...tdStyle, color: T.muted }}>{cat.key || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Loyalty tab ───────────────────────────────────────────────────────────────
function LoyaltyTab() {
  const [cfg,     setCfg]     = useState({ points_expiry_months: 12, points_expiry_warning_days: 30 })
  const [loading, setLoading] = useState(true)
  const [saved,   setSaved]   = useState(false)
  const [busy,    setBusy]    = useState(false)

  useEffect(() => {
    api.get('/settings/global').then(d => {
      if (d) setCfg(prev => ({ ...prev, ...d })
      )
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }))

  async function handleSave() {
    setBusy(true)
    try {
      await api.patch('/settings/global', {
        points_expiry_months:      cfg.points_expiry_months,
        points_expiry_warning_days: cfg.points_expiry_warning_days,
      })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  const expiryMonths = Number(cfg.points_expiry_months || 0)
  const warningDays  = Number(cfg.points_expiry_warning_days || 0)

  if (loading) return <div style={{ padding: '24px', color: T.muted, fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <SectionTitle title="Loyalty Programme" sub="Point expiry settings apply chain-wide to all customers and branches." />

      <SettingRow label="Points Expiry Window"
        sub="How many months of inactivity before a customer's points expire. Set to 0 to disable expiry.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Stepper value={expiryMonths} onChange={v => set('points_expiry_months', v)} min={0} max={24} unit="months" />
          {expiryMonths === 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#F0FDF4', color: '#16A34A' }}>Never expire</span>
          )}
        </div>
      </SettingRow>

      <SettingRow label="Expiry Warning"
        sub="Show a warning on the kiosk this many days before a customer's points expire. Set to 0 to disable.">
        <Stepper value={warningDays} onChange={v => set('points_expiry_warning_days', v)} min={0} max={90} unit="days before" />
      </SettingRow>

      <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 10, background: T.bg, border: '1px solid ' + T.border }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: T.text, marginBottom: 6 }}>How it works</div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.75 }}>
          {expiryMonths === 0
            ? 'Points never expire — customers keep their balance indefinitely.'
            : <>
                Points expire after <strong style={{ color: T.text }}>{expiryMonths} month{expiryMonths !== 1 ? 's' : ''}</strong> of inactivity.
                The clock resets each time a customer completes a booking at any branch.
                {warningDays > 0 && <> A warning banner is shown on the kiosk Confirm screen <strong style={{ color: T.text }}>{warningDays} days</strong> before expiry.</>}
              </>
          }
        </div>
      </div>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 12 }}>
        <SaveBtn saved={saved} busy={busy} onClick={handleSave} label="Save Loyalty Settings" />
        <span style={{ fontSize: 12, color: T.muted }}>Applies globally across all branches and customers.</span>
      </div>
    </div>
  )
}

// ── Payroll tab ───────────────────────────────────────────────────────────────
function PayrollTab() {
  const [cfg,     setCfg]     = useState({
    late_deduction_per_minute:  2000,
    late_grace_period_minutes:  5,
    inexcused_off_flat_deduction: 150000,
    excused_off_flat_deduction:   150000,
    off_quota_per_week:         1,
    ot_commission_enabled:      false,
    ot_threshold_time:          '19:00',
    ot_bonus_pct:               5,
    working_days_per_week:      6,
    ot_excluded_service_ids:    [],
  })
  const [shiftStartTime, setShiftStartTime] = useState('10:00')
  const [allServices, setAllServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saved,   setSaved]   = useState(false)
  const [busy,    setBusy]    = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/settings/payroll'),
      api.get('/settings/global'),
    ]).then(([payroll, global]) => {
      if (payroll) setCfg(prev => ({ ...prev, ...payroll }))
      if (global?.shift_start_time) setShiftStartTime(String(global.shift_start_time).slice(0, 5))
    }).catch(() => {}).finally(() => setLoading(false))
    api.get('/services').then(d => {
      setAllServices((d || []).filter(s => s.is_active).sort((a, b) => a.name.localeCompare(b.name)))
    }).catch(() => {})
  }, [])

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }))

  async function handleSave() {
    setBusy(true)
    try {
      await Promise.all([
        api.patch('/settings/payroll', cfg),
        api.patch('/settings/global', { shift_start_time: shiftStartTime }),
      ])
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  const otEnabled = !!cfg.ot_commission_enabled
  const INP = { width: 110, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + T.border, fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: T.text, background: T.white, textAlign: 'right' }

  if (loading) return <div style={{ padding: '24px', color: T.muted, fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <SectionTitle title="Attendance Deductions"
        sub="Rates used to auto-calculate deductions from late arrivals and absences each payroll period." />

      <SettingRow label="Shift Start Time"
        sub="Barbers clocking in after this time (plus grace) are marked late. Used for all branches.">
        <input type="time" value={shiftStartTime} onChange={e => setShiftStartTime(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid ' + T.border, fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: T.text, background: T.white }} />
      </SettingRow>

      <SettingRow label="Late Deduction Rate"
        sub="Deducted per minute late. Applied automatically from the late minutes count in Payroll.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: T.muted }}>Rp</span>
          <input type="number" value={cfg.late_deduction_per_minute} min={0} step={500}
            onChange={e => set('late_deduction_per_minute', parseInt(e.target.value) || 0)}
            style={{ ...INP }} />
          <span style={{ fontSize: 12, color: T.muted }}>/min</span>
        </div>
      </SettingRow>

      <SettingRow label="Late Arrival Grace Period"
        sub={`Arriving within this window is not penalised. Beyond it, the full late minutes count is charged — grace is not subtracted.`}>
        <Stepper value={Number(cfg.late_grace_period_minutes)} onChange={v => set('late_grace_period_minutes', v)} min={0} max={30} unit="min grace" />
      </SettingRow>

      <SettingRow label="Inexcused Off Rate"
        sub="Fixed penalty per inexcused absence day. Applied in full — no free quota applies.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: T.muted }}>Rp</span>
          <input type="number" value={cfg.inexcused_off_flat_deduction} min={0} step={50000}
            onChange={e => set('inexcused_off_flat_deduction', parseInt(e.target.value) || 0)}
            style={{ ...INP }} />
          <span style={{ fontSize: 12, color: T.muted }}>/day</span>
        </div>
      </SettingRow>

      <SettingRow label="Weekly Excused Off Quota"
        sub="Free excused offs per calendar week (Mon–Sun). Payroll deducts excused offs above this × complete weeks in the period.">
        <Stepper value={Number(cfg.off_quota_per_week)} onChange={v => set('off_quota_per_week', v)} min={0} max={7} unit="per week" />
      </SettingRow>

      <SettingRow label="Charge Per Excused Off Above Quota"
        sub={`Each excused off day beyond the free quota is deducted at this rate.`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: T.muted }}>Rp</span>
          <input type="number" value={cfg.excused_off_flat_deduction} min={0} step={25000}
            onChange={e => set('excused_off_flat_deduction', parseInt(e.target.value) || 0)}
            style={{ ...INP }} />
          <span style={{ fontSize: 12, color: T.muted }}>/day</span>
        </div>
      </SettingRow>

      <SettingRow label="Working Days Per Week"
        sub="Used to compute the standard monthly working day count for base salary proration.">
        <Stepper value={Number(cfg.working_days_per_week)} onChange={v => set('working_days_per_week', v)} min={1} max={7} unit="days/week" />
      </SettingRow>

      {/* Overtime */}
      <div style={{ marginTop: 32 }}>
        <SectionTitle title="Overtime Commission"
          sub="Services completed at or after the threshold time earn an additional commission bonus on top of each barber's standard rate." />

        <SettingRow label="Enable Overtime Commission"
          sub="When enabled, qualifying late-hour services earn the bonus percentage in addition to the standard commission.">
          <Toggle checked={otEnabled} onChange={v => set('ot_commission_enabled', v)} />
        </SettingRow>

        {otEnabled && (
          <>
            <SettingRow label="Threshold Time"
              sub="Services booked at or after this time qualify for the overtime bonus.">
              <input type="time" value={cfg.ot_threshold_time || '19:00'} onChange={e => set('ot_threshold_time', e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid ' + T.border, fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: T.text, background: T.white }} />
            </SettingRow>

            <SettingRow label="Bonus Percentage"
              sub="Extra commission % added on top of the barber's standard rate for qualifying services.">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Stepper value={Number(cfg.ot_bonus_pct)} onChange={v => set('ot_bonus_pct', v)} min={1} max={50} unit="%" />
                <span style={{ fontSize: 12, color: T.muted }}>e.g. 35% + {cfg.ot_bonus_pct}% = {35 + Number(cfg.ot_bonus_pct)}% effective rate</span>
              </div>
            </SettingRow>

            <SettingRow label="Exclude Services from OT Commission"
              sub="Selected services earn standard commission only, even when booked after the threshold.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 280 }}>
                {/* selected chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(cfg.ot_excluded_service_ids || []).map(id => {
                    const svc = allServices.find(s => s.id === id)
                    if (!svc) return null
                    return (
                      <span key={id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 999,
                        background: '#FEF3C7', border: '1px solid #FDE68A',
                        fontSize: 12, fontWeight: 600, color: '#92400E'
                      }}>
                        {svc.name}
                        <button onClick={() => set('ot_excluded_service_ids',
                          (cfg.ot_excluded_service_ids || []).filter(x => x !== id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer',
                            color: '#92400E', fontSize: 13, lineHeight: 1, padding: 0 }}>✕</button>
                      </span>
                    )
                  })}
                </div>
                {/* add service dropdown */}
                <select
                  value=""
                  onChange={e => {
                    if (!e.target.value) return
                    if (!(cfg.ot_excluded_service_ids || []).includes(e.target.value))
                      set('ot_excluded_service_ids', [...(cfg.ot_excluded_service_ids || []), e.target.value])
                  }}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid ' + T.border,
                    fontSize: 13, color: T.text, background: T.white, maxWidth: 280 }}>
                  <option value="">＋ Add service to exclude…</option>
                  {allServices
                    .filter(s => !(cfg.ot_excluded_service_ids || []).includes(s.id))
                    .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {(cfg.ot_excluded_service_ids || []).length === 0 && (
                  <div style={{ fontSize: 11, color: T.muted }}>No exclusions — all services qualify for OT bonus.</div>
                )}
              </div>
            </SettingRow>
          </>
        )}
      </div>

      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid ' + T.border }}>
        <SaveBtn saved={saved} busy={busy} onClick={handleSave} label="Save Payroll Settings" />
      </div>
    </div>
  )
}

// ── WhatsApp tab ──────────────────────────────────────────────────────────────
const WA_TEMPLATES = [
  { key: 'tpl_booking_confirmed', label: 'Booking Confirmation', icon: '✅', trigger: 'Auto — on booking confirmed (if customer provided phone number)', vars: 'name, barber, date, time, queue_no' },
  { key: 'tpl_payment_receipt',   label: 'Payment Receipt', icon: '🧾', trigger: 'Auto — on payment confirmed', vars: 'name, total, tip' },
  { key: 'tpl_points_earned',     label: 'Points Earned', icon: '🎁', trigger: 'Auto — when customer earns loyalty points', vars: 'name, points, total' },
  { key: 'tpl_barber_new_booking', label: 'Kapster: New Booking', icon: '💇', trigger: 'Auto — sent to barber when a customer books them', vars: 'barber, customer, time, date, queue_no, service' },
  { key: 'tpl_barber_escalation',  label: 'Kapster: Mulai Layanan', icon: '🔔', trigger: 'Auto — repeated reminder to barber to start service (every few minutes)', vars: 'barber, customer, queue_no, time, count' },
  { key: 'tpl_booking_reminder',  label: 'Late Customer Reminder', icon: '⏰', trigger: 'Auto — sent once when customer hasn\'t arrived by scheduled time', vars: 'name, barber, time' },
  { key: 'tpl_feedback_request',  label: 'Feedback Request', icon: '⭐', trigger: 'Auto — sent after service completion', vars: 'name, barber' },
  { key: 'tpl_kasbon_deducted',   label: 'Kasbon Deducted', icon: '💸', trigger: 'Auto — when kasbon is deducted from barber payroll', vars: 'name, amount' },
  { key: 'tpl_autoreply',         label: 'Inbound Auto-Reply', icon: '🤖', trigger: 'Once per contact — sent when someone messages the system number (requires Fonnte webhook)', vars: '' },
]

const DEFAULT_TEMPLATES = {
  tpl_booking_confirmed: 'Halo {{name}}! ✅\n\nBooking Anda sudah dikonfirmasi:\n🪑 Kapster: {{barber}}\n📅 Tanggal: {{date}}\n⏰ Jam: {{time}}\n🎫 No. Antrian: {{queue_no}}\n\nSampai jumpa di Bercut! 💈',
  tpl_payment_receipt: 'Terima kasih {{name}}! 🧾\n\nPembayaran berhasil:\n💰 Total: {{total}}\n💝 Tip: {{tip}}\n\nTerima kasih sudah berkunjung ke Bercut! See you again ✨',
  tpl_points_earned: 'Hai {{name}}! 🎁\n\nAnda mendapat {{points}} poin dari kunjungan hari ini!\n⭐ Total poin: {{total}}\n\nKumpulkan poin dan tukarkan di kunjungan berikutnya!',
  tpl_barber_new_booking: 'Hai {{barber}}! 💇\n\nBooking baru masuk:\n👤 Customer: {{customer}}\n⏰ Jam: {{time}}\n📅 Tanggal: {{date}}\n🎫 No: {{queue_no}}\n✂️ Layanan: {{service}}\n\nSiap-siap ya! 💪',
  tpl_barber_escalation: '⚠️ {{barber}}, customer {{customer}} ({{queue_no}}) sudah menunggu sejak jam {{time}}.\n\nSegera mulai layanan! (Pengingat ke-{{count}})',
  tpl_autoreply: 'Hi! This number is automated and cannot reply to messages. For directions or to find us, visit: https://maps.app.goo.gl/nheFJ1Mxm76xLaPD6 — Bercut Barbershop Kerobokan',
}

const DEFAULT_CLOSING_TEMPLATE = 'CLOSING REPORT {{branch}} {{date}}\n\nTotal Penjualan: {{total_penjualan}}\nTotal Pax: {{total_pax}} pax\n\nCASH : {{cash}}\nCARD : {{card}}\nQR   : {{qr}}\nTIP  : {{tip}}\n\nProduk & Minuman Terjual\n{{items_sold}}\n\nSisa Stok Minuman\n{{beverages_stock}}\n\nSisa Stok Produk\n{{styling_stock}}'
const DEFAULT_MONITORING_TEMPLATE = 'Report Pax & Service {{branch}} {{date}}\n\nPax: {{total_pax}} pax\n{{services_breakdown}}'

function WhatsAppTab() {
  const [cfg,       setCfg]       = useState({ enabled: false, fonnte_token: '', closing_time: '21:00', closing_report_enabled: false, closing_group_1: '', closing_group_2: '', tpl_closing_report: '', monitoring_report_enabled: false, monitoring_group_1: '', monitoring_group_2: '', tpl_monitoring_report: '' })
  const [activeTpl, setActiveTpl] = useState('tpl_booking_confirmed')
  const [showKey,   setShowKey]   = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testState, setTestState] = useState('idle')
  const [loading,   setLoading]   = useState(true)
  const [saved,     setSaved]     = useState(false)
  const [busy,      setBusy]      = useState(false)
  const [branches,     setBranches]     = useState([])
  const [sendBranch,   setSendBranch]   = useState('')
  const [sendBusy,     setSendBusy]     = useState(false)
  const [sendMsg,      setSendMsg]      = useState('')

  useEffect(() => {
    api.get('/settings/whatsapp').then(d => {
      if (d) setCfg(prev => ({ ...prev, ...d }))
    }).catch(() => {}).finally(() => setLoading(false))
    api.get('/branches').then(rows => {
      setBranches(Array.isArray(rows) ? rows : [])
      if (rows?.length) setSendBranch(rows[0].id)
    })
  }, [])

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }))

  async function handleSave() {
    setBusy(true)
    try {
      await api.patch('/settings/whatsapp', cfg)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  const handleSendNow = async () => {
    if (!sendBranch) return
    setSendBusy(true); setSendMsg('')
    try {
      await api.post(`/settings/whatsapp/send-report/${sendBranch}`, { type: 'both' })
      setSendMsg('Sent!')
    } catch (err) { setSendMsg(err?.message || 'Failed') }
    finally { setSendBusy(false); setTimeout(() => setSendMsg(''), 6000) }
  }

  async function handleTestSend() {
    if (!testPhone.trim()) return
    setTestState('sending')
    try {
      await api.post('/settings/whatsapp/test', { 
        phone: testPhone,
        token: cfg.fonnte_token 
      })
      setTestState('ok'); setTimeout(() => setTestState('idle'), 4000)
    } catch {
      setTestState('error'); setTimeout(() => setTestState('idle'), 4000)
    }
  }

  const tpl = WA_TEMPLATES.find(t => t.key === activeTpl) || WA_TEMPLATES[0]

  if (loading) return <div style={{ padding: '24px', color: T.muted, fontSize: 13 }}>Loading…</div>

  return (
    <div>
      {/* Master toggle */}
      <div onClick={() => set('enabled', !cfg.enabled)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: 12, background: cfg.enabled ? '#f0fdf4' : T.bg, border: `1.5px solid ${cfg.enabled ? '#bbf7d0' : T.border}`, marginBottom: 28, cursor: 'pointer', transition: 'all 0.2s' }}>
        <div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>WhatsApp Notifications</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.5 }}>
            Automatic messages to customers and staff. Covers booking confirmation, receipt, late reminders, and barber escalation.
          </div>
        </div>
        <Toggle checked={!!cfg.enabled} onChange={v => set('enabled', v)} />
      </div>

      {/* Fonnte credentials */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle title="Fonnte Credentials" sub={<>API key from fonnte.com. Keep it secret — it authorises all sends from your WhatsApp number. For the inbound auto-reply to work, set your Fonnte webhook URL to <code style={{ fontFamily: 'monospace', fontSize: 11, background: '#f3f4f6', padding: '1px 5px', borderRadius: 3 }}>{window.location.origin}/api/webhook/fonnte</code></>} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 640 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 5 }}>API Key (Fonnte Token)</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type={showKey ? 'text' : 'password'} value={cfg.fonnte_token || ''} onChange={e => set('fonnte_token', e.target.value)}
                placeholder="Paste Fonnte API key"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid ' + T.border, fontSize: 13, color: T.text, fontFamily: 'monospace', minWidth: 0 }} />
              <button onClick={() => setShowKey(v => !v)}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid ' + T.border, background: T.white, color: T.text2, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, flexShrink: 0 }}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message templates */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle title="Message Templates"
          sub="Sent to customers and staff. Use plain text — each template is sent via Fonnte as a free-form message." />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {WA_TEMPLATES.map(t => (
            <button key={t.key} onClick={() => setActiveTpl(t.key)}
              style={{ padding: '7px 13px', borderRadius: 8, border: '1.5px solid ' + (activeTpl === t.key ? T.topBg : T.border), background: activeTpl === t.key ? T.topBg : T.white, color: activeTpl === t.key ? T.white : T.text, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.12s' }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {tpl && (
          <div style={{ background: T.white, border: '1px solid ' + T.border, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', display: 'inline-block', marginBottom: 6 }}>
                  {tpl.trigger}
                </div>
                {tpl.vars && (
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                    Variables: {tpl.vars.split(', ').map(v => <code key={v} style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 3, fontSize: 10, marginRight: 4, fontFamily: 'monospace' }}>{`{{${v}}}`}</code>)}
                  </div>
                )}
              </div>
              {DEFAULT_TEMPLATES[tpl.key] && !cfg[tpl.key] && (
                <button onClick={() => set(tpl.key, DEFAULT_TEMPLATES[tpl.key])}
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid ' + T.border, background: T.bg, color: T.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>
                  Load Default
                </button>
              )}
            </div>
            <textarea value={cfg[tpl.key] || ''}
              onChange={e => set(tpl.key, e.target.value)}
              rows={8}
              placeholder="Enter message template…"
              style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif" }} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 28 }}>
        <SectionTitle
          title="Daily Reports"
          sub="Sent automatically when all barbers clock out after closing time, or manually via Send Now."
        />

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 5 }}>Closing Time</label>
          <input type="time" value={cfg.closing_time || '21:00'} onChange={e => set('closing_time', e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, background: T.card, color: T.text, width: 140 }} />
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Auto-send fires when all barbers clock out at or after this time (WITA)</div>
        </div>

        <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!cfg.closing_report_enabled} onChange={e => set('closing_report_enabled', e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: 10, background: cfg.closing_report_enabled ? '#2563eb' : '#d1d5db', transition: 'background 0.2s' }} />
              <span style={{ position: 'absolute', top: 3, left: cfg.closing_report_enabled ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </label>
            <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>Closing Report (Closingan)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 5 }}>Group 1 (Fonnte JID)</label>
              <input value={cfg.closing_group_1 || ''} onChange={e => set('closing_group_1', e.target.value)}
                placeholder="e.g. 120363xxxxxx@g.us"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: T.card, color: T.text, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 5 }}>Group 2 (Fonnte JID)</label>
              <input value={cfg.closing_group_2 || ''} onChange={e => set('closing_group_2', e.target.value)}
                placeholder="e.g. 120363xxxxxx@g.us"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: T.card, color: T.text, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted }}>Template</label>
              {!cfg.tpl_closing_report && <button onClick={() => set('tpl_closing_report', DEFAULT_CLOSING_TEMPLATE)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Load Default</button>}
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 5 }}>Placeholders: {'{{branch}}'} {'{{date}}'} {'{{total_penjualan}}'} {'{{total_pax}}'} {'{{cash}}'} {'{{card}}'} {'{{qr}}'} {'{{tip}}'} {'{{items_sold}}'} {'{{beverages_sold}}'} {'{{beverages_stock}}'} {'{{styling_sold}}'} {'{{styling_stock}}'}</div>
            <textarea value={cfg.tpl_closing_report || ''} onChange={e => set('tpl_closing_report', e.target.value)}
              rows={10} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: T.card, color: T.text, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
              placeholder={'CLOSING REPORT {{branch}} {{date}}\n\nTotal Penjualan: {{total_penjualan}}\nTotal Pax: {{total_pax}} pax\n\nCASH : {{cash}}\nCARD : {{card}}\nQR   : {{qr}}\nTIP  : {{tip}}\n\nProduk Terjual\n{{beverages_sold}}\n\nSisa Stock Produk\n{{beverages_stock}}\n\nProduk Hair Styling\n{{styling_sold}}'} />
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!cfg.monitoring_report_enabled} onChange={e => set('monitoring_report_enabled', e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: 10, background: cfg.monitoring_report_enabled ? '#2563eb' : '#d1d5db', transition: 'background 0.2s' }} />
              <span style={{ position: 'absolute', top: 3, left: cfg.monitoring_report_enabled ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </label>
            <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>Monitoring Report (Pax & Service)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 5 }}>Group 1 (Fonnte JID)</label>
              <input value={cfg.monitoring_group_1 || ''} onChange={e => set('monitoring_group_1', e.target.value)}
                placeholder="e.g. 120363xxxxxx@g.us"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: T.card, color: T.text, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 5 }}>Group 2 (Fonnte JID)</label>
              <input value={cfg.monitoring_group_2 || ''} onChange={e => set('monitoring_group_2', e.target.value)}
                placeholder="e.g. 120363xxxxxx@g.us"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: T.card, color: T.text, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted }}>Template</label>
              {!cfg.tpl_monitoring_report && <button onClick={() => set('tpl_monitoring_report', DEFAULT_MONITORING_TEMPLATE)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Load Default</button>}
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 5 }}>Placeholders: {'{{branch}}'} {'{{date}}'} {'{{total_pax}}'} {'{{services_breakdown}}'}</div>
            <textarea value={cfg.tpl_monitoring_report || ''} onChange={e => set('tpl_monitoring_report', e.target.value)}
              rows={8} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: T.card, color: T.text, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
              placeholder={'Report Pax & Service {{branch}} {{date}}\n\nPax: {{total_pax}} pax\n{{services_breakdown}}'} />
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 10 }}>Send Report Now</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={sendBranch} onChange={e => setSendBranch(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: T.card, color: T.text, minWidth: 160 }}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={handleSendNow} disabled={sendBusy || !sendBranch}
              style={{ padding: '8px 18px', borderRadius: 8, background: sendBusy ? T.muted : '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: sendBusy ? 'not-allowed' : 'pointer' }}>
              {sendBusy ? 'Sending…' : 'Send Now'}
            </button>
            {sendMsg && <span style={{ fontSize: 13, color: sendMsg === 'Sent!' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{sendMsg}</span>}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Sends both closing and monitoring reports for the selected branch using today's data. Templates must be saved first.</div>
        </div>
      </div>

      {/* Test send */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle title="Test Send" sub="Sends a sample booking confirmation message to verify your credentials are working." />
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 480 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 5 }}>Send test to</label>
            <input type="tel" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+62812345678"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + T.border, fontSize: 13, color: T.text, boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleTestSend} disabled={!testPhone.trim() || testState === 'sending'}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', whiteSpace: 'nowrap', transition: 'background 0.2s', cursor: testPhone.trim() && testState !== 'sending' ? 'pointer' : 'not-allowed', background: testState === 'sending' ? T.surface2 : T.topBg, color: testState === 'sending' ? T.muted : T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13 }}>
            {testState === 'sending' ? 'Sending…' : 'Send Test'}
          </button>
        </div>
        {testState === 'ok'    && <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Sent — check your WhatsApp</div>}
        {testState === 'error' && <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>✕ Failed — check API key</div>}
      </div>

      <div style={{ paddingTop: 20, borderTop: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 12 }}>
        <SaveBtn saved={saved} busy={busy} onClick={handleSave} label="Save WhatsApp Settings" />
        <span style={{ fontSize: 12, color: T.muted }}>Takes effect immediately for the next outgoing message.</span>
      </div>
    </div>
  )
}

// ── Users tab (owner-only) ────────────────────────────────────────────────────
const SECTIONS = [
  { key: 'overview',       label: 'Overview'       },
  { key: 'reports',        label: 'Reports'        },
  { key: 'barbers',        label: 'Barbers'        },
  { key: 'services',       label: 'Services'       },
  { key: 'customers',      label: 'Customers'      },
  { key: 'expenses',       label: 'Expenses'       },
  { key: 'inventory',      label: 'Inventory'      },
  { key: 'payroll',        label: 'Payroll'        },
  { key: 'online_booking', label: 'Online Booking' },
  { key: 'kiosk_config',   label: 'Kiosk Config'   },
  { key: 'branches',       label: 'Branches'       },
  { key: 'settings',       label: 'Settings'       },
]

const ROLE_META = {
  owner:      { label: 'Owner',      color: '#111110', bg: '#F5E200' },
  manager:    { label: 'Manager',    color: '#2563EB', bg: '#EFF6FF' },
  accountant: { label: 'Accountant', color: '#16A34A', bg: '#F0FDF4' },
}

function UsersTab() {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [perms,      setPerms]      = useState({}) // { user_id: [{ section, can_view }] }
  const [showAdd,    setShowAdd]    = useState(false)
  const [newForm,    setNewForm]    = useState({ name: '', email: '', password: '', role: 'manager' })
  const [addBusy,    setAddBusy]    = useState(false)
  const [permSaved,  setPermSaved]  = useState(false)
  const [permBusy,   setPermBusy]   = useState(false)

  function loadUsers() {
    setLoading(true)
    api.get('/settings/users').then(d => {
      setUsers(Array.isArray(d) ? d : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { loadUsers() }, [])

  async function loadPerms(userId) {
    if (perms[userId]) return
    try {
      const rows = await api.get(`/settings/users/${userId}/permissions`)
      setPerms(p => ({ ...p, [userId]: Array.isArray(rows) ? rows : [] }))
    } catch { setPerms(p => ({ ...p, [userId]: [] })) }
  }

  function selectUser(userId) {
    if (selectedId === userId) { setSelectedId(null); return }
    setSelectedId(userId)
    loadPerms(userId)
  }

  function canView(userId, section) {
    const rows = perms[userId] || []
    const row = rows.find(r => r.section === section)
    return row ? row.is_enabled : true
  }

  function togglePerm(userId, section) {
    setPerms(p => {
      const rows = p[userId] || []
      const exists = rows.find(r => r.section === section)
      const updated = exists
        ? rows.map(r => r.section === section ? { ...r, is_enabled: !r.is_enabled } : r)
        : [...rows, { section, is_enabled: false }]
      return { ...p, [userId]: updated }
    })
  }

  async function handlePermSave() {
    if (!selectedId || permBusy) return
    setPermBusy(true)
    try {
      const permissions = SECTIONS.map(s => ({
        section: s.key,
        is_enabled: canView(selectedId, s.key),
      }))
      await api.put(`/settings/users/${selectedId}/permissions`, { permissions })
      setPermSaved(true); setTimeout(() => setPermSaved(false), 1800)
    } catch { /* ignore */ } finally { setPermBusy(false) }
  }

  async function handleAdd() {
    if (!newForm.name.trim() || !newForm.email.trim() || !newForm.password.trim() || addBusy) return
    setAddBusy(true)
    try {
      await api.post('/settings/users', newForm)
      setNewForm({ name: '', email: '', password: '', role: 'manager' })
      setShowAdd(false)
      loadUsers()
    } catch { /* ignore */ } finally { setAddBusy(false) }
  }

  async function toggleActive(user) {
    try {
      await api.patch(`/settings/users/${user.id}`, { is_active: !user.is_active })
      loadUsers()
    } catch { /* ignore */ }
  }

  const selectedUser = users.find(u => u.id === selectedId)

  const thStyle = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, padding: '8px 14px', borderBottom: '1px solid ' + T.surface }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 300px' : '1fr', gap: 20, alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>Admin Accounts</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Owner accounts always have full access regardless of permissions.</div>
          </div>
          <button onClick={() => { setShowAdd(v => !v); setSelectedId(null) }}
            style={{ padding: '7px 14px', borderRadius: 8, background: showAdd ? T.surface2 : T.topBg, color: showAdd ? T.text : T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
            {showAdd ? '✕ Cancel' : '+ New User'}
          </button>
        </div>

        {showAdd && (
          <div style={{ padding: '16px 18px', borderRadius: 10, background: T.bg, border: '1px solid ' + T.border, marginBottom: 16 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 12 }}>New Admin User</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {[
                { label: 'Full Name', key: 'name',     type: 'text',     placeholder: 'e.g. Wayan Sari'      },
                { label: 'Email',     key: 'email',    type: 'email',    placeholder: 'wayan@bercut.id'       },
                { label: 'Password',  key: 'password', type: 'password', placeholder: 'Temporary password'    },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type} value={newForm[f.key]} onChange={e => setNewForm(form => ({ ...form, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '8px 11px', borderRadius: 7, border: '1px solid ' + T.border, fontSize: 13, color: T.text, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginBottom: 4 }}>Role</label>
                <select value={newForm.role} onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))}
                  style={{ width: '100%', padding: '8px 11px', borderRadius: 7, border: '1px solid ' + T.border, fontSize: 13, color: T.text }}>
                  <option value="manager">Manager</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>New users get full access to all sections by default. Configure permissions after creation.</div>
            <button onClick={handleAdd} disabled={!newForm.name.trim() || !newForm.email.trim() || !newForm.password.trim() || addBusy}
              style={{ padding: '8px 20px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              {addBusy ? 'Creating…' : 'Create User'}
            </button>
          </div>
        )}

        <div className="admin-card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Role', 'Last Login', 'Status', ''].map((h, i) => (
                    <th key={i} style={{ ...thStyle, textAlign: i >= 3 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const rm = ROLE_META[user.role] || ROLE_META.manager
                  const isOwner    = user.role === 'owner'
                  const isSelected = selectedId === user.id
                  const tdS = { fontSize: 13, padding: '12px 14px', color: T.text, borderBottom: '1px solid ' + T.surface, verticalAlign: 'middle' }
                  return (
                    <tr key={user.id}
                      style={{ opacity: user.is_active ? 1 : 0.5, background: isSelected ? T.bg : 'transparent', transition: 'background 0.1s, opacity 0.15s', cursor: isOwner ? 'default' : 'pointer' }}
                      onClick={() => !isOwner && selectUser(user.id)}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bg }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                      <td style={tdS}>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{user.email}</div>
                      </td>
                      <td style={tdS}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: rm.bg, color: rm.color }}>{rm.label}</span>
                        {isOwner && <span style={{ marginLeft: 6, fontSize: 10, color: T.muted }}>Immutable</span>}
                      </td>
                      <td style={{ ...tdS, fontSize: 12, color: T.text2 }}>
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ ...tdS, textAlign: 'center' }}>
                        {isOwner
                          ? <span style={{ fontSize: 11, color: T.muted }}>—</span>
                          : <Toggle checked={!!user.is_active} onChange={() => toggleActive(user)} />
                        }
                      </td>
                      <td style={{ ...tdS, textAlign: 'right' }}>
                        {!isOwner && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? T.topBg : T.muted }}>
                            {isSelected ? 'Editing ▸' : 'Permissions'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedUser && (
        <div className="admin-card" style={{ padding: '18px 20px', position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: T.text }}>{selectedUser.name}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Section permissions</div>
            </div>
            <button onClick={() => setSelectedId(null)}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid ' + T.border, background: 'transparent', color: T.text2, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {SECTIONS.map(s => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid ' + T.surface }}>
              <span style={{ fontSize: 13, color: canView(selectedUser.id, s.key) ? T.text : T.muted }}>{s.label}</span>
              <Toggle checked={canView(selectedUser.id, s.key)} onChange={() => togglePerm(selectedUser.id, s.key)} />
            </div>
          ))}

          <button onClick={handlePermSave} disabled={permBusy}
            style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 8, background: permSaved ? '#16A34A' : T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
            {permSaved ? '✓ Saved' : permBusy ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Audit Log tab ─────────────────────────────────────────────────────────────
const ACTION_META = {
  created:    { color: '#16A34A', bg: '#F0FDF4', label: 'Created'    },
  updated:    { color: '#2563EB', bg: '#EFF6FF', label: 'Updated'    },
  deleted:    { color: '#DC2626', bg: '#FEF2F2', label: 'Deleted'    },
  activated:  { color: '#16A34A', bg: '#F0FDF4', label: 'Activated'  },
  deactivated:{ color: '#D97706', bg: '#FFFBEB', label: 'Deactivated'},
}

function AuditLogTab() {
  const [log,         setLog]         = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filterTable, setFilterTable] = useState('all')

  const load = (tableFilter) => {
    setLoading(true)
    const qs = tableFilter && tableFilter !== 'all' ? `?table_name=${tableFilter}&limit=100` : '?limit=100'
    api.get('/settings/audit-log' + qs).then(d => {
      setLog(Array.isArray(d) ? d : [])
    }).catch(() => { setLog([]) }).finally(() => setLoading(false))
  }

  useEffect(() => { load(filterTable) }, [filterTable])

  const uniqueTables = [...new Set(log.map(e => e.table_name).filter(Boolean))]

  const thStyle = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, padding: '8px 14px', borderBottom: '1px solid ' + T.surface, textAlign: 'left', whiteSpace: 'nowrap' }
  const tdStyle = { fontSize: 12, padding: '11px 14px', borderBottom: '1px solid ' + T.surface, verticalAlign: 'top' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>Activity History</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>All admin actions across all branches. Most recent first.</div>
        </div>
        <select value={filterTable} onChange={e => setFilterTable(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid ' + T.border, fontSize: 12, color: T.text }}>
          <option value="all">All tables</option>
          {uniqueTables.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="admin-card" style={{ overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>{['Timestamp', 'User', 'Table', 'Action', 'Old Value', 'New Value'].map((h, i) => (
                <th key={i} style={thStyle}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {log.length === 0 && (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: T.muted }}>No entries found.</td></tr>
              )}
              {log.map((entry, i) => (
                <tr key={entry.id || i}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ transition: 'background 0.1s' }}>
                  <td style={{ ...tdStyle, color: T.muted, whiteSpace: 'nowrap' }}>
                    {entry.created_at ? new Date(entry.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: T.text, fontWeight: 500, whiteSpace: 'nowrap' }}>{entry.user_name || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: T.surface, color: T.text2 }}>{entry.table_name || '—'}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB' }}>{entry.action || '—'}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11, color: T.muted, maxWidth: 200 }}>
                    <code style={{ fontFamily: 'monospace', fontSize: 10 }}>
                      {entry.old_values ? JSON.stringify(entry.old_values).slice(0, 80) : '—'}
                    </code>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11, color: T.text2, maxWidth: 200 }}>
                    <code style={{ fontFamily: 'monospace', fontSize: 10 }}>
                      {entry.new_values ? JSON.stringify(entry.new_values).slice(0, 80) : '—'}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: T.muted }}>Showing last 100 entries.</div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  const [tab,      setTab]      = useState('catalog')
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    api.get('/auth/me').then(d => { if (d?.role) setUserRole(d.role) }).catch(() => {})
  }, [])

  const isOwner = userRole === 'owner'

  const TABS = [
    { key: 'catalog',   label: 'Catalog',   ownerOnly: false },
    { key: 'loyalty',   label: 'Loyalty',   ownerOnly: false },
    { key: 'payroll',   label: 'Payroll',   ownerOnly: false },
    { key: 'whatsapp',  label: 'WhatsApp',  ownerOnly: false },
    { key: 'users',     label: 'Users',     ownerOnly: true  },
    { key: 'audit-log', label: 'Audit Log', ownerOnly: true  },
  ].filter(t => !t.ownerOnly || isOwner)

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Settings</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
          Global system configuration. Per-branch operational settings are in <strong style={{ color: T.text }}>Branches → Edit → Operations</strong>.
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid ' + T.border, marginBottom: 28, gap: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid ' + T.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: tab === t.key ? T.text : T.muted, cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.label}
            {t.ownerOnly && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#F5E200', color: '#111110', letterSpacing: '0.05em' }}>OWNER</span>}
          </button>
        ))}
      </div>

      {tab === 'catalog'   && <CatalogTab />}
      {tab === 'loyalty'   && <LoyaltyTab />}
      {tab === 'payroll'   && <PayrollTab />}
      {tab === 'whatsapp'  && <WhatsAppTab />}
      {tab === 'users'     && <UsersTab />}
      {tab === 'audit-log' && <AuditLogTab />}
    </div>
  )
}
