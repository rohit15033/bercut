/**
 * MOCKUP — Bercut Admin: Online Booking
 *
 * What it does: Manage per-branch online booking links. Each branch gets a
 *   shareable URL and QR code. Toggle to enable/disable. Custom slug editor.
 *   WhatsApp fallback redirect when disabled. Global stats: online bookings
 *   today, conversion rate vs walk-in.
 * State managed: branches (enable toggle, slug), copied, whatsappFallback
 * Production API:
 *   GET  /api/branches/online-booking-settings
 *   PATCH /api/branches/:id/online-booking { enabled, slug }
 *   GET  /api/reports/online-bookings?from=&to=
 * Feeds into: Kiosk (same booking flow, branch_id pre-set from URL slug)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/OnlineBooking.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { BRANCHES, C, fmt, fmtM } from './data.js';

const BASE_URL = 'book.bercut.id';

// ── Mock stats ────────────────────────────────────────────────────────────────
const ONLINE_STATS = [
  { branch: 'Seminyak', today: 8,  thisWeek: 41, convRate: 74, topService: 'Skin Fade'         },
  { branch: 'Canggu',   today: 5,  thisWeek: 28, convRate: 68, topService: 'Just a Haircut'    },
  { branch: 'Ubud',     today: 0,  thisWeek: 0,  convRate: 0,  topService: '—'                 },
  { branch: 'Uluwatu',  today: 11, thisWeek: 52, convRate: 81, topService: 'President Package' },
  { branch: 'Sanur',    today: 0,  thisWeek: 0,  convRate: 0,  topService: '—'                 },
  { branch: 'Dewi Sri', today: 6,  thisWeek: 33, convRate: 71, topService: 'Prestige Package'  },
];

// ── QR placeholder ────────────────────────────────────────────────────────────
function QRPlaceholder({ slug }) {
  return (
    <div style={{ width: 88, height: 88, borderRadius: 8, border: '1.5px solid ' + C.border, background: C.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0 }}>
      {/* Simple QR-like graphic */}
      <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="2" stroke={C.text} strokeWidth="2"/>
        <rect x="7" y="7" width="10" height="10" rx="1" fill={C.text}/>
        <rect x="32" y="2" width="20" height="20" rx="2" stroke={C.text} strokeWidth="2"/>
        <rect x="37" y="7" width="10" height="10" rx="1" fill={C.text}/>
        <rect x="2" y="32" width="20" height="20" rx="2" stroke={C.text} strokeWidth="2"/>
        <rect x="7" y="37" width="10" height="10" rx="1" fill={C.text}/>
        <rect x="32" y="32" width="4" height="4" fill={C.text}/>
        <rect x="38" y="32" width="4" height="4" fill={C.text}/>
        <rect x="44" y="32" width="8" height="4" fill={C.text}/>
        <rect x="32" y="38" width="8" height="4" fill={C.text}/>
        <rect x="44" y="38" width="4" height="4" fill={C.text}/>
        <rect x="38" y="44" width="4" height="4" fill={C.text}/>
        <rect x="44" y="44" width="8" height="4" fill={C.text}/>
      </svg>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{slug}</div>
    </div>
  );
}

