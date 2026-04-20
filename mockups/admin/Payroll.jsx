/**
 * MOCKUP — Bercut Admin: Payroll
 *
 * What it does: Period-based payroll table.
 *   Columns: barber, base salary, commission (regular + OT breakdown),
 *   late deduction (auto-calc from minutes), excused off (flat/pro-rata split),
 *   inexcused off (flat/pro-rata split), kasbon, additions, other deductions, net pay.
 *   Period picker (16th → 15th cycle). Working days chip — computed 6/7 of period days,
 *   click to override for public holidays etc.
 *   Clicking a row opens ManageAdjModal; "+ Add" opens AddAdjModal.
 *   Kasbon rows: Defer → / ← Restore (no lock). Export CSV button.
 * State managed: periodKey/From/To, workingDaysOverride, overrides, adjustments,
 *   showManageModal, showAddModal, adjModalEntryId, selectedBranch
 * Production API:
 *   GET  /api/payroll/entries?branch_id=&year=&month=
 *   PATCH /api/payroll/entries/:id { overrides }
 *   GET/POST/DELETE /api/payroll/adjustments?entry_id=
 *   PATCH /api/payroll/adjustments/:id { deduct_period }
 *   GET  /api/expenses?type=kasbon&barber_id=&period_month=
 *   GET  /api/payroll/settings
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Payroll.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import {
  C, PAYROLL_ENTRIES_V2, ADJ_ADDITION_CATS, ADJ_DEDUCTION_CATS, fmtM,
} from './data.js';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const NEXT_MONTH  = 'May 2026';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDateFull(s) {
  if (!s) return '—';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${MONTH_NAMES[parseInt(m[2])-1]} ${parseInt(m[3])} ${m[1]}`;
}

const PERIOD_PRESETS = [
  { key:'2026-04', label:'Apr – May 2026', from:'2026-04-16', to:'2026-05-15' },
  { key:'2026-03', label:'Mar – Apr 2026', from:'2026-03-16', to:'2026-04-15' },
  { key:'2026-02', label:'Feb – Mar 2026', from:'2026-02-16', to:'2026-03-15' },
  { key:'2026-01', label:'Jan – Feb 2026', from:'2026-01-16', to:'2026-02-15' },
  { key:'2025-12', label:'Dec – Jan 2025', from:'2025-12-16', to:'2026-01-15' },
  { key:'2025-11', label:'Nov – Dec 2025', from:'2025-11-16', to:'2025-12-15' },
];

function fmtDateShort(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.getDate() + ' ' + MONTH_SHORT[dt.getMonth()];
}

const LATE_RATE_PER_MIN = 2_000;
const FLAT_OFF_RATE     = 150_000; // inexcused offs
const EXCUSED_OVER_RATE = 100_000; // excused offs above monthly limit
const EXCUSED_QUOTA     = 2;

function computeWorkingDays(from, to) {
  const d1 = new Date(from + 'T00:00:00');
  const d2 = new Date(to   + 'T00:00:00');
  const totalDays = Math.round((d2 - d1) / 86400000) + 1;
  return Math.round(totalDays * 6 / 7);
}

const ADD_CATS_BASE = [...ADJ_ADDITION_CATS];
const DED_CATS_BASE = [...ADJ_DEDUCTION_CATS.filter(c => !c.isKasbon)];

// ── InlineNum ─────────────────────────────────────────────────────────────────

function InlineNum({ value, onCommit, suffix = '', color }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  function start() { setDraft(String(value)); setEditing(true); }
  function commit() { const n = parseInt(draft, 10); onCommit(isNaN(n) || n < 0 ? 0 : n); setEditing(false); }
  if (editing) {
    return (
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        style={{ width: 52, padding: '2px 5px', borderRadius: 5, border: '1px solid ' + C.topBg, fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: C.text, textAlign: 'right' }} />
    );
  }
  const c = value > 0 ? (color || C.text) : C.border;
  return (
    <span onClick={e => { e.stopPropagation(); start(); }} title="Click to edit"
      style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: c, cursor: 'pointer' }}>
      {value > 0 ? value + suffix : '—'}
    </span>
  );
}

// ── AdjRow ────────────────────────────────────────────────────────────────────

function AdjRow({ adj, onDelete, onToggleDefer }) {
  const isAdd      = adj.type === 'addition';
  const isDeferred = adj.isKasbon && adj.deductPeriod === 'next';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: isDeferred ? C.surface : C.white, border: '1px solid ' + C.border, marginBottom: 6, opacity: isDeferred ? 0.65 : 1, transition: 'opacity 0.2s' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDeferred ? C.surface2 : (isAdd ? '#F0FDF4' : '#FEF2F2'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: isDeferred ? C.muted : (isAdd ? '#16A34A' : '#DC2626') }}>{isAdd ? '+' : '−'}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isDeferred ? C.muted : C.text }}>{adj.categoryLabel}</span>
          {adj.isKasbon && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>KASBON</span>
          )}
          {isDeferred && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: C.surface2, color: C.muted }}>Deferred → {NEXT_MONTH}</span>
          )}
        </div>
        {adj.remarks && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{adj.remarks}</div>}
        <div style={{ fontSize: 10, color: C.border, marginTop: 2 }}>{adj.date} · by {adj.by}</div>
      </div>

      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: isDeferred ? C.muted : (isAdd ? '#16A34A' : '#DC2626'), flexShrink: 0, textDecoration: isDeferred ? 'line-through' : 'none' }}>
        {isAdd ? '+' : '−'}{fmtM(adj.amount)}
      </div>

      {adj.isKasbon && onToggleDefer && (
        <button onClick={onToggleDefer}
          style={{ padding: '3px 9px', borderRadius: 5, border: '1px solid ' + C.border, background: isDeferred ? C.white : C.surface, color: isDeferred ? '#2563EB' : C.text2, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {isDeferred ? `← Restore` : `Defer →`}
        </button>
      )}

      {!adj.isKasbon && onDelete && (
        <button onClick={onDelete}
          style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: '#FEE2E2', color: C.danger, cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✕</button>
      )}
    </div>
  );
}

// ── ManageAdjModal ────────────────────────────────────────────────────────────

function ManageAdjModal({ entry, adjustments, onDelete, onToggleDefer, onClose }) {
  const additions  = adjustments.filter(a => a.type === 'addition');
  const deductions = adjustments.filter(a => a.type === 'deduction');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-card" style={{ width: 500, maxHeight: '78vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid ' + C.border, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: C.text }}>Adjustments — {entry.barber}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>April 2026</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {additions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#16A34A', marginBottom: 8 }}>Additions</div>
              {additions.map(adj => (
                <AdjRow key={adj.id} adj={adj} onDelete={() => onDelete(adj.id)} onToggleDefer={null} />
              ))}
            </div>
          )}
          {deductions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#DC2626', marginBottom: 8 }}>Deductions</div>
              {deductions.map(adj => (
                <AdjRow
                  key={adj.id}
                  adj={adj}
                  onDelete={adj.isKasbon ? null : () => onDelete(adj.id)}
                  onToggleDefer={adj.isKasbon ? () => onToggleDefer(adj.id) : null}
                />
              ))}
            </div>
          )}
          {adjustments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted, fontSize: 13 }}>No adjustments for this barber.</div>
          )}
          {deductions.some(a => a.isKasbon && a.deductPeriod === 'next') && (
            <div style={{ fontSize: 11, color: C.muted, padding: '8px 12px', borderRadius: 7, background: C.surface, marginTop: 4 }}>
              Deferred kasbon will appear as a deduction in {NEXT_MONTH} payroll automatically.
            </div>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid ' + C.border, background: C.bg, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 8, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CreateAdjCatModal ─────────────────────────────────────────────────────────

function CreateAdjCatModal({ onConfirm, onClose }) {
  const [label, setLabel] = useState('');
  const LS = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 };

  function handleConfirm() {
    if (!label.trim()) return;
    const key = label.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    onConfirm({ key, label: label.trim() });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 360, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>New Category</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ ...LS, color: C.muted }}>Category Name *</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Transport Reimbursement" autoFocus
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.topBg, fontSize: 13, color: C.text, background: C.white, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 8, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleConfirm} disabled={!label.trim()}
            style={{ flex: 2, padding: '10px', borderRadius: 8, background: label.trim() ? C.topBg : C.surface2, color: label.trim() ? C.white : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: label.trim() ? 'pointer' : 'not-allowed' }}>
            Create Category
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AddAdjModal ───────────────────────────────────────────────────────────────

function AddAdjModal({ entry, onAdd, onClose }) {
  const [adjType,       setAdjType]       = useState('addition');
  const [category,      setCategory]      = useState('uang_rajin');
  const [remarks,       setRemarks]       = useState('');
  const [amount,        setAmount]        = useState('');
  const [errors,        setErrors]        = useState({});
  const [addCats,       setAddCats]       = useState(ADD_CATS_BASE);
  const [dedCats,       setDedCats]       = useState(DED_CATS_BASE);
  const [showCreateCat, setShowCreateCat] = useState(false);

  const cats = adjType === 'addition' ? addCats : dedCats;

  function switchType(t) {
    setAdjType(t);
    setCategory(t === 'addition' ? 'uang_rajin' : 'late_arrival');
    setErrors({});
  }

  function handleCatChange(val) {
    if (val === '__create__') { setShowCreateCat(true); return; }
    setCategory(val);
  }

  function handleCatCreated(newCat) {
    if (adjType === 'addition') setAddCats(c => [...c, newCat]);
    else                        setDedCats(c => [...c, newCat]);
    setCategory(newCat.key);
    setShowCreateCat(false);
  }

  function handleAdd() {
    const e = {};
    if (!amount || parseInt(amount) <= 0) e.amount = true;
    setErrors(e);
    if (Object.keys(e).length) return;

    const catLabel = cats.find(c => c.key === category)?.label ?? category;

    onAdd({
      id:            'adj_' + Date.now(),
      type:          adjType,
      category:      category,
      categoryLabel: catLabel,
      remarks:       remarks.trim(),
      amount:        parseInt(amount),
      by:            'Admin',
      date:          '16 Apr',
      isKasbon:      false,
      deductPeriod:  'current',
    });
    onClose();
  }

  const LS = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 };

  return (
    <>
    {showCreateCat && <CreateAdjCatModal onConfirm={handleCatCreated} onClose={() => setShowCreateCat(false)} />}
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-card" style={{ width: 460, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: C.text }}>Add Adjustment</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{entry.barber} · April 2026</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 3, marginBottom: 18, background: C.surface, padding: 3, borderRadius: 9, width: 'fit-content' }}>
          {[{ key:'addition', label:'Addition' }, { key:'deduction', label:'Deduction' }].map(t => (
            <button key={t.key} onClick={() => switchType(t.key)}
              style={{ padding: '7px 20px', borderRadius: 7, border: 'none', background: adjType === t.key ? C.topBg : 'transparent', color: adjType === t.key ? C.white : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ ...LS, color: C.muted }}>Category *</label>
            <select value={category} onChange={e => handleCatChange(e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, background: C.white }}>
              {cats.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              <option disabled style={{ color: C.surface2 }}>──────────</option>
              <option value="__create__">＋ Create Category...</option>
            </select>
          </div>

          <div>
            <label style={{ ...LS, color: errors.amount ? C.danger : C.muted }}>Amount (IDR) *</label>
            <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: '1.5px solid ' + (errors.amount ? C.danger : C.border), background: C.white, overflow: 'hidden' }}>
              <span style={{ padding: '9px 11px', fontSize: 12, color: C.muted, borderRight: '1px solid ' + C.border }}>Rp</span>
              <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setErrors(v => ({ ...v, amount: false })); }} placeholder="200000" autoFocus
                style={{ flex: 1, padding: '9px 11px', border: 'none', fontSize: 13, color: C.text, background: 'transparent' }} />
            </div>
          </div>

          <div>
            <label style={{ ...LS, color: C.muted }}>Remarks <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
            <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Perfect attendance this month"
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, background: C.white, boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 9, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleAdd}
            style={{ flex: 2, padding: '11px', borderRadius: 9, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            Add {adjType === 'addition' ? 'Addition' : 'Deduction'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ── DateRangePicker ───────────────────────────────────────────────────────────

function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen]       = useState(false);
  const [hover, setHover]     = useState(null);
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const rightMonth = viewMonth === 11 ? 0            : viewMonth + 1;
  const rightYear  = viewMonth === 11 ? viewYear + 1 : viewYear;

  function prev() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); }
  function next() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); }

  function handleDay(iso) {
    if (!from || to || iso < from) { onChange(iso, null); }
    else if (iso === from)         { onChange(null, null); }
    else                           { onChange(from, iso); setOpen(false); }
  }

  function renderMonth(year, month, showPrev, showNext) {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInM  = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInM; d++) cells.push(`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    while (cells.length % 7 !== 0) cells.push(null);

    const hoverEnd    = !to && from && hover && hover >= from ? hover : null;
    const effectiveTo = to || hoverEnd;

    return (
      <div style={{ width:216 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          {showPrev ? <button onClick={prev}  style={{ width:26, height:26, borderRadius:6, border:'none', background:C.surface, color:C.text, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button> : <div style={{ width:26 }} />}
          <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:13, color:C.text }}>{MONTH_NAMES[month]} {year}</div>
          {showNext ? <button onClick={next} style={{ width:26, height:26, borderRadius:6, border:'none', background:C.surface, color:C.text, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button> : <div style={{ width:26 }} />}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', marginBottom:4 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontSize:9, fontWeight:700, color:C.muted, textAlign:'center', padding:'2px 0' }}>{d}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:1 }}>
          {cells.map((iso, idx) => {
            if (!iso) return <div key={`e${idx}`} />;
            const isStart = iso === from, isEnd = iso === to, isHoverEnd = iso === hoverEnd;
            const inRange = !!from && !!effectiveTo && iso > from && iso < effectiveTo;
            const isTod   = iso === todayISO();
            const active  = isStart || isEnd;
            const bg  = active ? C.topBg : isHoverEnd ? 'rgba(17,17,16,0.2)' : inRange ? '#F5E20055' : 'transparent';
            const clr = active || isHoverEnd ? '#fff' : C.text;
            return (
              <div key={iso} onClick={() => handleDay(iso)}
                onMouseEnter={() => { if (from && !to) setHover(iso); }}
                onMouseLeave={() => { if (from && !to) setHover(null); }}
                style={{ textAlign:'center', padding:'6px 2px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight: active ? 700 : isTod ? 600 : 400, background:bg, color:clr, outline: isTod && !active ? '1.5px solid '+C.border : 'none', outlineOffset:-1, transition:'background 0.08s', userSelect:'none' }}>
                {parseInt(iso.split('-')[2])}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const label = from && to ? `${fmtDateFull(from)}  –  ${fmtDateFull(to)}` : from ? `From ${fmtDateFull(from)}` : 'Pick range';

  return (
    <div style={{ position:'relative' }}>
      {open && <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:99 }} />}
      <button onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:'1px solid '+(from||to ? C.topBg : C.border), background: from||to ? 'rgba(17,17,16,0.06)' : C.white, color: from||to ? C.topBg : C.text, fontSize:13, cursor:'pointer', fontFamily:"'DM Sans', sans-serif", fontWeight: from||to ? 600 : 400, whiteSpace:'nowrap', transition:'all 0.15s' }}>
        <span style={{ fontSize:12 }}>📅</span>
        <span>{label}</span>
        {(from || to) && (
          <span onClick={e => { e.stopPropagation(); onChange(null, null); }}
            style={{ marginLeft:2, width:15, height:15, borderRadius:3, background:C.surface2, color:C.muted, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, cursor:'pointer' }}>✕</span>
        )}
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:100, background:C.white, borderRadius:12, border:'1px solid '+C.border, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', padding:'18px 20px', minWidth:'fit-content' }}>
          <div style={{ display:'flex', gap:24 }}>
            {renderMonth(viewYear, viewMonth, true, false)}
            <div style={{ width:1, background:C.surface, alignSelf:'stretch' }} />
            {renderMonth(rightYear, rightMonth, false, true)}
          </div>
          {from && !to && <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid '+C.surface, textAlign:'center', fontSize:11, color:C.muted }}>Click an end date · click start again to reset</div>}
          {from && to && (
            <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid '+C.surface, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:C.muted }}>{fmtDateFull(from)} – {fmtDateFull(to)}</span>
              <button onClick={() => onChange(null, null)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:C.surface, color:C.text2, fontSize:11, fontWeight:600, cursor:'pointer' }}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PeriodPicker ──────────────────────────────────────────────────────────────

function PeriodPicker({ periodKey, periodFrom, periodTo, onChange }) {
  const sel = { padding:'7px 11px', borderRadius:8, border:'1px solid '+C.border, fontSize:13, color:C.text, background:C.white };
  function handlePreset(key) {
    if (key === 'custom') { onChange('custom', periodFrom, periodTo); return; }
    const p = PERIOD_PRESETS.find(p => p.key === key);
    if (p) onChange(p.key, p.from, p.to);
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <select value={periodKey} onChange={e => handlePreset(e.target.value)} style={sel}>
        {PERIOD_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        <option value="custom">Custom...</option>
      </select>
      {periodKey === 'custom' && (
        <DateRangePicker
          from={periodFrom || null}
          to={periodTo || null}
          onChange={(f, t) => onChange('custom', f || '', t || '')}
        />
      )}
    </div>
  );
}

// ── WorkingDaysChip ───────────────────────────────────────────────────────────

function WorkingDaysChip({ value, computedValue, onOverride, onReset }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const isOverridden = value !== computedValue;

  function start() { setDraft(String(value)); setEditing(true); }
  function commit() {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n > 0) onOverride(n); else onReset();
    setEditing(false);
  }

  if (editing) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 11px', borderRadius:8, background:C.surface, border:'1px solid '+C.topBg }}>
        <span style={{ fontSize:12, color:C.muted }}>Working days</span>
        <input autoFocus value={draft}
          onChange={e => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') setEditing(false); }}
          style={{ width:36, padding:'3px 6px', borderRadius:6, border:'1px solid '+C.topBg, fontSize:13, fontWeight:700, textAlign:'center', fontFamily:"'Inter', sans-serif" }} />
        <span style={{ fontSize:11, color:C.muted }}>days</span>
      </div>
    );
  }

  return (
    <div onClick={start} title="Click to adjust working days for this period"
      style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 11px', borderRadius:8, background:isOverridden ? '#FFFBEB' : C.surface, border:'1px solid '+(isOverridden ? '#FDE68A' : C.border), cursor:'pointer' }}>
      <span style={{ fontSize:12, color:C.muted }}>Working days</span>
      <span style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:13, color:C.text }}>{value}</span>
      {isOverridden ? (
        <span onClick={e => { e.stopPropagation(); onReset(); }}
          title={'Reset to computed ' + computedValue}
          style={{ fontSize:10, color:'#D97706', cursor:'pointer', marginLeft:2 }}>↺ {computedValue}</span>
      ) : (
        <span style={{ fontSize:10, color:C.border }}>✎</span>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Payroll({ onViewAttendance }) {
  const branchNames = [...new Set(PAYROLL_ENTRIES_V2.map(e => e.branch))].sort();

  const [selectedBranch, setSelectedBranch] = useState(branchNames[0] || 'Seminyak');

  const defaultPreset = PERIOD_PRESETS[0];
  const [periodKey,  setPeriodKey]  = useState(defaultPreset.key);
  const [periodFrom, setPeriodFrom] = useState(defaultPreset.from);
  const [periodTo,   setPeriodTo]   = useState(defaultPreset.to);

  const [workingDaysOverride, setWorkingDaysOverride] = useState(null);
  const computedWorkingDays = computeWorkingDays(periodFrom, periodTo);
  const workingDays = workingDaysOverride ?? computedWorkingDays;

  function handlePeriodChange(key, from, to) {
    setPeriodKey(key); setPeriodFrom(from); setPeriodTo(to);
    setWorkingDaysOverride(null);
  }

  const [overrides, setOverrides] = useState(() =>
    Object.fromEntries(PAYROLL_ENTRIES_V2.map(e => [e.id, {
      lateMin:          null,
      excusedTimes:     null,
      inexcusedTimes:   null,
      excusedFixed:     null,
      excusedProrata:   0,
      inexcusedFixed:   null,
      inexcusedProrata: 0,
    }]))
  );

  const [adjustments, setAdjustments] = useState(() =>
    Object.fromEntries(PAYROLL_ENTRIES_V2.map(e => [e.id, e.adjustments || []]))
  );

  const [showManageModal,  setShowManageModal]  = useState(false);
  const [showAddModal,     setShowAddModal]     = useState(false);
  const [adjModalEntryId,  setAdjModalEntryId]  = useState(null);

  function setOverride(entryId, fieldOrObj, val) {
    if (typeof fieldOrObj === 'object') {
      setOverrides(prev => ({ ...prev, [entryId]: { ...prev[entryId], ...fieldOrObj } }));
    } else {
      setOverrides(prev => ({ ...prev, [entryId]: { ...prev[entryId], [fieldOrObj]: val } }));
    }
  }

  function addAdjustment(entryId, adj) {
    setAdjustments(prev => ({ ...prev, [entryId]: [...(prev[entryId] || []), adj] }));
  }

  function deleteAdjustment(entryId, adjId) {
    setAdjustments(prev => ({ ...prev, [entryId]: (prev[entryId] || []).filter(a => a.id !== adjId) }));
  }

  function toggleKasbonDefer(entryId, adjId) {
    setAdjustments(prev => ({
      ...prev,
      [entryId]: (prev[entryId] || []).map(a =>
        a.id === adjId ? { ...a, deductPeriod: a.deductPeriod === 'current' ? 'next' : 'current' } : a
      ),
    }));
  }

  function openManage(entryId) {
    setAdjModalEntryId(entryId);
    setShowManageModal(true);
  }

  function openAdd(e, entryId) {
    e.stopPropagation();
    setAdjModalEntryId(entryId);
    setShowAddModal(true);
  }

  function calcNetPay(entry) {
    const ov               = overrides[entry.id] || {};
    const lateMin          = ov.lateMin          ?? entry.lateMinutesTotal;
    const inexcusedTimes   = ov.inexcusedTimes   ?? entry.inexcusedDays;
    const inexcusedFixed   = ov.inexcusedFixed   ?? inexcusedTimes;
    const inexcusedProrata = ov.inexcusedProrata ?? 0;
    const excusedTimes     = ov.excusedTimes     ?? entry.excusedDays;
    const excusedOver      = Math.max(0, excusedTimes - EXCUSED_QUOTA);
    const excusedFixed     = ov.excusedFixed     ?? excusedOver;
    const excusedProrata   = ov.excusedProrata   ?? 0;
    const prorataRate      = entry.baseSalary / workingDays;
    const lateDed          = lateMin * LATE_RATE_PER_MIN;
    const inexcusedDed     = inexcusedFixed * FLAT_OFF_RATE     + Math.round(inexcusedProrata * prorataRate);
    const excusedDed       = excusedFixed   * EXCUSED_OVER_RATE + Math.round(excusedProrata   * prorataRate);
    const adjs             = adjustments[entry.id] || [];
    const totalAdd         = adjs.filter(a => a.type === 'addition').reduce((s, a) => s + a.amount, 0);
    const totalDed         = adjs.filter(a => a.type === 'deduction' && !(a.isKasbon && a.deductPeriod === 'next')).reduce((s, a) => s + a.amount, 0);
    return entry.baseSalary + entry.commEarned - lateDed - inexcusedDed - excusedDed + totalAdd - totalDed;
  }

  function exportCSV() {
    const payrollForBranch = PAYROLL_ENTRIES_V2.filter(e => e.branch === selectedBranch);
    const header = 'Barber,Branch,Base Salary,Commission,Late Min,Late Ded,Excused Off,Excused Fixed Days,Excused Prorata Days,Excused Ded,Inexcused Off,Inexcused Fixed Days,Inexcused Prorata Days,Inexcused Ded,Kasbon,Additions,Other Ded,Net Pay';
    const rows = payrollForBranch.map(e => {
      const ov               = overrides[e.id] || {};
      const lateMin          = ov.lateMin          ?? e.lateMinutesTotal;
      const inexcusedTimes   = ov.inexcusedTimes   ?? e.inexcusedDays;
      const inexcusedFixed   = ov.inexcusedFixed   ?? inexcusedTimes;
      const inexcusedProrata = ov.inexcusedProrata ?? 0;
      const excusedTimes     = ov.excusedTimes     ?? e.excusedDays;
      const excusedOver      = Math.max(0, excusedTimes - EXCUSED_QUOTA);
      const excusedFixed     = ov.excusedFixed     ?? excusedOver;
      const excusedProrata   = ov.excusedProrata   ?? 0;
      const prorataRate      = e.baseSalary / workingDays;
      const lateDed          = lateMin * LATE_RATE_PER_MIN;
      const inexcusedDed     = inexcusedFixed * FLAT_OFF_RATE     + Math.round(inexcusedProrata * prorataRate);
      const excusedDed       = excusedFixed   * EXCUSED_OVER_RATE + Math.round(excusedProrata   * prorataRate);
      const adjs             = adjustments[e.id] || [];
      const kasbon           = adjs.filter(a => a.isKasbon && a.deductPeriod === 'current').reduce((s, a) => s + a.amount, 0);
      const totalAdd         = adjs.filter(a => a.type === 'addition').reduce((s, a) => s + a.amount, 0);
      const otherDed         = adjs.filter(a => a.type === 'deduction' && !a.isKasbon && a.deductPeriod === 'current').reduce((s, a) => s + a.amount, 0);
      const net              = calcNetPay(e);
      return [e.barber, e.branch, e.baseSalary, e.commEarned, lateMin, lateDed, excusedTimes, excusedFixed, excusedProrata, excusedDed, inexcusedTimes, inexcusedFixed, inexcusedProrata, inexcusedDed, kasbon, totalAdd, otherDed, net].join(',');
    });
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `payroll_${selectedBranch.replace(/\s+/g, '_')}_${periodKey}.csv` }).click();
    URL.revokeObjectURL(url);
  }

  const payrollForBranch = PAYROLL_ENTRIES_V2.filter(e => e.branch === selectedBranch);
  const totalNet         = payrollForBranch.reduce((s, e) => s + calcNetPay(e), 0);
  const adjModalEntry    = adjModalEntryId ? PAYROLL_ENTRIES_V2.find(e => e.id === adjModalEntryId) : null;

  const PGRID = '1.4fr 0.8fr 0.9fr 0.75fr 0.9fr 1.15fr 1.15fr 0.85fr 0.9fr 0.85fr 0.65fr 0.7fr';

  return (
    <div style={{ padding: '28px 32px' }}>

      {showManageModal && adjModalEntry && (
        <ManageAdjModal
          entry={adjModalEntry}
          adjustments={adjustments[adjModalEntry.id] || []}
          onDelete={id   => deleteAdjustment(adjModalEntry.id, id)}
          onToggleDefer={id => toggleKasbonDefer(adjModalEntry.id, id)}
          onClose={() => { setShowManageModal(false); setAdjModalEntryId(null); }}
        />
      )}
      {showAddModal && adjModalEntry && (
        <AddAdjModal
          entry={adjModalEntry}
          onAdd={adj => addAdjustment(adjModalEntry.id, adj)}
          onClose={() => { setShowAddModal(false); setAdjModalEntryId(null); }}
        />
      )}
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Payroll</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Period payroll — base salary + commission + deductions</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onViewAttendance && (
            <button onClick={onViewAttendance}
              style={{ padding: '9px 16px', borderRadius: 8, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: '1px solid ' + C.border, cursor: 'pointer' }}>
              ← Attendance
            </button>
          )}
          <button onClick={exportCSV}
            style={{ padding: '9px 16px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Period picker + working days + branch selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <PeriodPicker periodKey={periodKey} periodFrom={periodFrom} periodTo={periodTo} onChange={handlePeriodChange} />
          <WorkingDaysChip
            value={workingDays}
            computedValue={computedWorkingDays}
            onOverride={n => setWorkingDaysOverride(n)}
            onReset={() => setWorkingDaysOverride(null)}
          />
        </div>
        <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid ' + C.border, background: C.white, fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
          {branchNames.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      {/* Payroll table */}
      <div className="admin-card" style={{ overflow:'auto' }}>
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:PGRID, padding:'10px 18px', borderBottom:'1px solid '+C.border, minWidth:1150 }}>
          {[
            { label:'Barber' },
            { label:'Base Salary' },
            { label:'Commission',    sub:'regular' },
            { label:'OT Comm.',       sub:'overtime' },
            { label:'Late',          sub:'min · auto deduction' },
            { label:'Excused Off',   sub:'flat / pro-rata split' },
            { label:'Inexcused Off', sub:'flat / pro-rata split' },
            { label:'Kasbon',        sub:'calendar month' },
            { label:'Additions' },
            { label:'Other Ded.' },
            { label:'Net Pay' },
            { label:'' },
          ].map((h, i) => (
            <div key={i}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:C.muted }}>{h.label}</div>
              {h.sub && <div style={{ fontSize:9, color:C.border, marginTop:1 }}>{h.sub}</div>}
            </div>
          ))}
        </div>

        {payrollForBranch.length === 0 && (
          <div style={{ padding:'40px 0', textAlign:'center', color:C.muted, fontSize:13 }}>No payroll entries for this branch.</div>
        )}

        {payrollForBranch.map((entry, i) => {
          const ov               = overrides[entry.id] || {};
          const lateMin          = ov.lateMin          ?? entry.lateMinutesTotal;
          const excusedTimes     = ov.excusedTimes     ?? entry.excusedDays;
          const inexcusedTimes   = ov.inexcusedTimes   ?? entry.inexcusedDays;
          const excusedOver      = Math.max(0, excusedTimes - EXCUSED_QUOTA);
          const excusedFixed     = ov.excusedFixed     ?? excusedOver;
          const excusedProrata   = ov.excusedProrata   ?? 0;
          const inexcusedFixed   = ov.inexcusedFixed   ?? inexcusedTimes;
          const inexcusedProrata = ov.inexcusedProrata ?? 0;
          const prorataRate      = Math.round(entry.baseSalary / workingDays);
          const lateDed          = lateMin * LATE_RATE_PER_MIN;
          const excusedDed       = excusedFixed   * EXCUSED_OVER_RATE + Math.round(excusedProrata   * prorataRate);
          const inexcusedDed     = inexcusedFixed * FLAT_OFF_RATE     + Math.round(inexcusedProrata * prorataRate);
          const adjs             = adjustments[entry.id] || [];
          const kasbonActive     = adjs.filter(a => a.isKasbon && a.type === 'deduction' && a.deductPeriod === 'current');
          const kasbonDeferred   = adjs.filter(a => a.isKasbon && a.deductPeriod === 'next');
          const kasbonTotal      = kasbonActive.reduce((s, a) => s + a.amount, 0);
          const totalAdd         = adjs.filter(a => a.type === 'addition').reduce((s, a) => s + a.amount, 0);
          const otherDed         = adjs.filter(a => a.type === 'deduction' && !a.isKasbon && a.deductPeriod === 'current').reduce((s, a) => s + a.amount, 0);
          const net              = calcNetPay(entry);

          return (
            <div key={entry.id}
              style={{ display:'grid', gridTemplateColumns:PGRID, padding:'13px 18px', borderBottom: i < payrollForBranch.length - 1 ? '1px solid '+C.surface : 'none', alignItems:'start', minWidth:1150 }}>

              {/* Barber */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:C.topBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:10, color:C.accent }}>{entry.initials}</span>
                </div>
                <div>
                  <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:600, fontSize:13, color:C.text }}>{entry.barber}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{entry.presentDays} days present</div>
                </div>
              </div>

              {/* Base salary */}
              <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:600, fontSize:12, color:C.text2, paddingTop:3 }}>{fmtM(entry.baseSalary)}</div>

              {/* Commission — regular */}
              <div style={{ paddingTop:2 }}>
                <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:12, color:'#16A34A' }}>{fmtM(entry.commRegular)}</div>
              </div>

              {/* OT Commission */}
              <div style={{ paddingTop:2 }}>
                {entry.commOT > 0 ? (
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:12, color:'#D97706' }}>+{fmtM(entry.commOT)}</div>
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3, background:'#FFFBEB', color:'#D97706', border:'1px solid #FDE68A' }}>OT</span>
                  </div>
                ) : (
                  <span style={{ fontSize:11, color:C.border }}>—</span>
                )}
              </div>

              {/* Late */}
              <div>
                <div style={{ marginBottom:4 }}>
                  <InlineNum value={lateMin} onCommit={v => setOverride(entry.id, 'lateMin', v)} suffix=" min" color="#D97706" />
                </div>
                {lateDed > 0
                  ? <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:12, color:'#DC2626' }}>−{fmtM(lateDed)}</div>
                  : <span style={{ fontSize:11, color:C.border }}>—</span>
                }
                {lateMin > 0 && <div style={{ fontSize:9, color:C.muted, marginTop:1 }}>Rp 2.000/min</div>}
              </div>

              {/* Excused Off */}
              <div>
                <div style={{ display:'flex', alignItems:'baseline', gap:5, marginBottom:5 }}>
                  <InlineNum value={excusedTimes} onCommit={v => setOverride(entry.id, { excusedTimes:v, excusedFixed:Math.max(0, v - EXCUSED_QUOTA), excusedProrata:0 })} suffix="×" color="#2563EB" />
                  <span style={{ fontSize:9, color:C.muted }}>
                    {excusedOver > 0 ? `${excusedOver} charged` : 'within quota'}
                  </span>
                </div>
                {(excusedFixed > 0 || excusedProrata > 0) ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <InlineNum value={excusedFixed} onCommit={v => setOverride(entry.id, 'excusedFixed', v)} suffix="× flat" color="#DC2626" />
                      {excusedFixed > 0 && <span style={{ fontSize:10, color:'#DC2626' }}>−{fmtM(excusedFixed * EXCUSED_OVER_RATE)}</span>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <InlineNum value={excusedProrata} onCommit={v => setOverride(entry.id, 'excusedProrata', v)} suffix="× ÷" color="#DC2626" />
                      <span style={{ fontSize:9, color:C.muted }}>{workingDays}d</span>
                      {excusedProrata > 0 && <span style={{ fontSize:10, color:'#DC2626' }}>−{fmtM(Math.round(excusedProrata * prorataRate))}</span>}
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#DC2626', borderTop:'1px solid #FEE2E2', paddingTop:3 }}>−{fmtM(excusedDed)}</div>
                  </div>
                ) : (
                  <span style={{ fontSize:11, color:C.border }}>—</span>
                )}
              </div>

              {/* Inexcused Off */}
              <div>
                <div style={{ display:'flex', alignItems:'baseline', gap:5, marginBottom:5 }}>
                  <InlineNum value={inexcusedTimes} onCommit={v => setOverride(entry.id, { inexcusedTimes:v, inexcusedFixed:v, inexcusedProrata:0 })} suffix="×" color="#DC2626" />
                  {inexcusedTimes > 0 && <span style={{ fontSize:9, color:C.muted }}>all charged</span>}
                </div>
                {(inexcusedFixed > 0 || inexcusedProrata > 0) ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <InlineNum value={inexcusedFixed} onCommit={v => setOverride(entry.id, 'inexcusedFixed', v)} suffix="× flat" color="#DC2626" />
                      {inexcusedFixed > 0 && <span style={{ fontSize:10, color:'#DC2626' }}>−{fmtM(inexcusedFixed * FLAT_OFF_RATE)}</span>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <InlineNum value={inexcusedProrata} onCommit={v => setOverride(entry.id, 'inexcusedProrata', v)} suffix="× ÷" color="#DC2626" />
                      <span style={{ fontSize:9, color:C.muted }}>{workingDays}d</span>
                      {inexcusedProrata > 0 && <span style={{ fontSize:10, color:'#DC2626' }}>−{fmtM(Math.round(inexcusedProrata * prorataRate))}</span>}
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#DC2626', borderTop:'1px solid #FEE2E2', paddingTop:3 }}>−{fmtM(inexcusedDed)}</div>
                  </div>
                ) : (
                  <span style={{ fontSize:11, color:C.border }}>—</span>
                )}
              </div>

              {/* Kasbon */}
              <div style={{ paddingTop:2 }}>
                {kasbonTotal > 0 ? (
                  <>
                    <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:12, color:'#D97706' }}>−{fmtM(kasbonTotal)}</div>
                    <div style={{ fontSize:9, color:'#D97706', marginTop:2 }}>{kasbonActive.length} entry</div>
                  </>
                ) : (
                  <span style={{ fontSize:11, color:C.border }}>—</span>
                )}
                {kasbonDeferred.length > 0 && (
                  <div style={{ fontSize:9, color:C.muted, marginTop:3 }}>
                    {fmtM(kasbonDeferred.reduce((s,a) => s+a.amount, 0))} deferred
                  </div>
                )}
              </div>

              {/* Additions */}
              <div style={{ paddingTop:2 }}>
                {totalAdd > 0 ? (
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:12, color:'#16A34A' }}>+{fmtM(totalAdd)}</span>
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 4px', borderRadius:3, background:'#F0FDF4', color:'#16A34A' }}>{adjs.filter(a => a.type === 'addition').length}</span>
                  </div>
                ) : <span style={{ fontSize:11, color:C.border }}>—</span>}
              </div>

              {/* Other deductions */}
              <div style={{ paddingTop:2 }}>
                {otherDed > 0 ? (
                  <span style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:12, color:'#DC2626' }}>−{fmtM(otherDed)}</span>
                ) : <span style={{ fontSize:11, color:C.border }}>—</span>}
              </div>

              {/* Net pay */}
              <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:13, color:C.text, paddingTop:3 }}>{fmtM(net)}</div>

              {/* Actions */}
              <div style={{ display:'flex', flexDirection:'column', gap:5, paddingTop:2 }}>
                <button onClick={e => openAdd(e, entry.id)}
                  style={{ padding:'3px 10px', borderRadius:5, border:'1px solid '+C.border, background:C.white, fontSize:11, fontWeight:700, color:C.text2, cursor:'pointer' }}>
                  + Add
                </button>
                {adjs.length > 0 && (
                  <button onClick={e => { e.stopPropagation(); openManage(entry.id); }}
                    style={{ padding:'3px 10px', borderRadius:5, border:'1px solid '+C.border, background:C.surface, fontSize:11, fontWeight:600, color:C.text2, cursor:'pointer' }}>
                    Manage
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Totals row */}
        {payrollForBranch.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:PGRID, padding:'13px 18px', background:C.topBg, borderRadius:'0 0 11px 11px', minWidth:1150 }}>
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:13, color:C.white }}>Total Payout</div>
            <div />
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:12, color:C.accent }}>
              {fmtM(payrollForBranch.reduce((s, e) => s + e.commRegular, 0))}
            </div>
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:12, color:'#FDE68A' }}>
              {payrollForBranch.some(e => e.commOT > 0)
                ? '+' + fmtM(payrollForBranch.reduce((s, e) => s + e.commOT, 0))
                : '—'}
            </div>
            <div /><div /><div />
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:12, color:'#FDE68A' }}>
              {fmtM(payrollForBranch.reduce((s, e) => s + (adjustments[e.id]||[]).filter(a => a.isKasbon && a.deductPeriod==='current').reduce((x,a)=>x+a.amount,0), 0))}
            </div>
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:12, color:C.accent }}>
              {fmtM(payrollForBranch.reduce((s, e) => s + (adjustments[e.id]||[]).filter(a=>a.type==='addition').reduce((x,a)=>x+a.amount,0), 0))}
            </div>
            <div />
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:14, color:C.accent }}>{fmtM(totalNet)}</div>
            <div />
          </div>
        )}
      </div>

      <div style={{ marginTop:10, fontSize:11, color:C.muted }}>
        Use + Add to add adjustments. Kasbon deferral can also be set when logging in Expenses.
      </div>
    </div>
  );
}
