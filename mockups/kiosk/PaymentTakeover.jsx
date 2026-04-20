/**
 * MOCKUP — Bercut Kiosk: PaymentTakeover
 *
 * What it does: Full-screen payment overlay (triggered after barber taps "Complete" in StaffPanel) that shows order summary, per-person tip selection, QRIS/card payment method, and leads into a review screen.
 * State managed: booking (full booking object with cartItems, groupItems, name, barber, slot, total), onDone
 * Production API: POST /api/payments (replaces the setPaid mock); GET /api/bookings/:id for order details
 * Feeds into: Welcome (onDone resets to idle) via ReviewScreen intermediate
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/payment/PaymentTakeover.jsx
 * Reference prompt: _ai/prompting-guide.md Section 03
 */

import { useState, useEffect } from "react";
import { BERCUT_LOGO, C, FEEDBACK_TAGS, fmt, fmtK, TIPS } from "./data.js";

// ── Combined Payment Success + Review Screen ──────────────────────────────────
function ReviewScreen({ booking, grand, onDone }) {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = tag => setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag]);
  const availableTags = stars > 0 ? FEEDBACK_TAGS[stars] : [];

  if (submitted) return (
    <div style={{ position: "fixed", inset: 0, background: C.topBg, zIndex: 998, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 }}>
      <div className="si">
        <div style={{ fontSize: 64, marginBottom: 16 }}>🙏</div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 800, color: C.white, marginBottom: 8 }}>Terima Kasih! · Thank You!</div>
        <div style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "#666", marginBottom: 32 }}>Sampai jumpa lagi di Bercut · See you again!</div>
        <button onClick={onDone} style={{ padding: "clamp(14px,2vh,18px) clamp(32px,4vw,48px)", borderRadius: 12, fontSize: "clamp(15px,1.8vw,18px)", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, background: C.accent, color: C.accentText, border: "none", cursor: "pointer" }}>
          Selesai · Done
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: C.topBg, zIndex: 998, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(16px,3vw,40px)", overflowY: "auto" }}>
      <div className="si" style={{ maxWidth: "clamp(360px,55vw,560px)", width: "100%", textAlign: "center" }}>

        {/* Payment success */}
        <div style={{ width: 64, height: 64, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto clamp(14px,2vw,20px)" }}>✓</div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, color: C.white, lineHeight: 1.1, marginBottom: 4 }}>Pembayaran Berhasil</div>
        <div style={{ fontSize: "clamp(12px,1.4vw,14px)", color: "#666", marginBottom: 4 }}>Payment Successful</div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(20px,2.8vw,30px)", fontWeight: 800, color: C.accent, marginBottom: 4 }}>{fmt(grand)}</div>
        <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#555", marginBottom: "clamp(20px,2.8vw,28px)" }}>{booking.name} · ✂ {booking.barber}</div>

        <div style={{ width: "100%", height: 1, background: "#1a1a18", marginBottom: "clamp(20px,2.8vw,28px)" }} />

        {/* Review prompt */}
        <div style={{ fontSize: "clamp(10px,1.2vw,13px)", letterSpacing: "0.16em", textTransform: "uppercase", color: "#555", marginBottom: 6 }}>Bagaimana pengalamanmu? · How was your visit?</div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,26px)", fontWeight: 800, color: C.white, marginBottom: "clamp(14px,2vw,20px)" }}>Rate Your Visit</div>

        {/* Stars */}
        <div style={{ display: "flex", justifyContent: "center", gap: "clamp(8px,1.5vw,16px)", marginBottom: "clamp(14px,2vw,20px)" }}>
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s}
              onClick={() => { setStars(s); setTags([]); }}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              style={{ fontSize: "clamp(36px,6vw,52px)", background: "none", border: "none", cursor: "pointer", transition: "transform 0.1s", transform: (hovered >= s || stars >= s) ? "scale(1.15)" : "scale(1)", filter: (hovered >= s || stars >= s) ? "none" : "grayscale(1) opacity(0.25)" }}>
              ⭐
            </button>
          ))}
        </div>

        {stars > 0 && (
          <div className="fi">
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(15px,2vw,20px)", fontWeight: 700, color: C.white, marginBottom: "clamp(10px,1.6vw,16px)" }}>
              {["", "Kurang Baik", "Di Bawah Rata-rata", "Lumayan", "Bagus!", "Luar Biasa! 🎉"][stars]}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(6px,1vw,10px)", justifyContent: "center", marginBottom: "clamp(14px,2vw,20px)" }}>
              {availableTags.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  style={{ padding: "clamp(8px,1.2vh,12px) clamp(14px,1.8vw,18px)", borderRadius: 999, fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 600, cursor: "pointer", background: tags.includes(tag) ? C.accent : "#1a1a18", color: tags.includes(tag) ? C.accentText : "#888", border: `1.5px solid ${tags.includes(tag) ? C.accent : "#2a2a28"}`, transition: "all 0.15s" }}>
                  {tag}
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Komentar tambahan (opsional) · Additional comments"
              style={{ width: "100%", padding: "clamp(12px,1.6vh,16px)", borderRadius: 12, border: "1.5px solid #2a2a28", fontSize: "clamp(13px,1.5vw,15px)", fontFamily: "'DM Sans',sans-serif", resize: "none", minHeight: 80, background: "#1a1a18", color: C.white, marginBottom: "clamp(14px,2vw,20px)" }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = "#2a2a28"} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={stars > 0 ? () => setSubmitted(true) : onDone}
            style={{ padding: "clamp(14px,2vh,18px)", borderRadius: 12, fontSize: "clamp(14px,1.7vw,17px)", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, background: C.accent, color: C.accentText, border: "none", cursor: "pointer" }}>
            {stars > 0 ? "Submit Review · Kirim Ulasan" : "Done · Selesai"}
          </button>
          {stars > 0 && (
            <button onClick={onDone} style={{ padding: "clamp(10px,1.4vh,14px)", borderRadius: 12, fontSize: "clamp(12px,1.4vw,14px)", fontFamily: "'DM Sans',sans-serif", fontWeight: 500, background: "none", color: "#555", border: "none", cursor: "pointer" }}>
              Lewati · Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Receipt Screen ─────────────────────────────────────────────────────────────
function ReceiptScreen({ booking, grand, onNext }) {
  const [printing, setPrinting] = useState(true);
  const [waSent, setWaSent] = useState(false);
  const hasPhone = !!(booking.phone || booking.guest_phone);

  useEffect(() => {
    // Simulate print job completing after 2.5s, then auto-advance after 5s total
    const printTimer = setTimeout(() => setPrinting(false), 2500);
    const autoTimer  = setTimeout(() => onNext(), 8000);
    return () => { clearTimeout(printTimer); clearTimeout(autoTimer); };
  }, [onNext]);

  return (
    <div style={{ position: "fixed", inset: 0, background: C.topBg, zIndex: 998, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(20px,3vw,40px)", textAlign: "center" }}>
      <div className="si" style={{ maxWidth: "clamp(320px,48vw,480px)", width: "100%" }}>

        {/* Payment confirmed badge */}
        <div style={{ width: 72, height: 72, background: "#1a2a1a", border: "2px solid #2d7a2d", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto clamp(16px,2.2vw,22px)" }}>✓</div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(20px,2.8vw,30px)", fontWeight: 800, color: C.white, marginBottom: 4 }}>Pembayaran Berhasil</div>
        <div style={{ fontSize: "clamp(12px,1.4vw,14px)", color: "#666", marginBottom: 4 }}>Payment Confirmed</div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,26px)", fontWeight: 800, color: C.accent, marginBottom: "clamp(24px,3vw,32px)" }}>{fmt(grand)}</div>

        <div style={{ width: "100%", height: 1, background: "#1a1a18", marginBottom: "clamp(20px,2.8vw,28px)" }} />

        {/* Receipt printer state */}
        <div style={{ background: "#0d0d0b", border: "1px solid #2a2a28", borderRadius: 14, padding: "clamp(16px,2.2vw,24px)", marginBottom: "clamp(16px,2.2vw,22px)" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🧾</div>
          {printing ? (
            <>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 700, color: C.white, marginBottom: 6 }}>Mencetak Struk…</div>
              <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666", marginBottom: 14 }}>Printing receipt…</div>
              {/* Animated progress bar */}
              <div style={{ height: 4, background: "#1a1a18", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: C.accent, borderRadius: 2, animation: "printProgress 2.5s linear forwards" }} />
              </div>
              <style>{`@keyframes printProgress { from{width:0%} to{width:100%} }`}</style>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 700, color: "#6fcf6f", marginBottom: 6 }}>Struk Tercetak ✓</div>
              <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666" }}>Receipt printed</div>
            </>
          )}
        </div>

        {/* WhatsApp option */}
        {hasPhone && !waSent && (
          <button onClick={() => setWaSent(true)}
            style={{ width: "100%", background: "#0d2b1a", border: "1.5px solid #1a5c35", color: "#4caf82", padding: "clamp(12px,1.8vh,16px)", borderRadius: 12, fontFamily: "'DM Sans',sans-serif", fontSize: "clamp(13px,1.5vw,15px)", fontWeight: 600, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span>📱</span>
            <span>Kirim ke WhatsApp · Send to WhatsApp</span>
          </button>
        )}
        {waSent && (
          <div style={{ fontSize: "clamp(12px,1.4vw,14px)", color: "#4caf82", fontWeight: 600, marginBottom: 10 }}>📱 Sent to WhatsApp ✓</div>
        )}

        {/* Re-print option */}
        {!printing && (
          <button onClick={() => setPrinting(true)}
            style={{ background: "none", border: "none", color: "#555", fontSize: "clamp(11px,1.3vw,13px)", fontFamily: "'DM Sans',sans-serif", textDecoration: "underline", cursor: "pointer", marginBottom: 16 }}>
            Cetak ulang · Reprint receipt
          </button>
        )}

        <button onClick={onNext}
          style={{ width: "100%", background: C.accent, color: C.accentText, padding: "clamp(14px,2vh,18px)", borderRadius: 12, fontFamily: "'DM Sans',sans-serif", fontSize: "clamp(14px,1.7vw,17px)", fontWeight: 700, border: "none", cursor: "pointer" }}>
          Lanjut · Continue
        </button>
        <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#444", marginTop: 10 }}>Auto-continues in a few seconds</div>
      </div>
    </div>
  );
}

// ── Payment Takeover ──────────────────────────────────────────────────────────
export default function PaymentTakeover({ booking, pointsRedeemed = [], pointsUsed = 0, cashTotal = null, onDone, tipPresets = TIPS, branchName = 'Bercut' }) {
  const [method, setMethod] = useState(null);
  const [phase, setPhase] = useState("payment"); // 'payment' | 'receipt' | 'review'

  // Per-booking tips
  const isGroup = booking.groupItems && booking.groupItems.length > 0;
  const allItems = isGroup ? [...booking.groupItems, booking] : [booking];

  const [tips, setTips] = useState(() => Object.fromEntries(allItems.map(b => [b.number, null])));
  const [customTips, setCustomTips] = useState(() => Object.fromEntries(allItems.map(b => [b.number, ""])));

  const getTipAmt = num => tips[num] === "custom" ? (parseInt(customTips[num]?.replace(/\D/g, "") || 0)) : (tips[num] || 0);
  const totalTips = allItems.reduce((s, b) => s + getTipAmt(b.number), 0);
  const fullSubtotal = allItems.reduce((s, b) => s + b.total, 0);
  // If cashTotal was passed from Confirm (points applied), use it; otherwise full subtotal
  const subtotal = cashTotal !== null ? cashTotal : fullSubtotal;
  const grand = subtotal + totalTips;
  const isPointsCovered = pointsUsed > 0 && subtotal === 0;

  const ServiceRow = ({ s }) => {
    const isPtsCovered = pointsRedeemed.includes(s.id);
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "clamp(7px,1vh,10px) 0", borderBottom: "1px solid #2a2a28" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: "clamp(13px,1.6vw,15px)", fontWeight: 700, color: C.white, fontFamily: "'Inter',sans-serif" }}>{s.name}</div>
            {s.midCut && <div style={{ background: "#2a2a18", border: "1px solid #c9a050", color: "#c9a050", fontSize: "clamp(8px,1vw,10px)", fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>+ ADDED</div>}
            {isPtsCovered && <div style={{ background: "#0d1f0d", border: "1px solid #2d7a2d", color: "#6fcf6f", fontSize: "clamp(8px,1vw,10px)", fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>⭐ POINTS</div>}
          </div>
          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#666" }}>{s.dur} min</div>
        </div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 700, color: isPtsCovered ? "#6fcf6f" : s.midCut ? "#c9a050" : C.white, textDecoration: isPtsCovered ? "line-through" : "none" }}>
          {isPtsCovered ? "Free" : fmt(s.price)}
        </div>
      </div>
    );
  };

  if (phase === "review")  return <ReviewScreen booking={booking} grand={grand} onDone={onDone} />;
  if (phase === "receipt") return <ReceiptScreen booking={booking} grand={grand} onNext={() => setPhase("review")} />;

  return (
    <div style={{ position: "fixed", inset: 0, background: C.topBg, zIndex: 999, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#0a0a08", padding: "clamp(14px,2vh,20px) clamp(20px,3vw,32px)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1a1a18" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={BERCUT_LOGO} alt="Bercut" style={{ height: "clamp(26px,3.5vh,36px)", width: "auto", objectFit: "contain" }} />
          <span style={{ color: "#555", fontSize: "clamp(11px,1.3vw,13px)" }}>{branchName} · Payment</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isGroup && <div style={{ background: "#1a1a18", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", fontSize: "clamp(10px,1.2vw,12px)", color: "#888" }}>Group · {allItems.length} people</div>}
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,20px)", fontWeight: 700, color: C.accent }}>
            {isGroup ? allItems.map(b => b.name || b.number).join(" + ") : `${booking.name}`}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: order + per-booking tips */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "clamp(18px,2.6vw,32px)" }}>
          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.14em", color: "#555", textTransform: "uppercase", marginBottom: 14 }}>
            {isGroup ? "Group Order" : "Order Summary"}
          </div>

          <div style={{ background: "#1a1a18", borderRadius: 14, padding: "clamp(14px,2vw,20px)", marginBottom: "clamp(16px,2.2vw,24px)" }}>
            {allItems.map((b, i) => (
              <div key={b.number}>
                {/* Per-person header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "clamp(8px,1.2vh,12px) 0 clamp(4px,0.6vh,6px)", borderTop: i > 0 ? "1px solid #2a2a28" : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, color: C.accent, fontSize: "clamp(13px,1.6vw,16px)" }}>{b.name || b.number}</div>
                    <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#666", marginTop: 1 }}>✂ {b.barber}</div>
                  </div>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, color: "#888", fontSize: "clamp(13px,1.6vw,16px)", flexShrink: 0 }}>{fmt(b.total)}</span>
                </div>
                {(b.cartItems || b.services || []).map((s, j) => <ServiceRow key={j} s={s} />)}

                {/* Aggressive Tip Section */}
                <div style={{
                  marginTop: 14,
                  marginBottom: 12,
                  padding: "16px",
                  background: "#1c1c1a",
                  border: `1.5px solid #333`,
                  borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.white, fontWeight: 800, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                        {isGroup ? `Tip for ${b.name}'s barber (${b.barber})?` : `Support ${b.barber}?`}
                      </div>
                      <div style={{ fontSize: "11px", color: C.muted, marginTop: 2 }}>100% of tips go directly to your barber</div>
                    </div>
                    <div style={{ fontSize: 20 }}>🙌</div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "nowrap" }}>
                    {tipPresets.map(t => (
                      <button key={t}
                        onClick={() => setTips(prev => ({ ...prev, [b.number]: prev[b.number] === t ? null : t }))}
                        style={{
                          flex: 1,
                          padding: "12px 0",
                          borderRadius: 12,
                          fontSize: "clamp(14px,1.8vw,16px)",
                          fontFamily: "'Inter',sans-serif",
                          fontWeight: 800,
                          background: tips[b.number] === t ? C.accent : "#2a2a28",
                          color: tips[b.number] === t ? C.accentText : C.white,
                          border: `2px solid ${tips[b.number] === t ? C.accent : "#3a3a38"}`,
                          transition: "all 0.15s",
                          cursor: "pointer",
                          position: "relative"
                        }}>
                        {fmtK(t)}
                      </button>
                    ))}
                    <button onClick={() => setTips(prev => ({ ...prev, [b.number]: prev[b.number] === "custom" ? null : "custom" }))}
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        borderRadius: 12,
                        fontSize: "clamp(12px,1.5vw,14px)",
                        fontFamily: "'DM Sans',sans-serif",
                        fontWeight: 700,
                        background: tips[b.number] === "custom" ? C.accent : "#2a2a28",
                        color: tips[b.number] === "custom" ? C.accentText : C.white,
                        border: `2px solid ${tips[b.number] === "custom" ? C.accent : "#3a3a38"}`,
                        cursor: "pointer"
                      }}>
                      Custom
                    </button>
                  </div>

                  {tips[b.number] === "custom" && (
                    <input
                      value={customTips[b.number]}
                      onChange={e => setCustomTips(prev => ({ ...prev, [b.number]: e.target.value }))}
                      placeholder="Enter amount (Rp)..."
                      style={{
                        marginTop: 10,
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: `2px solid ${C.accent}`,
                        fontSize: "clamp(14px,1.6vw,16px)",
                        background: "#111",
                        color: C.white,
                        fontFamily: "'Inter',sans-serif",
                        fontWeight: 700
                      }}
                    />
                  )}

                  <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                    <button
                      onClick={() => setTips(prev => ({ ...prev, [b.number]: null }))}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#555",
                        fontSize: "11px",
                        fontFamily: "'DM Sans',sans-serif",
                        textDecoration: "underline",
                        cursor: "pointer",
                        padding: "4px 10px"
                      }}>
                      No tip, maybe next time
                    </button>
                  </div>

                  {getTipAmt(b.number) > 0 && (
                    <div style={{ marginTop: 8, fontSize: 13, color: C.accent, fontWeight: 700, textAlign: "center", fontFamily: "'Inter',sans-serif" }}>
                      +{fmt(getTipAmt(b.number))} tip added ✓
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Totals */}
            {totalTips > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "clamp(8px,1.2vh,11px) 0", borderTop: "1px solid #2a2a28" }}>
                <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: "#666" }}>Total Tips</span>
                <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.accent, fontWeight: 600 }}>{fmt(totalTips)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 }}>
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(15px,2vw,20px)", fontWeight: 800, color: C.white }}>
                {isGroup ? "GROUP TOTAL" : "TOTAL"}
              </span>
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 800, color: C.accent }}>{fmt(grand)}</span>
            </div>
          </div>
        </div>

        {/* Right: payment method */}
        <div style={{ width: "clamp(260px,32vw,380px)", borderLeft: "1px solid #1a1a18", background: "#0d0d0b", padding: "clamp(20px,3vw,32px)", display: "flex", flexDirection: "column" }}>

          {isPointsCovered && totalTips === 0 ? (
            /* Points fully cover everything — no EDC needed */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 }}>
              <div style={{ fontSize: 48 }}>⭐</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,26px)", fontWeight: 800, color: "#6fcf6f" }}>Fully Covered by Points!</div>
              <div style={{ fontSize: "clamp(12px,1.4vw,14px)", color: "#555" }}>No payment needed · Tidak perlu bayar</div>
              <button onClick={() => setPhase("receipt")} style={{ width: "100%", background: "#6fcf6f", color: "#0d1f0d", padding: "clamp(16px,2.2vh,20px)", borderRadius: 14, fontFamily: "'DM Sans',sans-serif", fontSize: "clamp(15px,1.8vw,18px)", fontWeight: 700, border: "none", cursor: "pointer", marginTop: 8 }}>
                Confirm & Complete ✓
              </button>
            </div>
          ) : (
            /* Cash owed — show payment method selector */
            <>
              <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", marginBottom: "clamp(12px,1.8vw,18px)" }}>
                <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.14em", color: "#555", textTransform: "uppercase", marginBottom: 14 }}>Payment Method</div>
                <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#555", marginBottom: 16 }}>
                  {isPointsCovered ? "Tip payment only · Pembayaran tip saja" : "Barber selects method, customer pays."}
                </div>

                {/* QRIS */}
                <div onClick={() => setMethod("qris")} style={{ background: method === "qris" ? "#1a1a18" : "#111110", border: `2px solid ${method === "qris" ? C.accent : "#222"}`, borderRadius: 14, padding: "clamp(16px,2.2vw,22px)", cursor: "pointer", marginBottom: 10, transition: "all 0.18s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: method === "qris" ? 14 : 0 }}>
                    <div style={{ width: 44, height: 44, background: method === "qris" ? C.accent : "#1a1a18", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>⬛</div>
                    <div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 700, color: C.white }}>QRIS</div>
                      <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666" }}>GoPay · OVO · Dana · Bank · QRIS</div>
                    </div>
                    {method === "qris" && <div style={{ marginLeft: "auto", width: 22, height: 22, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.accentText }}>✓</div>}
                  </div>
                  {method === "qris" && (
                    <div style={{ background: "#0d0d0b", borderRadius: 10, padding: 16, textAlign: "center" }}>
                      <div style={{ width: 120, height: 120, background: C.white, borderRadius: 8, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="100" height="100" viewBox="0 0 100 100">
                          <rect x="5" y="5" width="35" height="35" rx="4" fill="none" stroke="#111" strokeWidth="3" />
                          <rect x="13" y="13" width="19" height="19" rx="2" fill="#111" />
                          <rect x="60" y="5" width="35" height="35" rx="4" fill="none" stroke="#111" strokeWidth="3" />
                          <rect x="68" y="13" width="19" height="19" rx="2" fill="#111" />
                          <rect x="5" y="60" width="35" height="35" rx="4" fill="none" stroke="#111" strokeWidth="3" />
                          <rect x="13" y="68" width="19" height="19" rx="2" fill="#111" />
                          <rect x="60" y="60" width="8" height="8" fill="#111" /><rect x="72" y="60" width="8" height="8" fill="#111" />
                          <rect x="84" y="60" width="11" height="8" fill="#111" /><rect x="60" y="72" width="11" height="8" fill="#111" />
                          <rect x="76" y="72" width="8" height="8" fill="#111" /><rect x="60" y="84" width="8" height="11" fill="#111" />
                          <rect x="72" y="84" width="23" height="11" fill="#111" />
                        </svg>
                      </div>
                      <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666" }}>Scan QR code to pay</div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 700, color: C.accent, marginTop: 8 }}>{fmt(grand)}</div>
                    </div>
                  )}
                </div>

                {/* Card */}
                <div onClick={() => setMethod("card")} style={{ background: method === "card" ? "#1a1a18" : "#111110", border: `2px solid ${method === "card" ? C.accent : "#222"}`, borderRadius: 14, padding: "clamp(16px,2.2vw,22px)", cursor: "pointer", transition: "all 0.18s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: method === "card" ? 14 : 0 }}>
                    <div style={{ width: 44, height: 44, background: method === "card" ? C.accent : "#1a1a18", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>💳</div>
                    <div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 700, color: C.white }}>Card</div>
                      <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666" }}>Xendit Terminal · Tap, Insert, or Swipe</div>
                    </div>
                    {method === "card" && <div style={{ marginLeft: "auto", width: 22, height: 22, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.accentText }}>✓</div>}
                  </div>
                  {method === "card" && (
                    <div style={{ background: "#0d0d0b", borderRadius: 10, padding: 16, textAlign: "center" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🏦</div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 700, color: C.white, marginBottom: 4 }}>Tap or insert card</div>
                      <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666", marginBottom: 8 }}>Use the Xendit Terminal on the counter</div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 700, color: C.accent }}>{fmt(grand)}</div>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={() => setPhase("receipt")} disabled={!method} style={{ width: "100%", background: method ? C.accent : C.surface2, color: method ? C.accentText : C.muted, padding: "clamp(16px,2.2vh,20px)", borderRadius: 14, fontFamily: "'DM Sans',sans-serif", fontSize: "clamp(15px,1.8vw,18px)", fontWeight: 700, border: "none", cursor: method ? "pointer" : "not-allowed", flexShrink: 0, transition: "all 0.2s" }}>
                {method === "qris" ? "Confirm QRIS Payment ✓" : method === "card" ? "Confirm Card Payment ✓" : "Select Payment Method"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
