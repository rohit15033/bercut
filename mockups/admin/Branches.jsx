/**
 * MOCKUP — Bercut Admin: Branch Management
 *
 * What it does: Full branch lifecycle management.
 *   - List all branches with live status indicators
 *   - Add / Edit branch via two-tab modal: Details (structural) + Operations (per-branch config)
 *   - Per-branch chair management — add, relabel, assign permanent barber, remove chairs
 *   - Chair overrides — temporarily cover a chair with another barber for a date range
 *     (or indefinitely). Override takes priority over the permanent assignment.
 *     Original barber resumes when override is removed or its date_to passes.
 * State managed: branches, chairs, overrides, showAdd, editBranch, expandedChairs
 * Production API:
 *   GET    /api/branches
 *   POST   /api/branches
 *   PATCH  /api/branches/:id
 *   GET    /api/branches/:id/chairs
 *   POST   /api/branches/:id/chairs
 *   PATCH  /api/chairs/:id
 *   DELETE /api/chairs/:id
 *   GET    /api/chair-overrides?branch_id=
 *   POST   /api/chair-overrides
 *   DELETE /api/chair-overrides/:id
 * Feeds into: all branch-scoped screens (Expenses, Inventory, Payroll, etc.)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Branches.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { C, BRANCHES, CHAIRS, ALL_BARBERS, fmt } from './data.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const TIP_METHODS = [
  { key: 'individual',   label: 'Individual',   sub: 'Each barber keeps their own tips'       },
  { key: 'equal_split',  label: 'Equal Split',  sub: 'Tips split evenly across all staff'     },
  { key: 'proportional', label: 'Proportional', sub: 'Split by revenue share'                 },
];
const PAY_PERIODS = [
  { key: 'monthly',   label: 'Monthly'   },
  { key: 'biweekly',  label: 'Bi-weekly' },
  { key: 'weekly',    label: 'Weekly'    },
];
const TIMEZONES = ['Asia/Makassar', 'Asia/Jakarta', 'Asia/Jayapura'];

const TODAY = '2026-04-19';

// Mock kiosk devices — in production from GET /api/admin/kiosk-tokens?branch_id=
const BRANCH_MOCK_DEVICES = {
  1: [{ id: 1, name: 'Kiosk A — Main Counter', maskedToken: 'BERCUT-DEM-****-****', lastSeen: '2026-04-19 14:32', createdAt: '2026-03-01', isActive: true }],
  2: [],
  3: [{ id: 2, name: 'Kiosk — Front Desk', maskedToken: 'BERCUT-CAN-****-****', lastSeen: '2026-04-19 11:08', createdAt: '2026-03-10', isActive: true }],
  4: [], 5: [], 6: [],
};

// Mock chair overrides — in production from GET /api/chair-overrides?branch_id=
const MOCK_OVERRIDES = [
  { id: 1, chairId: 1,  barberId: 7,  barberName: 'Dion Prasetyo',   dateFrom: '2026-04-19', dateTo: '2026-04-25', reason: 'Home barber on sick leave' },
  { id: 2, chairId: 9,  barberId: 3,  barberName: 'Rifky Ramadhan',  dateFrom: '2026-04-19', dateTo: null,         reason: 'Permanent transfer'        },
];

function isOverrideActive(o, date = TODAY) {
  return o.dateFrom <= date && (o.dateTo === null || o.dateTo >= date);
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ width: 44, height: 24, borderRadius: 12, background: checked ? C.topBg : C.surface2, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: checked ? C.accent : C.muted, transition: 'left 0.2s' }} />
    </div>
  );
}

function Stepper({ value, onChange, min, max, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid ' + C.border, background: C.white, color: C.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, minWidth: 32, textAlign: 'center', color: C.text }}>{value}</div>
      <button onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid ' + C.border, background: C.white, color: C.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      {unit && <span style={{ fontSize: 12, color: C.muted, marginLeft: 4 }}>{unit}</span>}
    </div>
  );
}

function SettingRow({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '13px 0', borderBottom: '1px solid ' + C.surface }}>
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2, maxWidth: 400, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── Shared input styles ───────────────────────────────────────────────────────

const lbl = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#88887E', marginBottom: 5 };
const inp = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #DDDBD4', fontSize: 13, color: '#111110', background: '#FFFFFF', boxSizing: 'border-box' };
const sel = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #DDDBD4', fontSize: 13, color: '#111110', background: '#FFFFFF' };

// ── Branch modal (add + edit) — two tabs: Details + Operations ────────────────

const BRANCH_OP_DEFAULTS = {
  onlineBookingEnabled: false,
  speakerOn:   true,
  pushOn:      false,
  lateThresh:  10,
  ackGrace:    3,
  tipPresets:  [5000, 10000, 20000, 50000, 100000],
};

function BranchModal({ branch, onConfirm, onClose }) {
  const isNew = !branch;
  const [tab,          setTab]         = useState('details');
  const [devices,      setDevices]     = useState(branch ? (BRANCH_MOCK_DEVICES[branch.id] || []) : []);
  const [showGenerate, setShowGenerate] = useState(false);
  const [form, setForm] = useState(branch ? { ...BRANCH_OP_DEFAULTS, ...branch } : {
    name: '', city: '', address: '', timezone: 'Asia/Makassar', onlineSlug: '',
    tipMethod: 'individual', payPeriod: 'monthly', isActive: true,
    ...BRANCH_OP_DEFAULTS,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function setTipPreset(i, val) {
    const v = [...form.tipPresets];
    v[i] = (parseInt(val) || 0) * 1000;
    set('tipPresets', v);
  }

  function addTipPreset() {
    if (form.tipPresets.length >= 6) return;
    set('tipPresets', [...form.tipPresets, 20000]);
  }

  function removeTipPreset(i) {
    if (form.tipPresets.length <= 2) return;
    set('tipPresets', form.tipPresets.filter((_, idx) => idx !== i));
  }

  const valid = form.name.trim() && form.city.trim() && form.address.trim();

  const TABS = [{ key: 'details', label: 'Details' }, { key: 'ops', label: 'Operations' }, { key: 'devices', label: 'Kiosk Devices' }];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.18s ease both' }}>

        {/* Header */}
        <div style={{ padding: '22px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: C.text }}>
              {isNew ? 'Add Branch' : `Edit · ${branch.name}`}
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid ' + C.border, gap: 0 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '8px 18px', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid ' + C.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: tab === t.key ? C.text : C.muted, cursor: 'pointer', marginBottom: -1 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

          {/* ── Details tab ── */}
          {tab === 'details' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 10 }}>Identity</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 22 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Branch Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Bercut Kerobokan" style={inp} />
                </div>
                <div>
                  <label style={lbl}>City *</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Kerobokan" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Online Booking Slug</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: '1.5px solid ' + C.border, overflow: 'hidden', background: C.white }}>
                    <span style={{ padding: '9px 10px', fontSize: 11, color: C.muted, borderRight: '1px solid ' + C.border, whiteSpace: 'nowrap' }}>bercut.id/book/</span>
                    <input value={form.onlineSlug || ''} onChange={e => set('onlineSlug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="kerobokan"
                      style={{ flex: 1, padding: '9px 10px', border: 'none', fontSize: 13, color: C.text, background: 'transparent' }} />
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Address *</label>
                  <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Jl. ..." style={inp} />
                </div>
                <div>
                  <label style={lbl}>Timezone</label>
                  <select value={form.timezone} onChange={e => set('timezone', e.target.value)} style={sel}>
                    {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 10 }}>Payroll & Tips</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 22 }}>
                <div>
                  <label style={lbl}>Pay Period</label>
                  <select value={form.payPeriod} onChange={e => set('payPeriod', e.target.value)} style={sel}>
                    {PAY_PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tip Distribution</label>
                  <select value={form.tipMethod} onChange={e => set('tipMethod', e.target.value)} style={sel}>
                    {TIP_METHODS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {TIP_METHODS.find(t => t.key === form.tipMethod)?.sub}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 10 }}>Status</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 9, background: C.bg, border: '1px solid ' + C.border }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>Branch Active</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Inactive branches are hidden from kiosk routing and reports</div>
                </div>
                <Toggle checked={form.isActive} onChange={v => set('isActive', v)} />
              </div>
            </div>
          )}

          {/* ── Operations tab ── */}
          {tab === 'ops' && (
            <div>
              {/* Online Booking */}
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2 }}>Online Booking</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Controls whether this branch accepts bookings via the online booking page.</div>
              <SettingRow label="Enable Online Booking" sub="When off, this branch is hidden from online booking. Redirects to WhatsApp.">
                <Toggle checked={form.onlineBookingEnabled} onChange={v => set('onlineBookingEnabled', v)} />
              </SettingRow>

              {/* Announcements */}
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 22, marginBottom: 2 }}>Announcements & Escalation</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Voice announcements and alert thresholds specific to this branch.</div>
              <SettingRow label="Speaker Announcement" sub="Announce customer names via Web Speech API on the kiosk speaker.">
                <Toggle checked={form.speakerOn} onChange={v => set('speakerOn', v)} />
              </SettingRow>
              <SettingRow label="Web Push Notifications (Phase 2)" sub="Push to barber PWAs on new booking. Requires VAPID key setup.">
                <Toggle checked={form.pushOn} onChange={v => set('pushOn', v)} />
              </SettingRow>
              <SettingRow label="Late Start Alert" sub="Alert admin if barber hasn't started a confirmed booking within this many minutes.">
                <Stepper value={form.lateThresh} onChange={v => set('lateThresh', v)} min={5} max={30} unit="min" />
              </SettingRow>
              <SettingRow label="Acknowledge Grace Period" sub="Re-announce if barber hasn't acknowledged a new booking within this many minutes.">
                <Stepper value={form.ackGrace} onChange={v => set('ackGrace', v)} min={1} max={10} unit="min" />
              </SettingRow>

              {/* Tip Presets */}
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 22, marginBottom: 2 }}>Tip Presets</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Amounts shown on the kiosk payment screen. Custom + Skip are always available.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                {form.tipPresets.map((val, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 4 }}>#{i + 1}</div>
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: '1.5px solid ' + C.border, background: C.white, overflow: 'hidden' }}>
                      <span style={{ padding: '0 7px', fontSize: 11, color: C.muted, borderRight: '1px solid ' + C.border }}>Rp</span>
                      <input type="number" value={val / 1000} onChange={e => setTipPreset(i, e.target.value)}
                        style={{ width: 56, padding: '9px 7px', border: 'none', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text, background: 'transparent', textAlign: 'right' }} />
                      <span style={{ padding: '0 6px', fontSize: 11, color: C.muted, borderLeft: '1px solid ' + C.border }}>rb</span>
                      {form.tipPresets.length > 2 && (
                        <button onClick={() => removeTipPreset(i)}
                          style={{ padding: '0 7px', background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, height: '100%' }}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
                {form.tipPresets.length < 6 && (
                  <button onClick={addTipPreset}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px dashed ' + C.border, background: 'transparent', color: C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    + Add
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                Live preview: {form.tipPresets.map(p => 'Rp ' + (p / 1000) + 'k').join(' · ')}
              </div>

              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: C.bg, border: '1px solid ' + C.border, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                Saving Operations settings emits a <code style={{ fontFamily: 'monospace', background: C.surface2, padding: '1px 5px', borderRadius: 3 }}>kiosk_settings_update</code> SSE event to this branch's kiosk.
              </div>
            </div>
          )}

          {/* ── Kiosk Devices tab ── */}
          {tab === 'devices' && (
            <div>
              {showGenerate && (
                <GenerateTokenModal
                  branchName={form.name}
                  onGenerate={device => setDevices(ds => [...ds, device])}
                  onClose={() => setShowGenerate(false)}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text }}>Registered Kiosk Devices</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Each Windows touchscreen needs a device token to connect to this branch.</div>
                </div>
                <button onClick={() => setShowGenerate(true)}
                  style={{ padding: '7px 13px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
                  + Generate Token
                </button>
              </div>

              {devices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: C.muted }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🖥️</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.text2 }}>No devices registered</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Generate a token and enter it on the kiosk setup screen.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {devices.map(device => (
                    <div key={device.id} style={{ padding: '13px 15px', borderRadius: 10, border: '1.5px solid ' + (device.isActive ? C.border : C.surface2), background: device.isActive ? C.white : C.bg, opacity: device.isActive ? 1 : 0.6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>🖥 {device.name}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: device.isActive ? '#DCFCE7' : C.surface2, color: device.isActive ? '#16A34A' : C.muted }}>
                              {device.isActive ? 'Active' : 'Revoked'}
                            </span>
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, color: C.muted, marginBottom: 4 }}>{device.maskedToken}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>Last seen: {device.lastSeen} · Registered {device.createdAt}</div>
                        </div>
                        {device.isActive && (
                          <button onClick={() => setDevices(ds => ds.map(d => d.id === device.id ? { ...d, isActive: false } : d))}
                            style={{ padding: '5px 11px', borderRadius: 6, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: C.bg, border: '1px solid ' + C.border, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                Token is entered once on the Windows kiosk. It never expires — revoke here if a device is lost or replaced.
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid ' + C.border, display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 9, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => valid && onConfirm(form)} disabled={!valid}
            style={{ flex: 2, padding: '11px', borderRadius: 9, background: valid ? C.topBg : C.surface2, color: valid ? C.white : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: valid ? 'pointer' : 'not-allowed' }}>
            {isNew ? 'Add Branch' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate Token Modal ──────────────────────────────────────────────────────

function GenerateTokenModal({ branchName, onGenerate, onClose }) {
  const [step,       setStep]       = useState('form');
  const [deviceName, setDeviceName] = useState('');
  const [token,      setToken]      = useState('');
  const [copied,     setCopied]     = useState(false);

  function generate() {
    const prefix = branchName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    const rand   = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    const code   = `BERCUT-${prefix}-${rand()}-${rand()}`;
    setToken(code);
    setStep('token');
    onGenerate({
      id: Date.now(),
      name: deviceName.trim(),
      maskedToken: `BERCUT-${prefix}-****-****`,
      lastSeen: 'Never',
      createdAt: new Date().toISOString().slice(0, 10),
      isActive: true,
    });
  }

  function copy() {
    navigator.clipboard?.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 460, padding: '24px 28px', animation: 'scaleIn 0.15s ease both' }}>

        {step === 'form' ? (<>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>Generate Device Token</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
            This token is entered once on the Windows kiosk to register it to <strong>{branchName}</strong>. It never expires — revoke it if the device is replaced.
          </div>
          <label style={lbl}>Device Name *</label>
          <input value={deviceName} onChange={e => setDeviceName(e.target.value)} onKeyDown={e => e.key === 'Enter' && deviceName.trim() && generate()}
            placeholder="e.g. Kiosk A — Main Counter" style={inp} autoFocus />
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={generate} disabled={!deviceName.trim()}
              style={{ flex: 2, padding: '10px', borderRadius: 8, background: deviceName.trim() ? C.topBg : C.surface2, color: deviceName.trim() ? C.white : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: deviceName.trim() ? 'pointer' : 'not-allowed' }}>
              Generate Token
            </button>
          </div>
        </>) : (<>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>Token Generated</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
            Copy this and enter it on the kiosk setup screen. <strong>It will not be shown again.</strong>
          </div>
          <div style={{ background: C.bg, border: '1.5px solid ' + C.border, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 6 }}>
              Device Token · {deviceName}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '0.06em', wordBreak: 'break-all' }}>
              {token}
            </div>
          </div>
          <button onClick={copy}
            style={{ width: '100%', padding: '11px', borderRadius: 9, background: copied ? '#DCFCE7' : C.accent, color: copied ? '#16A34A' : C.accentText, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', marginBottom: 10, transition: 'background 0.2s' }}>
            {copied ? '✓ Copied!' : '📋 Copy Token'}
          </button>
          <button onClick={onClose}
            style={{ width: '100%', padding: '10px', borderRadius: 8, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Done
          </button>
        </>)}
      </div>
    </div>
  );
}

// ── Override modal ────────────────────────────────────────────────────────────

function OverrideModal({ chair, allBarbers, onConfirm, onClose }) {
  const [form, setForm] = useState({ barberId: '', dateFrom: TODAY, dateTo: '', reason: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Exclude the chair's own permanent barber from options
  const options = allBarbers.filter(b => b.id !== chair.assignedBarberId);
  const valid = form.barberId && form.dateFrom;
  const selectedBarber = allBarbers.find(b => b.id === parseInt(form.barberId));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 460, padding: '24px 28px', animation: 'scaleIn 0.15s ease both' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>
              Override Chair {chair.label}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {chair.assignedBarber
                ? `Covering for ${chair.assignedBarber}`
                : 'Assign a barber to this unoccupied chair'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Covering Barber *</label>
            <select value={form.barberId} onChange={e => set('barberId', e.target.value)} style={sel}>
              <option value="">— Select barber —</option>
              {options.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.branchId ? `· ${b.branch || 'Branch ' + b.branchId}` : '· Freelance'}
                </option>
              ))}
            </select>
            {selectedBarber && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                {selectedBarber.specialty} · {selectedBarber.payType === 'daily_rate' ? 'Freelance' : 'Commission'}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>From *</label>
              <input type="date" value={form.dateFrom} onChange={e => set('dateFrom', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Until</label>
              <input type="date" value={form.dateTo} onChange={e => set('dateTo', e.target.value)}
                placeholder="Leave blank for indefinite" style={inp} />
              <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Leave blank = indefinite</div>
            </div>
          </div>

          <div>
            <label style={lbl}>Reason</label>
            <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. Home barber on sick leave"
              style={inp} />
          </div>

          {!form.dateTo && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
              No end date — this override stays active until you remove it manually.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 8, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => valid && onConfirm({ ...form, barberId: parseInt(form.barberId), dateTo: form.dateTo || null })} disabled={!valid}
            style={{ flex: 2, padding: '10px', borderRadius: 8, background: valid ? C.topBg : C.surface2, color: valid ? C.white : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: valid ? 'pointer' : 'not-allowed' }}>
            Set Override
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Chair panel (inline per branch) ──────────────────────────────────────────

function ChairPanel({ branch, chairs, allBarbers, onChairsChange }) {
  const branchChairs = chairs.filter(c => c.branchId === branch.id);
  const [newLabel,      setNewLabel]      = useState('');
  const [overrides,     setOverrides]     = useState(MOCK_OVERRIDES);
  const [overrideModal, setOverrideModal] = useState(null); // chairId or null

  function addChair() {
    const label = newLabel.trim().toUpperCase();
    if (!label || branchChairs.some(c => c.label === label)) return;
    onChairsChange([...chairs, { id: Date.now(), branchId: branch.id, label, assignedBarber: null, assignedBarberId: null }]);
    setNewLabel('');
  }

  function removeChair(id) { onChairsChange(chairs.filter(c => c.id !== id)); }

  function assignBarber(chairId, barberId) {
    const barber = allBarbers.find(b => b.id === parseInt(barberId));
    onChairsChange(chairs.map(c => {
      if (c.id === chairId) return { ...c, assignedBarber: barber?.name ?? null, assignedBarberId: barber?.id ?? null };
      if (c.branchId === branch.id && c.assignedBarberId === barber?.id) return { ...c, assignedBarber: null, assignedBarberId: null };
      return c;
    }));
  }

  function handleSetOverride(chairId, form) {
    const barber = allBarbers.find(b => b.id === form.barberId);
    const newOverride = {
      id: Date.now(),
      chairId,
      barberId: form.barberId,
      barberName: barber?.name ?? 'Unknown',
      dateFrom: form.dateFrom,
      dateTo: form.dateTo,
      reason: form.reason,
    };
    // Replace any existing active override for this chair
    setOverrides(prev => [...prev.filter(o => o.chairId !== chairId), newOverride]);
    setOverrideModal(null);
  }

  function removeOverride(chairId) {
    setOverrides(prev => prev.filter(o => o.chairId !== chairId));
  }

  // Unassigned barbers at this branch (no chair yet)
  const assignedIds = branchChairs.map(c => c.assignedBarberId).filter(Boolean);
  const unassigned  = allBarbers.filter(b => b.branchId === branch.id && !assignedIds.includes(b.id));

  return (
    <div style={{ padding: '16px 20px', background: C.bg, borderTop: '1px solid ' + C.surface }}>
      {/* Override modal */}
      {overrideModal !== null && (() => {
        const chair = branchChairs.find(c => c.id === overrideModal);
        return chair ? (
          <OverrideModal
            chair={chair}
            allBarbers={allBarbers}
            onConfirm={form => handleSetOverride(overrideModal, form)}
            onClose={() => setOverrideModal(null)}
          />
        ) : null;
      })()}

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 12 }}>
        Chairs — {branchChairs.length} total
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 14 }}>
        {branchChairs.map(chair => {
          const activeOverride = overrides.find(o => o.chairId === chair.id && isOverrideActive(o));

          return (
            <div key={chair.id} style={{
              background: C.white, border: '1px solid ' + (activeOverride ? '#FDE68A' : C.border),
              borderRadius: 10, padding: '12px 14px',
              boxShadow: activeOverride ? '0 0 0 2px #FEF9C3' : 'none',
            }}>
              {/* Chair label row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: activeOverride ? '#D97706' : C.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 11, color: activeOverride ? '#fff' : C.accent }}>{chair.label}</span>
                  </div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>Chair {chair.label}</span>
                </div>
                <button onClick={() => removeChair(chair.id)}
                  style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 14 }}
                  title="Remove chair">✕</button>
              </div>

              {/* Permanent assignment */}
              <div style={{ marginBottom: activeOverride ? 8 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: 4 }}>
                  {activeOverride ? 'Home Barber' : 'Assigned Barber'}
                </div>
                <select
                  value={chair.assignedBarberId ?? ''}
                  onChange={e => assignBarber(chair.id, e.target.value || null)}
                  style={{ width: '100%', padding: '6px 9px', borderRadius: 7, border: '1.5px solid ' + (chair.assignedBarberId && !activeOverride ? C.topBg : C.border), fontSize: 12, color: activeOverride ? C.muted : (chair.assignedBarberId ? C.text : C.muted), background: C.white }}>
                  <option value="">— Unassigned —</option>
                  {allBarbers.filter(b => b.branchId === branch.id).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Active override */}
              {activeOverride ? (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 7, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#D97706', marginBottom: 3 }}>
                        ⟳ Covering Now
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: C.text }}>{activeOverride.barberName}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                        {activeOverride.dateFrom} → {activeOverride.dateTo ?? '∞ Indefinite'}
                      </div>
                      {activeOverride.reason && (
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 1, fontStyle: 'italic' }}>{activeOverride.reason}</div>
                      )}
                    </div>
                    <button onClick={() => removeOverride(chair.id)}
                      style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setOverrideModal(chair.id)}
                  style={{ width: '100%', marginTop: 8, padding: '6px', borderRadius: 7, border: '1px dashed ' + C.border, background: 'transparent', color: C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                  + Override
                </button>
              )}
            </div>
          );
        })}

        {/* Add chair card */}
        <div style={{ background: 'transparent', border: '1.5px dashed ' + C.border, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addChair()}
            placeholder="Label (A1, B2...)"
            style={{ flex: 1, padding: '6px 9px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 12, color: C.text, background: C.white }} />
          <button onClick={addChair}
            style={{ padding: '6px 12px', borderRadius: 7, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Add
          </button>
        </div>
      </div>

      {unassigned.length > 0 && (
        <div style={{ fontSize: 11, color: C.muted }}>
          {unassigned.length} barber{unassigned.length !== 1 ? 's' : ''} without a chair: {unassigned.map(b => b.name.split(' ')[0]).join(', ')}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Branches() {
  const [branches,       setBranches]       = useState(BRANCHES.map(b => ({ ...b })));
  const [chairs,         setChairs]         = useState(CHAIRS.map(c => ({ ...c })));
  const [showAdd,        setShowAdd]        = useState(false);
  const [editBranch,     setEditBranch]     = useState(null);
  const [expandedChairs, setExpandedChairs] = useState(null);
  const [filterStatus,   setFilterStatus]   = useState('all');

  const filtered = filterStatus === 'all'    ? branches
                 : filterStatus === 'active' ? branches.filter(b => b.isActive)
                 : branches.filter(b => !b.isActive);

  function handleAdd(form) {
    setBranches(bs => [...bs, { ...form, id: Date.now(), activeBarbers: 0, totalBarbers: 0, queueWaiting: 0, inProgress: 0, completed: 0, noShow: 0, revenue: 0, alerts: [] }]);
    setShowAdd(false);
  }

  function handleEdit(form) {
    setBranches(bs => bs.map(b => b.id === form.id ? { ...b, ...form } : b));
    setEditBranch(null);
  }

  const activeCount    = branches.filter(b => b.isActive).length;
  const onlineCount    = branches.filter(b => b.isActive && b.onlineBookingEnabled).length;
  const totalChairs    = chairs.length;
  const assignedChairs = chairs.filter(c => c.assignedBarberId).length;
  const activeOverrides = MOCK_OVERRIDES.filter(o => isOverrideActive(o)).length;

  return (
    <div style={{ padding: '28px 32px' }}>
      {showAdd    && <BranchModal onConfirm={handleAdd}  onClose={() => setShowAdd(false)} />}
      {editBranch && <BranchModal branch={editBranch} onConfirm={handleEdit} onClose={() => setEditBranch(null)} />}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Branches</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            {activeCount} active · {onlineCount} online booking on · {totalChairs} chairs ({assignedChairs} assigned)
            {activeOverrides > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                {activeOverrides} active override{activeOverrides !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding: '9px 16px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          + Add Branch
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[{ k: 'all', l: 'All' }, { k: 'active', l: 'Active' }, { k: 'inactive', l: 'Inactive' }].map(f => (
          <button key={f.k} onClick={() => setFilterStatus(f.k)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (filterStatus === f.k ? C.topBg : C.border), background: filterStatus === f.k ? C.topBg : 'transparent', color: filterStatus === f.k ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Branch list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((branch, i) => {
          const branchChairs      = chairs.filter(c => c.branchId === branch.id);
          const assignedCount     = branchChairs.filter(c => c.assignedBarberId).length;
          const branchOverrides   = MOCK_OVERRIDES.filter(o => branchChairs.some(c => c.id === o.chairId) && isOverrideActive(o));
          const isExpanded        = expandedChairs === branch.id;

          return (
            <div key={branch.id} className="admin-card" style={{ overflow: 'hidden', opacity: branch.isActive ? 1 : 0.6, animation: `fadeUp 0.2s ease ${i * 0.04}s both` }}>

              {/* Branch row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.9fr 1fr 1.1fr 0.9fr', padding: '16px 20px', alignItems: 'center', gap: 8, borderBottom: isExpanded ? '1px solid ' + C.surface : 'none' }}>

                {/* Name + city */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>{branch.name}</div>
                    {!branch.isActive && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: C.surface2, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Inactive</span>
                    )}
                    {branchOverrides.length > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                        {branchOverrides.length} override{branchOverrides.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{branch.city} · {branch.address}</div>
                </div>

                {/* Chairs */}
                <button onClick={() => setExpandedChairs(v => v === branch.id ? null : branch.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: C.text }}>{branchChairs.length}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{assignedCount}/{branchChairs.length} assigned</div>
                  <div style={{ fontSize: 10, color: C.topBg, fontWeight: 600, marginTop: 2 }}>{isExpanded ? '▲ Hide' : '▼ Manage'}</div>
                </button>

                {/* Barbers */}
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: C.text }}>{branch.activeBarbers}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{branch.totalBarbers} total</div>
                </div>

                {/* Tip method */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: C.surface, color: C.text2, display: 'inline-block' }}>
                    {TIP_METHODS.find(t => t.key === branch.tipMethod)?.label ?? branch.tipMethod}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{branch.payPeriod} pay</div>
                </div>

                {/* Online booking */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: branch.onlineBookingEnabled ? '#16A34A' : C.surface2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: branch.onlineBookingEnabled ? '#16A34A' : C.muted }}>
                      {branch.onlineBookingEnabled ? 'Online On' : 'Online Off'}
                    </span>
                  </div>
                  {branch.onlineBookingEnabled && branch.onlineSlug && (
                    <div style={{ fontSize: 10, color: C.muted }}>/{branch.onlineSlug}</div>
                  )}
                </div>

                {/* Edit */}
                <button onClick={() => setEditBranch(branch)}
                  style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid ' + C.border, background: 'transparent', color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  Edit
                </button>
              </div>

              {/* Chair panel — inline expanded */}
              {isExpanded && (
                <ChairPanel
                  branch={branch}
                  chairs={chairs}
                  allBarbers={ALL_BARBERS}
                  onChairsChange={setChairs}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Column legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.9fr 1fr 1.1fr 0.9fr', padding: '8px 20px', marginTop: 4, gap: 8 }}>
        {['Branch', 'Chairs', 'Barbers', 'Payroll', 'Online Booking', ''].map((h, i) => (
          <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.surface2 }}>{h}</div>
        ))}
      </div>
    </div>
  );
}
