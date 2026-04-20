import { useEffect, useRef, useState } from "react";
import AdminPanel from "./AdminPanel.jsx";
import BarberPanel from "./BarberPanel.jsx";
import BarberSelection from "./BarberSelection.jsx";
import Topbar from "./components/Topbar.jsx";
import Confirm from "./Confirm.jsx";
import { BERCUT_LOGO, BEVERAGES, C, FONT, PRODUCTS, SERVICES, fmt } from "./data.js";
import PaymentTakeover from "./PaymentTakeover.jsx";
import QueueNumber from "./QueueNumber.jsx";
import ServiceSelection from "./ServiceSelection.jsx";
import StaffPanel from "./StaffPanel.jsx";
import TimeSlot from "./TimeSlot.jsx";
import Welcome from "./Welcome.jsx";

// ── Global styles ─────────────────────────────────────────────────────────────
const GS = () => (
  <style>{`
    ${FONT}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      font-family: 'DM Sans', sans-serif;
      background: ${C.bg};
      color: ${C.text};
      min-height: 100vh;
      overscroll-behavior: none;
      -webkit-overflow-scrolling: touch;
    }

    h1,h2,h3,h4 { font-family: 'Inter', sans-serif; font-weight: 800; }
    button { cursor: pointer; border: none; font-family: 'DM Sans', sans-serif; outline: none; -webkit-tap-highlight-color: transparent; }
    input  { font-family: 'DM Sans', sans-serif; outline: none; }

    .scroll-y { overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }

    @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
    @keyframes pop     { 0%{transform:scale(1)} 45%{transform:scale(1.08)} 100%{transform:scale(1)} }
    @keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.5} }
    @keyframes namePulse  { 0%{box-shadow:0 0 0 0 rgba(245,226,0,0.7)} 60%{box-shadow:0 0 0 8px rgba(245,226,0,0)} 100%{box-shadow:0 0 0 0 rgba(245,226,0,0)} }
    .fu { animation: fadeUp  0.3s  ease both; }
    .fi { animation: fadeIn  0.22s ease both; }
    .si { animation: scaleIn 0.28s ease both; }

    .card { background: ${C.white}; border: 1.5px solid ${C.border}; border-radius: 14px; transition: border-color 0.18s; min-height: 72px; }
    .card.sel { background: ${C.accent}; border-color: ${C.accent}; }

    .btnP { width:100%; background:${C.topBg}; color:${C.white}; padding:16px 24px; border-radius:12px; font-family:'DM Sans',sans-serif; font-size:clamp(15px,1.8vw,18px); font-weight:700; transition:background 0.15s,transform 0.1s; }
    .btnP:active  { transform:scale(0.98); }
    .btnP:disabled{ background:${C.surface2}; color:${C.muted}; cursor:not-allowed; }

    .btnG { background:transparent; color:${C.text2}; padding:14px 20px; border-radius:12px; font-size:clamp(14px,1.5vw,16px); font-weight:500; border:1.5px solid ${C.border}; transition:background 0.15s; min-height:52px; }
    .btnG:active { background:${C.surface}; }

    .pill { padding:clamp(8px,1vw,10px) clamp(14px,1.8vw,20px); border-radius:999px; font-size:clamp(13px,1.4vw,14px); font-weight:600; transition:all 0.15s; min-height:42px; display:inline-flex; align-items:center; gap:6px; -webkit-tap-highlight-color:transparent; }

    .layout-split { display:flex; flex-direction:row; }
    @media (max-width:768px) {
      .layout-split { flex-direction:column; }
      .sidebar { width:100% !important; border-left:none !important; border-top:1px solid ${C.border}; max-height:280px; }
    }
     .card-grid-fluid   { display:grid; grid-template-columns:repeat(auto-fill,minmax(clamp(260px,33vw,420px),1fr)); gap:clamp(14px,2vw,24px); }
    .barber-grid-fluid { display:grid; grid-template-columns:repeat(auto-fill,minmax(clamp(160px,20vw,220px),1fr)); gap:clamp(10px,1.4vw,16px); }
    .slot-grid         { display:flex; flex-wrap:wrap; gap:clamp(8px,1.2vw,14px); }
    .confirm-layout    { display:grid; grid-template-columns:1fr clamp(280px,32vw,440px); gap:clamp(20px,2.5vw,36px); }
    @media (max-width:900px) { .confirm-layout { grid-template-columns:1fr; } }

    .step-header { margin-bottom: clamp(18px,2.4vw,28px); }
    .step-eyebrow { font-size:clamp(11px,1.3vw,13px); color:${C.muted}; margin-bottom:4px; }
    .step-title { font-family:'Inter',sans-serif; font-size:clamp(26px,3.5vw,38px); font-weight:800; letter-spacing:-0.02em; line-height:1.1; }

    ::-webkit-scrollbar { width:3px; }
    ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
  `}</style>
);

