import { useState, useEffect } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { getToken } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const fmt  = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const fmtM = n => {
  const v = Number(n || 0)
  if (v >= 1_000_000) return 'Rp ' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt'
  if (v >= 1_000)     return 'Rp ' + (v / 1_000).toFixed(0) + 'rb'
  return 'Rp ' + v
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmtPeriodLabel(period) {
  if (!period) return ''
  const f = String(period.period_from).slice(0, 10)
  const t = String(period.period_to).slice(0, 10)
  const fd = new Date(f + 'T00:00:00')
  const td = new Date(t + 'T00:00:00')
  return `${fd.getDate()} ${MONTH_NAMES[fd.getMonth()].slice(0,3)} – ${td.getDate()} ${MONTH_NAMES[td.getMonth()].slice(0,3)} ${td.getFullYear()}`
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function initials(name) {
  return (name || '').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function computeWorkingDays(from, to) {
  if (!from || !to) return 26
  const f = String(from).slice(0, 10)
  const t = String(to).slice(0, 10)
  const d1 = new Date(f + 'T00:00:00')
  const d2 = new Date(t + 'T00:00:00')
  const totalDays = Math.round((d2 - d1) / 86400000) + 1
  return Math.round(totalDays * 6 / 7)
}

const LATE_RATE_PER_MIN = 2_000
const FLAT_OFF_RATE     = 150_000
const EXCUSED_OVER_RATE = 100_000

// ── InlineNum ─────────────────────────────────────────────────────────────────

function InlineNum({ value, onCommit, suffix = '', color }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')
  function start() { setDraft(String(value)); setEditing(true) }
  function commit() {
    const n = parseInt(draft, 10)
    onCommit(isNaN(n) || n < 0 ? 0 : n)
    setEditing(false)
  }
  if (editing) {
    return (
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        style={{ width: 52, padding: '2px 5px', borderRadius: 5, border: '1px solid ' + T.topBg, fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: T.text, textAlign: 'right' }} />
    )
  }
  const c = value > 0 ? (color || T.text) : T.border
  return (
    <span onClick={e => { e.stopPropagation(); start() }} title="Click to edit"
      style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: c, cursor: 'pointer' }}>
      {value > 0 ? value + suffix : '—'}
    </span>
  )
}

// ── WorkingDaysChip ───────────────────────────────────────────────────────────

function WorkingDaysChip({ value, computedValue, onOverride, onReset }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')
  const isOverridden = value !== computedValue

  function start() { setDraft(String(value)); setEditing(true) }
  function commit() {
    const n = parseInt(draft, 10)
    if (!isNaN(n) && n > 0) onOverride(n); else onReset()
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 8, background: T.surface, border: '1px solid ' + T.topBg }}>
        <span style={{ fontSize: 12, color: T.muted }}>Working days</span>
        <input autoFocus value={draft}
          onChange={e => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          style={{ width: 36, padding: '3px 6px', borderRadius: 6, border: '1px solid ' + T.topBg, fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: "'Inter', sans-serif" }} />
        <span style={{ fontSize: 11, color: T.muted }}>days</span>
      </div>
    )
  }

  return (
    <div onClick={start} title="Click to adjust working days for this period"
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 8, background: isOverridden ? '#FFFBEB' : T.surface, border: '1px solid ' + (isOverridden ? '#FDE68A' : T.border), cursor: 'pointer' }}>
      <span style={{ fontSize: 12, color: T.muted }}>Working days</span>
      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{value}</span>
      {isOverridden ? (
        <span onClick={e => { e.stopPropagation(); onReset() }}
          title={'Reset to computed ' + computedValue}
          style={{ fontSize: 10, color: '#D97706', cursor: 'pointer', marginLeft: 2 }}>↺ {computedValue}</span>
      ) : (
        <span style={{ fontSize: 10, color: T.border }}>✎</span>
      )}
    </div>
  )
}

// ── AdjRow ────────────────────────────────────────────────────────────────────

