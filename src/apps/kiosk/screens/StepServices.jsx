import { useQuery } from "@tanstack/react-query";
import { C } from '../../../lib/tokens.js';
import { fmt } from '../../../lib/utils.js';

const CATEGORIES = [
  { key: "Haircut", labelEn: "Haircut", labelId: "Potong Rambut" },
  { key: "Beard", labelEn: "Beard", labelId: "Jenggot" },
  { key: "Other", labelEn: "Other Services", labelId: "Layanan Lain" },
  { key: "Package", labelEn: "Package", labelId: "Paket" },
];

export default function StepServices({ cart, setCart, branch, onNext, onBack }) {
  const { data: services = [], isLoading: loading } = useQuery({
    queryKey: ['services', branch?.id],
    queryFn: () => fetch(`/api/services?branch_id=${branch.id}`).then(r => r.json()),
    enabled: !!branch?.id,
  });

  const total = cart.reduce((s, id) => s + (services.find(x => x.id === id)?.base_price || 0), 0);
  const dur = cart.reduce((s, id) => s + (services.find(x => x.id === id)?.duration_minutes || 0), 0);
  const toggle = id => setCart(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);

  return (
    <div style={{ height: "calc(100vh - clamp(51px,6.5vh,63px))", display: "flex", flexDirection: "column" }}>
      <div className="layout-split" style={{ flex: 1, overflow: "hidden" }}>

        {/* Left: categorised service list */}
        <div className="scroll-y" style={{ flex: 1, padding: "clamp(16px,2.4vw,28px)" }}>
          <div className="step-header fu">
            <div className="step-eyebrow">Pilih layanan Anda</div>
            <h2 className="step-title">Choose Your Service</h2>
          </div>

          {loading ? (
            <div className="card-grid-fluid">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ minHeight: "130px", padding: "clamp(14px,1.8vw,20px)", background: "#ECEAE4", borderRadius: 14, opacity: 0.5 }} />
              ))}
            </div>
          ) : (
            CATEGORIES.map((cat, ci) => {
              const catServices = services.filter(s => s.category?.toLowerCase() === cat.key.toLowerCase());
              if (catServices.length === 0) return null;

              return (
                <div key={cat.key} className="fu" style={{ marginBottom: "clamp(20px,2.6vw,32px)", animationDelay: `${ci * 0.07}s` }}>
                  {/* Category header — compact, English primary */}
                  <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,1.2vw,12px)", marginBottom: "clamp(12px,1.6vw,16px)" }}>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 900, color: C.text, letterSpacing: "0.02em", flexShrink: 0 }}>
                      {cat.labelEn}
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "clamp(11px,1.3vw,13px)", fontWeight: 400, color: C.muted, marginLeft: "clamp(6px,0.8vw,8px)" }}>{cat.labelId}</span>
                    </div>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                  </div>

                  {/* Service cards for this category */}
                  <div className="card-grid-fluid">
                    {catServices.map((s, i) => {
                      const sel = cart.includes(s.id);
                      return (
                        <div key={s.id} className={`card ${sel ? "sel" : ""}`}
                          style={{ padding: "clamp(14px,1.8vw,20px)", cursor: "pointer", animation: `fadeUp 0.3s ease ${ci * 0.07 + i * 0.05}s both`, WebkitTapHighlightColor: "transparent", outline: "none", userSelect: "none" }}
                          onClick={() => toggle(s.id)}>
                          
                          {s.badge && (
                            <div style={{ display: "inline-block", background: sel ? C.accentText : C.topBg, color: sel ? C.accent : C.white, fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginBottom: 8, letterSpacing: "0.06em" }}>{s.badge}</div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(20px,2.6vw,26px)", fontWeight: 800, color: sel ? C.accentText : C.text, lineHeight: 1.1 }}>{s.name}</div>
                              <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: sel ? "#1a1a1899" : C.muted, marginTop: 2 }}>{s.nameId || s.name_id}</div>
                            </div>
                            {/* Radio-style checkmark circle */}
                            <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, background: sel ? C.accentText : "transparent", color: sel ? C.accent : "transparent", border: sel ? "none" : `1.5px solid ${C.border}`, transition: "all 0.15s" }}>✓</div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "clamp(12px,1.6vw,18px)" }}>
                            <span style={{ fontSize: "clamp(11px,1.3vw,13px)", color: sel ? "#1a1a1888" : C.muted }}>⏱ {s.duration_minutes || s.dur} min</span>
                            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 800, color: sel ? C.accentText : C.text }}>{fmt(s.base_price || s.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: cart sidebar */}
        <div className="sidebar scroll-y" style={{ width: "clamp(260px,28vw,320px)", borderLeft: `1px solid ${C.border}`, background: C.bg, display: "flex", flexDirection: "column", padding: "clamp(16px,2vw,24px)" }}>
          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", letterSpacing: "0.14em", fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>Pilihan Anda</div>

          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "clamp(24px,4vh,40px) 0", color: C.muted }}>
                <div style={{ fontSize: "clamp(24px,3.5vw,32px)", opacity: 0.25, marginBottom: 8 }}>✂</div>
                <div style={{ fontSize: "clamp(12px,1.4vw,14px)" }}>Belum ada pilihan</div>
                <div style={{ fontSize: "clamp(10px,1.2vw,12px)", marginTop: 3, opacity: 0.7 }}>No services selected</div>
              </div>
            ) : cart.map(id => {
              const s = services.find(x => x.id === id);
              if (!s) return null;
              const catDef = CATEGORIES.find(c => c.key.toLowerCase() === (s.category || s.cat)?.toLowerCase());
              return (
                <div key={id} style={{ padding: "clamp(10px,1.4vh,14px) 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 700, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>{catDef?.labelEn || s.category}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "clamp(13px,1.6vw,15px)", fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.muted }}>{fmt(s.base_price || s.price)}</div>
                    </div>
                    <button onClick={() => toggle(id)} style={{ background: "none", color: "#888", fontSize: "24px", padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                </div>
              );
            })}
          </div>

          {cart.length > 0 && (
            <div style={{ borderTop: `2px solid ${C.topBg}`, paddingTop: 12, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.muted }}>Durasi</span>
                <span style={{ fontSize: "clamp(12px,1.4vw,14px)" }}>{dur} min</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "clamp(15px,1.8vw,18px)", fontWeight: 600 }}>Total</span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(22px,2.8vw,28px)", fontWeight: 900 }}>{fmt(total)}</span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            <button className="btnP" disabled={cart.length === 0} onClick={onNext}>Lanjutkan →</button>
            <button className="btnG" onClick={onBack} style={{ width: "100%" }}>← Kembali</button>
          </div>
        </div>
      </div>
    </div>
  );
}