// ── Upsell logic — driven by admin-configured rules ──────────────────────────
function getUpsell(cart, settings) {
  if (!settings?.upsellEnabled) return null;
  const catOf = id => SERVICES.find(x => x.id === id)?.cat;
  const cats = cart.map(catOf);
  if (cats.includes("Package")) return null;
  const rules = settings?.upsellRules ?? [];
  for (const rule of rules) {
    if (!rule.active) continue;
    const mustOk = rule.mustContain.every(c =>
      c.type === 'cat' ? cats.includes(c.cat) : cart.includes(c.id)
    );
    const mustNotOk = rule.mustNotContain.every(c =>
      c.type === 'cat' ? !cats.includes(c.cat) : !cart.includes(c.id)
    );
    if (mustOk && mustNotOk) {
      if (rule.outcome === 'package') return { pkg: SERVICES.find(x => x.id === rule.pkgId), type: 'package' };
      if (rule.outcome === 'suggest_popup') return { type: 'suggest' };
    }
  }
  return null;
}

// ── Package upsell helpers ────────────────────────────────────────────────────
// Full retail price if all package items bought individually (for savings calc)
const PKG_RETAIL = {
  16: 205000,  // Haircut 120k + Black Mask 85k
  17: 225000,  // Haircut 120k + Beard Trim 75k + Wash ~30k
  18: 595000,  // Haircut 120k + Black Mask 85k + Nose Wax 95k + Ear Wax 95k + Ear Candle 75k + Creambath 95k + Wash 30k
  19: 670000,  // Above + Beard 75k
};

// Per-package chips: id=null means a non-service extra (e.g. Wash); bonus=true = highlighted extra
const PKG_CHIPS = {
  16: [{ id: 1, icon: "✂", l: "Haircut" }, { id: 13, icon: "🎭", l: "Black Mask" }, { id: null, icon: "🚿", l: "Wash", bonus: true }],
  17: [{ id: 1, icon: "✂", l: "Haircut" }, { id: 6, icon: "🪒", l: "Beard Trim" }, { id: null, icon: "🚿", l: "Wash", bonus: true }],
  18: [{ id: 1, icon: "✂", l: "Haircut" }, { id: 13, icon: "🎭", l: "Black Mask" }, { id: 9, icon: "👃", l: "Nose Wax" }, { id: 10, icon: "👂", l: "Ear Wax" }, { id: 15, icon: "🕯", l: "Ear Candle" }, { id: 14, icon: "💆", l: "Creambath" }, { id: null, icon: "🚿", l: "Wash", bonus: true }],
  19: [{ id: 1, icon: "✂", l: "Haircut" }, { id: 6, icon: "🪒", l: "Beard" }, { id: 13, icon: "🎭", l: "Black Mask" }, { id: 9, icon: "👃", l: "Nose Wax" }, { id: 10, icon: "👂", l: "Ear Wax" }, { id: 15, icon: "🕯", l: "Ear Candle" }, { id: 14, icon: "💆", l: "Creambath" }, { id: null, icon: "🚿", l: "Wash", bonus: true }],
};

// Detect if a package chip is already satisfied by the cart (handles "any haircut" / "any beard" logic)
function chipInCart(chip, cart) {
  if (!chip.id) return false;
  const svc = SERVICES.find(x => x.id === chip.id);
  if (!svc) return false;
  if (svc.cat === "Haircut") return cart.some(id => SERVICES.find(x => x.id === id)?.cat === "Haircut");
  if (svc.cat === "Beard") return cart.some(id => SERVICES.find(x => x.id === id)?.cat === "Beard");
  return cart.includes(chip.id);
}

