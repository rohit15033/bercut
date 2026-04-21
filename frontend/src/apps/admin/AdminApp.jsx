import { useState, useEffect } from 'react'
import { tokens as T } from '../../shared/tokens.js'
import { api } from '../../shared/api.js'
import { getToken, setToken } from '../../shared/tokens.js'

// Lazy-load screens
import Overview     from './screens/Overview.jsx'
import LiveMonitor  from './screens/LiveMonitor.jsx'
import Reports      from './screens/Reports.jsx'
import Barbers      from './screens/Barbers.jsx'
import Branches     from './screens/Branches.jsx'
import Services     from './screens/Services.jsx'
import Customers    from './screens/Customers.jsx'
import Expenses     from './screens/Expenses.jsx'
import Inventory    from './screens/Inventory.jsx'
import Attendance   from './screens/Attendance.jsx'
import Payroll      from './screens/Payroll.jsx'
import Settings     from './screens/Settings.jsx'
import KioskConfig  from './screens/KioskConfig.jsx'

const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'DM Sans', sans-serif; background: ${T.bg}; color: ${T.text}; }
    button { cursor: pointer; font-family: 'DM Sans', sans-serif; }
    input, select, textarea { font-family: 'DM Sans', sans-serif; outline: none; }
    @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
    .fu  { animation: fadeUp 0.25s ease both; }
    .fi  { animation: fadeIn 0.2s ease both; }
    .admin-card { background: ${T.white}; border: 1px solid ${T.border}; border-radius: 12px; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
    .scroll-y { overflow-y: auto; }
    .adm-input { width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid ${T.border}; background:${T.surface}; color:${T.text}; font-size:14px; }
    .adm-input:focus { border-color:${T.text}; }
    .adm-btn { padding:10px 18px; border-radius:8px; border:none; font-weight:600; font-size:14px; cursor:pointer; transition:opacity 0.15s; }
    .adm-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .adm-btn-primary { background:${T.topBg}; color:${T.white}; }
    .adm-btn-danger  { background:${T.danger}; color:${T.white}; }
    .adm-btn-ghost   { background:transparent; border:1.5px solid ${T.border}; color:${T.text}; }
    .adm-badge { display:inline-flex; align-items:center; padding:2px 7px; border-radius:999px; font-size:11px; font-weight:700; }
    table { border-collapse: collapse; width:100%; }
    th { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:${T.muted}; padding:8px 12px; text-align:left; border-bottom:1px solid ${T.border}; }
    td { padding:10px 12px; border-bottom:1px solid ${T.border}; font-size:14px; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:${T.surface}; }
  `}</style>
)

const ICONS = {
  overview:    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>,
  live:        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="2" width="14" height="10" rx="2"/><line x1="5" y1="14" x2="11" y2="14"/><line x1="8" y1="12" x2="8" y2="14"/><circle cx="8" cy="7" r="1" fill="currentColor" stroke="none"/></svg>,
  reports:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,12 5,7 9,9 15,3"/><polyline points="11,3 15,3 15,7"/></svg>,
  barbers:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2.5-5 5-5"/><circle cx="12" cy="10" r="2.5"/></svg>,
  branches:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 14V8l6-6 6 6v6"/><rect x="6" y="10" width="4" height="4"/></svg>,
  services:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 8 C3 5 5 2 8 2 C11 2 13 5 13 8"/><path d="M5 11 L8 8 L11 11"/><line x1="8" y1="8" x2="8" y2="14"/></svg>,
  customers:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="5" cy="5" r="2.5"/><path d="M1 13c0-2.5 1.8-4 4-4s4 1.5 4 4"/><circle cx="12" cy="6" r="2"/></svg>,
  expenses:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="14" height="9" rx="2"/><path d="M1 7h14"/></svg>,
  inventory:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="8" width="14" height="7" rx="1.5"/><rect x="3" y="4" width="10" height="5" rx="1"/><rect x="5" y="1" width="6" height="4" rx="1"/></svg>,
  attendance:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="3" width="12" height="11" rx="1.5"/><line x1="5" y1="1" x2="5" y2="5"/><line x1="11" y1="1" x2="11" y2="5"/><line x1="2" y1="7" x2="14" y2="7"/></svg>,
  payroll:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="12" height="12" rx="2"/><line x1="5" y1="6" x2="11" y2="6"/><line x1="5" y1="9" x2="9" y2="9"/></svg>,
  kiosk:       <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="1" width="10" height="14" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><rect x="5" y="3" width="6" height="7" rx="1"/></svg>,
  settings:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="2.5"/><path d="M8,1 v1.5 M8,13.5 v1.5 M1,8 h1.5 M13.5,8 h1.5"/></svg>,
}

const NAV = [
  { key: 'overview',    label: 'Overview',           icon: ICONS.overview   },
  { key: 'live',        label: 'Live Queue',         icon: ICONS.live       },
  { key: 'reports',     label: 'Reports',            icon: ICONS.reports    },
  { key: 'barbers',     label: 'Barbers',            icon: ICONS.barbers    },
  { key: 'branches',    label: 'Branches',           icon: ICONS.branches   },
  { key: 'services',    label: 'Services',           icon: ICONS.services   },
  { key: 'customers',   label: 'Customers',          icon: ICONS.customers  },
  { key: 'expenses',    label: 'Expenses',           icon: ICONS.expenses   },
  { key: 'inventory',   label: 'Inventory',          icon: ICONS.inventory  },
  { key: 'attendance',  label: 'Attendance',         icon: ICONS.attendance },
  { key: 'payroll',     label: 'Payroll',            icon: ICONS.payroll    },
  { key: 'kiosk',       label: 'Kiosk Config',       icon: ICONS.kiosk      },
  { key: 'settings',    label: 'Settings',           icon: ICONS.settings   },
]

function Sidebar({ screen, onNav, user, onLogout }) {
  return (
    <div style={{ width: 220, flexShrink: 0, background: T.topBg, display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid #1e1e1c' }}>
        <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin Dashboard</div>
      </div>

      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = screen === item.key
          return (
            <button key={item.key} onClick={() => onNav(item.key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
                background: 'none', border: 'none',
                borderLeft: active ? `3px solid ${T.topText}` : '3px solid transparent',
                backgroundColor: active ? '#1a1a18' : 'transparent',
                color: active ? T.white : '#6b6b68',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.backgroundColor = '#141412' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#6b6b68'; e.currentTarget.style.backgroundColor = 'transparent' } }}
            >
              <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '14px 20px', borderTop: '1px solid #1e1e1c' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: T.topText, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 12, color: T.accentText }}>
              {(user?.name || 'U').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 12, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'capitalize' }}>{user?.role || ''}</div>
          </div>
        </div>
        <button onClick={onLogout}
          style={{ width: '100%', padding: '7px', borderRadius: 6, background: '#1a1a18', border: 'none', color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}

// ── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError('')
    try {
      const data = await api.post('/auth/login', { email, password })
      setToken(data.token)
      onLogin(data.user)
    } catch (err) {
      setError(err.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <GS />
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height: 28, width: 'auto', objectFit: 'contain', marginBottom: 8 }} />
          <div style={{ fontSize: 14, color: '#666' }}>Admin Dashboard — Sign in to continue</div>
        </div>

        <form onSubmit={submit} style={{ background: '#1a1a18', borderRadius: 16, padding: 32 }}>
          {error && (
            <div style={{ background: '#2d1010', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>{error}</div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
              placeholder="admin@bercut.id"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #2a2a28', background: '#111', color: T.white, fontSize: 14 }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #2a2a28', background: '#111', color: T.white, fontSize: 14 }} />
          </div>
          <button type="submit" disabled={loading || !email || !password}
            style={{ width: '100%', padding: '13px', borderRadius: 10, background: T.topText, color: T.accentText, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: (loading || !email || !password) ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AdminApp() {
  const [user,   setUser]   = useState(null)
  const [screen, setScreen] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then(u => setUser(u))
      .catch(() => { setToken(null) })
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { setToken(null); setUser(null) }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GS />
        <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
      </div>
    )
  }

  if (!user) return <LoginScreen onLogin={u => setUser(u)} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg }}>
      <GS />
      <Sidebar screen={screen} onNav={setScreen} user={user} onLogout={handleLogout} />
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh', minWidth: 0 }}>
        {screen === 'overview'   && <Overview   user={user} onNav={setScreen} />}
        {screen === 'live'       && <LiveMonitor user={user} />}
        {screen === 'reports'    && <Reports />}
        {screen === 'barbers'    && <Barbers />}
        {screen === 'branches'   && <Branches />}
        {screen === 'services'   && <Services />}
        {screen === 'customers'  && <Customers />}
        {screen === 'expenses'   && <Expenses />}
        {screen === 'inventory'  && <Inventory />}
        {screen === 'attendance' && <Attendance onPayroll={() => setScreen('payroll')} />}
        {screen === 'payroll'    && <Payroll onAttendance={() => setScreen('attendance')} user={user} />}
        {screen === 'kiosk'      && <KioskConfig />}
        {screen === 'settings'   && <Settings user={user} />}
      </main>
    </div>
  )
}
