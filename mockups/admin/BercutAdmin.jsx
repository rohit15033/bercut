/**
 * MOCKUP — Bercut Admin Dashboard: Root App
 *
 * What it does: Full admin dashboard with dark sidebar navigation, routing between
 *   all admin screens — Overview, BranchDetail, Reports, Expenses, Inventory,
 *   Payroll, Settings.
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
import { C, FONT, BERCUT_LOGO } from './data.js';
import Overview   from './Overview.jsx';
import BranchDetail from './BranchDetail.jsx';
import Reports    from './Reports.jsx';
import Expenses   from './Expenses.jsx';
import Inventory  from './Inventory.jsx';
import Payroll    from './Payroll.jsx';
import Settings   from './Settings.jsx';

// ── Icons ─────────────────────────────────────────────────────────────────────

const Icon = {
  overview:  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>,
  reports:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,12 5,7 9,9 15,3"/><polyline points="11,3 15,3 15,7"/></svg>,
  expenses:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="14" height="9" rx="2"/><path d="M1 7h14"/><circle cx="5.5" cy="10.5" r="1" fill="currentColor" stroke="none"/></svg>,
  inventory: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="8" width="14" height="7" rx="1.5"/><rect x="3" y="4" width="10" height="5" rx="1"/><rect x="5" y="1" width="6" height="4" rx="1"/></svg>,
  payroll:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="12" height="12" rx="2"/><line x1="5" y1="6" x2="11" y2="6"/><line x1="5" y1="9" x2="9"  y2="9"/></svg>,
  settings:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="2.5"/><path d="M8,1 v1.5 M8,13.5 v1.5 M1,8 h1.5 M13.5,8 h1.5 M3.05,3.05 l1.06,1.06 M11.89,11.89 l1.06,1.06 M3.05,12.95 l1.06,-1.06 M11.89,4.11 l1.06,-1.06"/></svg>,
};

const NAV = [
  { key: 'overview',  label: 'Overview',  icon: Icon.overview  },
  { key: 'reports',   label: 'Reports',   icon: Icon.reports   },
  { key: 'expenses',  label: 'Expenses',  icon: Icon.expenses  },
  { key: 'inventory', label: 'Inventory', icon: Icon.inventory },
  { key: 'payroll',   label: 'Payroll',   icon: Icon.payroll   },
  { key: 'settings',  label: 'Settings',  icon: Icon.settings  },
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
            <span style={{ fontSize: 11, color: '#666' }}>6 branches live</span>
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
              {item.label}
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
      <GS />
      <Sidebar active={screen} onNav={setScreen} />
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        {screen === 'overview'      && <Overview     onSelectBranch={handleSelectBranch} />}
        {screen === 'branch-detail' && <BranchDetail branch={selectedBranch} onBack={handleBackToOverview} />}
        {screen === 'reports'       && <Reports />}
        {screen === 'expenses'      && <Expenses />}
        {screen === 'inventory'     && <Inventory />}
        {screen === 'payroll'       && <Payroll />}
        {screen === 'settings'      && <Settings />}
      </main>
    </div>
  );
}
