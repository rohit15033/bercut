import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { api, BASE } from '../../shared/api.js'

const T = {
  bg:        '#FAFAF8',
  surface:   '#FFFFFF',
  border:    '#000000',
  text:      '#111110',
  muted:     '#555553',
  accent:    '#16A34A',
  accentBg:  'rgba(22,163,74,0.08)',
  waiting:   '#2563EB',
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })
}

function ChairCard({ barber, booking, compact }) {
  if (!barber) return null
  const isInProg = booking?.status === 'in_progress'
  const isBreak  = barber.status === 'on_break'
  const duration = parseInt(booking?.est_duration_min) || 30

  let elapsed = 0, pct = 0, startedStr = '—', estDoneStr = '—'
  if (isInProg && booking.started_at) {
    elapsed    = Math.floor((Date.now() - new Date(booking.started_at).getTime()) / 60000)
    pct        = Math.min(100, Math.round((elapsed / duration) * 100))
    startedStr = formatTime(booking.started_at)
    estDoneStr = formatTime(new Date(new Date(booking.started_at).getTime() + duration * 60000).toISOString())
  }

  const fs = compact
    ? { chair: '0.6vw', chairNum: '1.6vw', name: '1.8vw', label: '0.7vw', body: '1.3vw', sub: '0.75vw', prog: '0.6vw' }
    : { chair: '0.8vw', chairNum: '2.6vw', name: '2.8vw', label: '0.95vw', body: '1.7vw', sub: '0.9vw', prog: '0.7vw' }

  return (
    <div style={{ background: T.surface, border: `0.2vw solid ${T.border}`, borderRadius: '1vw', padding: compact ? '0.8vw 1.2vw' : '1.8vw 2vw', display: 'flex', flexDirection: 'column', gap: compact ? '0.5vw' : '0.8vw', overflow: 'hidden', height: '100%' }}>

      {/* Top row: chair + name + status badge under name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2vw' }}>
        <div style={{ background: isInProg ? T.accent : isBreak ? '#F59E0B' : '#E5E7EB', color: (isInProg || isBreak) ? '#fff' : T.text, padding: '0.5vw 1vw', borderRadius: '0.8vw', textAlign: 'center', border: `0.12vw solid ${T.border}`, minWidth: '4vw', flexShrink: 0 }}>
          <div style={{ fontSize: fs.chair, fontWeight: 800, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>CHAIR</div>
          <div style={{ fontSize: fs.chairNum, fontWeight: 900, lineHeight: 1 }}>{barber.chair_label || '?'}</div>
        </div>
        <div>
          <div style={{ fontSize: fs.name, fontWeight: 900, color: T.text, lineHeight: 1 }}>{barber.name}</div>
          <div style={{ display: 'inline-block', marginTop: '0.4vw', fontSize: fs.label, fontWeight: 800, padding: '0.2vw 0.7vw', borderRadius: '0.5vw',
            background: isInProg ? T.accentBg : isBreak ? 'rgba(245,158,11,0.1)' : '#F3F4F6',
            color:      isInProg ? T.accent   : isBreak ? '#F59E0B'              : T.muted,
            border:     `0.1vw solid ${isInProg ? T.accent : isBreak ? '#F59E0B' : T.border}`,
          }}>
            {isInProg ? 'IN SERVICE' : isBreak ? 'ON BREAK' : 'AVAILABLE'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {isInProg ? (
          <>
            <div style={{ fontSize: fs.sub, color: T.muted, marginBottom: '0.15vw' }}>Serving</div>
            <div style={{ fontSize: fs.body, fontWeight: 800, color: T.text, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.customer_name}</div>
            <div style={{ fontSize: fs.sub, color: T.muted, marginTop: '0.4vw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.service_names}</div>
          </>
        ) : isBreak ? (
          <div style={{ fontSize: fs.body, color: '#F59E0B', fontStyle: 'italic' }}>Taking a short break</div>
        ) : (
          <div style={{ fontSize: fs.body, color: T.muted, fontStyle: 'italic' }}>Ready for next customer</div>
        )}
      </div>

      {/* Progress bar */}
      {isInProg && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3vw', fontSize: fs.prog, fontWeight: 600, color: T.muted }}>
            <span>Started {startedStr}</span>
            <span style={{ color: T.accent }}>{elapsed}m / {duration}m</span>
            <span>Est. Done {estDoneStr}</span>
          </div>
          <div style={{ height: '0.6vw', background: '#E5E7EB', borderRadius: '0.3vw', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: T.accent, transition: 'width 1s linear' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function TvMonitor() {
  const { slug } = useParams()

  useEffect(() => {
    document.body.style.background = T.bg
    document.documentElement.style.background = T.bg
    return () => { document.body.style.background = ''; document.documentElement.style.background = '' }
  }, [])

  const [branch,  setBranch]  = useState(null)
  const [barbers, setBarbers] = useState([])
  const [queue,   setQueue]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [clock,   setClock]   = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const loadData = useCallback(async (branchId) => {
    try {
      const [bkRes, barRes] = await Promise.all([
        api.get(`/bookings/public?branch_id=${branchId}`),
        api.get(`/barbers?branch_id=${branchId}`),
      ])
      setQueue(bkRes || [])
      setBarbers(barRes || [])
    } catch (err) { console.error('[TV] load error:', err) }
  }, [])

  useEffect(() => {
    let es = null, fallback = null, reconnectDelay = 2000

    async function init() {
      try {
        const b = await api.get(`/branches/slug/${slug}`)
        setBranch(b)
        await loadData(b.id)
        setLoading(false)

        const connectSSE = () => {
          if (es) { try { es.close() } catch (_) {} }
          es = new EventSource(`${BASE}/events?branch_id=${b.id}`)
          es.onopen = () => { reconnectDelay = 2000 }
          es.onmessage = (e) => {
            try { const msg = JSON.parse(e.data); if (msg.type !== 'ping') loadData(b.id) } catch (_) {}
          }
          es.onerror = () => {
            try { es.close() } catch (_) {}
            reconnectDelay = Math.min(reconnectDelay * 2, 30000)
            setTimeout(connectSSE, reconnectDelay)
          }
        }
        connectSSE()
        fallback = setInterval(() => loadData(b.id), 15000)
      } catch (err) {
        console.error('[TV] init error:', err)
        setError('Branch not found')
        setLoading(false)
      }
    }
    init()
    return () => { if (es) es.close(); if (fallback) clearInterval(fallback) }
  }, [slug, loadData])

  if (loading) return <div style={{ background: T.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: T.text }}>Loading...</div>
  if (error)   return <div style={{ background: T.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#EF4444' }}>{error}</div>

  const activeBarbers = barbers.filter(b => b.status !== 'clocked_out')
  const inProg        = queue.filter(b => b.status === 'in_progress')
  const waiting       = queue.filter(b => b.status === 'confirmed').slice(0, 8)
  const barberCount   = activeBarbers.length
  const compact       = barberCount >= 4
  const twoRows       = barberCount >= 4

  return (
    <div style={{ background: T.bg, color: T.text, height: '100vh', width: '100vw', fontFamily: "'Inter', sans-serif", overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <style>{`*, *::before, *::after { box-sizing: border-box; } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} } body { margin:0; overflow:hidden; }`}</style>

      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', color: '#fff', padding: '0.9vw 3vw', borderBottom: '0.3vw solid #F5E200' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5vw' }}>
          <img src="/assets/bercut-logo-transparent.png" alt="Bercut" style={{ height: '3vw', width: 'auto' }} />
          <div style={{ width: '0.1vw', height: '2.4vw', background: 'rgba(255,255,255,0.2)' }} />
          <div>
            <div style={{ fontSize: '1.6vw', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>{branch.name.toUpperCase()}</div>
            <div style={{ fontSize: '0.85vw', color: 'rgba(255,255,255,0.55)', marginTop: '0.2vw', fontWeight: 600 }}>{branch.city} · Live Queue Monitor</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.4vw', fontWeight: 900, lineHeight: 1 }}>{clock.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })}</div>
          <div style={{ fontSize: '0.9vw', color: T.accent, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5vw', marginTop: '0.2vw' }}>
            <div style={{ width: '0.55vw', height: '0.55vw', borderRadius: '50%', background: T.accent, animation: 'pulse 2s infinite' }} />
            LIVE
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.9fr 1fr', gap: '2vw', padding: '2vw 3vw 2.5vw' }}>

        {/* Left: Now Serving */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1vw', minHeight: 0 }}>
          <div style={{ fontSize: '1.1vw', fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>Now Serving</div>
          {activeBarbers.length === 0 ? (
            <div style={{ flex: 1, background: T.surface, borderRadius: '1.2vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1vw', border: `0.15vw dashed ${T.border}` }}>
              <div style={{ fontSize: '3.5vw', opacity: 0.4 }}>☕</div>
              <div style={{ fontSize: '1.8vw', fontWeight: 800 }}>No Barbers Clocked In</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(barberCount, 3)}, 1fr)`, gridAutoRows: twoRows ? 'clamp(120px, 20vh, 220px)' : 'clamp(220px, 42vh, 420px)', gap: '1vw', alignContent: 'start' }}>
              {activeBarbers.map(barber => {
                const booking = inProg.find(b => b.barber_id === barber.id)
                return <ChairCard key={barber.id} barber={barber} booking={booking} compact={compact} />
              })}
            </div>
          )}
        </div>

        {/* Right: Waiting List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1vw' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontSize: '1.1vw', fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Waiting List</div>
            {waiting.length > 0 && <div style={{ fontSize: '0.85vw', fontWeight: 700, color: T.waiting, background: 'rgba(37,99,235,0.08)', padding: '0.2vw 0.7vw', borderRadius: '0.5vw' }}>{queue.filter(b => b.status === 'confirmed').length} in queue</div>}
          </div>
          <div style={{ background: T.surface, borderRadius: '1.2vw', border: `0.2vw solid ${T.border}`, overflow: 'hidden' }}>
            {waiting.length === 0 ? (
              <div style={{ padding: '3vw 2vw', textAlign: 'center', color: T.muted, fontSize: '1.3vw' }}>No one waiting · Walk-ins welcome!</div>
            ) : (
              <div>
                {waiting.map((bk, idx) => (
                  <div key={bk.id} style={{ display: 'flex', alignItems: 'center', gap: '1.2vw', padding: '1.2vw 1.8vw', borderBottom: idx === waiting.length - 1 ? 'none' : `0.1vw solid #E5E7EB` }}>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3vw' }}>
                        <span style={{ fontSize: '0.7vw', fontWeight: 800, color: T.muted }}>CHAIR</span>
                        <span style={{ fontSize: '1.6vw', fontWeight: 900, color: T.accent }}>{bk.chair_label || '—'}</span>
                      </div>
                      <div style={{ fontSize: '1vw', fontWeight: 800, color: T.muted, textTransform: 'uppercase', lineHeight: 1.1 }}>{bk.barber_name || 'ANY'}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '1.5vw', fontWeight: 800, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bk.customer_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw', marginTop: '0.15vw' }}>
                        <span style={{ fontSize: '0.7vw', fontWeight: 900, color: '#000', background: '#F5E200', padding: '0.1vw 0.5vw', borderRadius: '0.3vw' }}>{bk.booking_number}</span>
                        <span style={{ fontSize: '0.9vw', color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bk.service_names}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '1.3vw', fontWeight: 900, color: T.text }}>{formatTime(bk.scheduled_at)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3vw', marginTop: '0.2vw' }}>
                        <div style={{ width: '0.45vw', height: '0.45vw', borderRadius: '50%', background: T.waiting, animation: 'pulse 2s infinite' }} />
                        <div style={{ fontSize: '0.7vw', fontWeight: 800, color: T.waiting }}>WAITING</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
