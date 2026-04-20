/**
 * MOCKUP — Bercut Admin: Live Queue Management
 *
 * What it does: Real-time queue management screen. Shows every barber's queue
 *   per branch with full admin control via ··· action menu per booking row.
 *   Alert badges surface when a barber taps "Belum Datang". Secondary panel
 *   logs pax-out events.
 * State managed: barbers (queue mutations), branchFilter, cancelModal,
 *   forceStartModal, paxOutModal, paxOutEvents, showPaxPanel, tick
 * Production API:
 *   GET /api/live/barbers?branch_id=  (SSE — barber_status_changed, booking_started,
 *     booking_completed, client_not_arrived)
 *   POST /api/bookings/:id/start      (force-start, same endpoint as barber)
 *   POST /api/bookings/:id/cancel     { reason }  — reason "Customer no-show" → status no_show
 *   POST /api/pax-out
 * Feeds into: Reports (Demand tab)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/LiveMonitor.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState, useEffect } from 'react';
import { C, BRANCHES, LIVE_QUEUE_BARBERS, fmt } from './data.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const LIVE_BRANCH_IDS = [...new Set(LIVE_QUEUE_BARBERS.map(b => b.branchId))];
const LIVE_BRANCHES   = BRANCHES.filter(b => LIVE_BRANCH_IDS.includes(b.id));

const BARBER_STATUS = {
  busy:        { dot: '#16A34A', label: 'In Service'       },
  available:   { dot: '#2563EB', label: 'Available'        },
  on_break:    { dot: '#D97706', label: 'On Break'         },
  clocked_out: { dot: '#DDDBD4', label: 'Not Clocked In'   },
};

const BOOKING_STATUS = {
  in_progress: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'In Service'  },
  confirmed:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Waiting'     },
};

const CANCEL_REASONS = [
  'Customer no-show — didn\'t arrive', 'Customer request', 'Barber unavailable',
  'Service not available today', 'Duplicate booking', 'Other',
];

const PAX_OUT_REASONS = ['Queue Full', 'Wait Too Long', 'Wrong Branch', 'Price', 'Other'];

const MOCK_PAX_TODAY = [
  { id:1, time:'09:14', branch:'Seminyak', reason:'Queue Full',    source:'CCTV' },
  { id:2, time:'10:32', branch:'Canggu',   reason:'Wait Too Long', source:'Kiosk Timeout' },
  { id:3, time:'11:05', branch:'Seminyak', reason:'Wait Too Long', source:'Kiosk Back' },
  { id:4, time:'12:18', branch:'Dewi Sri', reason:'Queue Full',    source:'CCTV' },
  { id:5, time:'13:44', branch:'Seminyak', reason:'Queue Full',    source:'CCTV' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function Btn({ children, onClick, color = C.text, bg = C.surface, border = C.border, disabled = false, style = {} }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ padding: '4px 9px', borderRadius: 6, border: `1px solid ${disabled ? C.border : border}`,
        background: disabled ? C.surface : bg, color: disabled ? C.muted : color,
        fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'all 0.12s', whiteSpace: 'nowrap', ...style }}>
      {children}
    </button>
  );
}

// ── Cancel Modal ──────────────────────────────────────────────────────────────

function CancelModal({ booking, barberName, onConfirm, onClose }) {
  const [reason,   setReason]   = useState('');
  const [custom,   setCustom]   = useState('');
  const [touched,  setTouched]  = useState(false);
  const finalReason = reason === 'Other' ? custom.trim() : reason;
  const valid = finalReason.length > 0;

  function handleConfirm() {
    setTouched(true);
    if (!valid) return;
    onConfirm(booking.id, finalReason);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-card" style={{ width:440, padding:'24px 28px', animation:'scaleIn 0.18s ease both' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:16, color:C.text }}>Cancel Booking</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
              {booking.number} · {booking.customer} · <span style={{ fontWeight:600 }}>{barberName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:6, border:'none', background:C.surface, color:C.muted, cursor:'pointer', fontSize:16, flexShrink:0 }}>✕</button>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:C.muted, marginBottom:8 }}>
            Reason <span style={{ color:'#DC2626' }}>*</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {CANCEL_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)}
                style={{ padding:'9px 13px', borderRadius:8, textAlign:'left', border:`1.5px solid ${reason === r ? C.topBg : C.border}`,
                  background: reason === r ? C.topBg : C.white, color: reason === r ? C.white : C.text2,
                  fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:13, cursor:'pointer', transition:'all 0.12s' }}>
                {r}
              </button>
            ))}
          </div>
          {reason === 'Other' && (
            <textarea value={custom} onChange={e => setCustom(e.target.value)} placeholder="Describe the reason..."
              style={{ width:'100%', marginTop:8, padding:'9px 11px', borderRadius:8,
                border:`1.5px solid ${touched && !custom.trim() ? '#DC2626' : C.border}`,
                fontSize:13, color:C.text, fontFamily:"'DM Sans', sans-serif", resize:'vertical', minHeight:70, boxSizing:'border-box' }} />
          )}
          {touched && !valid && (
            <div style={{ fontSize:11, color:'#DC2626', marginTop:5 }}>Please select or enter a reason before cancelling.</div>
          )}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', borderRadius:9, background:C.surface, color:C.text2,
              fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:14, border:'none', cursor:'pointer' }}>
            Back
          </button>
          <button onClick={handleConfirm}
            style={{ flex:2, padding:'10px', borderRadius:9, background:'#DC2626', color:C.white,
              fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Force Start Modal ─────────────────────────────────────────────────────────

function ForceStartModal({ booking, barberName, onConfirm, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-card" style={{ width:420, padding:'24px 28px', animation:'scaleIn 0.18s ease both' }}>
        <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:16, color:C.text, marginBottom:6 }}>Force Start Booking?</div>

        {/* Warning banner */}
        <div style={{ display:'flex', gap:10, padding:'11px 14px', borderRadius:8,
          background:'#FFFBEB', border:'1px solid #FDE68A', marginBottom:16 }}>
          <span style={{ fontSize:16, flexShrink:0 }}>⚠</span>
          <div style={{ fontSize:12, color:'#92400E', lineHeight:1.5 }}>
            <strong>Barber should always start the service themselves.</strong> Only use this
            if the barber is unable to tap Start and the customer is already seated.
          </div>
        </div>

        <div style={{ fontSize:13, color:C.muted, marginBottom:20, lineHeight:1.5 }}>
          Force-starting <strong style={{ color:C.text }}>{booking.customer}</strong> ({booking.number})
          on <strong style={{ color:C.text }}>{barberName}</strong>'s queue. This emits
          the same SSE event as the barber tapping Mulai.
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', borderRadius:9, background:C.surface, color:C.text2,
              fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:14, border:'none', cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(booking)}
            style={{ flex:2, padding:'10px', borderRadius:9, background:C.topBg, color:C.white,
              fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
            Confirm Force Start
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Log Pax Out Modal ─────────────────────────────────────────────────────────

function LogPaxOutModal({ onLog, onClose }) {
  const [branch, setBranch] = useState(LIVE_BRANCHES[0]?.city || '');
  const [reason, setReason] = useState('Queue Full');

  function handleLog() {
    const time = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    onLog({ id:Date.now(), time, branch, reason, source:'CCTV' });
    onClose();
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-card" style={{ width:400, padding:'24px 28px', animation:'scaleIn 0.18s ease both' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:16, color:C.text }}>Log Pax Out</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>CCTV-observed walk-away</div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:6, border:'none', background:C.surface, color:C.muted, cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:5 }}>Branch *</label>
            <select value={branch} onChange={e => setBranch(e.target.value)}
              style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, color:C.text, background:C.white }}>
              {LIVE_BRANCHES.map(b => <option key={b.id} value={b.city}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:8 }}>Reason *</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {PAX_OUT_REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  style={{ padding:'7px 13px', borderRadius:20, border:`1.5px solid ${reason === r ? C.topBg : C.border}`,
                    background: reason === r ? C.topBg : 'transparent', color: reason === r ? C.white : C.text2,
                    fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:12, cursor:'pointer', transition:'all 0.12s' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:22 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', borderRadius:9, background:C.surface, color:C.text2,
              fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:14, border:'none', cursor:'pointer' }}>Cancel</button>
          <button onClick={handleLog}
            style={{ flex:2, padding:'10px', borderRadius:9, background:C.topBg, color:C.white,
              fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>Log Pax Out</button>
        </div>
      </div>
    </div>
  );
}

// ── Booking Row ───────────────────────────────────────────────────────────────

function ElapsedBar({ elapsed, total, nextSlot }) {
  const pct      = Math.min(100, Math.round((elapsed / total) * 100));
  const leftMin  = Math.max(0, total - elapsed);
  const overMin  = Math.max(0, elapsed - total);
  const isOverrun = elapsed > total;

  const finishDate = new Date(Date.now() + leftMin * 60 * 1000);
  const finish     = finishDate.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });

  // Check if est. finish conflicts with next booking's slot
  let conflictsNext = false;
  if (!isOverrun && nextSlot) {
    const [h, m]   = nextSlot.split(':').map(Number);
    const slotDate = new Date();
    slotDate.setHours(h, m, 0, 0);
    conflictsNext = finishDate > slotDate;
  }

  const barColor = isOverrun || conflictsNext ? '#DC2626' : pct >= 70 ? '#D97706' : '#16A34A';

  return (
    <div style={{ marginTop:6 }}>
      <div style={{ marginBottom:3, display:'flex', flexWrap:'wrap', alignItems:'center', gap:8 }}>
        {isOverrun ? (
          <span style={{ fontSize:10, fontWeight:700, color:'#DC2626' }}>+{overMin}m overrun ⚠</span>
        ) : (
          <span style={{ fontSize:10, color:C.muted }}>
            {elapsed}m elapsed · Est. finish <strong style={{ color: conflictsNext ? '#DC2626' : C.text2 }}>{finish}</strong>
          </span>
        )}
        {conflictsNext && !isOverrun && (
          <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4,
            background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}>
            ⚠ Overruns next slot ({nextSlot})
          </span>
        )}
      </div>
      <div style={{ height:4, borderRadius:2, background:C.surface2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:Math.min(pct, 100)+'%', background:barColor, borderRadius:2, transition:'width 0.5s' }} />
      </div>
    </div>
  );
}

