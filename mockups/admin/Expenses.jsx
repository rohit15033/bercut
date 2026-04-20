/**
 * MOCKUP — Bercut Admin: Expenses
 *
 * What it does: Log and review branch expenses. Three explicit types:
 *   Regular — operational spend (petty cash / utilities / equipment / etc.)
 *   Inventory — stock purchase; same as regular but links to inventory item
 *     and distributes qty across branches with auto unit-cost calculation.
 *   Kasbon — salary advance tied to a specific barber; auto-deducted from
 *     that barber's payroll at month-end. Logged as expense for cash-flow tracking.
 * State managed: expenses, cats, expType, form state, filters, showForm, showCreateCat
 * Production API:
 *   GET  /api/expenses?branch_id=&from=&to=&type=
 *   POST /api/expenses (multipart/form-data, always includes receipt file)
 *   GET/POST/PATCH /api/expense-categories
 *   GET  /api/inventory/items  (for stock item picker)
 *   GET  /api/barbers           (for kasbon barber picker)
 * Feeds into:
 *   inventory_movements (backend creates stock-in rows when type=inventory)
 *   payroll_entries (backend reads kasbon expenses per barber per period)
 *
 * CSV export — inventory rows:
 *   Multi-branch inventory expenses export ONE ROW PER DISTRIBUTION LINE, not as an array.
 *   Columns: date, expense_id, item_name, unit, branch, qty, cost, unit_cost_approx, total_amount, source, by, receipt
 *   Rounding note: unit_cost_approx may not equal cost/qty exactly (LRM rounding); total_amount is always authoritative.
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Expenses.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState, useRef } from 'react';
import { C, EXPENSES, EXPENSE_CATEGORIES, INVENTORY, ALL_BARBERS, PURCHASE_ORDERS, fmt, fmtM } from './data.js';

const COLOR_PRESETS = ['#7C3AED','#2563EB','#D97706','#DC2626','#16A34A','#0891B2','#9333EA','#6B7280'];

const BRANCHES_ALL = ['Seminyak','Canggu','Ubud','Uluwatu','Sanur','Dewi Sri','Nusa Dua','Legian','Jimbaran','Denpasar'];
const BRANCH_OPTIONS = [...BRANCHES_ALL, 'Head Office'];
const DIST_BRANCH_OPTIONS = [...BRANCHES_ALL, 'Head Office'];

// Shared label style
const LS = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 };

// Date helpers — store as ISO YYYY-MM-DD, display as "April 16 2026"
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDate(s) {
  if (!s) return '—';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;  // legacy fallback
  return `${MONTH_NAMES[parseInt(m[2])-1]} ${parseInt(m[3])} ${m[1]}`;
}

// Smart distribution — Largest Remainder Method
// Guarantees sum(costs) === totalAmount regardless of non-integer unit costs
function computeSmartDist(totalAmount, lines) {
  const valid = lines.map((l, i) => ({ i, qty: Number(l.qty) || 0 })).filter(l => l.qty > 0 && lines[l.i].branch);
  const totalQty = valid.reduce((s, l) => s + l.qty, 0);
  if (!totalAmount || totalQty === 0) return lines.map(() => null);

  const exact   = valid.map(l => totalAmount * l.qty / totalQty);
  const floored = exact.map(v => Math.floor(v));
  const fracs   = exact.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  const remainder = totalAmount - floored.reduce((s, v) => s + v, 0);
  const costs = [...floored];
  for (let k = 0; k < remainder; k++) costs[fracs[k].i]++;

  // Map back to full lines array (including incomplete rows → null)
  let vIdx = 0;
  return lines.map(l => (l.branch && (Number(l.qty) || 0) > 0) ? costs[vIdx++] : null);
}

// ── Create Category modal ─────────────────────────────────────────────────────

function CategoryModal({ onConfirm, onClose }) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#2563EB');

  function handleConfirm() {
    if (!label.trim()) return;
    const key = label.trim().toLowerCase().replace(/\s+/g, '_');
    onConfirm({ id: Date.now(), key, label: label.trim(), color, bg: color + '22', isActive: true });
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="admin-card" style={{ width:380, padding:'24px 28px', animation:'scaleIn 0.18s ease both' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:17, color:C.text }}>New Expense Category</div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:6, border:'none', background:C.surface, color:C.muted, cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ ...LS, color:C.muted }}>Category Label *</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Marketing, Rent, Transport..." autoFocus
            style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'1.5px solid '+C.border, fontSize:13, color:C.text, boxSizing:'border-box' }} />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ ...LS, color:C.muted }}>Colour</label>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {COLOR_PRESETS.map(clr => (
              <div key={clr} onClick={() => setColor(clr)}
                style={{ width:28, height:28, borderRadius:'50%', background:clr, cursor:'pointer', outline: color===clr ? '3px solid '+C.topBg : '2px solid transparent', outlineOffset:2, transition:'outline 0.1s' }} />
            ))}
          </div>
          {label.trim() && (
            <div style={{ marginTop:10 }}>
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:5, background:color+'22', color }}>{label.trim()} — preview</span>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', borderRadius:8, background:C.surface, color:C.text2, fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:13, border:'none', cursor:'pointer' }}>Cancel</button>
          <button onClick={handleConfirm} disabled={!label.trim()}
            style={{ flex:2, padding:'10px', borderRadius:8, background:label.trim()?C.topBg:C.surface2, color:label.trim()?C.white:C.muted, fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:13, border:'none', cursor:label.trim()?'pointer':'not-allowed' }}>
            Create Category
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Date input — shows formatted text, opens native picker on click ──────────

function DateInput({ value, onChange, style }) {
  const ref = useRef(null);
  return (
    <div onClick={() => ref.current?.showPicker()}
      style={{ ...style, display:'flex', alignItems:'center', cursor:'pointer', userSelect:'none' }}>
      <span style={{ fontSize:13, color: value ? C.text : C.muted }}>
        {value ? fmtDate(value) : 'Select date'}
      </span>
      <input ref={ref} type="date" value={value} onChange={onChange}
        style={{ position:'absolute', opacity:0, pointerEvents:'none', width:0, height:0 }} />
    </div>
  );
}

// ── Date range picker — two months side by side ──────────────────────────────

function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(null);
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based

  const rightMonth = viewMonth === 11 ? 0            : viewMonth + 1;
  const rightYear  = viewMonth === 11 ? viewYear + 1 : viewYear;

  function prev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function next() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function handleDay(iso) {
    if (!from || to || iso < from) {
      onChange(iso, null);   // new start
    } else if (iso === from) {
      onChange(null, null);  // deselect
    } else {
      onChange(from, iso);   // complete range
      setOpen(false);
    }
  }

  function renderMonth(year, month, showPrev, showNext) {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInM  = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInM; d++) {
      cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const hoverEnd    = !to && from && hover && hover >= from ? hover : null;
    const effectiveTo = to || hoverEnd;

    return (
      <div style={{ width:216 }}>
        {/* Month header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          {showPrev
            ? <button onClick={prev}  style={{ width:26, height:26, borderRadius:6, border:'none', background:C.surface, color:C.text, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
            : <div style={{ width:26 }} />}
          <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:13, color:C.text }}>
            {MONTH_NAMES[month]} {year}
          </div>
          {showNext
            ? <button onClick={next} style={{ width:26, height:26, borderRadius:6, border:'none', background:C.surface, color:C.text, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
            : <div style={{ width:26 }} />}
        </div>
        {/* Day-of-week headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', marginBottom:4 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ fontSize:9, fontWeight:700, color:C.muted, textAlign:'center', padding:'2px 0', textTransform:'uppercase' }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:1 }}>
          {cells.map((iso, idx) => {
            if (!iso) return <div key={`e${idx}`} />;
            const isStart    = iso === from;
            const isEnd      = iso === to;
            const isHoverEnd = iso === hoverEnd;
            const inRange    = !!from && !!effectiveTo && iso > from && iso < effectiveTo;
            const isTod      = iso === todayISO();
            const active     = isStart || isEnd;
            const bg = active       ? C.topBg
                     : isHoverEnd   ? 'rgba(17,17,16,0.2)'
                     : inRange      ? '#F5E20055'
                     : 'transparent';
            const clr = active || isHoverEnd ? '#fff' : C.text;
            return (
              <div key={iso}
                onClick={() => handleDay(iso)}
                onMouseEnter={() => { if (from && !to) setHover(iso); }}
                onMouseLeave={() => { if (from && !to) setHover(null); }}
                style={{
                  textAlign:'center', padding:'6px 2px', borderRadius:6, cursor:'pointer',
                  fontSize:11, fontWeight: active ? 700 : isTod ? 600 : 400,
                  background: bg, color: clr,
                  outline: isTod && !active ? '1.5px solid '+C.border : 'none',
                  outlineOffset:-1, transition:'background 0.08s', userSelect:'none',
                }}>
                {parseInt(iso.split('-')[2])}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const label = from && to
    ? `${fmtDate(from)}  –  ${fmtDate(to)}`
    : from ? `From ${fmtDate(from)}` : 'All Dates';

  return (
    <div style={{ position:'relative' }}>
      {open && <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:99 }} />}
      <button onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:'1px solid '+(from||to ? C.topBg : C.border), background: from||to ? 'rgba(17,17,16,0.06)' : C.white, color: from||to ? C.topBg : C.text, fontSize:13, cursor:'pointer', fontFamily:"'DM Sans', sans-serif", fontWeight: from||to ? 600 : 400, whiteSpace:'nowrap', transition:'all 0.15s' }}>
        <span style={{ fontSize:12 }}>📅</span>
        <span>{label}</span>
        {(from || to) && (
          <span onClick={e => { e.stopPropagation(); onChange(null, null); }}
            style={{ marginLeft:2, width:15, height:15, borderRadius:3, background:C.surface2, color:C.muted, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, cursor:'pointer' }}>
            ✕
          </span>
        )}
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:100, background:C.white, borderRadius:12, border:'1px solid '+C.border, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', padding:'18px 20px', minWidth:'fit-content' }}>
          <div style={{ display:'flex', gap:24 }}>
            {renderMonth(viewYear, viewMonth, true, false)}
            <div style={{ width:1, background:C.surface, alignSelf:'stretch' }} />
            {renderMonth(rightYear, rightMonth, false, true)}
          </div>
          {from && !to && (
            <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid '+C.surface, textAlign:'center', fontSize:11, color:C.muted }}>
              Click an end date · click the start again to reset
            </div>
          )}
          {from && to && (
            <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid '+C.surface, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:C.muted }}>{fmtDate(from)} – {fmtDate(to)}</span>
              <button onClick={() => onChange(null, null)}
                style={{ padding:'4px 10px', borderRadius:6, border:'none', background:C.surface, color:C.text2, fontSize:11, fontWeight:600, cursor:'pointer' }}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DateFilter({ from, to, onChange }) {
  const todayD = new Date();
  const [mode, setMode] = useState('month');
  const [my, setMy] = useState({ year: todayD.getFullYear(), month: todayD.getMonth() });

  function monthRange(year, month) {
    const f    = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const last = new Date(year, month+1, 0).getDate();
    const t    = `${year}-${String(month+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`;
    return [f, t];
  }
  function switchMonth() {
    const [f, t] = monthRange(my.year, my.month);
    onChange(f, t);
    setMode('month');
  }
  function prevMonth() {
    let m = my.month - 1, y = my.year;
    if (m < 0) { m = 11; y--; }
    setMy({ year:y, month:m });
    const [f, t] = monthRange(y, m);
    onChange(f, t);
  }
  function nextMonth() {
    let m = my.month + 1, y = my.year;
    if (m > 11) { m = 0; y++; }
    setMy({ year:y, month:m });
    const [f, t] = monthRange(y, m);
    onChange(f, t);
  }

  const btnStyle = (active) => ({
    padding:'4px 12px', borderRadius:5, border:'none',
    background: active ? C.topBg : 'transparent',
    color: active ? C.white : C.muted,
    fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:12, cursor:'pointer',
  });

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      {/* Mode toggle */}
      <div style={{ display:'flex', gap:2, background:C.surface, padding:2, borderRadius:7 }}>
        <button style={btnStyle(mode==='month')}  onClick={switchMonth}>Month</button>
        <button style={btnStyle(mode==='custom')} onClick={() => setMode('custom')}>Custom</button>
      </div>

      {/* Month navigator */}
      {mode === 'month' && (
        <div style={{ display:'flex', alignItems:'center', gap:0, background:C.white, border:'1px solid '+C.border, borderRadius:8, overflow:'hidden' }}>
          <button onClick={prevMonth} style={{ padding:'6px 11px', border:'none', background:'transparent', cursor:'pointer', fontSize:14, color:C.text2, lineHeight:1, borderRight:'1px solid '+C.border }}>‹</button>
          <span style={{ padding:'6px 14px', fontSize:13, fontWeight:600, color:C.text, minWidth:118, textAlign:'center', userSelect:'none' }}>
            {MONTH_NAMES[my.month]} {my.year}
          </span>
          <button onClick={nextMonth} style={{ padding:'6px 11px', border:'none', background:'transparent', cursor:'pointer', fontSize:14, color:C.text2, lineHeight:1, borderLeft:'1px solid '+C.border }}>›</button>
        </div>
      )}

      {/* Custom range picker */}
      {mode === 'custom' && (
        <DateRangePicker from={from} to={to} onChange={onChange} />
      )}
    </div>
  );
}

