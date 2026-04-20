/**
 * MOCKUP — Bercut Admin: Service Catalogue
 *
 * What it does: View, add, edit, and deactivate services across the catalogue.
 *   Category filter, per-branch price overrides expandable per row, active toggle.
 * State managed: catFilter, showModal, editService, expandedOverride, services
 * Production API:
 *   GET    /api/services
 *   POST   /api/services
 *   PATCH  /api/services/:id
 *   PUT    /api/services/:id/branch-config
 * Feeds into: Kiosk ServiceSelection (via GET /api/services?branch_id=)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Services.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { SERVICE_CATALOGUE, SVC_CAT_META, BRANCHES, INVENTORY, C, fmt } from './data.js';

const CONSUMABLES = INVENTORY.filter(i => i.cat === 'service_consumable' && i.isActive);

const CAT_FILTERS = [
  { key: 'all',        label: 'All'         },
  { key: 'haircut',    label: 'Haircut'     },
  { key: 'beard',      label: 'Beard'       },
  { key: 'treatment',  label: 'Treatment'   },
  { key: 'package',    label: 'Package'     },
  { key: 'hair_color', label: 'Hair Color'  },
];

// ── Add / Edit modal ──────────────────────────────────────────────────────────
function ServiceModal({ service, onClose }) {
  const isNew = !service;
  const [form, setForm] = useState(service ? { ...service, consumables: service.consumables || [] } : {
    name: '', nameId: '', cat: 'haircut', dur: 30, basePrice: 0, commissionRate: 40, badge: '', isActive: true, consumables: [],
  });
  const [addItem,  setAddItem]  = useState('');
  const [addQty,   setAddQty]   = useState(1);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addConsumable() {
    const itemId = parseInt(addItem);
    if (!itemId) return;
    if (form.consumables.some(c => c.itemId === itemId)) return;
    set('consumables', [...form.consumables, { itemId, qty: addQty }]);
    setAddItem(''); setAddQty(1);
  }
  function removeConsumable(itemId) {
    set('consumables', form.consumables.filter(c => c.itemId !== itemId));
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 500, padding: '24px 28px', animation: 'scaleIn 0.2s ease both' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: C.text }}>
            {isNew ? 'Add Service' : 'Edit Service'}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>Name (English)</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>Name (Bahasa Indonesia)</label>
            <input value={form.nameId} onChange={e => set('nameId', e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>Category</label>
            <select value={form.cat} onChange={e => set('cat', e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text }}>
              {CAT_FILTERS.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>Duration (min)</label>
            <input type="number" value={form.dur} onChange={e => set('dur', parseInt(e.target.value))}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>Base Price (IDR)</label>
            <input type="number" value={form.basePrice} onChange={e => set('basePrice', parseInt(e.target.value))}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>Badge (optional)</label>
            <input value={form.badge || ''} onChange={e => set('badge', e.target.value)} placeholder="e.g. Popular"
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Consumables section */}
        <div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>Consumables Used Per Service</label>

          {/* Existing consumables list */}
          {form.consumables.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {form.consumables.map(c => {
                const item = CONSUMABLES.find(i => i.id === c.itemId);
                if (!item) return null;
                return (
                  <div key={c.itemId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: C.bg, borderRadius: 7, border: '1px solid ' + C.border }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#FFFBEB', color: '#D97706' }}>Consumable</span>
                    <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{item.name}</span>
                    <input type="number" value={c.qty} min="0.01" step="0.01"
                      onChange={e => set('consumables', form.consumables.map(x => x.itemId === c.itemId ? { ...x, qty: parseFloat(e.target.value) || 0 } : x))}
                      style={{ width: 64, padding: '4px 8px', borderRadius: 6, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, textAlign: 'right' }} />
                    <span style={{ fontSize: 12, color: C.muted, minWidth: 28 }}>{item.unit}</span>
                    <button onClick={() => removeConsumable(c.itemId)}
                      style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add consumable row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={addItem} onChange={e => setAddItem(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: '1.5px solid ' + C.border, fontSize: 13, color: addItem ? C.text : C.muted }}>
              <option value="">Select consumable item…</option>
              {CONSUMABLES.filter(i => !form.consumables.some(c => c.itemId === i.id)).map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
              ))}
            </select>
            <input type="number" value={addQty} min="0.01" step="0.01" onChange={e => setAddQty(parseFloat(e.target.value) || 1)}
              style={{ width: 72, padding: '8px 10px', borderRadius: 7, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, textAlign: 'right' }} />
            <button onClick={addConsumable} disabled={!addItem}
              style={{ padding: '8px 14px', borderRadius: 7, background: addItem ? C.topBg : C.surface2, color: addItem ? C.white : C.muted, border: 'none', fontWeight: 700, fontSize: 13, cursor: addItem ? 'pointer' : 'default' }}>
              + Add
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 9, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => { alert('Saved (demo)'); onClose(); }}
            style={{ flex: 2, padding: '11px', borderRadius: 9, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            {isNew ? 'Add Service' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Branch config row ─────────────────────────────────────────────────────────
function BranchConfigRow({ service, onClose }) {
  const [configs, setConfigs] = useState(
    Object.fromEntries(
      Object.entries(service.branchConfig).map(([k, v]) => [k, { ...v }])
    )
  );

  function getAvailable(branchId) {
    const c = configs[branchId];
    return !c || c.available !== false;
  }
  function getPrice(branchId)    { return configs[branchId]?.price || ''; }
  function getCommRate(branchId) { return configs[branchId]?.commissionRate || ''; }
  function setAvailable(branchId, val) {
    setConfigs(prev => ({ ...prev, [branchId]: { ...(prev[branchId] || {}), available: val } }));
  }
  function setPrice(branchId, val) {
    setConfigs(prev => ({ ...prev, [branchId]: { ...(prev[branchId] || { available: true }), price: parseInt(val) || undefined } }));
  }
  function setCommRate(branchId, val) {
    setConfigs(prev => ({ ...prev, [branchId]: { ...(prev[branchId] || { available: true }), commissionRate: parseFloat(val) || undefined } }));
  }

  return (
    <div style={{ gridColumn: '1 / -1', padding: '16px 18px 18px', background: C.bg, borderTop: '1px solid ' + C.surface, borderBottom: '1px solid ' + C.surface }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, letterSpacing: '0.1em' }}>
          Per-Branch Availability & Price
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>Base price: {fmt(service.basePrice)}. Leave price blank to keep default. Commission falls back to the barber's default rate if not set here.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 16 }}>
        {BRANCHES.map(b => {
          const available = getAvailable(b.id);
          const price     = getPrice(b.id);
          return (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: available ? C.white : C.surface2, border: '1px solid ' + (available ? C.border : C.surface2), transition: 'all 0.15s' }}>

              {/* Availability toggle */}
              <div onClick={() => setAvailable(b.id, !available)}
                style={{ width: 34, height: 19, borderRadius: 10, background: available ? C.topBg : C.muted, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}>
                <div style={{ position: 'absolute', top: 2, left: available ? 17 : 2, width: 15, height: 15, borderRadius: '50%', background: C.white, transition: 'left 0.15s' }} />
              </div>

              {/* Branch name */}
              <span style={{ fontSize: 13, fontWeight: 600, color: available ? C.text : C.muted, minWidth: 72, flexShrink: 0 }}>{b.city}</span>

              {/* Price + commission overrides — only when available */}
              {available ? (
                <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, borderRadius: 7, border: '1.5px solid ' + (price ? C.topBg : C.border), overflow: 'hidden', background: C.white }}>
                    <span style={{ padding: '0 6px', fontSize: 10, color: C.muted, background: C.surface, borderRight: '1px solid ' + C.border, whiteSpace: 'nowrap', lineHeight: '30px' }}>Rp</span>
                    <input type="number" value={price}
                      onChange={e => setPrice(b.id, e.target.value)}
                      placeholder={String(service.basePrice)}
                      style={{ flex: 1, padding: '6px 6px', border: 'none', fontSize: 12, color: price ? C.text : C.muted, background: 'transparent', minWidth: 0 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', width: 72, borderRadius: 7, border: '1.5px solid ' + (getCommRate(b.id) ? C.topBg : C.border), overflow: 'hidden', background: C.white }}>
                    <input type="number" value={getCommRate(b.id)}
                      onChange={e => setCommRate(b.id, e.target.value)}
                      placeholder={String(service.commissionRate)}
                      style={{ flex: 1, padding: '6px 6px', border: 'none', fontSize: 12, color: getCommRate(b.id) ? C.text : C.muted, background: 'transparent', minWidth: 0, textAlign: 'right' }} />
                    <span style={{ padding: '0 6px', fontSize: 10, color: C.muted, background: C.surface, borderLeft: '1px solid ' + C.border, lineHeight: '30px' }}>%</span>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: C.muted, flex: 1, fontStyle: 'italic' }}>Not offered at this branch</span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={() => { alert('Branch config saved (demo)'); onClose(); }}
          style={{ padding: '7px 16px', borderRadius: 7, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          Save Config
        </button>
        <button onClick={onClose}
          style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: '1px solid ' + C.border, cursor: 'pointer' }}>
          Cancel
        </button>
        <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>Saves to <code style={{ fontFamily: 'monospace', background: C.surface, padding: '1px 4px', borderRadius: 3 }}>branch_services</code> table via PUT /api/services/:id/branch-config</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Services() {
  const [catFilter,        setCatFilter]        = useState('all');
  const [showModal,        setShowModal]        = useState(false);
  const [editService,      setEditService]      = useState(null);
  const [expandedOverride, setExpandedOverride] = useState(null);

  const filtered = catFilter === 'all'
    ? SERVICE_CATALOGUE
    : SERVICE_CATALOGUE.filter(s => s.cat === catFilter);

  const activeCount  = SERVICE_CATALOGUE.filter(s => s.isActive).length;
  const configCount  = SERVICE_CATALOGUE.filter(s => Object.keys(s.branchConfig).length > 0).length;

  function openEdit(s) { setEditService(s); setShowModal(true); }
  function openAdd()   { setEditService(null); setShowModal(true); }
  function toggleOverride(id) { setExpandedOverride(v => v === id ? null : id); }

  return (
    <div style={{ padding: '28px 32px' }}>
      {showModal && <ServiceModal service={editService} onClose={() => setShowModal(false)} />}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Service Catalogue</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            {activeCount} active services · {configCount} with branch overrides
          </div>
        </div>
        <button onClick={openAdd}
          style={{ padding: '9px 16px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          + Add Service
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {CAT_FILTERS.map(f => (
          <button key={f.key} onClick={() => setCatFilter(f.key)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (catFilter === f.key ? C.topBg : C.border), background: catFilter === f.key ? C.topBg : 'transparent', color: catFilter === f.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr 0.9fr 0.8fr 1fr 0.7fr 0.5fr', padding: '10px 18px', borderBottom: '1px solid ' + C.surface }}>
          {['Service', 'Category', 'Duration', 'Base Price', 'Consumables', 'Branch Config', 'Status', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
          ))}
        </div>

        <div style={{ maxHeight: 'calc(100vh - 240px)', minHeight: 200, overflowY: 'auto' }}>
        {filtered.map((s, i) => {
          const cm         = SVC_CAT_META[s.cat];
          const numUnavail = Object.values(s.branchConfig).filter(c => c.available === false).length;
          const numPrices  = Object.values(s.branchConfig).filter(c => c.available !== false && c.price).length;
          const hasConfig  = numUnavail > 0 || numPrices > 0;
          const totalB     = BRANCHES.length;
          const configLabel = numUnavail > 0 && numPrices > 0 ? `${totalB - numUnavail}/${totalB} · ${numPrices} prices`
                            : numUnavail > 0                   ? `${totalB - numUnavail}/${totalB} branches`
                            : numPrices > 0                    ? `${numPrices} price${numPrices > 1 ? 's' : ''}`
                            : null;
          const isExpanded = expandedOverride === s.id;

          return (
            <div key={s.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid ' + C.surface : 'none', opacity: s.isActive ? 1 : 0.5, animation: `fadeUp 0.2s ease ${i * 0.025}s both` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr 0.9fr 0.8fr 1fr 0.7fr 0.5fr', padding: '12px 18px', alignItems: 'center', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{s.nameId}</div>
                </div>

                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: cm.bg, color: cm.color }}>{cm.label}</span>
                </div>

                <div style={{ fontSize: 13, color: C.text2 }}>{s.dur} min</div>

                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>{fmt(s.basePrice)}</div>

                <div>
                  {(s.consumables || []).length > 0
                    ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#FFFBEB', color: '#D97706', cursor: 'default' }} title={(s.consumables || []).map(c => { const it = CONSUMABLES.find(i => i.id === c.itemId); return it ? `${it.name} ×${c.qty}` : ''; }).join(', ')}>
                        {(s.consumables || []).length} item{(s.consumables || []).length > 1 ? 's' : ''}
                      </span>
                    : <span style={{ fontSize: 11, color: C.surface2 }}>—</span>
                  }
                </div>

                <div>
                  <button onClick={() => toggleOverride(s.id)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid ' + (hasConfig ? '#2563EB' : C.border), background: hasConfig ? '#EFF6FF' : 'transparent', color: hasConfig ? '#2563EB' : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                    {configLabel ? `${configLabel} ▾` : 'Configure ▾'}
                  </button>
                </div>

                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: s.isActive ? '#F0FDF4' : C.surface2, color: s.isActive ? '#16A34A' : C.muted }}>
                    {s.isActive ? 'Active' : 'Off'}
                  </span>
                </div>

                <button onClick={() => openEdit(s)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + C.border, background: 'transparent', color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  Edit
                </button>
              </div>

              {isExpanded && (
                <BranchConfigRow service={s} onClose={() => setExpandedOverride(null)} />
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
