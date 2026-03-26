/**
 * MOCKUP — Bercut Kiosk: Confirm
 *
 * What it does: Step 4 (merged with former Details) — collects name + optional WhatsApp,
 *   shows order summary with TOTAL (not estimated), floor plan with assigned chair,
 *   and confirms the reservasi.
 * State managed: cart, services, barber, slot, beverages, products,
 *   name, setName, phone, setPhone, onConfirm, onBack
 * Production API: POST /api/bookings
 * Feeds into: QueueNumber (step 5 — reservasi confirmed)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/screens/Confirm.jsx
 * Reference prompt: _ai/prompting-guide.md Section 03
 */

import { useState } from "react";
import { C, BEVERAGES, PRODUCTS, fmt } from "./data.js";

// Simple floor plan placeholder — highlights the barber's assigned chair
function FloorPlan({ chairLabel }) {
  const chairs = ["A1","A2","B1","B2","C1","C2","D1","D2"];
  return (
    <div style={{ background:C.surface, borderRadius:12, padding:"clamp(12px,1.6vw,16px)", marginTop:"clamp(10px,1.4vw,14px)" }}>
      <div style={{ fontSize:"clamp(10px,1.2vw,12px)", fontWeight:700, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", marginBottom:10 }}>Floor Plan · Denah Lantai</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"clamp(6px,0.8vw,8px)" }}>
        {chairs.map(c => (
          <div key={c}
            style={{ background:c===chairLabel?C.topBg:C.white, border:`2px solid ${c===chairLabel?C.topBg:C.border}`, borderRadius:8, padding:"clamp(8px,1.2vw,10px) 0", textAlign:"center", transition:"all 0.2s" }}>
            <div style={{ fontSize:"clamp(16px,2vw,20px)", marginBottom:2 }}>💈</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(11px,1.3vw,13px)", fontWeight:700, color:c===chairLabel?C.topText:C.muted }}>{c}</div>
          </div>
        ))}
      </div>
      {chairLabel && chairLabel !== "—" && (
        <div style={{ marginTop:10, fontSize:"clamp(11px,1.3vw,13px)", color:C.text2 }}>
          ✂ Your assigned chair: <strong>{chairLabel}</strong> · Kursi Anda
        </div>
      )}
    </div>
  );
}

export default function Confirm({ cart, services, barber, slot, beverages=[], products=[], name, setName, phone, setPhone, onConfirm, onBack }) {
  const [waConsent, setWaConsent] = useState(false);

  const svcTotal  = cart.reduce((s,id)=>s+(services.find(x=>x.id===id)?.price||0),0);
  const bevTotal  = BEVERAGES.filter(b=>beverages.includes(b.id)).reduce((s,b)=>s+b.price,0);
  const proTotal  = PRODUCTS.filter(p=>products.includes(p.id)).reduce((s,p)=>s+p.price,0);
  const total     = svcTotal + bevTotal + proTotal;
  const dur       = cart.reduce((s,id)=>s+(services.find(x=>x.id===id)?.dur||0),0);
  const valid     = name.trim().length >= 2;

  return (
    <div className="scroll-y" style={{ height:"calc(100vh - clamp(51px,6.5vh,63px))", padding:"clamp(16px,2.4vw,28px)" }}>
      <div className="step-header fu">
        <div className="step-eyebrow">Step 4 of 4 · Confirm</div>
        <h2 className="step-title">Confirm Your Reservation</h2>
        <div style={{ fontSize:"clamp(12px,1.4vw,14px)", color:C.muted, marginTop:4 }}>Confirm Reservation · Konfirmasi Reservasi</div>
      </div>

      <div className="confirm-layout">
        {/* LEFT — order summary + floor plan */}
        <div>
          {/* Order Summary */}
          <div className="fu" style={{ animationDelay:"0.06s", background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"clamp(14px,2vw,22px)" }}>
            <div style={{ fontSize:"clamp(10px,1.2vw,12px)", fontWeight:700, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Order Summary · Ringkasan Reservasi</div>

            {/* Services */}
            {cart.map(id=>{
              const s=services.find(x=>x.id===id);
              return (
                <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"clamp(10px,1.4vh,13px) 0", borderBottom:`1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize:"clamp(13px,1.6vw,16px)", fontWeight:600 }}>{s.name}</div>
                    <div style={{ fontSize:"clamp(10px,1.2vw,12px)", color:C.muted }}>{s.nameId} · {s.dur} min</div>
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(15px,2vw,20px)", fontWeight:700 }}>{fmt(s.price)}</div>
                </div>
              );
            })}

            {/* Beverages */}
            {beverages.length > 0 && BEVERAGES.filter(b=>beverages.includes(b.id)).map(b=>(
              <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"clamp(8px,1.2vh,11px) 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:"clamp(13px,1.6vw,15px)", color:C.text2 }}>{b.icon} {b.name}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(13px,1.6vw,15px)", fontWeight:600 }}>{fmt(b.price)}</div>
              </div>
            ))}

            {/* Products */}
            {products.length > 0 && PRODUCTS.filter(p=>products.includes(p.id)).map(p=>(
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"clamp(8px,1.2vh,11px) 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:"clamp(13px,1.6vw,15px)", color:C.text2 }}>{p.icon} {p.name}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(13px,1.6vw,15px)", fontWeight:600 }}>{fmt(p.price)}</div>
              </div>
            ))}

            {/* Booking details */}
            {[["Barber",barber?.name],["Time / Waktu",slot],["Chair / Kursi",barber?.chair||"—"],["Duration / Durasi",`${dur} min`]].map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"clamp(8px,1.2vh,11px) 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:"clamp(12px,1.4vw,14px)", color:C.muted }}>{k}</span>
                <span style={{ fontSize:"clamp(12px,1.4vw,14px)", fontWeight:600 }}>{v}</span>
              </div>
            ))}

            {/* TOTAL — not "estimated" */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:14, marginBottom:12 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(15px,2vw,20px)", fontWeight:800 }}>TOTAL</div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(20px,2.8vw,30px)", fontWeight:800 }}>{fmt(total)}</span>
            </div>
            {/* Pay after service — directly under total */}
            <div style={{ display:"flex", alignItems:"center", gap:10, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
              <span style={{ fontSize:16, flexShrink:0 }}>💳</span>
              <div>
                <div style={{ fontSize:"clamp(12px,1.4vw,14px)", fontWeight:700, color:C.text }}>Bayar setelah selesai · Pay after service</div>
                <div style={{ fontSize:"clamp(10px,1.2vw,12px)", color:C.muted }}>QRIS or BCA card — at the kiosk counter when done</div>
              </div>
            </div>
          </div>

          {/* Floor plan */}
          <div className="fu" style={{ animationDelay:"0.08s" }}>
            <FloorPlan chairLabel={barber?.chair} />
          </div>

        </div>

        {/* RIGHT — name + phone input + confirm */}
        <div>
          <div className="fu" style={{ animationDelay:"0.08s", background:C.white, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"clamp(16px,2.2vw,24px)", marginBottom:"clamp(12px,1.6vw,16px)" }}>
            <div style={{ fontSize:"clamp(10px,1.2vw,12px)", fontWeight:700, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", marginBottom:16 }}>Your Details · Detail Anda</div>

            {/* Name — required */}
            <div style={{ marginBottom:"clamp(14px,1.8vw,18px)" }}>
              <label style={{ fontSize:"clamp(13px,1.5vw,15px)", fontWeight:700, display:"block", marginBottom:7, color:C.text }}>
                Name / Nama <span style={{ color:C.danger }}>*</span>
              </label>
              <input value={name} type="text" onChange={e=>setName(e.target.value)} placeholder="e.g. Budi Santoso"
                style={{ width:"100%", padding:"clamp(13px,1.7vh,17px) 14px", borderRadius:11, border:`1.5px solid ${name.trim().length>0?C.topBg:C.border}`, fontSize:"clamp(14px,1.7vw,16px)", background:C.white, fontFamily:"'DM Sans',sans-serif" }}
                onFocus={e=>e.target.style.borderColor=C.topBg}
                onBlur={e=>e.target.style.borderColor=name.trim().length>0?C.topBg:C.border}
              />
            </div>

            {/* WhatsApp — optional */}
            <div style={{ marginBottom:"clamp(12px,1.6vw,16px)" }}>
              <label style={{ fontSize:"clamp(13px,1.5vw,15px)", fontWeight:700, display:"block", marginBottom:7, color:C.text }}>
                WhatsApp <span style={{ fontSize:"clamp(11px,1.3vw,13px)", fontWeight:400, color:C.muted }}>(Optional / Opsional)</span>
              </label>
              <input value={phone} type="tel" onChange={e=>setPhone(e.target.value)} placeholder="+62 812 3456 7890"
                style={{ width:"100%", padding:"clamp(13px,1.7vh,17px) 14px", borderRadius:11, border:`1.5px solid ${phone.trim().length>0?C.topBg:C.border}`, fontSize:"clamp(14px,1.7vw,16px)", background:C.white, fontFamily:"'DM Sans',sans-serif" }}
                onFocus={e=>e.target.style.borderColor=C.topBg}
                onBlur={e=>e.target.style.borderColor=phone.trim().length>0?C.topBg:C.border}
              />
            </div>

            {/* WhatsApp consent checkbox */}
            <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer" }} onClick={()=>setWaConsent(v=>!v)}>
              <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${waConsent?C.topBg:C.border}`, background:waConsent?C.topBg:C.white, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, transition:"all 0.15s" }}>
                {waConsent && <span style={{ color:C.white, fontSize:12, fontWeight:800 }}>✓</span>}
              </div>
              <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:C.text2, lineHeight:1.6 }}>
              Agree to receive booking confirmation, promotions, and points info via WhatsApp.<br/>
                <span style={{ color:C.muted }}>Setuju menerima konfirmasi reservasi, promo, dan informasi poin via WhatsApp.</span>
              </div>
            </label>
          </div>

          {/* Barber will call your name */}
          <div className="fu" style={{ animationDelay:"0.1s", background:C.surface, borderRadius:10, padding:"clamp(10px,1.4vw,14px) clamp(12px,1.6vw,16px)", marginBottom:"clamp(12px,1.6vw,16px)", display:"flex", alignItems:"flex-start", gap:10 }}>
            <span style={{ fontSize:18, flexShrink:0 }}>📣</span>
            <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:C.text2, lineHeight:1.6 }}>
              <strong>Your barber will call your name</strong> when it's your turn.<br/>
              <span style={{ color:C.muted }}>Barber Anda akan memanggil nama Anda saat giliran tiba.</span>
            </div>
          </div>

          <button className="btnP" disabled={!valid} onClick={()=>onConfirm()} style={{ fontSize:"clamp(15px,1.8vw,18px)", marginBottom:8, padding:"clamp(16px,2.2vh,20px)" }}>
            Confirm Reservation ✓
          </button>
          <button className="btnG" onClick={onBack} style={{ width:"100%" }}>← Back / Kembali</button>
        </div>
      </div>
    </div>
  );
}
