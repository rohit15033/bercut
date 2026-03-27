/**
 * MOCKUP — Bercut Kiosk: AdminPanel
 *
 * What it does: Full-screen kiosk panel for branch admin/owner. Opens after admin
 *   password is verified via Topbar AccessModal. Shows today's full branch queue
 *   across all barbers, barber status board, and quick branch settings.
 * State managed: activeTab, selectedBooking, barbers, bookings, tipPresets,
 *   speakerEnabled, lateThreshold, showCancelConfirm
 * Production API:
 *   GET  /api/admin/branch-overview?branch_id=&date=today
 *   GET  /api/bookings?branch_id=&date=today
 *   GET  /api/barbers?branch_id=
 *   PATCH /api/bookings/:id/cancel
 *   PATCH /api/bookings/:id/no-show
 *   POST  /api/bookings/:id/payment-trigger  (manual payment trigger)
 *   PATCH /api/branches/:id/settings
 * Feeds into: PaymentTakeover (manual payment trigger for any booking)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/admin/AdminPanel.jsx
 * Reference prompt: _ai/prompting-guide.md Section 05C
 */

import { useState } from "react";
import { BARBERS, C, fmt, SERVICES, BERCUT_LOGO } from "./data.js";

// ── Mock data ─────────────────────────────────────────────────────────────────

const BRANCH = { name: "Bercut Seminyak", id: "branch-001" };

const TODAY_BOOKINGS = [
  { id:"b1",  number:"B099", barber:"Guntur",  barberId:1, name:"Budi Santoso",  services:"Just a Haircut",            total:130000, slot:"09:30", status:"completed",       payment:"paid"    },
  { id:"b2",  number:"B100", barber:"Pangestu", barberId:2, name:"James Holden",  services:"Skin Fade + Beard Trim",    total:205000, slot:"09:45", status:"completed",       payment:"paid"    },
  { id:"b3",  number:"B101", barber:"Rifky",   barberId:3, name:"Wayan Sudirta", services:"Prestige Package",          total:215000, slot:"10:00", status:"in_progress",    payment:"unpaid"  },
  { id:"b4",  number:"B102", barber:"Guntur",  barberId:1, name:"Rizal Ahmad",   services:"Skin Fade",                 total:130000, slot:"10:30", status:"confirmed",      payment:"unpaid"  },
  { id:"b5",  number:"B103", barber:"Axel",    barberId:7, name:"David Lim",     services:"President Package",         total:555000, slot:"10:30", status:"in_progress",    payment:"unpaid"  },
  { id:"b6",  number:"B104", barber:"Sep",     barberId:4, name:"Tomas Varga",   services:"Hair Coloring",             total:175000, slot:"11:00", status:"confirmed",      payment:"unpaid"  },
  { id:"b7",  number:"B105", barber:"Rian",    barberId:8, name:"Michael Tan",   services:"Just a Haircut + Beard Shaving", total:225000, slot:"11:00", status:"confirmed", payment:"unpaid"  },
  { id:"b8",  number:"B106", barber:"Agung",   barberId:5, name:"Ketut Wirawan", services:"Luxury Package",            total:445000, slot:"11:30", status:"confirmed",      payment:"unpaid"  },
  { id:"b9",  number:"B107", barber:"Rahmat",  barberId:6, name:"Alex Johnson",  services:"Beard Trim + Face Scrub",   total:160000, slot:"12:00", status:"confirmed",      payment:"unpaid"  },
  { id:"b10", number:"B108", barber:"Rifky",   barberId:3, name:"Made Subrata",  services:"Hair Tattoo",               total:150000, slot:"13:00", status:"confirmed",      payment:"unpaid"  },
  { id:"b11", number:"B109", barber:"Pangestu",barberId:2, name:"Chris Walker",  services:"Skin Fade + Nose Wax",      total:225000, slot:"13:30", status:"no_show",        payment:"unpaid"  },
  { id:"b12", number:"B110", barber:"Guntur",  barberId:1, name:"Nguyen Van An", services:"Just a Haircut",            total:130000, slot:"14:00", status:"confirmed",      payment:"unpaid"  },
];

