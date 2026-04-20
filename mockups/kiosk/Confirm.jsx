/**
 * MOCKUP — Bercut Kiosk: Confirm
 *
 * What it does: Step 4 (merged with former Details) — collects name + optional WhatsApp,
 *   shows order summary with TOTAL (not estimated), floor plan with assigned chair,
 *   and confirms the reservasi.
 * State managed: cart, services, barber, slot, beverages, products,
 *   name, setName, phone, setPhone, onConfirm, onBack
 * Production API: POST /api/bookings
 * Feeds into: QueueNumber (step 5 — reservasi confirmed)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/kiosk/screens/Confirm.jsx
 * Reference prompt: _ai/prompting-guide.md Section 03
 */

import { useEffect, useRef, useState } from "react";
import { C, BEVERAGES, PRODUCTS, fmt, MOCK_CUSTOMERS, POINTS_RATE, PINNED_COUNTRIES, ALL_COUNTRIES } from "./data.js";

// ── Country Code Picker ───────────────────────────────────────────────────────
function CountryPicker({ selected, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const q = search.toLowerCase().trim();
  const filteredAll = ALL_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(q) || c.code.includes(q) || c.abbr.toLowerCase().includes(q)
  );

  const Row = ({ c }) => (
    <div onClick={() => { onSelect(c); onClose(); }}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "clamp(10px,1.4vh,13px) clamp(12px,1.6vw,16px)", cursor: "pointer", borderRadius: 8, background: selected.code === c.code && selected.abbr === c.abbr ? C.surface : "transparent", transition: "background 0.12s" }}
      onMouseEnter={e => e.currentTarget.style.background = C.surface}
      onMouseLeave={e => e.currentTarget.style.background = selected.code === c.code && selected.abbr === c.abbr ? C.surface : "transparent"}>
      <span style={{ fontSize: "clamp(18px,2.4vw,24px)", lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
      <span style={{ flex: 1, fontSize: "clamp(13px,1.5vw,15px)", fontWeight: 500, color: C.text }}>{c.name}</span>
      <span style={{ fontSize: "clamp(13px,1.5vw,15px)", fontWeight: 700, color: C.muted, fontFamily: "'Inter',sans-serif" }}>{c.code}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px,2.4vw,28px)" }}
      onClick={onClose}>
      <div className="si" style={{ background: C.white, borderRadius: 18, width: "clamp(320px,48vw,520px)", maxHeight: "76vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "clamp(14px,2vw,20px) clamp(16px,2.2vw,22px)", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(15px,2vw,19px)", fontWeight: 800, color: C.text }}>Select Country Code</div>
            <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: C.muted, marginTop: 2 }}>Pilih kode negara</div>
          </div>
          <button onClick={onClose} style={{ background: C.surface2, border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: "pointer", color: C.text2, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: "clamp(10px,1.4vw,14px) clamp(16px,2.2vw,22px)", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search country or code…"
            style={{ width: "100%", padding: "clamp(10px,1.4vh,13px) 14px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: "clamp(13px,1.5vw,15px)", background: C.surface, fontFamily: "'DM Sans',sans-serif", color: C.text }} />
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
          {!q && (
            <>
              <div style={{ padding: "clamp(6px,0.8vw,8px) clamp(16px,2.2vw,22px) 4px", fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>Pinned</div>
              {PINNED_COUNTRIES.map(c => <Row key={c.abbr} c={c} />)}
              <div style={{ height: 1, background: C.border, margin: "clamp(6px,0.8vw,8px) clamp(16px,2.2vw,22px)" }} />
              <div style={{ padding: "clamp(6px,0.8vw,8px) clamp(16px,2.2vw,22px) 4px", fontSize: "clamp(9px,1.1vw,11px)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>All Countries</div>
              {ALL_COUNTRIES.map(c => <Row key={c.abbr + c.code} c={c} />)}
            </>
          )}
          {q && (
            <>
              {[...PINNED_COUNTRIES, ...ALL_COUNTRIES].filter(c =>
                c.name.toLowerCase().includes(q) || c.code.includes(q) || c.abbr.toLowerCase().includes(q)
              ).map(c => <Row key={c.abbr + c.code} c={c} />)}
              {filteredAll.length === 0 && PINNED_COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.includes(q)).length === 0 && (
                <div style={{ padding: "clamp(20px,3vw,28px)", textAlign: "center", color: C.muted, fontSize: "clamp(12px,1.4vw,14px)" }}>No countries found</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Confirm({ cart, services, barber, slot, beverages = [], products = [], name, setName, phone, setPhone, onConfirm, onBack }) {
  const [pointsToggled, setPointsToggled] = useState(new Set());
  const [selectedCountry, setSelectedCountry] = useState(PINNED_COUNTRIES[0]); // default Indonesia +62
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const nameRef = useRef(null);

  const svcTotal = cart.reduce((s, id) => s + (services.find(x => x.id === id)?.price || 0), 0);
  const bevTotal = BEVERAGES.filter(b => beverages.includes(b.id)).reduce((s, b) => s + b.price, 0);
  const proTotal = PRODUCTS.filter(p => products.includes(p.id)).reduce((s, p) => s + p.price, 0);
  const total = svcTotal + bevTotal + proTotal;
  const dur = cart.reduce((s, id) => s + (services.find(x => x.id === id)?.dur || 0), 0);
  const valid = name.trim().length >= 2;

  // Points lookup — production: GET /api/customers?phone= after phone is entered
  const customer = phone.trim().length >= 6 ? MOCK_CUSTOMERS[phone.trim()] || null : null;
  const pointsAvailable = customer?.points || 0;

  const ptCost = id => Math.ceil((services.find(x => x.id === id)?.price || 0) / POINTS_RATE);
  const pointsUsed = [...pointsToggled].reduce((s, id) => s + ptCost(id), 0);
  const pointsRemaining = pointsAvailable - pointsUsed;
  const cashTotal = total - [...pointsToggled].reduce((s, id) => s + (services.find(x => x.id === id)?.price || 0), 0);

  const togglePoints = id => {
    setPointsToggled(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (pointsRemaining >= ptCost(id)) { next.add(id); return next; }
      return prev;
    });
  };

  // Auto-focus name field on mount so keyboard opens immediately
  useEffect(() => { nameRef.current?.focus(); }, []);

  return (
    <div className="scroll-y" style={{ height: "calc(100vh - clamp(51px,6.5vh,63px))", padding: "clamp(16px,2.4vw,28px)" }}>
      <div className="step-header fu">
        <div className="step-eyebrow">Step 4 of 4 · Confirm</div>
        <h2 className="step-title">Confirm Your Reservation</h2>
        <div style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.muted, marginTop: 4 }}>Confirm Reservation · Konfirmasi Reservasi</div>
      </div>

      {/* confirm-layout: LEFT = inputs, RIGHT = order summary */}
      <div className="confirm-layout">

        {/* LEFT — name + phone + points nudge/balance + confirm CTA */}
        <div>
          <div className="fu" style={{ animationDelay: "0.05s", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "clamp(16px,2.2vw,24px)", marginBottom: "clamp(12px,1.6vw,16px)" }}>

            {/* Prominent name prompt */}
            <div style={{ marginBottom: "clamp(18px,2.4vw,24px)" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(17px,2.2vw,22px)", fontWeight: 800, color: C.text, marginBottom: 4 }}>
                What's your name?
              </div>
              <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.muted }}>
                Required for your reservation · Wajib diisi sebelum lanjut
              </div>
            </div>

            {/* Name — required, auto-focused, pulsing border on mount */}
            <div style={{ marginBottom: "clamp(14px,1.8vw,18px)" }}>
              <label style={{ fontSize: "clamp(13px,1.5vw,15px)", fontWeight: 700, display: "block", marginBottom: 7, color: C.text }}>
                Name / Nama <span style={{ color: C.danger }}>*</span>
              </label>
              <input
                ref={nameRef}
                value={name}
                type="text"
                autoComplete="given-name"
                onChange={e => setName(e.target.value)}
                placeholder="Tap here and type your name"
                style={{
                  width: "100%", padding: "clamp(14px,1.9vh,18px) 16px", borderRadius: 11,
                  border: `2px solid ${name.trim().length > 0 ? C.topBg : C.accent}`,
                  fontSize: "clamp(15px,1.8vw,17px)", background: C.white,
                  fontFamily: "'DM Sans',sans-serif",
                  animation: name.trim().length === 0 ? "namePulse 1.4s ease 3" : "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => { e.target.style.borderColor = C.topBg; e.target.style.animation = "none"; }}
                onBlur={e => { e.target.style.borderColor = name.trim().length > 0 ? C.topBg : C.accent; }}
              />
              {!valid && name.trim().length > 0 && name.trim().length < 2 && (
                <div style={{ fontSize: "clamp(11px,1.3vw,12px)", color: C.danger, marginTop: 5 }}>
                  Name must be at least 2 characters · Minimal 2 karakter
                </div>
              )}
            </div>

            {/* WhatsApp — optional */}
            <div style={{ marginBottom: "clamp(12px,1.6vw,16px)" }}>
              <label style={{ fontSize: "clamp(13px,1.5vw,15px)", fontWeight: 700, display: "block", marginBottom: 7, color: C.text }}>
                WhatsApp <span style={{ fontSize: "clamp(11px,1.3vw,13px)", fontWeight: 400, color: C.muted }}>(Optional / Opsional)</span>
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                {/* Country code trigger */}
                <button type="button" onClick={() => setShowCountryPicker(true)}
                  style={{ display: "flex", alignItems: "center", gap: "clamp(4px,0.6vw,7px)", padding: "0 clamp(10px,1.4vw,14px)", borderRadius: 11, border: `1.5px solid ${phone.trim().length > 0 ? C.topBg : C.border}`, background: C.white, cursor: "pointer", flexShrink: 0, minHeight: "clamp(48px,6vh,56px)", transition: "border-color 0.15s, background 0.12s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface}
                  onMouseLeave={e => e.currentTarget.style.background = C.white}>
                  <span style={{ fontSize: "clamp(18px,2.4vw,24px)", lineHeight: 1 }}>{selectedCountry.flag}</span>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(13px,1.5vw,15px)", fontWeight: 700, color: C.text }}>{selectedCountry.code}</span>
                  <span style={{ fontSize: "clamp(9px,1.1vw,11px)", color: C.muted, marginLeft: 1 }}>▾</span>
                </button>
                {/* Number input */}
                <input value={phone} type="tel" onChange={e => setPhone(e.target.value)}
                  placeholder="812 3456 7890"
                  style={{ flex: 1, minWidth: 0, padding: "clamp(13px,1.7vh,17px) 14px", borderRadius: 11, border: `1.5px solid ${phone.trim().length > 0 ? C.topBg : C.border}`, fontSize: "clamp(14px,1.7vw,16px)", background: C.white, fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.15s" }}
                  onFocus={e => e.target.style.borderColor = C.topBg}
                  onBlur={e => e.target.style.borderColor = phone.trim().length > 0 ? C.topBg : C.border}
                />
              </div>
            </div>

            {showCountryPicker && (
              <CountryPicker selected={selectedCountry} onSelect={setSelectedCountry} onClose={() => setShowCountryPicker(false)} />
            )}

            {/* Points — shown in place of old checkbox */}
            {customer && pointsAvailable > 0 && (
              <div className="fi" style={{ background: "#f0faf0", border: "1.5px solid #a8d5a8", borderRadius: 10, padding: "clamp(10px,1.4vw,14px)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>⭐</span>
                <div>
                  <div style={{ fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 700, color: "#1a7a1a" }}>
                    Welcome back, {customer.name}! · Selamat datang kembali!
                  </div>
                  <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: "#2e7d32" }}>
                    You have <strong>{pointsAvailable} points</strong> (Rp {(pointsAvailable * POINTS_RATE).toLocaleString("id-ID")}) — tap services on the right to redeem · Tekan layanan untuk gunakan poin
                  </div>
                </div>
              </div>
            )}
            {/* Expiry warning — shown below points block when within warning window */}
            {customer && pointsAvailable > 0 && customer.pointsExpiry && (() => {
              const expiry = new Date(customer.pointsExpiry);
              const daysLeft = Math.round((expiry - new Date('2026-04-13')) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 0 || daysLeft > 30) return null;
              const fmtd = expiry.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
              return (
                <div className="fi" style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 10, padding: 'clamp(9px,1.2vw,13px) clamp(12px,1.5vw,16px)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: '#92400E', fontWeight: 600 }}>
                    Your {pointsAvailable} pts expire on {fmtd} — use them today!
                    <span style={{ fontWeight: 400, color: '#B45309' }}> · Poin kamu kedaluwarsa {fmtd}, gunakan sekarang!</span>
                  </div>
                </div>
              );
            })()}

            {customer && pointsAvailable === 0 && (
              <div className="fi" style={{ background: C.surface, borderRadius: 10, padding: "clamp(10px,1.4vw,14px)" }}>
                <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.muted }}>⭐ Welcome back, {customer.name}! You have 0 points. Earn points today by paying cash. · Kamu belum punya poin.</div>
              </div>
            )}
            {/* Points nudge — only when phone is empty */}
            {!customer && !phone.trim() && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "clamp(9px,1.2vw,13px) clamp(12px,1.6vw,16px)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>⭐</span>
                <div style={{ fontSize: "clamp(11px,1.3vw,13px)", color: C.text2 }}>
                  Have points? Enter your WhatsApp number to check your balance and redeem.
                  <span style={{ color: C.muted }}> · Punya poin? Masukkan nomor WhatsApp.</span>
                </div>
              </div>
            )}
          </div>

          <button className="btnP" disabled={!valid} onClick={() => onConfirm({ pointsRedeemed: [...pointsToggled], pointsUsed, cashTotal })}
            style={{ fontSize: "clamp(15px,1.8vw,18px)", marginBottom: 8, padding: "clamp(16px,2.2vh,20px)" }}>
            {valid ? "Confirm Reservation ✓" : "Enter your name to continue"}
          </button>
          <button className="btnG" onClick={onBack} style={{ width: "100%" }}>← Back / Kembali</button>
        </div>

        {/* RIGHT — order summary */}
        <div>
          <div className="fu" style={{ animationDelay: "0.08s", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "clamp(14px,2vw,22px)" }}>
            <div style={{ fontSize: "clamp(10px,1.2vw,12px)", fontWeight: 700, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>Order Summary · Ringkasan Reservasi</div>

            {/* Services */}
            {cart.map(id => {
              const s = services.find(x => x.id === id);
              const isPointsPaid = pointsToggled.has(id);
              const cost = ptCost(id);
              const canToggle = isPointsPaid || (pointsAvailable > 0 && pointsRemaining >= cost);
              return (
                <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "clamp(10px,1.4vh,13px) 0", borderBottom: `1px solid ${C.border}`, gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "clamp(13px,1.6vw,16px)", fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: C.muted }}>{s.nameId} · {s.dur} min</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {pointsAvailable > 0 && (
                      <button onClick={() => togglePoints(id)}
                        style={{ padding: "5px 10px", borderRadius: 999, fontSize: "clamp(10px,1.1vw,11px)", fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: canToggle ? "pointer" : "not-allowed", border: `1.5px solid ${isPointsPaid ? C.topBg : C.border}`, background: isPointsPaid ? C.topBg : C.white, color: isPointsPaid ? C.white : canToggle ? C.text2 : C.muted, transition: "all 0.15s", opacity: canToggle ? 1 : 0.45 }}>
                        {isPointsPaid ? `✓ ${cost} pts` : `${cost} pts`}
                      </button>
                    )}
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(15px,2vw,20px)", fontWeight: 700, textDecoration: isPointsPaid ? "line-through" : "none", color: isPointsPaid ? C.muted : C.text }}>
                      {fmt(s.price)}
                    </div>
                    {isPointsPaid && (
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 700, color: "#1a7a1a" }}>Free</div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Beverages */}
            {beverages.length > 0 && BEVERAGES.filter(b => beverages.includes(b.id)).map(b => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "clamp(8px,1.2vh,11px) 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: "clamp(13px,1.6vw,15px)", color: C.text2 }}>{b.icon} {b.name}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(13px,1.6vw,15px)", fontWeight: 600 }}>{fmt(b.price)}</div>
              </div>
            ))}

            {/* Products */}
            {products.length > 0 && PRODUCTS.filter(p => products.includes(p.id)).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "clamp(8px,1.2vh,11px) 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: "clamp(13px,1.6vw,15px)", color: C.text2 }}>{p.icon} {p.name}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(13px,1.6vw,15px)", fontWeight: 600 }}>{fmt(p.price)}</div>
              </div>
            ))}

            {/* Booking details — no chair row */}
            {[["Barber", barber?.name], ["Time / Waktu", slot], ["Duration / Durasi", `${dur} min`]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "clamp(8px,1.2vh,11px) 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: "clamp(12px,1.4vw,14px)", color: C.muted }}>{k}</span>
                <span style={{ fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 600 }}>{v}</span>
              </div>
            ))}

            {/* Points deduction row */}
            {pointsUsed > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "clamp(8px,1.2vh,11px) 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>⭐</span>
                  <div>
                    <div style={{ fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 700, color: "#1a7a1a" }}>Points Applied · Poin Digunakan</div>
                    <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: C.muted }}>{pointsUsed} pts used · {pointsRemaining} pts remaining</div>
                  </div>
                </div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 700, color: "#1a7a1a" }}>−{fmt(pointsUsed * POINTS_RATE)}</div>
              </div>
            )}

            {/* TOTAL */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(15px,2vw,20px)", fontWeight: 800 }}>{pointsUsed > 0 ? "CASH TOTAL" : "TOTAL"}</div>
                {pointsUsed > 0 && <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: C.muted }}>Bayar Tunai</div>}
              </div>
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(20px,2.8vw,30px)", fontWeight: 800 }}>
                {cashTotal === 0 ? <span style={{ color: "#1a7a1a" }}>Rp 0</span> : fmt(cashTotal)}
              </span>
            </div>

            {/* Pay after service */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{cashTotal === 0 ? "⭐" : "💳"}</span>
              <div>
                {cashTotal === 0
                  ? <div style={{ fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 700, color: "#1a7a1a" }}>Fully covered by points! · Dibayar penuh dengan poin</div>
                  : <><div style={{ fontSize: "clamp(12px,1.4vw,14px)", fontWeight: 700, color: C.text }}>Pay after service · Bayar setelah selesai</div>
                     <div style={{ fontSize: "clamp(10px,1.2vw,12px)", color: C.muted }}>Xendit Terminal (QRIS / Card) — at the kiosk when done</div></>
                }
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