function ActionMenu({ booking, barberBusy, onCancel, onStart }) {
  const [open, setOpen] = useState(false);
  const isInProg = booking.status === 'in_progress';

  function item(label, color, hoverBg, onClick, disabled = false) {
    return (
      <button onClick={disabled ? undefined : () => { onClick(); setOpen(false); }}
        style={{ width:'100%', padding:'9px 13px', background:'none', border:'none',
          color: disabled ? C.muted : color, fontFamily:"'DM Sans', sans-serif",
          fontWeight:600, fontSize:13, textAlign:'left', cursor: disabled ? 'not-allowed' : 'pointer',
          display:'flex', alignItems:'center', gap:8, opacity: disabled ? 0.45 : 1 }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = hoverBg; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
        {label}
      </button>
    );
  }

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:30, height:30, borderRadius:6,
          background: open ? C.surface : 'transparent',
          border:`1px solid ${open ? C.border : 'transparent'}`,
          color:C.muted, fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', letterSpacing:'0.05em' }}
        onMouseEnter={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}>
        ···
      </button>
      {open && (
        <div style={{ position:'absolute', right:0, top:34, background:C.white,
          border:`1px solid ${C.border}`, borderRadius:10, zIndex:50, minWidth:200,
          boxShadow:'0 8px 24px rgba(0,0,0,0.1)', overflow:'hidden' }}
          onMouseLeave={() => setOpen(false)}>
          {!isInProg && item('▶ Force Start', '#15803D', '#F0FDF4', () => onStart(booking), barberBusy)}
          {item('✕ Cancel Booking', '#DC2626', '#FEF2F2', () => onCancel(booking))}
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking, onCancel, onStart, barberBusy, tick, nextSlot }) {
  const sm       = BOOKING_STATUS[booking.status] || BOOKING_STATUS.confirmed;
  const isInProg = booking.status === 'in_progress';
  const elapsed  = isInProg ? booking.elapsedMin + Math.floor(tick / 60) : 0;

  return (
    <div style={{
      padding:'10px 14px',
      borderBottom:`1px solid ${C.surface}`,
      borderLeft: booking.clientNotArrived ? '3px solid #F59E0B' : '3px solid transparent',
      background: booking.clientNotArrived ? '#FFFDF5' : 'transparent',
      transition:'background 0.1s',
    }}
      onMouseEnter={e => { if (!booking.clientNotArrived) e.currentTarget.style.background = C.bg; }}
      onMouseLeave={e => { e.currentTarget.style.background = booking.clientNotArrived ? '#FFFDF5' : 'transparent'; }}>

      {/* Main row */}
      <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 1.6fr 55px 130px 40px', alignItems:'center', gap:0 }}>

        {/* Queue # */}
        <div>
          <span style={{ background:C.topBg, color:'#F5E200', padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:700 }}>{booking.number}</span>
        </div>

        {/* Customer */}
        <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:600, fontSize:13, color:C.text, paddingRight:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {booking.customer}
        </div>

        {/* Services */}
        <div style={{ fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>
          {booking.services}
        </div>

        {/* Slot */}
        <div style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{booking.slot}</div>

        {/* Status */}
        <div>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
            background:sm.bg, color:sm.color, border:`1px solid ${sm.border}`, whiteSpace:'nowrap', display:'inline-block' }}>
            {sm.label}
          </span>
        </div>

        {/* Action menu */}
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <ActionMenu booking={booking} barberBusy={barberBusy} onCancel={onCancel} onStart={onStart} />
        </div>
      </div>

      {/* Elapsed bar — in_progress only */}
      {isInProg && (
        <div style={{ paddingLeft:60, paddingRight:44 }}>
          <ElapsedBar elapsed={elapsed} total={booking.estDurationMin} nextSlot={nextSlot} />
        </div>
      )}
    </div>
  );
}

// ── Barber Queue Block ────────────────────────────────────────────────────────

function BarberQueueBlock({ barber, onCancel, onStart, tick }) {
  const [expanded, setExpanded] = useState(true);
  const cfg         = BARBER_STATUS[barber.status] || BARBER_STATUS.available;
  const alertCount  = barber.queue.filter(b => b.clientNotArrived).length;
  const activeQueue = barber.queue.filter(b => b.status === 'in_progress' || b.status === 'confirmed');
  const confirmedQ  = activeQueue.filter(b => b.status === 'confirmed');

  return (
    <div style={{ border:`1px solid ${alertCount > 0 ? '#FDE68A' : C.border}`, borderRadius:10, overflow:'hidden',
      background: alertCount > 0 ? '#FEFCE8' : C.white, transition:'all 0.15s' }}>

      {/* Barber header row */}
      <button onClick={() => setExpanded(e => !e)} style={{
        width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
        background:'none', border:'none', cursor:'pointer', textAlign:'left',
        borderBottom: expanded && activeQueue.length > 0 ? `1px solid ${C.border}` : 'none',
      }}>
        {/* Avatar + status dot */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:C.surface,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:11, color:C.text }}>{barber.initials}</span>
          </div>
          <div style={{ position:'absolute', bottom:0, right:0, width:9, height:9,
            borderRadius:'50%', background:cfg.dot, border:'2px solid white' }} />
        </div>

        {/* Name + status */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:13, color:C.text }}>{barber.name}</div>
          <div style={{ fontSize:10, fontWeight:600, color:cfg.dot, marginTop:1 }}>{cfg.label}</div>
        </div>

        {/* Queue count badges */}
        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
          {activeQueue.length > 0 && (
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
              background:C.topBg, color:C.white }}>{activeQueue.length} in queue</span>
          )}
          {alertCount > 0 && (
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
              background:'#F59E0B', color:'#FFFFFF' }}>⚠ {alertCount}</span>
          )}
          {activeQueue.length === 0 && (
            <span style={{ fontSize:11, color:C.muted }}>No active queue</span>
          )}
        </div>

        {/* Expand toggle */}
        {activeQueue.length > 0 && (
          <span style={{ fontSize:12, color:C.muted, marginLeft:4 }}>{expanded ? '▲' : '▼'}</span>
        )}
      </button>

      {/* Queue table */}
      {expanded && activeQueue.length > 0 && (
        <div>
          {/* Column headers */}
          <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 1.6fr 55px 130px 210px',
            gap:0, padding:'6px 14px', background:C.bg, borderBottom:`1px solid ${C.border}` }}>
            {['#', 'Customer', 'Services', 'Time', 'Status', ''].map((h, i) => (
              <div key={i} style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.muted }}>{h}</div>
            ))}
          </div>

          {activeQueue.map((bk, idx) => {
            const nextConfirmed = activeQueue.slice(idx + 1).find(q => q.status === 'confirmed');
            return (
              <BookingRow key={bk.id} booking={bk}
                onCancel={onCancel} onStart={onStart}
                barberBusy={barber.status === 'busy'}
                tick={tick}
                nextSlot={bk.status === 'in_progress' && nextConfirmed ? nextConfirmed.slot : null}
              />
            );
          })}

        </div>
      )}
    </div>
  );
}

