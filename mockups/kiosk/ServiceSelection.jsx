/**
 * MOCKUP — Bercut Kiosk: ServiceSelection
 */

import { useRef, useState } from "react";
import { C, CATEGORIES, fmt, SERVICES } from "./data.js";

// ── Bleach Configurator Modal ──────────────────────────────────────────────
function BleachModal({ onConfirm, onClose }) {
  const [step, setStep] = useState(1);
  const [addColor, setAddColor] = useState(false);

  const STEPS = [
    { n: 1, label: "1 Step", dur: 90, base: 260000, withColor: 500000, tagline: "Subtle lift", desc: "Lightens 1–2 levels. Best for dark brown → warm brown or auburn.", result: "Dark → Brown", resultColor: "#8B4513" },
    { n: 2, label: "2 Steps", dur: 120, base: 415000, withColor: 650000, tagline: "Full lightening", desc: "Lightens 3–4 levels. Takes black hair to golden blonde. Required for most fashion colours.", result: "Brown → Blonde", resultColor: "#D4A017" },
    { n: 3, label: "3 Steps", dur: 150, base: 525000, withColor: 750000, tagline: "Maximum lift", desc: "Near-platinum result. Required for pastels, silver, white, and vivid colours.", result: "Blonde → Platinum", resultColor: "#F5EEC8" },
  ];
  const chosen = STEPS.find(s => s.n === step);
  const price = addColor ? chosen.withColor : chosen.base;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(12px,2.4vw,28px)" }} onClick={onClose}>
      <div className="si" style={{ background: C.white, borderRadius: 18, padding: "clamp(20px,2.8vw,32px)", maxWidth: "clamp(360px,56vw,560px)", width: "100%", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "clamp(16px,2.2vw,22px)" }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 800, color: C.text }}>🎨 Hair Bleach</div>
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.muted, marginTop: 3 }}>Choose your bleach intensity · Pilih intensitas bleaching</div>
          </div>
          <button onClick={onClose} style={{ background: C.surface2, border: "none", borderRadius: 8, width: 36, height: 36, fontSize: 20, cursor: "pointer", color: C.text2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 12 }}>×</button>
        </div>

        <div style={{ marginBottom: "clamp(16px,2.2vw,22px)" }}>
          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Expected result</div>
          <div style={{ position: "relative", height: 28, borderRadius: 999, background: "linear-gradient(to right, #111110, #3B1F0A, #6B3A1F, #9B5E2A, #C8892E, #DDB84A, #E8D070, #F2E8A8, #F8F3D8)", marginBottom: 28, border: `1px solid ${C.border}` }}>
            {[ { pct: 28, s: 1 }, { pct: 55, s: 2 }, { pct: 76, s: 3 } ].map(({ pct, s }) => (
              <div key={s} style={{ position: "absolute", top: 0, left: `${pct}%`, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 2, height: 28, background: "rgba(255,255,255,0.5)" }} />
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  {step === s && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.topBg, border: `2px solid ${C.white}`, boxShadow: "0 0 0 2px " + C.topBg }} />}
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(9px,1.1vw,10px)", fontWeight: step === s ? 700 : 400, color: step === s ? C.text : C.muted, whiteSpace: "nowrap" }}>{s} Step{s > 1 ? "s" : ""}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "clamp(10px,1.1vw,11px)", color: C.muted }}>← Black</span>
            <span style={{ fontSize: "clamp(10px,1.1vw,11px)", color: C.muted }}>Platinum →</span>
          </div>
        </div>

        <div style={{ marginBottom: "clamp(16px,2.2vw,22px)" }}>
          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: "clamp(8px,1.2vw,12px)" }}>Select steps</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "clamp(8px,1.2vw,10px)" }}>
            {STEPS.map(s => (
              <button key={s.n} onClick={() => setStep(s.n)} style={{ padding: "clamp(12px,1.8vh,18px) clamp(8px,1vw,12px)", borderRadius: 12, border: `2px solid ${step === s.n ? C.topBg : C.border}`, background: step === s.n ? C.topBg : C.white, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(24px,3.8vw,34px)", fontWeight: 800, color: step === s.n ? C.white : C.text, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, color: step === s.n ? "#ddd" : C.text2, marginTop: 4 }}>{s.tagline}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.resultColor, border: `1px solid ${step === s.n ? "rgba(255,255,255,0.2)" : C.border}`, flexShrink: 0 }} />
                  <div style={{ fontSize: "clamp(9px,1.1vw,11px)", color: step === s.n ? "#bbb" : C.muted, whiteSpace: "nowrap" }}>{s.result}</div>
                </div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.5vw,14px)", fontWeight: 700, color: step === s.n ? C.accent : C.text2, marginTop: 8 }}>{fmt(addColor ? s.withColor : s.base)}</div>
                <div style={{ fontSize: "clamp(9px,1.1vw,10px)", color: step === s.n ? "#666" : C.muted, marginTop: 2 }}>⏱ {s.dur} min</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: C.surface, borderRadius: 10, padding: "clamp(10px,1.4vw,14px) clamp(12px,1.6vw,16px)", marginBottom: "clamp(14px,2vw,20px)", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: chosen.resultColor, border: `1.5px solid ${C.border}`, flexShrink: 0, marginTop: 3 }} />
          <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.text2, lineHeight: 1.6 }}>{chosen.desc}</div>
        </div>

        <div onClick={() => setAddColor(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: addColor ? C.topBg : C.surface, borderRadius: 12, padding: "clamp(12px,1.6vw,16px) clamp(14px,1.8vw,18px)", cursor: "pointer", marginBottom: "clamp(14px,2vw,20px)", border: `2px solid ${addColor ? C.topBg : C.border}`, transition: "all 0.18s" }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,17px)", fontWeight: 700, color: addColor ? C.white : C.text }}>+ Add Color</div>
            <div style={{ fontSize: "clamp(11px,1.3vw,12px)", color: addColor ? "#aaa" : C.muted, marginTop: 2 }}>Apply a colour after bleaching · +{fmt(chosen.withColor - chosen.base)}</div>
          </div>
          <div style={{ width: 44, height: 25, borderRadius: 999, background: addColor ? C.accent : "#ccc", position: "relative", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", width: 19, height: 19, borderRadius: "50%", background: C.white, top: 3, left: addColor ? 22 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </div>
        </div>

        <button className="btnP" onClick={() => onConfirm({ step, addColor, price, dur: chosen.dur, label: `Hair Bleach ${chosen.n} Step${addColor ? " + Color" : ""}` })}>Add to Cart — {fmt(price)}</button>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ServiceSelection({ cart, setCart, ownColorToggles, setOwnColorToggles, onNext, onBack }) {
  const [showBleachModal, setShowBleachModal] = useState(false);
  const [bleachConfig, setBleachConfig] = useState(null);
  const catRefs = useRef({});
  const BLEACH_ID = 21;

  const effPrice = (s) => (s.id === BLEACH_ID ? bleachConfig?.price ?? s.price : (s.ownColorPrice && ownColorToggles[s.id] ? s.ownColorPrice : s.price));
  const effDur = (s) => (s.id === BLEACH_ID ? bleachConfig?.dur ?? s.dur : s.dur);
  const effName = (s) => (s.id === BLEACH_ID && bleachConfig ? bleachConfig.label : (s.ownColorPrice && ownColorToggles[s.id] ? s.name + " (Own Color)" : s.name));
  
  const total = cart.reduce((sum, id) => { const s = SERVICES.find(x => x.id === id); return sum + (s ? effPrice(s) : 0); }, 0);
  const dur = cart.reduce((sum, id) => { const s = SERVICES.find(x => x.id === id); return sum + (s ? effDur(s) : 0); }, 0);

  const toggle = id => {
    if (id === BLEACH_ID) {
      if (cart.includes(id)) { setCart(c => c.filter(x => x !== id)); setBleachConfig(null); }
      else setShowBleachModal(true);
      return;
    }
    const svc = SERVICES.find(x => x.id === id);
    if (!svc) return;
    if (cart.includes(id)) { setCart(c => c.filter(x => x !== id)); return; }
    if (svc.cat === "Haircut" || svc.cat === "Package") {
      setCart(c => [...c.filter(x => SERVICES.find(s => s.id === x)?.cat !== svc.cat), id]);
    } else if (svc.mutex_group) {
      setCart(c => [...c.filter(x => SERVICES.find(s => s.id === x)?.mutex_group !== svc.mutex_group), id]);
    } else {
      setCart(c => [...c, id]);
    }
  };

  return (
    <>
      {showBleachModal && <BleachModal onClose={() => setShowBleachModal(false)} onConfirm={cfg => { setBleachConfig(cfg); setCart(c => [...c.filter(x => x !== BLEACH_ID), BLEACH_ID]); setShowBleachModal(false); }} />}
      
      <div style={{ height: "calc(100vh - clamp(51px,6.5vh,63px))", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "clamp(16px,2.4vw,28px) clamp(16px,2.4vw,28px) 0", flexShrink: 0 }}>
              <div className="step-header">
                <div className="step-eyebrow">Step 1 of 4</div>
                <h2 className="step-title" style={{ fontSize: "clamp(24px,3.5vw,34px)", fontWeight: 800 }}>Choose Your Services</h2>
              </div>
              <div style={{ display: "flex", gap: "clamp(6px,0.8vw,10px)", flexWrap: "wrap", margin: "18px 0", paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => catRefs.current[c.key]?.scrollIntoView({ behavior: "smooth" })} className="pill" 
                    style={{ background: cart.some(id => SERVICES.find(x => x.id === id)?.cat === c.key) ? C.topBg : "#fff", color: cart.some(id => SERVICES.find(x => x.id === id)?.cat === c.key) ? "#fff" : C.text2, border: `1.5px solid ${cart.some(id => SERVICES.find(x => x.id === id)?.cat === c.key) ? C.topBg : C.border}` }}>
                    {c.icon} {c.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="scroll-y" style={{ flex: 1, padding: "0 clamp(16px,2.4vw,28px) clamp(16px,2.4vw,28px)" }}>
              {CATEGORIES.map((cat, ci) => (
                <div key={cat.key} ref={el => catRefs.current[cat.key] = el} style={{ marginBottom: "clamp(14px,2vw,24px)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(15px,2vw,20px)", fontWeight: 700, color: C.text }}>{cat.icon} {cat.labelEn}</div>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                  </div>
                  <div className="card-grid-fluid">
                    {SERVICES.filter(s => s.cat === cat.key).map((s, i) => {
                      const sel = cart.includes(s.id);
                      if (s.cat === "Package") {
                        return (
                          <div key={s.id} onClick={() => toggle(s.id)} style={{ cursor: "pointer", borderRadius: 14, overflow: "hidden", border: `${sel ? 3 : 1.5}px solid ${sel ? C.accent : C.border}`, animation: `fadeUp 0.3s ease ${ci * 0.05 + i * 0.03}s both`, position: "relative", background: C.topBg, height: "100%", display: "flex", flexDirection: "column" }}>
                            <div style={{ height: "clamp(100px,13vw,135px)", position: "relative" }}>
                              <div style={{ position: "absolute", inset: 0, display: "flex" }}>{s.treatmentImgs?.map((img, ti) => <img key={ti} src={img} style={{ flex: 1, height: "100%", objectFit: "cover" }} />)}</div>
                              <div style={{ position: "absolute", inset: 0, background: sel ? "rgba(245,226,0,0.25)" : "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)" }} />
                              {s.badge && <div style={{ position: "absolute", top: 8, left: 10, background: C.accent, color: C.accentText, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, zIndex: 2 }}>{s.badge}</div>}
                              
                              <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "clamp(10px,1.4vw,14px)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", color: "#fff" }}>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: "clamp(13px,1.6vw,16px)", lineHeight: 1.2 }}>{s.name}</div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{s.dur} min</div>
                                  </div>
                                  <span style={{ fontWeight: 800, fontSize: "clamp(14px,1.8vw,18px)", color: sel ? C.accent : "#fff" }}>{fmt(effPrice(s))}</span>
                                </div>
                              </div>
                            </div>
                            {/* Dark footer area for labels — blends with card background to avoid white gap */}
                            <div style={{ padding: "clamp(8px,1vw,12px) clamp(10px,1.4vw,14px)", display: "flex", flexWrap: "wrap", gap: 4, background: C.topBg }}>
                              {s.desc?.split("  ·  ").map((d, di) => (
                                <span key={di} style={{ fontSize: 9, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", padding: "2px 6px", borderRadius: 4 }}>{d}</span>
                              ))}
                            </div>
                            
                            {sel && <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.accentText, zIndex: 5 }}>✓</div>}
                            {sel && <div style={{ position: "absolute", inset: 0, border: `3px solid ${C.accent}`, borderRadius: 14 }} />}
                          </div>
                        );
                      }
                      if (s.img) {
                        return (
                          <div key={s.id} onClick={() => toggle(s.id)} style={{ cursor: "pointer", borderRadius: 14, overflow: "hidden", position: "relative", height: "clamp(140px,18vw,190px)", animation: `fadeUp 0.3s ease ${ci * 0.05 + i * 0.03}s both` }}>
                            <img src={s.img} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", inset: 0, background: sel ? "rgba(245,226,0,0.25)" : "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)" }} />
                            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "clamp(10px,1.4vw,14px)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", color: "#fff" }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: "clamp(13px,1.6vw,16px)", lineHeight: 1.2 }}>{effName(s)}</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{effDur(s)} min</div>
                                    {s.cat === "Haircut" && <div style={{ fontSize: 9, color: "#fff", background: "rgba(255,255,255,0.2)", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>Optional Wash</div>}
                                  </div>
                                  {s.id === BLEACH_ID && <div style={{ marginTop: 6, background: sel ? C.accent : "rgba(255,255,255,0.2)", color: sel ? C.accentText : "#fff", padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, display: "inline-block" }}>{sel ? "✏ Edit" : "Configure →"}</div>}
                                </div>
                                <span style={{ fontWeight: 800, fontSize: "clamp(14px,1.8vw,18px)", color: sel ? C.accent : "#fff" }}>{fmt(effPrice(s))}</span>
                              </div>
                            </div>
                            {sel && <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.accentText, zIndex: 5 }}>✓</div>}
                            {sel && <div style={{ position: "absolute", inset: 0, border: `3px solid ${C.accent}`, borderRadius: 14 }} />}
                          </div>
                        );
                      }
                      return (
                        <div key={s.id} onClick={() => toggle(s.id)} className={`card ${sel ? "sel" : ""}`} style={{ padding: "clamp(14px,1.8vw,18px)", border: `1.5px solid ${sel ? C.accent : C.border}`, background: sel ? C.accent : "#fff", cursor: "pointer", borderRadius: 14, animation: `fadeUp 0.3s ease ${ci * 0.05 + i * 0.03}s both`, position: "relative" }}>
                          <div style={{ fontWeight: 700, fontSize: "clamp(14px,1.8vw,17px)", color: sel ? C.accentText : C.text, paddingRight: 24 }}>{effName(s)}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                            <span style={{ fontSize: "clamp(11px,1.3vw,12px)", color: sel ? "rgba(0,0,0,0.5)" : C.muted }}>⏱ {effDur(s)} min</span>
                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 700, color: sel ? C.accentText : C.text }}>{fmt(effPrice(s))}</span>
                          </div>
                          {s.ownColorPrice && (
                            <div onClick={e => { e.stopPropagation(); setOwnColorToggles(prev => ({ ...prev, [s.id]: !prev[s.id] })); }} style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", background: sel ? "rgba(255,255,255,0.15)" : C.surface, borderRadius: 8, padding: "6px 10px", border: `1px solid ${sel ? "rgba(255,255,255,0.3)" : C.border}` }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: sel ? C.accentText : C.text2 }}>Own Color (-{fmt(s.price - s.ownColorPrice)})</span>
                              <div style={{ width: 30, height: 16, background: ownColorToggles[s.id] ? (sel ? C.accentText : C.topBg) : (sel ? "rgba(0,0,0,0.2)" : "#ccc"), borderRadius: 99, position: "relative" }}><div style={{ position: "absolute", width: 12, height: 12, background: "#fff", borderRadius: "50%", top: 2, left: ownColorToggles[s.id] ? 16 : 2 }} /></div>
                            </div>
                          )}
                          {sel && <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, background: C.accentText, borderRadius: "50%", color: C.accent, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>✓</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: "clamp(240px,28vw,300px)", borderLeft: `1px solid ${C.border}`, padding: "clamp(14px,2vw,22px)", display: "flex", flexDirection: "column", background: C.bg }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>Your Selection</div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {cart.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, opacity: 0.5 }}>No services selected</div> : cart.map(id => {
                const s = SERVICES.find(x => x.id === id);
                return (
                  <div key={id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{effName(s)}</div><div style={{ fontSize: 11, color: C.muted }}>{fmt(effPrice(s))}</div></div>
                    <button onClick={() => toggle(id)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 24, padding: "0 8px", cursor: "pointer" }}>×</button>
                  </div>
                );
              })}
            </div>
            {cart.length > 0 && <div style={{ borderTop: `2px solid ${C.topBg}`, padding: "16px 0" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 4 }}><span>Est. Duration</span><span>{dur} min</span></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 800 }}><span>Total</span><span>{fmt(total)}</span></div></div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}><button className="btnP" style={{ width: "100%" }} disabled={cart.length === 0} onClick={onNext}>Continue →</button><button className="btnG" style={{ width: "100%" }} onClick={onBack}>← Back</button></div>
          </div>
        </div>
      </div>
    </>
  );
}
