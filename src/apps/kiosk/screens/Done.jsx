import { useState } from 'react';
import { C } from '../../../lib/tokens.js';
import { fmt } from '../../../lib/utils.js';

export default function Done({ bookingResult, cart, barber, slot, name, group, branch, services, onAddAnother, onReset }) {
  const [printed, setPrinted] = useState(false);
  const total = cart.reduce((s, id) => s + (services?.find(x => x.id === id)?.base_price || services?.find(x => x.id === id)?.price || 0), 0);
  const dur = cart.reduce((s, id) => s + (services?.find(x => x.id === id)?.duration_minutes || services?.find(x => x.id === id)?.dur || 0), 0);
  const groupTotal = (group || []).reduce((s, b) => s + b.total, 0) + total;
  const isGrouped = (group || []).length > 0;

  return (
    <div style={{ height: "calc(100vh - clamp(51px,6.5vh,63px))", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px,3vw,32px)", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div className="si" style={{ maxWidth: "clamp(380px,64vw,660px)", width: "100%", textAlign: "center" }}>

        {/* Label */}
        <div style={{ fontSize: "clamp(10px,1.2vw,13px)", letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>
          {isGrouped ? "Nomor Antrian / Queue Numbers" : "Nomor Antrian Anda / Your Queue Number"}
        </div>

        {/* Numbers row — previous group members muted, current hero */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(10px,1.6vw,18px)", flexWrap: "wrap", marginBottom: 6 }}>
          {(group || []).map((b, i) => (
            <div key={i} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(48px,9vw,80px)", fontWeight: 900, lineHeight: 1, color: C.muted, letterSpacing: "-0.04em" }}>{b.number}</div>
          ))}
          {isGrouped && <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(28px,4.5vw,48px)", fontWeight: 900, color: C.border, lineHeight: 1 }}>+</div>}
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(88px,18vw,136px)", fontWeight: 900, lineHeight: 1, color: C.text, letterSpacing: "-0.04em", animation: "pop 0.5s ease 0.2s both" }}>{bookingResult?.booking_number}</div>
        </div>

        <div style={{ background: C.accent, height: 5, borderRadius: 999, margin: "clamp(8px,1.2vh,14px) auto clamp(14px,2vh,20px)", width: isGrouped ? "clamp(120px,18vw,180px)" : "clamp(80px,12vw,120px)", transition: "width 0.4s ease" }} />

        {/* Group summary card */}
        {isGrouped && (
          <div className="fi" style={{ background: C.topBg, borderRadius: 14, padding: "clamp(12px,1.6vw,18px) clamp(16px,2vw,22px)", marginBottom: "clamp(10px,1.4vw,14px)", textAlign: "left" }}>
            <div style={{ fontSize: "clamp(10px,1.2vw,12px)", letterSpacing: "0.14em", color: "#555", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>Group Booking</div>
            {(group || []).map((b, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "clamp(6px,0.9vh,9px) 0", borderBottom: "1px solid #1a1a18" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, color: C.accent, fontSize: "clamp(14px,1.8vw,18px)" }}>{b.number}</span>
                  <span style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#aaa" }}>{b.barber} · {b.services}</span>
                </div>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: C.white, fontSize: "clamp(13px,1.6vw,16px)" }}>{fmt(b.total)}</span>
              </div>
            ))}
            {/* Current booking row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "clamp(6px,0.9vh,9px) 0", borderBottom: "1px solid #1a1a18" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, color: C.accent, fontSize: "clamp(14px,1.8vw,18px)" }}>{bookingResult?.booking_number}</span>
                <span style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#aaa" }}>{barber?.name} · {cart.map(id => services?.find(x => x.id === id)?.name).join(", ")}</span>
              </div>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: C.white, fontSize: "clamp(13px,1.6vw,16px)" }}>{fmt(total)}</span>
            </div>
            {/* Grand total */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 800, color: C.white }}>TOTAL GRUP / GROUP TOTAL</span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(20px,2.8vw,28px)", fontWeight: 900, color: C.accent }}>{fmt(groupTotal)}</span>
            </div>
          </div>
        )}

        {/* Single booking details */}
        {!isGrouped && (
          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "clamp(14px,2vw,22px) clamp(18px,2.4vw,28px)", marginBottom: "clamp(12px,1.8vw,18px)", textAlign: "left" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(10px,1.4vw,14px) clamp(16px,2.2vw,24px)" }}>
              {[
                ["Kapster", barber?.name],
                ["Waktu", slot],
                ["Layanan", cart.map(id => services?.find(x => x.id === id)?.name).join(", ")],
                ["Durasi", `${dur} menit`],
                ["Est. Total", fmt(total)],
                ...(name ? [["Nama", name]] : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: C.muted, marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: "clamp(12px,1.5vw,15px)", fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wait instruction */}
        <div style={{ background: C.surface, borderRadius: 12, padding: "clamp(10px,1.4vh,14px) clamp(14px,2vw,20px)", marginBottom: "clamp(8px,1.2vw,12px)", fontSize: "clamp(12px,1.5vw,14px)", color: C.text2, lineHeight: 1.7 }}>
          Silakan duduk dan tunggu kapster memanggil nomor Anda.<br />
          <span style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.muted }}>Please sit and wait for your barber to call your number.</span>
        </div>

        {/* Payment note */}
        <div style={{ background: C.topBg, borderRadius: 12, padding: "clamp(10px,1.4vh,14px) clamp(14px,2vw,20px)", marginBottom: "clamp(12px,1.8vw,18px)", fontSize: "clamp(11px,1.3vw,13px)", color: "#888", lineHeight: 1.6, textAlign: "left" }}>
          <span style={{ color: C.accent, fontWeight: 700 }}>
            💳 {isGrouped ? "Satu pembayaran untuk semua. / One payment for the group." : "Pembayaran setelah selesai."}
          </span>{" "}
          Kapster akan memproses pembayaran saat semua layanan selesai.
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "clamp(8px,1.2vw,12px)", justifyContent: "center", flexWrap: "wrap", marginBottom: "32px" }}>
          <button onClick={() => setPrinted(true)} style={{ WebkitTapHighlightColor: "transparent", outline: "none", padding: "clamp(12px,1.6vh,16px) clamp(14px,2vw,20px)", borderRadius: 12, fontSize: "clamp(13px,1.6vw,16px)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, background: printed ? C.surface2 : C.white, color: printed ? C.muted : C.text, border: `2px solid ${printed ? C.border : C.topBg}`, cursor: "pointer", minHeight: 52 }}>
            {printed ? "✓ Tercetak" : "🖨 Cetak Struk"}
          </button>
          <button onClick={onAddAnother} style={{ WebkitTapHighlightColor: "transparent", outline: "none", padding: "clamp(12px,1.6vh,16px) clamp(14px,2vw,20px)", borderRadius: 12, fontSize: "clamp(13px,1.6vw,16px)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, background: C.surface, color: C.text, border: `2px solid ${C.border}`, cursor: "pointer", minHeight: 52 }}>
            + Tambah Orang / Add Another
          </button>
          <button onClick={onReset} style={{ WebkitTapHighlightColor: "transparent", outline: "none", padding: "clamp(12px,1.6vh,16px) clamp(14px,2vw,20px)", borderRadius: 12, fontSize: "clamp(13px,1.6vw,16px)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, background: C.topBg, color: C.white, border: "none", cursor: "pointer", minHeight: 52 }}>
            Selesai ✓
          </button>
        </div>
      </div>
    </div>
  );
}
