/**
 * MOCKUP — Bercut Kiosk: ServiceSelection
 *
 * What it does: Step 1 — lets the customer browse and select one or more services across all categories, with wash/own-colour toggles and a bleach configurator modal.
 * State managed: cart, setCart, washToggles, setWashToggles, ownColorToggles, setOwnColorToggles, onNext, onBack
 * Production API: GET /api/services (replaces SERVICES constant)
 * Feeds into: BarberSelection (step 2)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/screens/ServiceSelection.jsx
 * Reference prompt: _ai/prompting-guide.md Section 03
 */

import { useRef, useState } from "react";
import { C, CATEGORIES, fmt, SERVICES } from "./data.js";

// ── Bleach Configurator Modal (only used within ServiceSelection) ──────────────
function BleachModal({ onConfirm, onClose }) {
  const [step, setStep] = useState(1);
  const [addColor, setAddColor] = useState(false);

  const STEPS = [
    {
      n: 1, label: "1 Step", dur: 90, base: 260000, withColor: 500000,
      tagline: "Subtle lift",
      desc: "Lightens 1–2 levels. Best for dark brown → warm brown or auburn.",
      result: "Dark → Brown",
      resultColor: "#8B4513",
    },
    {
      n: 2, label: "2 Steps", dur: 120, base: 415000, withColor: 650000,
      tagline: "Full lightening",
      desc: "Lightens 3–4 levels. Takes black hair to golden blonde. Required for most fashion colours.",
      result: "Brown → Blonde",
      resultColor: "#D4A017",
    },
    {
      n: 3, label: "3 Steps", dur: 150, base: 525000, withColor: 750000,
      tagline: "Maximum lift",
      desc: "Near-platinum result. Required for pastels, silver, white, and vivid colours.",
      result: "Blonde → Platinum",
      resultColor: "#F5EEC8",
    },
  ];
  const chosen = STEPS.find(s => s.n === step);
  const price = addColor ? chosen.withColor : chosen.base;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(12px,2.4vw,28px)" }} onClick={onClose}>
      <div className="si" style={{ background: C.white, borderRadius: 18, padding: "clamp(20px,2.8vw,32px)", maxWidth: "clamp(360px,56vw,560px)", width: "100%", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "clamp(16px,2.2vw,22px)" }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 800, color: C.text }}>🎨 Hair Bleach</div>
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.muted, marginTop: 3 }}>Choose your bleach intensity · Pilih intensitas bleaching</div>
          </div>
          <button onClick={onClose} style={{ background: C.surface2, border: "none", borderRadius: 8, width: 36, height: 36, fontSize: 20, cursor: "pointer", color: C.text2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 12 }}>×</button>
        </div>

        {/* ── Colour Scale ────────────────────────────────────── */}
        <div style={{ marginBottom: "clamp(16px,2.2vw,22px)" }}>
          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Expected result</div>
          {/* Gradient bar */}
          <div style={{ position: "relative", height: 28, borderRadius: 999, background: "linear-gradient(to right, #111110, #3B1F0A, #6B3A1F, #9B5E2A, #C8892E, #DDB84A, #E8D070, #F2E8A8, #F8F3D8)", marginBottom: 28, border: `1px solid ${C.border}` }}>
            {/* Step markers — static ticks + selected dot */}
            {[
              { pct: 28, s: 1 },
              { pct: 55, s: 2 },
              { pct: 76, s: 3 },
            ].map(({ pct, s }) => (
              <div key={s} style={{ position: "absolute", top: 0, left: `${pct}%`, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* White tick line */}
                <div style={{ width: 2, height: 28, background: "rgba(255,255,255,0.5)" }} />
                {/* Dot + label below bar — only for selected step */}
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  {step === s && (
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.topBg, border: `2px solid ${C.white}`, boxShadow: "0 0 0 2px " + C.topBg }} />
                  )}
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(9px,1.1vw,10px)", fontWeight: step === s ? 700 : 400, color: step === s ? C.text : C.muted, whiteSpace: "nowrap" }}>
                    {s} Step{s > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* End labels */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "clamp(10px,1.1vw,11px)", color: C.muted }}>← Black</span>
            <span style={{ fontSize: "clamp(10px,1.1vw,11px)", color: C.muted }}>Platinum →</span>
          </div>
        </div>

        {/* ── Step selector ───────────────────────────────────── */}
        <div style={{ marginBottom: "clamp(16px,2.2vw,22px)" }}>
          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: "clamp(8px,1.2vw,12px)" }}>Select steps</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "clamp(8px,1.2vw,10px)" }}>
            {STEPS.map(s => {
              const sel = step === s.n;
              return (
                <button key={s.n} onClick={() => setStep(s.n)}
                  style={{ padding: "clamp(12px,1.8vh,18px) clamp(8px,1vw,12px)", borderRadius: 12, border: `2px solid ${sel ? C.topBg : C.border}`, background: sel ? C.topBg : C.white, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                  {/* Step number */}
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(24px,3.8vw,34px)", fontWeight: 800, color: sel ? C.white : C.text, lineHeight: 1 }}>{s.n}</div>
                  {/* Tagline */}
                  <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, color: sel ? "#ddd" : C.text2, marginTop: 4 }}>{s.tagline}</div>
                  {/* Result swatch + label */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.resultColor, border: `1px solid ${sel ? "rgba(255,255,255,0.2)" : C.border}`, flexShrink: 0 }} />
                    <div style={{ fontSize: "clamp(9px,1.1vw,11px)", color: sel ? "#bbb" : C.muted, whiteSpace: "nowrap" }}>{s.result}</div>
                  </div>
                  {/* Price */}
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.5vw,14px)", fontWeight: 700, color: sel ? C.accent : C.text2, marginTop: 8 }}>
                    {fmt(addColor ? s.withColor : s.base)}
                  </div>
                  <div style={{ fontSize: "clamp(9px,1.1vw,10px)", color: sel ? "#666" : C.muted, marginTop: 2 }}>⏱ {s.dur} min</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Selected step description ───────────────────────── */}
        <div style={{ background: C.surface, borderRadius: 10, padding: "clamp(10px,1.4vw,14px) clamp(12px,1.6vw,16px)", marginBottom: "clamp(14px,2vw,20px)", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: chosen.resultColor, border: `1.5px solid ${C.border}`, flexShrink: 0, marginTop: 3 }} />
          <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.text2, lineHeight: 1.6 }}>{chosen.desc}</div>
        </div>

        {/* ── Add Color toggle ────────────────────────────────── */}
        <div onClick={() => setAddColor(v => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: addColor ? C.topBg : C.surface, borderRadius: 12, padding: "clamp(12px,1.6vw,16px) clamp(14px,1.8vw,18px)", cursor: "pointer", marginBottom: "clamp(14px,2vw,20px)", border: `2px solid ${addColor ? C.topBg : C.border}`, transition: "all 0.18s" }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,17px)", fontWeight: 700, color: addColor ? C.white : C.text }}>
              + Add Color
            </div>
            <div style={{ fontSize: "clamp(11px,1.3vw,12px)", color: addColor ? "#aaa" : C.muted, marginTop: 2 }}>
              Apply a colour after bleaching · +{fmt(chosen.withColor - chosen.base)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {addColor && <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.5vw,14px)", fontWeight: 700, color: C.accent }}>{fmt(chosen.withColor)}</span>}
            <div style={{ width: 44, height: 25, borderRadius: 999, background: addColor ? C.accent : "#ccc", position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", width: 19, height: 19, borderRadius: "50%", background: C.white, top: 3, left: addColor ? 22 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
          </div>
        </div>

        {/* ── Price summary + CTA ─────────────────────────────── */}
        <div style={{ background: C.surface, borderRadius: 12, padding: "clamp(10px,1.4vw,14px) clamp(14px,1.8vw,18px)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(14px,2vw,18px)" }}>
          <div>
            <div style={{ fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 600, color: C.text }}>
              Hair Bleach {chosen.n} Step{addColor ? " + Color" : ""}
            </div>
            <div style={{ fontSize: "clamp(11px,1.3vw,12px)", color: C.muted, marginTop: 2 }}>⏱ {chosen.dur} min</div>
          </div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.6vw,24px)", fontWeight: 800, color: C.text }}>{fmt(price)}</div>
        </div>

        <button className="btnP" onClick={() => onConfirm({ step, addColor, price, dur: chosen.dur, label: `Hair Bleach ${chosen.n} Step${addColor ? " + Color" : ""}` })}>
          Add to Cart — {fmt(price)}
        </button>
      </div>
    </div>
  );
}

