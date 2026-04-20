/**
 * MOCKUP — Bercut Kiosk: StaffPanel
 *
 * What it does: Staff-only slide-in panel (triggered by triple-tapping top-right corner).
 *   - Normal mode: tap a booking to open PaymentTakeover for that booking.
 *   - Group mode: select 2+ individual bookings, then tap "Group & Pay" to link them
 *     into a single group payment session. Staff use this when multiple customers arrive
 *     together and want to pay as one. Group formation calls POST /api/booking-groups.
 * State managed: onSelect (callback with booking object), onClose
 * Production API:
 *   GET /api/bookings?branch=seminyak&status=active
 *   POST /api/booking-groups { booking_ids: [] } — creates group, returns merged booking obj
 * Feeds into: PaymentTakeover (onSelect triggers payment overlay)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/payment/StaffPanel.jsx
 * Reference prompt: _ai/prompting-guide.md Section 03
 */

import { useState } from "react";
import { C, DEMO_QUEUE, fmt } from "./data.js";

export default function StaffPanel({ onSelect, onClose }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState([]); // array of booking numbers

  const toggleSelect = num => setSelected(s => s.includes(num) ? s.filter(x => x !== num) : [...s, num]);

  const handleGroupPay = () => {
    const bookings = DEMO_QUEUE.filter(b => selected.includes(b.number) && !b.groupItems);
    if (bookings.length < 2) return;
    // Build a merged booking: first booking is primary, rest become groupItems
    const [primary, ...rest] = bookings;
    const merged = {
      ...primary,
      groupItems: rest.map(b => ({ number: b.number, name: b.name, barber: b.barber, services: b.services, total: b.total, cartItems: b.cartItems || [] })),
    };
    setSelectMode(false);
    setSelected([]);
    onSelect(merged);
    // Production: POST /api/booking-groups { booking_ids: bookings.map(b => b.id) }
    //   → returns { group_id, merged_booking } → pass merged_booking to onSelect
  };

  const eligibleToGroup = DEMO_QUEUE.filter(b => !b.groupItems); // only ungrouped bookings can be linked

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:C.topBg, width:"clamp(300px,40vw,460px)", height:"100%", padding:"clamp(20px,3vw,28px)", display:"flex", flexDirection:"column", gap:16, boxShadow:"-4px 0 24px rgba(0,0,0,0.4)" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"clamp(10px,1.2vw,11px)", letterSpacing:"0.14em", color:"#555", textTransform:"uppercase", marginBottom:3 }}>Staff Panel</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(18px,2.4vw,24px)", fontWeight:800, color:C.white, lineHeight:1.1 }}>Active Queue</div>
            <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color: selectMode ? C.accent : "#666", marginTop:2 }}>
              {selectMode ? "Select bookings to group together" : "Select a booking to process payment"}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <button onClick={() => { setSelectMode(s => !s); setSelected([]); }}
              style={{ background: selectMode ? C.accent : "#1a1a18", color: selectMode ? C.accentText : "#888", border:`1px solid ${selectMode ? C.accent : "#2a2a28"}`, borderRadius:8, padding:"0 12px", height:36, fontSize:"clamp(11px,1.3vw,12px)", fontFamily:"'DM Sans',sans-serif", fontWeight:700, cursor:"pointer" }}>
              {selectMode ? "Cancel" : "Group Pay"}
            </button>
            <button onClick={onClose} style={{ background:"#1a1a18", color:"#888", border:"none", borderRadius:8, width:36, height:36, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
          </div>
        </div>

        {/* Queue list */}
        <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.12em", color:"#444", textTransform:"uppercase", marginBottom:12 }}>Active Queue</div>
          {DEMO_QUEUE.map((b,i) => {
            const isGroup        = b.groupItems && b.groupItems.length > 0;
            const groupTotal     = isGroup ? b.groupItems.reduce((s,x)=>s+x.total,0)+b.total : b.total;
            const allNames       = isGroup ? [...b.groupItems.map(x=>x.name), b.name] : [b.name];
            const allBarbers     = isGroup ? [...b.groupItems.map(x=>x.barber), b.barber] : [b.barber];
            const canSelect      = selectMode && !isGroup; // already-grouped bookings can't be re-grouped
            const isSelected     = selected.includes(b.number);
            const borderColor    = isSelected ? C.accent : isGroup ? "#3a3010" : "#2a2a28";
            return (
              <div key={b.number}
                onClick={() => canSelect ? toggleSelect(b.number) : (!selectMode && onSelect(b))}
                style={{ background: isSelected ? "#1a1a10" : "#1a1a18", border:`1.5px solid ${borderColor}`, borderRadius:12, padding:"clamp(12px,1.6vw,16px)", marginBottom:10, cursor: (canSelect || !selectMode) ? "pointer" : "default", animation:`fadeUp 0.25s ease ${i*0.06}s both`, transition:"all 0.15s" }}
                onMouseEnter={e=>{ if(!selectMode) e.currentTarget.style.borderColor=C.accent; }}
                onMouseLeave={e=>{ if(!selectMode) e.currentTarget.style.borderColor=isGroup?"#3a3010":"#2a2a28"; }}>

                {/* Selection checkbox (group mode) */}
                {selectMode && !isGroup && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${isSelected ? C.accent : "#444"}`, background: isSelected ? C.accent : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {isSelected && <span style={{ fontSize:12, fontWeight:900, color:C.accentText, lineHeight:1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:"clamp(10px,1.2vw,12px)", color: isSelected ? C.accent : "#555", fontWeight:600 }}>
                      {isSelected ? "Selected for group" : "Tap to select"}
                    </span>
                  </div>
                )}
                {selectMode && isGroup && (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#2a1a10", border:"1px solid #5a3a10", borderRadius:5, padding:"2px 8px", marginBottom:8 }}>
                    <span style={{ fontSize:"clamp(9px,1.1vw,10px)", fontWeight:700, color:"#c9a050" }}>Already grouped — cannot re-select</span>
                  </div>
                )}

                {/* Group badge */}
                {isGroup && !selectMode && (
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

        {/* Group action bar */}
        {selectMode && (
          <div style={{ flexShrink:0 }}>
            {selected.length >= 2 ? (
              <button onClick={handleGroupPay}
                style={{ width:"100%", padding:"clamp(14px,1.8vw,18px)", borderRadius:12, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.7vw,17px)", border:"none", cursor:"pointer", marginBottom:8 }}>
                Group {selected.length} Bookings & Pay →
              </button>
            ) : (
              <div style={{ background:"#111110", borderRadius:12, padding:"clamp(12px,1.6vw,16px)", textAlign:"center" }}>
                <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#555" }}>
                  {selected.length === 0
                    ? "Select 2 or more bookings to create a group payment"
                    : "Select 1 more booking to enable Group Pay"}
                </div>
                {selected.length === 1 && (
                  <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#444", marginTop:4 }}>
                    {DEMO_QUEUE.find(b => b.number === selected[0])?.name} selected
                  </div>
                )}
              </div>
            )}
            <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#333", textAlign:"center" }}>
              Group payment links bookings into one transaction. Points not available for grouped bookings.
            </div>
          </div>
        )}
        {!selectMode && (
          <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#333", textAlign:"center", flexShrink:0 }}>Triple-tap top-right corner to open · Tap "Group Pay" to link bookings</div>
        )}
      </div>
    </div>
  );
}
