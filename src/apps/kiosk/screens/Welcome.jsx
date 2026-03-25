import { useEffect, useState } from "react";
import { C } from '../../../lib/tokens.js';

export default function Welcome({ onStart, branch }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const tickerItems = ["BERCUT BARBERSHOP", "SEMINYAK", "CANGGU", "UBUD", "ULUWATU", "SANUR", "DEWI SRI", "NO.1 BARBERSHOP IN BALI", "BUKA 10:00–20:00"];

  return (
    <div style={{ minHeight: "calc(100vh - 55px)", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ background: C.accent, height: 5 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
        <div className="fu" style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: "center", marginBottom: 20 }}>
            <div style={{ width: 2, height: 64, background: C.topBg }} />
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 80, lineHeight: 0.88, letterSpacing: "-0.03em", color: C.text }}>BERCUT</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 400, fontSize: 20, letterSpacing: "0.28em", color: C.muted }}>BARBERSHOP</div>
            </div>
            <div style={{ width: 2, height: 64, background: C.topBg }} />
          </div>
          <div style={{ background: C.accent, display: "inline-block", padding: "4px 18px", borderRadius: 4 }}>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", color: C.accentText }}>{branch?.city ? `${branch.city.toUpperCase()} · BALI` : 'SEMINYAK · BALI'}</span>
          </div>
        </div>

        <div className="fu" style={{ textAlign: "center", marginBottom: 44, animationDelay: "0.08s" }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 88, fontWeight: 900, color: C.text, lineHeight: 1, letterSpacing: "-0.04em" }}>
            {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>
            {time.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        <div className="fu" style={{ width: "100%", maxWidth: 520, animationDelay: "0.16s" }}>
          <button onClick={onStart} style={{ width: "100%", background: C.topBg, color: C.white, padding: "22px 28px", borderRadius: 14, border: "none", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#2a2a28"}
            onMouseLeave={e => e.currentTarget.style.background = C.topBg}>
            <span style={{ fontSize: 22 }}>✂</span>
            Mulai Booking / Start Booking
          </button>
          <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted }}>Sentuh layar untuk memulai · Touch screen to begin</div>
        </div>
      </div>

      <div style={{ background: C.topBg, overflow: "hidden", padding: "9px 0" }}>
        <div style={{ display: "flex", gap: 40, animation: "ticker 18s linear infinite", width: "max-content" }}>
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <span key={i} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: i % 2 === 0 ? C.accent : "#444", whiteSpace: "nowrap" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
