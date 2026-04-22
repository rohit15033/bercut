import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { api, BASE } from '../../shared/api.js'

const T = {
  bg: '#0A0A0A',
  surface: '#171717',
  border: '#262626',
  text: '#FFFFFF',
  muted: '#A3A3A3',
  accent: '#16A34A',
  accentBg: 'rgba(22, 163, 74, 0.1)',
  waiting: '#2563EB',
  waitingBg: 'rgba(37, 99, 235, 0.1)',
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function ChairCard({ barber, booking }) {
  if (!barber) return null
  const isInProg = booking?.status === 'in_progress'
  const duration = parseInt(booking?.est_duration_min) || 30
  
  let elapsed = 0
  let pct = 0
  if (isInProg && booking.started_at) {
    elapsed = Math.floor((Date.now() - new Date(booking.started_at).getTime()) / 60000)
    pct = Math.min(100, Math.round((elapsed / duration) * 100))
  }

  return (
    <div style={{ background: T.surface, border: `2px solid ${isInProg ? T.accent : T.border}`, borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', gap: 16, transition: 'all 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ 
            background: isInProg ? T.accent : T.border, 
            color: isInProg ? T.bg : T.text, 
            padding: '12px 24px', 
            borderRadius: 16, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 80
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CHAIR</div>
            <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1 }}>{barber.chair_label || '?'}</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: T.text }}>{barber.name}</div>
          </div>
        </div>
        {isInProg ? (
          <div style={{ background: T.accentBg, color: T.accent, padding: '8px 16px', borderRadius: 12, fontSize: 16, fontWeight: 800, border: `1px solid ${T.accent}` }}>IN SERVICE</div>
        ) : (
          <div style={{ background: T.border, color: T.muted, padding: '8px 16px', borderRadius: 12, fontSize: 16, fontWeight: 800 }}>AVAILABLE</div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 120 }}>
        {isInProg ? (
          <>
            <div style={{ fontSize: 20, color: T.muted, marginBottom: 4 }}>Serving</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: T.text, lineHeight: 1.1 }}>{booking.customer_name}</div>
            <div style={{ fontSize: 18, color: T.muted, marginTop: 12 }}>{booking.service_names}</div>
          </>
        ) : (
          <div style={{ fontSize: 24, color: T.muted, fontStyle: 'italic' }}>Ready for next customer</div>
        )}
      </div>

      {isInProg && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 16, fontWeight: 600 }}>
            <span style={{ color: T.muted }}>Progress</span>
            <span style={{ color: T.accent }}>{elapsed}m / {duration}m</span>
          </div>
          <div style={{ height: 12, background: T.border, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: T.accent, transition: 'width 1s linear' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function TvMonitor() {
  const { slug } = useParams()
  const [branch, setBranch] = useState(null)
  const [barbers, setBarbers] = useState([])
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async (branchId) => {
    try {
      const [bkRes, barRes] = await Promise.all([
        api.get(`/bookings/public?branch_id=${branchId}`),
        api.get(`/barbers?branch_id=${branchId}`),
      ])
      setQueue(bkRes || [])
      setBarbers(barRes || [])
    } catch (err) {
      console.error('Failed to load TV data:', err)
    }
  }, [])

  useEffect(() => {
    let es = null
    let fallback = null
    
    async function init() {
      try {
        const b = await api.get(`/branches/slug/${slug}`)
        setBranch(b)
        await loadData(b.id)
        setLoading(false)
        
        // Real-time updates via SSE
        const url = `${BASE}/events?branch_id=${b.id}`
        console.log('[TV] Connecting to SSE:', url)
        es = new EventSource(url)
        
        es.onopen = () => console.log('[TV] SSE Connected')
        es.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data)
            console.log('[TV] Event received:', msg.type)
            // Reload on any relevant activity
            loadData(b.id)
          } catch (err) {
            console.error('[TV] SSE Parse error:', err)
          }
        }
        es.onerror = (err) => {
          console.error('[TV] SSE Connection error:', err)
          es.close()
        }

        // Fallback polling (every 30s) in case SSE drops
        fallback = setInterval(() => {
          console.log('[TV] Fallback sync...')
          loadData(b.id)
        }, 30000)

      } catch (err) {
        console.error('[TV] Init error:', err)
        setError('Branch not found')
        setLoading(false)
      }
    }
    init()
    return () => { 
      if (es) es.close()
      if (fallback) clearInterval(fallback)
    }
  }, [slug, loadData])

  if (loading) return <div style={{ background: T.bg, height: '100dvh', color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>Loading Screen...</div>
  if (error) return <div style={{ background: T.bg, height: '100dvh', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{error}</div>

  const inProg = queue.filter(b => b.status === 'in_progress')
  const waiting = queue.filter(b => b.status === 'confirmed').slice(0, 8)

  return (
    <div style={{ background: T.bg, color: T.text, height: '100dvh', padding: 40, fontFamily: "'Inter', sans-serif", overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        body { margin: 0; overflow: hidden; }
      `}</style>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height: 80, width: 'auto' }} />
          <div style={{ width: 2, height: 60, background: T.border }} />
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', color: T.text }}>
              {branch.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 18, color: T.muted, marginTop: 2 }}>{branch.city} · Live Queue Monitor</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 42, fontWeight: 800 }}>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
          <div style={{ fontSize: 18, color: T.accent, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: T.accent, animation: 'pulse 2s infinite' }} />
            LIVE SYSTEM
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 40, flex: 1, minHeight: 0 }}>
        
        {/* Left Side: Now Serving */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Now Serving</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, flex: 1, alignContent: 'start' }}>
            {barbers.map(barber => {
              const booking = inProg.find(b => b.barber_id === barber.id)
              return <ChairCard key={barber.id} barber={barber} booking={booking} />
            })}
          </div>
        </div>

        {/* Right Side: Waiting List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Waiting List</div>
          <div style={{ background: T.surface, borderRadius: 24, padding: '16px 0', flex: 1, display: 'flex', flexDirection: 'column', border: `2px solid ${T.border}` }}>
            {waiting.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 20 }}>No one waiting. Walk-ins welcome!</div>
            ) : (
              waiting.map((bk, idx) => (
                <div key={bk.id} style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '24px 32px', borderBottom: idx === waiting.length - 1 ? 'none' : `1px solid ${T.border}`, transition: 'background 0.2s' }}>
                  
                  {/* Left: Chair & Barber Assignment */}
                  <div style={{ width: 180, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: T.muted }}>CHAIR</span>
                      <span style={{ fontSize: 32, fontWeight: 900, color: bk.barber_name ? T.accent : T.text }}>{bk.chair_label || '—'}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {bk.barber_name ? `WITH ${bk.barber_name}` : 'ANY BARBER'}
                    </div>
                  </div>

                  {/* Center: Customer & Services */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: T.text, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bk.customer_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: T.bg, background: '#F5E200', padding: '2px 8px', borderRadius: 6 }}>{bk.booking_number}</span>
                      <span style={{ fontSize: 18, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bk.service_names}</span>
                    </div>
                  </div>

                  {/* Right: Time & Status */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: T.text }}>{formatTime(bk.scheduled_at)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.waiting }} />
                      <div style={{ fontSize: 14, fontWeight: 800, color: T.waiting, textTransform: 'uppercase' }}>WAITING</div>
                    </div>
                  </div>

                </div>
              ))
            )}
            {waiting.length > 0 && queue.filter(b => b.status === 'confirmed').length > 8 && (
              <div style={{ padding: '16px 32px', textAlign: 'center', color: T.muted, fontSize: 16, fontWeight: 600, background: 'rgba(255,255,255,0.02)' }}>
                + {queue.filter(b => b.status === 'confirmed').length - 8} more in queue
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