// ── Branch Section ────────────────────────────────────────────────────────────

function BranchSection({ branch, barbers, onCancel, onStart, tick }) {
  const inService   = barbers.filter(b => b.status === 'busy').length;
  const available   = barbers.filter(b => b.status === 'available').length;
  const onBreak     = barbers.filter(b => b.status === 'on_break').length;
  const totalWaiting = barbers.reduce((a, b) => a + b.queue.filter(q => q.status === 'confirmed').length, 0);
  const totalAlerts  = barbers.reduce((a, b) => a + b.queue.filter(q => q.clientNotArrived).length, 0);

  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:16, color:C.text }}>{branch.name}</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {inService > 0   && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'#F0FDF4', color:'#15803D' }}>{inService} in service</span>}
          {available > 0   && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'#EFF6FF', color:'#1D4ED8' }}>{available} available</span>}
          {onBreak > 0     && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'#FFFBEB', color:'#92400E' }}>{onBreak} on break</span>}
          {totalWaiting > 0 && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'#F3F4F6', color:'#374151' }}>{totalWaiting} waiting</span>}
          {totalAlerts > 0 && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'#FEF3C7', color:'#92400E' }}>⚠ {totalAlerts} alert{totalAlerts > 1 ? 's' : ''}</span>}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {barbers.map(b => (
          <BarberQueueBlock key={b.id} barber={b}
            onCancel={onCancel} onStart={onStart} tick={tick}
          />
        ))}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function LiveMonitor() {
  const [barbers,       setBarbers]       = useState(LIVE_QUEUE_BARBERS);
  const [branchFilter,  setBranchFilter]  = useState('all');
  const [cancelModal,     setCancelModal]     = useState(null);
  const [forceStartModal, setForceStartModal] = useState(null);
  const [showPaxModal,  setShowPaxModal]  = useState(false);
  const [showPaxPanel,  setShowPaxPanel]  = useState(false);
  const [paxOutEvents,  setPaxOutEvents]  = useState(MOCK_PAX_TODAY);
  const [lastRefresh,   setLastRefresh]   = useState(new Date());
  const [tick,          setTick]          = useState(0);

  useEffect(() => {
    const id = setInterval(() => { setTick(t => t + 10); setLastRefresh(new Date()); }, 10000);
    return () => clearInterval(id);
  }, []);

  // ── Queue mutations ──
  function mutateBooking(bookingId, updater) {
    setBarbers(prev => prev.map(b => ({ ...b, queue: b.queue.map(q => q.id === bookingId ? updater(q) : q) })));
  }
function handleConfirmCancel(bookingId, reason) {
    // If cancelling an in_progress booking, free the barber
    setBarbers(prev => prev.map(b => {
      const wasInProg = b.queue.some(q => q.id === bookingId && q.status === 'in_progress');
      return {
        ...b,
        status: wasInProg ? 'available' : b.status,
        queue: b.queue.filter(q => q.id !== bookingId),
      };
    }));
    setCancelModal(null);
    // Production: POST /api/bookings/:id/cancel { reason }
    // Backend maps reason "Customer no-show — didn't arrive" → status: no_show
  }

  function handleConfirmForceStart(booking) {
    mutateBooking(booking.id, b => ({ ...b, status: 'in_progress', elapsedMin: 0, estDurationMin: b.estDurationMin || 45 }));
    setBarbers(prev => prev.map(b =>
      b.queue.some(q => q.id === booking.id) ? { ...b, status: 'busy' } : b
    ));
    setForceStartModal(null);
    // Production: POST /api/bookings/:id/start (same endpoint as barber Mulai)
  }

  // ── Derived stats ──
  const totalInService = barbers.filter(b => b.status === 'busy').length;
  const totalWaiting   = barbers.reduce((a, b) => a + b.queue.filter(q => q.status === 'confirmed').length, 0);
  const totalAlerts    = barbers.reduce((a, b) => a + b.queue.filter(q => q.clientNotArrived).length, 0);
  const refreshStr     = lastRefresh.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

  const displayBranches = branchFilter === 'all'
    ? LIVE_BRANCHES
    : LIVE_BRANCHES.filter(b => b.id === Number(branchFilter));

  const cancelBarberName     = cancelModal     ? barbers.find(b => b.queue.some(q => q.id === cancelModal.booking.id))?.name     || '' : '';
  const forceStartBarberName = forceStartModal ? barbers.find(b => b.queue.some(q => q.id === forceStartModal.booking.id))?.name || '' : '';

  return (
    <div style={{ padding:'28px 32px' }}>
      <style>{`
        @keyframes scaleIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes pulse   { 0%{box-shadow:0 0 0 0 rgba(22,163,74,0.5)} 70%{box-shadow:0 0 0 6px rgba(22,163,74,0)} 100%{box-shadow:0 0 0 0 rgba(22,163,74,0)} }
      `}</style>

      {/* Modals */}
      {cancelModal && (
        <CancelModal booking={cancelModal.booking} barberName={cancelBarberName}
          onConfirm={handleConfirmCancel} onClose={() => setCancelModal(null)} />
      )}
      {forceStartModal && (
        <ForceStartModal booking={forceStartModal.booking} barberName={forceStartBarberName}
          onConfirm={handleConfirmForceStart} onClose={() => setForceStartModal(null)} />
      )}
      {showPaxModal && (
        <LogPaxOutModal onLog={e => setPaxOutEvents(p => [e, ...p])} onClose={() => setShowPaxModal(false)} />
      )}

      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:26, color:C.text }}>Live Queue Management</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, background:'#F0FDF4', border:'1px solid #BBF7D0' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#16A34A', animation:'pulse 2s infinite' }} />
              <span style={{ fontSize:11, fontWeight:700, color:'#15803D' }}>LIVE</span>
            </div>
          </div>
          <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>
            Admin queue control — all branches · Updated {refreshStr}
          </div>
        </div>
        <button onClick={() => setShowPaxModal(true)}
          style={{ padding:'9px 16px', borderRadius:8, background:C.topBg, color:C.white,
            fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
          + Log Pax Out
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:20, maxWidth:560 }}>
        {[
          { label:'In Service',   value:totalInService, color:'#15803D', bg:'#F0FDF4', border:'#BBF7D0' },
          { label:'Waiting',      value:totalWaiting,   color:'#1D4ED8', bg:'#EFF6FF', border:'#BFDBFE' },
          { label:'Alerts',       value:totalAlerts,    color:'#92400E', bg:'#FEF3C7', border:'#FDE68A' },
          { label:'Pax Out Today',value:paxOutEvents.length, color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
        ].map(k => (
          <div key={k.label} style={{ padding:'12px 16px', borderRadius:10, background:k.bg, border:`1px solid ${k.border}` }}>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:k.color, marginBottom:4 }}>{k.label}</div>
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:28, color:k.color, lineHeight:1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Branch filter */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <button onClick={() => setBranchFilter('all')}
          style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${branchFilter === 'all' ? C.topBg : C.border}`,
            background: branchFilter === 'all' ? C.topBg : 'transparent', color: branchFilter === 'all' ? C.white : C.text2,
            fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:12, cursor:'pointer', transition:'all 0.12s' }}>
          All Branches
        </button>
        {LIVE_BRANCHES.map(b => (
          <button key={b.id} onClick={() => setBranchFilter(String(b.id))}
            style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${branchFilter === String(b.id) ? C.topBg : C.border}`,
              background: branchFilter === String(b.id) ? C.topBg : 'transparent', color: branchFilter === String(b.id) ? C.white : C.text2,
              fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:12, cursor:'pointer', transition:'all 0.12s' }}>
            {b.city}
          </button>
        ))}
      </div>

      {/* Alert banner */}
      {totalAlerts > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderRadius:10,
          background:'#FFFBEB', border:'1px solid #FDE68A', marginBottom:20 }}>
          <span style={{ fontSize:16 }}>⚠</span>
          <div>
            <span style={{ fontSize:13, fontWeight:700, color:'#92400E' }}>
              {totalAlerts} booking{totalAlerts > 1 ? 's' : ''} flagged — client not arrived.
            </span>
            <span style={{ fontSize:12, color:'#A16207', marginLeft:6 }}>
              Review the amber rows below and take action (No-show or Cancel).
            </span>
          </div>
        </div>
      )}

      {/* Branch queue sections */}
      {displayBranches.map(branch => {
        const branchBarbers = barbers.filter(b => b.branchId === branch.id);
        return (
          <BranchSection key={branch.id} branch={branch} barbers={branchBarbers}
            onCancel={bk => setCancelModal({ booking: bk })}
            onStart={bk => setForceStartModal({ booking: bk })}
            tick={tick}
          />
        );
      })}

      {/* Pax Out panel (collapsible) */}
      <div className="admin-card" style={{ overflow:'hidden', marginTop:8 }}>
        <button onClick={() => setShowPaxPanel(p => !p)}
          style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'14px 18px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
          <div>
            <span style={{ fontFamily:"'Inter', sans-serif", fontWeight:700, fontSize:14, color:C.text }}>Pax Out Today</span>
            <span style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:16, color:'#DC2626', marginLeft:12 }}>{paxOutEvents.length}</span>
            <span style={{ fontSize:12, color:C.muted, marginLeft:6 }}>walk-aways logged</span>
          </div>
          <span style={{ fontSize:12, color:C.muted }}>{showPaxPanel ? '▲ Collapse' : '▼ Expand'}</span>
        </button>

        {showPaxPanel && (
          <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 18px', maxHeight:300, overflowY:'auto' }}>
            {paxOutEvents.length === 0 && (
              <div style={{ textAlign:'center', padding:'24px 0', color:C.muted, fontSize:13 }}>No pax outs logged today.</div>
            )}
            {paxOutEvents.map(e => (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, background:C.bg, marginBottom:5 }}>
                <span style={{ fontFamily:"'Inter', sans-serif", fontSize:11, fontWeight:700, color:C.muted, width:40, flexShrink:0 }}>{e.time}</span>
                <span style={{ fontSize:12, fontWeight:600, color:C.text2, width:72, flexShrink:0 }}>{e.branch}</span>
                <span style={{ fontSize:12, color:C.text, flex:1 }}>{e.reason}</span>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4, background:C.topBg, color:'#F5E200', flexShrink:0 }}>{e.source}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
