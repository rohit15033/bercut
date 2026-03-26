/**
 * MOCKUP — Bercut Kiosk: Topbar
 *
 * What it does: Persistent top navigation bar. Logo click opens Admin/Barber access modal (PIN-protected).
 * State managed: step, cartTotal, groupCount, onAdminAccess, onBarberAccess
 * Production API: POST /api/auth/barber-pin (verify PIN server-side)
 * Feeds into: All screens (rendered on every screen by the orchestrator)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/components/Topbar.jsx
 * Reference prompt: _ai/prompting-guide.md Section 03
 */

import { useState, useEffect } from "react";
import { BERCUT_LOGO, C, fmt } from "../data.js";

// ── Access Modal (Admin / Barber login from kiosk) ────────────────────────────
function AccessModal({ onAdminAccess, onBarberAccess, onClose }) {
  const [view, setView]       = useState("choose"); // "choose" | "admin" | "barber"
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState("");

  const ADMIN_PIN  = "1234"; // placeholder — verified server-side in production
  const BARBER_PIN = "0000"; // placeholder

  const tryAccess = () => {
    if (view === "admin"  && pin === ADMIN_PIN)  { onAdminAccess();  onClose(); return; }
    if (view === "barber" && pin === BARBER_PIN) { onBarberAccess(); onClose(); return; }
    setError("PIN salah. Coba lagi."); // Wrong PIN
    setPin("");
  };

  const label = view === "admin" ? "Admin" : "Barber / Kapster";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:"clamp(320px,44vw,420px)", overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ background:C.topBg, padding:"clamp(16px,2vw,22px) clamp(20px,2.6vw,28px)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(16px,2vw,20px)", color:C.topText }}>
            {view === "choose" ? "Staff Access / Akses Staf" : `Login — ${label}`}
          </span>
          <button onClick={onClose} style={{ background:"#2a2a28", border:"none", borderRadius:8, width:32, height:32, color:"#888", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"clamp(20px,2.6vw,28px)" }}>
          {view === "choose" ? (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <button onClick={()=>setView("admin")}
                style={{ padding:"clamp(16px,2.2vw,22px)", borderRadius:14, background:C.topBg, color:C.white, fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(16px,2vw,20px)", border:"none", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:28 }}>🔑</span>
                <div><div>Admin</div><div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#888", fontWeight:400, marginTop:2 }}>Dashboard & settings</div></div>
              </button>
              <button onClick={()=>setView("barber")}
                style={{ padding:"clamp(16px,2.2vw,22px)", borderRadius:14, background:C.surface, color:C.text, fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(16px,2vw,20px)", border:`2px solid ${C.border}`, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:28 }}>✂</span>
                <div><div>Barber / Kapster</div><div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:C.muted, fontWeight:400, marginTop:2 }}>Clock in · Breaks · Queue</div></div>
              </button>
            </div>
          ) : (
            <div>
            <div style={{ fontSize:"clamp(13px,1.5vw,15px)", color:C.text2, marginBottom:16 }}>Enter PIN for {label}</div>
              <input
                type="password" inputMode="numeric" maxLength={6} value={pin}
                onChange={e=>{ setPin(e.target.value); setError(""); }}
                onKeyDown={e=>e.key==="Enter"&&tryAccess()}
                placeholder="● ● ● ●"
                autoFocus
                style={{ width:"100%", padding:"clamp(14px,1.8vw,18px) 16px", borderRadius:12, border:`2px solid ${error?C.danger:C.border}`, fontSize:"clamp(20px,2.6vw,26px)", fontFamily:"monospace", letterSpacing:"0.3em", textAlign:"center", background:C.bg, marginBottom:8 }}
              />
              {error && <div style={{ color:C.danger, fontSize:"clamp(12px,1.4vw,14px)", marginBottom:12 }}>{error}</div>}
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <button onClick={()=>{ setView("choose"); setPin(""); setError(""); }}
                  style={{ flex:1, padding:"clamp(12px,1.6vw,16px)", borderRadius:10, background:C.surface, color:C.text2, border:`1.5px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(14px,1.6vw,16px)", cursor:"pointer" }}>
                  ← Back / Kembali
                </button>
                <button onClick={tryAccess} disabled={pin.length < 4}
                  style={{ flex:2, padding:"clamp(12px,1.6vw,16px)", borderRadius:10, background:pin.length>=4?C.topBg:C.surface2, color:pin.length>=4?C.white:C.muted, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.6vw,16px)", border:"none", cursor:pin.length>=4?"pointer":"not-allowed" }}>
                  Login / Masuk →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Topbar({ step, cartTotal, groupCount, onAdminAccess, onBarberAccess }) {
  const [time, setTime] = useState(new Date());
  const [showAccess, setShowAccess] = useState(false);
  useEffect(() => { const t = setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(t); }, []);
  const steps = ["Services","Barber","Time","Confirm"];

  return (
    <>
      {showAccess && (
        <AccessModal
          onAdminAccess={onAdminAccess||(() => alert("Admin view — coming soon"))}
          onBarberAccess={onBarberAccess||(() => alert("Barber panel — coming soon"))}
          onClose={()=>setShowAccess(false)}
        />
      )}
      <div style={{ background:C.topBg, userSelect:"none" }}>
      <div style={{ padding:"0 clamp(16px,3vw,28px)", display:"flex", alignItems:"center", justifyContent:"space-between", height:"clamp(48px,6vh,60px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>setShowAccess(true)}>
          <img src={BERCUT_LOGO} alt="Bercut" style={{ height:"clamp(24px,3.2vh,34px)", width:"auto", objectFit:"contain" }}/>
          <span style={{ color:"#555", fontSize:"clamp(11px,1.3vw,13px)" }}>Seminyak</span>
        </div>

        {step > 0 && step < 5 && (
          <div style={{ display:"flex", gap:"clamp(4px,0.8vw,8px)", alignItems:"center" }}>
            {steps.map((s,i) => (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:"clamp(3px,0.5vw,5px)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"clamp(3px,0.5vw,5px)", opacity:i+1<=step?1:0.3, transition:"opacity 0.3s" }}>
                  <div style={{ width:"clamp(18px,2.2vw,22px)", height:"clamp(18px,2.2vw,22px)", borderRadius:"50%", background:i+1<step?C.accent:i+1===step?C.white:"transparent", border:`1.5px solid ${i+1<=step?C.accent:"#333"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"clamp(8px,1vw,10px)", fontWeight:700, color:i+1<step?C.accentText:i+1===step?C.topBg:"#555", transition:"all 0.3s", flexShrink:0 }}>{i+1<step?"✓":i+1}</div>
                  <span style={{ fontSize:"clamp(9px,1.1vw,11px)", fontWeight:i+1===step?700:400, color:i+1===step?C.white:"#555" }}>{s}</span>
                </div>
                {i<3 && <span style={{ color:"#333", fontSize:10 }}>›</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:"clamp(8px,1.2vw,16px)" }}>
          {cartTotal > 0 && step > 0 && step < 5 && (
            <div style={{ background:"#1a1a18", padding:"5px clamp(8px,1.2vw,12px)", borderRadius:7 }}>
              <span style={{ color:C.accent, fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,16px)" }}>{fmt(cartTotal)}</span>
              {groupCount > 0 && <span style={{ color:"#888", fontSize:"clamp(10px,1.2vw,12px)", marginLeft:6 }}>{groupCount+1} people</span>}
            </div>
          )}
          <span style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#555" }}>{time.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</span>
        </div>
      </div>
      {step > 0 && step < 5 && (
        <div style={{ display:"flex", gap:2 }}>
          {[1,2,3,4].map(i=><div key={i} style={{ flex:1, height:3, background:i<=step?C.accent:"#222", transition:"background 0.4s" }}/>)}
        </div>
      )}
      </div>
    </>
  );
}
