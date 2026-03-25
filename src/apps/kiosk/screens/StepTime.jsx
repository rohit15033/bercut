import { useQuery } from "@tanstack/react-query";
import { C } from '../../../lib/tokens.js';

export default function StepTime({ barber, cart, branch, slot, setSlot, onNext, onBack }) {
  const barberId = barber?.id || 0;
  const cartIds = cart?.join(',') || '';
  const todayISO = new Date().toISOString().split('T')[0];

  const { data, isLoading: loading } = useQuery({
    queryKey: ['slots', barberId, todayISO, cartIds],
    queryFn: () => fetch(`/api/slots?barber_id=${barberId}&date=${todayISO}&service_ids=${cartIds}`).then(r => r.json()),
    enabled: !!barberId,
  });
  const slots = data?.slots || [];

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="scroll-y" style={{ height: "calc(100vh - clamp(51px,6.5vh,63px))", padding: "clamp(16px,2.4vw,28px)" }}>
      <div className="step-header fu">
        <div className="step-eyebrow">Pilih waktu</div>
        <h2 className="step-title">Pick Your Time</h2>
        <div style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.muted, marginTop: 4 }}>{barber?.name} · {today}</div>
      </div>

      <div className="fu" style={{ animationDelay: "0.07s", marginBottom: "clamp(20px,3vw,32px)" }}>
        <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginBottom: "clamp(12px,1.6vw,16px)" }}>Slot Tersedia / Available Slots</div>
        
        {loading ? (
          <div style={{ padding: "clamp(24px,4vh,40px) 0", color: C.muted, fontSize: "clamp(12px,1.4vw,14px)", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12 }}>
            Memuat slot tersedia...
          </div>
        ) : slots.length === 0 ? (
          <div style={{ padding: "clamp(24px,4vh,40px) 0", color: C.muted, fontSize: "clamp(12px,1.4vw,14px)", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12 }}>
            Tidak ada slot tersedia hari ini / No slots available today
          </div>
        ) : (
          <div className="slot-grid">
            {slots.map((s, i) => (
              <button key={s} onClick={() => setSlot(s)} style={{
                padding: "clamp(12px,1.8vh,16px) clamp(18px,2.6vw,28px)",
                borderRadius: 12,
                fontSize: "clamp(16px,2.2vw,22px)",
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 800,
                background: slot === s ? C.topBg : C.white,
                color: slot === s ? C.white : C.text,
                border: `2px solid ${slot === s ? C.topBg : C.border}`,
                transition: "all 0.15s",
                minWidth: "clamp(80px,10vw,110px)",
                minHeight: "clamp(52px,7vh,64px)",
                animation: `fadeUp 0.28s ease ${i * 0.04}s both`,
                WebkitTapHighlightColor: "transparent",
              }}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {slot && (
        <div className="si" style={{ background: C.accent, borderRadius: 14, padding: "clamp(14px,2vh,18px) clamp(18px,2.4vw,24px)", marginBottom: "clamp(18px,2.6vw,28px)", display: "flex", alignItems: "center", gap: "clamp(10px,1.4vw,16px)" }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, color: C.accentText }}>✓</div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 800, color: C.accentText }}>Slot dipilih: {slot}</div>
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#1a1a1899" }}>Kapster {barber?.name} · {today}</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "clamp(8px,1.2vw,14px)" }}>
        <button className="btnG" onClick={onBack} style={{ width: "clamp(120px,16vw,180px)" }}>← Kembali</button>
        <button className="btnP" disabled={!slot} onClick={onNext}>Lanjutkan →</button>
      </div>
    </div>
  );
}
