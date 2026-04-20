/**
 * MOCKUP — Bercut Admin: Reports
 *
 * What it does: Revenue breakdowns, pax out demand analysis, and delay report.
 *   Tabs: Revenue | Demand | Delay Report
 *   Revenue: KPI cards, bar chart, payment method split, transaction log.
 *   Demand: Pax out KPIs, daily pax-in vs pax-out chart, drop-off by step, recent log.
 *   Delay Report: Incidents table with resolve action.
 * State managed: branch, period, activeTab, delayBranchFilter, delayStatuses
 * Production API:
 *   GET /api/admin/reports?branch_id=&period=&from=&to=
 *   GET /api/admin/pax-out?from=&to=&branch_id=
 *   GET /api/admin/delay-incidents?branch_id=&from=&to=
 *   PATCH /api/admin/delay-incidents/:id { status: 'resolved' }
 * Feeds into: —
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Reports.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { C, BRANCHES, REPORT_ROWS, WEEKLY_CHART, DELAY_LOG, fmt, fmtM } from './data.js';

// ── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDate(s) {
  if (!s) return '—';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${MONTH_NAMES[parseInt(m[2])-1]} ${parseInt(m[3])} ${m[1]}`;
}

// ── DateRangePicker (two-month calendar) ──────────────────────────────────────

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
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontSize:9, fontWeight:700, color:C.muted, textAlign:'center', padding:'2px 0', textTransform:'uppercase' }}>{d}</div>)}
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

  const label = from && to ? `${fmtDate(from)}  –  ${fmtDate(to)}` : from ? `From ${fmtDate(from)}` : 'Pick range';

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
              <span style={{ fontSize:11, color:C.muted }}>{fmtDate(from)} – {fmtDate(to)}</span>
              <button onClick={() => onChange(null, null)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:C.surface, color:C.text2, fontSize:11, fontWeight:600, cursor:'pointer' }}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PeriodFilter — global preset buttons + custom calendar ────────────────────

function PeriodFilter({ period, filterFrom, filterTo, onPeriod, onDates }) {
  const presets = [
    { key:'today', label:'Today'      },
    { key:'week',  label:'This Week'  },
    { key:'month', label:'This Month' },
    { key:'custom',label:'Custom'     },
  ];
  const btnSt = active => ({
    padding:'5px 13px', borderRadius:5, border:'none',
    background: active ? C.topBg : 'transparent',
    color:      active ? C.white  : C.muted,
    fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 0.12s',
  });
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ display:'flex', gap:2, background:C.surface, padding:2, borderRadius:7 }}>
        {presets.map(p => (
          <button key={p.key} style={btnSt(period === p.key)} onClick={() => onPeriod(p.key)}>{p.label}</button>
        ))}
      </div>
      {period === 'custom' && <DateRangePicker from={filterFrom} to={filterTo} onChange={onDates} />}
    </div>
  );
}

// ── Mock pax-out data (Demand tab) ────────────────────────────────────────────

const PAX_OUT_TODAY = [
  { t:'08:42', branch:'Seminyak', step:1, stepLabel:'Service Selection', source:'kiosk_timeout', reason:null                        },
  { t:'09:05', branch:'Canggu',   step:1, stepLabel:'Service Selection', source:'kiosk_back',    reason:null                        },
  { t:'09:18', branch:'Seminyak', step:2, stepLabel:'Barber Selection',  source:'kiosk_timeout', reason:null                        },
  { t:'09:31', branch:'Denpasar', step:null, stepLabel:null,             source:'cctv_manual',   reason:'Full queue — customer left' },
  { t:'09:44', branch:'Uluwatu',  step:1, stepLabel:'Service Selection', source:'kiosk_timeout', reason:null                        },
  { t:'10:02', branch:'Seminyak', step:3, stepLabel:'Time Slot',         source:'kiosk_timeout', reason:null                        },
  { t:'10:17', branch:'Canggu',   step:null, stepLabel:null,             source:'cctv_manual',   reason:'Wait too long'             },
  { t:'10:29', branch:'Denpasar', step:1, stepLabel:'Service Selection', source:'kiosk_timeout', reason:null                        },
  { t:'10:45', branch:'Seminyak', step:2, stepLabel:'Barber Selection',  source:'kiosk_timeout', reason:null                        },
  { t:'11:03', branch:'Legian',   step:4, stepLabel:'Confirm',           source:'kiosk_timeout', reason:null                        },
  { t:'11:22', branch:'Seminyak', step:1, stepLabel:'Service Selection', source:'kiosk_back',    reason:null                        },
  { t:'11:38', branch:'Canggu',   step:3, stepLabel:'Time Slot',         source:'kiosk_timeout', reason:null                        },
  { t:'11:55', branch:'Ubud',     step:null, stepLabel:null,             source:'cctv_manual',   reason:'Too expensive'             },
  { t:'12:10', branch:'Denpasar', step:2, stepLabel:'Barber Selection',  source:'kiosk_timeout', reason:null                        },
];

const PAX_DAILY = [
  { label:'Mon', paxIn:48, paxOut:9  },
  { label:'Tue', paxIn:52, paxOut:11 },
  { label:'Wed', paxIn:41, paxOut:7  },
  { label:'Thu', paxIn:61, paxOut:13 },
  { label:'Fri', paxIn:74, paxOut:16 },
  { label:'Sat', paxIn:95, paxOut:18 },
  { label:'Sun', paxIn:89, paxOut:15 },
];

// ── Barber performance mock data ──────────────────────────────────────────────

const BARBER_PERF = [
  { id:1, name:'Rifky Ramadhan', initials:'RR', branch:'Seminyak', services:52, revenue:6240000, commission:2520000, tips:420000 },
  { id:2, name:'Guntur Wibowo',  initials:'GW', branch:'Seminyak', services:47, revenue:5640000, commission:2070000, tips:380000 },
  { id:3, name:'Agung Pratama',  initials:'AP', branch:'Seminyak', services:44, revenue:5280000, commission:1800000, tips:290000 },
  { id:4, name:'Pangestu Adi',   initials:'PA', branch:'Seminyak', services:41, revenue:4920000, commission:1700000, tips:310000 },
  { id:5, name:'Rahmat Suharto', initials:'RS', branch:'Seminyak', services:32, revenue:3840000, commission:840000,  tips:210000 },
  { id:6, name:'Sep Agustian',   initials:'SA', branch:'Seminyak', services:28, revenue:3360000, commission:1200000, tips:180000 },
];

const BARBER_TX_DATA = {
  'Rifky Ramadhan': [
    { date:'19 Apr', time:'09:10', booking:'BK-0441', customer:'Bimo S.',    service:'Hair Cut + Beard Trim',  method:'qris', amount:130000, commission:52000, tip:20000 },
    { date:'19 Apr', time:'10:30', booking:'BK-0448', customer:'James T.',   service:'Hair Cut',               method:'card', amount:90000,  commission:36000, tip:0     },
    { date:'18 Apr', time:'14:00', booking:'BK-0431', customer:'Putu A.',    service:'Full Package',           method:'qris', amount:200000, commission:80000, tip:50000 },
    { date:'18 Apr', time:'15:45', booking:'BK-0435', customer:'David L.',   service:'Beard Trim',             method:'card', amount:60000,  commission:24000, tip:0     },
    { date:'17 Apr', time:'11:20', booking:'BK-0418', customer:'Kevin M.',   service:'Hair Cut',               method:'qris', amount:90000,  commission:36000, tip:10000 },
    { date:'17 Apr', time:'13:05', booking:'BK-0422', customer:'Wayan D.',   service:'Hair Cut + Beard Trim',  method:'qris', amount:130000, commission:52000, tip:20000 },
    { date:'16 Apr', time:'09:45', booking:'BK-0401', customer:'Ahmad F.',   service:'Full Package',           method:'card', amount:200000, commission:80000, tip:0     },
    { date:'16 Apr', time:'11:30', booking:'BK-0405', customer:'Luca B.',    service:'Hair Cut',               method:'qris', amount:90000,  commission:36000, tip:20000 },
  ],
  'Guntur Wibowo': [
    { date:'19 Apr', time:'09:30', booking:'BK-0442', customer:'Marco R.',   service:'Hair Cut + Beard Trim',  method:'qris', amount:130000, commission:52000, tip:20000 },
    { date:'19 Apr', time:'11:00', booking:'BK-0449', customer:'Sandi P.',   service:'Hair Cut',               method:'card', amount:90000,  commission:36000, tip:0     },
    { date:'18 Apr', time:'10:15', booking:'BK-0429', customer:'Ryan K.',    service:'Full Package',           method:'qris', amount:200000, commission:80000, tip:30000 },
    { date:'18 Apr', time:'14:30', booking:'BK-0436', customer:'Eko W.',     service:'Beard Trim',             method:'card', amount:60000,  commission:24000, tip:0     },
    { date:'17 Apr', time:'09:00', booking:'BK-0415', customer:'Hendra S.',  service:'Hair Cut',               method:'qris', amount:90000,  commission:36000, tip:0     },
    { date:'16 Apr', time:'13:00', booking:'BK-0406', customer:'Fahmi A.',   service:'Hair Cut + Beard Trim',  method:'qris', amount:130000, commission:52000, tip:50000 },
  ],
  'Agung Pratama': [
    { date:'19 Apr', time:'10:00', booking:'BK-0443', customer:'Denny H.',   service:'Hair Cut',               method:'qris', amount:90000,  commission:36000, tip:0     },
    { date:'18 Apr', time:'11:30', booking:'BK-0430', customer:'Reza M.',    service:'Full Package',           method:'card', amount:200000, commission:80000, tip:20000 },
    { date:'17 Apr', time:'14:20', booking:'BK-0420', customer:'Taufik N.',  service:'Hair Cut + Beard Trim',  method:'qris', amount:130000, commission:52000, tip:0     },
    { date:'16 Apr', time:'10:30', booking:'BK-0402', customer:'Bagas R.',   service:'Hair Cut',               method:'card', amount:90000,  commission:36000, tip:10000 },
  ],
  'Pangestu Adi': [
    { date:'19 Apr', time:'10:45', booking:'BK-0444', customer:'Irfan S.',   service:'Hair Cut',               method:'qris', amount:90000,  commission:36000, tip:20000 },
    { date:'18 Apr', time:'13:00', booking:'BK-0432', customer:'Yogi P.',    service:'Beard Trim',             method:'card', amount:60000,  commission:24000, tip:0     },
    { date:'17 Apr', time:'10:00', booking:'BK-0416', customer:'Dimas A.',   service:'Hair Cut + Beard Trim',  method:'qris', amount:130000, commission:52000, tip:30000 },
    { date:'16 Apr', time:'14:00', booking:'BK-0407', customer:'Arief N.',   service:'Full Package',           method:'qris', amount:200000, commission:80000, tip:0     },
  ],
  'Rahmat Suharto': [
    { date:'19 Apr', time:'11:15', booking:'BK-0445', customer:'Galih P.',   service:'Hair Cut',               method:'qris', amount:90000,  commission:36000, tip:0     },
    { date:'18 Apr', time:'15:00', booking:'BK-0437', customer:'Andi W.',    service:'Hair Cut + Beard Trim',  method:'card', amount:130000, commission:52000, tip:10000 },
    { date:'16 Apr', time:'09:00', booking:'BK-0400', customer:'Rizky F.',   service:'Hair Cut',               method:'qris', amount:90000,  commission:36000, tip:0     },
  ],
  'Sep Agustian': [
    { date:'19 Apr', time:'13:00', booking:'BK-0447', customer:'Faris L.',   service:'Hair Cut',               method:'card', amount:90000,  commission:36000, tip:0     },
    { date:'17 Apr', time:'15:00', booking:'BK-0425', customer:'Nanda K.',   service:'Beard Trim',             method:'qris', amount:60000,  commission:24000, tip:20000 },
    { date:'16 Apr', time:'11:00', booking:'BK-0403', customer:'Surya M.',   service:'Hair Cut',               method:'qris', amount:90000,  commission:36000, tip:0     },
  ],
};

const SOURCE_CFG = {
  kiosk_timeout: { label:'Session timeout', color:'#2563EB', bg:'#EFF6FF' },
  kiosk_back:    { label:'Back to welcome', color:'#7C3AED', bg:'#EDE9FE' },
  cctv_manual:   { label:'CCTV logged',     color:'#D97706', bg:'#FFFBEB' },
};

// ── Revenue bar chart ─────────────────────────────────────────────────────────

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

// ── Pax in vs out dual bar chart ──────────────────────────────────────────────

function DualBarChart({ data }) {
  const maxVal = Math.max(...data.flatMap(d => [d.paxIn, d.paxOut]));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140, padding: '0 4px' }}>
      {data.map(d => {
        const inH  = Math.max(4, Math.round((d.paxIn  / maxVal) * 120));
        const outH = Math.max(4, Math.round((d.paxOut / maxVal) * 120));
        return (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, width: '100%', justifyContent: 'center' }}>
              <div title={`Pax in: ${d.paxIn}`}  style={{ flex: 1, maxWidth: 20, height: inH,  background: C.topBg, borderRadius: '3px 3px 0 0' }} />
              <div title={`Pax out: ${d.paxOut}`} style={{ flex: 1, maxWidth: 20, height: outH, background: '#DC2626', borderRadius: '3px 3px 0 0', opacity: 0.75 }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text2 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [filterPeriod,  setFilterPeriod]  = useState('month');
  const [filterFrom,    setFilterFrom]    = useState(null);
  const [filterTo,      setFilterTo]      = useState(null);
  const [branch,        setBranch]        = useState('All Branches');
  const [activeTab,     setActiveTab]     = useState('revenue');
  const [delayBranch,      setDelayBranch]      = useState('all');
  const [delayStatuses,    setDelayStatuses]    = useState(() => Object.fromEntries(DELAY_LOG.map((d, i) => [i, d.status])));
  const [perfSortBy,       setPerfSortBy]       = useState('revenue');
  const [perfSortDir,      setPerfSortDir]      = useState('desc');
  const [selectedBarber,   setSelectedBarber]   = useState(null);

  // Revenue KPIs
  const totalRevenue  = REPORT_ROWS.reduce((a, r) => a + r.amount, 0);
  const totalTips     = REPORT_ROWS.reduce((a, r) => a + r.tip,    0);
  const totalBookings = REPORT_ROWS.length;
  const avgOrder      = Math.round(totalRevenue / totalBookings);
  const qrisCount     = REPORT_ROWS.filter(r => r.method === 'qris').length;
  const cardCount     = REPORT_ROWS.filter(r => r.method === 'card').length;
  const qrisPct       = Math.round(qrisCount / totalBookings * 100);

  // Demand KPIs
  const paxOutTotal    = PAX_OUT_TODAY.length;
  const weeklyPaxIn    = PAX_DAILY.reduce((s, d) => s + d.paxIn,  0);
  const weeklyPaxOut   = PAX_DAILY.reduce((s, d) => s + d.paxOut, 0);
  const convRate       = Math.round(weeklyPaxIn / (weeklyPaxIn + weeklyPaxOut) * 100);
  const stepCounts     = PAX_OUT_TODAY.filter(e => e.step).reduce((acc, e) => {
    const k = `Step ${e.step} — ${e.stepLabel}`;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const topDropStep    = Object.entries(stepCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const sourceCounts   = PAX_OUT_TODAY.reduce((acc, e) => { acc[e.source] = (acc[e.source] || 0) + 1; return acc; }, {});

  // Delay KPIs
  const delayFiltered  = DELAY_LOG.filter(d => delayBranch === 'all' || d.branch === delayBranch);
  const totalIncidents = delayFiltered.length;
  const avgDelay       = totalIncidents ? Math.round(delayFiltered.reduce((a, d) => a + d.delayMin, 0) / totalIncidents) : 0;
  const flaggedCount   = delayFiltered.filter((d, i) => (delayStatuses[DELAY_LOG.indexOf(d)] || d.status) === 'flagged').length;
  const resolvedCount  = totalIncidents - flaggedCount;

  function resolveDelay(globalIdx) {
    setDelayStatuses(s => ({ ...s, [globalIdx]: 'resolved' }));
  }

  const TABS = [
    { key: 'revenue',     label: 'Revenue'           },
    { key: 'demand',      label: 'Demand'             },
    { key: 'delay',       label: 'Delay Report'       },
    { key: 'performance', label: 'Barber Performance' },
  ];

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Reports</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Revenue, pax out demand analysis, and delay incidents</div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          ↓ Export CSV
        </button>
      </div>

      {/* Global filters */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap', justifyContent:'space-between' }}>
        <PeriodFilter
          period={filterPeriod}
          filterFrom={filterFrom}
          filterTo={filterTo}
          onPeriod={k => { setFilterPeriod(k); if (k !== 'custom') { setFilterFrom(null); setFilterTo(null); } }}
          onDates={(f, t) => { setFilterFrom(f); setFilterTo(t); }}
        />
        <select value={branch} onChange={e => setBranch(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:'1px solid '+C.border, background:C.white, fontSize:13, fontWeight:600, color:C.text, cursor:'pointer' }}>
          <option>All Branches</option>
          {BRANCHES.map(b => <option key={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid ' + C.border, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid ' + C.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: activeTab === t.key ? C.text : C.muted, cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s' }}>
            {t.label}
            {t.key === 'delay' && flaggedCount > 0 && (
              <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', padding: '1px 6px', borderRadius: 10 }}>{flaggedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── REVENUE TAB ── */}
      {activeTab === 'revenue' && <>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue',   value: fmtM(totalRevenue), sub: filterPeriod === 'custom' && filterFrom && filterTo ? `${fmtDate(filterFrom)} – ${fmtDate(filterTo)}` : filterPeriod === 'today' ? 'Today' : filterPeriod === 'week' ? 'This Week' : 'This Month', accent: '#16A34A' },
          { label: 'Total Bookings',  value: totalBookings,       sub: 'Across all services',   accent: C.text    },
          { label: 'Avg Order Value', value: fmtM(avgOrder),     sub: 'Revenue per booking',   accent: '#2563EB' },
          { label: 'Tips Collected',  value: fmtM(totalTips),    sub: 'Separate from revenue', accent: '#9333EA' },
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

        <div className="admin-card" style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 20 }}>Payment Methods</div>
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
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Card (Xendit)</span>
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

      {/* Transaction log */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Transaction Log</div>
          <div style={{ fontSize: 12, color: C.muted }}>Showing {REPORT_ROWS.length} of {REPORT_ROWS.length} rows</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 0.5fr 1fr 1fr 1.2fr 2fr 0.7fr 0.9fr 0.6fr', padding: '8px 18px', borderBottom: '1px solid ' + C.surface }}>
          {['Date','Time','Client','Branch','Barber','Service','Method','Amount','Tip'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
          ))}
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {REPORT_ROWS.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '0.6fr 0.5fr 1fr 1fr 1.2fr 2fr 0.7fr 0.9fr 0.6fr', padding: '11px 18px', borderBottom: '1px solid ' + C.surface, alignItems: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 12, color: C.muted }}>{r.date}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.muted }}>{r.time}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r.client}</div>
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
      </div>

      </>}

      {/* ── DEMAND TAB ── */}
      {activeTab === 'demand' && <>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Pax In (week)',      value: weeklyPaxIn,          sub: 'Customers who booked',      accent: '#16A34A' },
            { label: 'Pax Out (week)',     value: weeklyPaxOut,         sub: 'Left without service',      accent: '#DC2626' },
            { label: 'Conversion Rate',   value: convRate + '%',        sub: 'Pax in ÷ (in + out)',       accent: C.text    },
            { label: 'Top Drop-off',      value: 'Step 1',              sub: 'Service Selection',         accent: '#D97706' },
          ].map((k, i) => (
            <div key={k.label} className="admin-card" style={{ padding: '18px 20px', animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: k.accent, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Chart + drop-off */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 24 }}>

          {/* Daily pax in vs out */}
          <div className="admin-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Pax In vs Pax Out</div>
              <div style={{ fontSize: 11, color: C.muted }}>This week · daily</div>
            </div>
            <DualBarChart data={PAX_DAILY} />
            <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: C.topBg }} />
                <span style={{ fontSize: 11, color: C.muted }}>Pax In</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: '#DC2626', opacity: 0.75 }} />
                <span style={{ fontSize: 11, color: C.muted }}>Pax Out</span>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: C.muted }}>Conversion this week: <strong style={{ color: C.text }}>{convRate}%</strong></span>
            </div>
          </div>

          {/* Drop-off by step */}
          <div className="admin-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>Drop-off by Step</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>Where customers abandoned today</div>

            {[
              { label: 'Service Selection', count: PAX_OUT_TODAY.filter(e => e.step === 1).length },
              { label: 'Barber Selection',  count: PAX_OUT_TODAY.filter(e => e.step === 2).length },
              { label: 'Time Slot',         count: PAX_OUT_TODAY.filter(e => e.step === 3).length },
              { label: 'Confirm',           count: PAX_OUT_TODAY.filter(e => e.step === 4).length },
              { label: 'CCTV (no step)',    count: PAX_OUT_TODAY.filter(e => !e.step).length       },
            ].map(row => {
              const pct = Math.round(row.count / paxOutTotal * 100);
              return (
                <div key={row.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{row.label}</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text }}>{row.count}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: C.surface2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: row.label === 'Service Selection' ? '#DC2626' : row.label.startsWith('CCTV') ? '#D97706' : C.topBg, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{pct}% of today's pax out</div>
                </div>
              );
            })}

            <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 14, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: 8 }}>By Source</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(sourceCounts).map(([src, cnt]) => {
                  const cfg = SOURCE_CFG[src] || { label: src, color: C.muted, bg: C.surface };
                  return (
                    <span key={src} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
                      {cfg.label} · {cnt}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Recent pax-out log */}
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Pax Out Log — Today</div>
            <div style={{ fontSize: 12, color: C.muted }}>{PAX_OUT_TODAY.length} events</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1.5fr 1.5fr 1fr', padding: '8px 18px', borderBottom: '1px solid ' + C.surface }}>
            {['Time','Branch','Step','Reason / Note','Source'].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
            ))}
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {[...PAX_OUT_TODAY].reverse().map((e, i) => {
              const cfg = SOURCE_CFG[e.source] || { label: e.source, color: C.muted, bg: C.surface };
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1.5fr 1.5fr 1fr', padding: '11px 18px', borderBottom: '1px solid ' + C.surface, alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = C.bg}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.muted }}>{e.t}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{e.branch}</div>
                  <div style={{ fontSize: 12, color: e.stepLabel ? C.text : C.muted, fontStyle: e.stepLabel ? 'normal' : 'italic' }}>
                    {e.stepLabel ?? '—'}
                  </div>
                  <div style={{ fontSize: 12, color: e.reason ? C.text2 : C.border }}>{e.reason ?? '—'}</div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </>}

      {/* ── DELAY REPORT TAB ── */}
      {activeTab === 'delay' && <>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Incidents', value: totalIncidents, accent: C.text    },
            { label: 'Avg Delay',       value: avgDelay + ' min', accent: '#D97706' },
            { label: 'Flagged',         value: flaggedCount,   accent: '#DC2626' },
            { label: 'Resolved',        value: resolvedCount,  accent: '#16A34A' },
          ].map((k, i) => (
            <div key={k.label} className="admin-card" style={{ padding: '18px 20px', animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: k.accent, lineHeight: 1 }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'All Branches' }, ...BRANCHES.map(b => ({ key: b.city, label: b.city }))].map(f => (
            <button key={f.key} onClick={() => setDelayBranch(f.key)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (delayBranch === f.key ? C.topBg : C.border), background: delayBranch === f.key ? C.topBg : 'transparent', color: delayBranch === f.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 1fr 1.5fr 0.7fr 0.7fr 0.7fr 0.5fr 0.8fr 0.7fr', padding: '10px 18px', borderBottom: '1px solid ' + C.surface }}>
            {['Date', 'Branch', 'Barber', 'Booking', 'Scheduled', 'Started', 'Delay', 'Status', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
            ))}
          </div>

          <div style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 160, overflowY: 'auto' }}>
          {delayFiltered.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 14 }}>No incidents for this branch</div>
          )}
          {delayFiltered.map((d) => {
            const globalIdx   = DELAY_LOG.indexOf(d);
            const currStatus  = delayStatuses[globalIdx] || d.status;
            const isFlagged   = currStatus === 'flagged';
            return (
              <div key={globalIdx}
                style={{ display: 'grid', gridTemplateColumns: '0.6fr 1fr 1.5fr 0.7fr 0.7fr 0.7fr 0.5fr 0.8fr 0.7fr', padding: '12px 18px', borderBottom: '1px solid ' + C.surface, alignItems: 'center', transition: 'background 0.1s', background: isFlagged ? '#FFFBEB' : 'transparent' }}
                onMouseEnter={e => { if (!isFlagged) e.currentTarget.style.background = C.bg; }}
                onMouseLeave={e => { if (!isFlagged) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ fontSize: 12, color: C.muted }}>{d.date}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{d.branch}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{d.barber}</div>
                <div style={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>{d.booking}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{d.scheduled}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{d.actualStart}</div>
                <div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: d.delayMin >= 20 ? '#DC2626' : d.delayMin >= 10 ? '#D97706' : C.text }}>
                    +{d.delayMin}m
                  </span>
                </div>
                <div>
                  {isFlagged
                    ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#FEF2F2', color: '#DC2626' }}>Flagged</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#F0FDF4', color: '#16A34A' }}>Resolved</span>
                  }
                </div>
                <div>
                  {isFlagged && (
                    <button onClick={() => resolveDelay(globalIdx)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #16A34A', background: 'transparent', color: '#16A34A', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
          Incidents are auto-generated when actual start exceeds scheduled time by more than 5 minutes.
        </div>
      </>}

      {/* ── BARBER PERFORMANCE TAB ── */}
      {activeTab === 'performance' && (() => {
        const sortedBarbers = [...BARBER_PERF].sort((a, b) =>
          perfSortDir === 'desc' ? b[perfSortBy] - a[perfSortBy] : a[perfSortBy] - b[perfSortBy]
        );

        function toggleSort(key) {
          if (perfSortBy === key) setPerfSortDir(d => d === 'desc' ? 'asc' : 'desc');
          else { setPerfSortBy(key); setPerfSortDir('desc'); }
        }

        function SortHeader({ label, sortKey, style }) {
          const active = perfSortBy === sortKey;
          return (
            <div onClick={() => toggleSort(sortKey)} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4, ...style }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: active ? C.text : C.muted }}>{label}</span>
              <span style={{ fontSize: 9, color: active ? C.text : C.border }}>{active ? (perfSortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
            </div>
          );
        }

        const txRows = selectedBarber ? (BARBER_TX_DATA[selectedBarber.name] || []) : [];
        const txRevenue    = txRows.reduce((s, r) => s + r.amount,     0);
        const txCommission = txRows.reduce((s, r) => s + r.commission, 0);
        const txTips       = txRows.reduce((s, r) => s + r.tip,        0);

        const perfTotal = {
          services:   BARBER_PERF.reduce((s, b) => s + b.services,   0),
          revenue:    BARBER_PERF.reduce((s, b) => s + b.revenue,    0),
          commission: BARBER_PERF.reduce((s, b) => s + b.commission, 0),
          tips:       BARBER_PERF.reduce((s, b) => s + b.tips,       0),
        };

        return (
          <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Services',   value: perfTotal.services,              accent: C.text,    sub: 'This period' },
                { label: 'Revenue Generated',value: fmtM(perfTotal.revenue),         accent: '#16A34A', sub: 'From all barbers' },
                { label: 'Commission Paid',  value: fmtM(perfTotal.commission),      accent: '#9333EA', sub: 'Across all barbers' },
                { label: 'Tips Collected',   value: fmtM(perfTotal.tips),            accent: '#2563EB', sub: 'Individual, not pooled' },
              ].map((k, i) => (
                <div key={k.label} className="admin-card" style={{ padding: '18px 20px', animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 24, color: k.accent, lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Ranking table */}
            <div className="admin-card" style={{ overflow: 'hidden', marginBottom: selectedBarber ? 16 : 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Barber Rankings</div>
                <div style={{ fontSize: 12, color: C.muted }}>Click a barber to see their transactions</div>
              </div>

              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '0.3fr 1.6fr 0.7fr 1fr 1fr 0.8fr 0.8fr', padding: '10px 18px', borderBottom: '1px solid ' + C.surface }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>#</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>Barber</div>
                <SortHeader label="Services"   sortKey="services"   />
                <SortHeader label="Revenue"    sortKey="revenue"    />
                <SortHeader label="Commission" sortKey="commission" />
                <SortHeader label="Avg Ticket" sortKey="revenue"    />
                <SortHeader label="Tips"       sortKey="tips"       />
              </div>

              {sortedBarbers.map((b, i) => {
                const isSelected = selectedBarber?.id === b.id;
                const avgTicket = Math.round(b.revenue / b.services);
                return (
                  <div key={b.id}
                    onClick={() => setSelectedBarber(isSelected ? null : b)}
                    style={{ display: 'grid', gridTemplateColumns: '0.3fr 1.6fr 0.7fr 1fr 1fr 0.8fr 0.8fr', padding: '13px 18px', borderBottom: '1px solid ' + C.surface, alignItems: 'center', cursor: 'pointer', background: isSelected ? C.surface : 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.bg; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>

                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 13, color: i === 0 ? '#D97706' : C.muted }}>{i + 1}</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 10, color: C.accent }}>{b.initials}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{b.branch}</div>
                      </div>
                    </div>

                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>{b.services}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#16A34A' }}>{fmtM(b.revenue)}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#9333EA' }}>{fmtM(b.commission)}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, color: C.text2 }}>{fmtM(avgTicket)}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, color: '#2563EB' }}>{fmtM(b.tips)}</div>
                  </div>
                );
              })}
            </div>

            {/* Transaction log drill-down */}
            {selectedBarber && (
              <div className="admin-card" style={{ overflow: 'hidden', animation: 'fadeUp 0.18s ease both' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 11, color: C.accent }}>{selectedBarber.initials}</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>{selectedBarber.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Transaction Log · {selectedBarber.branch}</div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedBarber(null)}
                    style={{ background: 'none', border: 'none', fontSize: 18, color: C.muted, cursor: 'pointer', padding: 4 }}>×</button>
                </div>

                {/* Summary strip */}
                <div style={{ padding: '12px 18px', borderBottom: '1px solid ' + C.surface, display: 'flex', gap: 28 }}>
                  {[
                    { label: 'Transactions', value: txRows.length,        color: C.text    },
                    { label: 'Revenue',      value: fmtM(txRevenue),      color: '#16A34A' },
                    { label: 'Commission',   value: fmtM(txCommission),   color: '#9333EA' },
                    { label: 'Tips',         value: fmtM(txTips),         color: '#2563EB' },
                  ].map(k => (
                    <div key={k.label}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>{k.label}</div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, color: k.color, marginTop: 2 }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {/* Service breakdown */}
                {(() => {
                  const breakdown = txRows.reduce((acc, r) => {
                    if (!acc[r.service]) acc[r.service] = { count:0, amount:0, commission:0 };
                    acc[r.service].count++;
                    acc[r.service].amount     += r.amount;
                    acc[r.service].commission += r.commission;
                    return acc;
                  }, {});
                  const serviceRows = Object.entries(breakdown)
                    .map(([service, s]) => ({ service, count: s.count, amount: s.amount, commission: s.commission, commPct: Math.round(s.commission / s.amount * 100) }))
                    .sort((a, b) => b.commission - a.commission);
                  return (
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid ' + C.surface, background: C.bg, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginRight: 4 }}>Services</span>
                      {serviceRows.map(r => (
                        <div key={r.service} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: C.white, border: '1px solid ' + C.border }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.service}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{r.count}×</span>
                          <span style={{ width: 1, height: 12, background: C.border, display: 'inline-block' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#9333EA' }}>{r.commPct}%</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#9333EA' }}>{fmtM(r.commission)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Tx table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 0.5fr 0.85fr 1.1fr 2fr 0.55fr 0.9fr 0.9fr 0.6fr', padding: '8px 18px', borderBottom: '1px solid ' + C.surface }}>
                  {['Date','Time','Booking','Customer','Service','Method','Amount','Comm','Tip'].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
                  ))}
                </div>

                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {txRows.length === 0 && (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>No transactions found</div>
                  )}
                  {txRows.map((r, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '0.6fr 0.5fr 0.85fr 1.1fr 2fr 0.55fr 0.9fr 0.9fr 0.6fr', padding: '11px 18px', borderBottom: i < txRows.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ fontSize: 11, color: C.muted }}>{r.date}</div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.muted }}>{r.time}</div>
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>{r.booking}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{r.customer}</div>
                      <div style={{ fontSize: 12, color: C.muted, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.service}</div>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: r.method === 'qris' ? '#111110' : '#EFF6FF', color: r.method === 'qris' ? '#F5E200' : '#2563EB', border: r.method === 'card' ? '1px solid #BFDBFE' : 'none' }}>
                          {r.method === 'qris' ? 'QRIS' : 'CARD'}
                        </span>
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: C.text }}>{fmtM(r.amount)}</div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#9333EA' }}>{fmtM(r.commission)}</div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: r.tip > 0 ? '#2563EB' : C.muted }}>{r.tip > 0 ? fmtM(r.tip) : '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

    </div>
  );
}
