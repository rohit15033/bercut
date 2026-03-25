import { useState, useEffect } from "react";
import { C } from '../../../lib/tokens.js';
import { fmt } from '../../../lib/utils.js';

export default function Topbar({ step, cartTotal, onSecretClick }) {
  const [time, setTime] = useState(new Date());
  const [clicks, setClicks] = useState(0);
  
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const handleLogoClick = () => {
    setClicks(prev => {
      const next = prev + 1;
      if (next >= 3) {
        onSecretClick?.();
        return 0;
      }
      return next;
    });
    const timeout = setTimeout(() => setClicks(0), 2000);
    return () => clearTimeout(timeout);
  };

  const steps = ["Layanan", "Kapster", "Waktu", "Konfirmasi"];
  return (
    <div style={{ background: C.topBg, userSelect: "none" }}>
      <div style={{ padding: "0 clamp(16px,3vw,28px)", display: "flex", alignItems: "center", justifyContent: "space-between", height: "clamp(48px,6vh,60px)" }}>
        
        {/* Logo Section */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div 
            onClick={handleLogoClick}
            style={{ background: C.accent, padding: "3px 10px", borderRadius: 5, cursor: "pointer", transition: "transform 0.1s" }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(13px,1.6vw,15px)", color: C.accentText, letterSpacing: "0.1em" }}>BERCUT</span>
          </div>
          <span style={{ color: "#555", fontSize: "clamp(11px,1.3vw,13px)" }}>Seminyak</span>
        </div>

        {/* Navigation / Progress Steps */}
        {step > 0 && step < 5 && (
          <div style={{ display: "flex", gap: "clamp(4px,0.8vw,12px)", alignItems: "center" }}>
            {steps.map((s, i) => {
              const active = i + 1 === step;
              const completed = i + 1 < step;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: "clamp(4px,1vw,8px)" }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "clamp(4px,1vw,8px)", 
                    opacity: i + 1 <= step ? 1 : 0.3, 
                    transition: "opacity 0.3s" 
                  }}>
                    {/* Circle Indicator */}
                    <div style={{ 
                      width: "clamp(18px,2.4vw,22px)", 
                      height: "clamp(18px,2.4vw,22px)", 
                      borderRadius: "50%", 
                      background: completed || active ? C.accent : "transparent", 
                      border: `1.5px solid ${completed || active ? C.accent : "#333"}`, 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      fontSize: "clamp(9px,1vw,11px)", 
                      fontWeight: 700, 
                      color: C.accentText, 
                      transition: "all 0.3s",
                      flexShrink: 0 
                    }}>
                      {completed ? "✓" : i + 1}
                    </div>
                    {/* Label (visible only for active step or small screens handle) */}
                    <span style={{ 
                      fontSize: "clamp(11px,1.4vw,14px)", 
                      color: active ? C.white : "#666", 
                      fontWeight: active ? 700 : 400,
                      display: active ? "block" : "none" // Mockup logic often hides inactive labels to save space
                    }} className="step-label">
                      {s}
                    </span>
                    {/* Fallback for when we want to see it but limited */}
                    {active && <span className="step-label" style={{ fontSize: "clamp(11px,1.4vw,14px)", color: C.white, fontWeight: 700 }}>{s}</span>}
                  </div>
                  {i < 3 && <span style={{ color: "#333", fontSize: 10, opacity: 0.5 }}>›</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* End Section: Price + Time */}
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,1.2vw,16px)" }}>
          {cartTotal > 0 && step > 0 && step < 5 && (
            <div style={{ background: "#1a1a18", padding: "5px clamp(8px,1.2vw,12px)", borderRadius: 7 }}>
              <span style={{ color: C.accent, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: "clamp(14px,1.8vw,18px)" }}>{fmt(cartTotal)}</span>
            </div>
          )}
          <span style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#555" }}>
            {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Dynamic Progress Bar */}
      {step > 0 && step < 5 && (
        <div style={{ display: "flex", gap: 2 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ 
              flex: 1, 
              height: 3, 
              background: i <= step ? C.accent : "#222", 
              transition: "background 0.4s" 
            }}/>
          ))}
        </div>
      )}
    </div>
  );
}
