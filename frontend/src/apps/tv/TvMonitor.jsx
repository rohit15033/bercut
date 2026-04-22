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
  const isBreak = barber.status === 'on_break'
  const duration = parseInt(booking?.est_duration_min) || 30

  let elapsed = 0
  let pct = 0
  if (isInProg && booking.started_at) {
    elapsed = Math.floor((Date.now() - new Date(booking.started_at).getTime()) / 60000)
    pct = Math.min(100, Math.round((elapsed / duration) * 100))
  }

  return (
    <div style={{ background: T.surface, border: `0.2vw solid ${isInProg ? T.accent : (isBreak ? '#F59E0B' : T.border)}`, borderRadius: '1.5vw', padding: '2vw', display: 'flex', flexDirection: 'column', gap: '1vw', transition: 'all 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5vw' }}>
          <div style={{
            background: isInProg ? T.accent : (isBreak ? '#F59E0B' : T.border),
            color: (isInProg || isBreak) ? T.bg : T.text,
            padding: '0.8vw 1.5vw',
            borderRadius: '1vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '5vw'
          }}>
            <div style={{ fontSize: '0.8vw', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CHAIR</div>
            <div style={{ fontSize: '2.5vw', fontWeight: 900, lineHeight: 1 }}>{barber.chair_label || '?'}</div>
          </div>
          <div>
            <div style={{ fontSize: '3vw', fontWeight: 900, color: T.text, lineHeight: 1 }}>{barber.name}</div>
          </div>
        </div>
        {isInProg ? (
          <div style={{ background: T.accentBg, color: T.accent, padding: '0.5vw 1vw', borderRadius: '0.8vw', fontSize: '1vw', fontWeight: 800, border: `0.1vw solid ${T.accent}` }}>IN SERVICE</div>
        ) : isBreak ? (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', padding: '0.5vw 1vw', borderRadius: '0.8vw', fontSize: '1vw', fontWeight: 800, border: '0.1vw solid #F59E0B' }}>ISTIRAHAT / ON BREAK</div>
        ) : (
          <div style={{ background: T.border, color: T.muted, padding: '0.5vw 1vw', borderRadius: '0.8vw', fontSize: '1vw', fontWeight: 800 }}>AVAILABLE</div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '6vw' }}>
        {isInProg ? (
          <>
            <div style={{ fontSize: '1.2vw', color: T.muted, marginBottom: '0.2vw' }}>Serving</div>
            <div style={{ fontSize: '2.2vw', fontWeight: 800, color: T.text, lineHeight: 1.1 }}>{booking.customer_name}</div>
            <div style={{ fontSize: '1.1vw', color: T.muted, marginTop: '0.6vw' }}>{booking.service_names}</div>
          </>
        ) : isBreak ? (
          <div style={{ fontSize: '1.5vw', color: '#F59E0B', fontStyle: 'italic' }}>Taking a short break</div>
        ) : (
          <div style={{ fontSize: '1.5vw', color: T.muted, fontStyle: 'italic' }}>Ready for next customer</div>
        )}
      </div>

      {isInProg && (
        <div style={{ marginTop: '1vw' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5vw', fontSize: '1vw', fontWeight: 600 }}>
            <span style={{ color: T.muted }}>Progress</span>
            <span style={{ color: T.accent }}>{elapsed}m / {duration}m</span>
          </div>
          <div style={{ height: '0.8vw', background: T.border, borderRadius: '0.4vw', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: T.accent, transition: 'width 1s linear' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function TvMonitor() {
  const { slug } = useParams()

  // Force dark background immediately — prevents white flash before React hydrates
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = T.bg
    document.documentElement.style.background = T.bg
    return () => {
      document.body.style.background = prev
      document.documentElement.style.background = ''
    }
  }, [])

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

  if (loading) return <div style={{ background: T.bg, height: '100vh', color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>Loading Screen...</div>
  if (error) return <div style={{ background: T.bg, height: '100vh', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{error}</div>

  const inProg = queue.filter(b => b.status === 'in_progress')
  const waiting = queue.filter(b => b.status === 'confirmed').slice(0, 8)

  return (
    <div style={{ background: T.bg, color: T.text, height: '100vh', padding: '3vw 4vw', fontFamily: "'Inter', sans-serif", overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        body { margin: 0; overflow: hidden; background: #0A0A0A; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2vw' }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height: '4vw', width: 'auto' }} />
          <div style={{ width: '0.15vw', height: '3.5vw', background: T.border }} />
          <div>
            <div style={{ fontSize: '1.8vw', fontWeight: 900, letterSpacing: '-0.02em', color: T.text }}>
              {branch.name.toUpperCase()}
            </div>
            <div style={{ fontSize: '1vw', color: T.muted, marginTop: '0.2vw' }}>{branch.city} · Live Queue Monitor</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.5vw', fontWeight: 800 }}>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
          <div style={{ fontSize: '1vw', color: T.accent, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5vw' }}>
            <div style={{ width: '0.6vw', height: '0.6vw', borderRadius: '50%', background: T.accent, animation: 'pulse 2s infinite' }} />
            LIVE SYSTEM
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '3vw', flex: 1, minHeight: 0 }}>

        {/* Left Side: Now Serving */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5vw' }}>
          <div style={{ fontSize: '1.3vw', fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Now Serving</div>
          {barbers.filter(b => b.status !== 'clocked_out').length === 0 ? (
            <div style={{ background: T.surface, borderRadius: '1.5vw', padding: '4vw 3vw', textAlign: 'center', color: T.muted, border: `0.15vw dashed ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5vw', flex: 1 }}>
              <div style={{ fontSize: '4vw', opacity: 0.5 }}>☕</div>
              <div style={{ fontSize: '2vw', fontWeight: 800, color: T.text }}>No Barbers Clocked In</div>
              <div style={{ fontSize: '1.2vw', maxWidth: '30vw', lineHeight: 1.5 }}>Our team is currently preparing for the next shift or on a complete break. Please check back soon!</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(22vw, 1fr))', gap: '1.5vw', flex: 1, alignContent: 'start' }}>
              {barbers.filter(b => b.status !== 'clocked_out').map(barber => {
                const booking = inProg.find(b => b.barber_id === barber.id)
                return <ChairCard key={barber.id} barber={barber} booking={booking} />
              })}
            </div>
          )}
        </div>

        {/* Right Side: Waiting List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5vw' }}>
          <div style={{ fontSize: '1.3vw', fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Waiting List</div>
          <div style={{ background: T.surface, borderRadius: '1.5vw', padding: '1vw 0', flex: 1, display: 'flex', flexDirection: 'column', border: `0.2vw solid ${T.border}` }}>
            {waiting.length === 0 ? (
              <div style={{ padding: '3vw', textAlign: 'center', color: T.muted, fontSize: '1.5vw' }}>No one waiting. Walk-ins welcome!</div>
            ) : (
              waiting.map((bk, idx) => (
                <div key={bk.id} style={{ display: 'flex', alignItems: 'center', gap: '2vw', padding: '1.2vw 2vw', borderBottom: idx === waiting.length - 1 ? 'none' : `0.1vw solid ${T.border}` }}>

                  {/* Left: Chair & Barber Assignment */}
                  <div style={{ width: '10vw', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4vw', marginBottom: '0.2vw' }}>
                      <span style={{ fontSize: '0.7vw', fontWeight: 800, color: T.muted }}>CHAIR</span>
                      <span style={{ fontSize: '1.8vw', fontWeight: 900, color: bk.barber_name ? T.accent : T.text }}>{bk.chair_label || '—'}</span>
                    </div>
                    <div style={{ fontSize: '0.8vw', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {bk.barber_name ? `WITH ${bk.barber_name}` : 'ANY BARBER'}
                    </div>
                  </div>

                  {/* Center: Customer & Services */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.8vw', fontWeight: 800, color: T.text, marginBottom: '0.2vw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bk.customer_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8vw' }}>
                      <span style={{ fontSize: '0.8vw', fontWeight: 900, color: T.bg, background: '#F5E200', padding: '0.1vw 0.5vw', borderRadius: '0.4vw' }}>{bk.booking_number}</span>
                      <span style={{ fontSize: '1.1vw', color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bk.service_names}</span>
                    </div>
                  </div>

                  {/* Right: Time & Status */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.5vw', fontWeight: 900, color: T.text }}>{formatTime(bk.scheduled_at)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4vw', marginTop: '0.3vw' }}>
                      <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: T.waiting }} />
                      <div style={{ fontSize: '0.8vw', fontWeight: 800, color: T.waiting, textTransform: 'uppercase' }}>WAITING</div>
                    </div>
                  </div>

                </div>
              ))
            )}
            {waiting.length > 0 && queue.filter(b => b.status === 'confirmed').length > 8 && (
              <div style={{ padding: '1vw 2vw', textAlign: 'center', color: T.muted, fontSize: '0.9vw', fontWeight: 600, background: 'rgba(255,255,255,0.02)' }}>
                + {queue.filter(b => b.status === 'confirmed').length - 8} more in queue
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
