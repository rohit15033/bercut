/**
 * MOCKUP — Bercut Kiosk: Details
 *
 * What it does: Step 4 — collects customer name and WhatsApp number (with country code picker) before confirming the booking.
 * State managed: name, setName, phone, setPhone, onNext, onBack
 * Production API: None — customer input only; no lookup needed
 * Feeds into: Confirm (step 5)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/screens/Details.jsx
 * Reference prompt: _ai/prompting-guide.md Section 03
 */

import { useState } from "react";
import { C, PINNED_COUNTRIES, ALL_COUNTRIES } from "./data.js";

// ── Country Code Picker (only used within Details) ────────────────────────────
function CountryPicker({ selected, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const filtered = ALL_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(q) || c.code.includes(q)
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:"clamp(16px,3vw,32px)" }} onClick={onClose}>
      <div className="si" style={{ background:C.white, borderRadius:18, width:"100%", maxWidth:"clamp(340px,50vw,480px)", maxHeight:"82vh", display:"flex", flexDirection:"column" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"clamp(16px,2vw,22px) clamp(16px,2vw,22px) 0", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(16px,2vw,20px)", fontWeight:700 }}>Select Country Code</div>
            <button onClick={onClose} style={{ background:C.surface2, border:"none", borderRadius:8, width:34, height:34, fontSize:18, cursor:"pointer", color:C.text2, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
          </div>
          {/* Search */}
          <input
            autoFocus
            value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Search country or code..."
            style={{ width:"100%", padding:"clamp(10px,1.4vh,14px) 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:"clamp(14px,1.7vw,16px)", fontFamily:"'DM Sans',sans-serif", marginBottom:12, background:C.bg }}
            onFocus={e=>e.target.style.borderColor=C.topBg}
            onBlur={e=>e.target.style.borderColor=C.border}
          />
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"0 clamp(12px,1.6vw,18px) clamp(12px,1.6vw,18px)" }}>

          {/* Pinned — only show when not searching */}
          {!query && (
            <>
              <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted, marginBottom:8 }}>Suggested</div>
              {PINNED_COUNTRIES.map(c => (
                <button key={c.name} onClick={()=>{ onSelect(c); onClose(); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"clamp(10px,1.4vh,14px) 12px", borderRadius:10, border:`1.5px solid ${selected.code===c.code && selected.name===c.name ? C.topBg : "transparent"}`, background:selected.code===c.code && selected.name===c.name ? C.surface : "transparent", cursor:"pointer", marginBottom:4, transition:"background 0.12s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                  onMouseLeave={e=>e.currentTarget.style.background=selected.name===c.name?C.surface:"transparent"}>
                  <span style={{ fontSize:"clamp(22px,3vw,28px)", lineHeight:1, flexShrink:0 }}>{c.flag}</span>
                  <span style={{ fontWeight:600, fontSize:"clamp(13px,1.5vw,15px)", flex:1, textAlign:"left" }}>{c.name}</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.5vw,15px)", color:C.muted }}>{c.code}</span>
                  {selected.name===c.name && <span style={{ color:C.topBg, fontWeight:800, fontSize:14 }}>✓</span>}
                </button>
              ))}
              <div style={{ height:1, background:C.border, margin:"8px 0 12px" }}/>
              <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted, marginBottom:8 }}>All Countries</div>
            </>
          )}

          {/* All / filtered */}
          {(query ? filtered : ALL_COUNTRIES).map(c => (
            <button key={c.name} onClick={()=>{ onSelect(c); onClose(); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"clamp(10px,1.4vh,14px) 12px", borderRadius:10, border:`1.5px solid ${selected.name===c.name?C.topBg:"transparent"}`, background:selected.name===c.name?C.surface:"transparent", cursor:"pointer", marginBottom:4, transition:"background 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surface}
              onMouseLeave={e=>e.currentTarget.style.background=selected.name===c.name?C.surface:"transparent"}>
              <span style={{ fontSize:"clamp(22px,3vw,28px)", lineHeight:1, flexShrink:0 }}>{c.flag}</span>
              <span style={{ fontWeight:600, fontSize:"clamp(13px,1.5vw,15px)", flex:1, textAlign:"left" }}>{c.name}</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.5vw,15px)", color:C.muted }}>{c.code}</span>
              {selected.name===c.name && <span style={{ color:C.topBg, fontWeight:800, fontSize:14 }}>✓</span>}
            </button>
          ))}
          {query && filtered.length===0 && (
            <div style={{ textAlign:"center", padding:"32px 0", color:C.muted, fontSize:"clamp(13px,1.5vw,15px)" }}>No countries found for "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Customer Details (mandatory) ──────────────────────────────────────
export default function Details({ name, setName, phone, setPhone, onNext, onBack }) {
  const [country, setCountry]         = useState(PINNED_COUNTRIES[0]); // default Indonesia
  const [showPicker, setShowPicker]   = useState(false);
  const [localPhone, setLocalPhone]   = useState("");

  // Sync full phone to parent whenever country or local number changes
  const handlePhoneChange = (val) => {
    setLocalPhone(val);
    setPhone(country.code + val.replace(/^0+/, ""));
  };
  const handleCountrySelect = (c) => {
    setCountry(c);
    setPhone(c.code + localPhone.replace(/^0+/, ""));
  };

  const valid = name.trim().length >= 2 && localPhone.trim().length >= 6;

  return (
    <>
      {showPicker && <CountryPicker selected={country} onSelect={handleCountrySelect} onClose={()=>setShowPicker(false)}/>}
      <div className="scroll-y" style={{ height:"calc(100vh - clamp(51px,6.5vh,63px))", display:"flex", alignItems:"center", justifyContent:"center", padding:"clamp(16px,3vw,40px)" }}>
        <div className="fu" style={{ width:"100%", maxWidth:"clamp(320px,52vw,500px)" }}>

          <div className="step-header" style={{ textAlign:"center", marginBottom:"clamp(24px,3vw,36px)" }}>
            <div className="step-eyebrow">Step 4 of 5</div>
            <h2 className="step-title">Your Details</h2>
            <div style={{ fontSize:"clamp(12px,1.4vw,14px)", color:C.muted, marginTop:6 }}>
              Required for your booking · Diperlukan untuk booking Anda
            </div>
          </div>

          {/* Name field */}
          <div style={{ marginBottom:"clamp(14px,2vw,20px)" }}>
            <label style={{ fontSize:"clamp(13px,1.5vw,15px)", fontWeight:700, display:"block", marginBottom:8, color:C.text }}>
              Name / Nama <span style={{ color:C.danger }}>*</span>
            </label>
            <input value={name} type="text" onChange={e=>setName(e.target.value)} placeholder="e.g. Rohit Sharma"
              style={{ width:"100%", padding:"clamp(14px,1.8vh,18px) 16px", borderRadius:12, border:`1.5px solid ${name.trim().length>0?C.topBg:C.border}`, fontSize:"clamp(15px,1.8vw,17px)", background:C.white, transition:"border 0.15s", fontFamily:"'DM Sans',sans-serif" }}
              onFocus={e=>e.target.style.borderColor=C.topBg}
              onBlur={e=>e.target.style.borderColor=name.trim().length>0?C.topBg:C.border}/>
          </div>

          {/* WhatsApp field with country selector */}
          <div style={{ marginBottom:"clamp(14px,2vw,20px)" }}>
            <label style={{ fontSize:"clamp(13px,1.5vw,15px)", fontWeight:700, display:"block", marginBottom:8, color:C.text }}>
              WhatsApp <span style={{ color:C.danger }}>*</span>
            </label>
            <div style={{ display:"flex", gap:8 }}>
              {/* Country code button */}
              <button onClick={()=>setShowPicker(true)}
                style={{ display:"flex", alignItems:"center", gap:"clamp(6px,0.8vw,8px)", padding:"clamp(14px,1.8vh,18px) clamp(10px,1.4vw,14px)", borderRadius:12, border:`1.5px solid ${C.border}`, background:C.white, cursor:"pointer", flexShrink:0, fontFamily:"'DM Sans',sans-serif", transition:"border 0.15s", whiteSpace:"nowrap" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.topBg}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <span style={{ fontSize:"clamp(20px,2.6vw,24px)", lineHeight:1 }}>{country.flag}</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.7vw,16px)", color:C.text }}>{country.code}</span>
                <span style={{ color:C.muted, fontSize:"clamp(10px,1.2vw,12px)" }}>▾</span>
              </button>
              {/* Number input */}
              <input value={localPhone} type="tel" onChange={e=>handlePhoneChange(e.target.value)} placeholder="812 3456 7890"
                style={{ flex:1, padding:"clamp(14px,1.8vh,18px) 16px", borderRadius:12, border:`1.5px solid ${localPhone.trim().length>0?C.topBg:C.border}`, fontSize:"clamp(15px,1.8vw,17px)", background:C.white, transition:"border 0.15s", fontFamily:"'DM Sans',sans-serif" }}
                onFocus={e=>e.target.style.borderColor=C.topBg}
                onBlur={e=>e.target.style.borderColor=localPhone.trim().length>0?C.topBg:C.border}/>
            </div>
            {/* Preview of full number */}
            {localPhone.trim().length > 0 && (
              <div style={{ marginTop:6, fontSize:"clamp(11px,1.3vw,13px)", color:C.muted }}>
                Full number: <span style={{ fontWeight:600, color:C.text2 }}>{country.code} {localPhone}</span>
              </div>
            )}
          </div>

          {/* Info cards */}
          <div style={{ display:"flex", flexDirection:"column", gap:"clamp(8px,1.2vw,10px)", marginBottom:"clamp(20px,2.6vw,28px)" }}>
            <div style={{ background:C.surface, borderRadius:10, padding:"clamp(10px,1.4vw,14px) clamp(12px,1.6vw,16px)", display:"flex", alignItems:"flex-start", gap:10 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>📣</span>
              <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:C.text2, lineHeight:1.6 }}>
                <strong>Your barber will call your name</strong> when it's your turn.<br/>
                <span style={{ color:C.muted }}>Kapster akan memanggil nama Anda saat giliran tiba.</span>
              </div>
            </div>
            <div style={{ background:C.surface, borderRadius:10, padding:"clamp(10px,1.4vw,14px) clamp(12px,1.6vw,16px)", display:"flex", alignItems:"flex-start", gap:10 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>📱</span>
              <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:C.text2, lineHeight:1.6 }}>
                <strong>WhatsApp</strong> is used for booking confirmation and exclusive promos.<br/>
                <span style={{ color:C.muted }}>Digunakan untuk konfirmasi dan informasi promo.</span>
              </div>
            </div>
          </div>

          <div style={{ display:"flex", gap:"clamp(8px,1.2vw,14px)" }}>
            <button className="btnG" onClick={onBack} style={{ width:"clamp(120px,16vw,160px)" }}>← Back</button>
            <button className="btnP" disabled={!valid} onClick={onNext}>
              {valid ? "Continue →" : "Fill in your details first"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
