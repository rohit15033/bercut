/**
 * MOCKUP — Bercut Kiosk: BarberPanel
 *
 * What it does: Full-screen kiosk panel for barbers. Two views:
 *   1. Barber picker — select yourself from the roster; call your next customer from here.
 *   2. Barber detail — your queue, prominent clock-in/break/clock-out controls,
 *      today's services done with commission & tips earned (not raw prices).
 * State managed: view, selectedBarber, barberStatus, queue, elapsedTimer,
 *   breakTimer, showAddService, addCart
 * Production API:
 *   GET  /api/barbers?branch_id=              — roster for picker
 *   GET  /api/bookings?barber_id=&date=today  — queue for selected barber
 *   GET  /api/bookings?barber_id=&date=today&status=completed — today's earnings
 *   PATCH /api/bookings/:id/start
 *   PATCH /api/bookings/:id/complete
 *   PATCH /api/bookings/:id/add-services
 *   POST  /api/attendance/clock-in
 *   POST  /api/attendance/clock-out
 *   POST  /api/barber-breaks
 *   PATCH /api/barber-breaks/:id/end
 * Feeds into: PaymentTakeover (onPaymentTrigger)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/barber/BarberPanel.jsx
 * Reference prompt: _ai/prompting-guide.md Section 05B
 */

import { useState, useEffect } from "react";
import { BARBERS, C, SERVICES, fmt, BERCUT_LOGO } from "./data.js";

// ── Mock queue data per barber ────────────────────────────────────────────────

const QUEUES = {
  1: [ // Guntur
    { id:"bk1", number:"B099", name:"Budi Santoso",  services:[{ id:1, name:"Just a Haircut", price:130000, dur:30 }], total:130000, slot:"09:30", status:"completed",   tip:20000 },
    { id:"bk2", number:"B102", name:"Rizal Ahmad",   services:[{ id:3, name:"Skin Fade", price:130000, dur:45 },{ id:6, name:"Beard Trim", price:75000, dur:20 }], total:205000, slot:"10:30", status:"in_progress", startedAt: Date.now() - 14*60*1000, tip:0 },
    { id:"bk3", number:"B107", name:"David Lim",     services:[{ id:17, name:"Prestige Package", price:215000, dur:75 }], total:215000, slot:"11:30", status:"confirmed", tip:0 },
    { id:"bk4", number:"B115", name:"Wayan Sudirta", services:[{ id:5,  name:"Hair Tattoo", price:150000, dur:45 }], total:150000, slot:"13:00", status:"confirmed", tip:0 },
  ],
  2: [ // Pangestu
    { id:"bk5", number:"B100", name:"James Holden",  services:[{ id:3, name:"Skin Fade", price:130000, dur:45 },{ id:7, name:"Beard Shaving", price:95000, dur:25 }], total:225000, slot:"09:45", status:"completed", tip:50000 },
    { id:"bk6", number:"B108", name:"Chris Walker",  services:[{ id:17, name:"Prestige Package", price:215000, dur:75 }], total:215000, slot:"11:00", status:"in_progress", startedAt: Date.now() - 8*60*1000, tip:0 },
    { id:"bk7", number:"B113", name:"Marco Rossi",   services:[{ id:1, name:"Just a Haircut", price:130000, dur:30 }], total:130000, slot:"13:30", status:"confirmed", tip:0 },
  ],
  3: [ // Rifky
    { id:"bk8", number:"B101", name:"Wayan Sudirta", services:[{ id:18, name:"Luxury Package", price:445000, dur:120 }], total:445000, slot:"10:00", status:"in_progress", startedAt: Date.now() - 35*60*1000, tip:0 },
    { id:"bk9", number:"B110", name:"Made Subrata",  services:[{ id:5, name:"Hair Tattoo", price:150000, dur:45 }], total:150000, slot:"13:00", status:"confirmed", tip:0 },
  ],
  7: [ // Axel
    { id:"bk10", number:"B103", name:"David Chen",   services:[{ id:19, name:"President Package", price:555000, dur:150 }], total:555000, slot:"10:30", status:"in_progress", startedAt: Date.now() - 22*60*1000, tip:0 },
    { id:"bk11", number:"B112", name:"Nguyen Van An",services:[{ id:1, name:"Just a Haircut", price:130000, dur:30 }], total:130000, slot:"14:00", status:"confirmed", tip:0 },
  ],
};

function getQueue(barberId) {
  return (QUEUES[barberId] || []).map(b => ({ ...b, startedAt: b.startedAt || null }));
}

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const p = n => String(n).padStart(2, "0");
  return h > 0 ? `${p(h)}:${p(m % 60)}:${p(s % 60)}` : `${p(m)}:${p(s % 60)}`;
}

// ── Add Service Modal ─────────────────────────────────────────────────────────

const SVC_CATS = ["Haircut","Beard","Treatment","Package","HairColor"];

