/**
 * MOCKUP — Bercut Admin: Inventory
 *
 * What it does: Monitoring-only stock view across all branches + Head Office.
 *   Shows current stock levels with low-stock alerts and movement history.
 *   Head Office column tracks items purchased but not yet distributed to branches.
 *   Distribute tab lets you push HQ stock to any branch at any time.
 *   Stock receipts are still logged via Expenses (stock receipt flow).
 * State managed: categoryFilter, activeTab, items (local qty state), distributeForm,
 *   movementLog
 * Production API:
 *   GET /api/inventory?branch_id=
 *   GET /api/inventory/menu?branch_id= — returns beverage+product items with price + kiosk_visible
 *   PUT /api/inventory/menu?branch_id= — update prices and visibility for a branch
 *   GET /api/inventory/movements?item_id=&branch_id=&from=&to=
 *   POST /api/inventory/distribute { item_id, from: 'head_office', to_branch_id, qty }
 * Feeds into: —
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Inventory.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState, Fragment } from 'react';
import { C, INVENTORY, INV_BRANCH_COLS, MENU_CONFIG, fmt } from './data.js';

const CATS = [
  { key: 'all',                label: 'All'         },
  { key: 'beverage',           label: 'Beverages'   },
  { key: 'product',            label: 'Products'    },
  { key: 'service_consumable', label: 'Consumables' },
];

const CAT_COLORS = {
  beverage:           { color: '#2563EB', bg: '#EFF6FF', label: 'Beverage'   },
  product:            { color: '#9333EA', bg: '#F3E8FF', label: 'Product'    },
  service_consumable: { color: '#D97706', bg: '#FFFBEB', label: 'Consumable' },
};

const BRANCH_COLS    = INV_BRANCH_COLS.filter(c => !c.isHO);
const BRANCH_NAMES   = BRANCH_COLS.map(c => c.label);

const INIT_MOVEMENT_LOG = [
  { id:'m1', date:'14 Apr 11:22', branch:'Seminyak',    item:'Pomade (Medium Hold)',   type:'in',  qty:30, note:'From expense #EXP-009 (Head Office purchase)', by:'Owner',   expenseLinked:true  },
  { id:'m2', date:'14 Apr 10:05', branch:'Dewi Sri',    item:'Pomade (Medium Hold)',   type:'in',  qty:0,  note:'Distributed from Head Office stock',           by:'Admin',   expenseLinked:false },
  { id:'m3', date:'1 Apr 10:14',  branch:'Seminyak',    item:'Mineral Water (600ml)', type:'out', qty:4,  note:'Served to customers',                          by:'Guntur',  expenseLinked:false },
  { id:'m4', date:'1 Apr 09:45',  branch:'Dewi Sri',    item:'Pomade (Medium Hold)',   type:'in',  qty:10, note:'From expense #EXP-001 (Seminyak supplies)',    by:'Admin',   expenseLinked:true  },
  { id:'m5', date:'31 Mar 16:20', branch:'Uluwatu',     item:'Wax Strips (50pcs)',     type:'out', qty:1,  note:'Used in service — auto-deducted',              by:'System',  expenseLinked:false },
  { id:'m6', date:'31 Mar 14:05', branch:'Canggu',      item:'Foil Sheets (box)',     type:'out', qty:1,  note:'Color service — auto-deducted',                by:'System',  expenseLinked:false },
  { id:'m7', date:'31 Mar 11:30', branch:'Seminyak',    item:'Iced Coffee (can)',      type:'out', qty:6,  note:'Served to customers',                          by:'Pangestu',expenseLinked:false },
  { id:'m8', date:'29 Mar 15:00', branch:'All Branches',item:'Wax Strips (50pcs)',     type:'in',  qty:10, note:'From expense #EXP-005 (Dewi Sri supplies)',    by:'Admin',   expenseLinked:true  },
  { id:'m9', date:'28 Mar 09:30', branch:'Seminyak',    item:'Disposable Blades',     type:'in',  qty:2,  note:'From expense #EXP-001 (supplies)',             by:'Admin',   expenseLinked:true  },
];

// ── Stock cell ────────────────────────────────────────────────────────────────

function StockCell({ qty, threshold, isHO }) {
  if (isHO) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: qty > 0 ? '#2563EB' : C.muted, background: qty > 0 ? '#EFF6FF' : 'transparent', padding: qty > 0 ? '1px 6px' : '0', borderRadius: 4, display: 'inline-block' }}>
        {qty > 0 ? qty : '—'}
      </div>
    );
  }
  const ratio = qty / threshold;
  const color = ratio <= 1 ? '#DC2626' : ratio <= 1.2 ? '#D97706' : C.text;
  const bg    = ratio <= 1 ? '#FEF2F2' : ratio <= 1.2 ? '#FFFBEB' : 'transparent';
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: ratio <= 1 ? 800 : 600, fontSize: 13, color, background: bg, padding: ratio <= 1 ? '1px 6px' : '0', borderRadius: 4, display: 'inline-block' }}>
      {qty}
    </div>
  );
}

// ── Distribute modal ──────────────────────────────────────────────────────────

function DistributeModal({ items, onConfirm, onClose }) {
  const [itemId,  setItemId] = useState('');
  const [lines,   setLines]  = useState([{ branch: '', qty: '' }]);
  const [errors,  setErrors] = useState({});

  const selectedItem  = items.find(i => i.id === +itemId);
  const hoQty         = selectedItem?.ho ?? 0;
  const totalOut      = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const remaining     = hoQty - totalOut;
  const isOver        = hoQty > 0 && totalOut > hoQty;
  const fillPct       = hoQty > 0 ? Math.min(totalOut / hoQty, 1) * 100 : 0;
  const usedBranches  = lines.map(l => l.branch).filter(Boolean);

  function updateLine(idx, field, val) {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [field]: val } : l));
    setErrors(v => ({ ...v, lines: false }));
  }
  function addLine()       { setLines(ls => [...ls, { branch: '', qty: '' }]); }
  function removeLine(idx) { setLines(ls => ls.filter((_, i) => i !== idx)); }

  function handleConfirm() {
    const e = {};
    if (!itemId) e.item = true;
    const badLines = lines.some(l => !l.branch || !(Number(l.qty) > 0));
    if (lines.length === 0 || badLines) e.lines = true;
    if (isOver) e.over = true;
    if (Object.keys(e).length) { setErrors(e); return; }
    onConfirm(lines.map(l => ({
      itemId:   +itemId,
      itemName: selectedItem.name,
      branch:   l.branch,
      qty:      Number(l.qty),
      unit:     selectedItem.unit,
    })));
  }

  const LS = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 };
  const SEL = { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 13, background: C.white };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 480, padding: '24px 28px', animation: 'scaleIn 0.18s ease both', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: C.text }}>Distribute from Head Office</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Item picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ ...LS, color: errors.item ? C.danger : C.muted }}>Item *</label>
          <select value={itemId}
            onChange={e => { setItemId(e.target.value); setLines([{ branch: '', qty: '' }]); setErrors({}); }}
            style={{ ...SEL, border: '1.5px solid ' + (errors.item ? C.danger : C.border), color: itemId ? C.text : C.muted }}>
            <option value="">— Select item —</option>
            {items.filter(i => i.ho > 0).map(it => (
              <option key={it.id} value={it.id}>{it.name} — {it.ho} {it.unit} at HO</option>
            ))}
          </select>
        </div>

        {/* Allocation bar — only shown once item is picked */}
        {selectedItem && (
          <div style={{ marginBottom: 18, padding: '11px 14px', borderRadius: 8, background: C.bg, border: '1px solid ' + C.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 12, color: C.muted }}>
                Head Office · {hoQty} {selectedItem.unit} available
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: isOver ? C.danger : totalOut > 0 ? C.text2 : C.muted }}>
                {totalOut > 0
                  ? isOver
                    ? `distributing ${totalOut} · ${totalOut - hoQty} over limit`
                    : `distributing ${totalOut} · ${remaining} remaining`
                  : `0 allocated`}
              </span>
            </div>
            {/* Thin progress track */}
            <div style={{ height: 4, borderRadius: 2, background: C.border }}>
              <div style={{
                height: '100%', borderRadius: 2, transition: 'width 0.15s',
                width: (isOver ? 100 : fillPct) + '%',
                background: isOver ? C.danger : C.topBg,
              }} />
            </div>
          </div>
        )}

        {/* Distribution lines */}
        {selectedItem && (
          <div style={{ marginBottom: 16 }}>
            {errors.lines && (
              <div style={{ fontSize: 11, color: C.danger, marginBottom: 8 }}>All rows need a branch and qty</div>
            )}
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.8fr auto', gap: 8, marginBottom: 4, paddingLeft: 2 }}>
              {['Branch', 'Qty', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted }}>{h}</div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lines.map((line, idx) => {
                const qtyN     = Number(line.qty) || 0;
                const isDupe   = line.branch && usedBranches.filter(b => b === line.branch).length > 1;
                const rowOver  = isOver && qtyN > 0;
                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.8fr auto', gap: 8, alignItems: 'center', background: isDupe ? '#FFFBEB' : C.bg, borderRadius: 8, padding: '8px 10px', border: '1px solid ' + (isDupe ? '#FDE68A' : rowOver ? '#FECACA' : C.border) }}>
                    <select value={line.branch} onChange={e => updateLine(idx, 'branch', e.target.value)}
                      style={{ ...SEL, color: line.branch ? C.text : C.muted }}>
                      <option value="">— Branch —</option>
                      {BRANCH_NAMES.map(b => (
                        <option key={b} value={b} disabled={usedBranches.includes(b) && b !== line.branch}>
                          {b}{usedBranches.includes(b) && b !== line.branch ? ' (added)' : ''}
                        </option>
                      ))}
                    </select>
                    <input type="number" value={line.qty} onChange={e => updateLine(idx, 'qty', e.target.value)}
                      placeholder="Qty" min="1"
                      style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid ' + (rowOver ? '#FECACA' : C.border), fontSize: 13, color: C.text, background: C.white }} />
                    <button onClick={() => removeLine(idx)} disabled={lines.length === 1}
                      style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: lines.length === 1 ? C.surface : '#FEE2E2', color: lines.length === 1 ? C.muted : C.danger, cursor: lines.length === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>✕</button>
                  </div>
                );
              })}
            </div>
            <button onClick={addLine}
              style={{ marginTop: 8, padding: '6px 12px', borderRadius: 7, background: C.white, border: '1px dashed ' + C.border, fontSize: 12, color: C.text2, fontWeight: 600, cursor: 'pointer' }}>
              + Add Branch
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 8, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={isOver || !selectedItem}
            style={{ flex: 2, padding: '10px', borderRadius: 8, background: isOver || !selectedItem ? C.surface2 : C.topBg, color: isOver || !selectedItem ? C.muted : C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: isOver || !selectedItem ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {isOver ? 'Exceeds Stock' : lines.filter(l => l.branch && Number(l.qty) > 0).length > 1
              ? `Distribute to ${lines.filter(l => l.branch && Number(l.qty) > 0).length} Branches`
              : 'Distribute'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const MENU_BRANCHES  = INV_BRANCH_COLS.filter(c => !c.isHO);
const INV_TYPES = [
  { key: 'beverage',           label: 'Beverage',    color: '#2563EB', bg: '#EFF6FF' },
  { key: 'product',            label: 'Product',     color: '#9333EA', bg: '#F3E8FF' },
  { key: 'service_consumable', label: 'Consumable',  color: '#D97706', bg: '#FFFBEB' },
];

// ── Add / Edit item modal ─────────────────────────────────────────────────────
function ItemModal({ item, onSave, onClose }) {
  const isNew = !item;
  const [form, setForm] = useState(
    item
      ? { name: item.name, cat: item.cat, unit: item.unit, threshold: item.threshold }
      : { name: '', cat: 'beverage', unit: 'pcs', threshold: 10 }
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.unit.trim() && form.threshold > 0;

  const LS = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: 5 };
  const INP = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 440, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: C.text }}>
            {isNew ? 'New Inventory Item' : 'Edit Item'}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LS}>Item Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} autoFocus
              placeholder="e.g. Mineral Water (600ml)"
              style={{ ...INP, border: '1.5px solid ' + (form.name.trim() ? C.border : '#FECACA') }} />
          </div>

          <div>
            <label style={LS}>Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {INV_TYPES.map(t => (
                <button key={t.key} onClick={() => set('cat', t.key)}
                  style={{ flex: 1, padding: '9px 8px', borderRadius: 8, border: '1.5px solid ' + (form.cat === t.key ? t.color : C.border), background: form.cat === t.key ? t.bg : C.white, color: form.cat === t.key ? t.color : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.12s' }}>
                  {t.label}
                </button>
              ))}
            </div>
            {form.cat === 'service_consumable' && (
              <div style={{ marginTop: 6, fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                Consumables are used internally per service. They won't appear on the kiosk menu.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LS}>Unit</label>
              <input value={form.unit} onChange={e => set('unit', e.target.value)}
                placeholder="pcs / box / roll / ml"
                style={{ ...INP, border: '1.5px solid ' + (form.unit.trim() ? C.border : '#FECACA') }} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>How stock is counted</div>
            </div>
            <div>
              <label style={LS}>Low-Stock Alert</label>
              <input type="number" value={form.threshold} min={1}
                onChange={e => set('threshold', parseInt(e.target.value) || 1)}
                style={{ ...INP }} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Warn when stock ≤ this</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 9, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => valid && onSave(form)} disabled={!valid}
            style={{ flex: 2, padding: '11px', borderRadius: 9, background: valid ? C.topBg : C.surface2, color: valid ? C.white : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: valid ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}>
            {isNew ? 'Add Item' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
const SELLABLE_ITEMS = INVENTORY.filter(i => i.cat === 'beverage' || i.cat === 'product');

// ── Menu branch config panel (expands inline under each item row) ──────────────
function MenuBranchConfigRow({ item, menuPrices, setMenuField, onClose }) {
  const [saved, setSaved] = useState(false);
  function handleSave() { setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 1000); }

  return (
    <div style={{ gridColumn: '1 / -1', padding: '16px 18px 18px', background: C.bg, borderTop: '1px solid ' + C.surface, borderBottom: '1px solid ' + C.surface }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, letterSpacing: '0.1em', marginBottom: 14 }}>
        Per-Branch Price & Kiosk Visibility — {item.name}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 16 }}>
        {MENU_BRANCHES.map(b => {
          const cfg = menuPrices[b.key]?.[item.id] ?? { price: 0, kv: false };
          const isOn = cfg.kv;
          return (
            <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: isOn ? C.white : C.surface2, border: '1px solid ' + (isOn ? C.border : C.surface2), transition: 'all 0.15s' }}>

              {/* Kiosk visible toggle */}
              <div onClick={() => setMenuField(b.key, item.id, 'kv', !isOn)}
                style={{ width: 34, height: 19, borderRadius: 10, background: isOn ? C.topBg : C.muted, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}>
                <div style={{ position: 'absolute', top: 2, left: isOn ? 17 : 2, width: 15, height: 15, borderRadius: '50%', background: C.white, transition: 'left 0.15s' }} />
              </div>

              {/* Branch name */}
              <span style={{ fontSize: 13, fontWeight: 600, color: isOn ? C.text : C.muted, minWidth: 72, flexShrink: 0 }}>{b.label}</span>

              {/* Price input — only when visible */}
              {isOn ? (
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, borderRadius: 7, border: '1.5px solid ' + (cfg.price ? C.topBg : C.border), overflow: 'hidden', background: C.white }}>
                  <span style={{ padding: '0 6px', fontSize: 10, color: C.muted, background: C.surface, borderRight: '1px solid ' + C.border, whiteSpace: 'nowrap', lineHeight: '30px' }}>Rp</span>
                  <input type="number" value={cfg.price || ''} min={0} step={1000}
                    onChange={e => setMenuField(b.key, item.id, 'price', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    style={{ flex: 1, padding: '6px 6px', border: 'none', fontSize: 12, color: cfg.price ? C.text : C.muted, background: 'transparent', minWidth: 0, fontFamily: "'Inter', sans-serif", fontWeight: 700 }} />
                </div>
              ) : (
                <span style={{ fontSize: 11, color: C.muted, flex: 1, fontStyle: 'italic' }}>Not on kiosk at this branch</span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={handleSave}
          style={{ padding: '7px 16px', borderRadius: 7, background: saved ? '#16A34A' : C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
          {saved ? '✓ Saved' : 'Save Config'}
        </button>
        <button onClick={onClose}
          style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: '1px solid ' + C.border, cursor: 'pointer' }}>
          Cancel
        </button>
        <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>
          Saves to <code style={{ fontFamily: 'monospace', background: C.surface, padding: '1px 4px', borderRadius: 3 }}>inventory_stock</code> via PUT /api/inventory/menu?branch_id=
        </span>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [catFilter,     setCatFilter]     = useState('all');
  const [activeTab,     setActiveTab]     = useState('stock');
  const [items,         setItems]         = useState(INVENTORY.map(i => ({ ...i })));
  const [movementLog,   setMovementLog]   = useState(INIT_MOVEMENT_LOG);
  const [showDistModal, setShowDistModal] = useState(false);

  // Items tab state
  const [itemModal,    setItemModal]    = useState(null); // null | 'new' | item object
  const [itemsCatFilter, setItemsCatFilter] = useState('all');

  function handleSaveItem(form) {
    if (itemModal === 'new') {
      setItems(prev => [...prev, { ...form, id: Date.now(), isActive: true,
        s:0, ca:0, u:0, ul:0, sa:0, d:0, ho:0 }]);
    } else {
      setItems(prev => prev.map(x => x.id === itemModal.id ? { ...x, ...form } : x));
    }
    setItemModal(null);
  }
  function toggleItemActive(id) {
    setItems(prev => prev.map(x => x.id === id ? { ...x, isActive: !x.isActive } : x));
  }

  // Menu tab state
  const [menuPrices, setMenuPrices] = useState(
    Object.fromEntries(
      Object.entries(MENU_CONFIG).map(([bk, cfg]) => [
        bk,
        Object.fromEntries(Object.entries(cfg).map(([id, v]) => [id, { ...v }]))
      ])
    )
  );
  const [expandedMenuItem, setExpandedMenuItem] = useState(null);

  function setMenuField(branchKey, itemId, field, val) {
    setMenuPrices(prev => ({
      ...prev,
      [branchKey]: { ...prev[branchKey], [itemId]: { ...prev[branchKey][itemId], [field]: val } }
    }));
  }
  function toggleMenuItem(id) { setExpandedMenuItem(v => v === id ? null : id); }

  const filtered      = catFilter === 'all' ? items : items.filter(i => i.cat === catFilter);
  const lowStockItems = items.filter(item => BRANCH_COLS.some(col => item[col.key] <= item.threshold));
  const hoTotalItems  = items.filter(i => i.ho > 0).length;

  function handleDistribute(distributions) {
    const { itemId, itemName, unit } = distributions[0];
    const totalQty = distributions.reduce((s, d) => s + d.qty, 0);

    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const updated = { ...it, ho: it.ho - totalQty };
      distributions.forEach(d => {
        const col = INV_BRANCH_COLS.find(c => c.label === d.branch);
        if (col) updated[col.key] = it[col.key] + d.qty;
      });
      return updated;
    }));

    const now     = new Date();
    const dateStr = `${now.getDate()} Apr ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const branchList = distributions.map(d => d.branch).join(', ');

    const newEntries = distributions.map((d, i) => ({
      id:            `dist-${Date.now()}-${i}`,
      date:          dateStr,
      branch:        d.branch,
      item:          itemName,
      type:          'in',
      qty:           d.qty,
      note:          `Distributed from Head Office stock`,
      by:            'Admin',
      expenseLinked: false,
      isDistribute:  true,
    }));

    const hoEntry = {
      id:            `dist-ho-${Date.now()}`,
      date:          dateStr,
      branch:        'Head Office',
      item:          itemName,
      type:          'out',
      qty:           totalQty,
      note:          `Distributed to ${branchList}`,
      by:            'Admin',
      expenseLinked: false,
      isDistribute:  true,
    };

    setMovementLog(log => [...newEntries, hoEntry, ...log]);
    setShowDistModal(false);
  }

  // Build grid template — all branch cols + HO col + min stock
  const allCols    = INV_BRANCH_COLS; // includes HO
  const gridCols   = `1.4fr 0.75fr ${allCols.map(() => '0.85fr').join(' ')} 70px`;

  return (
    <div style={{ padding: '28px 32px' }}>
      {showDistModal && (
        <DistributeModal items={items} onConfirm={handleDistribute} onClose={() => setShowDistModal(false)} />
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
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Inventory</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Stock levels and movement history across all branches · Head Office stock held for distribution</div>
        </div>
        {hoTotalItems > 0 && (
          <button onClick={() => setShowDistModal(true)}
            style={{ padding: '9px 16px', borderRadius: 8, background: '#2563EB', color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Distribute HO Stock
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
          <div style={{ marginLeft: 'auto', fontSize: 12, color: C.muted }}>
            Receive stock via <strong>Expenses → Inventory type</strong>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid ' + C.border, marginBottom: 20 }}>
        {[{ key: 'items', label: 'Items' }, { key: 'stock', label: 'Stock Levels' }, { key: 'log', label: 'Movement Log' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid ' + C.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: activeTab === t.key ? C.text : C.muted, cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Items tab ── */}
      {activeTab === 'items' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ key: 'all', label: 'All' }, ...INV_TYPES].map(t => (
                <button key={t.key} onClick={() => setItemsCatFilter(t.key)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (itemsCatFilter === t.key ? C.topBg : C.border), background: itemsCatFilter === t.key ? C.topBg : 'transparent', color: itemsCatFilter === t.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => setItemModal('new')}
              style={{ padding: '9px 16px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              + New Item
            </button>
          </div>

          <div className="admin-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.6fr 0.9fr 0.7fr 0.9fr', padding: '10px 18px', borderBottom: '1px solid ' + C.surface }}>
              {['Item Name', 'Type', 'Unit', 'Low-Stock Alert', 'Status', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
              ))}
            </div>
            {(itemsCatFilter === 'all' ? items : items.filter(i => i.cat === itemsCatFilter)).map((item, i, arr) => {
              const tm = INV_TYPES.find(t => t.key === item.cat) || INV_TYPES[0];
              return (
                <Fragment key={item.id}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.6fr 0.9fr 0.7fr 0.9fr', padding: '12px 18px', borderBottom: i < arr.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', opacity: item.isActive ? 1 : 0.45, transition: 'opacity 0.15s, background 0.1s', animation: `fadeUp 0.2s ease ${i * 0.025}s both` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{item.name}</div>

                    <div><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: tm.bg, color: tm.color }}>{tm.label}</span></div>

                    <div style={{ fontSize: 13, color: C.text2 }}>{item.unit}</div>

                    <div style={{ fontSize: 13, color: C.text2 }}>{item.threshold} {item.unit}</div>

                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: item.isActive ? '#F0FDF4' : C.surface2, color: item.isActive ? '#16A34A' : C.muted }}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {(item.cat === 'beverage' || item.cat === 'product') && (() => {
                        const visibleCount = MENU_BRANCHES.filter(b => menuPrices[b.key]?.[item.id]?.kv).length;
                        const pricedCount  = MENU_BRANCHES.filter(b => menuPrices[b.key]?.[item.id]?.kv && menuPrices[b.key]?.[item.id]?.price > 0).length;
                        const hasConfig    = visibleCount > 0;
                        return (
                          <button onClick={() => toggleMenuItem(item.id)}
                            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + (hasConfig ? '#2563EB' : C.border), background: hasConfig ? '#EFF6FF' : 'transparent', color: hasConfig ? '#2563EB' : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            {hasConfig ? `Kiosk: ${visibleCount}b · ${pricedCount} priced` : 'Kiosk Config'}
                          </button>
                        );
                      })()}
                      <button onClick={() => setItemModal(item)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + C.border, background: 'transparent', color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        Edit
                      </button>
                      <button onClick={() => toggleItemActive(item.id)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + (item.isActive ? '#FECACA' : C.border), background: 'transparent', color: item.isActive ? C.danger : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        {item.isActive ? 'Deactivate' : 'Restore'}
                      </button>
                    </div>
                  </div>
                  {(item.cat === 'beverage' || item.cat === 'product') && expandedMenuItem === item.id && (
                    <MenuBranchConfigRow
                      item={item}
                      menuPrices={menuPrices}
                      setMenuField={setMenuField}
                      onClose={() => setExpandedMenuItem(null)}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
            Deactivated items are hidden from the kiosk and stock views but kept for historical records.
            Beverages and products have a <strong>Kiosk Config</strong> button to set per-branch pricing and visibility.
          </div>
        </>
      )}

      {/* ── Stock Levels tab ── */}
      {activeTab === 'stock' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {CATS.map(c => (
              <button key={c.key} onClick={() => setCatFilter(c.key)}
                style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (catFilter === c.key ? C.topBg : C.border), background: catFilter === c.key ? C.topBg : 'transparent', color: catFilter === c.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="admin-card" style={{ overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, padding: '10px 18px', borderBottom: '1px solid ' + C.surface, minWidth: 900 }}>
              {['Item', 'Category', ...allCols.map(c => c.label), 'Min Stock'].map((h, i) => {
                const isHOHeader = h === 'Head Office';
                return (
                  <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isHOHeader ? '#2563EB' : C.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {h}
                  </div>
                );
              })}
            </div>
            <div style={{ maxHeight: 'calc(100vh - 430px)', minHeight: 200, overflowY: 'auto' }}>
              {filtered.map((item, i) => {
                const cm = CAT_COLORS[item.cat];
                return (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: gridCols, padding: '11px 18px', borderBottom: '1px solid ' + C.surface, alignItems: 'center', transition: 'background 0.1s', minWidth: 900, animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{item.name}</div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: cm.bg, color: cm.color }}>{cm.label}</span>
                    </div>
                    {allCols.map(col => (
                      <div key={col.key}>
                        <StockCell qty={item[col.key]} threshold={item.threshold} isHO={col.isHO} />
                        <span style={{ fontSize: 10, color: C.muted, marginLeft: 3 }}>{item.unit}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 12, color: C.muted }}>{item.threshold} {item.unit}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {[
              { color: '#DC2626', bg: '#FEF2F2', label: 'At or below threshold — reorder now' },
              { color: '#D97706', bg: '#FFFBEB', label: 'Within 20% of threshold — reorder soon' },
              { color: '#2563EB', bg: '#EFF6FF', label: 'Head Office stock — available to distribute' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: '1px solid ' + l.color }} />
                <span style={{ fontSize: 11, color: C.muted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Movement Log tab ── */}
      {activeTab === 'log' && (
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 2fr 0.5fr 0.4fr 0.65fr', padding: '8px 18px', borderBottom: '1px solid ' + C.surface }}>
            {['Date','Branch','Item / Note','Type','Qty','By'].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
            ))}
          </div>
          <div style={{ maxHeight: 'calc(100vh - 320px)', minHeight: 200, overflowY: 'auto' }}>
            {movementLog.map((m, i) => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 2fr 0.5fr 0.4fr 0.65fr', padding: '12px 18px', borderBottom: i < movementLog.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', transition: 'background 0.1s', animation: `fadeUp 0.2s ease ${i * 0.04}s both`, background: m.isDistribute ? '#F0F7FF' : 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = m.isDistribute ? '#E0EFFF' : C.bg}
                onMouseLeave={e => e.currentTarget.style.background = m.isDistribute ? '#F0F7FF' : 'transparent'}>
                <div style={{ fontSize: 11, color: C.muted }}>{m.date}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: m.branch === 'Head Office' ? '#2563EB' : C.text2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {m.branch === 'Head Office' && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: '#DBEAFE', color: '#1D4ED8', textTransform: 'uppercase' }}>HO</span>}
                  {m.branch}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.item}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {m.expenseLinked && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#DCFCE7', color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EXP</span>}
                    {m.isDistribute && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#DBEAFE', color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DIST</span>}
                    {m.note}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: m.type === 'in' ? '#F0FDF4' : '#FEF2F2', color: m.type === 'in' ? '#16A34A' : '#DC2626' }}>
                    {m.type === 'in' ? '▲ IN' : '▼ OUT'}
                  </span>
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text }}>{m.qty}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{m.by}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
