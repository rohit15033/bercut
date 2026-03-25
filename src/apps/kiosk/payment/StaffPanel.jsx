import { useState, useEffect } from 'react';
import { C } from '../../../lib/tokens.js';
import { fmt } from '../../../lib/utils.js';

export default function StaffPanel({ branch, onSelect, onClose }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branch?.id) return;
    setLoading(true);
    fetch(`/api/bookings?branch_id=${branch.id}&status=confirmed,in_progress,pending_payment,pending`)
      .then(r => r.json())
      .then(d => { setQueue(d); setLoading(false); })
      .catch(e => { console.error("Failed fetching queue", e); setLoading(false); });
  }, [branch?.id]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: C.topBg, width: "clamp(300px,38vw,440px)", height: "100%", padding: "clamp(20px,3vw,32px)", display: "flex", flexDirection: "column", gap: 16, boxShadow: "-4px 0 24px rgba(0,0,0,0.4)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: "clamp(10px,1.2vw,12px)", letterSpacing: "0.14em", color: "#555", textTransform: "uppercase", marginBottom: 3 }}>Staff Panel</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(22px,3vw,28px)", fontWeight: 900, color: C.white }}>Pilih Booking</div>
            <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666" }}>Select booking to process payment</div>
          </div>
          <button onClick={onClose} style={{ background: "#1a1a18", color: "#888", border: "none", borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Active queue */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.12em", color: "#444", textTransform: "uppercase", marginBottom: 12 }}>Antrian Aktif / Active Queue</div>
          {loading ? (
             <div style={{ padding: "clamp(24px,4vh,40px) 0", color: C.muted, fontSize: "clamp(12px,1.4vw,14px)", textAlign: "center", border: `2px dashed #2a2a28`, borderRadius: 12 }}>
               Memuat antrian...
             </div>
          ) : queue.length === 0 ? (
             <div style={{ padding: "clamp(24px,4vh,40px) 0", color: C.muted, fontSize: "clamp(12px,1.4vw,14px)", textAlign: "center", border: `2px dashed #2a2a28`, borderRadius: 12 }}>
               Belum ada antrian aktif.
             </div>
          ) : queue.map((b, i) => {
            const isGroup = b.groupItems && b.groupItems.length > 0;
            const groupTotal = isGroup ? b.groupItems.reduce((s, x) => s + x.total, 0) + b.total : b.total;
            const allNums = isGroup ? [...b.groupItems.map(x => x.number), b.number] : [b.number];
            return (
              <div key={b.number} onClick={() => onSelect(b)}
                style={{ background: "#1a1a18", border: `1.5px solid ${isGroup ? "#3a3010" : "#2a2a28"}`, borderRadius: 12, padding: "clamp(14px,2vw,18px)", marginBottom: 10, cursor: "pointer", transition: "border-color 0.15s", animation: `fadeUp 0.25s ease ${i * 0.06}s both`, WebkitTapHighlightColor: "transparent", outline: "none" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = isGroup ? "#3a3010" : "#2a2a28"}>

                {/* Group badge */}
                {isGroup && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#2a2010", border: "1px solid #c9a050", borderRadius: 5, padding: "2px 8px", marginBottom: 10 }}>
                    <span style={{ fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 700, letterSpacing: "0.1em", color: "#c9a050" }}>GROUP · {allNums.length} ORANG</span>
                  </div>
                )}

                {/* Primary: barber name + slot */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(22px,3vw,28px)", fontWeight: 900, color: C.white, lineHeight: 1 }}>
                      {isGroup ? b.groupItems.map(x => x.barber).join(", ") + ", " + b.barber : b.barber}
                    </div>
                    <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#666", marginTop: 2 }}>{b.slot}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 900, color: C.accent }}>{fmt(isGroup ? groupTotal : b.total)}</div>
                    {isGroup && <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#666" }}>{allNums.length} layanan</div>}
                  </div>
                </div>

                {/* Services */}
                <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#555", marginBottom: 10 }}>
                  {isGroup
                    ? b.groupItems.map((x, j) => (
                      <div key={j} style={{ marginBottom: 2 }}>
                        <span style={{ color: "#888" }}>{x.barber}:</span> {x.services}
                      </div>
                    )).concat(
                      <div key="cur" style={{ marginBottom: 2 }}>
                        <span style={{ color: "#888" }}>{b.barber}:</span> {b.services}
                      </div>
                    )
                    : b.services
                  }
                </div>

                {/* Secondary: booking number(s) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {allNums.map(n => (
                      <span key={n} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(12px,1.5vw,14px)", fontWeight: 700, color: "#444", background: "#111110", borderRadius: 4, padding: "2px 8px" }}>{n}</span>
                    ))}
                  </div>
                  <div style={{ background: C.accent, color: C.accentText, borderRadius: 6, padding: "6px 14px", fontSize: "clamp(12px,1.5vw,14px)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, flexShrink: 0 }}>
                    Proses Pembayaran →
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: "#333", textAlign: "center", lineHeight: 1.5 }}>
          Ketuk pojok kanan atas 3x untuk membuka panel ini.<br />
          <span style={{ color: "#2a2a28" }}>Triple-tap top-right corner to open this panel.</span>
        </div>
      </div>
    </div>
  );
}
