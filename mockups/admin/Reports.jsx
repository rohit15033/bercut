/**
 * MOCKUP — Bercut Admin: Revenue Reports
 *
 * What it does: Revenue breakdowns by period and branch. Summary KPIs, bar chart
 *   (div-based), revenue table, and barber performance table.
 * State managed: branch, period, reportRows
 * Production API: GET /api/admin/reports?branch_id=&period=&from=&to=
 * Feeds into: —
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Reports.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { C, BRANCHES, REPORT_ROWS, WEEKLY_CHART, BARBER_PERF, fmt, fmtM } from './data.js';

const PERIODS = ['Today', 'This Week', 'This Month', 'Custom'];

// ── Bar chart ─────────────────────────────────────────────────────────────────

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.revenue));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, padding: '0 4px' }}>
      {data.map((d, i) => {
        const h = Math.max(4, Math.round((d.revenue / max) * 120));
        return (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, fontFamily: "'Inter', sans-serif" }}>{fmtM(d.revenue)}</div>
            <div style={{ width: '100%', height: h, background: i === 5 ? C.accent : C.topBg, borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease', position: 'relative' }}
              title={`${d.label}: ${fmt(d.revenue)} · ${d.bookings} bookings`}>
              {i === 5 && <div style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: C.accent, whiteSpace: 'nowrap' }}>Peak</div>}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginTop: 4 }}>{d.label}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{d.bookings}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [period,  setPeriod]  = useState('This Week');
  const [branch,  setBranch]  = useState('All Branches');

  const totalRevenue  = REPORT_ROWS.reduce((a, r) => a + r.amount, 0);
  const totalTips     = REPORT_ROWS.reduce((a, r) => a + r.tip,    0);
  const totalBookings = REPORT_ROWS.length;
  const avgOrder      = Math.round(totalRevenue / totalBookings);

  const qrisCount = REPORT_ROWS.filter(r => r.method === 'qris').length;
  const cardCount = REPORT_ROWS.filter(r => r.method === 'card').length;
  const qrisPct   = Math.round(qrisCount / totalBookings * 100);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Reports</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Revenue, bookings, and barber performance</div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          ↓ Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="admin-card" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid ' + (period === p ? C.topBg : C.border), background: period === p ? C.topBg : 'transparent', color: period === p ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
              {p}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: C.border }} />
        <select value={branch} onChange={e => setBranch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid ' + C.border, background: C.white, fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
          <option>All Branches</option>
          {BRANCHES.map(b => <option key={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue',    value: fmtM(totalRevenue), sub: `${period}`,                 accent: '#16A34A' },
          { label: 'Total Bookings',   value: totalBookings,       sub: 'Across all services',       accent: C.text    },
          { label: 'Avg Order Value',  value: fmtM(avgOrder),     sub: 'Revenue per booking',       accent: '#2563EB' },
          { label: 'Tips Collected',   value: fmtM(totalTips),    sub: 'Separate from revenue',     accent: '#9333EA' },
        ].map((k, i) => (
          <div key={k.label} className="admin-card" style={{ padding: '18px 20px', animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 24, color: k.accent, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + payment method split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 24 }}>

        {/* Bar chart */}
        <div className="admin-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Revenue by Day</div>
            <div style={{ fontSize: 11, color: C.muted }}>This week · IDR</div>
          </div>
          <BarChart data={WEEKLY_CHART} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: C.topBg }} />
              <span style={{ fontSize: 11, color: C.muted }}>Revenue</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: C.accent }} />
              <span style={{ fontSize: 11, color: C.muted }}>Peak Day</span>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="admin-card" style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 20 }}>Payment Methods</div>

          {/* QRIS bar */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>QRIS</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>{qrisPct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: C.surface2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: qrisPct + '%', background: C.topBg, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{qrisCount} transactions</div>
          </div>

          {/* Card bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>BCA EDC Card</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>{100 - qrisPct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: C.surface2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: (100 - qrisPct) + '%', background: '#2563EB', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{cardCount} transactions</div>
          </div>

          <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>Tips Collected</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 20, color: '#9333EA' }}>{fmtM(totalTips)}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Individual — not pooled</div>
          </div>
        </div>
      </div>

      {/* Revenue table */}
      <div className="admin-card" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Transaction Log</div>
          <div style={{ fontSize: 12, color: C.muted }}>Showing {REPORT_ROWS.length} of {REPORT_ROWS.length} rows</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 110px 120px 1fr 90px 110px 80px', padding: '8px 18px', borderBottom: '1px solid ' + C.surface }}>
          {['Date','Branch','Barber','Service','Method','Amount','Tip'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
          ))}
        </div>
        {REPORT_ROWS.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 110px 120px 1fr 90px 110px 80px', padding: '11px 18px', borderBottom: '1px solid ' + C.surface, alignItems: 'center', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = C.bg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ fontSize: 12, color: C.muted }}>{r.date}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{r.branch}</div>
            <div style={{ fontSize: 12, color: C.text2 }}>{r.barber}</div>
            <div style={{ fontSize: 12, color: C.muted, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.service}</div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: r.method === 'qris' ? '#111110' : '#EFF6FF', color: r.method === 'qris' ? '#F5E200' : '#2563EB', border: r.method === 'card' ? '1px solid #BFDBFE' : 'none' }}>
                {r.method === 'qris' ? 'QRIS' : 'CARD'}
              </span>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>{fmt(r.amount)}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: r.tip > 0 ? '#9333EA' : C.muted }}>{r.tip > 0 ? fmt(r.tip) : '—'}</div>
          </div>
        ))}
      </div>

      {/* Barber performance */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + C.border }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Barber Performance</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 120px 70px 120px', padding: '8px 18px', borderBottom: '1px solid ' + C.surface }}>
          {['Barber','Branch','Bookings','Revenue','Comm %','Commission'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
          ))}
        </div>
        {BARBER_PERF.map((b, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 120px 70px 120px', padding: '11px 18px', borderBottom: i < BARBER_PERF.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = C.bg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{b.name}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{b.branch}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>{b.cuts}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#16A34A' }}>{fmtM(b.revenue)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{b.commRate}%</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#9333EA' }}>{fmtM(b.commEarned)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
