import { useState, useEffect, useRef } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const fmt  = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const fmtM = n => {
  const v = Number(n || 0)
  if (v >= 1_000_000) return 'Rp ' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt'
  if (v >= 1_000)     return 'Rp ' + (v / 1_000).toFixed(0) + 'rb'
  return 'Rp ' + v
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LS = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }

const COLOR_PRESETS = ['#7C3AED','#2563EB','#D97706','#DC2626','#16A34A','#0891B2','#9333EA','#6B7280']

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtDate(s) {
  if (!s) return '—'
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return s
  return `${MONTH_NAMES[parseInt(m[2])-1]} ${parseInt(m[3])} ${m[1]}`
}

// Largest Remainder Method distribution
function computeSmartDist(totalAmount, lines) {
  const valid = lines.map((l, i) => ({ i, qty: Number(l.qty) || 0 })).filter(l => l.qty > 0 && lines[l.i].branch_id)
  const totalQty = valid.reduce((s, l) => s + l.qty, 0)
  if (!totalAmount || totalQty === 0) return lines.map(() => null)
  const exact   = valid.map(l => totalAmount * l.qty / totalQty)
  const floored = exact.map(v => Math.floor(v))
  const fracs   = exact.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac)
  const remainder = totalAmount - floored.reduce((s, v) => s + v, 0)
  const costs = [...floored]
  for (let k = 0; k < remainder; k++) costs[fracs[k].i]++
  let vIdx = 0
  return lines.map(l => (l.branch_id && (Number(l.qty) || 0) > 0) ? costs[vIdx++] : null)
}

// ── Category Modal ────────────────────────────────────────────────────────────

