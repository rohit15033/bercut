import { useQuery } from "@tanstack/react-query";
import { C } from '../../../lib/tokens.js';

export default function StepBarber({ barber, setBarber, branch, cart, onNext, onBack }) {
  const { data: barbers = [], isLoading: loading } = useQuery({
    queryKey: ['barbers', branch?.id],
    queryFn: () => fetch(`/api/barbers?branch_id=${branch.id}`).then(r => r.json()),
    enabled: !!branch?.id,
  });

  return (
    <div className="scroll-y" style={{ height: "calc(100vh - clamp(51px,6.5vh,63px))", padding: "clamp(16px,2.4vw,28px)" }}>
      <div className="step-header fu">
        <div className="step-eyebrow">Pilih kapster Anda</div>
        <h2 className="step-title">Choose Your Barber</h2>
      </div>

      <div className="barber-grid-fluid" style={{ marginBottom: "clamp(12px,1.6vw,18px)" }}>
        {loading ? (
          /* Placeholder skeleton for the barber cards */
          [...Array(4)].map((_, i) => (
            <div key={i} style={{ padding: "clamp(16px,2vw,24px)", textAlign: "center", background: "#ECEAE4", borderRadius: 14, opacity: 0.5, border: `1.5px solid ${C.border}` }}>
              <div style={{ width: "clamp(64px,9vw,88px)", height: "clamp(64px,9vw,88px)", borderRadius: "50%", background: "#DDDBD4", margin: "0 auto clamp(10px,1.4vw,16px)" }} />
              <div style={{ width: "70%", height: 24, background: "#DDDBD4", borderRadius: 4, margin: "0 auto 8px" }} />
              <div style={{ width: "50%", height: 16, background: "#DDDBD4", borderRadius: 4, margin: "0 auto 16px" }} />
              <div style={{ width: "100%", height: 40, background: "#DDDBD4", borderRadius: 8, marginTop: 14 }} />
            </div>
          ))
        ) : (
          barbers.map((b, i) => {
            const sel = barber?.id === b.id;
            const sz = "clamp(64px,9vw,88px)";
            return (
              <div key={b.id} className={`fu card ${sel ? "sel" : ""}`} style={{ animationDelay: `${i * 0.07}s`, padding: "clamp(16px,2vw,24px)", cursor: "pointer", textAlign: "center", WebkitTapHighlightColor: "transparent", outline: "none", userSelect: "none" }}
                onClick={() => setBarber(b)}>
                <div style={{ position: "relative", width: sz, height: sz, margin: `0 auto clamp(10px,1.4vw,16px)` }}>
                  {b.avatar_url ? (
                    <img src={b.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <svg width="100%" height="100%" viewBox="0 0 88 88">
                      <circle cx="44" cy="44" r="44" fill={sel ? C.accentText : C.surface2} />
                      <circle cx="44" cy="30" r="15" fill={sel ? C.accent + "44" : "#11111022"} />
                      <ellipse cx="44" cy="66" rx="22" ry="14" fill={sel ? C.accent + "44" : "#11111022"} />
                      <text x="44" y="48" textAnchor="middle" fontSize="22" fontWeight="900" fill={sel ? C.accent : C.topBg} fontFamily="Barlow Condensed,sans-serif">{b.name.slice(0, 2).toUpperCase()}</text>
                    </svg>
                  )}
                  {/* Fixed checkmark layout to avoid DOM shifting */}
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: sel ? C.white : "transparent", color: sel ? C.accentText : "transparent", transition: "all 0.15s" }}>✓</div>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(20px,2.8vw,28px)", fontWeight: 900, color: sel ? C.accentText : C.text, lineHeight: 1, marginBottom: 3 }}>{b.name}</div>
                <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: sel ? "#1a1a1888" : C.muted, marginBottom: "clamp(10px,1.4vw,14px)" }}>{b.specialty || b.spec}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: "clamp(10px,1.5vw,16px)", marginBottom: "clamp(10px,1.4vw,14px)" }}>
                  <div><div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(15px,2vw,20px)", fontWeight: 800, color: sel ? C.accentText : C.text }}>★ {parseFloat(b.rating || 4.9).toFixed(1)}</div><div style={{ fontSize: "clamp(9px,1.1vw,11px)", color: sel ? "#1a1a1877" : C.muted }}>Rating</div></div>
                  <div style={{ width: 1, background: sel ? "#1a1a1822" : C.border }} />
                  <div><div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(15px,2vw,20px)", fontWeight: 800, color: sel ? C.accentText : C.text }}>{Number(b.cuts || 1200).toLocaleString()}</div><div style={{ fontSize: "clamp(9px,1.1vw,11px)", color: sel ? "#1a1a1877" : C.muted }}>Cuts</div></div>
                </div>
                <div style={{ background: sel ? "#1a1a1814" : C.surface, borderRadius: 8, padding: "5px 10px", display: "inline-block" }}>
                  <span style={{ fontSize: "clamp(10px,1.2vw,12px)", color: sel ? C.accentText : C.muted }}>Next: </span>
                  <span style={{ fontSize: "clamp(11px,1.3vw,13px)", fontWeight: 700, color: sel ? C.accentText : C.text }}>{(b.slots && b.slots[0]) || "09:00"}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Any barber */}
      <div className={`fu card ${barber?.id === 0 ? "sel" : ""}`} style={{ animationDelay: "0.3s", padding: "clamp(14px,1.8vw,20px)", cursor: "pointer", display: "flex", alignItems: "center", gap: "clamp(12px,1.6vw,18px)", marginBottom: "clamp(16px,2.2vw,24px)", WebkitTapHighlightColor: "transparent", outline: "none", userSelect: "none" }}
        onClick={() => setBarber({ id: 0, name: "Kapster Tersedia", spec: "Any available", slots: ["09:00", "09:30", "10:00", "10:30", "11:00"] })}>
        <div style={{ width: "clamp(44px,6vw,56px)", height: "clamp(44px,6vw,56px)", borderRadius: "50%", background: barber?.id === 0 ? C.accentText : C.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(18px,2.4vw,24px)", flexShrink: 0 }}>🎲</div>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 800, color: barber?.id === 0 ? C.accentText : C.text }}>Kapster Mana Saja / Any Available Barber</div>
          <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: barber?.id === 0 ? "#1a1a1888" : C.muted }}>Antrian tercepat · Fastest available queue</div>
        </div>
        <div style={{ marginLeft: "auto", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, background: barber?.id === 0 ? C.white : "transparent", color: barber?.id === 0 ? C.accentText : "transparent", border: barber?.id === 0 ? "none" : `1.5px solid ${C.surface2}`, transition: "all 0.15s" }}>✓</div>
      </div>

      <div style={{ display: "flex", gap: "clamp(8px,1.2vw,14px)" }}>
        <button className="btnG" onClick={onBack} style={{ width: "clamp(120px,16vw,180px)" }}>← Kembali</button>
        <button className="btnP" disabled={!barber} onClick={onNext}>Lanjutkan →</button>
      </div>
    </div>
  );
}
