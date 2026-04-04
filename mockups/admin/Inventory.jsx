/**
 * MOCKUP — Bercut Admin: Inventory
 *
 * What it does: Three-category stock management across all branches. Cross-branch
 *   table with low-stock colour coding, receive stock modal, movement log tab.
 * State managed: categoryFilter, activeTab, showReceiveModal, receiveForm
 * Production API:
 *   GET  /api/inventory?branch_id=
 *   POST /api/inventory/movement
 *   POST /api/inventory/receive
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
  { key: 'all',               label: 'All'         },
  { key: 'beverage',          label: 'Beverages'   },
  { key: 'product',           label: 'Products'    },
  { key: 'service_consumable',label: 'Consumables' },
];

const CAT_COLORS = {
  beverage:           { color: '#2563EB', bg: '#EFF6FF', label: 'Beverage'     },
  product:            { color: '#9333EA', bg: '#F3E8FF', label: 'Product'      },
  service_consumable: { color: '#D97706', bg: '#FFFBEB', label: 'Consumable'   },
};

const MOVEMENT_LOG = [
  { date: '1 Apr 10:14', branch: 'Seminyak', item: 'Mineral Water (600ml)', type: 'out', qty: 4,  note: 'Served to customers',  by: 'Guntur'  },
  { date: '1 Apr 09:45', branch: 'Dewi Sri', item: 'Pomade (Medium Hold)',  type: 'in',  qty: 10, note: 'Received from HQ',     by: 'Admin'   },
  { date: '31 Mar 16:20',branch: 'Uluwatu',  item: 'Wax Strips (50pcs)',    type: 'out', qty: 1,  note: 'Used in service',      by: 'Yogi'    },
  { date: '31 Mar 14:05',branch: 'Canggu',   item: 'Foil Sheets (box)',     type: 'out', qty: 1,  note: 'Color service used',   by: 'Bayu'    },
  { date: '31 Mar 11:30',branch: 'Seminyak', item: 'Iced Coffee (can)',     type: 'out', qty: 6,  note: 'Served to customers',  by: 'Pangestu'},
  { date: '30 Mar 17:00',branch: 'Sanur',    item: 'Beard Oil',             type: 'in',  qty: 5,  note: 'Received from HQ',     by: 'Admin'   },
];

// ── Stock cell ────────────────────────────────────────────────────────────────

function StockCell({ qty, threshold }) {
  const ratio = qty / threshold;
  const color  = ratio <= 1   ? '#DC2626'
               : ratio <= 1.2 ? '#D97706'
               : '#111110';
  const bg     = ratio <= 1   ? '#FEF2F2'
               : ratio <= 1.2 ? '#FFFBEB'
               : 'transparent';
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: ratio <= 1 ? 800 : 600, fontSize: 13, color, background: bg, padding: ratio <= 1 ? '1px 6px' : '0', borderRadius: 4, display: 'inline-block' }}>
      {qty}
    </div>
  );
}

// ── Receive stock modal ───────────────────────────────────────────────────────

function ReceiveModal({ onClose }) {
  const [item,   setItem]   = useState('Pomade (Medium Hold)');
  const [qty,    setQty]    = useState('');
  const [alloc,  setAlloc]  = useState({ s: '', ca: '', u: '', ul: '', sa: '', d: '' });
  const total   = Object.values(alloc).reduce((a, v) => a + (parseInt(v) || 0), 0);
  const qty_num = parseInt(qty) || 0;
  const valid   = qty_num > 0 && total === qty_num;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 500, padding: '24px 28px', animation: 'scaleIn 0.2s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: C.text }}>Receive Stock</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>Item</label>
          <select value={item} onChange={e => setItem(e.target.value)}
            style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, background: C.white, fontSize: 13, color: C.text }}>
            {INVENTORY.map(i => <option key={i.id}>{i.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>Total Quantity Received</label>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 30"
            style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, display: 'block', marginBottom: 8 }}>Distribute to Branches</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['s','Seminyak'],['ca','Canggu'],['u','Ubud'],['ul','Uluwatu'],['sa','Sanur'],['d','Dewi Sri']].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, minWidth: 70 }}>{label}</label>
                <input type="number" value={alloc[key]} onChange={e => setAlloc(a => ({ ...a, [key]: e.target.value }))} placeholder="0"
                  style={{ flex: 1, padding: '7px 9px', borderRadius: 7, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: total === qty_num && qty_num > 0 ? '#16A34A' : total > qty_num ? C.danger : C.muted, fontWeight: 600 }}>
            Allocated: {total} / {qty_num || '—'} {total > qty_num && '· Over-allocated'}
          </div>
        </div>

        <button disabled={!valid}
          style={{ width: '100%', padding: '11px', borderRadius: 9, background: valid ? C.topBg : C.surface2, color: valid ? C.white : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: valid ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}
          onClick={() => { alert('Stock received and allocated to branches (demo)'); onClose(); }}>
          Confirm Receive
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Inventory() {
  const [catFilter,    setCatFilter]    = useState('all');
  const [activeTab,    setActiveTab]    = useState('stock');
  const [showReceive,  setShowReceive]  = useState(false);

  const filtered = catFilter === 'all' ? INVENTORY : INVENTORY.filter(i => i.cat === catFilter);
  const lowStockItems = INVENTORY.filter(item =>
    INV_BRANCH_COLS.some(col => item[col.key] <= item.threshold)
  );

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>
      {showReceive && <ReceiveModal onClose={() => setShowReceive(false)} />}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Inventory</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Stock levels across all 6 branches</div>
        </div>
        <button onClick={() => setShowReceive(true)}
          style={{ padding: '9px 16px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          + Receive Stock
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 20 }}>
          <span style={{ fontSize: 16 }}>🔴</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#DC2626' }}>{lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} at or below reorder threshold:</span>
            <span style={{ fontSize: 13, color: '#DC2626', marginLeft: 8 }}>{lowStockItems.map(i => i.name).join(' · ')}</span>
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

      {activeTab === 'stock' && (
        <>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {CATS.map(c => (
              <button key={c.key} onClick={() => setCatFilter(c.key)}
                style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (catFilter === c.key ? C.topBg : C.border), background: catFilter === c.key ? C.topBg : 'transparent', color: catFilter === c.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Cross-branch stock table */}
          <div className="admin-card" style={{ overflow: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '200px 100px ' + INV_BRANCH_COLS.map(() => '90px').join(' ') + ' 80px', padding: '10px 18px', borderBottom: '1px solid ' + C.surface, minWidth: 900 }}>
              {['Item', 'Category', ...INV_BRANCH_COLS.map(c => c.label), 'Min Stock'].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
              ))}
            </div>
            {filtered.map((item, i) => {
              const cm = CAT_COLORS[item.cat];
              return (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '200px 100px ' + INV_BRANCH_COLS.map(() => '90px').join(' ') + ' 80px', padding: '11px 18px', borderBottom: i < filtered.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', transition: 'background 0.1s', minWidth: 900, animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{item.name}</div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: cm.bg, color: cm.color }}>{cm.label}</span>
                  </div>
                  {INV_BRANCH_COLS.map(col => (
                    <div key={col.key}>
                      <StockCell qty={item[col.key]} threshold={item.threshold} />
                      <span style={{ fontSize: 10, color: C.muted, marginLeft: 3 }}>{item.unit}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: C.muted }}>{item.threshold} {item.unit}</div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {[
              { color: '#DC2626', bg: '#FEF2F2', label: 'At or below threshold — reorder now' },
              { color: '#D97706', bg: '#FFFBEB', label: 'Within 20% of threshold — reorder soon' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: '1px solid ' + l.color }} />
                <span style={{ fontSize: 11, color: C.muted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'log' && (
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 110px 1fr 60px 80px 90px', padding: '8px 18px', borderBottom: '1px solid ' + C.surface }}>
            {['Date','Branch','Item','Type','Qty','By'].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
            ))}
          </div>
          {MOVEMENT_LOG.map((m, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 110px 1fr 60px 80px 90px', padding: '12px 18px', borderBottom: i < MOVEMENT_LOG.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', transition: 'background 0.1s', animation: `fadeUp 0.2s ease ${i * 0.04}s both` }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 11, color: C.muted }}>{m.date}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{m.branch}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.item}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{m.note}</div>
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
      )}
    </div>
  );
}
