/**
 * MOCKUP — Bercut Kiosk: BarberSelection
 *
 * What it does: Step 2 — displays all barbers in a grid so the customer can pick one (or "Any Available").
 * State managed: barber (selected barber object or null), setBarber, onNext, onBack
 * Production API: GET /api/barbers?branch=seminyak (replaces BARBERS constant)
 * Feeds into: TimeSlot (step 3)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/screens/BarberSelection.jsx
 * Reference prompt: _ai/prompting-guide.md Section 03
 */

import { C, BARBERS } from "./data.js";

export default function BarberSelection({ barber, setBarber, onNext, onBack }) {
  return (
    <div className="scroll-y" style={{ height:"calc(100vh - clamp(51px,6.5vh,63px))", padding:"clamp(16px,2.4vw,28px)" }}>
      <div className="step-header fu">
        <div className="step-eyebrow">Step 2 of 4 · Choose Barber</div>
        <h2 className="step-title">Choose Your Barber</h2>
        <div style={{ fontSize:"clamp(12px,1.4vw,14px)", color:"#88887E", marginTop:4 }}>Choose Your Barber · Pilih Barber Anda</div>
      </div>
      {/* Any available — prominent primary option */}
      <div
        style={{ animationDelay:"0s", cursor:"pointer", marginBottom:"clamp(16px,2vw,24px)", borderRadius:16, overflow:"hidden", border:`3px solid ${barber?.id===0?C.topBg:C.border}`, background:barber?.id===0?C.topBg:C.white, transition:"all 0.18s", minHeight:80 }}
        onClick={()=>setBarber({id:0,name:"Any Available",spec:"Any available",slots:["09:00","09:30","10:00","10:30","11:00"],status:"available",chair:"—",nextAvailable:"Now"})}>
        <div style={{ padding:"clamp(16px,2.2vw,24px) clamp(20px,2.6vw,28px)", display:"flex", alignItems:"center", gap:"clamp(14px,1.8vw,20px)" }}>
          <div style={{ width:"clamp(52px,6.5vw,64px)", height:"clamp(52px,6.5vw,64px)", borderRadius:"50%", background:barber?.id===0?"#2a2a28":C.surface2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"clamp(22px,2.8vw,28px)", flexShrink:0 }}>⚡</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(18px,2.3vw,24px)", fontWeight:800, color:barber?.id===0?C.topText:C.text, marginBottom:3 }}>Any Available Barber</div>
            <div style={{ fontSize:"clamp(12px,1.4vw,14px)", color:barber?.id===0?"#aaa":C.muted }}>Fastest queue · Antrean tercepat</div>
          </div>
          <div style={{ background:barber?.id===0?C.accent:C.surface, borderRadius:10, padding:"clamp(6px,0.8vw,8px) clamp(10px,1.2vw,14px)", flexShrink:0 }}>
            <div style={{ fontSize:"clamp(10px,1.2vw,12px)", fontWeight:700, color:barber?.id===0?C.accentText:C.muted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Select</div>
          </div>
          {barber?.id===0 && <div style={{ width:28, height:28, background:C.accent, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:C.accentText }}>✓</div>}
        </div>
      </div>

      <div className="barber-grid-fluid" style={{ marginBottom:"clamp(12px,1.6vw,18px)" }}>
        {BARBERS.map((b,i) => {
          const sel = barber?.id===b.id;
          return (
            <div key={b.id} className={`fu card ${sel?"sel":""}`}
              style={{ animationDelay:`${i*0.05}s`, padding:"clamp(14px,1.8vw,20px)", cursor:"pointer", textAlign:"center" }}
              onClick={()=>setBarber(b)}>
              <div style={{ position:"relative", width:"clamp(52px,7vw,68px)", height:"clamp(52px,7vw,68px)", margin:`0 auto clamp(8px,1.2vw,12px)` }}>
                <svg width="100%" height="100%" viewBox="0 0 68 68">
                  <circle cx="34" cy="34" r="34" fill={sel?C.accentText:C.surface2}/>
                  <text x="34" y="42" textAnchor="middle" fontSize="20" fontWeight="700" fill={sel?C.accent:C.topBg} fontFamily="Inter,sans-serif">{b.name.slice(0,2).toUpperCase()}</text>
                </svg>
                {sel && <div style={{ position:"absolute", bottom:0, right:0, width:20, height:20, background:C.white, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:C.accentText }}>✓</div>}
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(15px,2vw,20px)", fontWeight:700, color:sel?C.accentText:C.text, lineHeight:1.1, marginBottom:2 }}>{b.name}</div>
              <div style={{ fontSize:"clamp(10px,1.2vw,12px)", color:sel?"#1a1a1888":C.muted, marginBottom:"clamp(8px,1.2vw,12px)" }}>{b.spec}</div>
              <div style={{ display:"flex", justifyContent:"center", gap:"clamp(8px,1.2vw,14px)", marginBottom:"clamp(8px,1.2vw,12px)" }}>
                <div><div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(13px,1.6vw,16px)", fontWeight:700, color:sel?C.accentText:C.text }}>★ {b.rating}</div><div style={{ fontSize:"clamp(9px,1.1vw,11px)", color:sel?"#1a1a1877":C.muted }}>Rating</div></div>
                <div style={{ width:1, background:sel?"#1a1a1822":C.border }}/>
                <div><div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(13px,1.6vw,16px)", fontWeight:700, color:sel?C.accentText:C.text }}>{b.cuts.toLocaleString()}</div><div style={{ fontSize:"clamp(9px,1.1vw,11px)", color:sel?"#1a1a1877":C.muted }}>Cuts</div></div>
              </div>
              <div style={{ background:sel?"#1a1a1814":C.surface, borderRadius:8, padding:"4px 10px", display:"inline-block" }}>
                <span style={{ fontSize:"clamp(10px,1.2vw,12px)", color:sel?C.accentText:C.muted }}>Next: </span>
                <span style={{ fontSize:"clamp(11px,1.3vw,13px)", fontWeight:700, color:sel?C.accentText:C.text }}>{(b.slots||[])[0] || "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:"clamp(8px,1.2vw,14px)" }}>
        <button className="btnG" onClick={onBack} style={{ width:"clamp(120px,16vw,180px)" }}>← Back</button>
        <button className="btnP" disabled={!barber} onClick={onNext}>Continue →</button>
      </div>
    </div>
  );
}
