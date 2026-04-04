/**
 * MOCKUP — Bercut Admin: Expenses
 *
 * What it does: Log and review branch expenses. Add expense form, filterable
 *   transaction table, and per-branch P&L summary.
 * State managed: expenses, form state, filters, showForm
 * Production API:
 *   GET  /api/expenses?branch_id=&from=&to=
 *   POST /api/expenses
 * Feeds into: —
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Expenses.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { C, BRANCHES, EXPENSES, CAT_META, fmt, fmtM } from './data.js';

const CATEGORIES = ['petty_cash', 'supplies', 'utilities', 'equipment', 'other'];

// ── P&L per branch ────────────────────────────────────────────────────────────

const PL_DATA = [
  { branch: 'Seminyak', revenue: 1850000, expenses: 645000 },
  { branch: 'Canggu',   revenue: 1120000, expenses: 900000 },
  { branch: 'Ubud',     revenue: 650000,  expenses: 210000 },
  { branch: 'Uluwatu',  revenue: 1450000, expenses: 350000 },
  { branch: 'Sanur',    revenue: 780000,  expenses: 180000 },
  { branch: 'Dewi Sri', revenue: 2100000, expenses: 200000 },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Expenses() {
  const [expenses, setExpenses] = useState(EXPENSES);
  const [showForm, setShowForm] = useState(false);
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterCat,    setFilterCat]    = useState('All');

  // Form state
  const [fBranch, setFBranch]   = useState('Seminyak');
  const [fCat,    setFCat]      = useState('supplies');
  const [fAmount, setFAmount]   = useState('');
  const [fDesc,   setFDesc]     = useState('');
  const [fDate,   setFDate]     = useState('1 Apr');
  const [saved,   setSaved]     = useState(false);

  function handleSubmit() {
    if (!fAmount || !fDesc) return;
    const newExp = { id: expenses.length + 1, date: fDate, branch: fBranch, category: fCat, desc: fDesc, amount: parseInt(fAmount), by: 'Admin' };
    setExpenses([newExp, ...expenses]);
    setFAmount(''); setFDesc('');
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowForm(false); }, 1500);
  }

  const filtered = expenses.filter(e => {
    if (filterBranch !== 'All' && e.branch !== filterBranch) return false;
    if (filterCat    !== 'All' && e.category !== filterCat)  return false;
    return true;
  });

  const totalExpenses = filtered.reduce((a, e) => a + e.amount, 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Expenses</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Log and review branch operating costs</div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: showForm ? C.surface2 : C.topBg, color: showForm ? C.text : C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
          {showForm ? '✕ Cancel' : '+ Add Expense'}
        </button>
      </div>

      {/* Add expense form */}
      {showForm && (
        <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 20, animation: 'scaleIn 0.2s ease both' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 16 }}>New Expense</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            {/* Branch */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 5 }}>Branch *</label>
              <select value={fBranch} onChange={e => setFBranch(e.target.value)}
                style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, background: C.white, fontSize: 13, color: C.text }}>
                {['Seminyak','Canggu','Ubud','Uluwatu','Sanur','Dewi Sri'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            {/* Category */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 5 }}>Category *</label>
              <select value={fCat} onChange={e => setFCat(e.target.value)}
                style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, background: C.white, fontSize: 13, color: C.text }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_META[c].label}</option>)}
              </select>
            </div>
            {/* Amount */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 5 }}>Amount (IDR) *</label>
              <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: '1.5px solid ' + C.border, background: C.white, overflow: 'hidden' }}>
                <span style={{ padding: '9px 10px', fontSize: 12, color: C.muted, borderRight: '1px solid ' + C.border, whiteSpace: 'nowrap' }}>Rp</span>
                <input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="150000"
                  style={{ flex: 1, padding: '9px 10px', border: 'none', fontSize: 13, color: C.text, background: 'transparent' }} />
              </div>
            </div>
            {/* Date */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 5 }}>Date</label>
              <input value={fDate} onChange={e => setFDate(e.target.value)}
                style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, background: C.white, fontSize: 13, color: C.text }} />
            </div>
          </div>
          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 5 }}>Description *</label>
            <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="e.g. Blade pack (100 pcs)"
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, background: C.white, fontSize: 13, color: C.text }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSubmit}
              style={{ padding: '9px 20px', borderRadius: 8, background: saved ? '#16A34A' : C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
              {saved ? '✓ Saved' : 'Log Expense'}
            </button>
            <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center' }}>No approval required — logged immediately</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
          style={{ padding: '7px 11px', borderRadius: 8, border: '1px solid ' + C.border, background: C.white, fontSize: 13, color: C.text }}>
          <option>All</option>
          {['Seminyak','Canggu','Ubud','Uluwatu','Sanur','Dewi Sri'].map(b => <option key={b}>{b}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding: '7px 11px', borderRadius: 8, border: '1px solid ' + C.border, background: C.white, fontSize: 13, color: C.text }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CAT_META[c].label}</option>)}
        </select>
        <span style={{ fontSize: 13, color: C.muted, marginLeft: 4 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''} · Total: <strong style={{ color: C.text }}>{fmt(totalExpenses)}</strong></span>
      </div>

      {/* Table */}
      <div className="admin-card" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 110px 120px 1fr 120px 90px', padding: '8px 18px', borderBottom: '1px solid ' + C.surface }}>
          {['Date','Branch','Category','Description','Amount','By'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
          ))}
        </div>
        {filtered.map((e, i) => {
          const cm = CAT_META[e.category];
          return (
            <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '80px 110px 120px 1fr 120px 90px', padding: '12px 18px', borderBottom: i < filtered.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', transition: 'background 0.1s', animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}
              onMouseEnter={e2 => e2.currentTarget.style.background = C.bg}
              onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 12, color: C.muted }}>{e.date}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{e.branch}</div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: cm.bg, color: cm.color }}>{cm.label}</span>
              </div>
              <div style={{ fontSize: 13, color: C.text }}>{e.desc}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>{fmt(e.amount)}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{e.by}</div>
            </div>
          );
        })}
      </div>

      {/* P&L Summary */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>P&L Summary — Today</div>
          <div style={{ fontSize: 11, color: C.muted }}>Tips tracked separately · not included in service revenue</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 130px', padding: '8px 18px', borderBottom: '1px solid ' + C.surface }}>
          {['Branch','Revenue','Expenses','Net'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
          ))}
        </div>
        {PL_DATA.map((row, i) => {
          const net = row.revenue - row.expenses;
          return (
            <div key={row.branch} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 130px', padding: '11px 18px', borderBottom: i < PL_DATA.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>Bercut {row.branch}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#16A34A' }}>{fmtM(row.revenue)}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.danger }}>{fmtM(row.expenses)}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 14, color: net > 0 ? '#16A34A' : C.danger }}>{fmtM(net)}</div>
            </div>
          );
        })}
        {/* Total row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 130px', padding: '13px 18px', background: C.surface, borderTop: '2px solid ' + C.border }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text }}>Total</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 14, color: '#16A34A' }}>{fmtM(PL_DATA.reduce((a, r) => a + r.revenue, 0))}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 14, color: C.danger }}>{fmtM(PL_DATA.reduce((a, r) => a + r.expenses, 0))}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: 15, color: '#16A34A' }}>{fmtM(PL_DATA.reduce((a, r) => a + r.revenue - r.expenses, 0))}</div>
        </div>
      </div>
    </div>
  );
}
