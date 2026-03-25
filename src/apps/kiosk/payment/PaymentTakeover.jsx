import { useState } from "react";
import { C } from '../../../lib/tokens.js';
import { fmt, fmtK } from '../../../lib/utils.js';

const TIPS = [10000, 20000, 50000];

export default function PaymentTakeover({ booking, onDone }) {
  const [method, setMethod] = useState(null);
  const [paid, setPaid] = useState(false);
  const [tip, setTip] = useState(null);
  const [customTip, setCustomTip] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isGroup = booking?.groupItems && booking?.groupItems.length > 0;
  const allItems = isGroup ? [...booking.groupItems, booking] : [booking];
  const tipAmt = tip === "custom" ? (parseInt(customTip.replace(/\D/g, "")) || 0) : (tip || 0);
  const subtotal = allItems.reduce((s, b) => s + (b.total || 0), 0);
  const grand = subtotal + tipAmt;

  const handleConfirm = async () => {
    if (!method) return;
    setSubmitting(true);
    try {
      const resp = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          payment_status: 'paid',
          payment_method: method
        })
      });
      if (!resp.ok) throw new Error("Update failed");
      setPaid(true);
    } catch (e) {
      console.error(e);
      alert("Gagal memproses pembayaran. Periksa koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Order row component ──
  const ServiceRow = ({ s }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "clamp(7px,1vh,10px) 0", borderBottom: "1px solid #2a2a28" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: "clamp(13px,1.7vw,16px)", fontWeight: 600, color: C.white }}>{s.name}</div>
          {s.midCut && (
            <div style={{ background: "#2a2a18", border: "1px solid #c9a050", color: "#c9a050", fontSize: "clamp(8px,1vw,10px)", fontWeight: 700, padding: "1px 6px", borderRadius: 4, letterSpacing: "0.06em", flexShrink: 0 }}>+ DITAMBAH / ADDED</div>
          )}
        </div>
        <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#666" }}>{s.dur} menit</div>
      </div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(15px,2vw,19px)", fontWeight: 700, color: s.midCut ? "#c9a050" : C.white }}>{fmt(s.price)}</div>
    </div>
  );

  // ── Booking block (one person) ──
  const BookingBlock = ({ b, showDivider }) => (
    <div style={{ marginBottom: showDivider ? 0 : 0 }}>
      {isGroup && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "clamp(8px,1.2vh,12px) 0 clamp(4px,0.6vh,6px)", borderTop: showDivider ? "1px solid #2a2a28" : "none" }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, color: C.accent, fontSize: "clamp(15px,2vw,19px)" }}>{b.number}</span>
          <span style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#555" }}>{b.barber} · {b.slot}</span>
          <span style={{ marginLeft: "auto", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: "#888", fontSize: "clamp(13px,1.6vw,16px)" }}>{fmt(b.total)}</span>
        </div>
      )}
      {b.cartItems?.map((s, i) => <ServiceRow key={i} s={s} />)}
      {!isGroup && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "clamp(8px,1.2vh,11px) 0", borderBottom: "1px solid #2a2a28" }}>
          <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: "#666" }}>Kapster</span>
          <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.white, fontWeight: 600 }}>{b.barber}</span>
        </div>
      )}
    </div>
  );

  if (paid) return (
    <div style={{ position: "fixed", inset: 0, background: C.topBg, zIndex: 999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
      <div style={{ animation: "pop 0.5s ease both" }}>
        <div style={{ width: 80, height: 80, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 24px" }}>✓</div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(40px,6vw,64px)", fontWeight: 900, color: C.white, lineHeight: 1, marginBottom: 8 }}>Pembayaran Berhasil!</div>
        <div style={{ fontSize: "clamp(16px,2.2vw,20px)", color: "#888", marginBottom: 4 }}>Payment Successful</div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 900, color: C.accent, marginBottom: 32 }}>{fmt(grand)}</div>
        {isGroup && (
          <div style={{ background: "#1a1a18", borderRadius: 12, padding: "12px 24px", marginBottom: 24, display: "inline-block" }}>
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666", marginBottom: 6 }}>Group: {allItems.map(b => b.number).join(" + ")}</div>
            <div style={{ fontSize: "clamp(13px,1.6vw,15px)", color: "#aaa" }}>{allItems.length} orang · {allItems.length} barber</div>
          </div>
        )}
        {!isGroup && (
          <div style={{ background: "#1a1a18", borderRadius: 12, padding: "12px 24px", marginBottom: 24, display: "inline-block" }}>
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666", marginBottom: 4 }}>{booking.number} · {booking.barber} · {booking.slot}</div>
            <div style={{ fontSize: "clamp(13px,1.6vw,15px)", color: "#aaa" }}>{booking.services}</div>
          </div>
        )}
        <br />
        <button onClick={onDone} style={{ padding: "clamp(14px,2vh,18px) clamp(28px,4vw,48px)", borderRadius: 14, fontSize: "clamp(18px,2.4vw,24px)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, background: C.accent, color: C.accentText, border: "none", cursor: "pointer" }}>
          Selesai — Kembali ke Booking
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: C.topBg, zIndex: 999, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "#0a0a08", padding: "clamp(14px,2vh,20px) clamp(20px,3vw,32px)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1a1a18" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: C.accent, padding: "3px 10px", borderRadius: 5 }}>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(13px,1.6vw,15px)", color: C.accentText, letterSpacing: "0.10em" }}>BERCUT</span>
          </div>
          <span style={{ color: "#555", fontSize: "clamp(11px,1.3vw,13px)" }}>Seminyak · Pembayaran / Payment</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isGroup && (
            <div style={{ background: "#1a1a18", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", fontSize: "clamp(10px,1.2vw,12px)", color: "#888" }}>
              Group · {allItems.length} orang
            </div>
          )}
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(16px,2.2vw,22px)", fontWeight: 800, color: C.accent }}>
            {isGroup ? allItems.map(b => b.number).join(" + ") : `#${booking.number}`}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: order summary + tip */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "clamp(18px,2.6vw,32px)" }}>

          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.14em", color: "#555", textTransform: "uppercase", marginBottom: 14 }}>
            {isGroup ? "Ringkasan Grup / Group Order" : "Ringkasan / Order Summary"}
          </div>

          {/* Mid-cut notice if any items were added */}
          {allItems.some(b => b.cartItems?.some(s => s.midCut)) && (
            <div style={{ background: "#1a1a14", border: "1px solid #c9a050", borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: "clamp(11px,1.3vw,13px)", color: "#c9a050", display: "flex", alignItems: "center", gap: 8 }}>
              <span>✚</span>
              <span>Layanan ditambahkan oleh kapster saat potong. / Services added by barber mid-cut.</span>
            </div>
          )}

          {/* Order blocks */}
          <div style={{ background: "#1a1a18", borderRadius: 14, padding: "clamp(14px,2vw,20px)", marginBottom: "clamp(16px,2.2vw,24px)" }}>
            {allItems.map((b, i) => <BookingBlock key={i} b={b} showDivider={i > 0} />)}

            {/* Tip row */}
            {tipAmt > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "clamp(8px,1.2vh,11px) 0", borderBottom: "1px solid #2a2a28" }}>
                <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: "#666" }}>Tip</span>
                <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.accent, fontWeight: 600 }}>{fmt(tipAmt)}</span>
              </div>
            )}

            {/* Subtotal per person for groups */}
            {isGroup && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "clamp(6px,0.9vh,9px) 0", borderBottom: "1px solid #2a2a28" }}>
                <span style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#555" }}>Subtotal ({allItems.length} orang)</span>
                <span style={{ fontSize: "clamp(13px,1.6vw,15px)", color: "#888", fontWeight: 600 }}>{fmt(subtotal)}</span>
              </div>
            )}

            {/* Grand total */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(16px,2.2vw,22px)", fontWeight: 800, color: C.white }}>
                {isGroup ? "TOTAL GRUP / GROUP TOTAL" : "TOTAL"}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 900, color: C.accent }}>{fmt(grand)}</span>
            </div>
          </div>

          {/* Tip */}
          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.14em", color: "#555", textTransform: "uppercase", marginBottom: 14 }}>Tambahkan Tip? / Add a Tip?</div>
          <div style={{ display: "flex", gap: "clamp(8px,1.2vw,12px)", flexWrap: "wrap" }}>
            {TIPS.map(t => (
              <button key={t} onClick={() => setTip(tip === t ? null : t)} style={{ padding: "clamp(12px,1.6vh,16px) clamp(16px,2.2vw,24px)", borderRadius: 10, fontSize: "clamp(15px,2vw,19px)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, background: tip === t ? C.accent : "#1a1a18", color: tip === t ? C.accentText : C.white, border: `2px solid ${tip === t ? C.accent : "#2a2a28"}`, transition: "all 0.15s", minHeight: 52 }}>{fmtK(t)}</button>
            ))}
            <button key="custom" onClick={() => setTip("custom")} style={{ padding: "clamp(12px,1.6vh,16px) clamp(16px,2.2vw,24px)", borderRadius: 10, fontSize: "clamp(15px,2vw,19px)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, background: tip === "custom" ? C.accent : "#1a1a18", color: tip === "custom" ? C.accentText : C.white, border: `2px solid ${tip === "custom" ? C.accent : "#2a2a28"}`, transition: "all 0.15s", minHeight: 52 }}>Custom</button>
            <button key="none" onClick={() => { setTip(null); setCustomTip(""); }} style={{ padding: "clamp(12px,1.6vh,16px) clamp(16px,2.2vw,24px)", borderRadius: 10, fontSize: "clamp(15px,2vw,19px)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, background: "#1a1a18", color: "#555", border: "2px solid #2a2a28", minHeight: 52 }}>Tidak / No</button>
          </div>
          {tip === "custom" && (
            <input value={customTip} onChange={e => setCustomTip(e.target.value)} placeholder="Jumlah tip (Rp)..."
              style={{ marginTop: 12, width: "100%", padding: "clamp(12px,1.6vh,15px) 14px", borderRadius: 10, border: `2px solid ${C.accent}`, fontSize: "clamp(14px,1.8vw,16px)", background: "#1a1a18", color: C.white }} />
          )}
        </div>

        {/* Right: payment method */}
        <div style={{ width: "clamp(260px,32vw,380px)", borderLeft: "1px solid #1a1a18", background: "#0d0d0b", padding: "clamp(20px,3vw,32px)", display: "flex", flexDirection: "column", gap: "clamp(12px,1.8vw,18px)" }}>
          <div>
            <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.14em", color: "#555", textTransform: "uppercase", marginBottom: 14 }}>Metode Pembayaran / Payment Method</div>
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#555", marginBottom: 16, lineHeight: 1.5 }}>
              Kapster pilih metode, pelanggan bayar.<br />
              <span style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#444" }}>Barber selects method, customer pays.</span>
            </div>

            {/* QRIS */}
            <div onClick={() => setMethod("qris")} style={{ background: method === "qris" ? "#1a1a18" : "#111110", border: `2px solid ${method === "qris" ? C.accent : "#222"}`, borderRadius: 14, padding: "clamp(16px,2.2vw,22px)", cursor: "pointer", marginBottom: 10, transition: "all 0.18s", WebkitTapHighlightColor: "transparent", outline: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: method === "qris" ? 14 : 0 }}>
                <div style={{ width: 44, height: 44, background: method === "qris" ? C.accent : "#1a1a18", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>⬛</div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(20px,2.6vw,26px)", fontWeight: 800, color: C.white }}>QRIS</div>
                  <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666" }}>GoPay · OVO · Dana · Bank Transfer</div>
                </div>
                {method === "qris" && <div style={{ marginLeft: "auto", width: 22, height: 22, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.accentText, flexShrink: 0 }}>✓</div>}
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
                  <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666" }}>Scan QR di atas untuk bayar</div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(20px,2.6vw,26px)", fontWeight: 900, color: C.accent, marginTop: 8 }}>{fmt(grand)}</div>
                </div>
              )}
            </div>

            {/* Card */}
            <div onClick={() => setMethod("card")} style={{ background: method === "card" ? "#1a1a18" : "#111110", border: `2px solid ${method === "card" ? C.accent : "#222"}`, borderRadius: 14, padding: "clamp(16px,2.2vw,22px)", cursor: "pointer", transition: "all 0.18s", WebkitTapHighlightColor: "transparent", outline: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: method === "card" ? 14 : 0 }}>
                <div style={{ width: 44, height: 44, background: method === "card" ? C.accent : "#1a1a18", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>💳</div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(20px,2.6vw,26px)", fontWeight: 800, color: C.white }}>Kartu / Card</div>
                  <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666" }}>BCA EDC · Tap or Insert</div>
                </div>
                {method === "card" && <div style={{ marginLeft: "auto", width: 22, height: 22, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.accentText, flexShrink: 0 }}>✓</div>}
              </div>
              {method === "card" && (
                <div style={{ background: "#0d0d0b", borderRadius: 10, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🏦</div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(16px,2.2vw,20px)", fontWeight: 800, color: C.white, marginBottom: 4 }}>Tap atau masukkan kartu</div>
                  <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666", marginBottom: 8 }}>Tap or insert card on BCA EDC terminal</div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(20px,2.6vw,26px)", fontWeight: 900, color: C.accent }}>{fmt(grand)}</div>
                </div>
              )}
            </div>
          </div>

          <button onClick={handleConfirm} disabled={!method || submitting} style={{ width: "100%", background: method ? C.accent : C.surface2, color: method ? C.accentText : C.muted, padding: "clamp(16px,2.2vh,20px)", borderRadius: 14, fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 800, border: "none", cursor: (method && !submitting) ? "pointer" : "not-allowed", marginTop: "auto", transition: "all 0.2s" }}>
            {submitting ? "Memproses..." : method === "qris" ? "Konfirmasi Pembayaran QRIS ✓" : method === "card" ? "Konfirmasi Pembayaran Kartu ✓" : "Pilih Metode Pembayaran"}
          </button>
        </div>
      </div>
    </div>
  );
}