// LRM attribution — same principle as computeSmartDist but per-payment
// Returns [{branch, amount}] summing exactly to paymentAmount
function computeAttribLRM(paymentAmount, validDists, totalQtyLocal) {
  if (!paymentAmount || totalQtyLocal === 0) return validDists.map(l => ({ branch: l.branch, amount: 0 }));
  const exact   = validDists.map(l => paymentAmount * Number(l.qty) / totalQtyLocal);
  const floored = exact.map(v => Math.floor(v));
  const fracs   = exact.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  const remainder = paymentAmount - floored.reduce((s, v) => s + v, 0);
  const amounts = [...floored];
  for (let k = 0; k < remainder; k++) amounts[fracs[k].i]++;
  return validDists.map((l, i) => ({ branch: l.branch, amount: amounts[i] }));
}

// ── Distribution line row ─────────────────────────────────────────────────────

function DistLine({ line, idx, onUpdate, onRemove, lineCost }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.6fr 0.8fr 1.2fr auto', gap:8, alignItems:'center', background:C.bg, borderRadius:8, padding:'8px 10px', border:'1px solid '+C.border }}>
      <select value={line.branch} onChange={e => onUpdate(idx, 'branch', e.target.value)}
        style={{ padding:'7px 9px', borderRadius:7, border:'1px solid '+C.border, background:C.white, fontSize:12, color:line.branch?C.text:C.muted }}>
        <option value="">— Branch / Destination —</option>
        {DIST_BRANCH_OPTIONS.map(b => (
          <option key={b} value={b}>{b === 'Head Office' ? '🏢 Head Office (hold for later)' : b}</option>
        ))}
      </select>
      <input type="number" value={line.qty} onChange={e => onUpdate(idx, 'qty', e.target.value)} placeholder="Qty"
        style={{ padding:'7px 9px', borderRadius:7, border:'1px solid '+C.border, fontSize:12, color:C.text, background:C.white }} />
      <div style={{ fontSize:12, color:lineCost?C.text2:C.muted, fontWeight:lineCost?600:400, fontFamily:"'Inter', sans-serif" }}>
        {lineCost ? fmt(lineCost) : '—'}
      </div>
      <button onClick={() => onRemove(idx)}
        style={{ width:26, height:26, borderRadius:6, border:'none', background:'#FEE2E2', color:C.danger, cursor:'pointer', fontSize:13, fontWeight:700 }}>✕</button>
    </div>
  );
}

// ── P&L per branch ────────────────────────────────────────────────────────────

const PL_DATA = [
  { branch:'Seminyak',    revenue:1850000, expenses:645000  },
  { branch:'Canggu',      revenue:1120000, expenses:900000  },
  { branch:'Ubud',        revenue:650000,  expenses:210000  },
  { branch:'Uluwatu',     revenue:1450000, expenses:350000  },
  { branch:'Sanur',       revenue:780000,  expenses:180000  },
  { branch:'Dewi Sri',    revenue:2100000, expenses:200000  },
  { branch:'Head Office', revenue:0,       expenses:1200000 },
];

// ── Receipt upload ────────────────────────────────────────────────────────────