function AdjRow({ adj, onDelete, onToggleDefer, nextPeriodLabel }) {
  const isAdd      = adj.type === 'addition'
  const isDeferred = adj.is_kasbon && adj.deduct_period === 'next'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: isDeferred ? T.surface : T.white, border: '1px solid ' + T.border, marginBottom: 6, opacity: isDeferred ? 0.65 : 1 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDeferred ? T.surface2 : (isAdd ? '#F0FDF4' : '#FEF2F2'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: isDeferred ? T.muted : (isAdd ? '#16A34A' : '#DC2626') }}>{isAdd ? '+' : '−'}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isDeferred ? T.muted : T.text }}>{adj.category}</span>
          {adj.is_kasbon && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>KASBON</span>
          )}
          {isDeferred && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: T.surface2, color: T.muted }}>Deferred → {nextPeriodLabel}</span>
          )}
        </div>
        {adj.remarks && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{adj.remarks}</div>}
        {adj.date && (
          <div style={{ fontSize: 10, color: T.border, marginTop: 2 }}>{adj.date} · by {adj.logged_by || 'Admin'}</div>
        )}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: isDeferred ? T.muted : (isAdd ? '#16A34A' : '#DC2626'), flexShrink: 0, textDecoration: isDeferred ? 'line-through' : 'none' }}>
        {isAdd ? '+' : '−'}{fmtM(adj.amount)}
      </div>
      {adj.is_kasbon && onToggleDefer && (
        <button onClick={onToggleDefer}
          style={{ padding: '3px 9px', borderRadius: 5, border: '1px solid ' + T.border, background: isDeferred ? T.white : T.surface, color: isDeferred ? '#2563EB' : T.text2, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {isDeferred ? '← Restore' : 'Defer →'}
        </button>
      )}
      {!adj.is_kasbon && onDelete && (
        <button onClick={onDelete}
          style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: '#FEE2E2', color: T.danger, cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✕</button>
      )}
    </div>
  )
}

// ── ManageAdjModal ────────────────────────────────────────────────────────────

function ManageAdjModal({ entry, adjustments, onDelete, onToggleDefer, onClose, nextPeriodLabel }) {
  const additions  = adjustments.filter(a => a.type === 'addition')
  const deductions = adjustments.filter(a => a.type === 'deduction')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-card" style={{ width: 500, maxHeight: '78vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid ' + T.border, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: T.text }}>Adjustments — {entry.barber_name}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Current period</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {additions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#16A34A', marginBottom: 8 }}>Additions</div>
              {additions.map(adj => (
                <AdjRow key={adj.id} adj={adj} onDelete={() => onDelete(adj.id)} onToggleDefer={null} nextPeriodLabel={nextPeriodLabel} />
              ))}
            </div>
          )}
          {deductions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#DC2626', marginBottom: 8 }}>Deductions</div>
              {deductions.map(adj => (
                <AdjRow key={adj.id} adj={adj}
                  onDelete={adj.is_kasbon ? null : () => onDelete(adj.id)}
                  onToggleDefer={adj.is_kasbon ? () => onToggleDefer(adj.id) : null}
                  nextPeriodLabel={nextPeriodLabel}
                />
              ))}
            </div>
          )}
          {adjustments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontSize: 13 }}>No adjustments for this barber.</div>
          )}
          {deductions.some(a => a.is_kasbon && a.deduct_period === 'next') && (
            <div style={{ fontSize: 11, color: T.muted, padding: '8px 12px', borderRadius: 7, background: T.surface, marginTop: 4 }}>
              Deferred kasbon will appear as a deduction in next payroll period automatically.
            </div>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid ' + T.border, background: T.bg, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 8, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CreateAdjCatModal ─────────────────────────────────────────────────────────

function CreateAdjCatModal({ onConfirm, onClose }) {
  const [label, setLabel] = useState('')
  const LS = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }

  function handleConfirm() {
    if (!label.trim()) return
    const key = label.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now()
    onConfirm({ key, label: label.trim() })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 360, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>New Category</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ ...LS, color: T.muted }}>Category Name *</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Transport Reimbursement" autoFocus
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.topBg, fontSize: 13, color: T.text, background: T.white, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 8, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleConfirm} disabled={!label.trim()}
            style={{ flex: 2, padding: '10px', borderRadius: 8, background: label.trim() ? T.topBg : T.surface2, color: label.trim() ? T.white : T.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: label.trim() ? 'pointer' : 'not-allowed' }}>
            Create Category
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AddAdjModal ───────────────────────────────────────────────────────────────

const ADD_CATS_BASE = [
  { key: 'uang_rajin',      label: 'Uang Rajin'       },
  { key: 'transport',       label: 'Transport'         },
  { key: 'meal_allowance',  label: 'Meal Allowance'    },
  { key: 'performance',     label: 'Performance Bonus' },
  { key: 'other_addition',  label: 'Other'             },
]
const DED_CATS_BASE = [
  { key: 'late_arrival',    label: 'Late Arrival'      },
  { key: 'uniform',         label: 'Uniform Deduction' },
  { key: 'equipment',       label: 'Equipment Damage'  },
  { key: 'other_deduction', label: 'Other'             },
]