const MOCK_BARBERS = BARBERS.map(b => ({
  ...b,
  clockedIn: b.status !== "clocked_out",
  todayBookings: TODAY_BOOKINGS.filter(bk => bk.barberId === b.id).length,
  todayRevenue:  TODAY_BOOKINGS.filter(bk => bk.barberId === b.id && bk.payment === "paid").reduce((a, bk) => a + bk.total, 0),
}));

const STATUS_META = {
  confirmed:       { label:"Menunggu",    labelEn:"Waiting",        bg:"#1a1a2a", color:"#7b9bef", border:"#2a2a3a" },
  in_progress:     { label:"Dilayani",    labelEn:"In Progress",    bg:"#1a2a0a", color:"#a5c840", border:"#2a3a10" },
  pending_payment: { label:"Pembayaran",  labelEn:"Paying",         bg:"#2a1a0a", color:"#ef9a50", border:"#3a2a10" },
  completed:       { label:"Selesai",     labelEn:"Done",           bg:"#0a2a0a", color:"#4caf50", border:"#1a3a1a" },
  no_show:         { label:"Tidak Hadir", labelEn:"No-show",        bg:"#2a0a0a", color:"#ef5350", border:"#3a1a1a" },
  cancelled:       { label:"Dibatalkan",  labelEn:"Cancelled",      bg:"#1a1a1a", color:"#555",    border:"#2a2a2a" },
};

const BARBER_STATUS_META = {
  available:   { dot:"#4caf50", label:"Siap" },
  busy:        { dot:"#ef9a50", label:"Melayani" },
  on_break:    { dot:C.accent,  label:"Istirahat" },
  clocked_out: { dot:"#444",    label:"Belum Masuk" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background:"#1a1a18", borderRadius:12, padding:"clamp(12px,1.6vw,16px) clamp(14px,1.8vw,18px)", flex:1 }}>
      <div style={{ fontSize:"clamp(10px,1.1vw,11px)", fontWeight:700, letterSpacing:"0.12em", color:"#555", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:"clamp(20px,2.6vw,28px)", color: accent || C.white, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:"clamp(10px,1.2vw,12px)", color:"#555", marginTop:4 }}>{sub}</div>}
    </div>
  );
}

// ── Booking row action menu ───────────────────────────────────────────────────

