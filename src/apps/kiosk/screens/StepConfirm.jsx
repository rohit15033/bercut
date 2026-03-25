import { useMutation } from '@tanstack/react-query';
import { C } from '../../../lib/tokens.js';
import { fmt } from '../../../lib/utils.js';

export default function StepConfirm({ cart, barber, slot, name, setName, phone, setPhone, branch, groupId, services, onConfirm, onBack }) {
  const mutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Booking failed');
      return res.json();
    },
    onSuccess: (data) => {
      onConfirm(data);
    },
  });

  const submitting = mutation.isPending;
  const submitError = mutation.isError ? 'Gagal membuat booking — coba lagi / Booking failed, try again' : null;

  const total = cart.reduce((s, id) => s + (services?.find(x => x.id === id)?.base_price || services?.find(x => x.id === id)?.price || 0), 0);
  const dur = cart.reduce((s, id) => s + (services?.find(x => x.id === id)?.duration_minutes || services?.find(x => x.id === id)?.dur || 0), 0);

  const handleConfirm = () => {
    const localDate = new Date().toISOString().split('T')[0];
    mutation.mutate({
      branch_id: branch?.id,
      barber_id: barber?.id,
      scheduled_at: new Date(`${localDate}T${slot}:00`).toISOString(),
      service_ids: cart,
      group_id: groupId || null,
      guest_name: name || null,
      guest_phone: phone || null,
    });
  };

  return (
    <div className="scroll-y" style={{ height: "calc(100vh - clamp(51px,6.5vh,63px))", padding: "clamp(16px,2.4vw,28px)" }}>
      <div className="step-header fu">
        <div className="step-eyebrow">Konfirmasi pesanan</div>
        <h2 className="step-title">Review & Confirm</h2>
      </div>

      <div className="confirm-layout">
        {/* Left col — order summary */}
        <div>
          <div className="fu" style={{ animationDelay: "0.06s", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "clamp(14px,2vw,22px)" }}>
            <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>Ringkasan / Order Summary</div>
            {cart.map(id => {
              const s = services?.find(x => x.id === id);
              if (!s) return null;
              return (
                <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "clamp(10px,1.4vh,13px) 0", borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: "clamp(14px,1.8vw,17px)", fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: C.muted }}>{s.nameId || s.name_id} · {s.duration_minutes || s.dur} menit</div>
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(17px,2.2vw,22px)", fontWeight: 700 }}>{fmt(s.base_price || s.price)}</div>
                </div>
              );
            })}
            {[["Kapster / Barber", barber?.name], ["Waktu / Time", slot], ["Estimasi Durasi", `${dur} menit`]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "clamp(8px,1.2vh,11px) 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.muted }}>{k}</span>
                <span style={{ fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            {/* Estimated total — note it's not final since barber can add services */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, paddingTop: 2 }}>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(16px,2.2vw,22px)", fontWeight: 800 }}>ESTIMASI TOTAL</div>
                <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: C.muted }}>Kapster bisa menambah layanan saat potong</div>
              </div>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(22px,3.2vw,32px)", fontWeight: 900 }}>{fmt(total)}</span>
            </div>
          </div>

          {/* Postpaid info banner */}
          <div className="fu" style={{ animationDelay: "0.1s", background: C.topBg, borderRadius: 12, padding: "clamp(14px,2vw,20px)", marginTop: "clamp(12px,1.6vw,16px)", display: "flex", alignItems: "center", gap: "clamp(12px,1.6vw,18px)" }}>
            <div style={{ fontSize: "clamp(24px,3.2vw,32px)", flexShrink: 0 }}>💳</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(16px,2.2vw,20px)", fontWeight: 800, color: C.white, marginBottom: 3 }}>Bayar Setelah Selesai / Pay After Service</div>
              <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#888", lineHeight: 1.5 }}>Kapster akan memproses pembayaran saat layanan selesai via QRIS atau kartu BCA.<br /><span style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#666" }}>Your barber will handle payment after the service — QRIS or BCA card.</span></div>
            </div>
          </div>
        </div>

        {/* Right col — optional details + confirm */}
        <div>
          <div className="fu" style={{ animationDelay: "0.12s", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "clamp(14px,2vw,22px)", marginBottom: "clamp(10px,1.4vw,14px)" }}>
            <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>Data Anda (Opsional) / Your Details</div>
            {[{ label: "Nama / Name", val: name, setter: setName, ph: "cth. Agus" }, { label: "WhatsApp", val: phone, setter: setPhone, ph: "+62 812 ..." }].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 600, display: "block", marginBottom: 6, color: C.text2 }}>{f.label}</label>
                <input value={f.val} onChange={e => f.setter(e.target.value)} placeholder={f.ph}
                  style={{ width: "100%", padding: "clamp(12px,1.6vh,15px) 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: "clamp(14px,1.7vw,16px)", background: C.bg, transition: "border 0.15s" }}
                  onFocus={e => e.target.style.borderColor = C.topBg} onBlur={e => e.target.style.borderColor = C.border} />
              </div>
            ))}
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.muted, lineHeight: 1.6 }}>
              Opsional — digunakan untuk konfirmasi WhatsApp.<br />
              <span style={{ fontSize: "clamp(10px,1.2vw,12px)" }}>Optional — used for WhatsApp booking confirmation.</span>
            </div>
          </div>

          <button className="btnP" disabled={submitting} onClick={handleConfirm} style={{ fontSize: "clamp(17px,2.2vw,22px)", marginBottom: 8, padding: "clamp(16px,2.2vh,20px)" }}>
            {submitting ? "Memproses..." : "Konfirmasi Booking ✓"}
          </button>
          
          {submitError && (
             <div style={{ color: "#E03131", fontSize: "14px", textAlign: "center", marginBottom: "8px", fontWeight: "600" }}>
               {submitError}
             </div>
          )}
          
          <button className="btnG" disabled={submitting} onClick={onBack} style={{ width: "100%" }}>← Kembali</button>
        </div>
      </div>
    </div>
  );
}
