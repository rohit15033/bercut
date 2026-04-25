import { useEffect, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const toMin = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export default function BarberSelection({ barbers, services, serviceIds, barber, setBarber, onNext, onBack }) {
  const [nextSlots, setNextSlots] = useState({})
  const [loadingSlots, setLoadingSlots] = useState(false)

  const dateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' })
  const totalDur = serviceIds.reduce((s, id) => {
    const svc = services.find(x => x.id === id)
    return s + (svc?.duration_minutes || svc?.duration_min || 30)
  }, 0)

  useEffect(() => {
    const fetchAllNext = async () => {
      setLoadingSlots(true)
      const results = {}
      await Promise.all(barbers.map(async b => {
        if (['clocked_out', 'off'].includes(b.status)) return
        try {
          const slots = await kioskApi.get(`/slots?barber_id=${b.id}&date=${dateStr}&duration_min=${totalDur}`)
          if (slots && slots.length > 0) {
            results[b.id] = slots[0]
          }
        } catch (e) { console.error(e) }
      }))
      setNextSlots(results)
      setLoadingSlots(false)
    }
    fetchAllNext()
  }, [barbers, dateStr, totalDur])


  // Show all barbers, but we will visually disable those who are unavailable
  const isAnySelected = barber?.source === 'any_available'
  const now = new Date()
  const witaMs = now.getTime() + (now.getTimezoneOffset() * 60000) + (8 * 3600000)
  const w = new Date(witaMs)
  const nowWita = `${w.getHours().toString().padStart(2, '0')}:${w.getMinutes().toString().padStart(2, '0')}`
  const nowMin = toMin(nowWita)
  
  // Find the earliest time among all barbers for "Any Available"
  const allAvailableTimes = Object.values(nextSlots).sort()
  const earliestAnyTime = allAvailableTimes[0] || null

  const sortedBarbers = [...barbers].sort((a, b) => {
    const aU = ['clocked_out', 'off', 'on_break'].includes(a.status)
    const bU = ['clocked_out', 'off', 'on_break'].includes(b.status)
    if (aU && !bU) return 1
    if (!aU && bU) return -1
    return 0
  })

  const anyCanNow = sortedBarbers.some(b => !['clocked_out', 'off', 'on_break', 'busy', 'in_service'].includes(b.status))

  return (
    <div className="scroll-y" style={{ height:'calc(100vh - clamp(51px,6.5vh,63px))', padding:'clamp(16px,2.4vw,28px)' }}>
      <div className="step-header fu">
        <div className="step-eyebrow">Step 2 of 4 · Choose Barber</div>
        <h2 className="step-title">Choose Your Barber</h2>
        <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.muted, marginTop:4 }}>Pilih Barber Anda</div>
      </div>

      <div className="barber-grid-fluid" style={{ marginBottom:'clamp(12px,1.6vw,18px)' }}>
        {[null, ...sortedBarbers].map((b, i) => {
          const isAny = b === null
          const data  = isAny
            ? { id: 0, name: 'Any Available', spec: '', spec_id: '', status: 'active' }
            : b
            
          const isUnavailable = !isAny && ['clocked_out', 'off', 'on_break'].includes(data.status)
          const sel = isAny ? isAnySelected : (barber?.id === data.id && !isAnySelected)

          return (
            <div key={isAny ? 'any' : data.id} className={`fu card ${sel ? 'sel' : ''}`}
              style={{ 
                animationDelay:`${i * 0.05}s`, 
                padding:'clamp(14px,1.8vw,20px)', 
                cursor: isUnavailable ? 'not-allowed' : 'pointer', 
                textAlign:'center',
                opacity: isUnavailable ? 0.7 : 1,
                background: isUnavailable ? '#f5f5f5' : (sel ? C.accent : C.white),
                border: isUnavailable ? '1.5px dashed #ccc' : `1.5px solid ${sel ? C.accent : C.border}`,
                transform: isUnavailable ? 'scale(0.96)' : 'none',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                if (isUnavailable) return;
                if (isAny) {
                  setBarber({ id: null, name: 'Any Available', source: 'any_available' })
                } else {
                  setBarber(b)
                }
              }}>
              {isUnavailable && (
                <div style={{ 
                  position: 'absolute', top: 8, right: 8, 
                  background: '#666', color: '#fff', 
                  fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 2
                }}>
                  Unavailable
                </div>
              )}
              {/* Avatar */}
              <div style={{ position:'relative', width:'clamp(64px,9vw,90px)', height:'clamp(64px,9vw,90px)', margin:`0 auto clamp(8px,1.2vw,12px)` }}>
                <svg width="100%" height="100%" viewBox="0 0 68 68" style={{ filter: isUnavailable ? 'grayscale(100%) opacity(0.6)' : 'none' }}>
                  <circle cx="34" cy="34" r="34" fill={sel ? C.accentText : C.surface2} />
                  {isAny
                    ? <text x="34" y="44" textAnchor="middle" fontSize="26" fill={sel ? C.accent : C.topBg}>🎲</text>
                    : <text x="34" y="42" textAnchor="middle" fontSize="20" fontWeight="700" fill={sel ? C.accent : C.topBg} fontFamily="Inter,sans-serif">{data.name.slice(0, 2).toUpperCase()}</text>
                  }
                </svg>
                {sel && <div style={{ position:'absolute', bottom:0, right:0, width:20, height:20, background:C.white, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:C.accentText }}>✓</div>}
              </div>

              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(15px,2vw,20px)', fontWeight:700, color:sel ? C.accentText : C.text, lineHeight:1.1, marginBottom:2 }}>{data.name}</div>
              <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:sel ? '#1a1a1888' : C.muted, marginBottom:'clamp(8px,1.2vw,12px)' }}>
                {data.spec || data.specialization || ''}{(data.spec_id || data.specialization_id) ? ` · ${data.spec_id || data.specialization_id}` : ''}
              </div>

              {!isAny && (
                <div style={{ display:'flex', justifyContent:'center', gap:'clamp(8px,1.2vw,14px)', marginBottom:'clamp(8px,1.2vw,12px)' }}>
                  {data.rating && (
                    <div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,16px)', fontWeight:700, color:sel ? C.accentText : C.text }}>★ {Number(data.rating).toFixed(1)}</div>
                      <div style={{ fontSize:'clamp(9px,1.1vw,11px)', color:sel ? '#1a1a1877' : C.muted }}>Rating</div>
                    </div>
                  )}
                </div>
              )}

              {isAny ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ background:sel ? '#1a1a1814' : C.surface, borderRadius:8, padding:'4px 10px' }}>
                    <span style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:sel ? C.accentText : C.text }}>
                      {anyCanNow ? 'Now ⚡' : (earliestAnyTime ? `Next: ${earliestAnyTime}` : 'Check for slots')}
                    </span>
                  </div>
                  <div style={{ fontSize:'clamp(9px,1vw,10px)', color:sel ? '#1a1a1877' : C.muted, fontWeight:500 }}>

                  </div>
                </div>
              ) : (() => {
                const bSlot = nextSlots[data.id]
                const bCanNow = !['clocked_out', 'off', 'on_break', 'busy', 'in_service'].includes(data.status)
                return (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ background: isUnavailable ? '#eee' : (sel ? '#1a1a1814' : C.surface), borderRadius:8, padding:'4px 10px', display:'inline-block' }}>
                      <span style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color: isUnavailable ? '#888' : (sel ? C.accentText : C.text) }}>
                        {bCanNow ? 'Now ⚡' 
                          : data.status === 'clocked_out' ? 'No shift today'
                          : data.status === 'on_break' ? 'On Break'
                          : data.status === 'off' ? 'Off'
                          : bSlot ? `Next: ${bSlot}`
                          : 'Busy'}
                      </span>
                    </div>
                    {!isUnavailable && !bCanNow && bSlot && (
                      <div style={{ fontSize:'clamp(9px,1.1vw,10px)', color:sel ? C.accentText : C.muted, fontWeight:500 }}>
                        Next available slot
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>

      <div style={{ display:'flex', gap:'clamp(8px,1.2vw,14px)' }}>
        <button className="btnG" onClick={onBack} style={{ width:'clamp(120px,16vw,180px)' }}>← Back</button>
        <button className="btnP" disabled={!barber} onClick={onNext}>Continue →</button>
      </div>
    </div>
  )
}
