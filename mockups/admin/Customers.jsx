/**
 * MOCKUP — Bercut Admin: Customer Data & History
 *
 * What it does: View all customers who provided contact info at the kiosk.
 *   Shows visit count, total spend, loyalty points balance, preferred barber.
 *   Click any row to see full visit history in a side panel.
 * State managed: search, branchFilter, selectedCustomer, sortBy
 * Production API:
 *   GET /api/customers?branch_id=&search=&sort=
 *   GET /api/customers/:id/history
 * Feeds into: Reports (customer spend data)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Customers.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { CUSTOMERS, CUSTOMER_HISTORY, BRANCHES, C, fmt } from './data.js';

const STARS = n => '★'.repeat(n) + '☆'.repeat(5 - n);

// ── Point expiry helpers ──────────────────────────────────────────────────────
const EXPIRY_MONTHS = 12;        // mirrors global settings default
const EXPIRY_WARNING_DAYS = 30;  // mirrors global settings default
const TODAY = new Date('2026-04-13');

function getExpiryStatus(lastActivity, points) {
  if (!lastActivity || points === 0) return null;
  const expiry = new Date(lastActivity);
  expiry.setMonth(expiry.getMonth() + EXPIRY_MONTHS);
  const daysUntil = Math.round((expiry - TODAY) / (1000 * 60 * 60 * 24));
  const label = expiry.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const fullLabel = expiry.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  if (daysUntil < 0) return { type: 'expired', label, fullLabel, daysUntil };
  if (daysUntil <= EXPIRY_WARNING_DAYS) return { type: 'warning', daysUntil, label: `Exp in ${daysUntil}d`, fullLabel };
  return { type: 'safe', label, fullLabel };
}

// ── Visit history panel ───────────────────────────────────────────────────────
function HistoryPanel({ customer, onClose }) {
  return (
    <div style={{ width: 380, flexShrink: 0, borderLeft: '1px solid ' + C.border, display: 'flex', flexDirection: 'column', background: C.white, height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 22px', borderBottom: '1px solid ' + C.surface, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{customer.name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{customer.phone}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Visits',      value: customer.visits                },
            { label: 'Total Spend', value: fmt(customer.totalSpend)       },
            { label: 'Points',      value: customer.points + ' pts'       },
          ].map(s => (
            <div key={s.label} style={{ background: C.bg, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted }}>{s.label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: C.text2 }}>
          <span style={{ color: C.muted }}>Preferred barber: </span><span style={{ fontWeight: 600 }}>{customer.preferredBarber}</span>
          <span style={{ color: C.muted, marginLeft: 14 }}>Branch: </span><span style={{ fontWeight: 600 }}>{customer.branch}</span>
        </div>

        {/* Points expiry info */}
        {(() => {
          const exp = getExpiryStatus(customer.pointsLastActivity, customer.points);
          if (!exp) return null;
          if (exp.type === 'warning') return (
            <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', fontWeight: 600 }}>
              ⚠ Points expire {exp.fullLabel} — {exp.daysUntil} day{exp.daysUntil !== 1 ? 's' : ''} left
            </div>
          );
          if (exp.type === 'expired') return (
            <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: '#B91C1C', fontWeight: 600 }}>
              Points expired {exp.fullLabel} — balance zeroed by cron job
            </div>
          );
          return (
            <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
              Points expire: <span style={{ fontWeight: 600, color: C.text2 }}>{exp.fullLabel}</span>
            </div>
          );
        })()}
      </div>

      {/* Visit history */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 12 }}>Visit History</div>
        {CUSTOMER_HISTORY.map((h, i) => (
          <div key={i} style={{ padding: '14px 0', borderBottom: i < CUSTOMER_HISTORY.length - 1 ? '1px solid ' + C.surface : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{h.services}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {h.date} · {h.barber}
                </div>
                <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 3, letterSpacing: '-0.02em' }}>{STARS(h.rating)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>{fmt(h.total)}</div>
                {h.tip > 0 && <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>+{fmt(h.tip)} tip</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Customers() {
  const [search,           setSearch]           = useState('');
  const [branchFilter,     setBranchFilter]     = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sortBy,           setSortBy]           = useState('visits');

  const filtered = CUSTOMERS
    .filter(c => branchFilter === 'all' || c.branch === branchFilter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const totalCustomers = CUSTOMERS.length;
  const totalVisits    = CUSTOMERS.reduce((s, c) => s + c.visits, 0);
  const totalPoints    = CUSTOMERS.reduce((s, c) => s + c.points, 0);
  const avgSpend       = Math.round(CUSTOMERS.reduce((s, c) => s + c.totalSpend, 0) / CUSTOMERS.length);

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)', boxSizing: 'border-box' }}>

      {/* Page header */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Customers</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Customers who provided contact info at the kiosk</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24, flexShrink: 0 }}>
        {[
          { label: 'Total Customers',  value: totalCustomers              },
          { label: 'Total Visits',     value: totalVisits                 },
          { label: 'Avg Spend / Visit',value: fmt(avgSpend)               },
          { label: 'Points Issued',    value: totalPoints.toLocaleString()},
        ].map(s => (
          <div key={s.label} className="admin-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted }}>{s.label}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text, marginTop: 6 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main content — table + optional side panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 0 }}>

        {/* Left — table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Filters + search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone…"
              style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, width: 220, background: C.white }} />
            {[{ key: 'all', label: 'All Branches' }, ...BRANCHES.map(b => ({ key: b.city, label: b.city }))].map(f => (
              <button key={f.key} onClick={() => setBranchFilter(f.key)}
                style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (branchFilter === f.key ? C.topBg : C.border), background: branchFilter === f.key ? C.topBg : 'transparent', color: branchFilter === f.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                {f.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Sort by:</span>
              {[{ key: 'visits', label: 'Visits' }, { key: 'totalSpend', label: 'Spend' }, { key: 'points', label: 'Points' }].map(s => (
                <button key={s.key} onClick={() => setSortBy(s.key)}
                  style={{ padding: '5px 11px', borderRadius: 6, border: '1px solid ' + (sortBy === s.key ? C.topBg : C.border), background: sortBy === s.key ? C.topBg : 'transparent', color: sortBy === s.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-card" style={{ overflow: 'auto', flex: 1 }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr 1fr 0.6fr 1.5fr 0.8fr', padding: '10px 18px', borderBottom: '1px solid ' + C.surface, position: 'sticky', top: 0, background: C.white, zIndex: 1 }}>
              {['Customer', 'Phone', 'Visits', 'Total Spend', 'Points', 'Pref. Barber', 'Last Visit'].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 14 }}>No customers match this filter</div>
            )}

            {filtered.map((c, i) => {
              const isSelected = selectedCustomer?.id === c.id;
              return (
                <div key={c.id} onClick={() => setSelectedCustomer(isSelected ? null : c)}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr 1fr 0.6fr 1.5fr 0.8fr', padding: '13px 18px', borderBottom: i < filtered.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s', background: isSelected ? C.bg : 'transparent', animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.bg; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>

                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{c.branch}</div>
                  </div>

                  <div style={{ fontSize: 12, color: C.text2, fontFamily: 'monospace' }}>{c.phone}</div>

                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text }}>{c.visits}</div>

                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{fmt(c.totalSpend)}</div>

                  <div>
                    <div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: c.points > 200 ? '#D97706' : C.text }}>
                        {c.points}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted }}> pts</span>
                    </div>
                    {(() => {
                      const exp = getExpiryStatus(c.pointsLastActivity, c.points);
                      if (!exp || exp.type === 'safe') return null;
                      if (exp.type === 'warning') return <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', marginTop: 2 }}>⚠ {exp.label}</div>;
                      if (exp.type === 'expired') return <div style={{ fontSize: 10, fontWeight: 700, color: '#B91C1C', marginTop: 2 }}>Expired</div>;
                    })()}
                  </div>

                  <div style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>{c.preferredBarber}</div>

                  <div style={{ fontSize: 12, color: C.muted }}>{c.lastVisit}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — visit history panel (slides in when a customer is selected) */}
        {selectedCustomer && (
          <HistoryPanel customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
        )}
      </div>
    </div>
  );
}
