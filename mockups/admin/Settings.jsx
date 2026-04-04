/**
 * MOCKUP — Bercut Admin: Settings
 *
 * What it does: Per-branch configuration — notifications, tip presets, kiosk UI
 *   copy and upsell rules, payroll adjustment reasons management.
 * State managed: selectedBranch, notification toggles, thresholds, tipPresets,
 *   kiosk UI fields, reasons, activeTab, saved
 * Production API:
 *   PATCH /api/branches/:id/settings
 *   GET/POST/PATCH /api/payroll/adjustment-reasons
 * Feeds into: Kiosk (via SSE kiosk_settings_update event on save)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Settings.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { C, BRANCHES, ADJ_REASONS } from './data.js';

// ── Helper components ─────────────────────────────────────────────────────────

function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SettingRow({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '14px 0', borderBottom: '1px solid ' + C.surface }}>
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 3, maxWidth: 480, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

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
      <span style={{ fontSize: 12, color: C.muted, marginLeft: 4 }}>{unit}</span>
    </div>
  );
}

// ── Reasons table ─────────────────────────────────────────────────────────────

const INITIAL_REASONS = [
  { id:1,  type:'uang_rajin', label:'Full Month Attendance',     scope:'global', active:true  },
  { id:2,  type:'uang_rajin', label:'Zero Late Arrivals',        scope:'global', active:true  },
  { id:3,  type:'uang_rajin', label:'Top Barber of the Month',   scope:'global', active:true  },
  { id:4,  type:'uang_rajin', label:'Customer Compliment',       scope:'global', active:true  },
  { id:5,  type:'bonus',      label:'Holiday Bonus',             scope:'global', active:true  },
  { id:6,  type:'bonus',      label:'Performance Bonus',         scope:'global', active:true  },
  { id:7,  type:'deduction',  label:'Late Arrivals',             scope:'global', active:true  },
  { id:8,  type:'deduction',  label:'Equipment Damage',          scope:'global', active:true  },
  { id:9,  type:'deduction',  label:'Uniform Deduction',         scope:'global', active:true  },
  { id:10, type:'kasbon',     label:'Salary Advance',            scope:'global', active:true  },
];

const REASON_TYPE_META = {
  uang_rajin: { color: '#16A34A', bg: '#F0FDF4', label: 'Uang Rajin' },
  bonus:      { color: '#2563EB', bg: '#EFF6FF', label: 'Bonus'      },
  deduction:  { color: '#D97706', bg: '#FFFBEB', label: 'Deduction'  },
  kasbon:     { color: '#DC2626', bg: '#FEF2F2', label: 'Kasbon'     },
};

function ReasonsTab() {
  const [reasons,    setReasons]    = useState(INITIAL_REASONS);
  const [showAdd,    setShowAdd]    = useState(false);
  const [newLabel,   setNewLabel]   = useState('');
  const [newType,    setNewType]    = useState('uang_rajin');
  const [filterType, setFilterType] = useState('all');

  const filtered = filterType === 'all' ? reasons : reasons.filter(r => r.type === filterType);

  function handleAdd() {
    if (!newLabel.trim()) return;
    setReasons(r => [...r, { id: Date.now(), type: newType, label: newLabel, scope: 'global', active: true }]);
    setNewLabel(''); setShowAdd(false);
  }

  function toggleActive(id) {
    setReasons(r => r.map(x => x.id === id ? { ...x, active: !x.active } : x));
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all','uang_rajin','bonus','deduction','kasbon'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (filterType === t ? C.topBg : C.border), background: filterType === t ? C.topBg : 'transparent', color: filterType === t ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {t === 'all' ? 'All' : REASON_TYPE_META[t].label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          style={{ padding: '7px 14px', borderRadius: 8, background: showAdd ? C.surface2 : C.topBg, color: showAdd ? C.text : C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
          {showAdd ? '✕ Cancel' : '+ New Reason'}
        </button>
      </div>

      {showAdd && (
        <div style={{ display: 'flex', gap: 10, padding: '14px 16px', borderRadius: 10, background: C.bg, border: '1px solid ' + C.border, marginBottom: 14, animation: 'scaleIn 0.15s ease both' }}>
          <select value={newType} onChange={e => setNewType(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 13, color: C.text }}>
            {Object.entries(REASON_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Reason label..."
            style={{ flex: 1, padding: '8px 11px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 13, color: C.text }} />
          <button onClick={handleAdd}
            style={{ padding: '8px 16px', borderRadius: 7, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Add
          </button>
        </div>
      )}

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 70px', padding: '8px 16px', borderBottom: '1px solid ' + C.surface }}>
          {['Label','Type','Scope','Active'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
          ))}
        </div>
        {filtered.map((r, i) => {
          const tm = REASON_TYPE_META[r.type];
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 70px', padding: '11px 16px', borderBottom: i < filtered.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', opacity: r.active ? 1 : 0.5, transition: 'background 0.1s, opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: r.active ? 500 : 400 }}>{r.label}</div>
              <div><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: tm.bg, color: tm.color }}>{tm.label}</span></div>
              <div style={{ fontSize: 12, color: C.muted }}>{r.scope === 'global' ? 'All branches' : 'Branch-specific'}</div>
              <Toggle checked={r.active} onChange={() => toggleActive(r.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Settings() {
  const [selBranch,   setSelBranch]   = useState('Bercut Seminyak');
  const [tab,         setTab]         = useState('notifications');
  const [saved,       setSaved]       = useState(false);

  // Notification settings
  const [speakerOn,   setSpeakerOn]   = useState(true);
  const [lateThresh,  setLateThresh]  = useState(10);
  const [ackGrace,    setAckGrace]    = useState(3);
  const [pushOn,      setPushOn]      = useState(false);

  // Tip presets (5 slots per decisions-log 2026-03-31)
  const [tipPresets, setTipPresets] = useState([5000, 10000, 20000, 50000, 100000]);

  // Kiosk UI settings
  const [welcomeEn,   setWelcomeEn]   = useState('Start Your Booking');
  const [welcomeId,   setWelcomeId]   = useState('Mulai Booking');
  const [ctaEn,       setCtaEn]       = useState('✂ Start Booking / Mulai Booking');
  const [upsellOn,    setUpsellOn]    = useState(true);
  const [upsellHeadEn,setUpsellHeadEn]= useState("Level up your experience?");
  const [upsellHeadId,setUpsellHeadId]= useState("Mau upgrade layanan Anda?");
  const [upsellSwitch,setUpsellSwitch]= useState('Switch to Package');
  const [upsellKeep,  setUpsellKeep]  = useState('Keep My Selection');

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const TABS = [
    { key: 'notifications', label: 'Notifications'     },
    { key: 'tips',          label: 'Tip Presets'        },
    { key: 'kiosk',         label: 'Kiosk UI'           },
    { key: 'reasons',       label: 'Payroll Reasons'    },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Settings</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Branch configuration, kiosk UI, and payroll reason management</div>
      </div>

      {/* Branch selector */}
      <div className="admin-card" style={{ padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text2 }}>Configuring:</span>
        <select value={selBranch} onChange={e => setSelBranch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid ' + C.border, fontSize: 14, fontWeight: 600, color: C.text, background: C.white }}>
          {BRANCHES.map(b => <option key={b.id}>{b.name}</option>)}
        </select>
        <span style={{ fontSize: 12, color: C.muted }}>Changes affect this branch only. Tip presets and kiosk copy can be set globally too.</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid ' + C.border, marginBottom: 28 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid ' + C.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: tab === t.key ? C.text : C.muted, cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Notifications ── */}
      {tab === 'notifications' && (
        <div>
          <SectionTitle title="Announcements & Escalation" sub="Controls voice announcements and admin alert thresholds for this branch." />
          <SettingRow label="Speaker Announcement"
            sub="Announce customer names via Web Speech API when called to the chair. Requires the kiosk to have browser audio enabled.">
            <Toggle checked={speakerOn} onChange={setSpeakerOn} />
          </SettingRow>
          <SettingRow label="Web Push Notifications (Phase 2)"
            sub="Send push notifications to barber PWAs when a new booking arrives. Requires service worker and VAPID key setup.">
            <Toggle checked={pushOn} onChange={setPushOn} />
          </SettingRow>
          <SettingRow label="Late Start Alert Threshold"
            sub="Send a delay alert to admin if a barber hasn't started a confirmed booking within this many minutes.">
            <Stepper value={lateThresh} onChange={setLateThresh} min={5} max={30} unit="min" />
          </SettingRow>
          <SettingRow label="Acknowledge Grace Period"
            sub="Escalate to voice call if barber hasn't acknowledged a new booking within this many minutes.">
            <Stepper value={ackGrace} onChange={setAckGrace} min={1} max={10} unit="min" />
          </SettingRow>
        </div>
      )}

      {/* ── Tip presets ── */}
      {tab === 'tips' && (
        <div>
          <SectionTitle title="Tip Presets" sub="These amounts are shown on the kiosk payment screen after service. Configurable per branch." />
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            {tipPresets.map((val, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 5 }}>Preset {i + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', borderRadius: 9, border: '1.5px solid ' + C.border, background: C.white, overflow: 'hidden' }}>
                  <span style={{ padding: '0 8px', fontSize: 12, color: C.muted, borderRight: '1px solid ' + C.border }}>Rp</span>
                  <input type="number" value={val / 1000}
                    onChange={e => {
                      const v = [...tipPresets];
                      v[i] = (parseInt(e.target.value) || 0) * 1000;
                      setTipPresets(v);
                    }}
                    style={{ width: 64, padding: '10px 8px', border: 'none', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text, background: 'transparent', textAlign: 'right' }}
                  />
                  <span style={{ padding: '0 8px', fontSize: 12, color: C.muted, borderLeft: '1px solid ' + C.border }}>rb</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
            Current: {tipPresets.map(p => 'Rp ' + (p / 1000) + 'k').join(' · ')} · Plus custom amount + skip option always shown.
          </div>
        </div>
      )}

      {/* ── Kiosk UI ── */}
      {tab === 'kiosk' && (
        <div>
          <SectionTitle title="Kiosk UI Configuration" sub="Changes propagate to kiosk on next load or via SSE push. English primary, Bahasa Indonesia subtitle." />

          {/* Welcome screen copy */}
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 12, marginTop: 8 }}>Welcome Screen Copy</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label:'Heading (English)',  value: welcomeEn,  onChange: setWelcomeEn  },
              { label:'Heading (Bahasa)',   value: welcomeId,  onChange: setWelcomeId  },
              { label:'CTA Button Label',   value: ctaEn,      onChange: setCtaEn      },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 5 }}>{f.label}</label>
                <input value={f.value} onChange={e => f.onChange(e.target.value)}
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text }} />
              </div>
            ))}
          </div>

          {/* Upsell settings */}
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 12 }}>Upsell Popup</div>
          <SettingRow label="Enable Upsell Popup" sub="Show package upgrade suggestions when customer selects individual services that match a package.">
            <Toggle checked={upsellOn} onChange={setUpsellOn} />
          </SettingRow>
          {upsellOn && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              {[
                { label:'Popup Heading (EN)',     value: upsellHeadEn,  onChange: setUpsellHeadEn  },
                { label:'Popup Heading (ID)',      value: upsellHeadId,  onChange: setUpsellHeadId  },
                { label:'"Switch" Button Label',  value: upsellSwitch,  onChange: setUpsellSwitch  },
                { label:'"Keep" Button Label',    value: upsellKeep,    onChange: setUpsellKeep    },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 5 }}>{f.label}</label>
                  <input value={f.value} onChange={e => f.onChange(e.target.value)}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Payroll Reasons ── */}
      {tab === 'reasons' && (
        <div>
          <SectionTitle title="Payroll Adjustment Reasons" sub="Configurable reason labels used when adding uang rajin, bonuses, deductions, and kasbon in the Payroll screen." />
          <ReasonsTab />
        </div>
      )}

      {/* Save button (not shown for reasons tab — that auto-saves) */}
      {tab !== 'reasons' && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid ' + C.border }}>
          <button onClick={handleSave}
            style={{ padding: '11px 28px', borderRadius: 9, background: saved ? '#16A34A' : C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
            {saved ? '✓ Settings Saved' : 'Save Settings'}
          </button>
          <span style={{ marginLeft: 12, fontSize: 12, color: C.muted }}>Changes for {selBranch} · Will emit kiosk_settings_update SSE event</span>
        </div>
      )}
    </div>
  );
}
