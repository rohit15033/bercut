/**
 * MOCKUP — Bercut Admin: Overview
 *
 * What it does: All-branches live view. Global KPIs, per-branch status cards with
 *   revenue, queue counts, barber availability dots, and alert badges.
 * State managed: (none — read-only live view)
 * Production API: GET /api/admin/branch-overview?date=today + SSE
 * Feeds into: BranchDetail (on "View Details" click)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Overview.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState, useEffect } from 'react';
import { C, BRANCHES, BARBERS, fmt, fmtM, BARBER_STATUS_META } from './data.js';

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, i }) {
  return (
    <div className="admin-card fu" style={{ padding: '20px 24px', flex: 1, animation: `fadeUp 0.25s ease ${i * 0.06}s both` }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: accent || C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Branch card ───────────────────────────────────────────────────────────────

function BranchCard({ branch, onSelect, i }) {
  const branchBarbers = BARBERS.filter(b => b.branchId === branch.id);

  return (
    <div className="admin-card" style={{
      padding: '20px 22px', cursor: 'pointer', transition: 'all 0.18s',
      animation: `fadeUp 0.28s ease ${0.1 + i * 0.07}s both`,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.text; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}
      onClick={() => onSelect(branch)}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 16, color: C.text }}>{branch.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{branch.city}, Bali</div>
        </div>
        {/* Alerts */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {branch.alerts.includes('late_start') && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>⚠ Late Start</span>
          )}
          {branch.alerts.includes('low_stock') && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>📦 Low Stock</span>
          )}
        </div>
      </div>

      {/* Revenue */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>Today's Revenue</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 22, color: '#16A34A' }}>{fmtM(branch.revenue)}</div>
      </div>

      {/* Queue stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'In Chair', value: branch.inProgress, color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Waiting',  value: branch.queueWaiting, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Done',     value: branch.completed,   color: '#6B7280', bg: '#F9FAFB' },
          { label: 'No-show',  value: branch.noShow,      color: branch.noShow > 0 ? '#DC2626' : '#6B7280', bg: branch.noShow > 0 ? '#FEF2F2' : '#F9FAFB' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: s.bg }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Barber availability */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>
          Barbers — {branch.activeBarbers} / {branch.totalBarbers} in
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {branchBarbers.length > 0 ? (
            branchBarbers.map(b => {
              const sm = BARBER_STATUS_META[b.status];
              return (
                <div key={b.id} title={`${b.name} — ${sm.label}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 10, color: C.text2 }}>{b.initials}</span>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: sm.dot, border: '1.5px solid white' }} />
                  </div>
                </div>
              );
            })
          ) : (
            // For branches without detail barbers, show placeholder dots
            Array.from({ length: branch.totalBarbers }).map((_, idx) => (
              <div key={idx} style={{ width: 28, height: 28, borderRadius: '50%', background: idx < branch.activeBarbers ? C.surface2 : '#F5F5F3', border: '1px solid ' + C.border, position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: idx < branch.activeBarbers ? '#16A34A' : '#DDDBD4', border: '1.5px solid white' }} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={e => { e.stopPropagation(); onSelect(branch); }}
        style={{ width: '100%', padding: '9px 16px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = '#2a2a28'}
        onMouseLeave={e => e.currentTarget.style.background = C.topBg}
      >
        View Details →
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Overview({ onSelectBranch }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const totalRevenue  = BRANCHES.reduce((a, b) => a + b.revenue, 0);
  const totalActive   = BRANCHES.reduce((a, b) => a + b.inProgress, 0);
  const totalWaiting  = BRANCHES.reduce((a, b) => a + b.queueWaiting, 0);
  const totalDone     = BRANCHES.reduce((a, b) => a + b.completed, 0);
  const totalAlerts   = BRANCHES.reduce((a, b) => a + b.alerts.length, 0);

  const timeStr = time.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text, lineHeight: 1 }}>Overview</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>{dateStr} · {timeStr} WITA</div>
        </div>
        {totalAlerts > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <span style={{ fontSize: 14 }}>⚠</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#C2410C' }}>{totalAlerts} alert{totalAlerts !== 1 ? 's' : ''} across branches</span>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <KpiCard i={0} label="Today's Revenue"   value={fmtM(totalRevenue)} sub="All 6 branches combined"       accent="#16A34A" />
        <KpiCard i={1} label="In Chair Now"       value={totalActive}        sub="Customers being served"        accent={C.text}  />
        <KpiCard i={2} label="Waiting"            value={totalWaiting}       sub="Confirmed, not started"        accent="#2563EB" />
        <KpiCard i={3} label="Completed Today"    value={totalDone}          sub="Paid and out the door"         accent="#6B7280" />
      </div>

      {/* Branch cards */}
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text2, marginBottom: 14, letterSpacing: '0.01em' }}>
        All Branches
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {BRANCHES.map((branch, i) => (
          <BranchCard key={branch.id} branch={branch} onSelect={onSelectBranch} i={i} />
        ))}
      </div>
    </div>
  );
}
