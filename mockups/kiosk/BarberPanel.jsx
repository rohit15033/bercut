/**
 * MOCKUP — Bercut Kiosk: BarberPanel
 *
 * What it does: Full-screen kiosk panel for the logged-in barber. Opens after
 *   PIN verified via Topbar AccessModal. Shows today's queue, active job timer,
 *   clock-in/out, break controls, add-service modal, and complete-job trigger.
 * State managed: barberStatus, activeBooking, queue, elapsedTimer, breakTimer,
 *   showAddService, addCart, breakView
 * Production API:
 *   GET  /api/bookings?barber_id=&date=today&branch_id=
 *   PATCH /api/bookings/:id/start
 *   PATCH /api/bookings/:id/complete
 *   PATCH /api/bookings/:id/add-services
 *   POST  /api/attendance/clock-out
 *   POST  /api/barber-breaks  (start break)
 *   PATCH /api/barber-breaks/:id/end
 * Feeds into: PaymentTakeover (onPaymentTrigger), Topbar (onClose returns to booking flow)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/barber/BarberPanel.jsx
 * Reference prompt: _ai/prompting-guide.md Section 05B
 */

import { useState, useEffect, useRef } from "react";
import { C, SERVICES, fmt, BERCUT_LOGO } from "./data.js";

// ── Mock data ─────────────────────────────────────────────────────────────────

const LOGGED_IN_BARBER = {
  id: 1, name: "Guntur", spec: "Haircut & Fade", chair: "A1",
};

const INITIAL_QUEUE = [
  {
    id: "bk1", number: "B099", name: "Budi Santoso",
    services: [{ id: 1, name: "Just a Haircut", nameId: "Potong Rambut", price: 130000, dur: 30 }],
    total: 130000, slot: "09:30", status: "in_progress", startedAt: Date.now() - 14 * 60 * 1000,
  },
  {
    id: "bk2", number: "B102", name: "Rizal Ahmad",
    services: [
      { id: 3, name: "Skin Fade", nameId: "Skin Fade", price: 130000, dur: 45 },
      { id: 6, name: "Beard Trim", nameId: "Rapikan Jenggot", price: 75000, dur: 20 },
    ],
    total: 205000, slot: "10:30", status: "confirmed", startedAt: null,
  },
  {
    id: "bk3", number: "B107", name: "David Lim",
    services: [{ id: 17, name: "Prestige Package", nameId: "Paket Prestige", price: 215000, dur: 75 }],
    total: 215000, slot: "11:30", status: "confirmed", startedAt: null,
  },
  {
    id: "bk4", number: "B115", name: "Wayan Sudirta",
    services: [{ id: 5, name: "Hair Tattoo", nameId: "Tato Rambut", price: 150000, dur: 45 }],
    total: 150000, slot: "13:00", status: "confirmed", startedAt: null,
  },
];

const SERVICE_CATS = ["Haircut", "Beard", "Treatment", "Package", "HairColor"];

// ── Helper ────────────────────────────────────────────────────────────────────

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = n => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

// ── Add Service Bottom Sheet ──────────────────────────────────────────────────

