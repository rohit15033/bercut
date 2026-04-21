import { useEffect, useRef, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'
import { kioskApi } from '../../../shared/api.js'

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

const COUNTRIES = [
  { flag:'🇮🇩', name:'Indonesia',      code:'+62', abbr:'ID' },
  { flag:'🇦🇺', name:'Australia',      code:'+61', abbr:'AU' },
  { flag:'🇬🇧', name:'United Kingdom', code:'+44', abbr:'GB' },
  { flag:'🇺🇸', name:'United States',  code:'+1',  abbr:'US' },
  { flag:'🇸🇬', name:'Singapore',      code:'+65', abbr:'SG' },
  { flag:'🇲🇾', name:'Malaysia',       code:'+60', abbr:'MY' },
  { flag:'🇯🇵', name:'Japan',          code:'+81', abbr:'JP' },
  { flag:'🇨🇳', name:'China',          code:'+86', abbr:'CN' },
  { flag:'🇩🇪', name:'Germany',        code:'+49', abbr:'DE' },
  { flag:'🇫🇷', name:'France',         code:'+33', abbr:'FR' },
  { flag:'🇳🇱', name:'Netherlands',    code:'+31', abbr:'NL' },
  { flag:'🇷🇺', name:'Russia',         code:'+7',  abbr:'RU' },
  { flag:'🇮🇳', name:'India',          code:'+91', abbr:'IN' },
  { flag:'🇰🇷', name:'South Korea',    code:'+82', abbr:'KR' },
]
const PINNED = ['ID', 'AU', 'GB', 'US', 'SG']
const pinnedCountries = COUNTRIES.filter(c => PINNED.includes(c.abbr))

function CountryPicker({ selected, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const q = search.toLowerCase().trim()

  const Row = ({ c }) => (
    <div onClick={() => { onSelect(c); onClose() }}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'clamp(10px,1.4vh,13px) clamp(12px,1.6vw,16px)', cursor:'pointer', borderRadius:8, background:selected?.abbr === c.abbr ? C.surface : 'transparent', transition:'background 0.12s' }}
      onMouseEnter={e => e.currentTarget.style.background = C.surface}
      onMouseLeave={e => e.currentTarget.style.background = selected?.abbr === c.abbr ? C.surface : 'transparent'}>
      <span style={{ fontSize:'clamp(18px,2.4vw,24px)', lineHeight:1, flexShrink:0 }}>{c.flag}</span>
      <span style={{ flex:1, fontSize:'clamp(13px,1.5vw,15px)', fontWeight:500, color:C.text }}>{c.name}</span>
      <span style={{ fontSize:'clamp(13px,1.5vw,15px)', fontWeight:700, color:C.muted, fontFamily:"'Inter',sans-serif" }}>{c.code}</span>
    </div>
  )

  const filtered = q
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.includes(q) || c.abbr.toLowerCase().includes(q))
    : null

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(16px,2.4vw,28px)' }} onClick={onClose}>
      <div className="si" style={{ background:C.white, borderRadius:18, width:'clamp(320px,48vw,520px)', maxHeight:'76vh', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:'clamp(14px,2vw,20px) clamp(16px,2.2vw,22px)', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(15px,2vw,19px)', fontWeight:800, color:C.text }}>Select Country Code</div>
            <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted, marginTop:2 }}>Pilih kode negara</div>
          </div>
          <button onClick={onClose} style={{ background:C.surface2, border:'none', borderRadius:8, width:34, height:34, fontSize:18, cursor:'pointer', color:C.text2, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:'clamp(10px,1.4vw,14px) clamp(16px,2.2vw,22px)', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <input ref={ref} value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search country or code…"
            style={{ width:'100%', padding:'clamp(10px,1.4vh,13px) 14px', borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:'clamp(13px,1.5vw,15px)', background:C.surface, fontFamily:"'DM Sans',sans-serif", color:C.text }} />
        </div>
        <div style={{ overflowY:'auto', flex:1, WebkitOverflowScrolling:'touch' }}>
          {!q && (
            <>
              <div style={{ padding:'clamp(6px,0.8vw,8px) clamp(16px,2.2vw,22px) 4px', fontSize:'clamp(9px,1.1vw,11px)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.muted }}>Pinned</div>
              {pinnedCountries.map(c => <Row key={c.abbr} c={c} />)}
              <div style={{ height:1, background:C.border, margin:'clamp(6px,0.8vw,8px) clamp(16px,2.2vw,22px)' }} />
              <div style={{ padding:'clamp(6px,0.8vw,8px) clamp(16px,2.2vw,22px) 4px', fontSize:'clamp(9px,1.1vw,11px)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.muted }}>All Countries</div>
              {COUNTRIES.map(c => <Row key={c.abbr} c={c} />)}
            </>
          )}
          {q && (
            filtered.length > 0
              ? filtered.map(c => <Row key={c.abbr} c={c} />)
              : <div style={{ padding:'clamp(20px,3vw,28px)', textAlign:'center', color:C.muted, fontSize:'clamp(12px,1.4vw,14px)' }}>No countries found</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Confirm({ cart, services, barber, slot, selectedExtras, menuItems, name, setName, phone, setPhone, branchId, settings, onConfirm, onBack }) {
  const [country,       setCountry]       = useState(COUNTRIES[0])
  const [showCP,        setShowCP]        = useState(false)
  const [customer,      setCustomer]      = useState(null)
  const [pointsToggled, setPointsToggled] = useState(new Set())
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const nameRef = useRef(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const valid = name.trim().length >= 2

  const selectedServices    = cart.map(id => services.find(s => s.id === id)).filter(Boolean)
  const selectedExtrasItems = selectedExtras.map(id => menuItems.find(m => (m.stock_id || m.id) === id)).filter(Boolean)

  const svcTotal    = selectedServices.reduce((s, svc) => s + parseFloat(svc?.price ?? svc?.base_price ?? 0), 0)
  const extrasTotal = selectedExtrasItems.reduce((s, item) => s + parseFloat(item?.price || 0), 0)
  const totalDur    = selectedServices.reduce((s, svc) => s + (svc.duration_min || svc.duration_minutes || 30), 0)

  // Loyalty settings
  const gs         = settings?.loyalty || {}
  const redeemRate = gs.redeem_value_per_point || 100
  const minRedeem  = gs.min_redeem_points || 100
  const points     = customer?.loyalty_points || 0
  const canRedeem  = points >= minRedeem

  const ptCost = svc => Math.ceil(parseFloat(svc?.price ?? svc?.base_price ?? 0) / redeemRate)

  const pointsUsed = [...pointsToggled].reduce((s, id) => {
    const svc = selectedServices.find(x => x.id === id)
    return s + (svc ? ptCost(svc) : 0)
  }, 0)
  const pointsRemaining = points - pointsUsed

  const togglePoints = id => {
    const svc = selectedServices.find(x => x.id === id)
    if (!svc) return
    setPointsToggled(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); return next }
      if (pointsRemaining >= ptCost(svc)) { next.add(id); return next }
      return prev
    })
  }

  const pointsDiscount = [...pointsToggled].reduce((s, id) => {
    const svc = selectedServices.find(x => x.id === id)
    return s + parseFloat(svc?.price ?? svc?.base_price ?? 0)
  }, 0)
  const cashTotal = svcTotal + extrasTotal - pointsDiscount

  // Phone loyalty lookup
  useEffect(() => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 8) { setCustomer(null); return }
    const timer = setTimeout(() => {
      kioskApi.get(`/customers?phone=${encodeURIComponent(country.code + digits)}`)
        .then(data => setCustomer(data))
        .catch(() => setCustomer(null))
    }, 600)
    return () => clearTimeout(timer)
  }, [phone, country.code])

  const handleConfirm = async () => {
    if (!valid) return
    setLoading(true); setError('')
    try {
      const e164 = country.code + phone.replace(/\D/g, '').replace(/^0/, '')
      const bk = await kioskApi.post('/bookings', {
        branch_id:      branchId,
        customer_phone: phone ? e164 : undefined,
        customer_name:  name,
        barber_id:      barber.source === 'any_available' ? null : barber.id,
        service_ids:    cart,
        extra_ids:      selectedExtras,
        slot_time:      slot === 'Now' ? null : slot,
        date:           new Date().toISOString().slice(0, 10),
        source:         barber.source === 'any_available' ? 'any_available' : 'kiosk',
        use_points:     pointsUsed > 0,
      })
      onConfirm(bk, pointsUsed)
    } catch (err) {
      setError(err.message || 'Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="scroll-y" style={{ height:'calc(100vh - clamp(51px,6.5vh,63px))', padding:'clamp(10px,1.6vw,18px) clamp(16px,2.4vw,28px)' }}>
      {showCP && <CountryPicker selected={country} onSelect={setCountry} onClose={() => setShowCP(false)} />}

      <div className="step-header fu" style={{ marginBottom:'clamp(8px,1.2vw,14px)' }}>
        <div className="step-eyebrow">Step 4 of 4 · Confirm</div>
        <h2 className="step-title" style={{ fontSize:'clamp(20px,2.6vw,30px)' }}>Confirm Your Reservation</h2>
        <div style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted, marginTop:2 }}>Confirm Reservation · Konfirmasi Reservasi</div>
      </div>

      <div className="confirm-layout">
        {/* LEFT — name + phone + loyalty + CTA */}
        <div>
          <div className="fu" style={{ animationDelay:'0.05s', background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'clamp(12px,1.4vw,16px)', marginBottom:'clamp(8px,1vw,10px)' }}>

            {/* Prominent name heading */}
            <div style={{ marginBottom:'clamp(10px,1.2vw,14px)' }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(15px,1.8vw,19px)', fontWeight:800, color:C.text, marginBottom:2 }}>
                What's your name?
              </div>
              <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted }}>
                Required for your reservation · Wajib diisi sebelum lanjut
              </div>
            </div>

            {/* Name — required */}
            <div style={{ marginBottom:'clamp(10px,1.2vw,12px)' }}>
              <label style={{ fontSize:'clamp(12px,1.4vw,14px)', fontWeight:700, display:'block', marginBottom:5, color:C.text }}>
                Name / Nama <span style={{ color:C.danger }}>*</span>
              </label>
              <input ref={nameRef} value={name} type="text" autoComplete="given-name"
                onChange={e => setName(e.target.value)}
                placeholder="Tap here and type your name"
                style={{ width:'100%', padding:'clamp(10px,1.4vh,13px) 14px', borderRadius:10, border:`2px solid ${name.trim().length > 0 ? C.topBg : C.accent}`, fontSize:'clamp(14px,1.6vw,16px)', background:C.white, fontFamily:"'DM Sans',sans-serif", animation:name.trim().length === 0 ? 'namePulse 1.4s ease 3' : 'none', transition:'border-color 0.15s' }}
                onFocus={e => { e.target.style.borderColor = C.topBg; e.target.style.animation = 'none' }}
                onBlur={e => { e.target.style.borderColor = name.trim().length > 0 ? C.topBg : C.accent }}
              />
              {name.trim().length > 0 && name.trim().length < 2 && (
                <div style={{ fontSize:'clamp(10px,1.2vw,11px)', color:C.danger, marginTop:4 }}>
                  Name must be at least 2 characters · Minimal 2 karakter
                </div>
              )}
            </div>

            {/* WhatsApp — optional */}
            <div style={{ marginBottom:'clamp(8px,1vw,10px)' }}>
              <label style={{ fontSize:'clamp(12px,1.4vw,14px)', fontWeight:700, display:'block', marginBottom:5, color:C.text }}>
                WhatsApp <span style={{ fontSize:'clamp(10px,1.2vw,12px)', fontWeight:400, color:C.muted }}>(Optional / Opsional)</span>
              </label>
              <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
                <button type="button" onClick={() => setShowCP(true)}
                  style={{ display:'flex', alignItems:'center', gap:'clamp(4px,0.6vw,7px)', padding:'0 clamp(10px,1.4vw,14px)', borderRadius:10, border:`1.5px solid ${phone.trim().length > 0 ? C.topBg : C.border}`, background:C.white, cursor:'pointer', flexShrink:0, minHeight:'clamp(40px,5.2vh,48px)', transition:'border-color 0.15s, background 0.12s', whiteSpace:'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface}
                  onMouseLeave={e => e.currentTarget.style.background = C.white}>
                  <span style={{ fontSize:'clamp(16px,2vw,20px)', lineHeight:1 }}>{country.flag}</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(12px,1.4vw,14px)', fontWeight:700, color:C.text }}>{country.code}</span>
                  <span style={{ fontSize:'clamp(9px,1vw,10px)', color:C.muted, marginLeft:1 }}>▾</span>
                </button>
                <input value={phone} type="tel" onChange={e => setPhone(e.target.value)}
                  placeholder="812 3456 7890"
                  style={{ flex:1, minWidth:0, padding:'clamp(10px,1.3vh,13px) 14px', borderRadius:10, border:`1.5px solid ${phone.trim().length > 0 ? C.topBg : C.border}`, fontSize:'clamp(13px,1.5vw,15px)', background:C.white, fontFamily:"'DM Sans',sans-serif", transition:'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = C.topBg}
                  onBlur={e => e.target.style.borderColor = phone.trim().length > 0 ? C.topBg : C.border}
                />
              </div>
            </div>

            {/* Loyalty states */}
            {customer && points > 0 && (
              <div className="fi" style={{ background:'#f0faf0', border:'1.5px solid #a8d5a8', borderRadius:10, padding:'clamp(8px,1vw,11px)', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>⭐</span>
                <div>
                  <div style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:'#1a7a1a' }}>
                    Welcome back, {customer.name}! · Selamat datang kembali!
                  </div>
                  <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:'#2e7d32' }}>
                    You have <strong>{points} points</strong> — tap services on the right to redeem · Tekan layanan untuk gunakan poin
                  </div>
                </div>
              </div>
            )}
            {customer && points === 0 && (
              <div className="fi" style={{ background:C.surface, borderRadius:10, padding:'clamp(8px,1vw,11px)' }}>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.muted }}>⭐ Welcome back, {customer.name}! You have 0 points. Earn points today. · Kamu belum punya poin.</div>
              </div>
            )}
            {!customer && !phone.trim() && (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'clamp(8px,1vw,11px) clamp(10px,1.4vw,14px)', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:14 }}>⭐</span>
                <div style={{ fontSize:'clamp(10px,1.2vw,12px)', color:C.text2 }}>
                  Have points? Enter your WhatsApp number to redeem.
                  <span style={{ color:C.muted }}> · Punya poin? Masukkan nomor WhatsApp.</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginBottom:8, padding:'clamp(8px,1vw,11px)', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA', color:C.danger, fontSize:'clamp(12px,1.4vw,13px)' }}>{error}</div>
          )}

          <button className="btnP" disabled={!valid || loading} onClick={handleConfirm}
            style={{ fontSize:'clamp(14px,1.6vw,16px)', marginBottom:7, padding:'clamp(12px,1.6vh,15px)' }}>
            {loading ? 'Confirming…' : valid ? 'Confirm Reservation ✓' : 'Enter your name to continue'}
          </button>
          <button className="btnG" onClick={onBack} style={{ width:'100%', minHeight:44, padding:'10px 20px' }}>← Back / Kembali</button>
        </div>

        {/* RIGHT — order summary */}
        <div>
          <div className="fu" style={{ animationDelay:'0.08s', background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'clamp(10px,1.4vw,14px)' }}>
            <div style={{ fontSize:'clamp(10px,1.1vw,11px)', fontWeight:700, letterSpacing:'0.12em', color:C.muted, textTransform:'uppercase', marginBottom:10 }}>Order Summary · Ringkasan Reservasi</div>

            {/* Services with per-service points toggle */}
            {selectedServices.map(svc => {
              const isToggled = pointsToggled.has(svc.id)
              const cost      = ptCost(svc)
              const canToggle = canRedeem && (isToggled || pointsRemaining >= cost)
              const price     = parseFloat(svc.price ?? svc.base_price ?? 0)
              return (
                <div key={svc.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(7px,1vh,10px) 0', borderBottom:`1px solid ${C.border}`, gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'clamp(12px,1.4vw,14px)', fontWeight:600 }}>{svc.name}</div>
                    <div style={{ fontSize:'clamp(9px,1.1vw,11px)', color:C.muted }}>
                      {svc.name_id || ''}{svc.name_id ? ' · ' : ''}{svc.duration_min || svc.duration_minutes || 30} min
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    {canRedeem && (
                      <button onClick={() => togglePoints(svc.id)}
                        style={{ padding:'4px 8px', borderRadius:999, fontSize:'clamp(9px,1vw,10px)', fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:canToggle ? 'pointer' : 'not-allowed', border:`1.5px solid ${isToggled ? C.topBg : C.border}`, background:isToggled ? C.topBg : C.white, color:isToggled ? C.white : canToggle ? C.text2 : C.muted, transition:'all 0.15s', opacity:canToggle ? 1 : 0.45 }}>
                        {isToggled ? `✓ ${cost} pts` : `${cost} pts`}
                      </button>
                    )}
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,17px)', fontWeight:700, textDecoration:isToggled ? 'line-through' : 'none', color:isToggled ? C.muted : C.text }}>
                      {fmt(price)}
                    </div>
                    {isToggled && (
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:'#1a7a1a' }}>Free</div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Extras */}
            {selectedExtrasItems.map(item => (
              <div key={item.stock_id || item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(6px,0.9vh,9px) 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:'clamp(12px,1.4vw,14px)', color:C.text2 }}>{item.name}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(12px,1.4vw,14px)', fontWeight:600 }}>{fmt(item.price)}</div>
              </div>
            ))}

            {/* Booking meta */}
            {[
              ['Barber', `${barber?.name}${barber?.source === 'any_available' ? ' (Any)' : ''}`],
              ['Time / Waktu', slot === 'Now' ? 'Now ⚡' : slot],
              ['Duration / Durasi', `${totalDur} min`],
            ].map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'clamp(6px,0.9vh,9px) 0', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:'clamp(11px,1.3vw,13px)', color:C.muted }}>{k}</span>
                <span style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:600 }}>{v}</span>
              </div>
            ))}

            {/* Points deduction row */}
            {pointsUsed > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(6px,0.9vh,9px) 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:13 }}>⭐</span>
                  <div>
                    <div style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:'#1a7a1a' }}>Points Applied · Poin Digunakan</div>
                    <div style={{ fontSize:'clamp(9px,1.1vw,11px)', color:C.muted }}>{pointsUsed} pts used · {pointsRemaining} pts remaining</div>
                  </div>
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,16px)', fontWeight:700, color:'#1a7a1a' }}>−{fmt(pointsDiscount)}</div>
              </div>
            )}

            {/* Total */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:10, marginBottom:8 }}>
              <div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(13px,1.6vw,17px)', fontWeight:800 }}>{pointsUsed > 0 ? 'CASH TOTAL' : 'TOTAL'}</div>
                {pointsUsed > 0 && <div style={{ fontSize:'clamp(9px,1.1vw,11px)', color:C.muted }}>Bayar Tunai</div>}
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'clamp(18px,2.4vw,26px)', fontWeight:800 }}>
                {cashTotal === 0 ? <span style={{ color:'#1a7a1a' }}>Rp 0</span> : fmt(cashTotal)}
              </span>
            </div>

            {/* Payment note */}
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
              <span style={{ fontSize:14, flexShrink:0 }}>{cashTotal === 0 ? '⭐' : '💳'}</span>
              <div>
                {cashTotal === 0
                  ? <div style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:'#1a7a1a' }}>Fully covered by points! · Dibayar penuh dengan poin</div>
                  : <>
                      <div style={{ fontSize:'clamp(11px,1.3vw,13px)', fontWeight:700, color:C.text }}>Pay after service · Bayar setelah selesai</div>
                      <div style={{ fontSize:'clamp(9px,1.1vw,11px)', color:C.muted }}>Xendit Terminal (QRIS / Card) — at the kiosk when done</div>
                    </>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