// ── Step 1: Services ──────────────────────────────────────────────────────────
export default function ServiceSelection({ cart, setCart, ownColorToggles, setOwnColorToggles, onNext, onBack }) {
  // washToggles removed — Meeting 2: wash is optional and mentioned in description only
  const [showBleachModal, setShowBleachModal] = useState(false);
  // bleachConfig stores the configured bleach if added: { step, addColor, price, dur, label }
  const [bleachConfig, setBleachConfig] = useState(null);
  const catRefs = useRef({});
  const BLEACH_ID = 21; // id of Hair Bleach in SERVICES

  // Non-bleach HairColor services rendered as regular cards
  const regularCats = CATEGORIES; // now all cats render inline
  const nonBleachColors = SERVICES.filter(s => s.cat === "HairColor" && s.id !== BLEACH_ID);

  const effPrice = (s) => {
    if (s.id === BLEACH_ID) return bleachConfig?.price ?? s.price;
    if (s.ownColorPrice && ownColorToggles[s.id]) return s.ownColorPrice;
    return s.price;
  };
  const effDur = (s) => {
    if (s.id === BLEACH_ID) return bleachConfig?.dur ?? s.dur;
    return s.dur;
  };
  const effName = (s) => {
    if (s.id === BLEACH_ID && bleachConfig) return bleachConfig.label;
    if (s.ownColorPrice && ownColorToggles[s.id]) return s.name + " (Own Colour)";
    return s.name;
  };

  const total = cart.reduce((sum, id) => { const s = SERVICES.find(x => x.id === id); return sum + (s ? effPrice(s) : 0); }, 0);
  const dur = cart.reduce((sum, id) => { const s = SERVICES.find(x => x.id === id); return sum + (s ? effDur(s) : 0); }, 0);

  const toggle = id => {
    if (id === BLEACH_ID) {
      if (cart.includes(BLEACH_ID)) { setCart(c => c.filter(x => x !== BLEACH_ID)); setBleachConfig(null); }
      else { setShowBleachModal(true); }
      return;
    }

    const svc = SERVICES.find(x => x.id === id);
    if (!svc) return;

    // If already selected → deselect
    if (cart.includes(id)) {
      setCart(c => c.filter(x => x !== id));
      return;
    }

    // Haircut: only one at a time — swap out any existing haircut
    if (svc.cat === "Haircut") {
      setCart(c => {
        const without = c.filter(x => SERVICES.find(s => s.id === x)?.cat !== "Haircut");
        return [...without, id];
      });
      return;
    }

    // Package: only one at a time — swap out any existing package
    if (svc.cat === "Package") {
      setCart(c => {
        const without = c.filter(x => SERVICES.find(s => s.id === x)?.cat !== "Package");
        return [...without, id];
      });
      return;
    }

    // Mutex group: selecting one removes others in the same group (ear_treatment, beard_service)
    if (svc.mutex_group) {
      setCart(c => {
        const without = c.filter(x => SERVICES.find(s => s.id === x)?.mutex_group !== svc.mutex_group);
        return [...without, id];
      });
      return;
    }

    // All other categories: free multi-select
    setCart(c => [...c, id]);
  };


  const scrollTocat = key => catRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  const colorSelected = cart.some(id => SERVICES.find(x => x.id === id)?.cat === "HairColor");

  return (
    <>
      {showBleachModal && (
        <BleachModal
          onConfirm={cfg => { setBleachConfig(cfg); setCart(c => [...c.filter(x => x !== BLEACH_ID), BLEACH_ID]); setShowBleachModal(false); }}
          onClose={() => setShowBleachModal(false)}
        />
      )}
      <div style={{ height: "calc(100vh - clamp(51px,6.5vh,63px))", display: "flex", flexDirection: "column" }}>
        <div className="layout-split" style={{ flex: 1, overflow: "hidden" }}>

          {/* Left: service list — header + pills fixed, cards scroll */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Non-scrolling top: step header + category pills */}
            <div style={{ padding: "clamp(16px,2.4vw,28px) clamp(16px,2.4vw,28px) 0", flexShrink: 0 }}>
              <div className="step-header fu">
                <div className="step-eyebrow">Step 1 of 4 · Choose Services</div>
                <h2 className="step-title">Choose Your Services</h2>
                <div style={{ fontSize: "clamp(12px,1.4vw,14px)", color: "#88887E", marginTop: 2 }}>Select your services · Pilih Layanan Anda</div>
              </div>

              {/* Category pills — always visible */}
              <div style={{ display: "flex", gap: "clamp(6px,0.8vw,10px)", flexWrap: "wrap", paddingBottom: "clamp(12px,1.6vw,18px)", borderBottom: `1px solid ${C.border}`, marginBottom: "clamp(12px,1.6vw,18px)" }}>
                {CATEGORIES.map(c => {
                  const active = cart.some(id => SERVICES.find(x => x.id === id)?.cat === c.key);
                  return (
                    <button key={c.key} className="pill"
                      onClick={() => scrollTocat(c.key)}
                      style={{ background: active ? C.topBg : C.white, color: active ? C.white : C.text2, border: `1.5px solid ${active ? C.topBg : C.border}` }}>
                      {c.icon} {c.labelEn}
                      {active && <span style={{ background: C.accent, color: C.accentText, borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "1px 6px", marginLeft: 4 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable service cards only */}
            <div className="scroll-y" style={{ flex: 1, padding: "0 clamp(16px,2.4vw,28px) clamp(16px,2.4vw,28px)" }}>

              {/* All category sections — including Hair Coloring inline */}
              {CATEGORIES.map((cat, ci) => {
                const isColor = cat.key === "HairColor";
                const services = isColor
                  ? SERVICES.filter(s => s.cat === "HairColor" && s.id !== BLEACH_ID)  // non-bleach first
                  : SERVICES.filter(s => s.cat === cat.key);
                const bleachSvc = SERVICES.find(s => s.id === BLEACH_ID);

                return (
                  <div key={cat.key} className="fu" ref={el => catRefs.current[cat.key] = el}
                    style={{ marginBottom: "clamp(14px,2vw,24px)", animationDelay: `${ci * 0.07}s`, scrollMarginTop: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,1.2vw,12px)", marginBottom: "clamp(10px,1.4vw,14px)" }}>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(15px,2vw,20px)", fontWeight: 700, color: C.text, flexShrink: 0 }}>
                        {cat.icon} {cat.labelEn}
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "clamp(11px,1.3vw,13px)", fontWeight: 400, color: C.muted, marginLeft: "clamp(6px,0.8vw,8px)" }}>{cat.labelId}</span>
                      </div>

                      <div style={{ flex: 1, height: 1, background: C.border }} />
                    </div>
                    <div className="card-grid-fluid">
                      {services.map((s, i) => {
                        const sel = cart.includes(s.id);
                        return (
                          <div key={s.id}
                            className={s.cat === "Treatment" || s.cat === "Package" ? "" : `card ${sel ? "sel" : ""}`}
                            style={{
                              padding: s.cat === "Treatment" || s.cat === "Package" ? 0 : "clamp(14px,1.8vw,18px)",
                              cursor: "pointer",
                              animation: `fadeUp 0.3s ease ${ci * 0.07 + i * 0.05}s both`,
                              borderRadius: 14,
                              overflow: "hidden",
                              ...(s.cat !== "Treatment" && s.cat !== "Package" && { border: `1.5px solid ${sel ? C.accent : C.border}`, background: sel ? C.accent : C.white }),
                            }}
                            onClick={() => toggle(s.id)}>

                            {/* ── Treatment: full photo background, white text ── */}
                            {s.cat === "Treatment" && s.img ? (
                              <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", minHeight: "clamp(110px,14vw,150px)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                <img src={s.img} alt={s.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.05) 100%)" }} />
                                {sel && <div style={{ position: "absolute", inset: 0, border: `3px solid ${C.accent}`, borderRadius: 14, zIndex: 2 }} />}
                                <div style={{ position: "relative", zIndex: 3, padding: "clamp(10px,1.4vw,14px)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                    <div>
                                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(13px,1.6vw,16px)", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{s.name}</div>
                                      <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "rgba(255,255,255,0.72)", marginTop: 2 }}>{s.nameId} · {s.dur} min</div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                                      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 800, color: sel ? C.accent : "#fff" }}>{fmt(effPrice(s))}</span>
                                      {sel && <div style={{ width: 20, height: 20, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: C.accentText }}>✓</div>}
                                    </div>
                                  </div>
                                </div>
                              </div>

                            /* ── Package: photo zone on top, white chip strip below ── */
                            ) : s.cat === "Package" ? (
                              <div style={{ borderRadius: 14, overflow: "hidden", border: `${sel ? "3px" : "1.5px"} solid ${sel ? C.accent : C.border}` }}>

                                {/* TOP — tiled photos, clean — just badge + name + price */}
                                <div style={{ position: "relative", height: "clamp(120px,16vw,170px)" }}>
                                  {s.treatmentImgs && s.treatmentImgs.length > 0 ? (
                                    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                                      {s.treatmentImgs.map((src, ti) => (
                                        <div key={ti} style={{ flex: 1, overflow: "hidden" }}>
                                          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ position: "absolute", inset: 0, background: C.topBg }} />
                                  )}
                                  {/* Subtle gradient — just enough for text at bottom */}
                                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0) 100%)" }} />
                                  {/* Badge — top left */}
                                  {s.badge && (
                                    <div style={{ position: "absolute", top: "clamp(8px,1vw,12px)", left: "clamp(10px,1.2vw,14px)", background: C.accent, color: C.accentText, fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 800, padding: "3px 9px", borderRadius: 5, zIndex: 2 }}>{s.badge}</div>
                                  )}
                                  {/* Name + price — bottom of photo */}
                                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: "clamp(10px,1.4vw,14px)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                    <div>
                                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{s.name}</div>
                                      <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{s.nameId} · {s.dur} min</div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0, marginLeft: 8 }}>
                                      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(15px,2vw,20px)", fontWeight: 800, color: sel ? C.accent : "#fff" }}>{fmt(effPrice(s))}</span>
                                      {sel && <div style={{ width: 20, height: 20, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: C.accentText }}>✓</div>}
                                    </div>
                                  </div>
                                </div>

                                {/* BOTTOM — black strip with included service chips */}
                                {s.desc && (
                                  <div style={{ background: C.topBg, padding: "clamp(10px,1.2vw,14px) clamp(12px,1.4vw,16px)", display: "flex", flexWrap: "wrap", gap: "clamp(4px,0.6vw,6px)" }}>
                                    {s.desc.split("  ·  ").map((item, k) => (
                                      <span key={k} style={{ fontSize: "clamp(10px,1.2vw,12px)", color: sel ? C.accentText : "rgba(255,255,255,0.75)", background: sel ? C.accent : "rgba(255,255,255,0.1)", borderRadius: 5, padding: "3px 8px", whiteSpace: "nowrap" }}>{item}</span>
                                    ))}
                                  </div>
                                )}
                              </div>

                            /* ── All other cards (Haircut, Beard, HairColor): existing layout ── */
                            ) : (
                              <>
                                {/* HairColor: single photo */}
                                {s.cat === "HairColor" && (
                                  <div style={{ width: "100%", height: "clamp(80px,12vw,120px)", background: "linear-gradient(135deg,#F2F0EB 0%,#ECEAE4 100%)", borderRadius: 10, marginBottom: "clamp(10px,1.4vw,14px)", overflow: "hidden" }}>
                                    {s.img && <img src={s.img} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: sel ? 0.6 : 1 }} />}
                                  </div>
                                )}
                                {s.badge && (
                                  <div style={{ display: "inline-block", background: sel ? C.accentText : C.topBg, color: sel ? C.accent : C.white, fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginBottom: 8 }}>{s.badge}</div>
                                )}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,17px)", fontWeight: 700, color: sel ? C.accentText : C.text, lineHeight: 1.2 }}>{s.name}</div>
                                    <div style={{ fontSize: "clamp(11px,1.3vw,12px)", color: sel ? "#1a1a1899" : C.muted, marginTop: 2 }}>{s.nameId}</div>
                                    {s.desc && <div style={{ fontSize: "clamp(10px,1.2vw,11px)", color: sel ? "#1a1a1888" : C.muted, marginTop: 3, lineHeight: 1.4 }}>{s.desc}</div>}
                                  </div>
                                  {sel && <div style={{ width: 22, height: 22, background: C.accentText, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.accent, fontWeight: 800, flexShrink: 0 }}>✓</div>}
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "clamp(10px,1.4vw,14px)" }}>
                                  <span style={{ fontSize: "clamp(11px,1.3vw,12px)", color: sel ? "#1a1a1888" : C.muted }}>⏱ {effDur(s)} min</span>
                                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 700, color: sel ? C.accentText : C.text }}>{fmt(effPrice(s))}</span>
                                </div>
                              </>
                            )}
                            {s.washAddon && (
                              <div style={{ marginTop: 8, fontSize: "clamp(10px,1.2vw,11px)", color: sel ? "#1a1a1877" : C.muted }}>
                                🚿 Optional wash available · Cuci rambut opsional
                              </div>
                            )}
                            {s.ownColorPrice && (
                              <div onClick={e => { e.stopPropagation(); setOwnColorToggles(prev => ({ ...prev, [s.id]: !prev[s.id] })); }}
                                style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", background: sel ? C.accentText : C.surface, borderRadius: 8, padding: "8px 12px", cursor: "pointer", border: `1px solid ${sel ? "transparent" : C.border}` }}>
                                <span style={{ fontSize: "clamp(11px,1.3vw,13px)", fontWeight: 600, color: sel ? (ownColorToggles[s.id] ? C.accent : "#888") : (ownColorToggles[s.id] ? C.topBg : C.text2) }}>
                                  I have my own colour <span style={{ fontWeight: 400, color: sel ? (ownColorToggles[s.id] ? C.accent : "#666") : C.muted }}>(−{fmt(s.price - s.ownColorPrice)})</span>
                                </span>
                                <div style={{ width: 30, height: 17, borderRadius: 999, background: ownColorToggles[s.id] ? (sel ? C.accent : C.topBg) : (sel ? "#444" : C.border), position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                                  <div style={{ position: "absolute", width: 13, height: 13, borderRadius: "50%", background: C.white, top: 2, left: ownColorToggles[s.id] ? 15 : 2, transition: "left 0.2s" }} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Hair Bleach special card */}
                      {isColor && bleachSvc && (
                        <div className={`card ${cart.includes(BLEACH_ID) ? "sel" : ""}`}
                          style={{ padding: "clamp(14px,1.8vw,18px)", cursor: "pointer", animation: `fadeUp 0.3s ease ${ci * 0.07 + services.length * 0.05}s both`, position: "relative" }}
                          onClick={() => toggle(BLEACH_ID)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,17px)", fontWeight: 700, color: cart.includes(BLEACH_ID) ? C.accentText : C.text, lineHeight: 1.2 }}>
                                {bleachConfig ? bleachConfig.label : "Hair Bleach"}
                              </div>
                              <div style={{ fontSize: "clamp(11px,1.3vw,12px)", color: cart.includes(BLEACH_ID) ? "#1a1a1899" : C.muted, marginTop: 2 }}>Bleaching Rambut</div>
                              {!cart.includes(BLEACH_ID) && (
                                <div style={{ fontSize: "clamp(10px,1.2vw,11px)", color: C.muted, marginTop: 3 }}>
                                  1–3 steps · from {fmt(260000)}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                              {cart.includes(BLEACH_ID) && <div style={{ width: 22, height: 22, background: C.accentText, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.accent, fontWeight: 800 }}>✓</div>}
                              {!cart.includes(BLEACH_ID) && (
                                <div style={{ background: C.topBg, color: C.white, borderRadius: 6, padding: "3px 8px", fontSize: "clamp(10px,1.2vw,11px)", fontWeight: 600 }}>Configure →</div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "clamp(10px,1.4vw,14px)" }}>
                            <span style={{ fontSize: "clamp(11px,1.3vw,12px)", color: cart.includes(BLEACH_ID) ? "#1a1a1888" : C.muted }}>⏱ {effDur(bleachSvc)} min</span>
                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 700, color: cart.includes(BLEACH_ID) ? C.accentText : C.text }}>
                              {cart.includes(BLEACH_ID) ? fmt(bleachConfig?.price ?? bleachSvc.price) : `from ${fmt(260000)}`}
                            </span>
                          </div>
                          {/* Reconfigure button when selected */}
                          {cart.includes(BLEACH_ID) && (
                            <div onClick={e => { e.stopPropagation(); setShowBleachModal(true); }}
                              style={{ marginTop: 10, background: C.accentText, borderRadius: 8, padding: "6px 12px", textAlign: "center", fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 600, color: "#888" }}>
                              ✏ Change configuration
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>{/* end scroll-y services */}
          </div>{/* end left column */}

          {/* Right: cart sidebar */}
          <div className="sidebar scroll-y" style={{ width: "clamp(240px,28vw,300px)", borderLeft: `1px solid ${C.border}`, background: C.bg, display: "flex", flexDirection: "column", padding: "clamp(14px,2vw,22px)", position: "relative", zIndex: 900 }}>
            <div style={{ fontSize: "clamp(10px,1.2vw,12px)", letterSpacing: "0.14em", fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>Your Selection</div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "clamp(24px,4vh,40px) 0", color: C.muted }}>
                  <div style={{ fontSize: "clamp(24px,3.5vw,32px)", opacity: 0.25, marginBottom: 8 }}>✂</div>
                  <div style={{ fontSize: "clamp(12px,1.4vw,14px)" }}>No services selected</div>
                  <div style={{ fontSize: "clamp(10px,1.2vw,12px)", marginTop: 3, opacity: 0.7 }}>Belum ada pilihan</div>
                </div>
              ) : cart.map(id => {
                const s = SERVICES.find(x => x.id === id);
                const catDef = CATEGORIES.find(c => c.key === s.cat);
                return (
                  <div key={id} style={{ padding: "clamp(8px,1.2vh,12px) 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 700, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>{catDef?.labelEn}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 600 }}>{effName(s)}</div>
                        <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: C.muted }}>{fmt(effPrice(s))}</div>
                      </div>
                      <button onClick={() => toggle(id)} style={{ background: "none", color: C.muted, fontSize: 20, padding: "4px 8px", borderRadius: 6, minWidth: 36, minHeight: 44 }}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {cart.length > 0 && (
              <div style={{ borderTop: `2px solid ${C.topBg}`, paddingTop: 12, marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.muted }}>Duration</span>
                  <span style={{ fontSize: "clamp(11px,1.3vw,13px)" }}>{dur} min</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "clamp(13px,1.6vw,15px)", fontWeight: 600 }}>Total</span>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 800 }}>{fmt(total)}</span>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              <button className="btnP" disabled={cart.length === 0} onClick={onNext}>Continue →</button>
              <button className="btnG" onClick={onBack} style={{ width: "100%" }}>← Back</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
