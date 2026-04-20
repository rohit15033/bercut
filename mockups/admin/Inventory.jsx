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
 *   GET /api/inventory/movements?item_id=&branch_id=&from=&to=
 *   POST /api/inventory/distribute { item_id, from: 'head_office', to_branch_id, qty }
 * Feeds into: —
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Inventory.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { C, INVENTORY, INV_BRANCH_COLS, fmt } from './data.js';

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

export default function Inventory() {
  const [catFilter,    setCatFilter]    = useState('all');
  const [activeTab,    setActiveTab]    = useState('stock');
  const [items,        setItems]        = useState(INVENTORY.map(i => ({ ...i })));
  const [movementLog,  setMovementLog]  = useState(INIT_MOVEMENT_LOG);
  const [showDistModal, setShowDistModal] = useState(false);

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
        {[{ key: 'stock', label: 'Stock Levels' }, { key: 'log', label: 'Movement Log' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid ' + C.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: activeTab === t.key ? C.text : C.muted, cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

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
