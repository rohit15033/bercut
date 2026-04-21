import { useEffect, useState, useCallback } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const fmt   = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const STARS = n => '★'.repeat(n) + '☆'.repeat(5 - n)

const EXPIRY_MONTHS       = 12
const EXPIRY_WARNING_DAYS = 30

function getExpiryStatus(lastActivity, points) {
  if (!lastActivity || !points) return null
  const expiry = new Date(lastActivity)
  expiry.setMonth(expiry.getMonth() + EXPIRY_MONTHS)
  const daysUntil = Math.round((expiry - new Date()) / (1000 * 60 * 60 * 24))
  const fullLabel = expiry.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  if (daysUntil < 0) return { type: 'expired', fullLabel, daysUntil }
  if (daysUntil <= EXPIRY_WARNING_DAYS) return { type: 'warning', daysUntil, label: `Exp in ${daysUntil}d`, fullLabel }
  return { type: 'safe', fullLabel }
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────

function HistoryPanel({ customer, history, onClose }) {
  const exp = getExpiryStatus(customer.points_last_activity, customer.points)

  return (
    <div style={{ width: 380, flexShrink: 0, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', background: T.white, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 22px', borderBottom: `1px solid ${T.surface}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>{customer.name}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{customer.phone}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Visits',      value: customer.visit_count || 0 },
            { label: 'Total Spend', value: fmt(customer.total_spend || 0) },
            { label: 'Points',      value: (customer.points || 0) + ' pts' },
          ].map(s => (
            <div key={s.label} style={{ background: T.bg, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted }}>{s.label}</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: T.text, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: T.text2 }}>
          <span style={{ color: T.muted }}>Preferred barber: </span>
          <span style={{ fontWeight: 600 }}>{customer.preferred_barber || '—'}</span>
          <span style={{ color: T.muted, marginLeft: 14 }}>Branch: </span>
          <span style={{ fontWeight: 600 }}>{customer.branch_name || '—'}</span>
        </div>

        {exp && exp.type === 'warning' && (
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', fontWeight: 600 }}>
            ⚠ Points expire {exp.fullLabel} — {exp.daysUntil} day{exp.daysUntil !== 1 ? 's' : ''} left
          </div>
        )}
        {exp && exp.type === 'expired' && (
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: '#B91C1C', fontWeight: 600 }}>
            Points expired {exp.fullLabel} — balance zeroed by cron job
          </div>
        )}
        {exp && exp.type === 'safe' && (
          <div style={{ marginTop: 10, fontSize: 12, color: T.muted }}>
            Points expire: <span style={{ fontWeight: 600, color: T.text2 }}>{exp.fullLabel}</span>
          </div>
        )}
      </div>

      {/* Visit history */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginBottom: 12 }}>Visit History</div>
        {history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: T.muted, fontSize: 13 }}>No visit history found.</div>
        )}
        {history.map((h, i) => (
          <div key={i} style={{ padding: '14px 0', borderBottom: i < history.length - 1 ? `1px solid ${T.surface}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>
                  {h.service_names || h.services || '—'}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {h.date || (h.completed_at ? h.completed_at.slice(0, 10) : '—')} · {h.barber_name || h.barber || '—'}
                </div>
                {h.rating > 0 && (
                  <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 3, letterSpacing: '-0.02em' }}>{STARS(h.rating)}</div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{fmt(h.total || h.total_amount || 0)}</div>
                {h.tip > 0 && <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>+{fmt(h.tip)} tip</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Customers() {
  const [branches,         setBranches]         = useState([])
  const [customers,        setCustomers]         = useState([])
  const [search,           setSearch]            = useState('')
  const [branchFilter,     setBranchFilter]      = useState('all')
  const [selectedCustomer, setSelectedCustomer]  = useState(null)
  const [history,          setHistory]           = useState([])
  const [sortBy,           setSortBy]            = useState('visits')
  const [loading,          setLoading]           = useState(true)

  const loadCustomers = useCallback(async () => {
    try {
      const [brs, custs] = await Promise.all([
        api.get('/branches'),
        api.get('/customers'),
      ])
      setBranches(Array.isArray(brs) ? brs : [])
      setCustomers(Array.isArray(custs) ? custs : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  async function selectCustomer(c) {
    if (selectedCustomer?.id === c.id) { setSelectedCustomer(null); setHistory([]); return }
    setSelectedCustomer(c)
    setHistory([])
    try {
      const hist = await api.get(`/customers/${c.id}/history`)
      setHistory(Array.isArray(hist) ? hist : [])
    } catch (_) {}
  }

  const SORT_KEYS = { visits: 'visit_count', spend: 'total_spend', points: 'points' }

  const filtered = customers
    .filter(c => branchFilter === 'all' || c.branch_id === branchFilter || c.branch_name === branchFilter)
    .filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
    .sort((a, b) => {
      const key = SORT_KEYS[sortBy] || sortBy
      return (b[key] || 0) - (a[key] || 0)
    })

  const totalCustomers = customers.length
  const totalVisits    = customers.reduce((s, c) => s + (c.visit_count || 0), 0)
  const totalPoints    = customers.reduce((s, c) => s + (c.points || 0), 0)
  const avgSpend       = customers.length ? Math.round(customers.reduce((s, c) => s + (c.total_spend || 0), 0) / customers.length) : 0

  if (loading) return <div style={{ padding: 40, color: T.muted }}>Loading…</div>

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)', boxSizing: 'border-box' }}>

      {/* Page header */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Customers</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Customers who provided contact info at the kiosk</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24, flexShrink: 0 }}>
        {[
          { label: 'Total Customers',   value: totalCustomers               },
          { label: 'Total Visits',      value: totalVisits                  },
          { label: 'Avg Spend / Visit', value: fmt(avgSpend)                },
          { label: 'Points Issued',     value: totalPoints.toLocaleString() },
        ].map(s => (
          <div key={s.label} className="admin-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted }}>{s.label}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 26, color: T.text, marginTop: 6 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 0 }}>

        {/* Left — table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Filters + search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone…"
              style={{ padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, width: 220, background: T.white }} />
            {[{ key: 'all', label: 'All Branches' }, ...branches.map(b => ({ key: b.city || b.name, label: b.city || b.name }))].map(f => (
              <button key={f.key} onClick={() => setBranchFilter(f.key)}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${branchFilter === f.key ? T.topBg : T.border}`, background: branchFilter === f.key ? T.topBg : 'transparent', color: branchFilter === f.key ? T.white : T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                {f.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Sort by:</span>
              {[{ key: 'visits', label: 'Visits' }, { key: 'spend', label: 'Spend' }, { key: 'points', label: 'Points' }].map(s => (
                <button key={s.key} onClick={() => setSortBy(s.key)}
                  style={{ padding: '5px 11px', borderRadius: 6, border: `1px solid ${sortBy === s.key ? T.topBg : T.border}`, background: sortBy === s.key ? T.topBg : 'transparent', color: sortBy === s.key ? T.white : T.text2, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-card" style={{ overflow: 'auto', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr 1fr 0.6fr 1.5fr 0.8fr', padding: '10px 18px', borderBottom: `1px solid ${T.surface}`, position: 'sticky', top: 0, background: T.white, zIndex: 1 }}>
              {['Customer', 'Phone', 'Visits', 'Total Spend', 'Points', 'Pref. Barber', 'Last Visit'].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 14 }}>No customers match this filter</div>
            )}

            {filtered.map((c, i) => {
              const isSelected = selectedCustomer?.id === c.id
              const exp = getExpiryStatus(c.points_last_activity, c.points)
              const lastVisit = c.last_visit ? new Date(c.last_visit).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
              return (
                <div key={c.id} onClick={() => selectCustomer(c)}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr 1fr 0.6fr 1.5fr 0.8fr', padding: '13px 18px', borderBottom: i < filtered.length - 1 ? `1px solid ${T.surface}` : 'none', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s', background: isSelected ? T.bg : 'transparent', animation: `fadeUp 0.2s ease ${i * 0.02}s both` }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bg }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>

                  <div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{c.branch_name || '—'}</div>
                  </div>

                  <div style={{ fontSize: 12, color: T.text2, fontFamily: 'monospace' }}>{c.phone}</div>

                  <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: T.text }}>{c.visit_count || 0}</div>

                  <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{fmt(c.total_spend || 0)}</div>

                  <div>
                    <div>
                      <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: (c.points || 0) > 200 ? '#D97706' : T.text }}>
                        {c.points || 0}
                      </span>
                      <span style={{ fontSize: 11, color: T.muted }}> pts</span>
                    </div>
                    {exp && exp.type === 'warning' && <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', marginTop: 2 }}>⚠ {exp.label}</div>}
                    {exp && exp.type === 'expired' && <div style={{ fontSize: 10, fontWeight: 700, color: '#B91C1C', marginTop: 2 }}>Expired</div>}
                  </div>

                  <div style={{ fontSize: 12, color: T.text2, fontWeight: 500 }}>{c.preferred_barber || '—'}</div>

                  <div style={{ fontSize: 12, color: T.muted }}>{lastVisit}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right — visit history panel */}
        {selectedCustomer && (
          <HistoryPanel customer={selectedCustomer} history={history} onClose={() => { setSelectedCustomer(null); setHistory([]) }} />
        )}
      </div>
    </div>
  )
}