// ── Upsell Modal ──────────────────────────────────────────────────────────────
// Multi-phase: "suggest" (interactive beard/treatment picker) → "package" (dynamic psychology offer)
// onConfirm(finalCart, pkgId | null) — pkgId means "swap services for this package"
function UpsellModal({ cart, extras, setExtras, onConfirm, onClose, settings }) {
  const [initUpsell] = useState(() => getUpsell(cart, settings));
  const [phase, setPhase] = useState(initUpsell?.type === "package" ? "package" : "suggest");
  const [workCart, setWorkCart] = useState(cart); // cart including any extras from suggest phase

  if (!initUpsell) { onConfirm(cart, null); return null; }

  const toggleExtra = id => setExtras(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id]);

  const handleSuggestProceed = () => {
    const merged = [...new Set([...cart, ...extras])];
    const nu = getUpsell(merged, settings);
    if (nu?.type === "package") { setWorkCart(merged); setPhase("package"); }
    else onConfirm(merged, null);
  };

  // ── SUGGEST PHASE — pick beard / treatment services ───────────────────────
  if (phase === "suggest") {
    const allowed = settings?.suggestServices;
    const CAT_HEADERS = { Haircut: "✂ Haircut · Potong Rambut", Beard: "🪒 Beard · Jenggot", Treatment: "✨ Treatments · Perawatan", HairColor: "🎨 HairColor · Pewarnaan" };
    const allAddonSvcs = SERVICES.filter(s => s.cat !== "Package" && (!allowed || allowed.includes(s.id)));
    const catsPresent = [...new Set(allAddonSvcs.map(s => s.cat))];
    const miniCard = (s) => {
      const sel = extras.includes(s.id);
      // Treatment cards with a photo: full photo background, white text
      if (s.img) {
        return (
          <div key={s.id} onClick={() => toggleExtra(s.id)}
            style={{ position: "relative", borderRadius: 14, overflow: "hidden", cursor: "pointer", minHeight: "clamp(100px,12vw,130px)", display: "flex", flexDirection: "column", justifyContent: "flex-end", transition: "transform 0.12s" }}>
            {/* Checkmark top right */}
            {sel && (
              <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: C.accentText, zIndex: 4, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
                ✓
              </div>
            )}
            {/* Photo background */}
            <img src={s.img} alt={s.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            {/* Gradient + optional yellow tint when selected */}
            <div style={{ position: "absolute", inset: 0, background: sel ? "rgba(245,226,0,0.3)" : "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.05) 100%)" }} />
            {/* Yellow border when selected */}
            {sel && <div style={{ position: "absolute", inset: 0, border: `3px solid ${C.accent}`, borderRadius: 14, zIndex: 2 }} />}
            {/* Content */}
            <div style={{ position: "relative", zIndex: 3, padding: "clamp(8px,1.2vw,12px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.5vw,14px)", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{s.name}</div>
                  <div style={{ fontSize: "clamp(9px,1.1vw,11px)", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{s.nameId} · {s.dur} min</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0, marginLeft: 6 }}>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.5vw,14px)", fontWeight: 800, color: sel ? C.accent : "#fff" }}>{fmt(s.price)}</span>

                </div>
              </div>
            </div>
          </div>
        );
      }
      // Beard cards (no photo): plain card, yellow when selected
      return (
        <div key={s.id} onClick={() => toggleExtra(s.id)}
          style={{ position: "relative", background: sel ? C.accent : C.white, border: `1.5px solid ${sel ? C.accent : C.border}`, borderRadius: 14, padding: "clamp(12px,1.6vw,16px)", cursor: "pointer", minHeight: "clamp(80px,10vh,100px)", transition: "all 0.15s", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {sel && (
            <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, background: C.accentText, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: C.accent, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              ✓
            </div>
          )}
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.5vw,14px)", fontWeight: 700, color: sel ? C.accentText : C.text }}>{s.name}</div>
          <div style={{ fontSize: "clamp(10px,1.2vw,11px)", color: sel ? "rgba(17,17,16,0.55)" : C.muted, marginTop: 2 }}>{s.nameId}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: "clamp(10px,1.2vw,11px)", color: sel ? "rgba(17,17,16,0.45)" : C.muted }}>⏱ {s.dur} min</span>
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.5vw,14px)", fontWeight: 800, color: sel ? C.accentText : C.text }}>{fmt(s.price)}</span>
          </div>
        </div>
      );
    };
    return (
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, right: "clamp(240px,28vw,300px)", background: "rgba(0,0,0,0.65)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px,3vw,32px)" }} onClick={onClose}>
        <div className="si" style={{ background: C.white, borderRadius: 20, width: "100%", maxWidth: "clamp(400px,72vw,700px)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ background: C.topBg, padding: "clamp(14px,1.8vw,20px) clamp(20px,2.6vw,28px)", flexShrink: 0 }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: "clamp(17px,2.2vw,24px)", color: C.topText }}>💡 {settings?.upsellHeading || "Complete the look"}</div>
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#aaa", marginTop: 4 }}>
              Want to add {cart.some(id => SERVICES.find(x => x.id === id)?.cat === "Haircut") ? "beard or treatment" : "treatment"} services? · {settings?.upsellHeadingId || "Lengkapi penampilan Anda"}
            </div>
          </div>
          {/* Scrollable body */}
          <div className="scroll-y" style={{ flex: 1, padding: "clamp(14px,2vw,22px) clamp(16px,2.4vw,26px)" }}>
            {catsPresent.map(cat => {
              const svcs = allAddonSvcs.filter(s => s.cat === cat);
              return (
                <div key={cat} style={{ marginBottom: "clamp(14px,1.8vw,20px)" }}>
                  <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: "clamp(8px,1.2vw,12px)" }}>
                    {CAT_HEADERS[cat] || cat}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(clamp(140px,18vw,200px),1fr))", gap: "clamp(8px,1.2vw,12px)" }}>
                    {svcs.map(miniCard)}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Footer */}
          <div style={{ padding: "clamp(12px,1.6vw,18px) clamp(16px,2.4vw,26px)", borderTop: `1px solid ${C.border}`, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {extras.length > 0
              ? <button className="btnP" onClick={handleSuggestProceed}>Add {extras.length} service{extras.length > 1 ? "s" : ""} & continue →</button>
              : <button className="btnP" onClick={() => onConfirm(cart, null)}>Continue with selection →</button>
            }
            <button className="btnG" onClick={() => onConfirm(cart, null)} style={{ width: "100%", fontSize: "clamp(12px,1.4vw,14px)" }}>Skip · Lewati</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PACKAGE PHASE — dynamic psychology offer ──────────────────────────────
  const upsell = getUpsell(workCart, settings);
  const pkg = upsell?.pkg;
  if (!pkg) { onConfirm(workCart, null); return null; }

  const pkgRetail = PKG_RETAIL[pkg.id] || pkg.price;
  const savings = pkgRetail - pkg.price;
  const cartTotal = workCart.reduce((s, id) => s + (SERVICES.find(x => x.id === id)?.price || 0), 0);
  const extraCost = pkg.price - cartTotal;
  const chips = PKG_CHIPS[pkg.id] || [];
  // Dynamic headline based on cart vs package price
  const overPkg = cartTotal >= pkg.price;
  const pkgSave = overPkg ? cartTotal - pkg.price : 0;
  const headlineLine = overPkg
    ? (pkgSave > 0 ? "This package is cheaper! · Paket ini lebih murah!" : "Same price, more services · Harga sama, dapat lebih")
    : "More value with a package · Lebih hemat dengan paket";

  // Determine which "retail" price to cross out
  // overPkg = true: customer's cart >= package price → crossing out their cart total (it's cheaper to switch)
  // overPkg = false: cross out what they'd pay individually for everything in the package (vs retail savings)
  const strikePrice = overPkg ? cartTotal : pkgRetail;
  const strikeLabel = overPkg ? "Your current total" : "Buying individually";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px,3vw,32px)" }} onClick={onClose}>
      <div className="si" style={{ background: C.white, borderRadius: 20, width: "100%", maxWidth: "clamp(360px,52vw,520px)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>

        {/* Hero photo strip — package images tiled, savings number floated over */}
        <div style={{ position: "relative", height: "clamp(180px,22vw,240px)", overflow: "hidden", background: C.topBg }}>
          {pkg.treatmentImgs && pkg.treatmentImgs.length > 0 && (
            <div style={{ display: "flex", height: "100%", position: "absolute", inset: 0 }}>
              {pkg.treatmentImgs.map((src, i) => (
                <div key={i} style={{ flex: 1, overflow: "hidden", borderRight: i < pkg.treatmentImgs.length - 1 ? "1px solid rgba(255,255,255,0.12)" : "none" }}>
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              ))}
            </div>
          )}
          {/* Bottom-up gradient for text legibility */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.08) 100%)" }} />
          {/* Badge — top right */}
          {pkg.badge && (
            <div style={{ position: "absolute", top: "clamp(10px,1.4vw,14px)", right: "clamp(14px,1.8vw,18px)", background: C.accent, color: C.accentText, fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 800, padding: "3px 9px", borderRadius: 5, zIndex: 2 }}>{pkg.badge}</div>
          )}
          {/* Savings hero + package name anchored to bottom of photo */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "clamp(14px,1.8vw,20px) clamp(18px,2.4vw,24px)", zIndex: 2 }}>
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>{pkg.name} · {pkg.nameId}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: "clamp(26px,3.4vw,38px)", color: C.accent, lineHeight: 1.1 }}>Save {fmt(savings)}</div>
            <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "rgba(255,255,255,0.45)", marginTop: 5 }}>vs buying individually · vs beli satuan</div>
          </div>
        </div>

        {/* Included services chip row — ✓ already in cart (muted), + new services (yellow) */}
        <div style={{ padding: "clamp(10px,1.4vw,14px) clamp(18px,2.4vw,24px)", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "clamp(9px,1.1vw,10px)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: "clamp(6px,0.9vw,8px)" }}>
            What’s included · Yang termasuk
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(5px,0.7vw,7px)" }}>
            {chips.map(chip => {
              const have = chipInCart(chip, workCart);
              return (
                <span key={chip.l} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px clamp(8px,1.1vw,10px)", borderRadius: 999, fontSize: "clamp(11px,1.3vw,12px)", fontWeight: 600, background: have ? C.surface : C.accent, color: have ? C.muted : C.accentText, border: `1px solid ${have ? C.border : C.accent}` }}>
                  {have ? "✓" : "+"} {chip.icon} {chip.l}
                </span>
              );
            })}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ padding: "clamp(14px,1.8vw,20px) clamp(18px,2.4vw,24px)", display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btnP" onClick={() => onConfirm(workCart, pkg.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span>{settings?.upsellSwitchCta ? `${settings.upsellSwitchCta} ` : "Switch to "}{pkg.name} · {fmt(pkg.price)}</span>
            <span style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 500, opacity: 0.75 }}>
              {overPkg ? `−${fmt(pkgSave)} less than your current total` : extraCost === 0 ? "Same as your current total" : `+${fmt(extraCost)} added to your total`}
            </span>
          </button>
          <button className="btnG" onClick={() => onConfirm(workCart, null)} style={{ width: "100%", fontSize: "clamp(12px,1.4vw,14px)" }}>
            {settings?.upsellKeepCta || "Keep my selection · Pertahankan pilihan"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Offline Banner ────────────────────────────────────────────────────────────
function OfflineBanner() {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9000, background: C.topBg, borderTop: `3px solid ${C.accent}`, padding: "clamp(8px,1.2vh,12px) clamp(16px,2.4vw,28px)", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef5350", flexShrink: 0, animation: "pulse 1.4s ease infinite" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: "clamp(13px,1.6vw,15px)", color: C.white }}>
          No Internet Connection · Tidak Ada Koneksi
        </div>
        <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#888", marginTop: 2 }}>
          Queue numbers still work. Card &amp; QRIS payments paused until connection returns. · Pembayaran ditangguhkan.
        </div>
      </div>
      <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#555", textAlign: "right" }}>
        <div>✓ Booking: online</div>
        <div style={{ color: "#ef5350" }}>✕ Payment: offline</div>
      </div>
    </div>
  );
}