function BookingRow({ b, onCancel, onNoShow, onTriggerPayment }) {
  const [open, setOpen] = useState(false);
  const m = STATUS_META[b.status] || STATUS_META.cancelled;
  const canPay    = b.status === "in_progress" || b.status === "pending_payment";
  const canCancel = b.status === "confirmed";
  const canNoShow = b.status === "confirmed";

  return (
    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 120px 100px 110px 80px", gap:8, alignItems:"center", padding:"clamp(10px,1.3vw,13px) clamp(12px,1.6vw,16px)", borderBottom:"1px solid #1a1a18", position:"relative" }}
      onMouseEnter={e => e.currentTarget.style.background="#161614"}
      onMouseLeave={e => e.currentTarget.style.background="transparent"}>

      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.4vw,14px)", color:C.accent }}>#{b.number}</div>

      <div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,14px)", color:C.white }}>{b.name}</div>
        <div style={{ fontSize:"clamp(10px,1.2vw,12px)", color:"#555", marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.services}</div>
      </div>

      <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"#777" }}>{b.barber} · {b.slot}</div>

      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.4vw,14px)", color:C.white }}>{fmt(b.total)}</div>

      <div>
        <span style={{ fontSize:"clamp(10px,1.1vw,11px)", fontWeight:700, padding:"3px 9px", borderRadius:5, background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>{m.label}</span>
      </div>

      <div style={{ position:"relative" }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ background:"#2a2a28", border:"none", borderRadius:7, width:32, height:32, color:"#888", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          ···
        </button>
        {open && (
          <div style={{ position:"absolute", right:0, top:36, background:"#1a1a18", border:"1px solid #2a2a28", borderRadius:10, zIndex:10, minWidth:160, boxShadow:"0 4px 20px rgba(0,0,0,0.5)", overflow:"hidden" }}
            onMouseLeave={() => setOpen(false)}>
            {canPay && (
              <button onClick={() => { onTriggerPayment(b); setOpen(false); }}
                style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", color:C.accent, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,13px)", textAlign:"left", cursor:"pointer", display:"flex", gap:8, alignItems:"center" }}
                onMouseEnter={e => e.currentTarget.style.background="#2a2a10"}
                onMouseLeave={e => e.currentTarget.style.background="none"}>
                💳 Proses Pembayaran
              </button>
            )}
            {canCancel && (
              <button onClick={() => { onCancel(b.id); setOpen(false); }}
                style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", color:"#ef5350", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,13px)", textAlign:"left", cursor:"pointer", display:"flex", gap:8, alignItems:"center" }}
                onMouseEnter={e => e.currentTarget.style.background="#2a1010"}
                onMouseLeave={e => e.currentTarget.style.background="none"}>
                ✕ Batalkan
              </button>
            )}
            {canNoShow && (
              <button onClick={() => { onNoShow(b.id); setOpen(false); }}
                style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", color:"#888", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,13px)", textAlign:"left", cursor:"pointer", display:"flex", gap:8, alignItems:"center" }}
                onMouseEnter={e => e.currentTarget.style.background="#1a1a18"}
                onMouseLeave={e => e.currentTarget.style.background="none"}>
                👻 Tidak Hadir
              </button>
            )}
            {!canPay && !canCancel && !canNoShow && (
              <div style={{ padding:"10px 14px", color:"#444", fontSize:12 }}>Tidak ada aksi</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminPanel({ onClose, onHome, onPaymentTrigger }) {
  const [tab, setTab]           = useState("queue");   // "queue" | "barbers" | "settings"
  const [filter, setFilter]     = useState("all");
  const [bookings, setBookings] = useState(TODAY_BOOKINGS);

  // Settings state
  const [speakerOn, setSpeakerOn]       = useState(true);
  const [lateThreshold, setLateThreshold] = useState(10);
  const [ackGrace, setAckGrace]         = useState(3);
  const [tipPresets, setTipPresets]     = useState([10000, 20000, 50000]);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleCancel = (id) => setBookings(b => b.map(x => x.id === id ? { ...x, status: "cancelled" } : x));
  const handleNoShow = (id) => setBookings(b => b.map(x => x.id === id ? { ...x, status: "no_show" } : x));
  const handlePayment = (booking) => {
    if (onPaymentTrigger) onPaymentTrigger(booking);
    else alert(`Memproses pembayaran untuk ${booking.name}\nTotal: ${fmt(booking.total)}`);
  };
  const handleSaveSettings = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  const stats = {
    totalRevenue: bookings.filter(b => b.payment === "paid").reduce((a, b) => a + b.total, 0),
    activeCount:  bookings.filter(b => b.status === "in_progress").length,
    waitingCount: bookings.filter(b => b.status === "confirmed").length,
    doneCount:    bookings.filter(b => b.status === "completed").length,
  };

  const TABS = [
    { key:"queue",    label:"Antrian Hari Ini", icon:"📋" },
    { key:"barbers",  label:"Status Kapster",   icon:"✂" },
    { key:"settings", label:"Pengaturan",       icon:"⚙" },
  ];

  const FILTERS = [
    { key:"all",         label:"Semua" },
    { key:"confirmed",   label:"Menunggu" },
    { key:"in_progress", label:"Dilayani" },
    { key:"completed",   label:"Selesai" },
    { key:"no_show",     label:"Tidak Hadir" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:C.topBg, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Top bar */}
      <div style={{ background:"#0a0a08", padding:"0 clamp(16px,2.4vw,28px)", height:"clamp(52px,6.5vh,64px)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, borderBottom:"1px solid #1a1a18" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <img src={BERCUT_LOGO} alt="Bercut" onClick={onHome} style={{ height:"clamp(22px,2.8vh,28px)", width:"auto", objectFit:"contain", cursor:"pointer" }}/>
          <div style={{ width:1, height:24, background:"#2a2a28" }} />
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,16px)", color:C.white }}>{BRANCH.name}</div>
            <div style={{ fontSize:"clamp(10px,1.1vw,11px)", color:"#555" }}>Admin Panel</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", gap:2, background:"#111110", borderRadius:10, padding:3 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding:"clamp(7px,0.9vw,9px) clamp(12px,1.5vw,16px)", borderRadius:8, background: tab === t.key ? "#2a2a28" : "none", color: tab === t.key ? C.white : "#555", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.3vw,13px)", border:"none", cursor:"pointer", display:"flex", gap:6, alignItems:"center", transition:"all 0.15s" }}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose}
            style={{ padding:"clamp(8px,1vw,10px) clamp(14px,1.8vw,18px)", borderRadius:8, background:"#1a1a18", color:C.white, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.4vw,14px)", border:"1px solid #333", cursor:"pointer" }}>
            ← Kembali ke Booking
          </button>
        </div>
      </div>

      {/* Stat bar */}
      <div style={{ background:"#0d0d0b", padding:"clamp(10px,1.4vw,14px) clamp(16px,2.4vw,28px)", display:"flex", gap:10, flexShrink:0, borderBottom:"1px solid #1a1a18" }}>
        <StatCard label="Pendapatan Hari Ini" value={fmt(stats.totalRevenue)} sub={`${stats.doneCount} transaksi selesai`} accent="#4caf50" />
        <StatCard label="Sedang Dilayani"     value={stats.activeCount}       sub="di kursi sekarang"                        accent={C.accent} />
        <StatCard label="Menunggu"            value={stats.waitingCount}      sub="booking terkonfirmasi"                    accent="#7b9bef" />
        <StatCard label="Kapster Aktif"       value={MOCK_BARBERS.filter(b => b.status !== "clocked_out").length} sub={`dari ${MOCK_BARBERS.length} total`} />
      </div>

      {/* Body */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* ── TAB: QUEUE ─────────────────────────────────────────────────────── */}
        {tab === "queue" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

            {/* Filter bar */}
            <div style={{ padding:"clamp(10px,1.4vw,14px) clamp(16px,2.4vw,28px)", display:"flex", gap:8, alignItems:"center", flexShrink:0, borderBottom:"1px solid #1a1a18" }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${filter===f.key?"#555":"#2a2a28"}`, background:filter===f.key?"#2a2a28":"none", color:filter===f.key?C.white:"#555", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"clamp(11px,1.3vw,13px)", cursor:"pointer", transition:"all 0.15s" }}>
                  {f.label}
                  <span style={{ marginLeft:6, fontSize:"clamp(10px,1.1vw,11px)", color: filter===f.key?C.accent:"#444" }}>
                    {f.key === "all" ? bookings.length : bookings.filter(b => b.status === f.key).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Table header */}
            <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 120px 100px 110px 80px", gap:8, padding:"8px clamp(12px,1.6vw,16px)", flexShrink:0 }}>
              {["#","Pelanggan","Kapster · Slot","Total","Status",""].map((h, i) => (
                <div key={i} style={{ fontSize:"clamp(9px,1.1vw,10px)", fontWeight:700, letterSpacing:"0.12em", color:"#444", textTransform:"uppercase" }}>{h}</div>
              ))}
            </div>

            {/* Table rows */}
            <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
              {filtered.length === 0 && (
                <div style={{ textAlign:"center", padding:"48px 0", color:"#444", fontFamily:"'DM Sans',sans-serif", fontSize:14 }}>Tidak ada booking dengan filter ini</div>
              )}
              {filtered.map((b, i) => (
                <div key={b.id} style={{ animation:`fadeUp 0.2s ease ${i * 0.04}s both` }}>
                  <BookingRow b={b} onCancel={handleCancel} onNoShow={handleNoShow} onTriggerPayment={handlePayment} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: BARBERS ───────────────────────────────────────────────────── */}
        {tab === "barbers" && (
          <div style={{ flex:1, overflowY:"auto", padding:"clamp(16px,2vw,22px) clamp(16px,2.4vw,28px)", WebkitOverflowScrolling:"touch" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(clamp(220px,26vw,280px), 1fr))", gap:12 }}>
              {MOCK_BARBERS.map((b, i) => {
                const sm = BARBER_STATUS_META[b.status];
                return (
                  <div key={b.id}
                    style={{ background:"#1a1a18", borderRadius:14, padding:"clamp(14px,1.8vw,18px)", border:`1.5px solid ${b.status === "in_progress" ? "#2a3a10" : "#2a2a28"}`, animation:`fadeUp 0.25s ease ${i * 0.05}s both` }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        {/* Avatar circle */}
                        <div style={{ width:44, height:44, borderRadius:"50%", background:b.status === "clocked_out" ? "#2a2a28" : "#111110", border:`2px solid ${b.status === "clocked_out" ? "#333" : C.accent}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:900, fontSize:15, color: b.status === "clocked_out" ? "#444" : C.accent }}>{b.name.slice(0,2).toUpperCase()}</span>
                        </div>
                        <div>
                          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.6vw,15px)", color: b.status === "clocked_out" ? "#555" : C.white }}>{b.name}</div>
                          <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#555", marginTop:1 }}>Kursi {b.chair}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:sm.dot, flexShrink:0 }} />
                        <span style={{ fontSize:"clamp(10px,1.1vw,11px)", fontWeight:600, color:sm.dot }}>{sm.label}</span>
                      </div>
                    </div>

                    <div style={{ display:"flex", gap:8 }}>
                      <div style={{ flex:1, background:"#111110", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                        <div style={{ fontSize:"clamp(9px,1.1vw,10px)", color:"#555", textTransform:"uppercase", letterSpacing:"0.1em" }}>Antrian</div>
                        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(16px,2vw,20px)", color:C.white, marginTop:2 }}>{b.todayBookings}</div>
                      </div>
                      <div style={{ flex:1, background:"#111110", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                        <div style={{ fontSize:"clamp(9px,1.1vw,10px)", color:"#555", textTransform:"uppercase", letterSpacing:"0.1em" }}>Revenue</div>
                        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(13px,1.6vw,15px)", color:"#4caf50", marginTop:2 }}>{b.todayRevenue > 0 ? fmt(b.todayRevenue) : "—"}</div>
                      </div>
                    </div>

                    {/* Current booking if busy */}
                    {b.status === "in_progress" && (() => {
                      const cur = bookings.find(bk => bk.barberId === b.id && bk.status === "in_progress");
                      return cur ? (
                        <div style={{ marginTop:10, background:"#1a2a0a", borderRadius:8, padding:"8px 10px", border:"1px solid #2a3a10" }}>
                          <div style={{ fontSize:"clamp(10px,1.2vw,11px)", color:"#a5c840" }}>✂ Melayani: <strong style={{ color:C.white }}>{cur.name}</strong></div>
                          <div style={{ fontSize:"clamp(10px,1.1vw,11px)", color:"#555", marginTop:2 }}>{cur.services}</div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB: SETTINGS ──────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div style={{ flex:1, overflowY:"auto", padding:"clamp(16px,2vw,22px) clamp(16px,2.4vw,28px)", WebkitOverflowScrolling:"touch" }}>
            <div style={{ maxWidth:700, margin:"0 auto" }}>

              {/* Notifications */}
              <Section title="Notifikasi & Pengumuman">
                <ToggleRow
                  label="Speaker Pengumuman"
                  sub="Web Speech API — umumkan nama pelanggan saat dipanggil"
                  checked={speakerOn}
                  onChange={setSpeakerOn}
                />
                <NumberRow
                  label="Batas Keterlambatan Mulai"
                  sub="Kirim peringatan ke admin jika kapster belum mulai dalam X menit"
                  value={lateThreshold}
                  onChange={setLateThreshold}
                  unit="menit"
                  min={5} max={30}
                />
                <NumberRow
                  label="Grace Period Acknowledge"
                  sub="Eskalasi jika kapster tidak acknowledge booking dalam X menit"
                  value={ackGrace}
                  onChange={setAckGrace}
                  unit="menit"
                  min={1} max={10}
                />
              </Section>

              {/* Tip presets */}
              <Section title="Preset Tip">
                <SettingCard
                  label="Nominal Tip di Kiosk"
                  sub="Tiga nominal tip yang akan ditampilkan kepada pelanggan di layar pembayaran."
                >
                  <div style={{ display:"flex", gap:8 }}>
                    {tipPresets.map((val, i) => (
                      <div key={i} style={{ width:110 }}>
                        <div style={{ display:"flex", alignItems:"center", background:"#111110", borderRadius:9, border:"1.5px solid #2a2a28", overflow:"hidden" }}>
                          <span style={{ padding:"0 6px", color:"#555", fontFamily:"'DM Sans',sans-serif", fontSize:12 }}>Rp</span>
                          <input
                            type="number"
                            value={val / 1000}
                            onChange={e => {
                              const v = [...tipPresets];
                              v[i] = parseInt(e.target.value || 0) * 1000;
                              setTipPresets(v);
                            }}
                            style={{ flex:1, background:"none", border:"none", color:C.white, fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(13px,1.5vw,15px)", padding:"10px 4px", width:"100%", textAlign:"right" }}
                          />
                          <span style={{ padding:"0 6px", color:"#555", fontFamily:"'DM Sans',sans-serif", fontSize:12 }}>rb</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </SettingCard>
              </Section>

              {/* Save */}
              <button onClick={handleSaveSettings}
                style={{ width:"100%", padding:"clamp(14px,1.8vw,17px)", borderRadius:12, background: settingsSaved ? "#1a3a1a" : C.accent, color: settingsSaved ? "#4caf50" : C.accentText, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"clamp(14px,1.7vw,16px)", border:"none", cursor:"pointer", transition:"all 0.2s", marginTop:8 }}>
                {settingsSaved ? "✓ Pengaturan Tersimpan" : "Simpan Pengaturan"}
              </button>
            </div>
          </div>
        )}
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

// ── Settings helpers ──────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(14px,1.7vw,17px)", color:C.accent, marginBottom:16, letterSpacing:"0.02em" }}>{title}</div>
      <div style={{ display:"grid", gap:12 }}>{children}</div>
    </div>
  );
}

function SettingCard({ label, sub, children }) {
  return (
    <div style={{ background:"#1a1a18", borderRadius:14, padding:"clamp(14px,1.8vw,18px)", border:"1.5px solid #2a2a28", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"clamp(12px,1.4vw,14px)", color:C.white }}>{label}</div>
        {sub && <div style={{ fontSize:"clamp(10px,1.2vw,12px)", color:"#666", marginTop:4, lineHeight:1.4 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

function ToggleRow({ label, sub, checked, onChange }) {
  return (
    <SettingCard label={label} sub={sub}>
      <div onClick={() => onChange(!checked)}
        style={{ width:48, height:26, borderRadius:13, background: checked ? C.accent : "#2a2a28", position:"relative", cursor:"pointer", transition:"background 0.2s" }}>
        <div style={{ position:"absolute", top:3, left: checked ? 25 : 3, width:20, height:20, borderRadius:"50%", background: checked ? C.accentText : "#555", transition:"left 0.2s" }} />
      </div>
    </SettingCard>
  );
}

function NumberRow({ label, sub, value, onChange, unit, min, max }) {
  return (
    <SettingCard label={label} sub={sub}>
      <div style={{ display:"flex", alignItems:"center", background:"#111110", borderRadius:10, padding:4 }}>
        <button onClick={() => onChange(Math.max(min, value - 1))}
          style={{ width:32, height:32, borderRadius:8, background:"#2a2a28", color:C.white, border:"none", cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:"clamp(14px,1.8vw,18px)", color:C.white, minWidth:44, textAlign:"center" }}>{value}</div>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          style={{ width:32, height:32, borderRadius:8, background:"#2a2a28", color:C.white, border:"none", cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
        <div style={{ padding:"0 10px", fontSize:"clamp(11px,1.3vw,13px)", color:"#555", fontWeight:600 }}>{unit}</div>
      </div>
    </SettingCard>
  );
}