function AddAdjModal({ entry, onAdd, onClose }) {
  const [adjType,       setAdjType]       = useState('addition')
  const [category,      setCategory]      = useState('uang_rajin')
  const [remarks,       setRemarks]       = useState('')
  const [amount,        setAmount]        = useState('')
  const [errors,        setErrors]        = useState({})
  const [saving,        setSaving]        = useState(false)
  const [addCats,       setAddCats]       = useState(ADD_CATS_BASE)
  const [dedCats,       setDedCats]       = useState(DED_CATS_BASE)
  const [showCreateCat, setShowCreateCat] = useState(false)

  const cats = adjType === 'addition' ? addCats : dedCats

  function switchType(t) {
    setAdjType(t)
    setCategory(t === 'addition' ? 'uang_rajin' : 'late_arrival')
    setErrors({})
  }

  function handleCatChange(val) {
    if (val === '__create__') { setShowCreateCat(true); return }
    setCategory(val)
  }

  function handleCatCreated(newCat) {
    if (adjType === 'addition') setAddCats(c => [...c, newCat])
    else                        setDedCats(c => [...c, newCat])
    setCategory(newCat.key)
    setShowCreateCat(false)
  }

  async function handleAdd() {
    const e = {}
    if (!amount || parseInt(amount) <= 0) e.amount = true
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const catLabel = cats.find(c => c.key === category)?.label ?? category
      const adj = await api.post('/payroll/adjustments', {
        payroll_entry_id: entry.id,
        type:             adjType,
        category:         catLabel,
        remarks:          remarks.trim() || null,
        amount:           parseInt(amount),
        date:             todayISO(),
        is_kasbon:        false,
        deduct_period:    'current',
      })
      onAdd(adj)
      onClose()
    } catch {
      setErrors({ submit: true })
    }
    setSaving(false)
  }

  const LS = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }

  return (
    <>
      {showCreateCat && <CreateAdjCatModal onConfirm={handleCatCreated} onClose={() => setShowCreateCat(false)} />}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="admin-card" style={{ width: 460, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: T.text }}>Add Adjustment</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{entry.barber_name}</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 3, marginBottom: 18, background: T.surface, padding: 3, borderRadius: 9, width: 'fit-content' }}>
            {[{ key: 'addition', label: 'Addition' }, { key: 'deduction', label: 'Deduction' }].map(t => (
              <button key={t.key} onClick={() => switchType(t.key)}
                style={{ padding: '7px 20px', borderRadius: 7, border: 'none', background: adjType === t.key ? T.topBg : 'transparent', color: adjType === t.key ? T.white : T.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ ...LS, color: T.muted }}>Category *</label>
              <select value={category} onChange={e => handleCatChange(e.target.value)}
                style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white }}>
                {cats.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                <option disabled style={{ color: T.surface2 }}>──────────</option>
                <option value="__create__">＋ Create Category...</option>
              </select>
            </div>
            <div>
              <label style={{ ...LS, color: errors.amount ? T.danger : T.muted }}>Amount (IDR) *</label>
              <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: '1.5px solid ' + (errors.amount ? T.danger : T.border), background: T.white, overflow: 'hidden' }}>
                <span style={{ padding: '9px 11px', fontSize: 12, color: T.muted, borderRight: '1px solid ' + T.border }}>Rp</span>
                <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setErrors(v => ({ ...v, amount: false })) }} placeholder="200000" autoFocus
                  style={{ flex: 1, padding: '9px 11px', border: 'none', fontSize: 13, color: T.text, background: 'transparent' }} />
              </div>
            </div>
            <div>
              <label style={{ ...LS, color: T.muted }}>Remarks <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
              <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Perfect attendance this month"
                style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white, boxSizing: 'border-box' }} />
            </div>
            {errors.submit && <div style={{ fontSize: 12, color: T.danger }}>Failed to save. Please try again.</div>}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '11px', borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving}
              style={{ flex: 2, padding: '11px', borderRadius: 9, background: T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : `Add ${adjType === 'addition' ? 'Addition' : 'Deduction'}`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Regenerate confirmation dialog ────────────────────────────────────────────

function RegenConfirmModal({ periodLabel, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="admin-card" style={{ width: 460, padding: '28px 30px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 10 }}>
          Regenerate {periodLabel}?
        </div>
        <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to regenerate <strong>{periodLabel}</strong>?<br />
          This will recalculate all values from raw attendance and booking data.<br />
          Any manual edits to this period will be reset. Status will return to Draft.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{ padding: '9px 20px', borderRadius: 8, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ padding: '9px 20px', borderRadius: 8, background: T.danger, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Yes, Regenerate
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    communicated: { bg: '#DCFCE7', color: '#16A34A', label: 'Communicated' },
    reviewed:     { bg: '#DBEAFE', color: '#2563EB', label: 'Reviewed'     },
    draft:        { bg: '#FFFBEB', color: '#D97706', label: 'Draft'        },
  }
  const s = map[status] || map.draft
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Payroll({ period: periodProp, onBack, onViewAttendance, user }) {
  const backFn = onBack || onViewAttendance

  const [activePeriod,  setActivePeriod]  = useState(periodProp || null)
  const [entries,       setEntries]       = useState([])
  const [adjustments,   setAdjustments]   = useState({})
  const [loading,       setLoading]       = useState(false)
  const [regenerating,  setRegenerating]  = useState(false)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)

  const [workingDaysOverride, setWorkingDaysOverride] = useState(null)
  const computedWD = activePeriod
    ? computeWorkingDays(activePeriod.period_from, activePeriod.period_to)
    : 26
  const workingDays = workingDaysOverride ?? computedWD

  const [overrides,      setOverrides]      = useState({})
  const [showManage,     setShowManage]     = useState(false)
  const [showAdd,        setShowAdd]        = useState(false)
  const [modalEntry,     setModalEntry]     = useState(null)
  const [payrollSettings,setPayrollSettings]= useState({})

  // Sync if parent passes a different period (shouldn't normally change, but be safe)
  useEffect(() => {
    if (periodProp) setActivePeriod(periodProp)
  }, [periodProp])

  useEffect(() => {
    api.get('/settings/payroll').then(d => { if (d) setPayrollSettings(d) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activePeriod) return
    setLoading(true)
    api.get('/payroll/periods/' + activePeriod.id + '/entries')
      .then(async d => {
        setEntries(d || [])
        const adjMap = {}
        await Promise.all((d || []).map(async entry => {
          try {
            const adjs = await api.get('/payroll/adjustments?payroll_entry_id=' + entry.id)
            adjMap[entry.id] = adjs || []
          } catch { adjMap[entry.id] = [] }
        }))
        setAdjustments(adjMap)
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [activePeriod])

  const periodDays = activePeriod
    ? Math.round((new Date(activePeriod.period_to) - new Date(activePeriod.period_from)) / 86400000) + 1
    : 0
  const excusedQuota = Math.floor(periodDays / 7) * (payrollSettings.off_quota_per_week || 1)

  function setOverride(entryId, fieldOrObj, val) {
    if (typeof fieldOrObj === 'object') {
      setOverrides(prev => ({ ...prev, [entryId]: { ...prev[entryId], ...fieldOrObj } }))
    } else {
      setOverrides(prev => ({ ...prev, [entryId]: { ...prev[entryId], [fieldOrObj]: val } }))
    }
  }

  async function patchEntry(entry, field, val) {
    setOverride(entry.id, field, val)
    try { await api.patch('/payroll/entries/' + entry.id, { [field]: val }) } catch {}
  }

  function addAdjustmentLocal(entryId, adj) {
    setAdjustments(prev => ({ ...prev, [entryId]: [...(prev[entryId] || []), adj] }))
  }

  async function deleteAdjustment(entryId, adjId) {
    try { await api.delete('/payroll/adjustments/' + adjId) } catch {}
    setAdjustments(prev => ({ ...prev, [entryId]: (prev[entryId] || []).filter(a => a.id !== adjId) }))
  }

  async function toggleKasbonDefer(entryId, adjId) {
    setAdjustments(prev => ({
      ...prev,
      [entryId]: (prev[entryId] || []).map(a =>
        a.id === adjId ? { ...a, deduct_period: a.deduct_period === 'current' ? 'next' : 'current' } : a
      ),
    }))
    const adj = (adjustments[entryId] || []).find(a => a.id === adjId)
    if (adj) {
      try { await api.patch('/payroll/adjustments/' + adjId, { deduct_period: adj.deduct_period === 'current' ? 'next' : 'current' }) } catch {}
    }
  }

  function calcNetPay(entry) {
    const ov             = overrides[entry.id] || {}
    const lateMin        = ov.lateMin        ?? Number(entry.total_late_minutes || 0)
    const inexcusedTimes = ov.inexcusedTimes ?? Number(entry.inexcused_fixed_days || 0)
    const excusedTimes   = ov.excusedTimes   ?? Number(entry.excused_fixed_days  || 0)
    const excusedOver    = Math.max(0, excusedTimes - excusedQuota)
    const inexcusedFixed   = ov.inexcusedFixed   ?? inexcusedTimes
    const inexcusedProrata = ov.inexcusedProrata ?? 0
    const excusedFixed     = ov.excusedFixed     ?? excusedOver
    const excusedProrata   = ov.excusedProrata   ?? 0
    const prorataRate      = Math.round(Number(entry.base_salary || 0) / workingDays)
    const hasLateOv      = ov.lateMin !== undefined
    const hasExcOv       = ov.excusedTimes !== undefined || ov.excusedFixed !== undefined || ov.excusedProrata !== undefined
    const hasInexOv      = ov.inexcusedTimes !== undefined || ov.inexcusedFixed !== undefined || ov.inexcusedProrata !== undefined
    const lateDed        = hasLateOv ? lateMin * LATE_RATE_PER_MIN           : Number(entry.late_deduction          || 0)
    const inexcusedDed   = hasInexOv ? inexcusedFixed * FLAT_OFF_RATE     + Math.round(inexcusedProrata * prorataRate) : Number(entry.inexcused_off_deduction || 0)
    const excusedDed     = hasExcOv  ? excusedFixed   * EXCUSED_OVER_RATE + Math.round(excusedProrata   * prorataRate) : Number(entry.excused_off_deduction   || 0)
    const adjs     = adjustments[entry.id] || []
    const totalAdd = adjs.filter(a => a.type === 'addition').reduce((s, a) => s + Number(a.amount), 0)
    const totalDed = adjs.filter(a => a.type === 'deduction' && !(a.is_kasbon && a.deduct_period === 'next')).reduce((s, a) => s + Number(a.amount), 0)
    return Number(entry.base_salary || 0) + Number(entry.commission_regular || 0) + Number(entry.commission_ot || 0)
         - lateDed - inexcusedDed - excusedDed + totalAdd - totalDed
  }

  async function handleExport() {
    if (!activePeriod) return
    const token = getToken()
    const BASE = import.meta.env.VITE_API_URL ?? '/api'
    const label = fmtPeriodLabel(activePeriod).replace(/\s+/g, '_')
    try {
      const res = await fetch(`${BASE}/payroll/periods/${activePeriod.id}/export`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll_${label}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error', err)
    }
  }

  async function handleRegenerate() {
    if (!activePeriod) return
    setShowRegenConfirm(false)
    setRegenerating(true)
    try {
      const result = await api.post('/payroll/periods/generate', {
        branch_id:    String(activePeriod.branch_id),
        period_month: String(activePeriod.period_from).slice(0, 7),
        period_from:  String(activePeriod.period_from).slice(0, 10),
        period_to:    String(activePeriod.period_to).slice(0, 10),
      })
      setActivePeriod(result.period)
      setOverrides({})
      setWorkingDaysOverride(null)
    } catch (err) {
      console.error('Regenerate failed', err)
    } finally {
      setRegenerating(false)
    }
  }

  const totalNet   = entries.reduce((s, e) => s + calcNetPay(e), 0)
  const nextPLabel = 'next period'
  const periodLabel = fmtPeriodLabel(activePeriod)

  const PGRID = '1.4fr 0.8fr 0.9fr 0.75fr 0.9fr 1.15fr 1.15fr 0.85fr 0.9fr 0.85fr 0.65fr 0.7fr'

  return (
    <div style={{ padding: '28px 32px' }}>

      {showRegenConfirm && (
        <RegenConfirmModal
          periodLabel={periodLabel}
          onConfirm={handleRegenerate}
          onCancel={() => setShowRegenConfirm(false)}
        />
      )}

      {showManage && modalEntry && (
        <ManageAdjModal
          entry={modalEntry}
          adjustments={adjustments[modalEntry.id] || []}
          onDelete={id    => deleteAdjustment(modalEntry.id, id)}
          onToggleDefer={id => toggleKasbonDefer(modalEntry.id, id)}
          onClose={() => { setShowManage(false); setModalEntry(null) }}
          nextPeriodLabel={nextPLabel}
        />
      )}
      {showAdd && modalEntry && (
        <AddAdjModal
          entry={modalEntry}
          onAdd={adj => addAdjustmentLocal(modalEntry.id, adj)}
          onClose={() => { setShowAdd(false); setModalEntry(null) }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {backFn && (
            <button onClick={backFn}
              style={{ padding: '9px 14px', borderRadius: 8, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: '1px solid ' + T.border, cursor: 'pointer', marginTop: 4, flexShrink: 0 }}>
              ← Back
            </button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>
                {periodLabel || 'Payroll'}
              </div>
              {activePeriod && <StatusBadge status={activePeriod.status || 'draft'} />}
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
              Period payroll — base salary + commission + deductions
            </div>
            {activePeriod?.generated_at && (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                Generated: {fmtDateTime(activePeriod.generated_at)}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowRegenConfirm(true)}
            disabled={regenerating}
            style={{ padding: '9px 14px', borderRadius: 8, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: '1px solid ' + T.border, cursor: regenerating ? 'not-allowed' : 'pointer', opacity: regenerating ? 0.65 : 1 }}>
            {regenerating ? 'Regenerating…' : 'Regenerate ↺'}
          </button>
          <button onClick={handleExport}
            style={{ padding: '9px 16px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            ↓ Export
          </button>
        </div>
      </div>

      {/* Working days chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {activePeriod && (
          <WorkingDaysChip
            value={workingDays}
            computedValue={computedWD}
            onOverride={n => setWorkingDaysOverride(n)}
            onReset={() => setWorkingDaysOverride(null)}
          />
        )}
      </div>

      {/* Table */}
      <div className="admin-card" style={{ overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: PGRID, padding: '10px 18px', borderBottom: '1px solid ' + T.border, minWidth: 1150 }}>
          {[
            { label: 'Barber' },
            { label: 'Base Salary' },
            { label: 'Commission',    sub: 'regular' },
            { label: 'OT Comm.',      sub: 'overtime' },
            { label: 'Late',          sub: 'min · deduction' },
            { label: 'Excused Off',   sub: 'flat / pro-rata split' },
            { label: 'Inexcused Off', sub: 'flat / pro-rata split' },
            { label: 'Kasbon',        sub: 'this period' },
            { label: 'Additions' },
            { label: 'Other Ded.' },
            { label: 'Net Pay' },
            { label: '' },
          ].map((h, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted }}>{h.label}</div>
              {h.sub && <div style={{ fontSize: 9, color: T.border, marginTop: 1 }}>{h.sub}</div>}
            </div>
          ))}
        </div>

        {(loading || regenerating) && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
            {regenerating ? 'Recalculating payroll…' : 'Loading payroll data…'}
          </div>
        )}
        {!loading && !regenerating && entries.length === 0 && activePeriod && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>No entries for this period.</div>
        )}
        {!loading && !regenerating && !activePeriod && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>No period loaded.</div>
        )}

        {entries.map((entry, i) => {
          const ov             = overrides[entry.id] || {}
          const lateMin        = ov.lateMin        ?? Number(entry.total_late_minutes   || 0)
          const excusedTimes   = ov.excusedTimes   ?? Number(entry.excused_fixed_days   || 0)
          const inexcusedTimes = ov.inexcusedTimes ?? Number(entry.inexcused_fixed_days || 0)
          const excusedOver    = Math.max(0, excusedTimes - excusedQuota)
          const excusedFixed     = ov.excusedFixed     ?? excusedOver
          const excusedProrata   = ov.excusedProrata   ?? 0
          const inexcusedFixed   = ov.inexcusedFixed   ?? inexcusedTimes
          const inexcusedProrata = ov.inexcusedProrata ?? 0
          const prorataRate      = Math.round(Number(entry.base_salary || 0) / workingDays)
          const hasLateOv  = ov.lateMin !== undefined
          const hasExcOv   = ov.excusedTimes !== undefined || ov.excusedFixed !== undefined || ov.excusedProrata !== undefined
          const hasInexOv  = ov.inexcusedTimes !== undefined || ov.inexcusedFixed !== undefined || ov.inexcusedProrata !== undefined
          const lateDed    = hasLateOv ? lateMin * LATE_RATE_PER_MIN           : Number(entry.late_deduction          || 0)
          const excusedDed = hasExcOv  ? excusedFixed   * EXCUSED_OVER_RATE + Math.round(excusedProrata   * prorataRate) : Number(entry.excused_off_deduction   || 0)
          const inexcusedDed = hasInexOv ? inexcusedFixed * FLAT_OFF_RATE   + Math.round(inexcusedProrata * prorataRate) : Number(entry.inexcused_off_deduction || 0)
          const adjs             = adjustments[entry.id] || []
          const kasbonAdjs       = adjs.filter(a => a.is_kasbon && a.type === 'deduction' && a.deduct_period === 'current')
          const kasbonDeferred   = adjs.filter(a => a.is_kasbon && a.deduct_period === 'next')
          const kasbonTotal      = kasbonAdjs.reduce((s, a) => s + Number(a.amount), 0)
          const totalAdd         = adjs.filter(a => a.type === 'addition').reduce((s, a) => s + Number(a.amount), 0)
          const otherDed         = adjs.filter(a => a.type === 'deduction' && !a.is_kasbon && a.deduct_period === 'current').reduce((s, a) => s + Number(a.amount), 0)
          const net              = calcNetPay(entry)
          const ini              = initials(entry.barber_name)

          return (
            <div key={entry.id}
              style={{ display: 'grid', gridTemplateColumns: PGRID, padding: '13px 18px', borderBottom: i < entries.length - 1 ? '1px solid ' + T.surface : 'none', alignItems: 'start', minWidth: 1150 }}>

              {/* Barber */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: T.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 10, color: T.accent }}>{ini}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{entry.barber_name}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{Number(entry.present_days || entry.working_days || 0)} days present</div>
                </div>
              </div>

              {/* Base salary */}
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, color: T.text2, paddingTop: 3 }}>{fmtM(entry.base_salary)}</div>

              {/* Commission regular */}
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#16A34A' }}>{fmtM(entry.commission_regular)}</div>
              </div>

              {/* OT Commission */}
              <div style={{ paddingTop: 2 }}>
                {Number(entry.commission_ot) > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#D97706' }}>+{fmtM(entry.commission_ot)}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>OT</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: T.border }}>—</span>
                )}
              </div>

              {/* Late */}
              <div>
                <div style={{ marginBottom: 4 }}>
                  <InlineNum value={lateMin} onCommit={v => { setOverride(entry.id, 'lateMin', v); api.patch('/payroll/entries/' + entry.id, { late_deduction: v * LATE_RATE_PER_MIN }).catch(() => {}) }} suffix=" min" color="#D97706" />
                </div>
                {lateDed > 0
                  ? <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#DC2626' }}>−{fmtM(lateDed)}</div>
                  : <span style={{ fontSize: 11, color: T.border }}>—</span>
                }
                {lateMin > 0 && <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>Rp 2.000/min</div>}
              </div>

              {/* Excused Off */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 5 }}>
                  <InlineNum value={excusedTimes}
                    onCommit={v => {
                      const newFixed = Math.max(0, v - excusedQuota)
                      const newDed = newFixed * EXCUSED_OVER_RATE
                      setOverride(entry.id, { excusedTimes: v, excusedFixed: newFixed, excusedProrata: 0 })
                      api.patch('/payroll/entries/' + entry.id, { excused_off_deduction: newDed }).catch(() => {})
                    }}
                    suffix="×" color="#2563EB" />
                  <span style={{ fontSize: 9, color: T.muted }}>
                    {excusedOver > 0 ? `${excusedOver} charged` : 'within quota'}
                  </span>
                </div>
                {hasExcOv && (excusedFixed > 0 || excusedProrata > 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <InlineNum value={excusedFixed} onCommit={v => {
                        const newDed = v * EXCUSED_OVER_RATE + Math.round((ov.excusedProrata ?? 0) * prorataRate)
                        setOverride(entry.id, 'excusedFixed', v)
                        api.patch('/payroll/entries/' + entry.id, { excused_off_deduction: newDed }).catch(() => {})
                      }} suffix="× flat" color="#DC2626" />
                      {excusedFixed > 0 && <span style={{ fontSize: 10, color: '#DC2626' }}>−{fmtM(excusedFixed * EXCUSED_OVER_RATE)}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <InlineNum value={excusedProrata} onCommit={v => {
                        const newDed = (ov.excusedFixed ?? excusedOver) * EXCUSED_OVER_RATE + Math.round(v * prorataRate)
                        setOverride(entry.id, 'excusedProrata', v)
                        api.patch('/payroll/entries/' + entry.id, { excused_off_deduction: newDed }).catch(() => {})
                      }} suffix="× ÷" color="#DC2626" />
                      <span style={{ fontSize: 9, color: T.muted }}>{workingDays}d</span>
                      {excusedProrata > 0 && <span style={{ fontSize: 10, color: '#DC2626' }}>−{fmtM(Math.round(excusedProrata * prorataRate))}</span>}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', borderTop: '1px solid #FEE2E2', paddingTop: 3 }}>−{fmtM(excusedDed)}</div>
                  </div>
                ) : excusedDed > 0 ? (
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>−{fmtM(excusedDed)}</div>
                ) : (
                  <span style={{ fontSize: 11, color: T.border }}>—</span>
                )}
              </div>

              {/* Inexcused Off */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 5 }}>
                  <InlineNum value={inexcusedTimes}
                    onCommit={v => {
                      const newDed = v * FLAT_OFF_RATE
                      setOverride(entry.id, { inexcusedTimes: v, inexcusedFixed: v, inexcusedProrata: 0 })
                      api.patch('/payroll/entries/' + entry.id, { inexcused_off_deduction: newDed }).catch(() => {})
                    }}
                    suffix="×" color="#DC2626" />
                  {inexcusedTimes > 0 && <span style={{ fontSize: 9, color: T.muted }}>all charged</span>}
                </div>
                {hasInexOv && (inexcusedFixed > 0 || inexcusedProrata > 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <InlineNum value={inexcusedFixed} onCommit={v => {
                        const newDed = v * FLAT_OFF_RATE + Math.round((ov.inexcusedProrata ?? 0) * prorataRate)
                        setOverride(entry.id, 'inexcusedFixed', v)
                        api.patch('/payroll/entries/' + entry.id, { inexcused_off_deduction: newDed }).catch(() => {})
                      }} suffix="× flat" color="#DC2626" />
                      {inexcusedFixed > 0 && <span style={{ fontSize: 10, color: '#DC2626' }}>−{fmtM(inexcusedFixed * FLAT_OFF_RATE)}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <InlineNum value={inexcusedProrata} onCommit={v => {
                        const newDed = (ov.inexcusedFixed ?? inexcusedTimes) * FLAT_OFF_RATE + Math.round(v * prorataRate)
                        setOverride(entry.id, 'inexcusedProrata', v)
                        api.patch('/payroll/entries/' + entry.id, { inexcused_off_deduction: newDed }).catch(() => {})
                      }} suffix="× ÷" color="#DC2626" />
                      <span style={{ fontSize: 9, color: T.muted }}>{workingDays}d</span>
                      {inexcusedProrata > 0 && <span style={{ fontSize: 10, color: '#DC2626' }}>−{fmtM(Math.round(inexcusedProrata * prorataRate))}</span>}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', borderTop: '1px solid #FEE2E2', paddingTop: 3 }}>−{fmtM(inexcusedDed)}</div>
                  </div>
                ) : inexcusedDed > 0 ? (
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>−{fmtM(inexcusedDed)}</div>
                ) : (
                  <span style={{ fontSize: 11, color: T.border }}>—</span>
                )}
              </div>

              {/* Kasbon */}
              <div style={{ paddingTop: 2 }}>
                {kasbonTotal > 0 ? (
                  <>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#D97706' }}>−{fmtM(kasbonTotal)}</div>
                    <div style={{ fontSize: 9, color: '#D97706', marginTop: 2 }}>{kasbonAdjs.length} entry</div>
                  </>
                ) : <span style={{ fontSize: 11, color: T.border }}>—</span>}
                {kasbonDeferred.length > 0 && (
                  <div style={{ fontSize: 9, color: T.muted, marginTop: 3 }}>
                    {fmtM(kasbonDeferred.reduce((s, a) => s + Number(a.amount), 0))} deferred
                  </div>
                )}
              </div>

              {/* Additions */}
              <div style={{ paddingTop: 2 }}>
                {totalAdd > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#16A34A' }}>+{fmtM(totalAdd)}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: '#F0FDF4', color: '#16A34A' }}>{adjs.filter(a => a.type === 'addition').length}</span>
                  </div>
                ) : <span style={{ fontSize: 11, color: T.border }}>—</span>}
              </div>

              {/* Other deductions */}
              <div style={{ paddingTop: 2 }}>
                {otherDed > 0
                  ? <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#DC2626' }}>−{fmtM(otherDed)}</span>
                  : <span style={{ fontSize: 11, color: T.border }}>—</span>}
              </div>

              {/* Net pay */}
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 13, color: T.text, paddingTop: 3 }}>{fmtM(net)}</div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 2 }}>
                <button onClick={e => { e.stopPropagation(); setModalEntry(entry); setShowAdd(true) }}
                  style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid ' + T.border, background: T.white, fontSize: 11, fontWeight: 700, color: T.text2, cursor: 'pointer' }}>
                  + Add
                </button>
                {adjs.length > 0 && (
                  <button onClick={e => { e.stopPropagation(); setModalEntry(entry); setShowManage(true) }}
                    style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid ' + T.border, background: T.surface, fontSize: 11, fontWeight: 600, color: T.text2, cursor: 'pointer' }}>
                    Manage
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Totals row */}
        {entries.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: PGRID, padding: '13px 18px', background: T.topBg, borderRadius: '0 0 11px 11px', minWidth: 1150 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.white }}>Total Payout</div>
            <div />
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: T.accent }}>
              {fmtM(entries.reduce((s, e) => s + Number(e.commission_regular || 0), 0))}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#FDE68A' }}>
              {entries.some(e => Number(e.commission_ot) > 0)
                ? '+' + fmtM(entries.reduce((s, e) => s + Number(e.commission_ot || 0), 0))
                : '—'}
            </div>
            <div /><div /><div />
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#FDE68A' }}>
              {fmtM(entries.reduce((s, e) => s + (adjustments[e.id] || []).filter(a => a.is_kasbon && a.deduct_period === 'current').reduce((x, a) => x + Number(a.amount), 0), 0))}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: T.accent }}>
              {fmtM(entries.reduce((s, e) => s + (adjustments[e.id] || []).filter(a => a.type === 'addition').reduce((x, a) => x + Number(a.amount), 0), 0))}
            </div>
            <div />
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 14, color: T.accent }}>{fmtM(totalNet)}</div>
            <div />
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: T.muted }}>
        Use + Add to add adjustments. Kasbon deferral moves deduction to the next payroll period.
      </div>
    </div>
  )
}
