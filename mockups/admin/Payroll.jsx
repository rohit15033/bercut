/**
 * MOCKUP — Bercut Admin: Payroll
 *
 * What it does: Monthly payroll management per branch. Draft → Reviewed → Finalized
 *   workflow. Auto-calculates base salary + commission + tips − kasbon − deductions.
 *   Expandable barber rows show individual adjustments (uang rajin, bonus, kasbon,
 *   deduction). Kasbon log tab for pre-period advances.
 * State managed: period, branch, payroll entries, expanded rows, adjustment form,
 *   activeTab, status
 * Production API:
 *   POST /api/payroll/generate { branch_id, period_month }
 *   GET  /api/payroll/periods/:id
 *   PATCH /api/payroll/periods/:id/status
 *   POST /api/payroll/adjustments
 *   DELETE /api/payroll/adjustments/:id
 *   GET /api/payroll/periods/:id/export
 * Feeds into: —
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Payroll.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07B
 */

import { useState } from 'react';
import { C, PAYROLL, ADJ_REASONS, BRANCHES, fmt, fmtM } from './data.js';

const ADJ_META = {
  uang_rajin: { label: 'UANG RAJIN', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  bonus:      { label: 'BONUS',      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  kasbon:     { label: 'KASBON',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  deduction:  { label: 'DEDUCTION',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
};

const STATUS_STYLE = {
  draft:     { label: 'DRAFT',     color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  reviewed:  { label: 'REVIEWED',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  finalized: { label: 'FINALIZED', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
};

// ── Add adjustment form ───────────────────────────────────────────────────────

function AddAdjustmentForm({ onAdd, onCancel }) {
  const [type,      setType]      = useState('uang_rajin');
  const [reason,    setReason]    = useState('Full Month Attendance');
  const [amount,    setAmount]    = useState('');
  const [deductIn,  setDeductIn]  = useState('current');
  const [customReason, setCustomReason] = useState('');

  const reasons = ADJ_REASONS[type] || [];

  function handleSubmit() {
    if (!amount) return;
    const r = reason === '__custom__' ? customReason : reason;
    onAdd({ type, reason: r, amount: parseInt(amount), by: 'Owner', date: '1 Apr', deductIn: type === 'kasbon' ? deductIn : undefined });
  }

  return (
    <div style={{ background: C.bg, borderRadius: 8, padding: '14px 16px', border: '1px solid ' + C.border, animation: 'scaleIn 0.15s ease both' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px', gap: 10, alignItems: 'end' }}>
        {/* Type */}
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>Type</label>
          <select value={type} onChange={e => { setType(e.target.value); setReason(ADJ_REASONS[e.target.value]?.[0] || ''); }}
            style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 12, color: C.text }}>
            <option value="uang_rajin">Uang Rajin</option>
            <option value="bonus">Bonus</option>
            <option value="deduction">Deduction</option>
            <option value="kasbon">Kasbon</option>
          </select>
        </div>
        {/* Reason */}
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>Reason</label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 12, color: C.text }}>
            {reasons.map(r => <option key={r}>{r}</option>)}
            <option value="__custom__">Other (type manually)</option>
          </select>
          {reason === '__custom__' && (
            <input value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Enter reason..."
              style={{ width: '100%', marginTop: 4, padding: '6px 9px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 12, color: C.text }} />
          )}
        </div>
        {/* Amount */}
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>Amount (IDR)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="200000"
            style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 12, color: C.text }} />
        </div>
      </div>

      {/* Kasbon deduct month */}
      {type === 'kasbon' && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>Deduct from:</span>
          {['current', 'next'].map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: deductIn === opt ? C.text : C.muted }}>
              <div onClick={() => setDeductIn(opt)} style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid ' + (deductIn === opt ? C.topBg : C.border), background: deductIn === opt ? C.topBg : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {deductIn === opt && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.white }} />}
              </div>
              {opt === 'current' ? 'This month' : 'Next month'}
            </label>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={handleSubmit}
          style={{ padding: '7px 16px', borderRadius: 7, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
          Add
        </button>
        <button onClick={onCancel}
          style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', color: C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, border: '1px solid ' + C.border, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Barber row ────────────────────────────────────────────────────────────────

function BarberRow({ entry, isFinalized, onAddAdj, onRemoveAdj, i }) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm]  = useState(false);
  const [adjs, setAdjs]          = useState(entry.adjustments);

  function handleAdd(adj) {
    const newAdj = { ...adj, id: 'new-' + Date.now() };
    setAdjs(a => [...a, newAdj]);
    setShowForm(false);
    if (onAddAdj) onAddAdj(entry.id, newAdj);
  }

  function handleRemove(adjId) {
    setAdjs(a => a.filter(x => x.id !== adjId));
    if (onRemoveAdj) onRemoveAdj(entry.id, adjId);
  }

  const cols = {
    gridTemplateColumns: '140px 50px 130px 60px 120px 90px 90px 80px 80px 90px 110px 30px',
  };

  return (
    <>
      <div style={{ display: 'grid', ...cols, padding: '12px 18px', borderBottom: '1px solid ' + C.surface, alignItems: 'center', transition: 'background 0.1s', cursor: 'pointer', animation: `fadeUp 0.22s ease ${i * 0.05}s both` }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => e.currentTarget.style.background = C.bg}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

        {/* Barber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 10, color: C.accent }}>{entry.initials}</span>
          </div>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{entry.barber}</span>
        </div>

        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.text2 }}>{entry.days}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#16A34A' }}>{fmtM(entry.grossRevenue)}</div>
        <div style={{ fontSize: 12, color: C.muted }}>{entry.commRate}%</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9333EA' }}>{fmtM(entry.commEarned)}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9333EA' }}>{fmtM(entry.tips)}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: entry.uangRajin > 0 ? '#16A34A' : C.muted }}>{entry.uangRajin > 0 ? fmtM(entry.uangRajin) : '—'}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: entry.bonus > 0 ? '#2563EB' : C.muted }}>{entry.bonus > 0 ? fmtM(entry.bonus) : '—'}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: entry.kasbon > 0 ? '#DC2626' : C.muted }}>{entry.kasbon > 0 ? fmtM(entry.kasbon) : '—'}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: entry.deductions > 0 ? '#D97706' : C.muted }}>{entry.deductions > 0 ? fmtM(entry.deductions) : '—'}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 14, color: C.text, background: isFinalized ? '#F0FDF4' : 'transparent', padding: isFinalized ? '2px 6px' : '0', borderRadius: 4 }}>{fmtM(entry.netPay)}</div>
        <div style={{ color: C.muted, fontSize: 12 }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {/* Expanded adjustment panel */}
      {expanded && (
        <div style={{ background: C.bg, borderBottom: '1px solid ' + C.border, padding: '14px 18px 14px 56px', animation: 'fadeIn 0.15s ease both' }}>
          {adjs.length === 0 && !showForm && (
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>No adjustments for this period.</div>
          )}
          {adjs.map(adj => {
            const am = ADJ_META[adj.type];
            return (
              <div key={adj.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: C.white, border: '1px solid ' + C.border }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: am.bg, color: am.color, border: '1px solid ' + am.border, flexShrink: 0 }}>{am.label}</span>
                <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{adj.reason}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>{fmt(adj.amount)}</span>
                {adj.deductIn && <span style={{ fontSize: 11, color: C.muted }}>· Deduct {adj.deductIn}</span>}
                <span style={{ fontSize: 11, color: C.muted }}>{adj.by} · {adj.date}</span>
                {!isFinalized && (
                  <button onClick={() => handleRemove(adj.id)}
                    style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: C.surface2, color: C.muted, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                )}
              </div>
            );
          })}

          {!isFinalized && !showForm && (
            <button onClick={e => { e.stopPropagation(); setShowForm(true); }}
              style={{ marginTop: 4, padding: '6px 14px', borderRadius: 7, border: '1px dashed ' + C.border, background: 'transparent', color: C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              + Add Adjustment
            </button>
          )}
          {showForm && (
            <div onClick={e => e.stopPropagation()}>
              <AddAdjustmentForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Payroll() {
  const [period,  setPeriod]  = useState('April 2026');
  const [branch,  setBranch]  = useState('Bercut Seminyak');
  const [status,  setStatus]  = useState(PAYROLL.status);
  const [tab,     setTab]     = useState('entries');
  const [generated, setGenerated] = useState(true);

  const isFinalized = status === 'finalized';
  const ss = STATUS_STYLE[status];

  const entries = PAYROLL.entries;
  const totalGross  = entries.reduce((a, e) => a + e.grossRevenue, 0);
  const totalComm   = entries.reduce((a, e) => a + e.commEarned,   0);
  const totalTips   = entries.reduce((a, e) => a + e.tips,         0);
  const totalNet    = entries.reduce((a, e) => a + e.netPay,       0);

  const cols = [
    'Barber', 'Days', 'Svc Revenue', 'Comm%', 'Commission', 'Tips',
    'Uang Rajin', 'Bonus', 'Kasbon', 'Deductions', 'NET PAY', '',
  ];

  const KASBON_LOG = [
    { barber: 'Guntur Wibowo',  amount: 500000, reason: 'Salary Advance', deductIn: 'current', month: 'April 2026',  by: 'Owner', date: '15 Mar', applied: true  },
    { barber: 'Rahmat Suharto', amount: 250000, reason: 'Salary Advance', deductIn: 'current', month: 'April 2026',  by: 'Owner', date: '20 Mar', applied: true  },
    { barber: 'Sep Agustian',   amount: 400000, reason: 'Salary Advance', deductIn: 'next',    month: 'May 2026',    by: 'Owner', date: '1 Apr',  applied: false },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Payroll</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Monthly payroll runs · Draft → Reviewed → Finalized</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {generated && (
            <button style={{ padding: '9px 16px', borderRadius: 8, background: 'transparent', color: C.text, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: '1px solid ' + C.border, cursor: 'pointer' }}>
              ↓ Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Period + branch selector */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>Branch</label>
          <select value={branch} onChange={e => setBranch(e.target.value)}
            style={{ padding: '7px 11px', borderRadius: 8, border: '1px solid ' + C.border, fontSize: 13, color: C.text }}>
            {BRANCHES.map(b => <option key={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>Period</label>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ padding: '7px 11px', borderRadius: 8, border: '1px solid ' + C.border, fontSize: 13, color: C.text }}>
            {['April 2026', 'March 2026', 'February 2026'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        {!generated ? (
          <button onClick={() => setGenerated(true)}
            style={{ padding: '8px 18px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', marginTop: 16 }}>
            Generate Payroll
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 5, background: ss.bg, color: ss.color, border: '1px solid ' + ss.border, letterSpacing: '0.08em' }}>
              {isFinalized && '🔒 '}{ss.label}
            </span>
            {status === 'draft' && (
              <button onClick={() => setStatus('reviewed')}
                style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', color: C.text, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: '1px solid ' + C.border, cursor: 'pointer' }}>
                Mark as Reviewed
              </button>
            )}
            {status === 'reviewed' && (
              <button onClick={() => { if (window.confirm('Finalize and lock this payroll? This cannot be undone.')) setStatus('finalized'); }}
                style={{ padding: '7px 14px', borderRadius: 7, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
                Finalize & Lock
              </button>
            )}
            {isFinalized && <span style={{ fontSize: 12, color: C.muted }}>Immutable — no further edits allowed</span>}
          </div>
        )}
      </div>

      {generated && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Gross Svc Revenue', value: fmtM(totalGross), color: '#16A34A' },
              { label: 'Total Commission',  value: fmtM(totalComm),  color: '#9333EA' },
              { label: 'Total Tips',        value: fmtM(totalTips),  color: '#2563EB' },
              { label: 'Total Net Pay',     value: fmtM(totalNet),   color: C.text    },
            ].map((k, i) => (
              <div key={k.label} className="admin-card" style={{ padding: '16px 20px', animation: `fadeUp 0.2s ease ${i * 0.04}s both` }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.muted, letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 22, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid ' + C.border, marginBottom: 0 }}>
            {[{ key: 'entries', label: 'Barber Entries' }, { key: 'kasbon', label: 'Kasbon Log' }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid ' + C.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: tab === t.key ? C.text : C.muted, cursor: 'pointer', marginBottom: -1 }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'entries' && (
            <div className="admin-card" style={{ overflow: 'auto', marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 50px 130px 60px 120px 90px 90px 80px 80px 90px 110px 30px', padding: '10px 18px', borderBottom: '1px solid ' + C.surface, minWidth: 1080 }}>
                {cols.map((h, i) => (
                  <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              <div style={{ minWidth: 1080 }}>
                {entries.map((entry, i) => (
                  <BarberRow key={entry.id} entry={entry} isFinalized={isFinalized} i={i} />
                ))}
              </div>
              {/* Total row */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 50px 130px 60px 120px 90px 90px 80px 80px 90px 110px 30px', padding: '13px 18px', background: C.surface, borderTop: '2px solid ' + C.border, minWidth: 1080 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>Total</div>
                <div />
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#16A34A' }}>{fmtM(totalGross)}</div>
                <div />
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#9333EA' }}>{fmtM(totalComm)}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#9333EA' }}>{fmtM(totalTips)}</div>
                <div /><div /><div /><div />
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: 14, color: C.text }}>{fmtM(totalNet)}</div>
                <div />
              </div>
            </div>
          )}

          {tab === 'kasbon' && (
            <div className="admin-card" style={{ overflow: 'hidden', marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: C.muted }}>Pre-logged salary advances. Entry assigned to correct payroll period automatically.</span>
                {!isFinalized && (
                  <button style={{ padding: '6px 14px', borderRadius: 7, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
                    + Log Kasbon
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr 110px 80px 80px 80px', padding: '8px 18px', borderBottom: '1px solid ' + C.surface }}>
                {['Barber','Amount','Reason','Deduct Month','Logged By','Date','Status'].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
                ))}
              </div>
              {KASBON_LOG.map((k, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr 110px 80px 80px 80px', padding: '12px 18px', borderBottom: i < KASBON_LOG.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{k.barber}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#DC2626' }}>{fmt(k.amount)}</div>
                  <div style={{ fontSize: 13, color: C.text2 }}>{k.reason}</div>
                  <div style={{ fontSize: 12, color: C.text2 }}>{k.month}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{k.by}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{k.date}</div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: k.applied ? '#F0FDF4' : '#FFFBEB', color: k.applied ? '#16A34A' : '#D97706' }}>
                      {k.applied ? 'Applied' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