// ── Branch row ────────────────────────────────────────────────────────────────
function BranchRow({ branch, stat, onToggle, onSlugChange }) {
  const [slug,        setSlug]        = useState(branch.onlineSlug);
  const [editingSlug, setEditingSlug] = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [waFallback,  setWaFallback]  = useState(!branch.onlineBookingEnabled);

  const fullUrl = `https://${BASE_URL}/${slug}`;

  function handleCopy() {
    navigator.clipboard?.writeText(fullUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function saveSlug() {
    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || branch.onlineSlug;
    setSlug(clean);
    onSlugChange(clean);
    setEditingSlug(false);
  }

  return (
    <div className="admin-card" style={{ padding: '20px 22px', animation: 'fadeUp 0.25s ease both' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>

        {/* QR code */}
        <QRPlaceholder slug={slug} />

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>{branch.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{branch.city}, Bali</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: branch.onlineBookingEnabled ? '#16A34A' : C.muted }}>
                {branch.onlineBookingEnabled ? 'Online' : 'Disabled'}
              </span>
              <div onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, background: branch.onlineBookingEnabled ? C.topBg : C.surface2, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: branch.onlineBookingEnabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: branch.onlineBookingEnabled ? C.accent : C.muted, transition: 'left 0.2s' }} />
              </div>
            </div>
          </div>

          {/* URL row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            {editingSlug ? (
              <>
                <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{`https://${BASE_URL}/`}</span>
                <input value={slug} onChange={e => setSlug(e.target.value)} autoFocus
                  style={{ flex: 1, padding: '6px 9px', borderRadius: 6, border: '1.5px solid ' + C.topBg, fontSize: 12, color: C.text, fontFamily: 'monospace' }}
                  onKeyDown={e => { if (e.key === 'Enter') saveSlug(); if (e.key === 'Escape') { setSlug(branch.onlineSlug); setEditingSlug(false); } }} />
                <button onClick={saveSlug} style={{ padding: '5px 12px', borderRadius: 6, background: C.topBg, color: C.white, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Save</button>
                <button onClick={() => { setSlug(branch.onlineSlug); setEditingSlug(false); }} style={{ padding: '5px 10px', borderRadius: 6, background: C.surface, color: C.text2, border: '1px solid ' + C.border, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>✕</button>
              </>
            ) : (
              <>
                <div style={{ flex: 1, padding: '7px 10px', borderRadius: 6, background: C.surface, border: '1px solid ' + C.border, fontFamily: 'monospace', fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fullUrl}
                </div>
                <button onClick={() => setEditingSlug(true)} style={{ padding: '6px 11px', borderRadius: 6, border: '1px solid ' + C.border, background: 'transparent', color: C.text2, fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>Edit slug</button>
                <button onClick={handleCopy} style={{ padding: '6px 12px', borderRadius: 6, background: copied ? '#16A34A' : C.topBg, color: C.white, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap' }}>
                  {copied ? '✓ Copied' : 'Copy Link'}
                </button>
              </>
            )}
          </div>

          {/* WhatsApp fallback + stats */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, background: C.bg, border: '1px solid ' + C.border }}>
              <span style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>WhatsApp fallback when disabled</span>
              <div onClick={() => setWaFallback(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: waFallback ? '#16A34A' : C.surface2, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: waFallback ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: waFallback ? '#fff' : C.muted, transition: 'left 0.2s' }} />
              </div>
            </div>

            {stat && branch.onlineBookingEnabled && (
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'Today', value: stat.today + ' bookings' },
                  { label: 'This Week', value: stat.thisWeek + ' bookings' },
                  { label: 'Conversion', value: stat.convRate + '%' },
                  { label: 'Top Service', value: stat.topService },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>{s.label}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text, marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {!branch.onlineBookingEnabled && (
              <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Online booking disabled — visitors will see a WhatsApp redirect</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OnlineBooking() {
  const [branches, setBranches] = useState(BRANCHES.map(b => ({ ...b })));

  function toggleBranch(id) {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, onlineBookingEnabled: !b.onlineBookingEnabled } : b));
  }
  function updateSlug(id, slug) {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, onlineSlug: slug } : b));
  }

  const enabledCount    = branches.filter(b => b.onlineBookingEnabled).length;
  const totalToday      = ONLINE_STATS.reduce((a, s) => a + s.today, 0);
  const totalThisWeek   = ONLINE_STATS.reduce((a, s) => a + s.thisWeek, 0);
  const avgConversion   = Math.round(ONLINE_STATS.filter(s => s.convRate > 0).reduce((a, s) => a + s.convRate, 0) / ONLINE_STATS.filter(s => s.convRate > 0).length);

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Online Booking</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Shareable booking links for each branch — mirrors the kiosk flow in a browser.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ padding: '8px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: 13, fontWeight: 600, color: '#16A34A' }}>
            {enabledCount} / {branches.length} branches live
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Online Bookings Today',    value: totalToday,      accent: C.text    },
          { label: 'Online Bookings This Week', value: totalThisWeek,   accent: '#2563EB' },
          { label: 'Avg Conversion Rate',       value: avgConversion + '%', accent: '#16A34A' },
        ].map((k, i) => (
          <div key={k.label} className="admin-card" style={{ padding: '18px 20px', animation: `fadeUp 0.2s ease ${i * 0.05}s both` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: k.accent, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* How it works banner */}
      <div style={{ display: 'flex', gap: 12, padding: '14px 18px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: 24 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
        <div style={{ fontSize: 13, color: '#1D4ED8', lineHeight: 1.6 }}>
          Each branch gets a unique URL at <strong>book.bercut.id/[slug]</strong>. The page loads the same booking flow as the kiosk — customers pick service, barber, and time, then confirm with their name and WhatsApp. Bookings appear instantly in the branch queue. When online booking is disabled for a branch, visitors are redirected to a WhatsApp message instead.
        </div>
      </div>

      {/* Branch rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {branches.map((branch, i) => (
          <BranchRow
            key={branch.id}
            branch={branch}
            stat={ONLINE_STATS[i]}
            onToggle={() => toggleBranch(branch.id)}
            onSlugChange={slug => updateSlug(branch.id, slug)}
          />
        ))}
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: C.muted }}>
        Domain <strong>book.bercut.id</strong> requires a CNAME record pointing to the Rumahweb VPS. Configure once in DNS — all branch slugs resolve automatically via the same Nginx virtual host.
      </div>
    </div>
  );
}
