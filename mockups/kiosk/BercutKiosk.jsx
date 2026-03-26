import { useState, useEffect, useRef } from "react";
import { C, FONT, SERVICES, BEVERAGES, PRODUCTS, fmt } from "./data.js";
import Topbar           from "./components/Topbar.jsx";
import Welcome          from "./Welcome.jsx";
import ServiceSelection from "./ServiceSelection.jsx";
import BarberSelection  from "./BarberSelection.jsx";
import TimeSlot         from "./TimeSlot.jsx";
import Confirm          from "./Confirm.jsx";
import QueueNumber      from "./QueueNumber.jsx";
import PaymentTakeover  from "./PaymentTakeover.jsx";
import StaffPanel       from "./StaffPanel.jsx";

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
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
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
    .card-grid-fluid   { display:grid; grid-template-columns:repeat(auto-fill,minmax(clamp(200px,28vw,300px),1fr)); gap:clamp(10px,1.4vw,16px); }
    .barber-grid-fluid { display:grid; grid-template-columns:repeat(auto-fill,minmax(clamp(160px,20vw,220px),1fr)); gap:clamp(10px,1.4vw,16px); }
    .slot-grid         { display:flex; flex-wrap:wrap; gap:clamp(8px,1.2vw,14px); }
    .confirm-layout    { display:grid; grid-template-columns:1fr clamp(260px,30vw,340px); gap:clamp(16px,2vw,28px); }
    @media (max-width:900px) { .confirm-layout { grid-template-columns:1fr; } }

    .step-header { margin-bottom: clamp(18px,2.4vw,28px); }
    .step-eyebrow { font-size:clamp(11px,1.3vw,13px); color:${C.muted}; margin-bottom:4px; }
    .step-title { font-family:'Inter',sans-serif; font-size:clamp(26px,3.5vw,38px); font-weight:800; letter-spacing:-0.02em; line-height:1.1; }

    ::-webkit-scrollbar { width:3px; }
    ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
  `}</style>
);

// ── Upsell Modal ──────────────────────────────────────────────────────────────
// Triggered after service selection if upsell conditions are met.
// Meeting 2 rules:
//   Haircut only            → suggest beard + treatments
//   Haircut + Black Mask    → Mask Cut Package (id:16)
//   Haircut + Beard         → Prestige Package (id:17)
//   Haircut + Treatment(s), no beard, not ONLY black mask → Luxury Package (id:18)
//   Haircut + Beard + Treatment(s) → President Package (id:19)
//   Package already in cart → no upsell
function getUpsell(cart) {
  const catOf  = id => SERVICES.find(x=>x.id===id)?.cat;
  const cats   = cart.map(catOf);
  if (cats.includes("Package")) return null;
  const hasHaircut    = cats.includes("Haircut");
  if (!hasHaircut) return null;
  const hasBeard      = cats.includes("Beard");
  const hasTreatment  = cats.some(c=>c==="Treatment");
  const hasBlackMask  = cart.includes(13);
  if (hasBeard && hasTreatment) return { pkg: SERVICES.find(x=>x.id===19), type:"package" };
  if (hasTreatment && !hasBeard) return { pkg: SERVICES.find(x=>x.id===18), type:"package" };
  if (hasBeard)                  return { pkg: SERVICES.find(x=>x.id===17), type:"package" };
  if (hasBlackMask)              return { pkg: SERVICES.find(x=>x.id===16), type:"package" };
  return { type:"suggest" }; // haircut only → suggest beard / treatments
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
  16: [{id:1,  icon:"✂",  l:"Haircut"    },{id:13, icon:"🎭", l:"Black Mask"  },{id:null,icon:"🚿",l:"Wash",       bonus:true}],
  17: [{id:1,  icon:"✂",  l:"Haircut"    },{id:6,  icon:"🪒", l:"Beard Trim"  },{id:null,icon:"🚿",l:"Wash",       bonus:true}],
  18: [{id:1,  icon:"✂",  l:"Haircut"    },{id:13, icon:"🎭", l:"Black Mask"  },{id:9,   icon:"👃",l:"Nose Wax"   },{id:10,icon:"👂",l:"Ear Wax"},{id:15,icon:"🕯",l:"Ear Candle"},{id:14,icon:"💆",l:"Creambath"},{id:null,icon:"🚿",l:"Wash",bonus:true}],
  19: [{id:1,  icon:"✂",  l:"Haircut"    },{id:6,  icon:"🪒", l:"Beard"       },{id:13,  icon:"🎭",l:"Black Mask" },{id:9,  icon:"👃",l:"Nose Wax"},{id:10,icon:"👂",l:"Ear Wax"},{id:15,icon:"🕯",l:"Ear Candle"},{id:14,icon:"💆",l:"Creambath"},{id:null,icon:"🚿",l:"Wash",bonus:true}],
};

// Detect if a package chip is already satisfied by the cart (handles "any haircut" / "any beard" logic)
function chipInCart(chip, cart) {
  if (!chip.id) return false;
  const svc = SERVICES.find(x => x.id === chip.id);
  if (!svc) return false;
  if (svc.cat === "Haircut") return cart.some(id => SERVICES.find(x=>x.id===id)?.cat === "Haircut");
  if (svc.cat === "Beard")   return cart.some(id => SERVICES.find(x=>x.id===id)?.cat === "Beard");
  return cart.includes(chip.id);
}

// ── Upsell Modal ──────────────────────────────────────────────────────────────
// Multi-phase: "suggest" (interactive beard/treatment picker) → "package" (dynamic psychology offer)
// onConfirm(finalCart, pkgId | null) — pkgId means "swap services for this package"
function UpsellModal({ cart, onConfirm, onClose }) {
  const initUpsell = getUpsell(cart);
  const [phase,    setPhase]    = useState(initUpsell?.type === "package" ? "package" : "suggest");
  const [extras,   setExtras]   = useState([]);   // IDs selected in suggest phase
  const [workCart, setWorkCart] = useState(cart); // cart including any extras from suggest phase

  if (!initUpsell) { onConfirm(cart, null); return null; }

  const toggleExtra = id => setExtras(e => e.includes(id) ? e.filter(x=>x!==id) : [...e, id]);

  const handleSuggestProceed = () => {
    const merged  = [...new Set([...cart, ...extras])];
    const nu      = getUpsell(merged);
    if (nu?.type === "package") { setWorkCart(merged); setPhase("package"); }
    else onConfirm(merged, null);
  };

  // ── SUGGEST PHASE — pick beard / treatment services ───────────────────────
  if (phase === "suggest") {
    const beardSvcs     = SERVICES.filter(s => s.cat === "Beard");
    const treatmentSvcs = SERVICES.filter(s => s.cat === "Treatment");
    const miniCard = (s) => {
      const sel = extras.includes(s.id);
      return (
        <div key={s.id} onClick={()=>toggleExtra(s.id)}
          style={{ background:sel?C.accent:C.white, border:`1.5px solid ${sel?C.accent:C.border}`, borderRadius:12, padding:"clamp(10px,1.4vw,14px)", cursor:"pointer", minHeight:72, transition:"all 0.15s" }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(13px,1.6vw,15px)", fontWeight:700, color:sel?C.accentText:C.text }}>{s.name}</div>
          <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:sel?"rgba(17,17,16,0.55)":C.muted, marginTop:2 }}>{s.nameId}</div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
            <span style={{ fontSize:"clamp(10px,1.2vw,11px)", color:sel?"rgba(17,17,16,0.45)":C.muted }}>⏱ {s.dur} min</span>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(13px,1.6vw,16px)", fontWeight:800, color:sel?C.accentText:C.text }}>{fmt(s.price)}</span>
          </div>
          {sel && <div style={{ marginTop:5, fontSize:"clamp(9px,1.1vw,11px)", fontWeight:700, color:C.accentText, textAlign:"right" }}>✓ Added</div>}
        </div>
      );
    };
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:800, display:"flex", alignItems:"center", justifyContent:"center", padding:"clamp(16px,3vw,32px)" }} onClick={onClose}>
        <div className="si" style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:"clamp(400px,72vw,700px)", maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
          {/* Header */}
          <div style={{ background:C.topBg, padding:"clamp(14px,1.8vw,20px) clamp(20px,2.6vw,28px)", flexShrink:0 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:"clamp(17px,2.2vw,24px)", color:C.topText }}>💡 Complete the look</div>
            <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#aaa", marginTop:4 }}>You've added a haircut. Want to add beard or treatment services? · Lengkapi penampilan Anda</div>
          </div>
          {/* Scrollable body */}
          <div className="scroll-y" style={{ flex:1, padding:"clamp(14px,2vw,22px) clamp(16px,2.4vw,26px)" }}>
            <div style={{ marginBottom:"clamp(14px,1.8vw,20px)" }}>
              <div style={{ fontSize:"clamp(10px,1.2vw,12px)", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, marginBottom:"clamp(8px,1.2vw,12px)" }}>🪒 Beard · Jenggot</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(clamp(140px,18vw,200px),1fr))", gap:"clamp(8px,1.2vw,12px)" }}>
                {beardSvcs.map(miniCard)}
              </div>
            </div>
            <div>
              <div style={{ fontSize:"clamp(10px,1.2vw,12px)", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, marginBottom:"clamp(8px,1.2vw,12px)" }}>✨ Treatments · Perawatan</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(clamp(140px,18vw,200px),1fr))", gap:"clamp(8px,1.2vw,12px)" }}>
                {treatmentSvcs.map(miniCard)}
              </div>
            </div>
            {extras.length > 0 && (
              <div style={{ marginTop:"clamp(12px,1.6vw,16px)", background:"#fffde7", borderRadius:10, padding:"clamp(10px,1.4vw,14px)", fontSize:"clamp(11px,1.3vw,13px)", color:"#6B5E00", fontWeight:600 }}>
                💡 Selecting beard + treatments may unlock a package deal with bigger savings
              </div>
            )}
          </div>
          {/* Footer */}
          <div style={{ padding:"clamp(12px,1.6vw,18px) clamp(16px,2.4vw,26px)", borderTop:`1px solid ${C.border}`, flexShrink:0, display:"flex", flexDirection:"column", gap:8 }}>
            {extras.length > 0
              ? <button className="btnP" onClick={handleSuggestProceed}>Add {extras.length} service{extras.length>1?"s":""} & continue →</button>
              : <button className="btnP" onClick={()=>onConfirm(cart,null)}>Continue with Haircut only →</button>
            }
            <button className="btnG" onClick={()=>onConfirm(cart,null)} style={{ width:"100%", fontSize:"clamp(12px,1.4vw,14px)" }}>Skip · Lewati</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PACKAGE PHASE — dynamic psychology offer ──────────────────────────────
  const upsell    = getUpsell(workCart);
  const pkg       = upsell?.pkg;
  if (!pkg) { onConfirm(workCart, null); return null; }

  const pkgRetail  = PKG_RETAIL[pkg.id] || pkg.price;
  const savings    = pkgRetail - pkg.price;
  const cartTotal  = workCart.reduce((s,id)=>s+(SERVICES.find(x=>x.id===id)?.price||0),0);
  const extraCost  = pkg.price - cartTotal;
  const chips      = PKG_CHIPS[pkg.id] || [];
  // Dynamic headline based on cart vs package price
  const overPkg = cartTotal >= pkg.price;
  const pkgSave = overPkg ? cartTotal - pkg.price : 0;
  const headlineLine = overPkg
    ? (pkgSave > 0 ? "Paket ini lebih murah! · This package is cheaper!" : "Harga sama, dapat lebih · Same price, more services")
    : "Lebih hemat dengan paket · More value with a package";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:800, display:"flex", alignItems:"center", justifyContent:"center", padding:"clamp(16px,3vw,32px)" }} onClick={onClose}>
      <div className="si" style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:"clamp(360px,58vw,580px)", overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ background:C.topBg, padding:"clamp(14px,1.8vw,20px) clamp(20px,2.6vw,28px)", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:"clamp(17px,2.2vw,24px)", color:C.topText }}>✨ {headlineLine}</div>
            <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#aaa", marginTop:4 }}>{pkg.name} · {pkg.nameId}</div>
          </div>
          {pkg.badge && <div style={{ background:C.accent, color:C.accentText, fontSize:"clamp(10px,1.2vw,12px)", fontWeight:800, padding:"4px 10px", borderRadius:6, flexShrink:0, marginLeft:12, marginTop:2 }}>{pkg.badge}</div>}
        </div>
        <div style={{ padding:"clamp(16px,2.2vw,24px) clamp(20px,2.6vw,28px)" }}>
          {/* Visual price breakdown — 3 columns */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"clamp(6px,1vw,10px)", marginBottom:"clamp(14px,1.8vw,20px)", background:C.surface, borderRadius:12, padding:"clamp(12px,1.6vw,18px) clamp(14px,1.8vw,20px)", alignItems:"center" }}>
            {/* Col 1 */}
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:"clamp(9px,1.1vw,11px)", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, marginBottom:4 }}>
                {overPkg ? "Pilihan kamu" : "Kamu bayar sekarang"}
              </div>
              <div style={{ fontSize:"clamp(9px,1.1vw,11px)", color:C.muted, marginBottom:6 }}>
                {overPkg ? "Your selection" : "You're paying now"}
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(18px,2.4vw,26px)", fontWeight:900, color:C.text }}>{fmt(cartTotal)}</div>
            </div>
            {/* Divider arrow */}
            <div style={{ fontSize:"clamp(16px,2vw,22px)", color:C.border, userSelect:"none" }}>→</div>
            {/* Col 2 */}
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:"clamp(9px,1.1vw,11px)", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, marginBottom:4 }}>
                {overPkg ? "Harga paket" : "Bayar untuk paket"}
              </div>
              <div style={{ fontSize:"clamp(9px,1.1vw,11px)", color:C.muted, marginBottom:6 }}>
                {overPkg ? "Package price" : "Pay for package"}
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(18px,2.4vw,26px)", fontWeight:900, color:C.text }}>{fmt(pkg.price)}</div>
            </div>
          </div>
          {/* Savings callout — full width banner */}
          <div style={{ background:C.topBg, borderRadius:10, padding:"clamp(10px,1.4vw,14px) clamp(14px,1.8vw,18px)", marginBottom:"clamp(14px,1.8vw,20px)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:"clamp(10px,1.2vw,12px)", fontWeight:700, color:"#aaa", letterSpacing:"0.1em", textTransform:"uppercase" }}>Kamu hemat · You save</div>
              {!overPkg && <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#888", marginTop:2 }}>vs beli satuan · vs buying individually</div>}
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(22px,3vw,32px)", fontWeight:900, color:C.accent }}>{fmt(savings)}</div>
          </div>
          {/* Package chips — ✓ = already in cart, + = you'll gain */}
          <div style={{ marginBottom:"clamp(14px,1.8vw,20px)" }}>
            <div style={{ fontSize:"clamp(10px,1.2vw,12px)", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, marginBottom:10 }}>What's included · Yang termasuk</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"clamp(6px,0.8vw,8px)" }}>
              {chips.map(chip => {
                const have  = chipInCart(chip, workCart);
                const bonus = chip.bonus;
                return (
                  <span key={chip.l} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"5px clamp(8px,1.2vw,12px)", borderRadius:999, fontSize:"clamp(11px,1.3vw,13px)", fontWeight:600, background:have?C.topBg:(bonus?"#fff8cc":"#e8f5e9"), color:have?C.topText:(bonus?"#6B5E00":"#1a5c1a"), border:have?"none":`1px solid ${bonus?"#D4C800":"#a5d6a7"}` }}>
                    {chip.icon} {chip.l} {have?"✓":"+"}
                  </span>
                );
              })}
            </div>
          </div>
          {/* CTAs */}
          <button className="btnP" onClick={()=>onConfirm(workCart, pkg.id)} style={{ marginBottom:8 }}>
            {cartTotal >= pkg.price
              ? `✓ Switch to ${pkg.name} — ${fmt(pkg.price)}`
              : `✓ Upgrade to ${pkg.name} · +${fmt(extraCost)}`}
          </button>
          <button className="btnG" onClick={()=>onConfirm(workCart,null)} style={{ width:"100%", fontSize:"clamp(12px,1.4vw,14px)" }}>
            Keep my current selection · Pertahankan pilihan saya
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Root Orchestrator ─────────────────────────────────────────────────────────
// Steps: 0=Welcome 1=Services 2=Barber 3=Time 4=Confirm 5=Done
export default function App() {
  const [step, setStep]     = useState(0);
  const [cart, setCart]     = useState([]);
  const [ownColorToggles, setOwnColorToggles] = useState({});
  const [barber, setBarber] = useState(null);
  const [slot, setSlot]     = useState(null);
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [selectedBeverages, setSelectedBeverages] = useState([]);
  const [selectedProducts,  setSelectedProducts]  = useState([]);
  const [showUpsell, setShowUpsell]   = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [activeBooking, setActiveBooking]   = useState(null);
  const [staffPanelOpen, setStaffPanelOpen] = useState(false);
  const [group, setGroup]   = useState([]);

  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const handleCornerTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(()=>{ tapCount.current=0; }, 600);
    if (tapCount.current >= 3) { tapCount.current=0; setStaffPanelOpen(true); }
  };

  const svcTotal = cart.reduce((s,id)=>s+(SERVICES.find(x=>x.id===id)?.price||0),0);
  const bevTotal = BEVERAGES.filter(b=>selectedBeverages.includes(b.id)).reduce((s,b)=>s+b.price,0);
  const proTotal = PRODUCTS.filter(p=>selectedProducts.includes(p.id)).reduce((s,p)=>s+p.price,0);
  const total    = svcTotal + bevTotal + proTotal;

  const reset = () => {
    setStep(0); setCart([]); setBarber(null); setSlot(null);
    setName(""); setPhone(""); setGroup([]); setOwnColorToggles({});
    setSelectedBeverages([]); setSelectedProducts([]); setShowUpsell(false);
  };

  const addAnother = () => {
    setGroup(g=>[...g, {
      number:   "B" + Math.floor(100+Math.random()*900),
      name,
      barber:   barber?.name||"—",
      services: cart.map(id=>SERVICES.find(x=>x.id===id)?.name).join(", "),
      total,
    }]);
    setStep(1); setCart([]); setBarber(null); setSlot(null); setName(""); setPhone("");
    setOwnColorToggles({}); setSelectedBeverages([]); setSelectedProducts([]); setShowUpsell(false);
  };

  const openPayment = booking => {
    setActiveBooking(booking);
    setPaymentPending(true);
    setStaffPanelOpen(false);
  };

  // After service selection → check for upsell before proceeding to barber step
  const handleServicesNext = () => {
    if (getUpsell(cart)) setShowUpsell(true);
    else setStep(2);
  };

  // onConfirm(finalCart, pkgId | null)
  // finalCart may include extras added in suggest phase
  // pkgId: if set, replace services with package
  const handleUpsellConfirm = (finalCart, pkgId) => {
    if (pkgId) {
      const keep = finalCart.filter(id => !["Haircut","Beard","Treatment","Package"].includes(SERVICES.find(x=>x.id===id)?.cat));
      setCart([...keep, pkgId]);
    } else {
      setCart(finalCart);
    }
    setShowUpsell(false);
    setStep(2);
  };

  return (
    <>
      <GS/>
      <div onClick={handleCornerTap} style={{ position:"fixed", top:0, right:0, width:60, height:60, zIndex:500, WebkitTapHighlightColor:"transparent" }}/>
      {showUpsell && <UpsellModal cart={cart} onConfirm={handleUpsellConfirm} onClose={()=>handleUpsellConfirm(cart,null)}/>}
      {staffPanelOpen && <StaffPanel onSelect={openPayment} onClose={()=>setStaffPanelOpen(false)}/>}
      {paymentPending && activeBooking && (
        <PaymentTakeover booking={activeBooking} onDone={()=>{ setPaymentPending(false); setActiveBooking(null); }}/>
      )}
      <Topbar step={step} cartTotal={total} groupCount={group.length}/>
      {step===0 && <Welcome onStart={()=>setStep(1)}/>}
      {step===1 && <ServiceSelection cart={cart} setCart={setCart} washToggles={{}} setWashToggles={()=>{}} ownColorToggles={ownColorToggles} setOwnColorToggles={setOwnColorToggles} onNext={handleServicesNext} onBack={()=>{ group.length>0?setStep(5):setStep(0); }}/>}
      {step===2 && <BarberSelection  barber={barber} setBarber={setBarber} onNext={()=>setStep(3)} onBack={()=>setStep(1)}/>}
      {step===3 && <TimeSlot         barber={barber} slot={slot} setSlot={setSlot} selectedBeverages={selectedBeverages} setSelectedBeverages={setSelectedBeverages} selectedProducts={selectedProducts} setSelectedProducts={setSelectedProducts} onNext={()=>setStep(4)} onBack={()=>setStep(2)}/>}
      {step===4 && <Confirm          cart={cart} services={SERVICES} barber={barber} slot={slot} beverages={selectedBeverages} products={selectedProducts} name={name} setName={setName} phone={phone} setPhone={setPhone} onConfirm={()=>setStep(5)} onBack={()=>setStep(3)}/>}
      {step===5 && <QueueNumber      cart={cart} services={SERVICES} barber={barber} slot={slot} name={name} phone={phone} group={group} onAddAnother={addAnother} onReset={reset}/>}
    </>
  );
}
