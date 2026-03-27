/**
 * MOCKUP — Bercut Kiosk: TimeSlot
 *
 * What it does: Step 3 — "Now" / "Next Available" as primary CTAs; slot grid as fallback;
 *   after time is selected shows beverages + products add-ons (optional).
 *   Shows auto-cancellation notice (15 min after confirmation).
 * State managed: barber, slot, setSlot, selectedBeverages, setSelectedBeverages,
 *   selectedProducts, setSelectedProducts, onNext, onBack
 * Production API: GET /api/slots?barberId=:id&date=today · GET /api/inventory?category=beverage,product&branch_id=
 * Feeds into: Confirm (step 4 — merged details + confirmation)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/screens/TimeSlot.jsx
 * Reference prompt: _ai/prompting-guide.md Section 03
 */

import { useEffect } from "react";
import { BEVERAGES, C, PRODUCTS, fmt } from "./data.js";

const STATUS_LABELS = {
  available: { text: "Available", canNow: true },
  busy: { text: "Busy", canNow: false },
  on_break: { text: "On Break", canNow: false },
  clocked_out: { text: "Clocked Out", canNow: false },
};

export default function TimeSlot({ barber, slot, setSlot, selectedBeverages, setSelectedBeverages, selectedProducts, setSelectedProducts, onNext, onBack }) {
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  const status = STATUS_LABELS[barber?.status] || STATUS_LABELS.available;
  const canNow = status.canNow;

  // Fix: Reset 'Now' if barber is busy/changed
  useEffect(() => {
    if (!canNow && slot === "Now") {
      setSlot(null);
    }
  }, [canNow, slot, setSlot]);

  const toggleBev = id => setSelectedBeverages(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const togglePro = id => setSelectedProducts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const extrasTotal = [
    ...BEVERAGES.filter(b => selectedBeverages.includes(b.id)),
    ...PRODUCTS.filter(p => selectedProducts.includes(p.id)),
  ].reduce((s, x) => s + x.price, 0);

  return (
    <div className="scroll-y" style={{ height: "calc(100vh - clamp(51px,6.5vh,63px))", padding: "clamp(16px,2.4vw,28px)" }}>

      {/* Step header */}
      <div className="step-header fu">
        <div className="step-eyebrow">Step 3 of 4 · Pick Time</div>
        <h2 className="step-title">When Do You Want Your Cut?</h2>
        <div style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.muted, marginTop: 4 }}>{barber?.name} · {today} · Kapan Anda ingin dipotong?</div>
      </div>

      {/* ── TIME GRID — Now/Next as first cards, then specific slots ─────────── */}
      <div className="fu" style={{ animationDelay: "0.05s", marginBottom: "clamp(20px,3vw,32px)" }}>
        <div className="slot-grid">

          {/* NOW — first card */}
          <button onClick={() => canNow && setSlot("Now")}
            style={{
              padding: "clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)", borderRadius: 12,
              fontSize: "clamp(15px,2vw,20px)", fontFamily: "'Inter',sans-serif", fontWeight: 700,
              background: slot === "Now" ? C.topBg : canNow ? C.white : C.surface2,
              color: slot === "Now" ? C.white : canNow ? C.text : C.muted,
              border: `2px solid ${slot === "Now" ? C.topBg : canNow ? C.topBg : C.border}`,
              transition: "all 0.15s", minWidth: "clamp(80px,10vw,110px)", minHeight: "clamp(52px,7vh,64px)",
              cursor: canNow ? "pointer" : "not-allowed", opacity: canNow ? 1 : 0.6,
              animation: "fadeUp 0.28s ease 0s both",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
            }}>
            <span>Now ⚡</span>
            <span style={{ fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 400, color: slot === "Now" ? "rgba(255,255,255,0.7)" : canNow ? C.muted : C.muted }}>
              {canNow ? "Langsung" : status.text}
            </span>
          </button>

          {/* NEXT AVAILABLE — second card, only when Now is unavailable */}
          {!canNow && (
            <button onClick={() => setSlot(`Next: ${barber?.nextAvailable || "10:30"}`)}
              style={{
                padding: "clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)", borderRadius: 12,
                fontSize: "clamp(15px,2vw,20px)", fontFamily: "'Inter',sans-serif", fontWeight: 700,
                background: slot?.startsWith("Next:") ? C.topBg : C.white,
                color: slot?.startsWith("Next:") ? C.white : C.text,
                border: `2px solid ${slot?.startsWith("Next:") ? C.topBg : C.border}`,
                transition: "all 0.15s", minWidth: "clamp(80px,10vw,110px)", minHeight: "clamp(52px,7vh,64px)",
                animation: "fadeUp 0.28s ease 0.04s both",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              }}>
              <span>Next →</span>
              <span style={{ fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 400, color: slot?.startsWith("Next:") ? "rgba(255,255,255,0.7)" : C.muted }}>
                {barber?.nextAvailable || "10:30"}
              </span>
            </button>
          )}

          {/* Specific time slots */}
          {(barber?.slots || []).map((s, i) => (
            <button key={s} onClick={() => setSlot(s)}
              style={{
                padding: "clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)", borderRadius: 12,
                fontSize: "clamp(15px,2vw,20px)", fontFamily: "'Inter',sans-serif", fontWeight: 700,
                background: slot === s ? C.topBg : C.white, color: slot === s ? C.white : C.text,
                border: `2px solid ${slot === s ? C.topBg : C.border}`,
                transition: "all 0.15s", minWidth: "clamp(80px,10vw,110px)", minHeight: "clamp(52px,7vh,64px)",
                animation: `fadeUp 0.28s ease ${(i + (canNow ? 1 : 2)) * 0.04}s both`,
              }}>{s}</button>
          ))}
        </div>
      </div>

      {/* ── SELECTED TIME CONFIRMATION ──────────────────────────────────────── */}
      {slot && (
        <div className="si" style={{ background: C.accent, borderRadius: 14, padding: "clamp(12px,1.8vw,16px) clamp(18px,2.4vw,24px)", marginBottom: "clamp(18px,2.4vw,24px)", display: "flex", alignItems: "center", gap: "clamp(10px,1.4vw,16px)" }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(20px,2.8vw,30px)", fontWeight: 800, color: C.accentText }}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(15px,2vw,21px)", fontWeight: 700, color: C.accentText }}>Selected: {slot}</div>
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#1a1a1899" }}>{barber?.name} · {today}</div>
          </div>
          {/* Merged Disclaimer — only shown for future bookings, not 'Now' */}
          {slot !== "Now" && (
            <div style={{ borderLeft: "1.5px solid #11111015", paddingLeft: "clamp(12px,2.2vw,20px)", maxWidth: "clamp(140px,22vw,220px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 14 }}>⏱</span>
                <span style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 800, color: "#111110", textTransform: "uppercase", letterSpacing: "0.02em" }}>Auto-cancel in 15m</span>
              </div>
              <div style={{ fontSize: "clamp(9px,1.1vw,11px)", color: "#5a4a00", lineHeight: 1.3 }}>
                Arrive within 15 mins or booking is canceled.<br />
                <span style={{ opacity: 0.7 }}>Batal otomatis jika lewat 15 menit.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BEVERAGES + PRODUCTS (shown after slot selected) ────────────────── */}
      {slot && (
        <div className="fu" style={{ animationDelay: "0s", marginBottom: "clamp(20px,2.8vw,30px)" }}>
          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginBottom: "clamp(10px,1.4vw,14px)" }}>
            Add-ons · Minuman & Produk <span style={{ fontSize: "clamp(10px,1.2vw,11px)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(Optional / Opsional — pay at checkout)</span>
          </div>

          {/* Beverages */}
          <div style={{ fontSize: "clamp(11px,1.3vw,13px)", fontWeight: 700, color: C.text2, marginBottom: "clamp(8px,1.2vw,10px)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>☕</span> Beverages / Minuman
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "clamp(8px,1.2vw,12px)", marginBottom: "clamp(12px,1.6vw,16px)" }}>
            {BEVERAGES.map(b => {
              const sel = selectedBeverages.includes(b.id);
              return (
                <div key={b.id} onClick={() => toggleBev(b.id)}
                  style={{ background: sel ? C.topBg : C.white, border: `2px solid ${sel ? C.topBg : C.border}`, borderRadius: 12, padding: "clamp(12px,1.6vw,16px)", cursor: "pointer", textAlign: "center", transition: "all 0.15s", minHeight: 80 }}>
                  <div style={{ fontSize: "clamp(24px,3.2vw,32px)", marginBottom: 6 }}>{b.icon}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 700, color: sel ? C.white : C.text, lineHeight: 1.2, marginBottom: 3 }}>{b.name}</div>
                  <div style={{ fontSize: "clamp(10px,1.2vw,11px)", color: sel ? "#aaa" : C.muted, marginBottom: 4 }}>{b.desc}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 700, color: sel ? C.topText : C.text }}>{fmt(b.price)}</div>
                </div>
              );
            })}
          </div>

          {/* Products */}
          <div style={{ fontSize: "clamp(11px,1.3vw,13px)", fontWeight: 700, color: C.text2, marginBottom: "clamp(8px,1.2vw,10px)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🧴</span> Products / Produk
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "clamp(8px,1.2vw,12px)" }}>
            {PRODUCTS.map(p => {
              const sel = selectedProducts.includes(p.id);
              return (
                <div key={p.id} onClick={() => togglePro(p.id)}
                  style={{ background: sel ? C.topBg : C.white, border: `2px solid ${sel ? C.topBg : C.border}`, borderRadius: 12, padding: "clamp(12px,1.6vw,16px)", cursor: "pointer", textAlign: "center", transition: "all 0.15s", minHeight: 80 }}>
                  <div style={{ fontSize: "clamp(24px,3.2vw,32px)", marginBottom: 6 }}>{p.icon}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 700, color: sel ? C.white : C.text, lineHeight: 1.2, marginBottom: 3 }}>{p.name}</div>
                  <div style={{ fontSize: "clamp(10px,1.2vw,11px)", color: sel ? "#aaa" : C.muted, marginBottom: 4 }}>{p.desc}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 700, color: sel ? C.topText : C.text }}>{fmt(p.price)}</div>
                </div>
              );
            })}
          </div>

          {extrasTotal > 0 && (
            <div style={{ marginTop: "clamp(10px,1.4vw,14px)", background: C.surface, borderRadius: 10, padding: "clamp(10px,1.4vw,14px) clamp(12px,1.6vw,16px)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.text2 }}>Add-ons total</span>
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 800 }}>{fmt(extrasTotal)}</span>
            </div>
          )}
        </div>
      )}


      {/* ── NAVIGATION ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "clamp(8px,1.2vw,14px)" }}>
        <button className="btnG" onClick={onBack} style={{ width: "clamp(120px,16vw,180px)" }}>← Back</button>
        <button className="btnP" disabled={!slot} onClick={onNext}>
          {slot ? "Continue →" : "Pick a time first"}
        </button>
      </div>
    </div>
  );
}
