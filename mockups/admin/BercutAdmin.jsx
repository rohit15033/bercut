/**
 * MOCKUP — Bercut Admin Dashboard: Root App
 *
 * What it does: Full admin dashboard with dark sidebar navigation, routing between
 *   all admin screens — Overview, BranchDetail, Reports, Expenses, Inventory,
 *   Attendance, Payroll, Settings.
 * State managed: activeScreen, selectedBranch
 * Production API: see individual screen files
 * Feeds into: all admin screens
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/AdminApp.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { C, FONT, BERCUT_LOGO, BRANCHES, INVENTORY, INV_BRANCH_COLS } from './data.js';
import Overview      from './Overview.jsx';
import BranchDetail  from './BranchDetail.jsx';
import Reports       from './Reports.jsx';
import Expenses      from './Expenses.jsx';
import Inventory     from './Inventory.jsx';
import Settings      from './Settings.jsx';
import Barbers           from './Barbers.jsx';
import Services           from './Services.jsx';
import Customers          from './Customers.jsx';
import OnlineBooking      from './OnlineBooking.jsx';
import KioskConfig        from './KioskConfig.jsx';
import LiveMonitor        from './LiveMonitor.jsx';
import Attendance from './Attendance.jsx';
import Payroll    from './Payroll.jsx';
import Branches   from './Branches.jsx';
// ── Icons ─────────────────────────────────────────────────────────────────────

const Icon = {
  overview:  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>,
  reports:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,12 5,7 9,9 15,3"/><polyline points="11,3 15,3 15,7"/></svg>,
  expenses:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="14" height="9" rx="2"/><path d="M1 7h14"/><circle cx="5.5" cy="10.5" r="1" fill="currentColor" stroke="none"/></svg>,
  inventory: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="8" width="14" height="7" rx="1.5"/><rect x="3" y="4" width="10" height="5" rx="1"/><rect x="5" y="1" width="6" height="4" rx="1"/></svg>,
  payroll:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="12" height="12" rx="2"/><line x1="5" y1="6" x2="11" y2="6"/><line x1="5" y1="9" x2="9"  y2="9"/></svg>,
  settings:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="2.5"/><path d="M8,1 v1.5 M8,13.5 v1.5 M1,8 h1.5 M13.5,8 h1.5 M3.05,3.05 l1.06,1.06 M11.89,11.89 l1.06,1.06 M3.05,12.95 l1.06,-1.06 M11.89,4.11 l1.06,-1.06"/></svg>,
};

Icon.barbers      = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2.5-5 5-5"/><circle cx="12" cy="10" r="2.5"/><path d="M12 7.5v1m0 3v1m2.5-2.5h-1m-3 0h-1m1.77-1.77-.71.71m-2.12 2.12-.71.71m2.83 0-.71-.71m-2.12-2.12-.71-.71"/></svg>;
Icon.liveMonitor  = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="2" width="14" height="10" rx="2"/><line x1="5" y1="14" x2="11" y2="14"/><line x1="8" y1="12" x2="8" y2="14"/><circle cx="8" cy="7" r="2" fill="currentColor" stroke="none" opacity="0.3"/><circle cx="8" cy="7" r="1"/></svg>;
Icon.attendance   = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="3" width="12" height="11" rx="1.5"/><line x1="5" y1="1" x2="5" y2="5"/><line x1="11" y1="1" x2="11" y2="5"/><line x1="2" y1="7" x2="14" y2="7"/><path d="M5.5 10.5l1.5 1.5 3-3" strokeWidth="1.6"/></svg>;
Icon.services  = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 8 C3 5 5 2 8 2 C11 2 13 5 13 8"/><path d="M5 11 L8 8 L11 11"/><line x1="8" y1="8" x2="8" y2="14"/></svg>;
Icon.customers = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="5" cy="5" r="2.5"/><path d="M1 13c0-2.5 1.8-4 4-4s4 1.5 4 4"/><circle cx="12" cy="6" r="2"/><path d="M10 13c0-2 1.2-3.5 3-3.5"/></svg>;
Icon.online    = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 1.5C6 4 5 6 5 8s1 4 3 6.5M8 1.5C10 4 11 6 11 8s-1 4-3 6.5"/><line x1="1.5" y1="8" x2="14.5" y2="8"/><path d="M2.2 5h11.6M2.2 11h11.6"/></svg>;
Icon.kiosk     = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="1" width="10" height="14" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><rect x="5" y="3" width="6" height="7" rx="1"/></svg>;
Icon.branches  = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 14V8l6-6 6 6v6"/><rect x="6" y="10" width="4" height="4"/><path d="M2 8h12"/></svg>;

// Compute badge counts from live data
const _lowStockCount = INVENTORY
  ? INVENTORY.filter(item => INV_BRANCH_COLS && INV_BRANCH_COLS.some(col => item[col.key] <= item.threshold)).length
  : 0;
const _alertCount = BRANCHES ? BRANCHES.reduce((a, b) => a + b.alerts.length, 0) : 0;
const _onlineCount = BRANCHES ? BRANCHES.filter(b => b.onlineBookingEnabled).length : 0;

const NAV = [
  { key: 'overview',          label: 'Overview',          icon: Icon.overview,     badge: _alertCount    },
  { key: 'live-monitor',      label: 'Live Queue Management', icon: Icon.liveMonitor                     },
  { key: 'reports',           label: 'Reports',           icon: Icon.reports                             },
  { key: 'barbers',           label: 'Barbers',           icon: Icon.barbers                             },
  { key: 'branches',          label: 'Branches',          icon: Icon.branches                            },
  { key: 'services',          label: 'Services',          icon: Icon.services                            },
  { key: 'customers',         label: 'Customers',         icon: Icon.customers                           },
  { key: 'expenses',          label: 'Expenses',          icon: Icon.expenses                            },
  { key: 'inventory',         label: 'Inventory',         icon: Icon.inventory,    badge: _lowStockCount },
  { key: 'attendance',         label: 'Attendance',           icon: Icon.attendance                       },
  { key: 'payroll',            label: 'Payroll',             icon: Icon.payroll                          },
  { key: 'online-booking',    label: 'Online Booking',    icon: Icon.online,       badge: _onlineCount   },
  { key: 'kiosk-config',      label: 'Kiosk Config',      icon: Icon.kiosk                               },
  { key: 'settings',          label: 'Settings',          icon: Icon.settings                            },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ active, onNav }) {
  return (
    <div style={{ width: 220, flexShrink: 0, background: C.topBg, display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>

      {/* Logo block */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1e1e1c' }}>
        <img src={BERCUT_LOGO} alt="Bercut" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#555', marginTop: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Admin Dashboard
        </div>
      </div>

      {/* Branch badge */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e1e1c' }}>
        <div style={{ background: '#1a1a18', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Viewing</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.white }}>All Branches</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
            <span style={{ fontSize: 11, color: '#666' }}>{BRANCHES.length} branches live</span>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {NAV.map(item => {
          const isActive = active === item.key || (active === 'branch-detail' && item.key === 'overview');
          return (
            <button key={item.key} onClick={() => onNav(item.key)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', background: 'none', border: 'none',
                borderLeft: isActive ? `3px solid ${C.accent}` : '3px solid transparent',
                backgroundColor: isActive ? '#1a1a18' : 'transparent',
                color: isActive ? C.white : '#6b6b68',
                fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.backgroundColor = '#141412'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = '#6b6b68'; e.currentTarget.style.backgroundColor = 'transparent'; } }}
            >
              <span style={{ opacity: isActive ? 1 : 0.6, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, background: item.key === 'online-booking' ? '#16A34A' : '#DC2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User block */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1e1e1c' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 13, color: C.accentText }}>OW</span>
          </div>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.white }}>Owner</div>
            <div style={{ fontSize: 11, color: '#555' }}>owner@bercut.id</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Global styles ─────────────────────────────────────────────────────────────

const GS = () => (
  <style>{`
    ${FONT}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'DM Sans', sans-serif; background: ${C.bg}; color: ${C.text}; }
    button { cursor: pointer; font-family: 'DM Sans', sans-serif; }
    input, select, textarea { font-family: 'DM Sans', sans-serif; outline: none; }
    @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
    @keyframes scaleIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
    .admin-card { background: ${C.white}; border: 1px solid ${C.border}; border-radius: 12px; }
    .admin-card:hover { border-color: #c5c2bb; }
    .fu { animation: fadeUp 0.25s ease both; }
    .fi { animation: fadeIn 0.2s ease both; }
  `}</style>
);

// ── Root ──────────────────────────────────────────────────────────────────────

export default function BercutAdmin() {
  const [screen, setScreen]             = useState('overview');
  const [selectedBranch, setSelectedBranch] = useState(null);

  function handleSelectBranch(branch) {
    setSelectedBranch(branch);
    setScreen('branch-detail');
  }
  function handleBackToOverview() {
    setScreen('overview');
    setSelectedBranch(null);
  }
  function handleOpenLiveMonitor() {
    setScreen('live-monitor');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
      <GS />
      <Sidebar active={screen} onNav={setScreen} />
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        {screen === 'overview'           && <Overview     onSelectBranch={handleSelectBranch} onOpenLiveMonitor={handleOpenLiveMonitor} />}
        {screen === 'branch-detail'      && <BranchDetail branch={selectedBranch} onBack={handleBackToOverview} />}
        {screen === 'live-monitor'       && <LiveMonitor />}
        {screen === 'reports'            && <Reports />}
        {screen === 'barbers'            && <Barbers />}
        {screen === 'branches'           && <Branches />}
        {screen === 'services'           && <Services />}
        {screen === 'customers'          && <Customers />}
        {screen === 'expenses'           && <Expenses />}
        {screen === 'inventory'          && <Inventory />}
        {screen === 'attendance' && <Attendance onViewPayroll={() => setScreen('payroll')} />}
        {screen === 'payroll'    && <Payroll    onViewAttendance={() => setScreen('attendance')} />}
        {screen === 'online-booking'     && <OnlineBooking />}
        {screen === 'kiosk-config'       && <KioskConfig />}
        {screen === 'settings'           && <Settings />}
      </main>
    </div>
  );
}