function AddServiceModal({ booking, onConfirm, onClose }) {
  const [cat, setCat]   = useState("Haircut");
  const [added, setAdded] = useState([]);
  const existing = booking.services.map(s => s.id);
  const filtered = SERVICES.filter(s => s.cat === cat && !existing.includes(s.id));
  const toggle   = id => setAdded(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const total    = SERVICES.filter(s => added.includes(s.id)).reduce((a, s) => a + s.price, 0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:600, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div style={{ background:C.bg, borderRadius:"20px 20px 0 0", width:"100%", maxHeight:"72vh", display:"flex", flexDirection:"column", overflow:"hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"clamp(14px,1.8vw,20px) clamp(20px,2.6vw,28px)", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1.5px solid ${C.border}`, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", marginBottom:3 }}>Tambah Layanan · Add Service</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(15px,1.9vw,18px)", color:C.text }}>untuk {booking.name}</div>
          </div>
          <button onClick={onClose} style={{ background:C.surface, border:"none", borderRadius:8, width:36, height:36, fontSize:18, cursor:"pointer", color:C.text2 }}>×</button>
        </div>
        <div style={{ display:"flex", gap:8, padding:"10px clamp(20px,2.6vw,28px)", borderBottom:`1px solid ${C.border}`, flexShrink:0, overflowX:"auto" }}>
          {SVC_CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${cat===c?C.text:C.border}`, background:cat===c?C.text:C.white, color:cat===c?C.white:C.text2, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(11px,1.3vw,13px)", cursor:"pointer", whiteSpace:"nowrap" }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"clamp(12px,1.6vw,16px) clamp(20px,2.6vw,28px)", WebkitOverflowScrolling:"touch" }}>
          {filtered.map(s => {
            const sel = added.includes(s.id);
            return (
              <div key={s.id} onClick={() => toggle(s.id)}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"clamp(12px,1.6vw,14px)", marginBottom:8, borderRadius:12, border:`1.5px solid ${sel?C.accent:C.border}`, background:sel?C.accent:C.white, cursor:"pointer", minHeight:60 }}>
                <div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,15px)", color:sel?C.accentText:C.text }}>{s.name}</div>
                  <div style={{ fontSize:"clamp(11px,1.3vw,12px)", color:sel?C.accentText:C.muted, marginTop:2 }}>⏱ {s.dur} min</div>
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(14px,1.7vw,16px)", color:sel?C.accentText:C.text }}>{fmt(s.price)}</div>
              </div>
            );
          })}
        </div>
        {added.length > 0 && (
          <div style={{ padding:"clamp(12px,1.6vw,16px) clamp(20px,2.6vw,28px)", borderTop:`1.5px solid ${C.border}`, display:"flex", gap:12, alignItems:"center", flexShrink:0 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"clamp(11px,1.3vw,13px)", color:C.muted }}>Tambahan total</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(16px,2vw,20px)", color:C.text }}>+{fmt(total)}</div>
            </div>
            <button onClick={() => onConfirm(added)}
              style={{ padding:"clamp(13px,1.7vw,15px) clamp(20px,2.6vw,26px)", borderRadius:12, background:C.topBg, color:C.white, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,15px)", border:"none", cursor:"pointer", minHeight:52 }}>
              Konfirmasi ({added.length}) →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Break Selector ────────────────────────────────────────────────────────────

function BreakSelector({ onStart, onCancel }) {
  const opts = [
    { dur:15, label:"15 menit", sub:"Istirahat singkat" },
    { dur:30, label:"30 menit", sub:"Makan siang" },
    { dur:45, label:"45 menit", sub:"Istirahat panjang" },
  ];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onCancel}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:"clamp(300px,38vw,360px)", overflow:"hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ background:C.topBg, padding:"clamp(16px,2vw,20px) clamp(20px,2.6vw,24px)" }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(15px,1.9vw,18px)", color:C.topText }}>Pilih Durasi Istirahat</div>
          <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#888", marginTop:3 }}>Slot Anda diblokir selama istirahat</div>
        </div>
        <div style={{ padding:"clamp(14px,1.8vw,18px)", display:"flex", flexDirection:"column", gap:10 }}>
          {opts.map(o => (
            <button key={o.dur} onClick={() => onStart(o.dur)}
              style={{ padding:"clamp(14px,1.8vw,16px)", borderRadius:12, background:C.surface, border:`1.5px solid ${C.border}`, textAlign:"left", cursor:"pointer" }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.8vw,17px)", color:C.text }}>{o.label}</div>
              <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:C.muted, marginTop:2 }}>{o.sub}</div>
            </button>
          ))}
          <button onClick={onCancel}
            style={{ padding:"clamp(12px,1.5vw,14px)", borderRadius:10, background:"none", border:`1.5px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(13px,1.5vw,14px)", color:C.text2, cursor:"pointer" }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── VIEW 1: Barber Picker ─────────────────────────────────────────────────────

function BarberPicker({ onSelect, onClose }) {
  const [calling, setCalling] = useState(null);

  const handleCall = (e, barber) => {
    e.stopPropagation();
    const q = (QUEUES[barber.id] || []).find(b => b.status === "confirmed" || b.status === "in_progress");
    const name = q?.name || null;
    if (!name) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`Panggil kapster ${barber.name}. Customer atas nama ${name} sedang menunggu.`);
      u.lang = "id-ID";
      window.speechSynthesis.speak(u);
    }
    setCalling(barber.id);
    setTimeout(() => setCalling(c => c === barber.id ? null : c), 3000);
  };

  const STATUS_META = {
    available:   { dot:"#4caf50", label:"Siap",         bg:"#1a3a1a" },
    busy:        { dot:"#ef9a50", label:"Melayani",      bg:"#3a2a0a" },
    on_break:    { dot:C.accent,  label:"Istirahat",     bg:"#2a2a0a" },
    clocked_out: { dot:"#444",    label:"Belum Masuk",   bg:"#1a1a1a" },
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:C.topBg, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ background:"#0a0a08", padding:"0 clamp(16px,2.4vw,28px)", height:"clamp(52px,6.5vh,64px)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, borderBottom:"1px solid #1a1a18" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <img src={BERCUT_LOGO} alt="Bercut" style={{ height:"clamp(22px,2.8vh,28px)", objectFit:"contain" }} />
          <div style={{ width:1, height:24, background:"#2a2a28" }} />
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(14px,1.8vw,18px)", color:C.white }}>Pilih Kapster</div>
            <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#555" }}>Ketuk nama Anda untuk masuk · Tap your name to continue</div>
          </div>
        </div>
        <button onClick={onClose}
          style={{ padding:"clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)", borderRadius:8, background:"#1a1a18", color:"#888", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,14px)", border:"1px solid #2a2a28", cursor:"pointer" }}>
          ← Kembali ke Booking
        </button>
      </div>

      {/* Barber grid */}
      <div style={{ flex:1, overflowY:"auto", padding:"clamp(16px,2vw,24px) clamp(16px,2.4vw,28px)", WebkitOverflowScrolling:"touch" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(clamp(200px,22vw,260px), 1fr))", gap:"clamp(10px,1.4vw,14px)" }}>
          {BARBERS.map((b, i) => {
            const sm = STATUS_META[b.status] || STATUS_META.clocked_out;
            const queue = QUEUES[b.id] || [];
            const nextUp = queue.find(bk => bk.status === "confirmed" || bk.status === "in_progress");
            const isCalling = calling === b.id;

            return (
              <div key={b.id}
                onClick={() => onSelect(b)}
                style={{ background:"#1a1a18", borderRadius:16, padding:"clamp(16px,2vw,20px)", border:"1.5px solid #2a2a28", cursor:"pointer", animation:`fadeUp 0.25s ease ${i * 0.05}s both`, transition:"border-color 0.15s, background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="#3a3a38"; e.currentTarget.style.background="#1e1e1c"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="#2a2a28"; e.currentTarget.style.background="#1a1a18"; }}>

                {/* Avatar + status */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ width:"clamp(44px,5.5vw,56px)", height:"clamp(44px,5.5vw,56px)", borderRadius:"50%", background:"#111110", border:`2px solid ${b.status === "clocked_out" ? "#2a2a28" : C.accent}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:"clamp(13px,1.6vw,16px)", color: b.status === "clocked_out" ? "#444" : C.accent }}>{b.name.slice(0,2).toUpperCase()}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5, background:sm.bg, padding:"4px 9px", borderRadius:6 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:sm.dot, flexShrink:0 }} />
                    <span style={{ fontSize:"clamp(9px,1.1vw,11px)", fontWeight:700, color:sm.dot, letterSpacing:"0.08em" }}>{sm.label}</span>
                  </div>
                </div>

                {/* Name + spec */}
                <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(14px,1.8vw,18px)", color: b.status === "clocked_out" ? "#555" : C.white, marginBottom:3 }}>{b.name}</div>
                <div style={{ fontSize:"clamp(10px,1.2vw,12px)", color:"#555", marginBottom:12 }}>{b.spec} · Kursi {b.chair}</div>

                {/* Next customer */}
                {nextUp && (
                  <div style={{ background:"#111110", borderRadius:8, padding:"8px 10px", marginBottom:10 }}>
                    <div style={{ fontSize:"clamp(9px,1.1vw,10px)", color:"#444", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>
                      {nextUp.status === "in_progress" ? "⚡ Sedang dilayani" : "→ Berikutnya"}
                    </div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:"clamp(11px,1.3vw,13px)", color: nextUp.status === "in_progress" ? C.accent : C.white }}>{nextUp.name}</div>
                    <div style={{ fontSize:"clamp(10px,1.1vw,11px)", color:"#555", marginTop:2 }}>{nextUp.services[0]?.name}{nextUp.services.length > 1 ? ` +${nextUp.services.length-1}` : ""}</div>
                  </div>
                )}

                {/* Call button */}
                {nextUp && (
                  <button
                    onClick={e => handleCall(e, b)}
                    style={{ width:"100%", padding:"clamp(9px,1.2vw,11px)", borderRadius:9, background: isCalling ? "#1a3a1a" : "#2a2a28", color: isCalling ? "#4caf50" : "#888", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(11px,1.3vw,13px)", border:"none", cursor:"pointer", minHeight:40, transition:"all 0.2s" }}>
                    {isCalling ? "✓ Dipanggil" : "📢 Panggil Kapster"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

// ── VIEW 2: Barber Detail Panel ───────────────────────────────────────────────

function BarberDetail({ barber, onBack, onClose, onPaymentTrigger }) {
  const [queue, setQueue]           = useState(getQueue(barber.id));
  const [status, setStatus]         = useState(barber.status === "clocked_out" ? "clocked_out" : barber.status);
  const [breakEnd, setBreakEnd]     = useState(null);
  const [breakLeft, setBreakLeft]   = useState(0);
  const [showBreak, setShowBreak]   = useState(false);
  const [showAddSvc, setShowAddSvc] = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const [announced, setAnnounced]   = useState(false);
  const [earningsView, setEarningsView] = useState("today"); // 'today' | 'month'
  const [now, setNow]               = useState(Date.now());

  const active = queue.find(b => b.status === "in_progress") || null;
  const next   = queue.find(b => b.status === "confirmed")   || null;

  // Clock that ticks every 30s — used for late-start detection
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Completed bookings today
  const done = queue.filter(b => b.status === "completed");
  const commissionRate = barber.commission_rate ?? 35;
  const commissionEarned = done.reduce((a, b) => a + Math.round(b.total * commissionRate / 100), 0);
  const tipsEarned       = done.reduce((a, b) => a + (b.tip || 0), 0);

  // Monthly mock data (static for prototype — production pulls from API)
  const MONTHLY = {
    commission: commissionEarned * 18 + 340000,
    tips:       tipsEarned * 14 + 175000,
    bookings:   done.length * 20 + 87,
    days:       22,
  };

  // Late-start detection for next booking
  const nextLateMin = (() => {
    if (!next || next.slot === "Now") return 0;
    const [h, m] = (next.slot || "").split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    const slotMs = new Date().setHours(h, m, 0, 0);
    const overMs = now - slotMs;
    return overMs > 0 ? Math.floor(overMs / 60000) : 0;
  })();

  // Elapsed timer
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
      if (left <= 0) { setBreakLeft(0); setBreakEnd(null); setStatus("available"); }
      else setBreakLeft(left);
    }, 1000);
    return () => clearInterval(t);
  }, [breakEnd]);

  const handleClockIn  = () => setStatus("available");
  const handleClockOut = () => { if (window.confirm("Yakin ingin clock out?")) onBack(); };
  const handleStartBreak = dur => { setBreakEnd(Date.now() + dur * 60 * 1000); setStatus("on_break"); setShowBreak(false); };
  const handleEndBreak   = () => { setBreakEnd(null); setBreakLeft(0); setStatus("available"); };

  const handleStart = id => {
    setQueue(q => q.map(b => b.id === id ? { ...b, status:"in_progress", startedAt:Date.now() } : b));
    setStatus("busy"); setElapsed(0); setAnnounced(false);
  };

  const handleComplete = booking => {
    setQueue(q => q.map(b => b.id === booking.id ? { ...b, status:"pending_payment" } : b));
    setStatus("available");
    if (onPaymentTrigger) onPaymentTrigger({ ...booking, barber: barber.name });
    else alert(`Pembayaran dipicu untuk ${booking.name}\nTotal: ${fmt(booking.total)}`);
    // Close panel so PaymentTakeover has the full kiosk screen for the customer
    onClose();
  };

  const [alertSent, setAlertSent] = useState(false);
  const handleClientNotArrived = id => {
    setAlertSent(true);
    // Production: POST /api/bookings/:id/client-not-arrived
    // → sends WA to branch backoffice_alert_phone + SSE alert badge in LiveMonitor
    console.info('[Bercut] Client not arrived alert sent for booking', id);
  };

  const handleAddServices = ids => {
    const toAdd = SERVICES.filter(s => ids.includes(s.id));
    setQueue(q => q.map(b =>
      b.id === active.id ? { ...b, services:[...b.services, ...toAdd], total: b.total + toAdd.reduce((a,s) => a+s.price, 0) } : b
    ));
    setShowAddSvc(false);
  };

  const handleCall = name => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`Panggil kapster ${barber.name}. Customer atas nama ${name} sedang menunggu.`);
      u.lang = "id-ID";
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
    setAnnounced(true);
  };

  // Auto-announce when next booking's slot time arrives and barber is free
  useEffect(() => {
    if (!next || status === "busy" || status === "clocked_out") return;
    if (next.slot === "Now") return; // "Now" slots are handled by QueueNumber on mount

    // Parse slot string like "14:30" into today's Date
    const [h, m] = next.slot.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return;
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const msUntil = target - Date.now();
    if (msUntil < 0 || msUntil > 60 * 60 * 1000) return; // skip if past or >1h away

    const t = setTimeout(() => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(`Kapster ${barber.name}, tolong jemput pelanggan ${next.name} di kursi ${barber.chair}.`);
        u.lang = "id-ID";
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
      }
      setAnnounced(true);
    }, msUntil);
    return () => clearTimeout(t);
  }, [next?.id, next?.slot, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Status action bar colours
  const isOut   = status === "clocked_out";
  const isBreak = status === "on_break";
  const isBusy  = status === "busy";

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:C.topBg, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {showBreak   && <BreakSelector onStart={handleStartBreak} onCancel={() => setShowBreak(false)} />}
      {showAddSvc && active && <AddServiceModal booking={active} onConfirm={handleAddServices} onClose={() => setShowAddSvc(false)} />}

      {/* Top bar */}
      <div style={{ background:"#0a0a08", padding:"0 clamp(16px,2.4vw,28px)", height:"clamp(52px,6.5vh,64px)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, borderBottom:"1px solid #1a1a18" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <img src={BERCUT_LOGO} alt="Bercut" style={{ height:"clamp(22px,2.8vh,28px)", objectFit:"contain" }} />
          <div style={{ width:1, height:24, background:"#2a2a28" }} />
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(14px,1.8vw,18px)", color:C.white }}>{barber.name}</div>
            <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#555" }}>Kursi {barber.chair} · {barber.spec}</div>
          </div>
        </div>
        <button onClick={onBack}
          style={{ padding:"clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)", borderRadius:8, background:"#1a1a18", color:"#888", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,14px)", border:"1px solid #2a2a28", cursor:"pointer" }}>
          ← Ganti Kapster
        </button>
      </div>

      {/* ── PROMINENT STATUS ACTION BAR ───────────────────────────────────────── */}
      <div style={{ background:"#0d0d0b", padding:"clamp(12px,1.6vw,16px) clamp(16px,2.4vw,28px)", display:"flex", gap:"clamp(10px,1.4vw,14px)", alignItems:"stretch", flexShrink:0, borderBottom:"1px solid #1a1a18" }}>

        {/* Clock In / Out */}
        {isOut ? (
          <button onClick={handleClockIn}
            style={{ flex:1, padding:"clamp(14px,1.8vw,18px)", borderRadius:14, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.7vw,17px)", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, minHeight:72 }}>
            <span style={{ fontSize:"clamp(18px,2.4vw,24px)" }}>🟢</span>
            <span>Clock In / Masuk</span>
            <span style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:400, opacity:0.7 }}>Ketuk untuk mulai shift</span>
          </button>
        ) : (
          <button onClick={handleClockOut}
            style={{ flex:1, padding:"clamp(14px,1.8vw,18px)", borderRadius:14, background:"#1a1a18", color:"#888", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.7vw,17px)", border:"2px solid #2a2a28", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, minHeight:72 }}>
            <span style={{ fontSize:"clamp(18px,2.4vw,24px)" }}>🔴</span>
            <span style={{ color:C.white }}>Clock Out / Keluar</span>
            <span style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:400, color:"#555" }}>Akhiri shift hari ini</span>
          </button>
        )}

        {/* Break */}
        {isBreak ? (
          <button onClick={handleEndBreak}
            style={{ flex:1.5, padding:"clamp(14px,1.8vw,18px)", borderRadius:14, background:"#2a2a10", color:C.accent, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.7vw,17px)", border:`2px solid #3a3a10`, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, minHeight:72 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:"clamp(20px,2.6vw,28px)", fontVariantNumeric:"tabular-nums", color:C.accent }}>
              {formatElapsed(breakLeft)}
            </span>
            <span>Akhiri Istirahat ☕</span>
            <span style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:400, color:"#888" }}>Ketuk untuk kembali bertugas</span>
          </button>
        ) : (
          <button onClick={() => !isOut && !isBusy && setShowBreak(true)}
            disabled={isOut || isBusy}
            style={{ flex:1.5, padding:"clamp(14px,1.8vw,18px)", borderRadius:14, background: (isOut||isBusy) ? "#111110" : "#1a1a18", color: (isOut||isBusy) ? "#333" : "#888", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.7vw,17px)", border:`2px solid ${(isOut||isBusy) ? "#1a1a18" : "#2a2a28"}`, cursor: (isOut||isBusy) ? "not-allowed" : "pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, minHeight:72, transition:"all 0.15s" }}>
            <span style={{ fontSize:"clamp(18px,2.4vw,24px)", opacity: (isOut||isBusy) ? 0.3 : 1 }}>☕</span>
            <span style={{ color: (isOut||isBusy) ? "#333" : C.white }}>Istirahat</span>
            <span style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:400, color:"#444" }}>15 · 30 · 45 menit</span>
          </button>
        )}

        {/* Current status indicator */}
        <div style={{ flex:1, padding:"clamp(14px,1.8vw,18px)", borderRadius:14, background:"#111110", border:"2px solid #1a1a18", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, minHeight:72 }}>
          {isOut    && <><span style={{ fontSize:"clamp(18px,2.4vw,24px)" }}>😴</span><span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.5vw,14px)", color:"#444" }}>Belum Masuk</span></>}
          {isBreak  && <><span style={{ fontSize:"clamp(18px,2.4vw,24px)" }}>🌿</span><span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.5vw,14px)", color:C.accent }}>Istirahat</span></>}
          {isBusy   && <><span style={{ fontSize:"clamp(18px,2.4vw,24px)" }}>✂️</span><span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.5vw,14px)", color:"#ef9a50" }}>Melayani</span></>}
          {!isOut && !isBreak && !isBusy && <><span style={{ fontSize:"clamp(18px,2.4vw,24px)" }}>✅</span><span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.5vw,14px)", color:"#4caf50" }}>Siap Bertugas</span></>}
          <span style={{ fontSize:"clamp(9px,1.1vw,10px)", color:"#333", letterSpacing:"0.1em", textTransform:"uppercase" }}>Status Shift</span>
        </div>

      </div>

      {/* Body */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Left — Queue */}
        <div style={{ width:"clamp(320px,42vw,480px)", borderRight:"1px solid #1a1a18", display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>

          {/* SEKARANG */}
          <div style={{ padding:"clamp(14px,1.8vw,20px)", borderBottom:"1px solid #1a1a18", flexShrink:0 }}>
            <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.14em", color:"#444", textTransform:"uppercase", marginBottom:10 }}>⚡ Sekarang</div>

            {active ? (
              <div style={{ background:"#1a1a18", borderRadius:14, padding:"clamp(12px,1.6vw,16px)", border:"1.5px solid #2a2a28" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(16px,2vw,22px)", color:C.white }}>{active.name}</div>
                    <div style={{ fontSize:"clamp(11px,1.3vw,12px)", color:"#666", marginTop:2 }}>{active.services.map(s=>s.name).join(" + ")}</div>
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(11px,1.3vw,13px)", color:"#555" }}>#{active.number}</div>
                </div>
                {(() => {
                  const estMs   = active.services.reduce((a, s) => a + (s.dur || 0), 0) * 60 * 1000;
                  const diffMs  = elapsed - estMs;
                  const isOver  = diffMs > 0;
                  const diffMin = Math.abs(Math.floor(diffMs / 60000));
                  return (
                    <div style={{ background:"#111110", borderRadius:9, padding:"9px 13px", marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                        <span style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#555", textTransform:"uppercase", letterSpacing:"0.1em" }}>Waktu berjalan</span>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:"clamp(18px,2.4vw,24px)", color:C.accent, fontVariantNumeric:"tabular-nums" }}>{formatElapsed(elapsed)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#444" }}>Estimasi: {formatElapsed(estMs)}</span>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(11px,1.3vw,13px)", color: elapsed < 5000 ? "#555" : isOver ? "#ef5350" : "#4caf50" }}>
                          {elapsed < 5000 ? "—" : isOver ? `+${diffMin}m melebihi` : diffMin === 0 ? "tepat waktu" : `−${diffMin}m tersisa`}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div style={{ marginTop:7, height:3, borderRadius:2, background:"#1a1a18", overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:2, width:`${Math.min(100, estMs > 0 ? (elapsed / estMs) * 100 : 0)}%`, background: isOver ? "#ef5350" : C.accent, transition:"width 1s linear" }} />
                      </div>
                    </div>
                  );
                })()}
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => setShowAddSvc(true)}
                    style={{ flex:1, padding:"clamp(11px,1.5vw,13px)", borderRadius:9, background:"#2a2a28", color:C.white, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,13px)", border:"none", cursor:"pointer", minHeight:48 }}>
                    + Tambah
                  </button>
                  <button onClick={() => handleComplete(active)}
                    style={{ flex:2, padding:"clamp(11px,1.5vw,13px)", borderRadius:9, background:C.accent, color:C.accentText, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,15px)", border:"none", cursor:"pointer", minHeight:48 }}>
                    Selesai ✓
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background:"#1a1a18", borderRadius:14, padding:"clamp(16px,2vw,22px)", textAlign:"center", border:"1px dashed #2a2a28" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>✂</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.5vw,14px)", color:"#555" }}>
                  {isBreak ? "Sedang istirahat" : isOut ? "Belum clock in" : "Tidak ada pelanggan aktif"}
                </div>
              </div>
            )}
          </div>

          {/* BERIKUTNYA */}
          {next && (
            <div style={{ padding:"clamp(14px,1.8vw,20px)", flex:1, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, letterSpacing:"0.14em", color:"#444", textTransform:"uppercase" }}>→ Berikutnya</div>
                {nextLateMin >= 5 && (
                  <div style={{ display:"flex", alignItems:"center", gap:5, background:"#2a0a0a", border:"1px solid #7a1a1a", borderRadius:5, padding:"2px 8px" }}>
                    <span style={{ fontSize:10 }}>⚠</span>
                    <span style={{ fontSize:"clamp(9px,1.1vw,10px)", fontWeight:700, color:"#ef5350", letterSpacing:"0.06em" }}>TERLAMBAT {nextLateMin}M</span>
                  </div>
                )}
              </div>
              <div style={{ background:"#1a1a18", borderRadius:14, padding:"clamp(12px,1.6vw,16px)", border:`1.5px solid ${nextLateMin >= 10 ? "#7a1a1a" : nextLateMin >= 5 ? "#5a3a0a" : "#2a2a28"}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(14px,1.8vw,18px)", color:C.white }}>{next.name}</div>
                    <div style={{ fontSize:"clamp(11px,1.3vw,12px)", color:"#666", marginTop:2 }}>{next.services.map(s=>s.name).join(" + ")}</div>
                    <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color: nextLateMin >= 5 ? "#ef9a50" : "#444", marginTop:4 }}>
                      Slot: {next.slot}{nextLateMin >= 5 ? ` · ${nextLateMin} menit terlambat` : ""}
                    </div>
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(13px,1.7vw,16px)", color:C.accent }}>{fmt(next.total)}</div>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button onClick={() => handleCall(next.name)}
                    style={{ flex:1, minWidth:60, padding:"clamp(10px,1.3vw,12px)", borderRadius:9, background: announced ? "#1a3a1a" : "#2a2a28", color: announced ? "#4caf50" : "#888", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(11px,1.3vw,13px)", border:"none", cursor:"pointer", minHeight:44 }}>
                    {announced ? "✓ Dipanggil" : "📢 Panggil"}
                  </button>
                  <button onClick={() => !alertSent && handleClientNotArrived(next.id)}
                    disabled={alertSent}
                    style={{ flex:1, minWidth:60, padding:"clamp(10px,1.3vw,12px)", borderRadius:9, background: alertSent ? "#1a2a1a" : "#2a2a28", color: alertSent ? "#4caf50" : "#888", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(11px,1.3vw,13px)", border:"none", cursor: alertSent ? "not-allowed" : "pointer", minHeight:44 }}>
                    {alertSent ? "✓ Admin diberitahu" : "⚠ Belum Datang"}
                  </button>
                  <button onClick={() => !active && !isBreak && !isOut && handleStart(next.id)}
                    disabled={!!active || isBreak || isOut}
                    style={{ flex:2, minWidth:100, padding:"clamp(10px,1.3vw,12px)", borderRadius:9, background:(!active&&!isBreak&&!isOut)?C.white:"#2a2a28", color:(!active&&!isBreak&&!isOut)?C.text:"#555", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.5vw,14px)", border:"none", cursor:(!active&&!isBreak&&!isOut)?"pointer":"not-allowed", minHeight:44 }}>
                    {active ? "Selesaikan dulu ↑" : isBreak ? "Sedang istirahat" : isOut ? "Clock in dulu" : "Mulai Layanan →"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — Today's summary */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Earnings summary cards */}
          <div style={{ padding:"clamp(10px,1.3vw,14px) clamp(14px,1.8vw,20px)", flexShrink:0, borderBottom:"1px solid #1a1a18" }}>
            {/* Toggle */}
            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
              {[["today","Hari Ini"],["month","Bulan Ini"]].map(([k, lbl]) => (
                <button key={k} onClick={() => setEarningsView(k)}
                  style={{ padding:"5px 14px", borderRadius:20, border:`1.5px solid ${earningsView===k ? C.accent : "#2a2a28"}`, background:earningsView===k ? "#1a1a0a" : "#111110", color:earningsView===k ? C.accent : "#555", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(10px,1.2vw,12px)", cursor:"pointer" }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              {(earningsView === "today" ? [
                { label:"Komisi",          value: fmt(commissionEarned), sub:`${commissionRate}% dari layanan`, accent:"#4caf50" },
                { label:"Tips",            value: tipsEarned > 0 ? fmt(tipsEarned) : "—", sub:"100% untuk kamu", accent:C.accent },
                { label:"Selesai",         value: done.length, sub:`dari ${queue.length} booking`, accent:C.white },
              ] : [
                { label:"Komisi Bulan Ini",  value: fmt(MONTHLY.commission), sub:`${commissionRate}% · ${MONTHLY.days} hari kerja`, accent:"#4caf50" },
                { label:"Tips Bulan Ini",    value: fmt(MONTHLY.tips),       sub:"100% untuk kamu", accent:C.accent },
                { label:"Total Layanan",     value: MONTHLY.bookings,        sub:"booking selesai bulan ini", accent:C.white },
              ]).map(s => (
                <div key={s.label} style={{ flex:1, background:"#1a1a18", borderRadius:12, padding:"clamp(10px,1.4vw,14px)", border:"1.5px solid #2a2a28" }}>
                  <div style={{ fontSize:"clamp(9px,1.1vw,10px)", fontWeight:700, letterSpacing:"0.12em", color:"#555", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:"clamp(17px,2.2vw,24px)", color:s.accent, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:"clamp(9px,1.1vw,11px)", color:"#444", marginTop:5 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Unified scrollable list — colour-coded left border per status */}
          <div style={{ flex:1, overflowY:"auto", padding:"clamp(10px,1.4vw,14px) clamp(14px,1.8vw,20px)", WebkitOverflowScrolling:"touch" }}>
            {[...done, ...(active ? [active] : []), ...(next ? [next] : []), ...queue.filter(b => b.status === "confirmed" && b !== next)]
              .concat(queue.filter(b => b.status === "no_show" || b.status === "cancelled"))
              .filter((b, i, arr) => arr.indexOf(b) === i) // dedupe
              .map((b, i) => {
                const isCompleted = b.status === "completed";
                const isActive    = b.status === "in_progress";
                const isUpcoming  = b.status === "confirmed";
                const isBad       = b.status === "no_show" || b.status === "cancelled";

                const accent      = isCompleted ? "#4caf50" : isActive ? C.accent : isUpcoming ? "#888" : "#555";
                const labelText   = isCompleted ? "Selesai" : isActive ? "Dilayani" : isUpcoming ? b.slot : b.status === "no_show" ? "Tidak Hadir" : "Dibatalkan";
                const labelBg     = isCompleted ? "#0d1f0d" : isActive ? "#1a1a0a" : isUpcoming ? "#1a1a1a" : "#1a0d0d";
                const commission  = isCompleted ? Math.round(b.total * commissionRate / 100) : null;

                return (
                  <div key={b.id}
                    style={{ display:"flex", gap:0, marginBottom:8, borderRadius:12, overflow:"hidden", background:"#1a1a18", border:"1px solid #222", animation:`fadeUp 0.2s ease ${i*0.05}s both`, opacity: isBad ? 0.5 : 1 }}>

                    {/* Colour bar */}
                    <div style={{ width:4, flexShrink:0, background:accent, borderRadius:"12px 0 0 12px" }} />

                    {/* Card body */}
                    <div style={{ flex:1, padding:"clamp(10px,1.4vw,13px) clamp(11px,1.5vw,14px)" }}>

                      {/* Row 1: status label + slot + booking number + earnings */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <span style={{ fontSize:"clamp(10px,1.2vw,11px)", fontWeight:700, color:accent, background:labelBg, borderRadius:4, padding:"2px 8px", letterSpacing:"0.06em" }}>
                            {labelText}
                          </span>
                          {/* Slot time — only show separately for non-upcoming since label already shows slot for upcoming */}
                          {!isUpcoming && (
                            <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.4vw,13px)", color:"#666" }}>{b.slot}</span>
                          )}
                          <span style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#333", background:"#111", borderRadius:4, padding:"2px 6px" }}>#{b.number}</span>
                        </div>
                        {/* Earnings (completed) or total (others) */}
                        {isCompleted && commission !== null ? (
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(13px,1.6vw,15px)", color:"#4caf50" }}>+{fmt(commission)}</div>
                            <div style={{ fontSize:"clamp(9px,1.1vw,10px)", color:"#3a6a3a", letterSpacing:"0.07em" }}>KOMISI{b.tip > 0 ? ` · +${fmt(b.tip)} tip` : ""}</div>
                          </div>
                        ) : (
                          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.5vw,14px)", color: isBad ? "#444" : "#666", flexShrink:0 }}>{fmt(b.total)}</div>
                        )}
                      </div>

                      {/* Row 2: customer name */}
                      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,15px)", color: isBad ? "#555" : C.white, marginBottom:7 }}>{b.name}</div>

                      {/* Row 3: service pills — same style as kiosk service cards */}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                        {b.services.map(s => (
                          <span key={s.id} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"clamp(10px,1.2vw,12px)", fontWeight:600, color: isBad ? "#444" : isCompleted ? "#5aaa5a" : isActive ? C.accentText : "#888", background: isBad ? "#111" : isCompleted ? "#0d1f0d" : isActive ? C.accent : "#111110", border:`1px solid ${isBad ? "#1a1a18" : isCompleted ? "#1e3a1e" : isActive ? C.accent : "#2a2a28"}`, borderRadius:5, padding:"3px 9px" }}>
                            {s.name}
                            <span style={{ opacity:0.6, fontWeight:400 }}>· {s.dur}m</span>
                          </span>
                        ))}
                      </div>

                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function BarberPanel({ onClose, onPaymentTrigger }) {
  const [selected, setSelected] = useState(null);

  if (!selected) {
    return <BarberPicker onSelect={setSelected} onClose={onClose} />;
  }
  return (
    <BarberDetail
      barber={selected}
      onBack={() => setSelected(null)}
      onClose={onClose}
      onPaymentTrigger={onPaymentTrigger}
    />
  );
}
