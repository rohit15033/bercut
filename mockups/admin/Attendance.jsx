/**
 * MOCKUP — Bercut Admin: Attendance
 *
 * What it does: Monthly attendance calendar per barber — present/late/off per day.
 *   Left panel: barber list with summary badges and dot timeline.
 *   Right panel: 7-column calendar grid for selected barber + incident list.
 *   Log Off button opens modal to record an absence.
 * State managed: selectedBranch, selectedBarberForCalendar, showLogOff
 * Production API:
 *   GET  /api/attendance/monthly?branch_id=&year=&month=
 *   POST /api/attendance/off  { barber_id, date, type, note }
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Attendance.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { C, MONTHLY_ATTENDANCE, ALL_BARBERS } from './data.js';

const MONTH_DAYS   = Array.from({ length: 30 }, (_, i) => i + 1);
const CAL_LEAD     = 2;
const CAL_TRAIL    = 3;
const CAL_DAY_HDRS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const STATUS_CFG = {
  P:  { label:'Present',        bg:'#F0FDF4', color:'#15803D', dot:'#16A34A' },
  L:  { label:'Late',           bg:'#FFFBEB', color:'#92400E', dot:'#D97706' },
  OE: { label:'Off (Excused)',  bg:'#EFF6FF', color:'#1D4ED8', dot:'#2563EB' },
  OI: { label:'Off (No Excuse)',bg:'#FEF2F2', color:'#991B1B', dot:'#DC2626' },
  OS: { label:'Off (Doctor)',   bg:'#F3E8FF', color:'#6B21A8', dot:'#9333EA' },
  DO: { label:'Day Off',        bg:'transparent', color:C.muted, dot:C.border },
};

// ── Calendar cell ─────────────────────────────────────────────────────────────

function CalendarCell({ day, record, isWeekend }) {
  if (!day) return <div style={{ minHeight: 78 }} />;
  if (isWeekend || record?.s === 'DO') {
    return (
      <div style={{ minHeight: 78, borderRadius: 10, background: C.surface, padding: '7px 9px' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.border }}>{day}</span>
      </div>
    );
  }
  if (!record) {
    return (
      <div style={{ minHeight: 78, borderRadius: 10, background: C.surface, padding: '7px 9px', border: '1px dashed ' + C.border }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.border }}>{day}</span>
      </div>
    );
  }
  const cfg = STATUS_CFG[record.s] || STATUS_CFG.P;
  return (
    <div title={record.branch || ''} style={{ minHeight: 78, borderRadius: 10, background: cfg.bg, padding: '7px 9px', border: '1px solid ' + cfg.dot + '44' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{day}</span>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: cfg.color, background: cfg.dot + '28', padding: '2px 6px', borderRadius: 4, alignSelf: 'flex-start' }}>
          {record.s}
        </span>
        {record.s === 'L' && record.lateMin && (
          <span style={{ fontSize: 10, color: cfg.color, fontWeight: 600 }}>{record.lateMin} min</span>
        )}
        {record.branch && (
          <span style={{ fontSize: 9, color: cfg.color, opacity: 0.7 }}>{record.branch}</span>
        )}
      </div>
    </div>
  );
}

// ── Barber summary card ───────────────────────────────────────────────────────

function BarberSummaryCard({ name, records, isSelected, onClick }) {
  const days    = records || {};
  const pCount  = Object.values(days).filter(d => d.s === 'P').length;
  const lCount  = Object.values(days).filter(d => d.s === 'L').length;
  const lMins   = Object.values(days).filter(d => d.s === 'L').reduce((s, d) => s + (d.lateMin || 0), 0);
  const oeCount = Object.values(days).filter(d => d.s === 'OE').length;
  const oiCount = Object.values(days).filter(d => d.s === 'OI').length;
  const osCount = Object.values(days).filter(d => d.s === 'OS').length;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const badges = [
    { val: pCount,  color: '#16A34A', label: 'P' },
    lCount  > 0 && { val: lCount,  color: '#D97706', label: `L · ${lMins}min` },
    oeCount > 0 && { val: oeCount, color: '#2563EB', label: 'OE' },
    oiCount > 0 && { val: oiCount, color: '#DC2626', label: 'OI' },
    osCount > 0 && { val: osCount, color: '#9333EA', label: 'OS' },
  ].filter(Boolean);

  return (
    <div onClick={onClick}
      style={{ padding: '12px 14px', borderBottom: '1px solid ' + C.border, cursor: 'pointer', background: isSelected ? '#EEF2FF' : 'transparent', borderLeft: isSelected ? '3px solid ' + C.topBg : '3px solid transparent', transition: 'background 0.12s' }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.bg; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 11, color: C.accent }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {badges.map((b, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: b.color }}>{b.val}× {b.label}</span>
            ))}
          </div>
        </div>
        {isSelected && <span style={{ fontSize: 12, color: C.topBg }}>▶</span>}
      </div>
      <div style={{ display: 'flex', gap: 2, marginTop: 8, paddingLeft: 41 }}>
        {MONTH_DAYS.map(d => {
          const rec = days[d];
          const isWeekend = MONTHLY_ATTENDANCE.weekends.includes(d);
          const dotColor = isWeekend ? C.border : rec ? (STATUS_CFG[rec.s]?.dot || C.border) : '#E5E5E5';
          return <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />;
        })}
      </div>
    </div>
  );
}

// ── Log Off modal ─────────────────────────────────────────────────────────────

function LogOffModal({ barberNames, onClose, onSave }) {
  const [barber, setBarber] = useState(barberNames[0] || '');
  const [date,   setDate]   = useState('');
  const [type,   setType]   = useState('OE');
  const [note,   setNote]   = useState('');
  const [errors, setErrors] = useState({});

  function handleSave() {
    const e = {};
    if (!barber) e.barber = true;
    if (!date)   e.date   = true;
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ barber, date, type, note });
    onClose();
  }

  const TYPE_OPTIONS = [
    { key: 'OE', label: 'Excused Off',                         desc: 'Approved absence — counts toward monthly quota' },
    { key: 'OI', label: 'Inexcused Off',                       desc: 'No prior approval — flat deduction applies'     },
    { key: 'OS', label: 'Off with Doctor Note (Surat Dokter)', desc: 'Medical — no deduction'                        },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-card" style={{ width: 440, padding: '24px 28px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: C.text }}>Log Off Record</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: errors.barber ? C.danger : C.muted, marginBottom: 5 }}>Barber *</label>
            <select value={barber} onChange={e => setBarber(e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + (errors.barber ? C.danger : C.border), fontSize: 13, color: C.text, background: C.white }}>
              {barberNames.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: errors.date ? C.danger : C.muted, marginBottom: 5 }}>Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + (errors.date ? C.danger : C.border), fontSize: 13, color: C.text, background: C.white, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>Off Type *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TYPE_OPTIONS.map(opt => (
                <label key={opt.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1.5px solid ' + (type === opt.key ? C.topBg : C.border), background: type === opt.key ? C.surface : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <input type="radio" name="offType" value={opt.key} checked={type === opt.key} onChange={() => setType(opt.key)} style={{ marginTop: 2, accentColor: C.topBg }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Family event, confirmed by manager"
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, background: C.white, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 9, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave}
            style={{ flex: 2, padding: '11px', borderRadius: 9, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            Save Off Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Attendance({ onViewPayroll }) {
  const [selectedBranch,            setSelectedBranch]            = useState('Seminyak');
  const [selectedBarberForCalendar, setSelectedBarberForCalendar] = useState(null);
  const [showLogOff,                setShowLogOff]                = useState(false);

  const branchNames = [...new Set(Object.values(MONTHLY_ATTENDANCE.records).flatMap(d =>
    Object.values(d).map(v => v.branch).filter(Boolean)
  ))].sort();

  const barberNamesForBranch = Object.entries(MONTHLY_ATTENDANCE.records)
    .filter(([, days]) => Object.values(days).some(d => d.branch === selectedBranch))
    .map(([name]) => name);

  const barberNamesForModal = ALL_BARBERS.filter(b => b.isActive && b.branch === selectedBranch).map(b => b.name);

  return (
    <div style={{ padding: '28px 32px' }}>

      {showLogOff && (
        <LogOffModal
          barberNames={barberNamesForModal}
          onClose={() => setShowLogOff(false)}
          onSave={rec => { alert(`Off record saved (demo):\n${rec.barber} · ${rec.date} · ${rec.type}`); }}
        />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Attendance</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>April 2026 · Monthly attendance record</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onViewPayroll && (
            <button onClick={onViewPayroll}
              style={{ padding: '9px 16px', borderRadius: 8, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: '1px solid ' + C.border, cursor: 'pointer' }}>
              → Payroll
            </button>
          )}
          <button onClick={() => setShowLogOff(true)}
            style={{ padding: '9px 16px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            + Log Off
          </button>
        </div>
      </div>

      {/* Branch selector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <select value={selectedBranch} onChange={e => { setSelectedBranch(e.target.value); setSelectedBarberForCalendar(null); }}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid ' + C.border, background: C.white, fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
          {branchNames.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', height: 'calc(100vh - 218px)', minHeight: 520 }}>
        <div style={{ width: 290, flexShrink: 0, borderRight: '1px solid ' + C.border, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid ' + C.border, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_CFG).filter(([k]) => k !== 'DO').map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot }} />
                <span style={{ fontSize: 10, color: C.muted }}>{cfg.label}</span>
              </div>
            ))}
          </div>
          {barberNamesForBranch.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 13 }}>No barbers for this branch.</div>
          )}
          {barberNamesForBranch.map(name => (
            <BarberSummaryCard
              key={name} name={name}
              records={MONTHLY_ATTENDANCE.records[name]}
              isSelected={selectedBarberForCalendar === name}
              onClick={() => setSelectedBarberForCalendar(name)}
            />
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: C.bg }}>
          {!selectedBarberForCalendar ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ fontSize: 32, opacity: 0.2 }}>📅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>Select a barber to view their April attendance</div>
            </div>
          ) : (() => {
            const records   = MONTHLY_ATTENDANCE.records[selectedBarberForCalendar] || {};
            const incidents = Object.entries(records).filter(([, d]) => ['L','OE','OI','OS'].includes(d.s)).sort(([a],[b]) => Number(a) - Number(b));
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{selectedBarberForCalendar}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>April 2026</div>
                  </div>
                  <button onClick={() => setSelectedBarberForCalendar(null)}
                    style={{ fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>✕ Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                  {CAL_DAY_HDRS.map(h => (
                    <div key={h} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: h === 'Sat' || h === 'Sun' ? C.border : C.muted, paddingBottom: 4 }}>{h}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {Array.from({ length: CAL_LEAD }).map((_, i)  => <div key={'lead-'+i}  style={{ minHeight: 78 }} />)}
                  {MONTH_DAYS.map(d => <CalendarCell key={d} day={d} record={records[d]} isWeekend={MONTHLY_ATTENDANCE.weekends.includes(d)} />)}
                  {Array.from({ length: CAL_TRAIL }).map((_, i) => <div key={'trail-'+i} style={{ minHeight: 78 }} />)}
                </div>
                {incidents.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: 8 }}>Incidents this month</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {incidents.map(([day, d]) => {
                        const cfg = STATUS_CFG[d.s];
                        return (
                          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 8, background: cfg.bg, border: '1px solid ' + cfg.dot + '33' }}>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: cfg.color, width: 52 }}>Apr {day}</span>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: cfg.dot + '28', color: cfg.color }}>{cfg.label}</span>
                            {d.s === 'L' && <span style={{ fontSize: 12, color: cfg.color }}>{d.lateMin} minutes late</span>}
                            {d.branch && <span style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>@ {d.branch}</span>}
                            {d.s === 'OS' && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 4, background: '#F3E8FF', color: '#6B21A8', fontWeight: 700, marginLeft: 4 }}>Surat Dokter</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
