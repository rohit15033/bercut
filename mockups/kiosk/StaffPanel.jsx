/**
 * MOCKUP — Bercut Kiosk: StaffPanel
 *
 * What it does: Staff-only slide-in panel (triggered by triple-tapping top-right corner) showing active queue with booking details; tapping a row opens PaymentTakeover for that booking.
 * State managed: onSelect (callback with booking object), onClose
 * Production API: GET /api/bookings?branch=seminyak&status=active (replaces DEMO_QUEUE)
 * Feeds into: PaymentTakeover (onSelect triggers payment overlay)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/payment/StaffPanel.jsx
 * Reference prompt: _ai/prompting-guide.md Section 03
 */

import { C, DEMO_QUEUE, fmt } from "./data.js";

export default function StaffPanel({ onSelect, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:C.topBg, width:"clamp(300px,40vw,460px)", height:"100%", padding:"clamp(20px,3vw,28px)", display:"flex", flexDirection:"column", gap:16, boxShadow:"-4px 0 24px rgba(0,0,0,0.4)" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"clamp(10px,1.2vw,11px)", letterSpacing:"0.14em", color:"#555", textTransform:"uppercase", marginBottom:3 }}>Staff Panel</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(18px,2.4vw,24px)", fontWeight:800, color:C.white, lineHeight:1.1 }}>Active Queue</div>
            <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#666", marginTop:2 }}>Select a booking to process payment</div>
          </div>
          <button onClick={onClose} style={{ background:"#1a1a18", color:"#888", border:"none", borderRadius:8, width:36, height:36, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>
        </div>

        {/* Queue list */}
        <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.12em", color:"#444", textTransform:"uppercase", marginBottom:12 }}>Active Queue</div>
          {DEMO_QUEUE.map((b,i) => {
            const isGroup    = b.groupItems && b.groupItems.length > 0;
            const groupTotal = isGroup ? b.groupItems.reduce((s,x)=>s+x.total,0)+b.total : b.total;
            const allNames   = isGroup ? [...b.groupItems.map(x=>x.name), b.name] : [b.name];
            const allBarbers = isGroup ? [...b.groupItems.map(x=>x.barber), b.barber] : [b.barber];
            return (
              <div key={b.number} onClick={()=>onSelect(b)}
                style={{ background:"#1a1a18", border:`1.5px solid ${isGroup?"#3a3010":"#2a2a28"}`, borderRadius:12, padding:"clamp(12px,1.6vw,16px)", marginBottom:10, cursor:"pointer", animation:`fadeUp 0.25s ease ${i*0.06}s both` }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=isGroup?"#3a3010":"#2a2a28"}>

                {/* Group badge */}
                {isGroup && (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#2a2010", border:"1px solid #c9a050", borderRadius:5, padding:"2px 8px", marginBottom:8 }}>
                    <span style={{ fontSize:"clamp(9px,1.1vw,10px)", fontWeight:700, letterSpacing:"0.1em", color:"#c9a050" }}>GROUP · {allNames.length} PEOPLE</span>
                  </div>
                )}

                {/* Name(s) + total — flex with proper wrapping */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:6 }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    {isGroup ? (
                      allNames.map((n,j) => (
                        <div key={j} style={{ marginBottom:j<allNames.length-1?6:0 }}>
                          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(13px,1.7vw,16px)", fontWeight:800, color:C.white }}>✂ {allBarbers[j]}</div>
                          <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#888", marginTop:1 }}>{n}</div>
                        </div>
                      ))
                    ) : (
                      <div>
                        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(14px,1.9vw,18px)", fontWeight:800, color:C.white, lineHeight:1.2 }}>✂ {b.barber}</div>
                        <div style={{ fontSize:"clamp(12px,1.5vw,14px)", color:"#888", marginTop:2 }}>{b.name}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(14px,1.8vw,18px)", fontWeight:800, color:C.accent, flexShrink:0 }}>{fmt(groupTotal)}</div>
                </div>

                {/* Services */}
                <div style={{ fontSize:"clamp(10px,1.2vw,12px)", color:"#555", marginBottom:10, lineHeight:1.5 }}>
                  {isGroup
                    ? [...b.groupItems, b].map((x,j) => (
                        <div key={j} style={{ display:"flex", gap:6 }}>
                          <span style={{ color:"#444", flexShrink:0 }}>{x.name}:</span>
                          <span style={{ color:"#555", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{x.services}</span>
                        </div>
                      ))
                    : <span>{b.services}</span>
                  }
                </div>

                {/* CTA row */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {(isGroup ? [...b.groupItems.map(x=>x.number), b.number] : [b.number]).map(n => (
                      <span key={n} style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, color:"#333", background:"#111110", borderRadius:4, padding:"2px 7px" }}>#{n}</span>
                    ))}
                  </div>
                  <div style={{ background:C.accent, color:C.accentText, borderRadius:6, padding:"clamp(6px,0.8vh,8px) clamp(10px,1.4vw,14px)", fontSize:"clamp(11px,1.3vw,13px)", fontFamily:"'DM Sans',sans-serif", fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>
                    Process / Proses →
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#333", textAlign:"center", flexShrink:0 }}>Triple-tap top-right corner to open this panel.</div>
      </div>
    </div>
  );
}
