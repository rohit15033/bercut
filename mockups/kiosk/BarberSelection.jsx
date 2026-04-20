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

// Pick the barber with fewest any-available assignments today; tiebreak by sort_order (id).
// Excludes clocked_out barbers. Matches backend logic: bookings.source='any_available' count.
function pickAnyAvailable(barbers) {
  const active = barbers.filter(b => b.status !== 'clocked_out');
  return [...active].sort((a, b) => {
    const diff = (a.anyAvailableToday ?? 0) - (b.anyAvailableToday ?? 0);
    return diff !== 0 ? diff : a.id - b.id;
  })[0];
}

export default function BarberSelection({ barber, setBarber, onNext, onBack }) {
  const isAnySelected = barber?.source === 'any_available';
  const assignedPreview = pickAnyAvailable(BARBERS); // for mockup preview pill only

  return (
    <div className="scroll-y" style={{ height:"calc(100vh - clamp(51px,6.5vh,63px))", padding:"clamp(16px,2.4vw,28px)" }}>
      <div className="step-header fu">
        <div className="step-eyebrow">Step 2 of 4 · Choose Barber</div>
        <h2 className="step-title">Choose Your Barber</h2>
        <div style={{ fontSize:"clamp(12px,1.4vw,14px)", color:"#88887E", marginTop:4 }}>Choose Your Barber · Pilih Barber Anda</div>
      </div>
      <div className="barber-grid-fluid" style={{ marginBottom:"clamp(12px,1.6vw,18px)" }}>
        {/* Any Available is null-sentinel — first card in grid */}
        {[null, ...BARBERS].map((b, i) => {
          const isAny = b === null;
          const data = isAny
            ? { id: 0, name: "Any Available", spec: "Fastest queue", specId: "Antrean tercepat", status: "available" }
            : b;
          const sel = isAny ? isAnySelected : (barber?.id === data.id && !isAnySelected);
          return (
            <div key={data.id} className={`fu card ${sel ? "sel" : ""}`}
              style={{ animationDelay:`${i * 0.05}s`, padding:"clamp(14px,1.8vw,20px)", cursor:"pointer", textAlign:"center" }}
              onClick={() => {
                if (isAny) {
                  // Assign barber with fewest any-available bookings today; tiebreak by sort_order (id)
                  const pick = pickAnyAvailable(BARBERS);
                  setBarber({ ...pick, source: 'any_available' });
                } else {
                  setBarber(b);
                }
              }}>
              {/* Avatar */}
              <div style={{ position:"relative", width:"clamp(64px,9vw,90px)", height:"clamp(64px,9vw,90px)", margin:`0 auto clamp(8px,1.2vw,12px)` }}>
                <svg width="100%" height="100%" viewBox="0 0 68 68">
                  <circle cx="34" cy="34" r="34" fill={sel ? C.accentText : C.surface2}/>
                  {isAny
                    ? <text x="34" y="44" textAnchor="middle" fontSize="26" fill={sel ? C.accent : C.topBg}>🎲</text>
                    : <text x="34" y="42" textAnchor="middle" fontSize="20" fontWeight="700" fill={sel ? C.accent : C.topBg} fontFamily="Inter,sans-serif">{data.name.slice(0,2).toUpperCase()}</text>
                  }
                </svg>
                {sel && <div style={{ position:"absolute", bottom:0, right:0, width:20, height:20, background:C.white, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:C.accentText }}>✓</div>}
              </div>
              {/* Name */}
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(15px,2vw,20px)", fontWeight:700, color:sel ? C.accentText : C.text, lineHeight:1.1, marginBottom:2 }}>{data.name}</div>
              <div style={{ fontSize:"clamp(10px,1.2vw,12px)", color:sel ? "#1a1a1888" : C.muted, marginBottom:"clamp(8px,1.2vw,12px)" }}>{data.spec}{data.specId ? ` · ${data.specId}` : ""}</div>
              {/* Stats — hidden for Any Available */}
              {!isAny && (
                <div style={{ display:"flex", justifyContent:"center", gap:"clamp(8px,1.2vw,14px)", marginBottom:"clamp(8px,1.2vw,12px)" }}>
                  <div><div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(13px,1.6vw,16px)", fontWeight:700, color:sel ? C.accentText : C.text }}>★ {data.rating}</div><div style={{ fontSize:"clamp(9px,1.1vw,11px)", color:sel ? "#1a1a1877" : C.muted }}>Rating</div></div>
                  <div style={{ width:1, background:sel ? "#1a1a1822" : C.border }}/>
                  <div><div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(13px,1.6vw,16px)", fontWeight:700, color:sel ? C.accentText : C.text }}>{data.cuts.toLocaleString()}</div><div style={{ fontSize:"clamp(9px,1.1vw,11px)", color:sel ? "#1a1a1877" : C.muted }}>Cuts</div></div>
                </div>
              )}
              {/* Next available pill — Any Available shows assigned barber's first slot (mockup preview) */}
              {isAny ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ background:sel ? "#1a1a1814" : C.surface, borderRadius:8, padding:"4px 10px" }}>
                    <span style={{ fontSize:"clamp(10px,1.2vw,12px)", color:sel ? C.accentText : C.muted }}>Next: </span>
                    <span style={{ fontSize:"clamp(11px,1.3vw,13px)", fontWeight:700, color:sel ? C.accentText : C.text }}>Now</span>
                  </div>
                  {/* Mockup-only preview: shows which barber round-robin would assign */}
                  <div style={{ fontSize:"clamp(9px,1vw,10px)", padding:"2px 7px", borderRadius:4,
                    background: sel ? "#1a1a1814" : "#EFF6FF", color: sel ? C.accentText : "#2563EB",
                    fontWeight:700, letterSpacing:"0.03em" }}>
                    {sel ? `→ ${assignedPreview.name}` : `Next: ${assignedPreview.name} (${assignedPreview.anyAvailableToday} today)`}
                  </div>
                </div>
              ) : (
                <div style={{ background:sel ? "#1a1a1814" : C.surface, borderRadius:8, padding:"4px 10px", display:"inline-block" }}>
                  <span style={{ fontSize:"clamp(10px,1.2vw,12px)", color:sel ? C.accentText : C.muted }}>Next: </span>
                  <span style={{ fontSize:"clamp(11px,1.3vw,13px)", fontWeight:700, color:sel ? C.accentText : C.text }}>{(data.slots||[])[0] || "—"}</span>
                </div>
              )}
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
