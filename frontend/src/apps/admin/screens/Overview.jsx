import { useEffect, useState } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const fmt  = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const fmtM = n => n >= 1e6 ? 'Rp ' + (n / 1e6).toFixed(1) + 'jt' : fmt(n)

const STATUS_DOT = {
  available:   '#2563EB',
  in_service:  '#16A34A',
  on_break:    '#D97706',
  clocked_out: '#9CA3AF',
  off:         '#D1D5DB',
}

function KpiCard({ label, value, sub, accent, i, onClick }) {
  return (
    <div className="admin-card fu"
      onClick={onClick}
      style={{ padding: '20px 24px', flex: 1, animation: `fadeUp 0.25s ease ${i * 0.06}s both`, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 28, color: accent || T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function BranchCard({ branch, barbers, i, onLive }) {
  const branchBarbers = barbers.filter(b => b.branch_id === branch.id)
  const inProgress = branch.in_progress || 0
  const waiting    = branch.confirmed   || 0
  const completed  = branch.completed   || 0
  const noShow     = branch.no_show     || 0
  const alerts     = branch.alerts      || []

  return (
    <div className="admin-card fu"
      style={{ padding: '20px 22px', cursor: 'pointer', transition: 'all 0.18s', animation: `fadeUp 0.28s ease ${0.1 + i * 0.07}s both` }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.text; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none' }}
      onClick={onLive}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, color: T.text }}>{branch.name}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{branch.city || 'Bali'}</div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {alerts.includes('late_start') && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>⚠ Late Start</span>
          )}
          {alerts.includes('low_stock') && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>📦 Low Stock</span>
          )}
          {alerts.includes('absence') && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>🔴 Absence</span>
          )}
        </div>
      </div>

      {/* Revenue */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>Today's Revenue</div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, color: '#16A34A' }}>{fmtM(branch.revenue || 0)}</div>
      </div>

      {/* Queue stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'In Chair', value: inProgress, color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Waiting',  value: waiting,    color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Done',     value: completed,  color: '#6B7280', bg: '#F9FAFB' },
          { label: 'No-show',  value: noShow,     color: noShow > 0 ? '#DC2626' : '#6B7280', bg: noShow > 0 ? '#FEF2F2' : '#F9FAFB' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: s.bg }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Barber availability */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>
          Barbers — {branchBarbers.filter(b => !['clocked_out', 'off'].includes(b.status)).length} / {branchBarbers.length} in
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {branchBarbers.length > 0 ? branchBarbers.map(b => (
            <div key={b.id} title={`${b.name} — ${b.status}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 10, color: T.text2 }}>{b.name.slice(0, 2).toUpperCase()}</span>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT[b.status] || '#9CA3AF', border: '1.5px solid white' }} />
              </div>
            </div>
          )) : (
            <span style={{ fontSize: 12, color: T.muted }}>No barbers configured</span>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={e => { e.stopPropagation(); onLive() }}
        style={{ width: '100%', padding: '9px 16px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = '#2a2a28'}
        onMouseLeave={e => e.currentTarget.style.background = T.topBg}
      >
        View Details →
      </button>
    </div>
  )
}

export default function Overview({ onNav }) {
  const [branches, setBranches] = useState([])
  const [barbers,  setBarbers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [time,     setTime]     = useState(new Date())

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    Promise.all([
      api.get('/branches'),
      api.get('/barbers/all'),
      api.get(`/bookings?date=${today}`),
    ]).then(([brs, bars, bks]) => {
      const branchList = Array.isArray(brs) ? brs : []
      const barberList = Array.isArray(bars) ? bars : []
      const bookings   = Array.isArray(bks) ? bks : []

      const byBranch = {}
      for (const bk of bookings) {
        if (!byBranch[bk.branch_id]) byBranch[bk.branch_id] = { confirmed: 0, in_progress: 0, completed: 0, no_show: 0, cancelled: 0, revenue: 0 }
        byBranch[bk.branch_id][bk.status] = (byBranch[bk.branch_id][bk.status] || 0) + 1
        if (bk.status === 'completed') byBranch[bk.branch_id].revenue += Number(bk.total_amount || 0)
      }

      // Compute alerts per branch
      const now = Date.now()
      const alertsByBranch = {}
      for (const bk of bookings) {
        if (!alertsByBranch[bk.branch_id]) alertsByBranch[bk.branch_id] = new Set()
        // late_start: confirmed booking scheduled > 20min ago
        if (bk.status === 'confirmed' && bk.scheduled_at) {
          const age = (now - new Date(bk.scheduled_at).getTime()) / 60000
          if (age > 20) alertsByBranch[bk.branch_id].add('late_start')
        }
      }

      const enriched = branchList.map(b => ({
        ...b,
        ...(byBranch[b.id] || {}),
        alerts: alertsByBranch[b.id] ? [...alertsByBranch[b.id]] : [],
      }))
      setBranches(enriched)
      setBarbers(barberList)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [today])

  const activeBranches = branches.filter(b => b.is_active !== false)
  const totalRevenue   = activeBranches.reduce((a, b) => a + (b.revenue || 0), 0)
  const totalActive    = activeBranches.reduce((a, b) => a + (b.in_progress || 0), 0)
  const totalWaiting   = activeBranches.reduce((a, b) => a + (b.confirmed || 0), 0)
  const totalDone      = activeBranches.reduce((a, b) => a + (b.completed || 0), 0)
  const totalAlerts    = activeBranches.reduce((a, b) => a + (b.alerts?.length || 0), 0)

  const timeStr = time.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
  const dateStr = time.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return <div style={{ padding: 40, color: T.muted }}>Loading…</div>

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 26, color: T.text, lineHeight: 1 }}>Overview</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 5 }}>{dateStr} · {timeStr} WITA</div>
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
        <KpiCard i={0} label="Today's Revenue"  value={fmtM(totalRevenue)} sub={`All ${activeBranches.length} branches combined`} accent="#16A34A" />
        <KpiCard i={1} label="In Chair Now"     value={totalActive}        sub="Click to view live monitor" accent={T.text} onClick={() => onNav('live')} />
        <KpiCard i={2} label="Waiting"          value={totalWaiting}       sub="Confirmed, not started"     accent="#2563EB" />
        <KpiCard i={3} label="Completed Today"  value={totalDone}          sub="Paid and out the door"      accent="#6B7280" />
      </div>

      {/* Branch grid */}
      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: T.text2, marginBottom: 14, letterSpacing: '0.01em' }}>
        All Branches
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 270px)', paddingBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {activeBranches.map((branch, i) => (
            <BranchCard key={branch.id} branch={branch} barbers={barbers} i={i} onLive={() => onNav('live')} />
          ))}
        </div>
      </div>
    </div>
  )
}