function ReceiptField({ receipt, onSet, onClear, error }) {
  function handleChange(e) {
    const file = e.target.files?.[0];
    if (file) onSet({ name: file.name, size: Math.round(file.size / 1024) + ' KB' });
  }
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ ...LS, color: error ? C.danger : C.muted }}>
        Receipt *
        {error && <span style={{ fontWeight:400, textTransform:'none', fontSize:10, marginLeft:6, color:C.danger }}>Receipt is required</span>}
      </label>
      <label style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, border:'1.5px dashed '+(receipt?'#16A34A':error?C.danger:C.border), background:receipt?'#F0FDF4':error?'#FEF2F2':C.bg, cursor:'pointer', transition:'all 0.15s' }}>
        <input type="file" accept="image/*,.pdf" onChange={handleChange} style={{ display:'none' }} />
        {receipt ? (
          <>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#16A34A' }}>{receipt.name}</div>
              <div style={{ fontSize:11, color:C.muted }}>{receipt.size}</div>
            </div>
            <button onClick={e => { e.preventDefault(); onClear(); }}
              style={{ marginLeft:'auto', padding:'3px 8px', borderRadius:5, border:'none', background:'#DCFCE7', color:'#16A34A', fontSize:11, fontWeight:600, cursor:'pointer' }}>
              Remove
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize:13, color: error ? C.danger : C.muted }}>Click to attach receipt (JPG, PNG, PDF)</span>
          </>
        )}
      </label>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Expenses() {
  const [expenses,      setExpenses]      = useState(EXPENSES);
  const [showForm,      setShowForm]      = useState(false);
  const [filterBranch,  setFilterBranch]  = useState('All');
  const [filterType,    setFilterType]    = useState('all');
  const [filterCat,     setFilterCat]     = useState('All');   // regular only
  const [filterItem,    setFilterItem]    = useState('All');   // inventory only
  const [filterBarber,  setFilterBarber]  = useState('All');   // kasbon only
  const [filterFrom,    setFilterFrom]    = useState(() => {    // default: start of current month
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  });
  const [filterTo,      setFilterTo]      = useState(() => {    // default: end of current month
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`;
  });

  function handleFilterTypeChange(val) {
    setFilterType(val);
    // reset all tertiary filters on type switch
    setFilterCat('All'); setFilterItem('All'); setFilterBarber('All');
  }

  const [cats,          setCats]          = useState(EXPENSE_CATEGORIES.map(c => ({ ...c })));
  const [showCreateCat, setShowCreateCat] = useState(false);

  const activeCats = cats.filter(c => c.isActive);

  function handleCatCreated(newCat) {
    setCats(c => [...c, newCat]);
    setFCat(newCat.key);
    setShowCreateCat(false);
  }

  // ── Form state ──────────────────────────────────────────────────────────────
  const [expType,       setExpType]       = useState('regular');   // 'regular' | 'inventory' | 'kasbon'
  const [fBranch,       setFBranch]       = useState('Seminyak');
  const [fCat,          setFCat]          = useState('supplies');
  const [fSource,       setFSource]       = useState('petty_cash');
  const [fAmount,       setFAmount]       = useState('');
  const [fDesc,         setFDesc]         = useState('');
  const [fDate,         setFDate]         = useState(todayISO);
  const [fReceipt,      setFReceipt]      = useState(null);
  const [fBarberId,     setFBarberId]     = useState('');          // kasbon only
  const [fDeductPeriod, setFDeductPeriod] = useState('current');   // kasbon only

  // Inventory state
  const [stockItemId, setStockItemId] = useState('');
  const [distLines,   setDistLines]   = useState([{ branch:'', qty:'' }]);

  // Purchase Order state
  const [purchaseOrders, setPurchaseOrders] = useState(PURCHASE_ORDERS.map(p => ({ ...p })));
  const [poMode,         setPoMode]         = useState('full');       // 'full' | 'po_new' | 'po_add'
  const [selectedPoId,   setSelectedPoId]   = useState('');
  const [fTotalOrderAmt, setFTotalOrderAmt] = useState('');
  const [isFinalPayment, setIsFinalPayment] = useState(true);

  const [saved,      setSaved]      = useState(false);
  const [errors,     setErrors]     = useState({});
  const [expandedId, setExpandedId] = useState(null);  // inline inventory detail
  const [poModalId,  setPoModalId]  = useState(null);  // PO payments modal
  const formRef = useRef(null);

  // Derived stock calculations (inventory type only)
  const selectedItem   = INVENTORY.find(i => i.id === +stockItemId) ?? null;
  const totalQty       = distLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const amt            = parseInt(fAmount) || 0;
  const smartCosts     = computeSmartDist(amt, distLines);                      // full-payment / display
  const exactUnitCost  = amt > 0 && totalQty > 0 ? amt / totalQty : 0;
  const isExactUnit    = amt > 0 && totalQty > 0 && amt % totalQty === 0;
  const unitCostApprox = Math.round(exactUnitCost);

  function switchType(newType) {
    setExpType(newType);
    setFAmount(''); setFDesc(''); setFReceipt(null); setErrors({});
    setFBranch('Seminyak'); setFCat('supplies'); setFSource('petty_cash');
    setFBarberId(''); setFDeductPeriod('current'); setFDate(todayISO());
    setStockItemId(''); setDistLines([{ branch:'', qty:'' }]);
    setPoMode('full'); setSelectedPoId(''); setFTotalOrderAmt(''); setIsFinalPayment(true);
  }

  function openPoForm(poId) {
    setShowForm(true);
    setExpType('inventory');
    setPoMode('po_add');
    setSelectedPoId(poId);
    setIsFinalPayment(true);
    setDistLines([{ branch:'', qty:'' }]);
    setErrors({});
    setTimeout(() => formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 60);
  }

  function handleCatSelect(val) {
    if (val === '__create__') setShowCreateCat(true);
    else setFCat(val);
  }

  function updateDistLine(idx, field, val) {
    setDistLines(lines => lines.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  }
  function addDistLine()       { setDistLines(l => [...l, { branch:'', qty:'' }]); }
  function removeDistLine(idx) { setDistLines(l => l.filter((_, i) => i !== idx)); }

  const openPOs     = purchaseOrders.filter(p => p.status === 'open');
  const selectedPO  = purchaseOrders.find(p => p.id === selectedPoId) ?? null;
  const poRemaining = selectedPO ? selectedPO.totalOrderAmount - selectedPO.paidAmount : 0;
  // For PO final payment: LRM runs on total paid across ALL payments, not just this one
  const totalPaidForPO = poMode === 'po_add' && selectedPO ? selectedPO.paidAmount + amt : 0;
  const smartCostsPO   = computeSmartDist(totalPaidForPO, distLines);           // PO final — full order total

  function validate() {
    const e = {};
    if (!fAmount || parseInt(fAmount) <= 0) e.amount = true;
    if (!fReceipt) e.receipt = true;

    if (expType === 'kasbon') {
      if (!fBarberId) e.barber = true;
    } else if (expType === 'inventory') {
      if (poMode === 'full') {
        if (!fDesc) e.desc = true;
        if (!stockItemId) e.stockItem = true;
        if (distLines.length === 0 || distLines.some(l => !l.branch || !l.qty || Number(l.qty) <= 0)) e.dist = true;
      } else if (poMode === 'po_new') {
        if (!fTotalOrderAmt || parseInt(fTotalOrderAmt) <= 0) e.totalOrderAmt = true;
        if (parseInt(fAmount) >= parseInt(fTotalOrderAmt)) e.amount = true; // down pmt must be < total
        if (!stockItemId) e.stockItem = true;
      } else if (poMode === 'po_add') {
        if (!selectedPoId) e.poPick = true;
        if (isFinalPayment) {
          if (distLines.length === 0 || distLines.some(l => !l.branch || !l.qty || Number(l.qty) <= 0)) e.dist = true;
        }
      }
    } else {
      if (!fDesc) e.desc = true;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    // ── PO: New Order (down payment) ─────────────────────────────────────────
    if (expType === 'inventory' && poMode === 'po_new') {
      const newPoId  = 'PO-' + String(Date.now()).slice(-4);
      const newExpId = expenses.length + 1;
      const newExp   = {
        id: newExpId, type: 'inventory', date: fDate, branch: null, category: 'inventory',
        source: fSource, desc: fDesc || `${selectedItem?.name} — advance payment`,
        amount: parseInt(fAmount), barberId: null, barber: null, by: 'Admin',
        receipt: fReceipt?.name ?? null, hasStock: false, stock: null,
        poId: newPoId, poPaymentType: 'advance', poAttribution: null,
      };
      const newPO = {
        id: newPoId, status: 'open',
        itemId: +stockItemId, itemName: selectedItem?.name ?? '', unit: selectedItem?.unit ?? 'pcs',
        totalOrderAmount: parseInt(fTotalOrderAmt), paidAmount: parseInt(fAmount),
        createdDate: fDate, closedDate: null, distributions: null, paymentExpenseIds: [newExpId],
      };
      setPurchaseOrders(pos => [...pos, newPO]);
      setExpenses(exps => [newExp, ...exps]);
      switchType('inventory'); setSaved(true);
      setTimeout(() => { setSaved(false); setShowForm(false); }, 1500);
      return;
    }

    // ── PO: Add Payment ──────────────────────────────────────────────────────
    if (expType === 'inventory' && poMode === 'po_add') {
      const newExpId       = expenses.length + 1;
      const thisAmt        = parseInt(fAmount);
      const totalPaidNow   = selectedPO.paidAmount + thisAmt;
      const validDists     = distLines.filter(l => l.branch && Number(l.qty) > 0);
      const totalQtyPO     = validDists.reduce((s, l) => s + Number(l.qty), 0);

      if (!isFinalPayment) {
        // Intermediate payment — no distribution yet
        const newExp = {
          id: newExpId, type: 'inventory', date: fDate, branch: null, category: 'inventory',
          source: fSource, desc: fDesc || `${selectedPO.itemName} — partial payment`,
          amount: thisAmt, barberId: null, barber: null, by: 'Admin',
          receipt: fReceipt?.name ?? null, hasStock: false, stock: null,
          poId: selectedPoId, poPaymentType: 'partial', poAttribution: null,
        };
        setPurchaseOrders(pos => pos.map(p => p.id === selectedPoId
          ? { ...p, paidAmount: totalPaidNow, paymentExpenseIds: [...p.paymentExpenseIds, newExpId] }
          : p));
        setExpenses(exps => [newExp, ...exps]);
      } else {
        // Final payment — close PO, compute attribution for ALL payments
        const smartCostsPO = computeSmartDist(totalPaidNow, distLines); // full order attribution
        const closedDists  = validDists.map((l, i) => ({ branch: l.branch, qty: Number(l.qty), cost: smartCostsPO[i] ?? 0 }));

        // Final expense entry
        const finalAttrib = computeAttribLRM(thisAmt, validDists, totalQtyPO);
        const finalExp = {
          id: newExpId, type: 'inventory', date: fDate, branch: 'Multiple', category: 'inventory',
          source: fSource, desc: fDesc || `${selectedPO.itemName} — final payment`,
          amount: thisAmt, barberId: null, barber: null, by: 'Admin',
          receipt: fReceipt?.name ?? null, hasStock: true,
          poId: selectedPoId, poPaymentType: 'final', poAttribution: finalAttrib,
          stock: {
            itemId: selectedPO.itemId, itemName: selectedPO.itemName, unit: selectedPO.unit,
            unitCostApprox: Math.round(totalPaidNow / totalQtyPO),
            totalQty: totalQtyPO, distributions: closedDists,
          },
        };

        // Retroactively attribute all previous payments
        setExpenses(exps => {
          const updated = exps.map(e => {
            if (!selectedPO.paymentExpenseIds.includes(e.id)) return e;
            const attrib = computeAttribLRM(e.amount, validDists, totalQtyPO);
            return { ...e, branch: 'Multiple', poAttribution: attrib };
          });
          return [finalExp, ...updated];
        });

        // Close the PO
        setPurchaseOrders(pos => pos.map(p => p.id === selectedPoId
          ? { ...p, status: 'closed', paidAmount: totalPaidNow, closedDate: fDate,
              distributions: closedDists, paymentExpenseIds: [...p.paymentExpenseIds, newExpId] }
          : p));
      }

      switchType('inventory'); setSaved(true);
      setTimeout(() => { setSaved(false); setShowForm(false); }, 1500);
      return;
    }

    // ── Regular / Kasbon / Full-payment Inventory ────────────────────────────
    const selectedBarber = ALL_BARBERS.find(b => b.id === +fBarberId);
    const uniqueBranches = distLines.filter(l => l.branch).map(l => l.branch);
    const expBranch =
      expType === 'kasbon'    ? (selectedBarber?.branch ?? 'Unknown') :
      expType === 'inventory' ? ([...new Set(uniqueBranches)].length === 1 ? uniqueBranches[0] : 'Multiple') :
      fBranch;

    setExpenses(exps => [{
      id: exps.length + 1, type: expType, date: fDate, branch: expBranch,
      category: expType === 'kasbon' ? 'kasbon' : expType === 'inventory' ? 'inventory' : fCat,
      source: fSource,
      desc:  expType === 'kasbon' ? (fDesc || 'Salary advance') : fDesc,
      barberId:     expType === 'kasbon' ? +fBarberId     : null,
      barber:       expType === 'kasbon' ? selectedBarber?.name : null,
      deductPeriod: expType === 'kasbon' ? fDeductPeriod  : null,
      amount: parseInt(fAmount), by: 'Admin', receipt: fReceipt?.name ?? null,
      hasStock: expType === 'inventory',
      stock: expType === 'inventory' ? {
        itemId: +stockItemId, itemName: selectedItem?.name ?? '',
        unit: selectedItem?.unit ?? 'pcs', unitCostApprox, totalQty,
        distributions: distLines.filter(l => l.branch && l.qty)
          .map((l, i) => ({ branch: l.branch, qty: Number(l.qty), cost: smartCosts[i] ?? 0 })),
      } : null,
    }, ...exps]);

    switchType(expType);
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowForm(false); }, 1500);
  }

  // ── Filtering ───────────────────────────────────────────────────────────────

  // Non-PO expenses — filtered normally
  const filteredNonPo = expenses.filter(e => {
    if (e.poId) return false;
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (filterBranch !== 'All') {
      if (e.type === 'inventory' && e.branch === 'Multiple') {
        if (!e.stock?.distributions.some(d => d.branch === filterBranch)) return false;
      } else {
        if (e.branch !== filterBranch) return false;
      }
    }
    if (filterCat    !== 'All' && e.type === 'regular'   && e.category !== filterCat)         return false;
    if (filterItem   !== 'All' && e.type === 'inventory' && e.stock?.itemName !== filterItem)  return false;
    if (filterBarber !== 'All' && e.type === 'kasbon'    && e.barber !== filterBarber)         return false;
    if (filterFrom && e.date < filterFrom) return false;
    if (filterTo   && e.date > filterTo)   return false;
    return true;
  });

  // PO rows — one synthetic row per PO that has ≥1 payment in the date range
  const poExpenses = expenses.filter(e => !!e.poId);
  const poIdsInRange = [...new Set(
    poExpenses.filter(e => {
      if (filterType !== 'all' && filterType !== 'inventory') return false;
      if (filterFrom && e.date < filterFrom) return false;
      if (filterTo   && e.date > filterTo)   return false;
      return true;
    }).map(e => e.poId)
  )];

  const filteredPoRows = poIdsInRange.flatMap(poId => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return [];
    const allPayments = expenses.filter(e => e.poId === poId)
      .sort((a, b) => a.date.localeCompare(b.date));
    const latestDate = allPayments[allPayments.length - 1]?.date ?? po.createdDate;

    // Branch filter — open POs have no attribution yet so hide for specific branch
    if (filterBranch !== 'All') {
      if (po.status === 'open') return [];
      if (!po.distributions?.some(d => d.branch === filterBranch)) return [];
    }
    // Item filter
    if (filterItem !== 'All' && po.itemName !== filterItem) return [];

    if (po.status === 'open') {
      return [{
        _isPoRow: true, _po: po, _poPayments: allPayments,
        id: `po-${poId}`, type: 'inventory', poId, poStatus: 'open',
        date: latestDate, branch: null, amount: po.paidAmount,
        source: allPayments[0]?.source ?? 'owner',
        by: allPayments[0]?.by ?? 'Owner',
        receipt: allPayments[allPayments.length - 1]?.receipt ?? null,
        desc: po.itemName, stock: null,
      }];
    } else {
      const totalQty = po.distributions?.reduce((s, d) => s + d.qty, 0) ?? 0;

      // One row per closed PO — prior advance/partial payments are absorbed into this entry.
      // Payment history is still accessible via the payments modal link.
      return [{
        _isPoRow: true, _po: po, _poPayments: allPayments,
        id: `po-${poId}`, type: 'inventory', poId, poStatus: 'closed',
        date: po.closedDate ?? latestDate, branch: 'Multiple',
        amount: po.totalOrderAmount,
        source: allPayments[0]?.source ?? 'owner',
        by: allPayments[allPayments.length - 1]?.by ?? 'Owner',
        receipt: allPayments[allPayments.length - 1]?.receipt ?? null,
        desc: po.itemName,
        stock: { itemId: po.itemId, itemName: po.itemName, unit: po.unit, totalQty, distributions: po.distributions ?? [] },
      }];
    }
  });

  // Combine and sort by date descending, then by id for stable ordering
  const filtered = [...filteredNonPo, ...filteredPoRows]
    .sort((a, b) => b.date.localeCompare(a.date) || String(a.id).localeCompare(String(b.id)));

  // Branch-specific view for non-PO multi-branch entries; PO rows handle their own _dist
  const displayRows = filtered.map(e => {
    if (e._isPoRow) {
      if (e.poStatus === 'closed' && filterBranch !== 'All') {
        const d = e.stock?.distributions.find(d => d.branch === filterBranch);
        return { ...e, _dist: d ?? null };
      }
      return { ...e, _dist: null };
    }
    if (filterBranch !== 'All' && e.type === 'inventory' && e.branch === 'Multiple') {
      const d = e.stock?.distributions.find(dist => dist.branch === filterBranch);
      return { ...e, _dist: d ?? null };
    }
    return { ...e, _dist: null };
  });

  const totalExpenses = displayRows.reduce((a, e) => a + (e._dist ? e._dist.cost : e.amount), 0);

  const selectStyle = {
    width:'100%', padding:'9px 11px', borderRadius:8,
    border:'1.5px solid '+C.border, background:C.white, fontSize:13, color:C.text,
  };
  const inputStyle = {
    width:'100%', padding:'9px 11px', borderRadius:8,
    border:'1.5px solid '+C.border, background:C.white, fontSize:13, color:C.text,
    boxSizing:'border-box',
  };

  return (
    <div style={{ padding:'28px 32px' }}>
      {showCreateCat && <CategoryModal onConfirm={handleCatCreated} onClose={() => setShowCreateCat(false)} />}

      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:26, color:C.text }}>Expenses</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>Log operating costs, stock purchases, and salary advances across all branches</div>
        </div>
        <button onClick={() => { if (showForm) switchType('regular'); setShowForm(v => !v); }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:8, background:showForm?C.surface2:C.topBg, color:showForm?C.text:C.white, fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:13, border:'none', cursor:'pointer', transition:'all 0.15s' }}>
          {showForm ? '✕ Cancel' : '+ Add Expense'}
        </button>
      </div>

      {/* ── Add expense form ── */}
      {showForm && (
        <div ref={formRef} className="admin-card" style={{ padding:'20px 24px', marginBottom:20, animation:'scaleIn 0.2s ease both' }}>

          {/* Type picker */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:15, color:C.text }}>New Expense</div>
            <div style={{ display:'flex', gap:3, background:C.surface, padding:3, borderRadius:10 }}>
              {[
                { key:'regular',   label:'Regular'    },
                { key:'inventory', label:'Inventory'  },
                { key:'kasbon',    label:'Kasbon'     },
              ].map(t => (
                <button key={t.key} onClick={() => switchType(t.key)}
                  style={{ padding:'6px 16px', borderRadius:8, border:'none', background:expType===t.key?C.topBg:'transparent', color:expType===t.key?C.white:C.muted, fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Regular / Inventory form ── */}
          {expType !== 'kasbon' && (
            <>
              {/* PO payment mode toggle — inventory only */}
              {expType === 'inventory' && (
                <div style={{ display:'flex', gap:3, background:C.surface, padding:3, borderRadius:9, width:'fit-content', marginBottom:16 }}>
                  {[
                    { key:'full',   label:'Full Payment' },
                    { key:'po_new', label:'New PO Order'  },
                    ...(openPOs.length > 0 ? [{ key:'po_add', label:`Add PO Payment (${openPOs.length} open)` }] : []),
                  ].map(m => (
                    <button key={m.key} onClick={() => { setPoMode(m.key); setErrors({}); setDistLines([{ branch:'', qty:'' }]); setIsFinalPayment(true); }}
                      style={{ padding:'5px 14px', borderRadius:7, border:'none', background:poMode===m.key?C.topBg:'transparent', color:poMode===m.key?C.white:C.muted, fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 0.15s' }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── FULL PAYMENT / REGULAR form ── */}
              {(expType === 'regular' || (expType === 'inventory' && poMode === 'full')) && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:expType==='inventory'?'1fr 1fr 0.8fr':'1fr 1fr 1fr 1fr 0.8fr', gap:12, marginBottom:12 }}>
                    {expType === 'regular' && (
                      <div>
                        <label style={{ ...LS, color:C.muted }}>Branch *</label>
                        <select value={fBranch} onChange={e => setFBranch(e.target.value)} style={selectStyle}>
                          {BRANCH_OPTIONS.map(b => <option key={b}>{b}</option>)}
                        </select>
                        {fBranch === 'Head Office' && <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>Head Office — chain-level expense</div>}
                      </div>
                    )}
                    {expType === 'regular' && (
                      <div>
                        <label style={{ ...LS, color:C.muted }}>Category *</label>
                        <select value={fCat} onChange={e => handleCatSelect(e.target.value)} style={selectStyle}>
                          {activeCats.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                          <option disabled style={{ color:C.surface2 }}>──────────</option>
                          <option value="__create__">＋ Create Category...</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label style={{ ...LS, color:C.muted }}>Source *</label>
                      <select value={fSource} onChange={e => setFSource(e.target.value)} style={selectStyle}>
                        <option value="petty_cash">Petty Cash</option>
                        <option value="owner">Owner (Raynand)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ ...LS, color:errors.amount?C.danger:C.muted }}>
                        {expType === 'inventory' ? 'Total Purchase (IDR) *' : 'Amount (IDR) *'}
                      </label>
                      <div style={{ display:'flex', alignItems:'center', borderRadius:8, border:'1.5px solid '+(errors.amount?C.danger:C.border), background:C.white, overflow:'hidden' }}>
                        <span style={{ padding:'9px 10px', fontSize:12, color:C.muted, borderRight:'1px solid '+C.border, whiteSpace:'nowrap' }}>Rp</span>
                        <input type="number" value={fAmount} onChange={e => { setFAmount(e.target.value); setErrors(v => ({ ...v, amount:false })); }} placeholder="150000"
                          style={{ flex:1, padding:'9px 10px', border:'none', fontSize:13, color:C.text, background:'transparent' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ ...LS, color:C.muted }}>Date</label>
                      <DateInput value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ ...LS, color:errors.desc?C.danger:C.muted }}>Description *</label>
                    <input value={fDesc} onChange={e => { setFDesc(e.target.value); setErrors(v => ({ ...v, desc:false })); }} placeholder="e.g. Blade pack (100 pcs)"
                      style={{ ...inputStyle, border:'1.5px solid '+(errors.desc?C.danger:C.border) }} />
                  </div>
                  <ReceiptField receipt={fReceipt} onSet={setFReceipt} onClear={() => setFReceipt(null)} error={errors.receipt} />
                  {expType === 'inventory' && (
                    <div style={{ background:C.surface, borderRadius:10, padding:'14px 16px', marginBottom:16, border:'1px solid '+C.border }}>
                      <div style={{ marginBottom:12 }}>
                        <label style={{ ...LS, color:errors.stockItem?C.danger:C.muted }}>
                          Item Received *
                          {errors.stockItem && <span style={{ fontWeight:400, textTransform:'none', fontSize:10, marginLeft:6, color:C.danger }}>Select an item</span>}
                        </label>
                        <select value={stockItemId} onChange={e => { setStockItemId(e.target.value); setErrors(v => ({ ...v, stockItem:false })); }}
                          style={{ ...selectStyle, border:'1.5px solid '+(errors.stockItem?C.danger:C.border), color:stockItemId?C.text:C.muted }}>
                          <option value="">— Select item —</option>
                          {INVENTORY.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                        </select>
                      </div>
                      {amt > 0 && totalQty > 0 && (
                        <div style={{ display:'flex', gap:16, marginBottom:10, padding:'8px 12px', borderRadius:8, background:C.white, border:'1px solid '+C.border, alignItems:'center', flexWrap:'wrap' }}>
                          <div style={{ fontSize:11, color:C.muted }}>Total Qty: <strong style={{ color:C.text }}>{totalQty} {selectedItem?.unit ?? 'pcs'}</strong></div>
                          <div style={{ fontSize:11, color:C.muted }}>Unit Cost: <strong style={{ color:C.text }}>{isExactUnit ? fmt(unitCostApprox) : `~${fmt(unitCostApprox)}`} / {selectedItem?.unit ?? 'pcs'}</strong>
                            {!isExactUnit && <span style={{ color:'#D97706', marginLeft:4 }}>(smart rounding applied)</span>}
                          </div>
                          <div style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'#16A34A' }}>✓ Total: {fmt(amt)}</div>
                        </div>
                      )}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text2, textTransform:'uppercase', letterSpacing:'0.06em' }}>Distribution</div>
                        {errors.dist && <span style={{ fontSize:11, color:C.danger }}>Each row needs a branch and quantity</span>}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 0.8fr 1.2fr auto', gap:6, marginBottom:6, paddingLeft:2 }}>
                        {['Branch / Destination','Qty','Cost',''].map((h, i) => (
                          <div key={i} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:C.muted }}>{h}</div>
                        ))}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {distLines.map((line, idx) => (
                          <DistLine key={idx} line={line} idx={idx} onUpdate={updateDistLine} onRemove={removeDistLine} lineCost={smartCosts[idx] ?? null} />
                        ))}
                      </div>
                      <button onClick={addDistLine} style={{ marginTop:8, padding:'6px 12px', borderRadius:7, background:C.white, border:'1px dashed '+C.border, fontSize:12, color:C.text2, fontWeight:600, cursor:'pointer' }}>
                        + Add Branch
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── PO NEW ORDER form ── */}
              {expType === 'inventory' && poMode === 'po_new' && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 0.8fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ ...LS, color:C.muted }}>Source *</label>
                      <select value={fSource} onChange={e => setFSource(e.target.value)} style={selectStyle}>
                        <option value="petty_cash">Petty Cash</option>
                        <option value="owner">Owner (Raynand)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ ...LS, color:errors.totalOrderAmt?C.danger:C.muted }}>Total Order Value *</label>
                      <div style={{ display:'flex', alignItems:'center', borderRadius:8, border:'1.5px solid '+(errors.totalOrderAmt?C.danger:C.border), background:C.white, overflow:'hidden' }}>
                        <span style={{ padding:'9px 10px', fontSize:12, color:C.muted, borderRight:'1px solid '+C.border }}>Rp</span>
                        <input type="number" value={fTotalOrderAmt} onChange={e => { setFTotalOrderAmt(e.target.value); setErrors(v => ({ ...v, totalOrderAmt:false })); }} placeholder="6000000"
                          style={{ flex:1, padding:'9px 10px', border:'none', fontSize:13, color:C.text, background:'transparent' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ ...LS, color:errors.amount?C.danger:C.muted }}>Down Payment *</label>
                      <div style={{ display:'flex', alignItems:'center', borderRadius:8, border:'1.5px solid '+(errors.amount?C.danger:C.border), background:C.white, overflow:'hidden' }}>
                        <span style={{ padding:'9px 10px', fontSize:12, color:C.muted, borderRight:'1px solid '+C.border }}>Rp</span>
                        <input type="number" value={fAmount} onChange={e => { setFAmount(e.target.value); setErrors(v => ({ ...v, amount:false })); }} placeholder="3000000"
                          style={{ flex:1, padding:'9px 10px', border:'none', fontSize:13, color:C.text, background:'transparent' }} />
                      </div>
                      {fTotalOrderAmt && fAmount && parseInt(fAmount) > 0 && parseInt(fAmount) < parseInt(fTotalOrderAmt) && (
                        <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>
                          Remaining: {fmt(parseInt(fTotalOrderAmt) - parseInt(fAmount))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ ...LS, color:C.muted }}>Date</label>
                      <DateInput value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} />
                    </div>
                  </div>

                  {/* Item picker */}
                  <div style={{ marginBottom:12 }}>
                    <label style={{ ...LS, color:errors.stockItem?C.danger:C.muted }}>
                      Item Ordered *
                      {errors.stockItem && <span style={{ fontWeight:400, textTransform:'none', fontSize:10, marginLeft:6, color:C.danger }}>Select an item</span>}
                    </label>
                    <select value={stockItemId} onChange={e => { setStockItemId(e.target.value); setErrors(v => ({ ...v, stockItem:false })); }}
                      style={{ ...selectStyle, border:'1.5px solid '+(errors.stockItem?C.danger:C.border), color:stockItemId?C.text:C.muted }}>
                      <option value="">— Select item —</option>
                      {INVENTORY.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                    </select>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom:12 }}>
                    <label style={{ ...LS, color:C.muted }}>Notes <span style={{ textTransform:'none', fontWeight:400 }}>(optional)</span></label>
                    <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="e.g. Supplier: PT Wigo, delivery ~Mar 15"
                      style={inputStyle} />
                  </div>

                  <ReceiptField receipt={fReceipt} onSet={setFReceipt} onClear={() => setFReceipt(null)} error={errors.receipt} />

                  <div style={{ padding:'10px 14px', borderRadius:8, background:C.surface, border:'1px solid '+C.border, fontSize:12, color:C.muted, marginBottom:12 }}>
                    Branch distribution and stock receipt will be entered when you log the final payment.
                    The advance sits as unattributed until then.
                  </div>
                </>
              )}

              {/* ── PO ADD PAYMENT form ── */}
              {expType === 'inventory' && poMode === 'po_add' && (
                <div style={{ display:'grid', gridTemplateColumns: selectedPO && isFinalPayment ? '1fr 1.5fr' : '1fr', gap:24 }}>

                  {/* Left column: payment details */}
                  <div>
                    {/* PO selector */}
                    <div style={{ marginBottom:14 }}>
                      <label style={{ ...LS, color:errors.poPick?C.danger:C.muted }}>
                        Purchase Order *
                        {errors.poPick && <span style={{ fontWeight:400, textTransform:'none', fontSize:10, marginLeft:6, color:C.danger }}>Select a PO</span>}
                      </label>
                      <select value={selectedPoId}
                        onChange={e => { setSelectedPoId(e.target.value); setIsFinalPayment(true); setDistLines([{ branch:'', qty:'' }]); setErrors({}); }}
                        style={{ ...selectStyle, border:'1.5px solid '+(errors.poPick?C.danger:C.border), color:selectedPoId?C.text:C.muted }}>
                        <option value="">— Select open order —</option>
                        {openPOs.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.id} · {p.itemName} · {fmt(p.totalOrderAmount - p.paidAmount)} remaining
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PO info strip */}
                    {selectedPO && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, padding:'10px 14px', borderRadius:8, background:C.surface, border:'1px solid '+C.border, marginBottom:14 }}>
                        <div style={{ fontSize:12, color:C.muted }}>Item: <strong style={{ color:C.text }}>{selectedPO.itemName}</strong></div>
                        <div style={{ fontSize:12, color:C.muted }}>Total: <strong style={{ color:C.text }}>{fmt(selectedPO.totalOrderAmount)}</strong></div>
                        <div style={{ fontSize:12, color:C.muted }}>Paid: <strong style={{ color:C.text }}>{fmt(selectedPO.paidAmount)}</strong></div>
                        <div style={{ fontSize:12, color:'#D97706', fontWeight:700 }}>Remaining: {fmt(poRemaining)}</div>
                      </div>
                    )}

                    {/* Source / Amount / Date */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                      <div>
                        <label style={{ ...LS, color:C.muted }}>Source *</label>
                        <select value={fSource} onChange={e => setFSource(e.target.value)} style={selectStyle}>
                          <option value="petty_cash">Petty Cash</option>
                          <option value="owner">Owner (Raynand)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ ...LS, color:C.muted }}>Date</label>
                        <DateInput value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <label style={{ ...LS, color:errors.amount?C.danger:C.muted }}>Payment Amount (IDR) *</label>
                      <div style={{ display:'flex', alignItems:'center', borderRadius:8, border:'1.5px solid '+(errors.amount?C.danger:C.border), background:C.white, overflow:'hidden' }}>
                        <span style={{ padding:'9px 10px', fontSize:12, color:C.muted, borderRight:'1px solid '+C.border }}>Rp</span>
                        <input type="number" value={fAmount}
                          onChange={e => { setFAmount(e.target.value); setErrors(v => ({ ...v, amount:false })); }}
                          placeholder={selectedPO ? String(poRemaining) : '0'}
                          style={{ flex:1, padding:'9px 10px', border:'none', fontSize:13, color:C.text, background:'transparent' }} />
                      </div>
                    </div>

                    {/* Final payment toggle */}
                    {selectedPO && (
                      <div style={{ marginBottom:14 }}>
                        <label style={{ ...LS, color:C.muted }}>Payment Type</label>
                        <div style={{ display:'flex', gap:3, background:C.surface, padding:3, borderRadius:9, width:'fit-content' }}>
                          {[{ key:false, label:'Partial' }, { key:true, label:'Final — Close Order' }].map(opt => (
                            <button key={String(opt.key)} onClick={() => { setIsFinalPayment(opt.key); setDistLines([{ branch:'', qty:'' }]); }}
                              style={{ padding:'5px 14px', borderRadius:7, border:'none', background:isFinalPayment===opt.key?C.topBg:'transparent', color:isFinalPayment===opt.key?C.white:C.muted, fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 0.15s' }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div style={{ marginBottom:12 }}>
                      <label style={{ ...LS, color:C.muted }}>Notes <span style={{ textTransform:'none', fontWeight:400 }}>(optional)</span></label>
                      <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Any notes for this payment"
                        style={inputStyle} />
                    </div>

                    <ReceiptField receipt={fReceipt} onSet={setFReceipt} onClear={() => setFReceipt(null)} error={errors.receipt} />
                  </div>

                  {/* Right column: distribution — final payment only */}
                  {selectedPO && isFinalPayment && (
                    <div style={{ borderLeft:'1px solid '+C.border, paddingLeft:20 }}>
                      {/* Header */}
                      <div style={{ marginBottom:8 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>Stock Distribution</div>
                        <div style={{ fontSize:11, color:C.muted }}>
                          {selectedPO.itemName} ({selectedPO.unit})
                          <span style={{ marginLeft:8, fontWeight:600, color:C.text }}>Total: {fmt(totalPaidForPO)}</span>
                        </div>
                      </div>
                      {/* Summary bar */}
                      {totalPaidForPO > 0 && totalQty > 0 && (
                        <div style={{ display:'flex', gap:12, marginBottom:10, padding:'6px 10px', borderRadius:7, background:C.surface, border:'1px solid '+C.border, alignItems:'center' }}>
                          <div style={{ fontSize:11, color:C.muted }}>Qty: <strong style={{ color:C.text }}>{totalQty} {selectedPO.unit}</strong></div>
                          <div style={{ fontSize:11, color:C.muted }}>~{fmt(Math.round(totalPaidForPO/totalQty))} / {selectedPO.unit}</div>
                          <div style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'#16A34A' }}>✓ {fmt(totalPaidForPO)}</div>
                        </div>
                      )}
                      {errors.dist && <div style={{ fontSize:11, color:C.danger, marginBottom:6 }}>Each row needs a branch and quantity</div>}
                      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 0.8fr 1.2fr auto', gap:6, marginBottom:6, paddingLeft:2 }}>
                        {['Branch','Qty','Total Cost',''].map((h, i) => (
                          <div key={i} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:C.muted }}>{h}</div>
                        ))}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {distLines.map((line, idx) => (
                          <DistLine key={idx} line={line} idx={idx} onUpdate={updateDistLine} onRemove={removeDistLine} lineCost={smartCostsPO[idx] ?? null} />
                        ))}
                      </div>
                      <button onClick={addDistLine} style={{ marginTop:8, padding:'6px 12px', borderRadius:7, background:C.white, border:'1px dashed '+C.border, fontSize:12, color:C.text2, fontWeight:600, cursor:'pointer' }}>
                        + Add Branch
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Kasbon form ── */}
          {expType === 'kasbon' && (
            <>
              {/* Info strip */}
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, background:'#FFFBEB', border:'1px solid #FDE68A', marginBottom:16 }}>
                <span style={{ fontSize:12, color:'#92400E' }}>Kasbon is logged as a cash expense and <strong>automatically deducted from the barber's payroll</strong> at month-end.</span>
              </div>

              {/* Kasbon fields */}
              <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 0.8fr', gap:12, marginBottom:12 }}>

                {/* Barber */}
                <div>
                  <label style={{ ...LS, color:errors.barber?C.danger:C.muted }}>
                    Barber *
                    {errors.barber && <span style={{ fontWeight:400, textTransform:'none', fontSize:10, marginLeft:6, color:C.danger }}>Required</span>}
                  </label>
                  <select value={fBarberId} onChange={e => { setFBarberId(e.target.value); setErrors(v => ({ ...v, barber:false })); }}
                    style={{ ...selectStyle, border:'1.5px solid '+(errors.barber?C.danger:C.border), color:fBarberId?C.text:C.muted }}>
                    <option value="">— Select Barber —</option>
                    {ALL_BARBERS.filter(b => b.isActive).map(b => (
                      <option key={b.id} value={b.id}>{b.name} · {b.branch}</option>
                    ))}
                  </select>
                </div>

                {/* Source */}
                <div>
                  <label style={{ ...LS, color:C.muted }}>Source *</label>
                  <select value={fSource} onChange={e => setFSource(e.target.value)} style={selectStyle}>
                    <option value="petty_cash">Petty Cash</option>
                    <option value="owner">Owner (Raynand)</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label style={{ ...LS, color:errors.amount?C.danger:C.muted }}>Amount (IDR) *</label>
                  <div style={{ display:'flex', alignItems:'center', borderRadius:8, border:'1.5px solid '+(errors.amount?C.danger:C.border), background:C.white, overflow:'hidden' }}>
                    <span style={{ padding:'9px 10px', fontSize:12, color:C.muted, borderRight:'1px solid '+C.border }}>Rp</span>
                    <input type="number" value={fAmount} onChange={e => { setFAmount(e.target.value); setErrors(v => ({ ...v, amount:false })); }} placeholder="500000"
                      style={{ flex:1, padding:'9px 10px', border:'none', fontSize:13, color:C.text, background:'transparent' }} />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label style={{ ...LS, color:C.muted }}>Date</label>
                  <DateInput value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom:12 }}>
                <label style={{ ...LS, color:C.muted }}>Notes <span style={{ textTransform:'none', fontWeight:400 }}>(optional)</span></label>
                <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="e.g. Personal emergency, approved by owner"
                  style={inputStyle} />
              </div>

              {/* Deduct in toggle */}
              <div style={{ marginBottom:14 }}>
                <label style={{ ...LS, color:C.muted }}>Deduct in</label>
                <div style={{ display:'flex', gap:3, background:C.surface, padding:3, borderRadius:9, width:'fit-content' }}>
                  {[{ key:'current', label:'This Month' }, { key:'next', label:'Next Month' }].map(opt => (
                    <button key={opt.key} onClick={() => setFDeductPeriod(opt.key)}
                      style={{ padding:'6px 18px', borderRadius:7, border:'none', background:fDeductPeriod===opt.key?C.topBg:'transparent', color:fDeductPeriod===opt.key?C.white:C.muted, fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 0.15s' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {fDeductPeriod === 'next' && (
                  <div style={{ fontSize:11, color:'#D97706', marginTop:5 }}>
                    Kasbon will appear as a deduction in <strong>May 2026</strong> payroll, not this month.
                  </div>
                )}
              </div>

              {/* Receipt */}
              <ReceiptField receipt={fReceipt} onSet={setFReceipt} onClear={() => setFReceipt(null)} error={errors.receipt} />
            </>
          )}

          {/* Submit */}
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button onClick={handleSubmit}
              style={{ padding:'9px 20px', borderRadius:8, background:saved?'#16A34A':C.topBg, color:C.white, fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:13, border:'none', cursor:'pointer', transition:'background 0.2s' }}>
              {saved ? '✓ Saved'
                : expType === 'kasbon' ? 'Log Kasbon'
                : poMode === 'po_new' ? 'Create PO'
                : poMode === 'po_add' ? (isFinalPayment ? 'Close Order' : 'Log Payment')
                : 'Log Expense'}
            </button>
            <div style={{ fontSize:12, color:C.muted }}>
              {expType === 'kasbon'
                ? fDeductPeriod === 'next'
                  ? 'Logged as expense now · deducted from May 2026 payroll'
                  : 'Logged as expense now · deducted from this month\'s payroll'
                : 'No approval required — logged immediately'}
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      {(() => {
        const uniqueItems   = [...new Set(expenses.filter(e => e.type === 'inventory').map(e => e.stock?.itemName).filter(Boolean))];
        const uniqueBarbers = [...new Set(expenses.filter(e => e.type === 'kasbon').map(e => e.barber).filter(Boolean))];
        const sel = { padding:'7px 11px', borderRadius:8, border:'1px solid '+C.border, background:C.white, fontSize:13, color:C.text };
        return (
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            {/* Type */}
            <select value={filterType} onChange={e => handleFilterTypeChange(e.target.value)}
              style={{ ...sel, fontWeight:600 }}>
              <option value="all">All Types</option>
              <option value="regular">Regular</option>
              <option value="inventory">Inventory</option>
              <option value="kasbon">Kasbon</option>
            </select>

            {/* Branch */}
            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={sel}>
              <option value="All">All Branches</option>
              {BRANCH_OPTIONS.map(b => <option key={b}>{b}</option>)}
              <option value="Multiple">Multiple</option>
            </select>

            {/* Tertiary — only shown when a specific type is selected */}
            {filterType === 'regular' && (
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={sel}>
                <option value="All">All Categories</option>
                {cats.map(c => <option key={c.key} value={c.key}>{c.label}{!c.isActive?' (inactive)':''}</option>)}
              </select>
            )}
            {filterType === 'inventory' && (
              <select value={filterItem} onChange={e => setFilterItem(e.target.value)} style={sel}>
                <option value="All">All Items</option>
                {uniqueItems.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
            {filterType === 'kasbon' && (
              <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)} style={sel}>
                <option value="All">All Barbers</option>
                {uniqueBarbers.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            )}

            <DateFilter
              from={filterFrom} to={filterTo}
              onChange={(f, t) => { setFilterFrom(f); setFilterTo(t); }}
            />

            <span style={{ fontSize:13, color:C.muted, marginLeft:4 }}>
              {displayRows.length} result{displayRows.length !== 1 ? 's' : ''} · Total: <strong style={{ color:C.text }}>{fmt(totalExpenses)}</strong>
            </span>
          </div>
        );
      })()}

      {/* ── Table ── */}
      <div className="admin-card" style={{ overflow:'hidden', marginBottom:24 }}>
        <div style={{ display:'grid', gridTemplateColumns:'28px 0.55fr 0.9fr 1.1fr 0.9fr 2fr 0.85fr 0.6fr 0.35fr', padding:'8px 18px', borderBottom:'1px solid '+C.surface }}>
          {['','Date','Branch','Type / Category','Source','Description','Amount','By',''].map((h, i) => (
            <div key={i} style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:C.muted }}>{h}</div>
          ))}
        </div>
        <div style={{ maxHeight:'calc(100vh - 440px)', minHeight:200, overflowY:'auto' }}>
          {displayRows.length === 0 && (
            <div style={{ padding:'40px 0', textAlign:'center', color:C.muted, fontSize:13 }}>No expenses match these filters.</div>
          )}
          {displayRows.map((e, i) => {
            const cm        = cats.find(c => c.key === e.category) || { label:e.category, color:C.muted, bg:C.surface };
            const distView  = e._dist ?? null;
            const isPoRow   = !!e._isPoRow;
            const isPending = isPoRow && e.poStatus === 'open';
            const isHO      = distView ? distView.branch === 'Head Office' : e.branch === 'Head Office';
            const isMulti   = !distView && e.branch === 'Multiple';
            const isKasbon  = e.type === 'kasbon';
            const isInv     = e.type === 'inventory';
            const isExpanded = isInv && !distView && !isPending && expandedId === e.id;
            const isExact   = isInv && !!e.stock && e.amount % (e.stock.totalQty || 1) === 0;
            const displayBranch = distView ? distView.branch : e.branch;
            const displayAmount = distView ? distView.cost   : e.amount;

            return (
              <div key={e.id} style={{ borderBottom:'1px solid '+C.surface, animation:`fadeUp 0.2s ease ${i*0.03}s both` }}>

                {/* Main row */}
                <div
                  onClick={() => isPending ? openPoForm(e.poId) : (isInv ? setExpandedId(isExpanded ? null : e.id) : null)}
                  style={{ display:'grid', gridTemplateColumns:'28px 0.55fr 0.9fr 1.1fr 0.9fr 2fr 0.85fr 0.6fr 0.35fr', padding:'12px 18px', alignItems:'center', transition:'background 0.1s', background:isExpanded?C.bg:'transparent', cursor:(isInv||isPending)?'pointer':'default' }}
                  onMouseEnter={ev => { if (!isExpanded) ev.currentTarget.style.background = C.bg; }}
                  onMouseLeave={ev => { if (!isExpanded) ev.currentTarget.style.background = 'transparent'; }}>

                  {/* Chevron column */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {(isInv && !distView && !isPending) && (
                      <span style={{
                        display:'inline-block', width:7, height:7, flexShrink:0,
                        borderRight:'2px solid '+C.muted, borderBottom:'2px solid '+C.muted,
                        transform: isExpanded ? 'rotate(225deg) translate(-2px,-2px)' : 'rotate(45deg)',
                        transition:'transform 0.2s',
                      }} />
                    )}
                    {isPending && (
                      <span style={{ display:'inline-block', width:6, height:6, flexShrink:0,
                        borderRight:'2px solid #D97706', borderBottom:'2px solid #D97706',
                        transform:'rotate(-45deg)',
                      }} />
                    )}
                  </div>

                  {/* Date */}
                  <div style={{ fontSize:12, color:C.muted }}>{fmtDate(e.date)}</div>

                  {/* Branch */}
                  <div style={{ fontSize:12, fontWeight:600, color:C.text2 }}>
                    {isPending
                      ? <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:3, background:'#FEF3C7', color:'#D97706', textTransform:'uppercase', letterSpacing:'0.06em' }}>PENDING</span>
                      : isHO
                        ? 'Head Office'
                        : isMulti
                          ? <span style={{ fontSize:12, fontWeight:600, color:C.text2 }}>
                              {e.stock?.distributions?.map(d => d.branch).join(', ')}
                            </span>
                          : displayBranch}
                  </div>

                  {/* Type / Category */}
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    {isKasbon ? (
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'#FFFBEB', color:'#D97706' }}>KASBON</span>
                    ) : isInv ? (
                      <div>
                        {isPoRow
                          ? <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, display:'inline-block', marginBottom:3,
                              background: isPending ? '#FEF3C7' : '#DCFCE7',
                              color:      isPending ? '#D97706' : '#16A34A' }}>
                              {isPending ? 'PO · OPEN' : 'PO · CLOSED'}
                            </span>
                          : <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'#DCFCE7', color:'#16A34A', display:'inline-block', marginBottom:3 }}>INVENTORY</span>
                        }
                        <div style={{ fontSize:10, color:isPending?'#D97706':C.muted }}>
                          {distView
                            ? `${distView.qty} ${e.stock?.unit} · ${distView.branch}`
                            : isPending
                              ? `${e.poId} · ${fmt(e.amount)} paid · awaiting close`
                              : isPoRow
                                ? `${e.poId} · ${e.stock?.totalQty} ${e.stock?.unit} · ${e.stock?.distributions?.length} branches`
                                : isMulti
                                  ? `${e.stock?.totalQty} ${e.stock?.unit} · ${e.stock?.distributions?.length} branches`
                                  : `${e.stock?.totalQty} ${e.stock?.unit} · ${e.branch}`}
                        </div>
                        {isPoRow && !isPending && (
                          <button
                            onClick={ev => { ev.stopPropagation(); setPoModalId(e.poId); }}
                            style={{ marginTop:4, display:'inline-block', fontSize:10, fontWeight:600, color:'#2563EB', background:'none', border:'none', padding:0, cursor:'pointer', textDecoration:'underline', textDecorationStyle:'dotted', textUnderlineOffset:2 }}>
                            {e._poPayments?.length} payment{e._poPayments?.length !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:cm.bg, color:cm.color }}>{cm.label}</span>
                    )}
                  </div>

                  {/* Source */}
                  <div style={{ fontSize:11, color:C.muted }}>
                    {e.source === 'petty_cash' ? 'Petty Cash' : e.source === 'owner' ? 'Owner' : '—'}
                  </div>

                  {/* Description */}
                  <div>
                    {isKasbon ? (
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{e.barber}</div>
                        {e.desc && <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{e.desc}</div>}
                      </div>
                    ) : isInv ? (
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                          <span style={{ fontSize:13, fontWeight:600, color:C.text }}>
                            {isPoRow ? e.desc : e.stock?.itemName}
                          </span>
                          {isPoRow && (
                            <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:3, background:C.surface2, color:C.muted, letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{e.poId}</span>
                          )}
                        </div>
                        {!isPoRow && e.desc && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{e.desc}</div>}
                        {isPending && <div style={{ fontSize:10, color:'#D97706', marginTop:2 }}>Awaiting stock receipt · {e._poPayments?.length} payment{e._poPayments?.length !== 1 ? 's' : ''} made</div>}
                        {isPoRow && !isPending && <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>closed {fmtDate(e._po?.closedDate)}</div>}
                      </div>
                    ) : (
                      <div style={{ fontSize:13, color:C.text }}>{e.desc}</div>
                    )}
                  </div>

                  {/* Amount — hidden when expanded (sub-rows show the breakdown) */}
                  <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:13, color:isKasbon?'#D97706':C.text }}>
                    {isExpanded ? '' : fmt(displayAmount)}
                  </div>

                  {/* By */}
                  <div style={{ fontSize:12, color:C.muted }}>{e.by}</div>

                  {/* Receipt */}
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {e.receipt ? <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#16A34A' }} title={e.receipt} /> : <span style={{ fontSize:12, fontWeight:700, color:C.danger }} title="No receipt">!</span>}
                  </div>
                </div>

                {/* Expanded distribution rows — stock per branch (attribution only; payments are in the modal) */}
                {isExpanded && e.stock?.distributions?.map((d, di) => {
                  const unitC = d.qty > 0 ? Math.round(d.cost / d.qty) : 0;
                  return (
                    <div key={`dist-${di}`}
                      style={{ display:'grid', gridTemplateColumns:'28px 0.55fr 0.9fr 1.1fr 0.9fr 2fr 0.85fr 0.6fr 0.35fr', padding:'9px 18px', alignItems:'center', background:C.bg, borderTop:'1px solid '+C.surface }}>

                      {/* Chevron col — left accent line */}
                      <div style={{ borderLeft:'2px solid '+C.border, height:20 }} />

                      {/* Date col — spacer */}
                      <div />

                      {/* Branch */}
                      <div style={{ fontSize:12, fontWeight:600, color:C.text }}>
                        {d.branch === 'Head Office'
                          ? 'Head Office'
                          : d.branch}
                      </div>

                      {/* Type / Category */}
                      <div>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'#DCFCE7', color:'#16A34A' }}>INVENTORY</span>
                      </div>

                      {/* Source */}
                      <div style={{ fontSize:11, color:C.muted }}>
                        {e.source === 'petty_cash' ? 'Petty Cash' : 'Owner'}
                      </div>

                      {/* Description — qty + item name, unit cost subtitle */}
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{d.qty} {e.stock.unit} {e.stock.itemName}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{isExact ? '' : '~'}{fmt(unitC)} / {e.stock.unit}</div>
                      </div>

                      {/* Cost — attributed cost for this branch */}
                      <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:13, color:C.text }}>{fmt(d.cost)}</div>

                      {/* By */}
                      <div style={{ fontSize:12, color:C.muted }}>{e.by}</div>

                      {/* Empty */}
                      <div />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── P&L Summary ── */}
      <div className="admin-card" style={{ overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:15, color:C.text }}>
            P&L Summary
            {(() => {
              // Show "April 2026" when range is exactly a full calendar month
              if (filterFrom && filterTo) {
                const [fy, fm, fd] = filterFrom.split('-').map(Number);
                const [ty, tm, td] = filterTo.split('-').map(Number);
                const lastDay = new Date(fy, fm, 0).getDate();
                if (fy === ty && fm === tm && fd === 1 && td === lastDay) {
                  return <span style={{ fontWeight:400, color:C.muted, fontSize:13, marginLeft:8 }}>{MONTH_NAMES[fm-1]} {fy}</span>;
                }
                return <span style={{ fontWeight:400, color:C.muted, fontSize:13, marginLeft:8 }}>{fmtDate(filterFrom)} – {fmtDate(filterTo)}</span>;
              }
              return <span style={{ fontWeight:400, color:C.muted, fontSize:13, marginLeft:8 }}>Today</span>;
            })()}
          </div>
          <div style={{ fontSize:11, color:C.muted }}>Tips tracked separately · not included in service revenue · <span style={{ fontStyle:'italic' }}>illustrative figures</span></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', padding:'8px 18px', borderBottom:'1px solid '+C.surface }}>
          {['Branch','Revenue','Expenses','Net'].map((h, i) => (
            <div key={i} style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:C.muted }}>{h}</div>
          ))}
        </div>
        <div style={{ maxHeight:280, overflowY:'auto' }}>
          {PL_DATA.map(row => {
            const net  = row.revenue - row.expenses;
            const isHO = row.branch === 'Head Office';
            return (
              <div key={row.branch}
                style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', padding:'11px 18px', borderBottom:'1px solid '+C.surface, alignItems:'center', transition:'background 0.1s', background:isHO?C.bg:'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = C.surface}
                onMouseLeave={e => e.currentTarget.style.background = isHO?C.bg:'transparent'}>
                <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:isHO?700:600, fontSize:13, color:C.text }}>
                  {isHO ? 'Head Office' : 'Bercut '+row.branch}
                </div>
                <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:13, color:row.revenue>0?'#16A34A':C.muted }}>{row.revenue>0?fmtM(row.revenue):'—'}</div>
                <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:13, color:C.danger }}>{fmtM(row.expenses)}</div>
                <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:14, color:net>=0?'#16A34A':C.danger }}>{row.revenue>0?fmtM(net):'—'}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', padding:'13px 18px', background:C.surface, borderTop:'2px solid '+C.border }}>
          <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:14, color:C.text }}>Total</div>
          <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:14, color:'#16A34A' }}>{fmtM(PL_DATA.reduce((a, r) => a + r.revenue, 0))}</div>
          <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:14, color:C.danger }}>{fmtM(PL_DATA.reduce((a, r) => a + r.expenses, 0))}</div>
          <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:900, fontSize:15, color:'#16A34A' }}>{fmtM(PL_DATA.reduce((a, r) => a + r.revenue - r.expenses, 0))}</div>
        </div>
      </div>

      {/* ── PO Payments Modal ── */}
      {poModalId && (() => {
        const po = purchaseOrders.find(p => p.id === poModalId);
        const pmts = expenses.filter(e => e.poId === poModalId).sort((a, b) => a.date.localeCompare(b.date));
        if (!po) return null;
        const ptCfgFor = type =>
          type === 'final'   ? { label:'Final',   bg:'#DCFCE7', color:'#16A34A' } :
          type === 'partial' ? { label:'Partial',  bg:'#EFF6FF', color:'#2563EB' } :
                               { label:'Advance',  bg:'#FEF3C7', color:'#D97706' };
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={() => setPoModalId(null)}>
            <div className="admin-card" style={{ width:680, maxWidth:'94vw', padding:'30px 32px', animation:'scaleIn 0.18s ease both' }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <span style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:18, color:C.text }}>{po.itemName}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5, background:'#DCFCE7', color:'#16A34A' }}>{po.id} · CLOSED</span>
                  </div>
                  <div style={{ display:'flex', gap:20 }}>
                    <span style={{ fontSize:13, color:C.muted }}>Total order: <strong style={{ color:C.text, fontFamily:"'Inter', sans-serif" }}>{fmt(po.totalOrderAmount)}</strong></span>
                    <span style={{ fontSize:13, color:C.muted }}>Closed: <strong style={{ color:C.text }}>{fmtDate(po.closedDate)}</strong></span>
                    <span style={{ fontSize:13, color:C.muted }}>{po.unit && `${po.distributions?.reduce((s,d) => s+d.qty, 0) ?? '?'} ${po.unit} total`}</span>
                  </div>
                </div>
                <button onClick={() => setPoModalId(null)}
                  style={{ width:32, height:32, borderRadius:8, border:'none', background:C.surface, color:C.muted, cursor:'pointer', fontSize:17, flexShrink:0 }}>✕</button>
              </div>

              {/* Payment rows */}
              <div style={{ borderRadius:10, border:'1px solid '+C.border, overflow:'hidden', marginBottom:20 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 0.65fr 0.75fr 1.6fr 1fr 0.35fr', padding:'10px 18px', background:C.surface, borderBottom:'1px solid '+C.border }}>
                  {['Date','Type','Source','Notes','Amount',''].map((h, i) => (
                    <div key={i} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.muted }}>{h}</div>
                  ))}
                </div>
                {pmts.map((pmt, pi) => {
                  const ptCfg = ptCfgFor(pmt.poPaymentType);
                  return (
                    <div key={pi} style={{ display:'grid', gridTemplateColumns:'1fr 0.65fr 0.75fr 1.6fr 1fr 0.35fr', padding:'14px 18px', alignItems:'center', borderBottom: pi < pmts.length - 1 ? '1px solid '+C.surface : 'none' }}>
                      <div style={{ fontSize:13, color:C.text2 }}>{fmtDate(pmt.date)}</div>
                      <div><span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:4, background:ptCfg.bg, color:ptCfg.color }}>{ptCfg.label}</span></div>
                      <div style={{ fontSize:12, color:C.muted }}>{pmt.source === 'petty_cash' ? 'Petty Cash' : 'Owner'}</div>
                      <div style={{ fontSize:12, color:C.muted }}>{pmt.desc || '—'}</div>
                      <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:14, color:C.text }}>{fmt(pmt.amount)}</div>
                      <div style={{ textAlign:'right' }}>{pmt.receipt ? <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#16A34A' }} title={pmt.receipt} /> : <span style={{ fontSize:12, fontWeight:700, color:C.danger }}>!</span>}</div>
                    </div>
                  );
                })}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 0.65fr 0.75fr 1.6fr 1fr 0.35fr', padding:'12px 18px', background:C.surface, borderTop:'2px solid '+C.border }}>
                  <div style={{ gridColumn:'1 / 5', fontSize:12, fontWeight:700, color:C.text2, display:'flex', alignItems:'center' }}>Total paid</div>
                  <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:15, color:C.text }}>{fmt(po.totalOrderAmount)}</div>
                  <div />
                </div>
              </div>

              <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>
                These are the payments made to the supplier. The total is split across branches in the expense list.
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