// ── Idle Countdown Overlay ────────────────────────────────────────────────────
function IdleOverlay({ seconds, onDismiss }) {
  return (
    <div onClick={onDismiss} style={{ position: "fixed", inset: 0, zIndex: 8900, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="si" style={{ background: C.topBg, borderRadius: 20, padding: "clamp(28px,4vw,48px)", textAlign: "center", maxWidth: "clamp(300px,42vw,460px)", width: "100%" }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(64px,10vw,96px)", fontWeight: 900, color: C.accent, lineHeight: 1, marginBottom: 12, fontVariantNumeric: "tabular-nums" }}>
          {seconds}
        </div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,26px)", fontWeight: 800, color: C.white, marginBottom: 8 }}>
          Returning to Home Screen
        </div>
        <div style={{ fontSize: "clamp(12px,1.4vw,14px)", color: "#666", marginBottom: 28 }}>
          Kembali ke layar awal · Tap anywhere to continue
        </div>
        <button onClick={onDismiss} style={{ padding: "clamp(14px,2vh,18px) clamp(32px,4vw,48px)", borderRadius: 12, background: C.accent, color: C.accentText, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: "clamp(14px,1.7vw,17px)", border: "none", cursor: "pointer" }}>
          Lanjutkan · Continue
        </button>
      </div>
    </div>
  );
}

// ── Device Setup Screen ───────────────────────────────────────────────────────
// Shown on first boot when no kiosk_token in localStorage.
// In production: POST /api/kiosk/register validates the token and returns branch config.
// Mockup demo token: BERCUT-DEMO-0001

const DEMO_TOKEN = 'BERCUT-DEMO-0001';

function DeviceSetup({ onRegistered }) {
  const [token,   setToken]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleRegister() {
    const t = token.trim().toUpperCase();
    if (!t) { setError('Enter the device token provided by your admin.'); return; }
    setLoading(true);
    setTimeout(() => {
      if (t === DEMO_TOKEN) {
        localStorage.setItem('kiosk_token', t);
        localStorage.setItem('kiosk_branch_name', 'Bercut Seminyak');
        onRegistered();
      } else {
        setError('Invalid token. Contact your admin — Branches → Kiosk Devices → Generate Token.');
        setLoading(false);
      }
    }, 800);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.topBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px,4vw,48px)', fontFamily: "'DM Sans', sans-serif" }}>
      <GS />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 'clamp(28px,4vh,44px)' }}>
        <img src={BERCUT_LOGO} alt="Bercut Barbershop"
          style={{ width: 'clamp(200px,32vw,380px)', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
        <div style={{ marginTop: 'clamp(8px,1vw,12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ height: 1, width: 'clamp(20px,3vw,40px)', background: '#2a2a28' }} />
          <span style={{ fontSize: 'clamp(10px,1.2vw,12px)', fontWeight: 600, letterSpacing: '0.24em', color: '#444', textTransform: 'uppercase' }}>Device Setup</span>
          <div style={{ height: 1, width: 'clamp(20px,3vw,40px)', background: '#2a2a28' }} />
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 20, padding: 'clamp(28px,4vw,44px)', width: '100%', maxWidth: 'clamp(320px,44vw,480px)', animation: 'fadeUp 0.35s ease both' }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 'clamp(18px,2.4vw,24px)', color: C.white, marginBottom: 8 }}>Device Not Registered</div>
        <div style={{ fontSize: 'clamp(12px,1.4vw,14px)', color: '#777', lineHeight: 1.65, marginBottom: 'clamp(20px,3vh,28px)' }}>
          This kiosk needs a device token to connect to a Bercut branch. Get the token from your admin dashboard under <strong style={{ color: '#aaa' }}>Branches → Kiosk Devices</strong>.
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: 6 }}>Device Token</label>
          <input
            value={token}
            onChange={e => { setToken(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && !loading && handleRegister()}
            placeholder="e.g. BERCUT-XXX-XXXX-XXXX"
            style={{ width: '100%', padding: 'clamp(12px,1.8vh,16px) 14px', borderRadius: 10, border: '1.5px solid ' + (error ? '#ef5350' : '#2a2a28'), background: '#111', color: C.white, fontFamily: 'monospace', fontSize: 'clamp(13px,1.6vw,15px)', letterSpacing: '0.08em', boxSizing: 'border-box', outline: 'none' }}
          />
          {error && <div style={{ fontSize: 12, color: '#ef5350', marginTop: 7, lineHeight: 1.5 }}>{error}</div>}
        </div>

        <button
          onClick={handleRegister}
          disabled={loading}
          style={{ width: '100%', padding: 'clamp(14px,2vh,18px)', borderRadius: 12, background: loading ? '#2a2a28' : C.accent, color: loading ? '#555' : C.accentText, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(14px,1.8vw,16px)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s', marginTop: 4 }}>
          {loading ? 'Registering…' : 'Register Kiosk →'}
        </button>
      </div>

      {/* Mockup hint */}
      <div style={{ marginTop: 22, fontSize: 12, color: '#2a2a28', textAlign: 'center' }}>
        Mockup demo token: <span style={{ fontFamily: 'monospace', color: '#3a3a38' }}>{DEMO_TOKEN}</span>
      </div>
    </div>
  );
}

// ── Root Orchestrator ─────────────────────────────────────────────────────────
// Steps: 0=Welcome 1=Services 2=Barber 3=Time 4=Confirm 5=Done
// Used by KioskConfig live preview when demoPayment=true
const DEMO_BOOKING = { number: 'B042', name: 'Demo Guest', barber: 'Guntur', phone: null, total: 130000, groupItems: [] };

const STEP_LABELS = {
  1: 'Service Selection',
  2: 'Barber Selection',
  3: 'Time Slot',
  4: 'Confirm',
};

function KioskContent({ settings, initialStep = 0, demoPayment = false }) {
  const branchName = localStorage.getItem('kiosk_branch_name') || 'Bercut';
  const [step, setStep] = useState(initialStep);
  const [cart, setCart] = useState([]);
  const [ownColorToggles, setOwnColorToggles] = useState({});
  const [barber, setBarber] = useState(null);
  const [slot, setSlot] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("08123456789"); // demo: shows loyalty points example (Budi Santoso, 15 pts)
  const [selectedBeverages, setSelectedBeverages] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellExtras, setUpsellExtras] = useState([]);
  const [paymentPending, setPaymentPending] = useState(demoPayment);
  const [activeBooking, setActiveBooking] = useState(demoPayment ? DEMO_BOOKING : null);
  const [staffPanelOpen, setStaffPanelOpen] = useState(false);
  const [barberPanelOpen, setBarberPanelOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [group, setGroup] = useState([]);
  const [pointsRedeemed, setPointsRedeemed] = useState([]);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [cashTotal, setCashTotal] = useState(null);

  const [isOnline, setIsOnline]         = useState(navigator.onLine);
  const [idleCountdown, setIdleCountdown] = useState(null); // null = active; N = counting down
  const idleTimer   = useRef(null);
  const countTimer  = useRef(null);
  const paxOutLog   = useRef([]);
  const IDLE_SECS   = settings?.sessionTimeoutSecs ?? 60;
  const COUNT_SECS  = 15;

  // Online / offline detection
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Idle timeout — only active when user is in a booking flow (step > 0)
  const dismissIdle = () => {
    setIdleCountdown(null);
    clearTimeout(countTimer.current);
    resetIdleTimer();
  };

  const resetIdleTimer = () => {
    clearTimeout(idleTimer.current);
    if (step > 0 && !paymentPending) {
      idleTimer.current = setTimeout(() => {
        setIdleCountdown(COUNT_SECS);
      }, IDLE_SECS * 1000);
    }
  };

  useEffect(() => { resetIdleTimer(); return () => clearTimeout(idleTimer.current); }, [step, paymentPending]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (idleCountdown === null) return;
    if (idleCountdown <= 0) {
      if (step > 0) {
        const entry = {
          timestamp: new Date().toISOString(),
          step,
          stepLabel: STEP_LABELS[step] || 'Unknown',
          source: 'kiosk_timeout',
        };
        paxOutLog.current.push(entry);
        // Production: POST /api/pax-out { ...entry, branch_id }
        console.info('[Bercut] Pax out logged:', entry);
      }
      reset();
      return;
    }
    countTimer.current = setTimeout(() => setIdleCountdown(c => c - 1), 1000);
    return () => clearTimeout(countTimer.current);
  }, [idleCountdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const handleCornerTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 600);
    if (tapCount.current >= 3) { tapCount.current = 0; setStaffPanelOpen(true); }
  };

  const svcTotal = cart.reduce((s, id) => s + (SERVICES.find(x => x.id === id)?.price || 0), 0);
  const bevTotal = BEVERAGES.filter(b => selectedBeverages.includes(b.id)).reduce((s, b) => s + b.price, 0);
  const proTotal = PRODUCTS.filter(p => selectedProducts.includes(p.id)).reduce((s, p) => s + p.price, 0);
  const total = svcTotal + bevTotal + proTotal;

  const reset = () => {
    setStep(0); setCart([]); setBarber(null); setSlot(null);
    setName(""); setPhone(""); setGroup([]); setOwnColorToggles({}); setPointsRedeemed([]); setPointsUsed(0); setCashTotal(null);
    setSelectedBeverages([]); setSelectedProducts([]); setShowUpsell(false); setUpsellExtras([]);
  };

  const addAnother = () => {
    setGroup(g => [...g, {
      number: "B" + Math.floor(100 + Math.random() * 900),
      name,
      barber: barber?.name || "—",
      services: cart.map(id => SERVICES.find(x => x.id === id)?.name).join(", "),
      total,
    }]);
    setStep(1); setCart([]); setBarber(null); setSlot(null); setName(""); setPhone("");
    setOwnColorToggles({}); setSelectedBeverages([]); setSelectedProducts([]); setShowUpsell(false);
  };

  const openPayment = booking => {
    setActiveBooking(booking);
    setPaymentPending(true);
    setStaffPanelOpen(false);
    setBarberPanelOpen(false);
    setAdminPanelOpen(false);
  };

  // After service selection → check for upsell before proceeding to barber step
  const handleServicesNext = () => {
    const upsell = getUpsell(cart, settings);
    if (upsell) {
      if (upsell.type === "suggest") {
        const inCartExtras = cart.filter(id => {
          const s = SERVICES.find(x => x.id === id);
          return s && (s.cat === "Beard" || s.cat === "Treatment");
        });
        setUpsellExtras(inCartExtras);
      }
      setShowUpsell(true);
    }
    else setStep(2);
  };

  // onConfirm(finalCart, pkgId | null)
  // finalCart may include extras added in suggest phase
  // pkgId: if set, replace services with package
  const handleUpsellConfirm = (finalCart, pkgId) => {
    if (pkgId) {
      const keep = finalCart.filter(id => !["Haircut", "Beard", "Treatment", "Package"].includes(SERVICES.find(x => x.id === id)?.cat));
      setCart([...keep, pkgId]);
    } else {
      setCart(finalCart);
    }
    setShowUpsell(false);
    setUpsellExtras([]);
    setStep(2);
  };

  return (
    <div onClick={resetIdleTimer}>
      <GS />
      {!isOnline && <OfflineBanner />}
      {idleCountdown !== null && <IdleOverlay seconds={idleCountdown} onDismiss={dismissIdle} />}
      <div onClick={handleCornerTap} style={{ position: "fixed", top: 0, right: 0, width: 60, height: 60, zIndex: 500, WebkitTapHighlightColor: "transparent" }} />
      {showUpsell && <UpsellModal cart={cart} extras={upsellExtras} setExtras={setUpsellExtras} onConfirm={handleUpsellConfirm} onClose={() => setShowUpsell(false)} settings={settings} />}
      {staffPanelOpen && <StaffPanel onSelect={openPayment} onClose={() => setStaffPanelOpen(false)} />}
      {barberPanelOpen && <BarberPanel onClose={() => setBarberPanelOpen(false)} onHome={() => { setBarberPanelOpen(false); reset(); }} onPaymentTrigger={openPayment} />}
      {adminPanelOpen && <AdminPanel onClose={() => setAdminPanelOpen(false)} onHome={() => { setAdminPanelOpen(false); reset(); }} onPaymentTrigger={openPayment} />}
      {paymentPending && activeBooking && (
        <PaymentTakeover booking={activeBooking} pointsRedeemed={pointsRedeemed} pointsUsed={pointsUsed} cashTotal={cashTotal} onDone={() => { setPaymentPending(false); setActiveBooking(null); }} tipPresets={settings?.tipPresets} branchName={branchName} />
      )}
      <Topbar step={step} cartTotal={total} groupCount={group.length} onHome={reset} onBarberAccess={() => setBarberPanelOpen(true)} onAdminAccess={() => setAdminPanelOpen(true)} />
      {step === 0 && <Welcome onStart={() => setStep(1)} welcomeCta={settings?.welcomeCta} welcomeCtaId={settings?.welcomeCtaId} welcomeSubtitle={settings?.welcomeSubtitle} welcomeSubtitleId={settings?.welcomeSubtitleId} />}
      {step === 1 && <ServiceSelection cart={showUpsell ? [...cart, ...upsellExtras] : cart} setCart={setCart} washToggles={{}} setWashToggles={() => { }} ownColorToggles={ownColorToggles} setOwnColorToggles={setOwnColorToggles} onNext={handleServicesNext} onBack={() => {
        if (group.length > 0) { setStep(5); return; }
        const entry = { timestamp: new Date().toISOString(), step: 1, stepLabel: 'Service Selection', source: 'kiosk_back' };
        paxOutLog.current.push(entry);
        console.info('[Bercut] Pax out logged:', entry);
        // Production: POST /api/pax-out { ...entry, branch_id }
        setStep(0);
      }} categoryOrder={settings?.categoryOrder} svcOrderByCat={settings?.svcOrderByCat} serviceVisible={settings?.serviceVisible} />}
      {step === 2 && <BarberSelection barber={barber} setBarber={setBarber} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <TimeSlot barber={barber} slot={slot} setSlot={setSlot} selectedBeverages={selectedBeverages} setSelectedBeverages={setSelectedBeverages} selectedProducts={selectedProducts} setSelectedProducts={setSelectedProducts} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <Confirm cart={cart} services={SERVICES} barber={barber} slot={slot} beverages={selectedBeverages} products={selectedProducts} name={name} setName={setName} phone={phone} setPhone={setPhone} onConfirm={({ pointsRedeemed: pr, pointsUsed: pu, cashTotal: ct }) => { setPointsRedeemed(pr); setPointsUsed(pu); setCashTotal(ct); setStep(5); }} onBack={() => setStep(3)} />}
      {step === 5 && <QueueNumber cart={cart} services={SERVICES} barber={barber} slot={slot} name={name} phone={phone} group={group} pointsUsed={pointsUsed} onAddAnother={addAnother} onReset={reset} />}
    </div>
  );
}

export default function App(props) {
  const [registered, setRegistered] = useState(() => !!localStorage.getItem('kiosk_token'));
  if (!registered) return <DeviceSetup onRegistered={() => setRegistered(true)} />;
  return <KioskContent {...props} />;
}
