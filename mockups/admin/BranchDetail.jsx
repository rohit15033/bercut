/**
 * MOCKUP — Bercut Admin: Branch Detail
 *
 * What it does: Single-branch drill-down. Live queue table with status filter,
 *   barber status board, per-row actions (trigger payment, cancel, no-show).
 * State managed: filter, bookings (local mutation for demo), selectedBooking
 * Production API:
 *   GET /api/admin/branch-overview?branch_id=&date=today
 *   GET /api/bookings?branch_id=&date=today
 *   PATCH /api/bookings/:id/cancel
 *   PATCH /api/bookings/:id/no-show
 *   POST  /api/bookings/:id/payment-trigger
 * Feeds into: PaymentTakeover (manual trigger)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/BranchDetail.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { C, BOOKINGS, BARBERS, fmt, fmtM, STATUS_META, BARBER_STATUS_META } from './data.js';

const FILTERS = [
  { key: 'all',         label: 'All'         },
  { key: 'confirmed',   label: 'Waiting'     },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Done'        },
  { key: 'no_show',     label: 'No-show'     },
];

// ── Barber status badge ───────────────────────────────────────────────────────

function BarberChip({ b }) {
  const sm = BARBER_STATUS_META[b.status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: C.white, border: '1px solid ' + C.border, minWidth: 120 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11, color: C.text }}>{b.initials}</span>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: sm.dot, border: '2px solid white' }} />
      </div>
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: C.text, whiteSpace: 'nowrap' }}>{b.name.split(' ')[0]}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: sm.dot }}>{sm.label}</div>
      </div>
    </div>
  );
}

// ── Action menu ───────────────────────────────────────────────────────────────

function ActionMenu({ booking, onCancel, onNoShow, onPayment }) {
  const [open, setOpen] = useState(false);
  const canPay    = booking.status === 'in_progress' || booking.status === 'pending_payment';
  const canCancel = booking.status === 'confirmed';
  const canNoShow = booking.status === 'confirmed';
  const hasActions = canPay || canCancel || canNoShow;

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: 30, height: 30, borderRadius: 6, background: open ? C.surface : 'transparent', border: '1px solid ' + (open ? C.border : 'transparent'), color: C.muted, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', letterSpacing: '0.05em' }}
        onMouseEnter={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
      >···</button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 34, background: C.white, border: '1px solid ' + C.border, borderRadius: 10, zIndex: 50, minWidth: 175, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}
          onMouseLeave={() => setOpen(false)}>
          {!hasActions && <div style={{ padding: '10px 14px', fontSize: 12, color: C.muted }}>No actions available</div>}
          {canPay && (
            <button onClick={() => { onPayment(booking); setOpen(false); }}
              style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#16A34A', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              💳 Trigger Payment
            </button>
          )}
          {canCancel && (
            <button onClick={() => { onCancel(booking.id); setOpen(false); }}
              style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: C.danger, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              ✕ Cancel Booking
            </button>
          )}
          {canNoShow && (
            <button onClick={() => { onNoShow(booking.id); setOpen(false); }}
              style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              👻 Mark No-show
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BranchDetail({ branch, onBack }) {
  const b = branch || { id: 1, name: 'Bercut Seminyak', city: 'Seminyak', inProgress: 2, queueWaiting: 7, completed: 8, noShow: 1, revenue: 1850000 };
  const [filter, setFilter]     = useState('all');
  const [bookings, setBookings] = useState(BOOKINGS);

  const handleCancel  = (id) => setBookings(prev => prev.map(bk => bk.id === id ? { ...bk, status: 'cancelled' } : bk));
  const handleNoShow  = (id) => setBookings(prev => prev.map(bk => bk.id === id ? { ...bk, status: 'no_show'   } : bk));
  const handlePayment = (bk)  => alert(`Manual payment trigger for ${bk.name} — ${fmt(bk.total)}\n\nIn production this emits SSE payment_trigger event and opens PaymentTakeover on the kiosk.`);

  const filtered = filter === 'all' ? bookings : bookings.filter(bk => bk.status === filter);
  const revenue  = bookings.filter(bk => bk.payment === 'paid').reduce((a, bk) => a + bk.total, 0);

  const cols = [
    { key: '#',        w: 80  },
    { key: 'Customer', w: null },
    { key: 'Barber',   w: 110 },
    { key: 'Services', w: null },
    { key: 'Time',     w: 70  },
    { key: 'Total',    w: 110 },
    { key: 'Status',   w: 120 },
    { key: '',         w: 44  },
  ];

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Breadcrumb + back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}
          onMouseEnter={e => e.currentTarget.style.color = C.text}
          onMouseLeave={e => e.currentTarget.style.color = C.muted}>
          ← Overview
        </button>
        <span style={{ color: C.border }}>/</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>{b.name}</span>
      </div>

      {/* Branch header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>{b.name}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{b.city}, Bali · Live queue · Today</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: "Today's Revenue", value: fmtM(revenue),     color: '#16A34A' },
            { label: 'In Chair',        value: bookings.filter(bk => bk.status === 'in_progress').length,  color: C.text },
            { label: 'Waiting',         value: bookings.filter(bk => bk.status === 'confirmed').length,    color: '#2563EB' },
            { label: 'Done',            value: bookings.filter(bk => bk.status === 'completed').length,    color: C.muted },
          ].map(s => (
            <div key={s.label} className="admin-card" style={{ padding: '10px 16px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 20, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginTop: 3, whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Barber status row */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>Barber Status</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BARBERS.map(barber => <BarberChip key={barber.id} b={barber} />)}
        </div>
      </div>

      {/* Queue table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 4, padding: '14px 16px', borderBottom: '1px solid ' + C.border, alignItems: 'center' }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginRight: 8 }}>Queue</span>
          {FILTERS.map(f => {
            const count = f.key === 'all' ? bookings.length : bookings.filter(bk => bk.status === f.key).length;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (filter === f.key ? C.text : C.border), background: filter === f.key ? C.topBg : 'transparent', color: filter === f.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                {f.label}
                <span style={{ fontWeight: 800, opacity: 0.7 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 110px 1fr 70px 110px 120px 44px', gap: 0, padding: '8px 16px', borderBottom: '1px solid ' + C.surface }}>
          {cols.map((c, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{c.key}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 14 }}>No bookings match this filter</div>
          )}
          {filtered.map((bk, i) => {
            const sm = STATUS_META[bk.status] || STATUS_META.cancelled;
            return (
              <div key={bk.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 110px 1fr 70px 110px 120px 44px', gap: 0, padding: '12px 16px', borderBottom: '1px solid ' + C.surface, alignItems: 'center', transition: 'background 0.1s', animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}
                onMouseEnter={e => e.currentTarget.style.background = C.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.accent === '#F5E200' ? C.text : C.text }}>
                  <span style={{ background: C.topBg, color: C.accent, padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>#{bk.number}</span>
                </div>

                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{bk.name}</div>
                </div>

                <div style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>{bk.barber}</div>

                <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{bk.services}</div>

                <div style={{ fontSize: 12, color: C.text2, fontWeight: 600 }}>{bk.slot}</div>

                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>{fmt(bk.total)}</div>

                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: sm.bg, color: sm.color, border: '1px solid ' + sm.border, whiteSpace: 'nowrap' }}>{sm.label}</span>
                </div>

                <ActionMenu booking={bk} onCancel={handleCancel} onNoShow={handleNoShow} onPayment={handlePayment} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
