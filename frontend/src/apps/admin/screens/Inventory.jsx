import { useEffect, useState, Fragment } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const CATS = [
  { key: 'all',                label: 'All'         },
  { key: 'beverage',           label: 'Beverages'   },
  { key: 'product',            label: 'Products'    },
  { key: 'service_consumable', label: 'Consumables' },
]

const CAT_COLORS = {
  beverage:           { color: '#2563EB', bg: '#EFF6FF', label: 'Beverage'   },
  product:            { color: '#9333EA', bg: '#F3E8FF', label: 'Product'    },
  service_consumable: { color: '#D97706', bg: '#FFFBEB', label: 'Consumable' },
}

const INV_TYPES = [
  { key: 'beverage',           label: 'Beverage',   color: '#2563EB', bg: '#EFF6FF' },
  { key: 'product',            label: 'Product',    color: '#9333EA', bg: '#F3E8FF' },
  { key: 'service_consumable', label: 'Consumable', color: '#D97706', bg: '#FFFBEB' },
]

// ── Stock cell ────────────────────────────────────────────────────────────────
function StockCell({ qty, threshold, unit }) {
  if (qty === null || qty === undefined) return <span style={{ fontSize: 12, color: T.muted }}>—</span>
  const ratio = threshold > 0 ? qty / threshold : 2
  const color = ratio <= 1 ? '#DC2626' : ratio <= 1.2 ? '#D97706' : T.text
  const bg    = ratio <= 1 ? '#FEF2F2' : ratio <= 1.2 ? '#FFFBEB' : 'transparent'
  return (
    <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: ratio <= 1 ? 800 : 600, fontSize: 13, color, background: bg, padding: ratio <= 1 ? '1px 6px' : '0', borderRadius: 4, display: 'inline-block' }}>
      {qty}{unit ? <span style={{ fontSize: 10, color: ratio <= 1 ? '#DC2626' : T.muted, fontWeight: 400, marginLeft: 2 }}>{unit}</span> : null}
    </span>
  )
}