function AddServiceModal({ booking, onConfirm, onClose }) {
  const [cat, setCat]       = useState("Haircut");
  const [added, setAdded]   = useState([]);
  const existing = booking.services.map(s => s.id);

  const filtered = SERVICES.filter(s => s.cat === cat && !existing.includes(s.id));
  const toggle   = id => setAdded(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const total    = SERVICES.filter(s => added.includes(s.id)).reduce((a, s) => a + s.price, 0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:500, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div style={{ background:C.bg, borderRadius:"20px 20px 0 0", width:"100%", maxHeight:"75vh", display:"flex", flexDirection:"column", overflow:"hidden" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"clamp(16px,2vw,22px) clamp(20px,2.6vw,28px)", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1.5px solid ${C.border}`, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", marginBottom:3 }}>Tambah Layanan · Add Service</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(16px,2vw,20px)", color:C.text }}>untuk {booking.name}</div>
          </div>
          <button onClick={onClose} style={{ background:C.surface, border:"none", borderRadius:8, width:36, height:36, fontSize:18, cursor:"pointer", color:C.text2, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Category pills */}
        <div style={{ display:"flex", gap:8, padding:"12px clamp(20px,2.6vw,28px)", borderBottom:`1px solid ${C.border}`, flexShrink:0, overflowX:"auto" }}>
          {SERVICE_CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${cat===c?C.text:C.border}`, background:cat===c?C.text:C.white, color:cat===c?C.white:C.text2, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(11px,1.3vw,13px)", cursor:"pointer", whiteSpace:"nowrap" }}>
              {c}
            </button>
          ))}
        </div>

        {/* Service list */}
        <div style={{ flex:1, overflowY:"auto", padding:"clamp(12px,1.6vw,16px) clamp(20px,2.6vw,28px)", WebkitOverflowScrolling:"touch" }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:"center", color:C.muted, padding:"32px 0", fontFamily:"'DM Sans',sans-serif", fontSize:14 }}>Semua layanan sudah ditambahkan</div>
          )}
          {filtered.map(s => {
            const sel = added.includes(s.id);
            return (
              <div key={s.id} onClick={() => toggle(s.id)}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"clamp(12px,1.6vw,14px)", marginBottom:8, borderRadius:12, border:`1.5px solid ${sel?C.accent:C.border}`, background:sel?C.accent:C.white, cursor:"pointer", minHeight:64 }}>
                <div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,15px)", color:sel?C.accentText:C.text }}>{s.name}</div>
                  <div style={{ fontSize:"clamp(11px,1.3vw,12px)", color:sel?C.accentText:C.muted, marginTop:2 }}>⏱ {s.dur} min</div>
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(14px,1.7vw,16px)", color:sel?C.accentText:C.text }}>{fmt(s.price)}</div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {added.length > 0 && (
          <div style={{ padding:"clamp(14px,1.8vw,18px) clamp(20px,2.6vw,28px)", borderTop:`1.5px solid ${C.border}`, display:"flex", gap:12, alignItems:"center", flexShrink:0 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"clamp(11px,1.3vw,13px)", color:C.muted }}>Tambahan total</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(16px,2vw,20px)", color:C.text }}>+{fmt(total)}</div>
            </div>
            <button onClick={() => onConfirm(added)}
              style={{ padding:"clamp(14px,1.8vw,16px) clamp(22px,3vw,28px)", borderRadius:12, background:C.topBg, color:C.white, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.7vw,16px)", border:"none", cursor:"pointer", minHeight:56 }}>
              Konfirmasi Tambahan ({added.length}) →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Break Selector ────────────────────────────────────────────────────────────

function BreakSelector({ onStart, onCancel }) {
  const options = [
    { dur: 15, label: "15 menit", sub: "Istirahat singkat" },
    { dur: 30, label: "30 menit", sub: "Makan siang" },
    { dur: 45, label: "45 menit", sub: "Istirahat panjang" },
  ];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onCancel}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:"clamp(300px,40vw,380px)", overflow:"hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ background:C.topBg, padding:"clamp(16px,2vw,20px) clamp(20px,2.6vw,24px)" }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(16px,2vw,20px)", color:C.topText }}>Pilih Durasi Istirahat</div>
          <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#888", marginTop:3 }}>Slot Anda akan diblokir selama istirahat</div>
        </div>
        <div style={{ padding:"clamp(16px,2vw,20px)", display:"flex", flexDirection:"column", gap:10 }}>
          {options.map(o => (
            <button key={o.dur} onClick={() => onStart(o.dur)}
              style={{ padding:"clamp(14px,1.8vw,18px)", borderRadius:12, background:C.surface, border:`1.5px solid ${C.border}`, textAlign:"left", cursor:"pointer" }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(15px,1.9vw,18px)", color:C.text }}>{o.label}</div>
              <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:C.muted, marginTop:2 }}>{o.sub}</div>
            </button>
          ))}
          <button onClick={onCancel}
            style={{ padding:"clamp(12px,1.6vw,14px)", borderRadius:10, background:"none", border:`1.5px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(13px,1.5vw,15px)", color:C.text2, cursor:"pointer" }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BarberPanel({ onClose, onHome, onPaymentTrigger }) {
  const [queue, setQueue]             = useState(INITIAL_QUEUE);
  const [status, setStatus]           = useState("available"); // available | busy | on_break | clocked_out
  const [breakEnd, setBreakEnd]       = useState(null);        // Date when break ends
  const [showBreakSel, setShowBreakSel] = useState(false);
  const [showAddSvc, setShowAddSvc]   = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const [breakLeft, setBreakLeft]     = useState(0);
  const [announced, setAnnounced]     = useState(false);

  const active = queue.find(b => b.status === "in_progress") || null;
  const next   = queue.find(b => b.status === "confirmed")   || null;
  const rest   = queue.filter(b => b.status === "confirmed" && b !== next);

  // Elapsed timer for active job
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setElapsed(Date.now() - active.startedAt), 1000);
    return () => clearInterval(t);
  }, [active?.id]);

  // Break countdown
  useEffect(() => {
    if (!breakEnd) return;
    const t = setInterval(() => {
      const left = breakEnd - Date.now();
      if (left <= 0) { setBreakLeft(0); setBreakEnd(null); setStatus("available"); clearInterval(t); }
      else setBreakLeft(left);
    }, 1000);
    return () => clearInterval(t);
  }, [breakEnd]);

  const handleStart = (bookingId) => {
    setQueue(q => q.map(b => b.id === bookingId
      ? { ...b, status: "in_progress", startedAt: Date.now() }
      : b
    ));
    setStatus("busy");
    setElapsed(0);
    setAnnounced(false);
  };

  const handleComplete = (booking) => {
    setQueue(q => q.map(b => b.id === booking.id ? { ...b, status: "pending_payment" } : b));
    setStatus("available");
    if (onPaymentTrigger) onPaymentTrigger(booking);
    else alert(`Pembayaran untuk ${booking.name} dipicu!\nTotal: ${fmt(booking.total)}`);
  };

  const handleAddServices = (serviceIds) => {
    const toAdd = SERVICES.filter(s => serviceIds.includes(s.id));
    setQueue(q => q.map(b =>
      b.id === active.id
        ? { ...b, services: [...b.services, ...toAdd], total: b.total + toAdd.reduce((a, s) => a + s.price, 0) }
        : b
    ));
    setShowAddSvc(false);
  };

  const handleBreakStart = (dur) => {
    setBreakEnd(Date.now() + dur * 60 * 1000);
    setStatus("on_break");
    setShowBreakSel(false);
  };

  const handleEndBreak = () => {
    setBreakEnd(null);
    setBreakLeft(0);
    setStatus("available");
  };

  const handleCall = (name) => {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(`Pelanggan atas nama ${name}, silakan menuju kursi ${LOGGED_IN_BARBER.chair}`);
      u.lang = "id-ID";
      window.speechSynthesis.speak(u);
    }
    setAnnounced(true);
  };

  const handleClockOut = () => {
    if (window.confirm("Yakin ingin clock out?")) {
      if (onClose) onClose();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:C.topBg, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Modals */}
      {showBreakSel && <BreakSelector onStart={handleBreakStart} onCancel={() => setShowBreakSel(false)} />}
      {showAddSvc && active && <AddServiceModal booking={active} onConfirm={handleAddServices} onClose={() => setShowAddSvc(false)} />}

      {/* Top bar */}
      <div style={{ background:"#0a0a08", padding:"0 clamp(16px,2.4vw,28px)", height:"clamp(52px,6.5vh,64px)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, borderBottom:"1px solid #1a1a18" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <img src={BERCUT_LOGO} alt="Bercut" onClick={onHome} style={{ height:"clamp(22px,2.8vh,28px)", width:"auto", objectFit:"contain", cursor:"pointer" }}/>
          <div style={{ width:1, height:24, background:"#2a2a28" }} />
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.8vw,18px)", color:C.white }}>{LOGGED_IN_BARBER.name}</div>
            <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#666" }}>Kursi {LOGGED_IN_BARBER.chair} · {LOGGED_IN_BARBER.spec}</div>
          </div>
          <div style={{ marginLeft:8 }}>
            {status === "available" && <span style={{ background:"#1a3a1a", color:"#4caf50", fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, padding:"3px 10px", borderRadius:5, letterSpacing:"0.1em" }}>AVAILABLE</span>}
            {status === "busy"      && <span style={{ background:"#3a1a1a", color:"#ef5350", fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, padding:"3px 10px", borderRadius:5, letterSpacing:"0.1em" }}>MELAYANI</span>}
            {status === "on_break"  && <span style={{ background:"#2a2a10", color:C.accent, fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, padding:"3px 10px", borderRadius:5, letterSpacing:"0.1em" }}>ISTIRAHAT</span>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {status === "on_break" ? (
            <button onClick={handleEndBreak}
              style={{ padding:"clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)", borderRadius:8, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.4vw,14px)", border:"none", cursor:"pointer" }}>
              Akhiri Istirahat · {formatElapsed(breakLeft)}
            </button>
          ) : status !== "busy" ? (
            <button onClick={() => setShowBreakSel(true)}
              style={{ padding:"clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)", borderRadius:8, background:"#1a1a18", color:"#888", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,14px)", border:"1px solid #2a2a28", cursor:"pointer" }}>
              ☕ Istirahat
            </button>
          ) : null}
          <button onClick={handleClockOut}
            style={{ padding:"clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)", borderRadius:8, background:"#1a1a18", color:"#666", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,14px)", border:"1px solid #2a2a28", cursor:"pointer" }}>
            Clock Out
          </button>
          <button onClick={onClose}
            style={{ padding:"clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)", borderRadius:8, background:"#1a1a18", color:C.white, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.4vw,14px)", border:"1px solid #333", cursor:"pointer" }}>
            ← Kembali ke Booking
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:"flex", gap:0, overflow:"hidden" }}>

        {/* Left column — active job or idle */}
        <div style={{ width:"clamp(340px,42vw,500px)", borderRight:"1px solid #1a1a18", display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>

          {/* SEKARANG */}
          <div style={{ padding:"clamp(16px,2vw,22px)", borderBottom:"1px solid #1a1a18", flexShrink:0 }}>
            <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.14em", color:"#444", textTransform:"uppercase", marginBottom:12 }}>⚡ Sekarang</div>

            {active ? (
              <div style={{ background:"#1a1a18", borderRadius:14, padding:"clamp(14px,1.8vw,20px)", border:`1.5px solid #2a2a28` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(18px,2.4vw,24px)", color:C.white }}>{active.name}</div>
                    <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#666", marginTop:3 }}>
                      {active.services.map(s => s.name).join(" + ")}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(11px,1.3vw,13px)", color:"#555" }}>#{active.number}</div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(16px,2vw,20px)", color:C.accent, marginTop:2 }}>{fmt(active.total)}</div>
                  </div>
                </div>

                {/* Timer */}
                <div style={{ background:"#111110", borderRadius:10, padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#555", letterSpacing:"0.1em", textTransform:"uppercase" }}>Waktu berjalan</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(20px,2.6vw,26px)", color:C.accent, fontVariantNumeric:"tabular-nums" }}>{formatElapsed(elapsed)}</span>
                </div>

                {/* Actions */}
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => setShowAddSvc(true)}
                    style={{ flex:1, padding:"clamp(12px,1.6vw,14px)", borderRadius:10, background:"#2a2a28", color:C.white, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,14px)", border:"none", cursor:"pointer", minHeight:52 }}>
                    + Tambah Layanan
                  </button>
                  <button onClick={() => handleComplete(active)}
                    style={{ flex:2, padding:"clamp(12px,1.6vw,14px)", borderRadius:10, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.7vw,16px)", border:"none", cursor:"pointer", minHeight:52 }}>
                    Selesai ✓
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background:"#1a1a18", borderRadius:14, padding:"clamp(20px,2.6vw,28px)", textAlign:"center", border:"1px dashed #2a2a28" }}>
                <div style={{ fontSize:32, marginBottom:10 }}>✂</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,15px)", color:"#555" }}>
                  {status === "on_break" ? "Sedang istirahat" : "Tidak ada pelanggan aktif"}
                </div>
                <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#444", marginTop:4 }}>
                  {status === "on_break" ? "Slot diblokir hingga istirahat selesai" : "Mulai layanan dari antrian di kanan"}
                </div>
              </div>
            )}
          </div>

          {/* Break info when on break */}
          {status === "on_break" && breakLeft > 0 && (
            <div style={{ padding:"clamp(12px,1.6vw,16px) clamp(16px,2vw,22px)", flexShrink:0 }}>
              <div style={{ background:"#1a1a10", borderRadius:12, padding:"clamp(12px,1.6vw,14px)", border:`1px solid #2a2a10`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#888" }}>Sisa istirahat</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(18px,2.4vw,22px)", color:C.accent }}>{formatElapsed(breakLeft)}</div>
              </div>
            </div>
          )}

          {/* BERIKUTNYA */}
          {next && (
            <div style={{ padding:"clamp(16px,2vw,22px)", flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.14em", color:"#444", textTransform:"uppercase", marginBottom:12 }}>→ Berikutnya</div>
              <div style={{ background:"#1a1a18", borderRadius:14, padding:"clamp(14px,1.8vw,18px)", border:"1.5px solid #2a2a28" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(16px,2vw,20px)", color:C.white }}>{next.name}</div>
                    <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#666", marginTop:3 }}>{next.services.map(s => s.name).join(" + ")}</div>
                    <div style={{ fontSize:"clamp(11px,1.3vw,12px)", color:"#555", marginTop:4 }}>Slot: {next.slot}</div>
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(15px,1.9vw,18px)", color:C.accent }}>{fmt(next.total)}</div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button
                    onClick={() => handleCall(next.name)}
                    style={{ flex:1, padding:"clamp(10px,1.4vw,13px)", borderRadius:9, background: announced ? "#1a3a1a" : "#2a2a28", color: announced ? "#4caf50" : "#888", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,13px)", border:"none", cursor:"pointer", minHeight:48 }}>
                    {announced ? "✓ Dipanggil" : "📢 Panggil"}
                  </button>
                  <button
                    onClick={() => handleStart(next.id)}
                    disabled={!!active || status === "on_break"}
                    style={{ flex:2, padding:"clamp(10px,1.4vw,13px)", borderRadius:9, background: (!active && status !== "on_break") ? C.white : "#2a2a28", color: (!active && status !== "on_break") ? C.text : "#555", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,15px)", border:"none", cursor: (!active && status !== "on_break") ? "pointer" : "not-allowed", minHeight:48 }}>
                    {active ? "Selesaikan dulu ↑" : status === "on_break" ? "Sedang istirahat" : "Mulai Layanan →"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column — today's queue */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"clamp(16px,2vw,22px) clamp(16px,2vw,22px) 12px", flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.14em", color:"#444", textTransform:"uppercase" }}>
                📋 Hari Ini — {queue.filter(b => b.status !== "pending_payment").length} antrian
              </div>
              <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#444" }}>
                Est. selesai: {queue.length > 0 ? "~15:30" : "—"}
              </div>
            </div>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"0 clamp(16px,2vw,22px) clamp(16px,2vw,22px)", WebkitOverflowScrolling:"touch" }}>
            {rest.length === 0 && !active && !next && (
              <div style={{ textAlign:"center", padding:"48px 0", color:"#444", fontFamily:"'DM Sans',sans-serif" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
                <div style={{ fontSize:15, fontWeight:600 }}>Antrian kosong</div>
                <div style={{ fontSize:13, marginTop:4 }}>Tidak ada booking lain hari ini</div>
              </div>
            )}
            {[active, next, ...rest].filter(Boolean).map((b, i) => {
              const isActive = b.status === "in_progress";
              const isPending = b.status === "pending_payment";
              return (
                <div key={b.id}
                  style={{ background: isActive ? "#1a200a" : "#1a1a18", borderRadius:12, padding:"clamp(12px,1.6vw,16px)", marginBottom:10, border:`1.5px solid ${isActive ? "#3a4010" : isPending ? "#1a3a1a" : "#2a2a28"}`, animation:`fadeUp 0.25s ease ${i * 0.06}s both`, opacity: isPending ? 0.5 : 1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, color:"#333", background:"#111110", borderRadius:4, padding:"2px 7px" }}>#{b.number}</span>
                        <span style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#555" }}>{b.slot}</span>
                        {isActive && <span style={{ fontSize:"clamp(9px,1.1vw,10px)", fontWeight:700, letterSpacing:"0.1em", color:"#a5c840", background:"#1a2a0a", padding:"2px 7px", borderRadius:4 }}>AKTIF</span>}
                        {isPending && <span style={{ fontSize:"clamp(9px,1.1vw,10px)", fontWeight:700, letterSpacing:"0.1em", color:"#4caf50", background:"#1a3a1a", padding:"2px 7px", borderRadius:4 }}>PEMBAYARAN</span>}
                      </div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,15px)", color:C.white }}>{b.name}</div>
                      <div style={{ fontSize:"clamp(11px,1.3vw,12px)", color:"#666", marginTop:3 }}>{b.services.map(s => s.name).join(" · ")}</div>
                    </div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(14px,1.7vw,16px)", color: isActive ? C.accent : "#888", flexShrink:0, marginLeft:10 }}>{fmt(b.total)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