function CategoryModal({ onConfirm, onClose }) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#2563EB')
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    if (!label.trim()) return
    setSaving(true)
    try {
      const cat = await api.post('/expense-categories', { label: label.trim() })
      onConfirm(cat)
    } catch { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 380, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: T.text }}>New Expense Category</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ ...LS, color: T.muted }}>Category Label *</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Marketing, Rent…" autoFocus
            style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ ...LS, color: T.muted }}>Colour</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {COLOR_PRESETS.map(clr => (
              <div key={clr} onClick={() => setColor(clr)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: clr, cursor: 'pointer', outline: color === clr ? '3px solid ' + T.topBg : '2px solid transparent', outlineOffset: 2 }} />
            ))}
          </div>
          {label.trim() && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, background: color + '22', color }}>{label.trim()} — preview</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 8, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleConfirm} disabled={!label.trim() || saving}
            style={{ flex: 2, padding: '10px', borderRadius: 8, background: label.trim() ? T.topBg : T.surface2, color: label.trim() ? T.white : T.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: label.trim() ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Creating…' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DateFilter ────────────────────────────────────────────────────────────────

function DateFilter({ from, to, onChange }) {
  const now = new Date()
  const [mode, setMode] = useState('month')
  const [my,   setMy]   = useState({ year: now.getFullYear(), month: now.getMonth() })

  function monthRange(year, month) {
    const f    = `${year}-${String(month+1).padStart(2,'0')}-01`
    const last = new Date(year, month+1, 0).getDate()
    const t    = `${year}-${String(month+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`
    return [f, t]
  }
  function gotoMonth(y, m) {
    setMy({ year: y, month: m })
    const [f, t] = monthRange(y, m)
    onChange(f, t)
  }
  function prevMonth() {
    const m = my.month === 0 ? 11 : my.month - 1
    const y = my.month === 0 ? my.year - 1 : my.year
    gotoMonth(y, m)
  }
  function nextMonth() {
    const m = my.month === 11 ? 0  : my.month + 1
    const y = my.month === 11 ? my.year + 1 : my.year
    gotoMonth(y, m)
  }

  const btnSt = active => ({
    padding: '4px 12px', borderRadius: 5, border: 'none',
    background: active ? T.topBg : 'transparent',
    color: active ? T.white : T.muted,
    fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 2, background: T.surface, padding: 2, borderRadius: 7 }}>
        <button style={btnSt(mode === 'month')} onClick={() => { setMode('month'); const [f, t] = monthRange(my.year, my.month); onChange(f, t) }}>Month</button>
        <button style={btnSt(mode === 'all')}   onClick={() => { setMode('all');   onChange(null, null) }}>All</button>
      </div>
      {mode === 'month' && (
        <div style={{ display: 'flex', alignItems: 'center', background: T.white, border: '1px solid ' + T.border, borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={prevMonth} style={{ padding: '6px 11px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: T.text2, borderRight: '1px solid ' + T.border }}>‹</button>
          <span style={{ padding: '6px 14px', fontSize: 13, fontWeight: 600, color: T.text, minWidth: 118, textAlign: 'center', userSelect: 'none' }}>
            {MONTH_NAMES[my.month]} {my.year}
          </span>
          <button onClick={nextMonth} style={{ padding: '6px 11px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: T.text2, borderLeft: '1px solid ' + T.border }}>›</button>
        </div>
      )}
    </div>
  )
}

// ── DistLine ──────────────────────────────────────────────────────────────────

function DistLine({ line, idx, branches, onUpdate, onRemove, lineCost }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 1.2fr auto', gap: 8, alignItems: 'center', background: T.bg, borderRadius: 8, padding: '8px 10px', border: '1px solid ' + T.border }}>
      <select value={line.branch_id} onChange={e => onUpdate(idx, 'branch_id', e.target.value)}
        style={{ padding: '7px 9px', borderRadius: 7, border: '1px solid ' + T.border, background: T.white, fontSize: 12, color: line.branch_id ? T.text : T.muted }}>
        <option value=''>— Branch / Destination —</option>
        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <input type="number" value={line.qty} onChange={e => onUpdate(idx, 'qty', e.target.value)} placeholder="Qty"
        style={{ padding: '7px 9px', borderRadius: 7, border: '1px solid ' + T.border, fontSize: 12, color: T.text, background: T.white }} />
      <div style={{ fontSize: 12, color: lineCost ? T.text2 : T.muted, fontWeight: lineCost ? 600 : 400, fontFamily: "'Inter', sans-serif" }}>
        {lineCost ? fmt(lineCost) : '—'}
      </div>
      <button onClick={() => onRemove(idx)}
        style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#FEE2E2', color: T.danger, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✕</button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Expenses() {
  const [branches,     setBranches]     = useState([])
  const [categories,   setCategories]   = useState([])
  const [items,        setItems]        = useState([])
  const [barbers,      setBarbers]      = useState([])
  const [expenses,     setExpenses]     = useState([])
  const [loading,      setLoading]      = useState(false)

  const [showForm,     setShowForm]     = useState(false)
  const [showCreateCat,setShowCreateCat]= useState(false)
  const [filterBranch, setFilterBranch] = useState('')
  const [filterType,   setFilterType]   = useState('all')

  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const [filterFrom, setFilterFrom] = useState(`${now.getFullYear()}-${pad(now.getMonth()+1)}-01`)
  const [filterTo,   setFilterTo]   = useState(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()}`)

  // Form state
  const [expType,       setExpType]       = useState('regular')
  const [fBranchId,     setFBranchId]     = useState('')
  const [fCatId,        setFCatId]        = useState('')
  const [fSource,       setFSource]       = useState('petty_cash')
  const [fAmount,       setFAmount]       = useState('')
  const [fDesc,         setFDesc]         = useState('')
  const [fDate,         setFDate]         = useState(todayISO)
  const [fBarberId,     setFBarberId]     = useState('')
  const [fDeductPeriod, setFDeductPeriod] = useState('current')
  const [stockItemId,   setStockItemId]   = useState('')
  const [distLines,     setDistLines]     = useState([{ branch_id: '', qty: '' }])
  const [errors,        setErrors]        = useState({})
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    api.get('/branches').then(d => {
      setBranches(d || [])
      if (d?.[0]) setFBranchId(String(d[0].id))
    }).catch(() => {})
    api.get('/expense-categories').then(d => {
      setCategories(d || [])
      if (d?.[0]) setFCatId(String(d[0].id))
    }).catch(() => {})
    api.get('/inventory/items').then(d => setItems(d || [])).catch(() => {})
    api.get('/barbers?all=1').then(d => setBarbers(d || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (filterBranch)       qs.set('branch_id', filterBranch)
    if (filterType !== 'all') qs.set('type', filterType)
    if (filterFrom)         qs.set('date_from', filterFrom)
    if (filterTo)           qs.set('date_to', filterTo)
    api.get('/expenses?' + qs.toString())
      .then(d => setExpenses(d || []))
      .catch(() => setExpenses([]))
      .finally(() => setLoading(false))
  }, [filterBranch, filterType, filterFrom, filterTo])

  function switchType(t) {
    setExpType(t)
    setFAmount(''); setFDesc(''); setErrors({})
    setFBarberId(''); setFDeductPeriod('current')
    setStockItemId(''); setDistLines([{ branch_id: '', qty: '' }])
  }

  function updateDistLine(idx, field, val) {
    setDistLines(lines => lines.map((l, i) => i === idx ? { ...l, [field]: val } : l))
  }
  function addDistLine()       { setDistLines(l => [...l, { branch_id: '', qty: '' }]) }
  function removeDistLine(idx) { setDistLines(l => l.filter((_, i) => i !== idx)) }

  const selectedItem  = items.find(i => String(i.id) === stockItemId) ?? null
  const totalQty      = distLines.reduce((s, l) => s + (Number(l.qty) || 0), 0)
  const amt           = parseInt(fAmount) || 0
  const smartCosts    = computeSmartDist(amt, distLines)
  const unitCostApprox= amt > 0 && totalQty > 0 ? Math.round(amt / totalQty) : 0
  const isExactUnit   = amt > 0 && totalQty > 0 && amt % totalQty === 0

  function validate() {
    const e = {}
    if (!fAmount || parseInt(fAmount) <= 0) e.amount = true
    if (expType === 'kasbon') {
      if (!fBarberId) e.barber = true
    } else {
      if (!fDesc.trim()) e.desc = true
      if (expType === 'inventory') {
        if (!stockItemId) e.stockItem = true
        if (!distLines.some(l => l.branch_id && Number(l.qty) > 0)) e.dist = true
      } else {
        if (!fBranchId) e.branch = true
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        type:         expType,
        amount:       parseInt(fAmount),
        expense_date: fDate,
        description:  fDesc.trim() || null,
      }
      if (expType === 'regular') {
        payload.branch_id   = parseInt(fBranchId)
        payload.category_id = fCatId ? parseInt(fCatId) : null
        payload.notes       = fSource
      } else if (expType === 'inventory') {
        payload.stock_items = distLines
          .filter(l => l.branch_id && Number(l.qty) > 0)
          .map((l, i) => ({ item_id: parseInt(stockItemId), branch_id: parseInt(l.branch_id), qty: Number(l.qty), cost: smartCosts[i] ?? 0 }))
      } else if (expType === 'kasbon') {
        payload.branch_id    = barbers.find(b => String(b.id) === String(fBarberId))?.branch_id
        payload.barber_id    = parseInt(fBarberId)
        payload.deduct_period= fDeductPeriod
        payload.description  = fDesc.trim() || 'Salary advance'
      }
      const newExp = await api.post('/expenses', payload)
      setExpenses(prev => [newExp, ...prev])
      switchType(expType)
      setSaved(true)
      setTimeout(() => { setSaved(false); setShowForm(false) }, 1500)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  const totalExpenses = expenses.reduce((a, e) => a + Number(e.amount || 0), 0)

  const TYPE_BADGE = {
    regular:   { label: 'Regular',   color: '#2563EB', bg: '#EFF6FF' },
    inventory: { label: 'Inventory', color: '#9333EA', bg: '#F3E8FF' },
    kasbon:    { label: 'Kasbon',    color: '#D97706', bg: '#FFFBEB' },
  }

  const selectStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.border, background: T.white, fontSize: 13, color: T.text }
  const inputStyle  = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.border, background: T.white, fontSize: 13, color: T.text, boxSizing: 'border-box' }

  return (
    <div style={{ padding: '28px 32px' }}>
      {showCreateCat && (
        <CategoryModal
          onConfirm={cat => { setCategories(c => [...c, cat]); setFCatId(String(cat.id)); setShowCreateCat(false) }}
          onClose={() => setShowCreateCat(false)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Expenses</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Log operating costs, stock purchases, and salary advances</div>
        </div>
        <button onClick={() => { if (showForm) switchType('regular'); setShowForm(v => !v) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: showForm ? T.surface2 : T.topBg, color: showForm ? T.text : T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
          {showForm ? '✕ Cancel' : '+ Add Expense'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div ref={formRef} className="admin-card" style={{ padding: '20px 24px', marginBottom: 20, animation: 'scaleIn 0.2s ease both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>New Expense</div>
            <div style={{ display: 'flex', gap: 3, background: T.surface, padding: 3, borderRadius: 10 }}>
              {[{ key: 'regular', label: 'Regular' }, { key: 'inventory', label: 'Inventory' }, { key: 'kasbon', label: 'Kasbon' }].map(t => (
                <button key={t.key} onClick={() => switchType(t.key)}
                  style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: expType === t.key ? T.topBg : 'transparent', color: expType === t.key ? T.white : T.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Regular */}
          {expType === 'regular' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 0.8fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ ...LS, color: T.muted }}>Branch *</label>
                  <select value={fBranchId} onChange={e => setFBranchId(e.target.value)} style={selectStyle}>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...LS, color: T.muted }}>Category</label>
                  <select value={fCatId} onChange={e => { if (e.target.value === '__create__') setShowCreateCat(true); else setFCatId(e.target.value) }} style={selectStyle}>
                    <option value=''>— None —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    <option disabled>──────</option>
                    <option value='__create__'>＋ Create Category...</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...LS, color: T.muted }}>Source</label>
                  <select value={fSource} onChange={e => setFSource(e.target.value)} style={selectStyle}>
                    <option value='petty_cash'>Petty Cash</option>
                    <option value='owner'>Owner</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...LS, color: errors.amount ? T.danger : T.muted }}>Amount (IDR) *</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: '1.5px solid ' + (errors.amount ? T.danger : T.border), background: T.white, overflow: 'hidden' }}>
                    <span style={{ padding: '9px 10px', fontSize: 12, color: T.muted, borderRight: '1px solid ' + T.border }}>Rp</span>
                    <input type="number" value={fAmount} onChange={e => { setFAmount(e.target.value); setErrors(v => ({ ...v, amount: false })) }} placeholder="150000"
                      style={{ flex: 1, padding: '9px 10px', border: 'none', fontSize: 13, color: T.text, background: 'transparent' }} />
                  </div>
                </div>
                <div>
                  <label style={{ ...LS, color: T.muted }}>Date</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ ...LS, color: errors.desc ? T.danger : T.muted }}>Description *</label>
                <input value={fDesc} onChange={e => { setFDesc(e.target.value); setErrors(v => ({ ...v, desc: false })) }} placeholder="e.g. Office supplies"
                  style={{ ...inputStyle, border: '1.5px solid ' + (errors.desc ? T.danger : T.border) }} />
              </div>
            </>
          )}

          {/* Inventory */}
          {expType === 'inventory' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ ...LS, color: errors.amount ? T.danger : T.muted }}>Total Purchase (IDR) *</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: '1.5px solid ' + (errors.amount ? T.danger : T.border), background: T.white, overflow: 'hidden' }}>
                    <span style={{ padding: '9px 10px', fontSize: 12, color: T.muted, borderRight: '1px solid ' + T.border }}>Rp</span>
                    <input type="number" value={fAmount} onChange={e => { setFAmount(e.target.value); setErrors(v => ({ ...v, amount: false })) }} placeholder="500000"
                      style={{ flex: 1, padding: '9px 10px', border: 'none', fontSize: 13, color: T.text, background: 'transparent' }} />
                  </div>
                </div>
                <div>
                  <label style={{ ...LS, color: T.muted }}>Source</label>
                  <select value={fSource} onChange={e => setFSource(e.target.value)} style={selectStyle}>
                    <option value='petty_cash'>Petty Cash</option>
                    <option value='owner'>Owner</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...LS, color: T.muted }}>Date</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ ...LS, color: errors.desc ? T.danger : T.muted }}>Description *</label>
                <input value={fDesc} onChange={e => { setFDesc(e.target.value); setErrors(v => ({ ...v, desc: false })) }} placeholder="e.g. Pomade restock batch"
                  style={{ ...inputStyle, border: '1.5px solid ' + (errors.desc ? T.danger : T.border) }} />
              </div>
              <div style={{ background: T.surface, borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: '1px solid ' + T.border }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ ...LS, color: errors.stockItem ? T.danger : T.muted }}>Item Received *</label>
                  <select value={stockItemId} onChange={e => { setStockItemId(e.target.value); setErrors(v => ({ ...v, stockItem: false })) }}
                    style={{ ...selectStyle, border: '1.5px solid ' + (errors.stockItem ? T.danger : T.border) }}>
                    <option value=''>— Select item —</option>
                    {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                  </select>
                </div>
                {amt > 0 && totalQty > 0 && (
                  <div style={{ display: 'flex', gap: 16, marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: T.white, border: '1px solid ' + T.border, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 11, color: T.muted }}>Total Qty: <strong style={{ color: T.text }}>{totalQty} {selectedItem?.unit ?? 'pcs'}</strong></div>
                    <div style={{ fontSize: 11, color: T.muted }}>Unit Cost: <strong style={{ color: T.text }}>{isExactUnit ? fmt(unitCostApprox) : `~${fmt(unitCostApprox)}`}/{selectedItem?.unit ?? 'pcs'}</strong>
                      {!isExactUnit && <span style={{ color: '#D97706', marginLeft: 4 }}>(smart rounding)</span>}
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#16A34A' }}>✓ Total: {fmt(amt)}</div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Distribution</div>
                  {errors.dist && <span style={{ fontSize: 11, color: T.danger }}>Each row needs a branch and quantity</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 1.2fr auto', gap: 6, marginBottom: 6, paddingLeft: 2 }}>
                  {['Branch / Destination','Qty','Cost',''].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted }}>{h}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {distLines.map((line, idx) => (
                    <DistLine key={idx} line={line} idx={idx} branches={branches} onUpdate={updateDistLine} onRemove={removeDistLine} lineCost={smartCosts[idx] ?? null} />
                  ))}
                </div>
                <button onClick={addDistLine} style={{ marginTop: 8, padding: '6px 12px', borderRadius: 7, background: T.white, border: '1px dashed ' + T.border, fontSize: 12, color: T.text2, fontWeight: 600, cursor: 'pointer' }}>
                  + Add Branch
                </button>
              </div>
            </>
          )}

          {/* Kasbon */}
          {expType === 'kasbon' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.8fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ ...LS, color: errors.barber ? T.danger : T.muted }}>Barber *</label>
                  <select value={fBarberId} onChange={e => setFBarberId(e.target.value)} style={{ ...selectStyle, border: '1.5px solid ' + (errors.barber ? T.danger : T.border) }}>
                    <option value=''>— Select barber —</option>
                    {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...LS, color: T.muted }}>Deduct Period</label>
                  <select value={fDeductPeriod} onChange={e => setFDeductPeriod(e.target.value)} style={selectStyle}>
                    <option value='current'>This Payroll Period</option>
                    <option value='next'>Next Payroll Period</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...LS, color: errors.amount ? T.danger : T.muted }}>Amount (IDR) *</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: '1.5px solid ' + (errors.amount ? T.danger : T.border), background: T.white, overflow: 'hidden' }}>
                    <span style={{ padding: '9px 10px', fontSize: 12, color: T.muted, borderRight: '1px solid ' + T.border }}>Rp</span>
                    <input type="number" value={fAmount} onChange={e => { setFAmount(e.target.value); setErrors(v => ({ ...v, amount: false })) }} placeholder="500000"
                      style={{ flex: 1, padding: '9px 10px', border: 'none', fontSize: 13, color: T.text, background: 'transparent' }} />
                  </div>
                </div>
                <div>
                  <label style={{ ...LS, color: T.muted }}>Date</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ ...LS, color: T.muted }}>Note (optional)</label>
                <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="e.g. Medical emergency advance"
                  style={inputStyle} />
              </div>
            </>
          )}

          {/* Submit */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handleSubmit} disabled={saving}
              style={{ padding: '10px 22px', borderRadius: 9, background: saved ? '#16A34A' : T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s', opacity: saving ? 0.7 : 1 }}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Expense'}
            </button>
            <button onClick={() => { switchType('regular'); setShowForm(false) }}
              style={{ padding: '10px 16px', borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <DateFilter from={filterFrom} to={filterTo} onChange={(f, t) => { setFilterFrom(f); setFilterTo(t) }} />
        <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + T.border, background: T.white, fontSize: 13, color: T.text, cursor: 'pointer' }}>
          <option value=''>All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 2, background: T.surface, padding: 2, borderRadius: 7 }}>
          {[{ key: 'all', label: 'All' }, { key: 'regular', label: 'Regular' }, { key: 'inventory', label: 'Inventory' }, { key: 'kasbon', label: 'Kasbon' }].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)}
              style={{ padding: '4px 12px', borderRadius: 5, border: 'none', background: filterType === f.key ? T.topBg : 'transparent', color: filterType === f.key ? T.white : T.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: T.text }}>
          Total: {fmtM(totalExpenses)}
        </div>
      </div>

      {/* Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 0.8fr 1.2fr 2fr 0.7fr 1fr 0.8fr', padding: '10px 18px', borderBottom: '1px solid ' + T.border }}>
          {['Date','Type','Branch','Description','Source','Amount','By'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
          ))}
        </div>
        <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
          {loading && <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>}
          {!loading && expenses.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>No expenses found for this period</div>
          )}
          {expenses.map((e, i) => {
            const badge = TYPE_BADGE[e.type] || { label: e.type, color: T.muted, bg: T.surface }
            const branchName = branches.find(b => b.id === e.branch_id)?.name ?? '—'
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '0.7fr 0.8fr 1.2fr 2fr 0.7fr 1fr 0.8fr', padding: '12px 18px', borderBottom: i < expenses.length - 1 ? '1px solid ' + T.surface : 'none', alignItems: 'center' }}
                onMouseEnter={ev => ev.currentTarget.style.background = T.bg}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: 12, color: T.muted }}>{e.expense_date}</div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: badge.bg, color: badge.color }}>{badge.label}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>{branchName}</div>
                <div style={{ fontSize: 12, color: T.text, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description || e.category_name || '—'}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{e.notes || '—'}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{fmt(e.amount)}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{e.created_by_name || 'Admin'}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
