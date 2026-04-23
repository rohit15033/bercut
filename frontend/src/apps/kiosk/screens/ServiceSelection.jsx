import { useRef, useState } from 'react'
import { tokens as C } from '../../../shared/tokens.js'

// Converts included_services array [{name, or_group}] into display strings.
// OR-paired services merge into "A / B"; singles stay as-is.
// Handles legacy string arrays for backwards compatibility.
function groupIncluded(included = []) {
  if (!included.length) return []
  if (typeof included[0] === 'string') return included
  const groups = {}
  const singles = []
  included.forEach(item => {
    if (item.or_group != null) {
      ;(groups[item.or_group] = groups[item.or_group] || []).push(item.name)
    } else {
      singles.push(item.name)
    }
  })
  return [...Object.values(groups).map(names => names.join(' / ')), ...singles]
}

// ── Upsell Modal — two-phase: suggest add-ons → optionally upgrade to package ──
function UpsellModal({ cart, svcs, settings, extras, setExtras, findRuleForCart, onConfirm, onClose }) {
  const initRule = findRuleForCart(cart)
  const [phase, setPhase] = useState(!initRule || initRule.outcome === 'suggest_popup' ? 'suggest' : 'package')
  const [workCart, setWorkCart] = useState(cart)
  const [pkgRule, setPkgRule] = useState(initRule?.outcome === 'package' ? initRule : null)

  if (!initRule) { onConfirm(cart, null); return null }

  const allowedIds = settings.suggestServices?.length ? settings.suggestServices : null
  const addonSvcs = svcs.filter(s => s.cat !== 'Package' && (!allowedIds || allowedIds.includes(s.id)))

  // Items in the cart that are NOT among the suggested/addon services
  const baseCart = cart.filter(id => {
    const s = svcs.find(x => x.id === id)
    if (!s || s.cat === 'Package') return true
    if (allowedIds && !allowedIds.includes(id)) return true
    return false
  })

  const CAT_HEADERS = { Haircut: '✂ Haircut', Beard: '🪒 Beard', Treatment: '✨ Treatments', HairColor: '🎨 Hair Color' }
  const catsPresent = [...new Set(addonSvcs.map(s => s.cat))].filter(c => CAT_HEADERS[c])

  const toggleExtra = id => setExtras(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id])

  const handleSuggestProceed = () => {
    const merged = [...new Set([...baseCart, ...extras])]
    const nu = findRuleForCart(merged)
    if (nu?.outcome === 'package') { setWorkCart(merged); setPkgRule(nu); setPhase('package') }
    else onConfirm(merged, null)
  }

  // ── PHASE 1: suggest add-ons ──────────────────────────────────────────────
  if (phase === 'suggest') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, right: 'clamp(230px,26vw,290px)', background: 'rgba(0,0,0,0.65)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,3vw,32px)' }} onClick={onClose}>
        <div className="si" style={{ background: C.white, borderRadius: 20, width: '100%', maxWidth: 'clamp(400px,72vw,700px)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ background: C.topBg, padding: 'clamp(14px,1.8vw,20px) clamp(20px,2.6vw,28px)', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 'clamp(17px,2.2vw,24px)', color: C.topText }}>💡 {settings.upsellHeading || 'Complete the Look'}</div>
            <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: '#aaa', marginTop: 4 }}>{settings.upsellHeadingId || 'Lengkapi penampilan Anda'}</div>
          </div>

          {/* Scrollable service grid */}
          <div className="scroll-y" style={{ flex: 1, padding: 'clamp(14px,2vw,22px) clamp(16px,2.4vw,26px)' }}>
            {catsPresent.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: C.muted, fontSize: 13 }}>No add-on services configured for this popup.</div>
            )}
            {catsPresent.map(cat => {
              const catSvcs = addonSvcs.filter(s => s.cat === cat)
              return (
                <div key={cat} style={{ marginBottom: 'clamp(14px,1.8vw,20px)' }}>
                  <div style={{ fontSize: 'clamp(10px,1.2vw,12px)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginBottom: 'clamp(8px,1.2vw,12px)' }}>
                    {CAT_HEADERS[cat] || cat}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(140px,18vw,200px),1fr))', gap: 'clamp(8px,1.2vw,12px)' }}>
                    {catSvcs.map(s => {
                      const sel = extras.includes(s.id)
                      if (s.img) {
                        return (
                          <div key={s.id} onClick={() => toggleExtra(s.id)}
                            style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', minHeight: 'clamp(100px,12vw,130px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                            {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, background: C.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: C.accentText, zIndex: 4 }}>✓</div>}
                            <img src={s.img} alt={s.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                            <div style={{ position: 'absolute', inset: 0, background: sel ? 'rgba(245,226,0,0.3)' : 'linear-gradient(to top,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.25) 55%,rgba(0,0,0,0.05) 100%)' }} />
                            {sel && <div style={{ position: 'absolute', inset: 0, border: `3px solid ${C.accent}`, borderRadius: 14, zIndex: 2 }} />}
                            <div style={{ position: 'relative', zIndex: 3, padding: 'clamp(8px,1.2vw,12px)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div>
                                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(12px,1.5vw,14px)', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{s.name}</div>
                                  {s.nameId && <div style={{ fontSize: 'clamp(9px,1.1vw,11px)', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{s.nameId}</div>}
                                </div>
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(12px,1.5vw,14px)', fontWeight: 800, color: sel ? C.accent : '#fff', flexShrink: 0 }}>{fmt(s.price)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div key={s.id} onClick={() => toggleExtra(s.id)}
                          style={{ position: 'relative', background: sel ? C.accent : C.white, border: `1.5px solid ${sel ? C.accent : C.border}`, borderRadius: 14, padding: 'clamp(12px,1.6vw,16px)', cursor: 'pointer', minHeight: 'clamp(80px,10vh,100px)', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, background: C.accentText, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: C.accent }}>✓</div>}
                          <div style={{ paddingRight: sel ? 28 : 0 }}>
                            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(12px,1.5vw,14px)', fontWeight: 700, color: sel ? C.accentText : C.text }}>{s.name}</div>
                            {s.nameId && <div style={{ fontSize: 'clamp(10px,1.2vw,11px)', color: sel ? 'rgba(17,17,16,0.55)' : C.muted, marginTop: 2 }}>{s.nameId}</div>}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <span style={{ fontSize: 'clamp(10px,1.2vw,11px)', color: sel ? 'rgba(17,17,16,0.45)' : C.muted }}>⏱ {s.dur} min</span>
                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(12px,1.5vw,14px)', fontWeight: 800, color: sel ? C.accentText : C.text }}>{fmt(s.price)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: 'clamp(12px,1.6vw,18px) clamp(16px,2.4vw,26px)', borderTop: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {extras.length > 0
              ? <button className="btnP" onClick={handleSuggestProceed}>Add {extras.length} service{extras.length > 1 ? 's' : ''} & continue →</button>
              : <button className="btnP" onClick={() => onConfirm(baseCart, null)}>Continue with selection →</button>
            }
            <button className="btnG" onClick={() => onConfirm(baseCart, null)} style={{ width: '100%', fontSize: 'clamp(12px,1.4vw,14px)' }}>Skip · Lewati</button>
          </div>
        </div>
      </div>
    )
  }

  // ── PHASE 2: package upgrade ──────────────────────────────────────────────
  const pkg = pkgRule ? svcs.find(s => s.id === pkgRule.pkgId) : null
  if (!pkg) { onConfirm(workCart, null); return null }

  const cartTotal = workCart.reduce((sum, id) => sum + (svcs.find(s => s.id === id)?.price || 0), 0)
  const extraCost = pkg.price - cartTotal
  const pkgSave = cartTotal - pkg.price

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,3vw,32px)' }} onClick={onClose}>
      <div className="si" style={{ background: C.white, borderRadius: 20, width: '100%', maxWidth: 'clamp(360px,52vw,520px)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Hero */}
        <div style={{ padding: 'clamp(22px,2.8vw,34px) clamp(20px,2.6vw,28px)', background: C.topBg, position: 'relative' }}>
          {pkg.badge && (
            <div style={{ display: 'inline-block', background: C.accent, color: C.accentText, fontSize: 'clamp(9px,1.1vw,11px)', fontWeight: 800, padding: '3px 9px', borderRadius: 5, marginBottom: 10 }}>{pkg.badge}</div>
          )}
          <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
            {pkg.name}{pkg.nameId ? ` · ${pkg.nameId}` : ''}
          </div>
          {pkgSave > 0
            ? <>
              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 'clamp(26px,3.4vw,38px)', color: C.accent, lineHeight: 1.1 }}>Save {fmt(pkgSave)}</div>
              <div style={{ fontSize: 'clamp(10px,1.2vw,12px)', color: 'rgba(255,255,255,0.4)', marginTop: 5 }}>vs buying individually · vs beli satuan</div>
            </>
            : <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 'clamp(22px,2.8vw,32px)', color: C.white, lineHeight: 1.1 }}>Upgrade to Package</div>
          }
        </div>

        {/* What's included chips */}
        <div style={{ padding: 'clamp(10px,1.4vw,14px) clamp(18px,2.4vw,24px)', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 'clamp(9px,1.1vw,10px)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginBottom: 'clamp(6px,0.9vw,8px)' }}>
            What's included · Yang termasuk
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(5px,0.7vw,7px)' }}>
            {workCart.map(id => {
              const svc = svcs.find(s => s.id === id)
              if (!svc) return null
              return (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px clamp(8px,1.1vw,10px)', borderRadius: 999, fontSize: 'clamp(11px,1.3vw,12px)', fontWeight: 600, background: C.surface, color: C.muted, border: `1px solid ${C.border}` }}>
                  ✓ {svc.name}
                </span>
              )
            })}
            {(pkg.included?.length > 0 ? groupIncluded(pkg.included) : pkg.desc.split('  ·  ')).map((d, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px clamp(8px,1.1vw,10px)', borderRadius: 999, fontSize: 'clamp(11px,1.3vw,12px)', fontWeight: 600, background: C.accent, color: C.accentText, border: `1px solid ${C.accent}` }}>
                + {d}
              </span>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ padding: 'clamp(14px,1.8vw,20px) clamp(18px,2.4vw,24px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btnP" onClick={() => onConfirm(workCart, pkg.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span>{settings.upsellSwitchCta ? `${settings.upsellSwitchCta} ` : 'Switch to '}{pkg.name} · {fmt(pkg.price)}</span>
            <span style={{ fontSize: 'clamp(10px,1.2vw,12px)', fontWeight: 500, opacity: 0.75 }}>
              {cartTotal >= pkg.price
                ? `−${fmt(pkgSave)} less than your current total`
                : extraCost === 0 ? 'Same as your current total' : `+${fmt(extraCost)} added to your total`
              }
            </span>
          </button>
          <button className="btnG" onClick={() => onConfirm(workCart, null)} style={{ width: '100%', fontSize: 'clamp(12px,1.4vw,14px)' }}>
            {settings.upsellKeepCta || 'Keep My Selection · Pertahankan pilihan'}
          </button>
        </div>
      </div>
    </div>
  )
}

const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID')

const PACKAGE_GRID = { display: 'flex', flexDirection: 'column', gap: 'clamp(12px,1.8vw,18px)' }

const CATS = [
  { key: 'Haircut', labelEn: 'Haircut', icon: '✂' },
  { key: 'Beard', labelEn: 'Beard', icon: '🪒' },
  { key: 'Treatment', labelEn: 'Treatment', icon: '✨' },
  { key: 'HairColor', labelEn: 'Hair Color', icon: '🎨' },
  { key: 'Package', labelEn: 'Package', icon: '📦' },
]

const normCat = (cat) => {
  const m = { haircut: 'Haircut', beard: 'Beard', treatment: 'Treatment', hair_color: 'HairColor', package: 'Package' }
  return m[cat?.toLowerCase?.()] || cat || 'Haircut'
}

// ── Bleach Modal ───────────────────────────────────────────────────────────────
function BleachModal({ onConfirm, onClose }) {
  const [step, setStep] = useState(1)
  const [addColor, setAddColor] = useState(false)

  const STEPS = [
    { n: 1, dur: 90, base: 260000, withColor: 500000, tagline: 'Subtle lift', desc: 'Lightens 1–2 levels. Best for dark brown → warm brown or auburn.', result: 'Dark → Brown', resultColor: '#8B4513' },
    { n: 2, dur: 120, base: 415000, withColor: 650000, tagline: 'Full lightening', desc: 'Lightens 3–4 levels. Takes black hair to golden blonde. Required for most fashion colours.', result: 'Brown → Blonde', resultColor: '#D4A017' },
    { n: 3, dur: 150, base: 525000, withColor: 750000, tagline: 'Maximum lift', desc: 'Near-platinum result. Required for pastels, silver, white, and vivid colours.', result: 'Blonde → Platinum', resultColor: '#F5EEC8' },
  ]
  const chosen = STEPS.find(s => s.n === step)
  const price = addColor ? chosen.withColor : chosen.base

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(12px,2.4vw,28px)' }} onClick={onClose}>
      <div className="si" style={{ background: C.white, borderRadius: 18, padding: 'clamp(20px,2.8vw,32px)', maxWidth: 'clamp(360px,56vw,560px)', width: '100%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'clamp(16px,2.2vw,22px)' }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(18px,2.4vw,24px)', fontWeight: 800, color: C.text }}>🎨 Hair Bleach</div>
            <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: C.muted, marginTop: 3 }}>Choose your bleach intensity · Pilih intensitas bleaching</div>
          </div>
          <button onClick={onClose} style={{ background: C.surface2, border: 'none', borderRadius: 8, width: 36, height: 36, fontSize: 20, cursor: 'pointer', color: C.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>×</button>
        </div>

        {/* Gradient bar */}
        <div style={{ marginBottom: 'clamp(16px,2.2vw,22px)' }}>
          <div style={{ fontSize: 'clamp(10px,1.2vw,12px)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>Expected result</div>
          <div style={{ position: 'relative', height: 28, borderRadius: 999, background: 'linear-gradient(to right, #111110, #3B1F0A, #6B3A1F, #9B5E2A, #C8892E, #DDB84A, #E8D070, #F2E8A8, #F8F3D8)', marginBottom: 28, border: `1px solid ${C.border}` }}>
            {[{ pct: 28, s: 1 }, { pct: 55, s: 2 }, { pct: 76, s: 3 }].map(({ pct, s }) => (
              <div key={s} style={{ position: 'absolute', top: 0, left: `${pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 2, height: 28, background: 'rgba(255,255,255,0.5)' }} />
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  {step === s && <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.topBg, border: `2px solid ${C.white}`, boxShadow: '0 0 0 2px ' + C.topBg }} />}
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(9px,1.1vw,10px)', fontWeight: step === s ? 700 : 400, color: step === s ? C.text : C.muted, whiteSpace: 'nowrap' }}>{s} Step{s > 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'clamp(10px,1.1vw,11px)', color: C.muted }}>← Black</span>
            <span style={{ fontSize: 'clamp(10px,1.1vw,11px)', color: C.muted }}>Platinum →</span>
          </div>
        </div>

        {/* Step selector */}
        <div style={{ marginBottom: 'clamp(16px,2.2vw,22px)' }}>
          <div style={{ fontSize: 'clamp(10px,1.2vw,12px)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 'clamp(8px,1.2vw,12px)' }}>Select steps</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'clamp(8px,1.2vw,10px)' }}>
            {STEPS.map(s => (
              <button key={s.n} onClick={() => setStep(s.n)} style={{ padding: 'clamp(12px,1.8vh,18px) clamp(8px,1vw,12px)', borderRadius: 12, border: `2px solid ${step === s.n ? C.topBg : C.border}`, background: step === s.n ? C.topBg : C.white, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(24px,3.8vw,34px)', fontWeight: 800, color: step === s.n ? C.white : C.text, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 'clamp(10px,1.2vw,12px)', fontWeight: 700, color: step === s.n ? '#ddd' : C.text2, marginTop: 4 }}>{s.tagline}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.resultColor, border: `1px solid ${step === s.n ? 'rgba(255,255,255,0.2)' : C.border}`, flexShrink: 0 }} />
                  <div style={{ fontSize: 'clamp(9px,1.1vw,11px)', color: step === s.n ? '#bbb' : C.muted, whiteSpace: 'nowrap' }}>{s.result}</div>
                </div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(12px,1.5vw,14px)', fontWeight: 700, color: step === s.n ? C.accent : C.text2, marginTop: 8 }}>{fmt(addColor ? s.withColor : s.base)}</div>
                <div style={{ fontSize: 'clamp(9px,1.1vw,10px)', color: step === s.n ? '#666' : C.muted, marginTop: 2 }}>⏱ {s.dur} min</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: C.surface, borderRadius: 10, padding: 'clamp(10px,1.4vw,14px) clamp(12px,1.6vw,16px)', marginBottom: 'clamp(14px,2vw,20px)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: chosen.resultColor, border: `1.5px solid ${C.border}`, flexShrink: 0, marginTop: 3 }} />
          <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: C.text2, lineHeight: 1.6 }}>{chosen.desc}</div>
        </div>

        <div onClick={() => setAddColor(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: addColor ? C.topBg : C.surface, borderRadius: 12, padding: 'clamp(12px,1.6vw,16px) clamp(14px,1.8vw,18px)', cursor: 'pointer', marginBottom: 'clamp(14px,2vw,20px)', border: `2px solid ${addColor ? C.topBg : C.border}`, transition: 'all 0.18s' }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(14px,1.8vw,17px)', fontWeight: 700, color: addColor ? C.white : C.text }}>+ Add Color</div>
            <div style={{ fontSize: 'clamp(11px,1.3vw,12px)', color: addColor ? '#aaa' : C.muted, marginTop: 2 }}>Apply a colour after bleaching · +{fmt(chosen.withColor - chosen.base)}</div>
          </div>
          <div style={{ width: 44, height: 25, borderRadius: 999, background: addColor ? C.accent : '#ccc', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', width: 19, height: 19, borderRadius: '50%', background: C.white, top: 3, left: addColor ? 22 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
        </div>

        <button className="btnP" onClick={() => onConfirm({ step, addColor, price, dur: chosen.dur, label: `Hair Bleach ${chosen.n} Step${addColor ? ' + Color' : ''}` })}>
          Add to Cart — {fmt(price)}
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ServiceSelection({ services, cart, setCart, ownColorToggles = {}, setOwnColorToggles, settings = {}, onNext, onBack }) {
  const [showBleachModal, setShowBleachModal] = useState(false)
  const [bleachConfig, setBleachConfig] = useState(null)
  const [upsellRule, setUpsellRule] = useState(null)
  const [upsellExtras, setUpsellExtras] = useState([])
  const catRefs = useRef({})

  const normSvc = (s) => ({
    ...s,
    cat: normCat(s.category || s.cat),
    dur: s.duration_minutes || s.dur || 30,
    img: s.image_url || s.img || null,
    price: parseFloat(s.price ?? s.base_price ?? 0),
    nameId: s.name_id || s.nameId || '',
    desc: s.description || s.desc || '',
    included: s.included_services || [],
    includedImages: s.included_images || [],
  })

  const svcs = services.map(normSvc)

  const isBleach = (s) => s.name?.toLowerCase().includes('bleach')
  const BLEACH_ID = svcs.find(isBleach)?.id

  const orderedCats = CATS.filter(c => svcs.some(s => s.cat === c.key))
  const getByCategory = (catKey) => svcs.filter(s => s.cat === catKey)

  const effPrice = (s) => s.id === BLEACH_ID ? (bleachConfig?.price ?? s.price) : s.price
  const effDur = (s) => s.id === BLEACH_ID ? (bleachConfig?.dur ?? s.dur) : s.dur
  const effName = (s) => s.id === BLEACH_ID && bleachConfig ? bleachConfig.label : s.name

  const allowedIds = settings.suggestServices?.length ? settings.suggestServices : null
  const displayCart = upsellRule
    ? [...cart.filter(id => {
      const s = svcs.find(x => x.id === id)
      if (!s || s.cat === 'Package') return true
      if (allowedIds && !allowedIds.includes(id)) return true
      return false
    }), ...upsellExtras]
    : cart

  const total = displayCart.reduce((sum, id) => { const s = svcs.find(x => x.id === id); return sum + (s ? effPrice(s) : 0) }, 0)
  const dur = displayCart.reduce((sum, id) => { const s = svcs.find(x => x.id === id); return sum + (s ? effDur(s) : 0) }, 0)

  // Evaluate upsell rules against any given cart array
  const findRuleForCart = (cartArr) => {
    if (!settings.upsellEnabled || !settings.upsellRules?.length) return null
    for (const rule of settings.upsellRules) {
      if (rule.active === false) continue
      const cartCats = cartArr.map(id => svcs.find(s => s.id === id)?.cat).filter(Boolean)
      const mustOk = !rule.mustContain?.length || rule.mustContain.every(c =>
        c.type === 'cat' ? cartCats.includes(c.cat) : cartArr.includes(c.id)
      )
      const mustNotOk = !rule.mustNotContain?.length || !rule.mustNotContain.some(c =>
        c.type === 'cat' ? cartCats.includes(c.cat) : cartArr.includes(c.id)
      )
      if (mustOk && mustNotOk) return rule
    }
    return null
  }

  const handleContinue = () => {
    if (cart.length === 0) return

    // If modal is already open, sidebar "Continue" confirms it
    if (upsellRule) {
      const merged = [...new Set([...cart.filter(id => {
        const s = svcs.find(x => x.id === id)
        if (!s || s.cat === 'Package') return true
        if (allowedIds && !allowedIds.includes(id)) return true
        return false
      }), ...upsellExtras])]
      handleUpsellConfirm(merged, null)
      return
    }

    const rule = findRuleForCart(cart)
    if (rule) {
      setUpsellRule(rule)
      // Pre-populate extras with items already in cart that are suggested services
      const inCartExtras = cart.filter(id => {
        const s = svcs.find(x => x.id === id)
        if (!s || s.cat === 'Package') return false
        if (allowedIds) return allowedIds.includes(id)
        return true
      })
      setUpsellExtras(inCartExtras)
      return
    }
    onNext()
  }

  const handleUpsellConfirm = (finalCart, pkgId) => {
    if (pkgId) setCart([pkgId])
    else setCart(finalCart)
    setUpsellRule(null)
    setUpsellExtras([])
    onNext()
  }

  const toggle = (id) => {
    // If upsell modal is open and we toggle a suggested service, sync with upsellExtras
    if (upsellRule) {
      const s = svcs.find(x => x.id === id)
      const isSuggested = s && s.cat !== 'Package' && (!allowedIds || allowedIds.includes(id))
      if (isSuggested) {
        setUpsellExtras(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
      }
    }

    if (id === BLEACH_ID) {
      if (cart.includes(id)) { setCart(c => c.filter(x => x !== id)); setBleachConfig(null) }
      else setShowBleachModal(true)
      return
    }
    const svc = svcs.find(x => x.id === id)
    if (!svc) return
    if (cart.includes(id)) { setCart(c => c.filter(x => x !== id)); return }
    if (svc.cat === 'Haircut' || svc.cat === 'Package') {
      setCart(c => [...c.filter(x => svcs.find(s => s.id === x)?.cat !== svc.cat), id])
    } else if (svc.mutex_group) {
      setCart(c => [...c.filter(x => svcs.find(s => s.id === x)?.mutex_group !== svc.mutex_group), id])
    } else {
      setCart(c => [...c, id])
    }
  }

  // ── Package card (dark, full-width) ────────────────────────────────────────
  const renderPackageCard = (s, i, ci) => {
    const sel = cart.includes(s.id)
    return (
      <div key={s.id} onClick={() => toggle(s.id)} style={{ cursor: 'pointer', borderRadius: 14, overflow: 'hidden', border: `${sel ? 3 : 1.5}px solid ${sel ? C.accent : 'rgba(255,255,255,0.08)'}`, animation: `fadeUp 0.3s ease ${ci * 0.05 + i * 0.03}s both`, position: 'relative', background: C.topBg, display: 'flex', minHeight: 'clamp(120px,15vw,145px)' }}>

        {/* Left — treatment image mosaic or fallback */}
        <div style={{ width: '28%', flexShrink: 0, display: 'flex', position: 'relative', overflow: 'hidden', borderRight: '1px solid rgba(0,0,0,0.2)', background: '#222' }}>
          {s.includedImages?.length > 0 ? (
            s.includedImages.slice(0, 3).map((img, ti) => (
              <div key={ti} style={{ flex: 1, overflow: 'hidden', borderRight: ti < Math.min(s.includedImages.length, 3) - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none' }}>
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
              <span style={{ fontSize: 32 }}>📦</span>
            </div>
          )}
          {/* Gradient blend into right panel */}
          <div style={{ position: 'absolute', inset: 0, background: sel ? 'rgba(245,226,0,0.12)' : 'linear-gradient(to right, transparent 60%, rgba(17,17,16,0.7) 100%)' }} />
        </div>

        <div style={{ flex: 1, padding: 'clamp(10px, 1.4vw, 16px) clamp(12px, 1.6vw, 20px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ flex: 1 }}>
            {s.badge && <div style={{ display: 'inline-block', background: C.accent, color: C.accentText, fontSize: 'clamp(8px,0.9vw,10px)', fontWeight: 800, padding: '3px 9px', borderRadius: 4, marginBottom: 'clamp(6px,0.8vw,10px)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.badge}</div>}
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(15px,2vw,22px)', fontWeight: 800, color: sel ? C.accent : C.white, lineHeight: 1.1 }}>{s.name}</div>
            {s.nameId && <div style={{ fontSize: 'clamp(10px,1.2vw,13px)', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{s.nameId}</div>}
            {(s.included?.length > 0 || s.desc) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(4px,0.5vw,6px)', marginTop: 'clamp(8px,1.1vw,12px)' }}>
                {(s.included?.length > 0 ? groupIncluded(s.included) : s.desc.split('  ·  ')).slice(0, 6).map((d, di) => (
                  <span key={di} style={{ fontSize: 'clamp(10px,1.2vw,12px)', fontWeight: 600, background: sel ? 'rgba(245,226,0,0.12)' : 'rgba(245,226,0,0.09)', color: sel ? C.accent : 'rgba(255,255,255,0.82)', padding: '4px 10px', borderRadius: 5, border: `1px solid ${sel ? 'rgba(245,226,0,0.28)' : 'rgba(255,255,255,0.13)'}` }}>{d}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginTop: 'clamp(6px,0.8vw,10px)' }}>
            <span style={{ fontSize: 'clamp(10px,1.2vw,12px)', color: 'rgba(255,255,255,0.4)' }}>⏱ {s.dur} min</span>
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(16px,2.1vw,23px)', fontWeight: 800, color: sel ? C.accent : C.white }}>{fmt(effPrice(s))}</span>
          </div>
        </div>
        {sel && <div style={{ position: 'absolute', top: 8, right: 10, width: 22, height: 22, background: C.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: C.accentText, zIndex: 5 }}>✓</div>}
        {sel && <div style={{ position: 'absolute', inset: 0, border: `3px solid ${C.accent}`, borderRadius: 14, pointerEvents: 'none' }} />}
      </div>
    )
  }

  // ── Image card (photo background) ─────────────────────────────────────────
  const renderImageCard = (s, i, ci) => {
    const sel = cart.includes(s.id)
    return (
      <div key={s.id} onClick={() => toggle(s.id)} style={{ cursor: 'pointer', borderRadius: 14, overflow: 'hidden', position: 'relative', height: 'clamp(140px,18vw,190px)', animation: `fadeUp 0.3s ease ${ci * 0.05 + i * 0.03}s both`, border: `${sel ? 3 : 1.5}px solid ${sel ? C.accent : 'transparent'}` }}>
        <img src={s.img} alt={s.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: sel ? 'rgba(245,226,0,0.22)' : 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 'clamp(10px,1.4vw,14px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, paddingRight: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 'clamp(12px,1.5vw,15px)', lineHeight: 1.2, color: '#fff' }}>{effName(s)}</div>
              <div style={{ fontSize: 'clamp(10px,1.1vw,11px)', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>⏱ {effDur(s)} min</div>
              {s.id === BLEACH_ID && (
                <div style={{ marginTop: 6, background: sel ? C.accent : 'rgba(255,255,255,0.2)', color: sel ? C.accentText : '#fff', padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, display: 'inline-block' }}>
                  {sel ? '✏ Edit' : 'Configure →'}
                </div>
              )}
            </div>
            <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 'clamp(13px,1.6vw,17px)', color: sel ? C.accent : '#fff', flexShrink: 0 }}>{fmt(effPrice(s))}</span>
          </div>
        </div>
        {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, background: C.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: C.accentText, zIndex: 5 }}>✓</div>}
      </div>
    )
  }

  // ── Text card (simple) ─────────────────────────────────────────────────────
  const renderTextCard = (s, i, ci) => {
    const sel = cart.includes(s.id)
    return (
      <div key={s.id} onClick={() => toggle(s.id)} className={`card ${sel ? 'sel' : ''}`}
        style={{ padding: 'clamp(14px,1.8vw,18px)', border: `1.5px solid ${sel ? C.accent : C.border}`, background: sel ? C.accent : '#fff', cursor: 'pointer', borderRadius: 14, animation: `fadeUp 0.3s ease ${ci * 0.05 + i * 0.03}s both`, position: 'relative' }}>
        <div style={{ fontWeight: 700, fontSize: 'clamp(14px,1.8vw,17px)', color: sel ? C.accentText : C.text, paddingRight: 24 }}>{effName(s)}</div>
        {s.nameId && <div style={{ fontSize: 'clamp(10px,1.2vw,12px)', color: sel ? 'rgba(0,0,0,0.45)' : C.muted, marginTop: 2 }}>{s.nameId}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 'clamp(11px,1.3vw,12px)', color: sel ? 'rgba(0,0,0,0.5)' : C.muted }}>⏱ {effDur(s)} min</span>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(14px,1.8vw,18px)', fontWeight: 700, color: sel ? C.accentText : C.text }}>{fmt(effPrice(s))}</span>
        </div>
        {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, background: C.accentText, borderRadius: '50%', color: C.accent, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>✓</div>}
      </div>
    )
  }

  return (
    <>
      {showBleachModal && (
        <BleachModal
          onClose={() => setShowBleachModal(false)}
          onConfirm={cfg => { setBleachConfig(cfg); setCart(c => [...c.filter(x => x !== BLEACH_ID), BLEACH_ID]); setShowBleachModal(false) }}
        />
      )}
      {upsellRule && (
        <UpsellModal
          cart={cart}
          svcs={svcs}
          settings={settings}
          extras={upsellExtras}
          setExtras={setUpsellExtras}
          findRuleForCart={findRuleForCart}
          onConfirm={handleUpsellConfirm}
          onClose={() => { setUpsellRule(null); setUpsellExtras([]) }}
        />
      )}

      <div style={{ height: 'calc(100vh - clamp(51px,6.5vh,63px))', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── Main content ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header + category pills */}
            <div style={{ padding: 'clamp(16px,2.4vw,24px) clamp(16px,2.4vw,24px) 0', flexShrink: 0 }}>
              <div className="step-header">
                <div className="step-eyebrow">Step 1 of 4</div>
                <h2 className="step-title" style={{ fontSize: 'clamp(22px,3vw,32px)' }}>Choose Your Services</h2>
              </div>
              <div style={{ display: 'flex', gap: 'clamp(6px,0.8vw,10px)', flexWrap: 'wrap', margin: '14px 0', paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                {orderedCats.map(c => (
                  <button key={c.key} onClick={() => catRefs.current[c.key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="pill"
                    style={{ background: cart.some(id => svcs.find(s => s.id === id)?.cat === c.key) ? C.topBg : '#fff', color: cart.some(id => svcs.find(s => s.id === id)?.cat === c.key) ? '#fff' : C.text2, border: `1.5px solid ${cart.some(id => svcs.find(s => s.id === id)?.cat === c.key) ? C.topBg : C.border}` }}>
                    {c.icon} {c.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable service sections */}
            <div className="scroll-y" style={{ flex: 1, padding: '0 clamp(16px,2.4vw,24px) clamp(16px,2.4vw,24px)' }}>
              {orderedCats.map((cat, ci) => {
                const catSvcs = getByCategory(cat.key)
                if (!catSvcs.length) return null
                return (
                  <div key={cat.key} ref={el => catRefs.current[cat.key] = el} style={{ marginBottom: 'clamp(20px,2.8vw,32px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'clamp(10px,1.4vw,16px)' }}>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(14px,1.8vw,18px)', fontWeight: 700, color: C.text }}>{cat.icon} {cat.labelEn}</div>
                      <div style={{ flex: 1, height: 1, background: C.border }} />
                    </div>
                    <div className={cat.key !== 'Package' ? 'card-grid-fluid' : undefined} style={cat.key === 'Package' ? PACKAGE_GRID : undefined}>
                      {catSvcs.map((s, i) => {
                        if (s.cat === 'Package') return renderPackageCard(s, i, ci)
                        if (s.img) return renderImageCard(s, i, ci)
                        return renderTextCard(s, i, ci)
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Sidebar cart ── */}
          <div style={{ width: 'clamp(230px,26vw,290px)', borderLeft: `1px solid ${C.border}`, padding: 'clamp(14px,1.8vw,20px)', display: 'flex', flexDirection: 'column', background: C.bg, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14 }}>Your Selection</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {displayCart.length === 0
                ? <div style={{ textAlign: 'center', padding: 'clamp(28px,4vh,40px) 0', color: C.muted, opacity: 0.5, fontSize: 'clamp(12px,1.4vw,14px)' }}>No services selected</div>
                : displayCart.map(id => {
                  const s = svcs.find(x => x.id === id)
                  if (!s) return null
                  return (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{effName(s)}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmt(effPrice(s))}</div>
                      </div>
                      <button onClick={() => toggle(id)} style={{ background: 'none', border: 'none', color: '#ccc', fontSize: 22, padding: '0 6px', cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>×</button>
                    </div>
                  )
                })
              }
            </div>
            {displayCart.length > 0 && (
              <div style={{ borderTop: `2px solid ${C.topBg}`, padding: '14px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  <span>Est. Duration</span><span>{dur} min</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Inter',sans-serif", fontSize: 'clamp(16px,2.2vw,22px)', fontWeight: 800 }}>
                  <span>Total</span><span>{fmt(total)}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              <button className="btnP" style={{ width: '100%' }} disabled={displayCart.length === 0} onClick={handleContinue}>Continue →</button>
              <button className="btnG" style={{ width: '100%' }} onClick={onBack}>← Back</button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