// ── Distribute modal ──────────────────────────────────────────────────────────
function DistributeModal({ items, branches, stockMap, onClose, onRefresh }) {
  const [itemId,     setItemId]     = useState('')
  const [fromBranch, setFromBranch] = useState('')
  const [lines,      setLines]      = useState([{ branch_id: '', qty: '' }])
  const [errors,     setErrors]     = useState({})
  const [busy,       setBusy]       = useState(false)

  const selectedItem = items.find(i => i.id === itemId)
  const fromStock    = (stockMap[itemId] || {})[fromBranch]?.current_stock ?? 0
  const totalOut     = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)
  const remaining    = fromStock - totalOut
  const isOver       = fromBranch && totalOut > fromStock
  const fillPct      = fromStock > 0 ? Math.min(totalOut / fromStock, 1) * 100 : 0
  const usedBranches = lines.map(l => l.branch_id).filter(Boolean)
  const sourceBranches = branches.filter(b => (stockMap[itemId] || {})[b.id]?.current_stock > 0)
  const destBranches   = branches.filter(b => b.id !== fromBranch)

  function updateLine(idx, field, val) {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [field]: val } : l))
    setErrors(v => ({ ...v, lines: false }))
  }
  function addLine()       { setLines(ls => [...ls, { branch_id: '', qty: '' }]) }
  function removeLine(idx) { setLines(ls => ls.filter((_, i) => i !== idx)) }

  async function handleConfirm() {
    const e = {}
    if (!itemId)    e.item = true
    if (!fromBranch) e.from = true
    if (lines.length === 0 || lines.some(l => !l.branch_id || !(Number(l.qty) > 0))) e.lines = true
    if (isOver)     e.over = true
    if (Object.keys(e).length) { setErrors(e); return }
    setBusy(true)
    try {
      await Promise.all(lines.map(l =>
        api.post('/inventory/distribute', {
          item_id:        itemId,
          from_branch_id: fromBranch,
          to_branch_id:   l.branch_id,
          quantity:       Number(l.qty),
        })
      ))
      onRefresh()
      onClose()
    } catch (err) {
      setErrors({ api: err?.message || 'Distribution failed — check stock availability' })
    } finally {
      setBusy(false)
    }
  }

  const LS  = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }
  const SEL = { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid ' + T.border, fontSize: 13, background: T.white, boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 500, padding: '24px 28px', animation: 'scaleIn 0.18s ease both', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: T.text }}>Distribute Stock</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {errors.api && (
          <div style={{ padding: '8px 12px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: T.danger, marginBottom: 12 }}>{errors.api}</div>
        )}

        {/* Item picker */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...LS, color: errors.item ? T.danger : T.muted }}>Item *</label>
          <select value={itemId}
            onChange={e => { setItemId(e.target.value); setFromBranch(''); setLines([{ branch_id: '', qty: '' }]); setErrors({}) }}
            style={{ ...SEL, border: '1.5px solid ' + (errors.item ? T.danger : T.border), color: itemId ? T.text : T.muted }}>
            <option value="">— Select item —</option>
            {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
          </select>
        </div>

        {/* Source branch */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...LS, color: errors.from ? T.danger : T.muted }}>From Branch *</label>
          <select value={fromBranch}
            onChange={e => { setFromBranch(e.target.value); setLines([{ branch_id: '', qty: '' }]); setErrors({}) }}
            style={{ ...SEL, border: '1.5px solid ' + (errors.from ? T.danger : T.border), color: fromBranch ? T.text : T.muted }}>
            <option value="">— Select source branch —</option>
            {(itemId ? sourceBranches : branches).map(b => {
              const stock = (stockMap[itemId] || {})[b.id]?.current_stock ?? 0
              return <option key={b.id} value={b.id}>{b.name}{itemId ? ` — ${stock} ${selectedItem?.unit || ''} available` : ''}</option>
            })}
          </select>
          {itemId && sourceBranches.length === 0 && (
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>No branches have stock of this item.</div>
          )}
        </div>

        {/* Allocation bar */}
        {selectedItem && fromBranch && (
          <div style={{ marginBottom: 18, padding: '11px 14px', borderRadius: 8, background: T.bg, border: '1px solid ' + T.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 12, color: T.muted }}>
                {branches.find(b => b.id === fromBranch)?.name} · {fromStock} {selectedItem.unit} available
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: isOver ? T.danger : totalOut > 0 ? T.text2 : T.muted }}>
                {totalOut > 0
                  ? isOver
                    ? `distributing ${totalOut} · ${totalOut - fromStock} over limit`
                    : `distributing ${totalOut} · ${remaining} remaining`
                  : '0 allocated'}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: T.border }}>
              <div style={{ height: '100%', borderRadius: 2, transition: 'width 0.15s', width: (isOver ? 100 : fillPct) + '%', background: isOver ? T.danger : T.topBg }} />
            </div>
          </div>
        )}

        {/* Distribution lines */}
        {selectedItem && fromBranch && (
          <div style={{ marginBottom: 16 }}>
            {errors.lines && <div style={{ fontSize: 11, color: T.danger, marginBottom: 8 }}>All rows need a branch and qty</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.8fr auto', gap: 8, marginBottom: 4, paddingLeft: 2 }}>
              {['To Branch', 'Qty', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted }}>{h}</div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lines.map((line, idx) => {
                const isDupe  = line.branch_id && usedBranches.filter(b => b === line.branch_id).length > 1
                const rowOver = isOver && Number(line.qty) > 0
                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.8fr auto', gap: 8, alignItems: 'center', background: isDupe ? '#FFFBEB' : T.bg, borderRadius: 8, padding: '8px 10px', border: '1px solid ' + (isDupe ? '#FDE68A' : rowOver ? '#FECACA' : T.border) }}>
                    <select value={line.branch_id} onChange={e => updateLine(idx, 'branch_id', e.target.value)}
                      style={{ ...SEL, color: line.branch_id ? T.text : T.muted }}>
                      <option value="">— Branch —</option>
                      {destBranches.map(b => (
                        <option key={b.id} value={b.id} disabled={usedBranches.includes(b.id) && b.id !== line.branch_id}>
                          {b.name}{usedBranches.includes(b.id) && b.id !== line.branch_id ? ' (added)' : ''}
                        </option>
                      ))}
                    </select>
                    <input type="number" value={line.qty} onChange={e => updateLine(idx, 'qty', e.target.value)}
                      placeholder="Qty" min="1"
                      style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid ' + (rowOver ? '#FECACA' : T.border), fontSize: 13, color: T.text, background: T.white }} />
                    <button onClick={() => removeLine(idx)} disabled={lines.length === 1}
                      style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: lines.length === 1 ? T.surface : '#FEE2E2', color: lines.length === 1 ? T.muted : T.danger, cursor: lines.length === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>✕</button>
                  </div>
                )
              })}
            </div>
            <button onClick={addLine}
              style={{ marginTop: 8, padding: '6px 12px', borderRadius: 7, background: T.white, border: '1px dashed ' + T.border, fontSize: 12, color: T.text2, fontWeight: 600, cursor: 'pointer' }}>
              + Add Branch
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 8, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!!(isOver || !selectedItem || !fromBranch || busy)}
            style={{ flex: 2, padding: '10px', borderRadius: 8, background: (isOver || !selectedItem || !fromBranch || busy) ? T.surface2 : T.topBg, color: (isOver || !selectedItem || !fromBranch || busy) ? T.muted : T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: (isOver || !selectedItem || !fromBranch || busy) ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {busy ? 'Distributing…' : isOver ? 'Exceeds Stock'
              : lines.filter(l => l.branch_id && Number(l.qty) > 0).length > 1
                ? `Distribute to ${lines.filter(l => l.branch_id && Number(l.qty) > 0).length} Branches`
                : 'Distribute'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add / Edit item modal ─────────────────────────────────────────────────────
function ItemModal({ item, onSave, onClose }) {
  const isNew = !item
  const [form, setForm] = useState(
    item
      ? { name: item.name, category: item.category, unit: item.unit }
      : { name: '', category: 'beverage', unit: 'pcs', initial_stock: '' }
  )
  const [busy, setBusy]   = useState(false)
  const [err,  setErr]    = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim() && form.unit.trim()

  async function handleSave() {
    if (!valid || busy) return
    setBusy(true)
    try {
      await onSave(form)
    } catch (e) {
      setErr(e?.message || 'Save failed')
      setBusy(false)
    }
  }

  const LS  = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, marginBottom: 5 }
  const INP = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 440, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: T.text }}>
            {isNew ? 'New Inventory Item' : 'Edit Item'}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {err && <div style={{ padding: '8px 12px', borderRadius: 7, background: '#FEF2F2', color: T.danger, fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LS}>Item Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} autoFocus
              placeholder="e.g. Mineral Water (600ml)"
              style={{ ...INP, border: '1.5px solid ' + (form.name.trim() ? T.border : '#FECACA') }} />
          </div>

          <div>
            <label style={LS}>Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {INV_TYPES.map(t => (
                <button key={t.key} onClick={() => set('category', t.key)}
                  style={{ flex: 1, padding: '9px 8px', borderRadius: 8, border: '1.5px solid ' + (form.category === t.key ? t.color : T.border), background: form.category === t.key ? t.bg : T.white, color: form.category === t.key ? t.color : T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.12s' }}>
                  {t.label}
                </button>
              ))}
            </div>
            {form.category === 'service_consumable' && (
              <div style={{ marginTop: 6, fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
                Consumables are used internally per service. They won't appear on the kiosk menu.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={LS}>Unit</label>
              <input value={form.unit} onChange={e => set('unit', e.target.value)}
                placeholder="pcs / box / ml"
                style={{ ...INP, border: '1.5px solid ' + (form.unit.trim() ? T.border : '#FECACA') }} />
            </div>
            {isNew && (
              <div style={{ flex: 1 }}>
                <label style={LS}>Initial Stock (HO)</label>
                <input type="number" value={form.initial_stock} onChange={e => set('initial_stock', e.target.value)}
                  placeholder="0"
                  style={INP} />
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: -8 }}>
            {isNew ? 'How stock is counted and starting qty in Head Office' : 'How stock is counted'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 9, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!valid || busy}
            style={{ flex: 2, padding: '11px', borderRadius: 9, background: valid && !busy ? T.topBg : T.surface2, color: valid && !busy ? T.white : T.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: valid && !busy ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}>
            {busy ? 'Saving…' : isNew ? 'Add Item' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Kiosk config panel (inline expand under item row) ─────────────────────────
function MenuConfigRow({ item, branches, onClose }) {
  const [menuData, setMenuData] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all(branches.map(b =>
      api.get(`/inventory/kiosk-menu?branch_id=${b.id}`)
        .then(rows => ({ branchId: b.id, rows: Array.isArray(rows) ? rows : [] }))
        .catch(() => ({ branchId: b.id, rows: [] }))
    )).then(results => {
      const map = {}
      results.forEach(({ branchId, rows }) => {
        const row = rows.find(r => r.id === item.id)
        map[branchId] = { price: row?.price || 0, kv: row?.kiosk_visible || false }
      })
      setMenuData(map)
      setLoading(false)
    })
  }, [item.id, branches])

  function setField(branchId, field, val) {
    setMenuData(prev => ({ ...prev, [branchId]: { ...prev[branchId], [field]: val } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all(branches.map(b => {
        const cfg = menuData[b.id] || { price: 0, kv: false }
        return api.patch('/inventory/stock', {
          item_id:      item.id,
          branch_id:    b.id,
          price:        cfg.price || 0,
          kiosk_visible: cfg.kv,
        }).catch(() => {})
      }))
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 900)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ gridColumn: '1 / -1', padding: '16px 18px 18px', background: T.bg, borderTop: '1px solid ' + T.surface, borderBottom: '1px solid ' + T.surface }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, letterSpacing: '0.1em', marginBottom: 14 }}>
        Per-Branch Price & Kiosk Visibility — {item.name}
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: T.muted, padding: '8px 0' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 16 }}>
          {branches.map(b => {
            const cfg  = menuData[b.id] || { price: 0, kv: false }
            const isOn = cfg.kv
            return (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: isOn ? T.white : T.surface2, border: '1px solid ' + (isOn ? T.border : T.surface2), transition: 'all 0.15s' }}>
                <div onClick={() => setField(b.id, 'kv', !isOn)}
                  style={{ width: 34, height: 19, borderRadius: 10, background: isOn ? T.topBg : T.muted, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}>
                  <div style={{ position: 'absolute', top: 2, left: isOn ? 17 : 2, width: 15, height: 15, borderRadius: '50%', background: T.white, transition: 'left 0.15s' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: isOn ? T.text : T.muted, minWidth: 72, flexShrink: 0 }}>{b.name}</span>
                {isOn ? (
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, borderRadius: 7, border: '1.5px solid ' + (cfg.price ? T.topBg : T.border), overflow: 'hidden', background: T.white }}>
                    <span style={{ padding: '0 6px', fontSize: 10, color: T.muted, background: T.surface, borderRight: '1px solid ' + T.border, whiteSpace: 'nowrap', lineHeight: '30px' }}>Rp</span>
                    <input type="number" value={cfg.price || ''} min={0} step={1000}
                      onChange={e => setField(b.id, 'price', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      style={{ flex: 1, padding: '6px 6px', border: 'none', fontSize: 12, color: cfg.price ? T.text : T.muted, background: 'transparent', minWidth: 0, fontFamily: "'Inter', sans-serif", fontWeight: 700 }} />
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: T.muted, flex: 1, fontStyle: 'italic' }}>Not on kiosk at this branch</span>
                )}
              </div>
            )
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={handleSave} disabled={saving || loading}
          style={{ padding: '7px 16px', borderRadius: 7, background: saved ? '#16A34A' : T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Config'}
        </button>
        <button onClick={onClose}
          style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: '1px solid ' + T.border, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Inventory() {
  const [activeTab,      setActiveTab]      = useState('stock')
  const [catFilter,      setCatFilter]      = useState('all')
  const [itemsCatFilter, setItemsCatFilter] = useState('all')
  const [branches,       setBranches]       = useState([])
  const [items,          setItems]          = useState([])
  const [stockRows,      setStockRows]      = useState([])
  const [movements,      setMovements]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [showDistModal,  setShowDistModal]  = useState(false)
  const [itemModal,      setItemModal]      = useState(null) // null | 'new' | item obj
  const [expandedMenu,   setExpandedMenu]   = useState(null)

  // Build stockMap: { item_id: { branch_id: { current_stock, reorder_threshold } } }
  const stockMap = {}
  stockRows.forEach(row => {
    if (!row.id || !row.branch_id) return
    if (!stockMap[row.id]) stockMap[row.id] = {}
    stockMap[row.id][row.branch_id] = {
      current_stock:     row.current_stock,
      reorder_threshold: row.reorder_threshold,
    }
  })

  function loadAll() {
    setLoading(true)
    Promise.all([
      api.get('/branches').catch(() => []),
      api.get('/inventory/items').catch(() => []),
      api.get('/inventory').catch(() => []),
      api.get('/inventory/movements?limit=100').catch(() => []),
    ]).then(([brs, its, stk, mvs]) => {
      setBranches(Array.isArray(brs) ? brs : [])
      setItems(Array.isArray(its) ? its : [])
      setStockRows(Array.isArray(stk) ? stk : [])
      setMovements(Array.isArray(mvs) ? mvs : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  async function handleSaveItem(form) {
    if (itemModal === 'new') {
      await api.post('/inventory/items', form)
    } else {
      await api.patch('/inventory/items/' + itemModal.id, form)
    }
    setItemModal(null)
    loadAll()
  }

  // Derived
  const activeItems       = items.filter(i => i.is_active !== false)
  const filteredItems     = (catFilter === 'all' ? activeItems : activeItems.filter(i => i.category === catFilter))
  const filteredItemsList = (itemsCatFilter === 'all' ? items : items.filter(i => i.category === itemsCatFilter))

  const lowStockItems = activeItems.filter(item => {
    const s = stockMap[item.id] || {}
    return Object.values(s).some(b => b.reorder_threshold > 0 && b.current_stock <= b.reorder_threshold)
  })

  const hasAnyStock = activeItems.some(item => {
    const s = stockMap[item.id] || {}
    return Object.values(s).some(b => b.current_stock > 0)
  })

  const branchName = id => branches.find(b => b.id === id)?.name || '—'

  // Grid: item name + category col + one col per branch + min stock col
  const gridCols = `1.4fr 0.75fr ${branches.map(() => '0.85fr').join(' ')} 70px`

  if (loading) return (
    <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ fontSize: 14, color: T.muted }}>Loading inventory…</div>
    </div>
  )

  return (
    <div style={{ padding: '28px 32px' }}>
      {showDistModal && (
        <DistributeModal
          items={activeItems}
          branches={branches}
          stockMap={stockMap}
          onClose={() => setShowDistModal(false)}
          onRefresh={loadAll}
        />
      )}
      {itemModal && (
        <ItemModal
          item={itemModal === 'new' ? null : itemModal}
          onSave={handleSaveItem}
          onClose={() => setItemModal(null)}
        />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Inventory</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
            Stock levels and movement history across all branches · Distribute stock between branches
          </div>
        </div>
        {hasAnyStock && (
          <button onClick={() => setShowDistModal(true)}
            style={{ padding: '9px 16px', borderRadius: 8, background: '#2563EB', color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Distribute Stock
          </button>
        )}
      </div>

      {/* Low stock warning */}
      {lowStockItems.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 20 }}>
          <span style={{ fontSize: 13 }}>🔴</span>
          <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{lowStockItems.length} low stock</span>
          <span style={{ fontSize: 12, color: '#DC2626' }}>
            — {lowStockItems.slice(0, 3).map(i => i.name).join(', ')}{lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ''}
          </span>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: T.muted }}>
            Receive stock via <strong>Expenses → Inventory type</strong>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid ' + T.border, marginBottom: 20 }}>
        {[{ key: 'items', label: 'Items' }, { key: 'stock', label: 'Stock Levels' }, { key: 'log', label: 'Movement Log' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid ' + T.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: activeTab === t.key ? T.text : T.muted, cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Items tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'items' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ key: 'all', label: 'All' }, ...INV_TYPES].map(t => (
                <button key={t.key} onClick={() => setItemsCatFilter(t.key)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (itemsCatFilter === t.key ? T.topBg : T.border), background: itemsCatFilter === t.key ? T.topBg : 'transparent', color: itemsCatFilter === t.key ? T.white : T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => setItemModal('new')}
              style={{ padding: '9px 16px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              + New Item
            </button>
          </div>

          <div className="admin-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.6fr 0.7fr 1fr', padding: '10px 18px', borderBottom: '1px solid ' + T.surface }}>
              {['Item Name', 'Type', 'Unit', 'Status', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
              ))}
            </div>
            {filteredItemsList.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: T.muted, fontSize: 13 }}>No items yet. Add one above.</div>
            )}
            {filteredItemsList.map((item, i, arr) => {
              const tm = INV_TYPES.find(t => t.key === item.category) || INV_TYPES[0]
              return (
                <Fragment key={item.id}>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.6fr 0.7fr 1fr', padding: '12px 18px', borderBottom: i < arr.length - 1 || expandedMenu === item.id ? '1px solid ' + T.surface : 'none', alignItems: 'center', opacity: item.is_active !== false ? 1 : 0.5, transition: 'opacity 0.15s, background 0.1s', animation: `fadeUp 0.2s ease ${i * 0.025}s both` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{item.name}</div>
                    <div><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: tm.bg, color: tm.color }}>{tm.label}</span></div>
                    <div style={{ fontSize: 13, color: T.text2 }}>{item.unit}</div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: item.is_active !== false ? '#F0FDF4' : T.surface2, color: item.is_active !== false ? '#16A34A' : T.muted }}>
                        {item.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {(item.category === 'beverage' || item.category === 'product') && (
                        <button onClick={() => setExpandedMenu(v => v === item.id ? null : item.id)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + (expandedMenu === item.id ? '#2563EB' : T.border), background: expandedMenu === item.id ? '#EFF6FF' : 'transparent', color: expandedMenu === item.id ? '#2563EB' : T.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                          Kiosk Config
                        </button>
                      )}
                      <button onClick={() => setItemModal(item)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + T.border, background: 'transparent', color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          const s = stockMap[item.id] || {}
                          const total = Object.values(s).reduce((a, b) => a + (b.current_stock || 0), 0)
                          if (total > 0) return alert('Cannot delete item with remaining stock.')
                          if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return
                          try {
                            await api.delete('/inventory/items/' + item.id)
                            loadAll()
                          } catch (err) {
                            alert(err?.message || 'Delete failed')
                          }
                        }}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #FEE2E2', background: 'transparent', color: '#DC2626', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {(item.category === 'beverage' || item.category === 'product') && expandedMenu === item.id && (
                    <MenuConfigRow
                      item={item}
                      branches={branches}
                      onClose={() => setExpandedMenu(null)}
                    />
                  )}
                </Fragment>
              )
            })}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: T.muted }}>
            Beverages and products have a <strong>Kiosk Config</strong> button to set per-branch pricing and visibility.
            Stock levels are managed via Expenses when receiving new stock.
          </div>
        </>
      )}

      {/* ── Stock Levels tab ─────────────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {CATS.map(c => (
              <button key={c.key} onClick={() => setCatFilter(c.key)}
                style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (catFilter === c.key ? T.topBg : T.border), background: catFilter === c.key ? T.topBg : 'transparent', color: catFilter === c.key ? T.white : T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="admin-card" style={{ overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, padding: '10px 18px', borderBottom: '1px solid ' + T.surface, minWidth: 700 }}>
              {['Item', 'Category', ...branches.map(b => b.name), 'Min Stock'].map((h, i) => (
                <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
              ))}
            </div>
            <div style={{ maxHeight: 'calc(100vh - 430px)', minHeight: 200, overflowY: 'auto' }}>
              {filteredItems.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: T.muted, fontSize: 13 }}>No items.</div>
              )}
              {filteredItems.map((item, i) => {
                const cm = CAT_COLORS[item.category] || CAT_COLORS.beverage
                const itemStocks = stockMap[item.id] || {}
                const threshold = Object.values(itemStocks)[0]?.reorder_threshold ?? 0
                return (
                  <div key={item.id}
                    style={{ display: 'grid', gridTemplateColumns: gridCols, padding: '11px 18px', borderBottom: '1px solid ' + T.surface, alignItems: 'center', transition: 'background 0.1s', minWidth: 700, animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{item.name}</div>
                    <div><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: cm.bg, color: cm.color }}>{cm.label}</span></div>
                    {branches.map(b => {
                      const s = itemStocks[b.id]
                      return (
                        <div key={b.id}>
                          {s
                            ? <StockCell qty={s.current_stock} threshold={s.reorder_threshold} unit={item.unit} />
                            : <span style={{ fontSize: 12, color: T.muted }}>—</span>
                          }
                        </div>
                      )
                    })}
                    <div style={{ fontSize: 12, color: T.muted }}>
                      {threshold > 0 ? `${threshold} ${item.unit}` : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              { color: '#DC2626', bg: '#FEF2F2', label: 'At or below threshold — reorder now' },
              { color: '#D97706', bg: '#FFFBEB', label: 'Within 20% of threshold — reorder soon' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: '1px solid ' + l.color }} />
                <span style={{ fontSize: 11, color: T.muted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Movement Log tab ─────────────────────────────────────────────────── */}
      {activeTab === 'log' && (
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 2fr 0.5fr 0.4fr 0.65fr', padding: '8px 18px', borderBottom: '1px solid ' + T.surface }}>
            {['Date', 'Branch', 'Item / Note', 'Type', 'Qty', 'By'].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
            ))}
          </div>
          <div style={{ maxHeight: 'calc(100vh - 320px)', minHeight: 200, overflowY: 'auto' }}>
            {movements.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: T.muted, fontSize: 13 }}>No movements recorded yet.</div>
            )}
            {movements.map((m, i) => (
              <div key={m.id}
                style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 2fr 0.5fr 0.4fr 0.65fr', padding: '12px 18px', borderBottom: i < movements.length - 1 ? '1px solid ' + T.surface : 'none', alignItems: 'center', transition: 'background 0.1s', animation: `fadeUp 0.2s ease ${i * 0.04}s both` }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: 11, color: T.muted }}>
                  {new Date(m.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>
                  {branchName(m.branch_id)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{m.item_name}</div>
                  {m.note && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{m.note}</div>}
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: m.movement_type === 'in' ? '#F0FDF4' : '#FEF2F2', color: m.movement_type === 'in' ? '#16A34A' : '#DC2626' }}>
                    {m.movement_type === 'in' ? '▲ IN' : '▼ OUT'}
                  </span>
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: T.text }}>{m.quantity}</div>
                <div style={{ fontSize: 12, color: T.muted }}>{m.logged_by || 'System'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
