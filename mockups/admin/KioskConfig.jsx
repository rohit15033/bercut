/**
 * MOCKUP — Bercut Admin: KioskConfig
 *
 * What it does: Per-branch kiosk UI configuration screen. Admin can remotely update
 *   the kiosk's welcome screen copy, service visibility/order (grouped by category),
 *   unified upsell rules (package OR popup trigger, with category-level conditions),
 *   and tip presets. Changes push live via SSE kiosk_settings_update on save.
 * State managed: selectedBranch, settings (welcome copy, categoryOrder, serviceOrderByCat,
 *   serviceVisible, upsellEnabled, upsellRules[outcome:'package'|'suggest_popup'],
 *   suggestServices, popup copy, tipPresets), saved, activeTab
 * Production API:
 *   GET  /api/kiosk-settings?branch_id=
 *   PATCH /api/branches/:id/settings  → emits SSE kiosk_settings_update to kiosk
 * Feeds into: Kiosk (via SSE hot-reload)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/KioskConfig.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState, useEffect, useRef } from 'react';
import { BRANCHES, C, fmt } from './data.js';
import { SERVICES } from '../kiosk/catalogue.js';
import BercutKiosk from '../kiosk/BercutKiosk.jsx';

const TABS = ['Welcome Screen', 'Services & Display', 'Upsell Rules', 'Tip Presets'];

// Maps each tab index to the kiosk preview screen that should be locked
const TAB_PREVIEW = [
  { initialStep: 0,                    label: 'Welcome'           },
  { initialStep: 1,                    label: 'Service Selection' },
  { initialStep: 1,                    label: 'Service Selection' },
  { initialStep: 0, demoPayment: true, label: 'Payment / Tip'    },
];

// Derived from the real kiosk catalogue — always in sync
const ADDON_SERVICES   = SERVICES.filter(s => s.cat !== 'Package');
const PACKAGE_SERVICES = SERVICES.filter(s => s.cat === 'Package');
const ADDON_CATS       = [...new Set(ADDON_SERVICES.map(s => s.cat))];

const CAT_BADGE = {
  Haircut:   { bg: '#1a2a3a', text: '#6ab3d4' },
  Beard:     { bg: '#2a1a2a', text: '#c46ac4' },
  Treatment: { bg: '#1a2a1a', text: '#6ac46a' },
  Package:   { bg: '#2a1a10', text: '#d4a06a' },
  HairColor: { bg: '#1a1a2a', text: '#8a8ad4' },
};

// Condition item:  { type: 'cat', cat: 'Beard' }  OR  { type: 'svc', id: 13 }
// outcome: 'package' → suggest a specific package
// outcome: 'suggest_popup' → show "Complete Your Look" popup
const DEFAULT_UPSELL_RULES = [
  { id: 'r1', mustContain: [{ type: 'svc', id: 13 }],
               mustNotContain: [{ type: 'cat', cat: 'Beard' }],
               outcome: 'package', pkgId: 16, active: true },
  { id: 'r2', mustContain: [{ type: 'cat', cat: 'Beard' }],
               mustNotContain: [{ type: 'cat', cat: 'Treatment' }],
               outcome: 'package', pkgId: 17, active: true },
  { id: 'r3', mustContain: [{ type: 'cat', cat: 'Treatment' }],
               mustNotContain: [{ type: 'cat', cat: 'Beard' }],
               outcome: 'package', pkgId: 18, active: true },
  { id: 'r4', mustContain: [{ type: 'cat', cat: 'Beard' }, { type: 'cat', cat: 'Treatment' }],
               mustNotContain: [],
               outcome: 'package', pkgId: 19, active: true },
  // "Complete Your Look" trigger — haircut only, no add-ons
  { id: 'tr1', mustContain: [],
                mustNotContain: [{ type: 'cat', cat: 'Beard' }, { type: 'cat', cat: 'Treatment' }],
                outcome: 'suggest_popup', pkgId: null, active: true },
];

const DEFAULT_CATEGORY_ORDER = ['Haircut', 'Beard', 'Treatment', 'Package', 'HairColor'];
const DEFAULT_SVC_ORDER_BY_CAT = {
  Haircut:   [1, 2, 3, 4, 5],
  Beard:     [6, 7, 8],
  Treatment: [9, 10, 11, 12, 13, 14, 15],
  Package:   [16, 17, 18, 19],
  HairColor: [20, 21, 22],
};

const DEFAULT_SETTINGS = {
  welcomeHeading:    'Your Style, Your Choice',
  welcomeHeadingId:  'Gaya Kamu, Pilihan Kamu',
  welcomeCta:        'Start Booking',
  welcomeCtaId:      'Mulai Booking',
  welcomeSubtitle:   'Touch screen to begin',
  welcomeSubtitleId: 'Sentuh layar untuk memulai',
  categoryOrder:     DEFAULT_CATEGORY_ORDER,
  svcOrderByCat:     DEFAULT_SVC_ORDER_BY_CAT,
  upsellEnabled:     true,
  upsellRules:       DEFAULT_UPSELL_RULES,
  suggestServices:   [6, 7, 13, 14],
  upsellHeading:     'Complete Your Look',
  upsellHeadingId:   'Sempurnakan Tampilanmu',
  upsellSwitchCta:   'Switch to Package',
  upsellKeepCta:     'Keep My Selection',
  tipPresets:          [5000, 10000, 20000, 50000, 100000],
  sessionTimeoutSecs:  60,
};

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Field({ label, sub, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, color: C.text2, marginBottom: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, lineHeight: 1.5 }}>{sub}</div>}
      {children}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange}
      style={{ width: 44, height: 24, borderRadius: 12, background: on ? C.accent : C.surface2, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: on ? C.accentText : C.muted, position: 'absolute', top: 3, left: on ? 23 : 3, transition: 'left 0.2s' }} />
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1.5px solid ${C.border}`, fontSize: 13,
  fontFamily: "'DM Sans', sans-serif", color: C.text,
  background: C.white, outline: 'none', boxSizing: 'border-box',
};

// ── ServiceConditionSelect — grouped by category, category OR service selectable ──

function ServiceConditionSelect({ selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);

  const condKey  = c => c.type === 'cat' ? `cat:${c.cat}` : `svc:${c.id}`;
  const isSelected = c => selected.some(s => condKey(s) === condKey(c));

  const addItem = item => { if (!isSelected(item)) onChange([...selected, item]); setOpen(false); };
  const removeItem = item => onChange(selected.filter(s => condKey(s) !== condKey(item)));

  const chipLabel = c => c.type === 'cat' ? `Any ${c.cat}` : (SERVICES.find(s => s.id === c.id)?.name ?? '?');
  const chipCat   = c => c.type === 'cat' ? c.cat : SERVICES.find(s => s.id === c.id)?.cat;

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 38, padding: '5px 8px', background: C.white, border: `1.5px solid ${open ? C.text : C.border}`, borderRadius: 8, cursor: 'pointer', alignItems: 'center', transition: 'border 0.15s' }}>
        {selected.map(item => {
          const cat = chipCat(item);
          const b   = CAT_BADGE[cat] || { bg: '#e0e0d8', text: '#555' };
          return (
            <span key={condKey(item)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: b.bg, color: b.text, fontSize: 11, fontWeight: 600, padding: '3px 8px 3px 9px', borderRadius: 4 }}>
              {item.type === 'cat' && <span style={{ opacity: 0.7, fontSize: 10 }}>all</span>}
              {chipLabel(item)}
              <span onClick={e => { e.stopPropagation(); removeItem(item); }}
                style={{ fontWeight: 800, fontSize: 13, lineHeight: 1, cursor: 'pointer', opacity: 0.7 }}>×</span>
            </span>
          );
        })}
        {selected.length === 0 && <span style={{ fontSize: 12, color: C.muted, userSelect: 'none' }}>{placeholder || 'Select…'}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: C.muted, paddingLeft: 4, userSelect: 'none' }}>{open ? '▴' : '▾'}</span>
      </div>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.10)', zIndex: 200, maxHeight: 240, overflowY: 'auto' }}>
          {ADDON_CATS.map(cat => {
            const b         = CAT_BADGE[cat] || { bg: '#eee', text: '#555' };
            const catCond   = { type: 'cat', cat };
            const catAdded  = isSelected(catCond);
            const svcsInCat = ADDON_SERVICES.filter(s => s.cat === cat);
            return (
              <div key={cat}>
                {/* Category row */}
                <div onClick={() => !catAdded && addItem(catCond)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: b.bg, cursor: catAdded ? 'default' : 'pointer', opacity: catAdded ? 0.5 : 1, borderTop: `1px solid rgba(255,255,255,0.05)` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: b.text }}>Any {cat}</span>
                  <span style={{ fontSize: 10, color: b.text, opacity: 0.6 }}>— whole category</span>
                  {catAdded && <span style={{ marginLeft: 'auto', fontSize: 10, color: b.text }}>✓ added</span>}
                </div>
                {/* Individual services */}
                {svcsInCat.map(svc => {
                  const svcCond  = { type: 'svc', id: svc.id };
                  const svcAdded = isSelected(svcCond);
                  return (
                    <div key={svc.id} onClick={() => !svcAdded && addItem(svcCond)}
                      style={{ display: 'flex', alignItems: 'center', padding: '8px 14px 8px 26px', cursor: svcAdded ? 'default' : 'pointer', opacity: svcAdded ? 0.4 : 1, borderTop: `1px solid ${C.surface}`, background: C.white, transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!svcAdded) e.currentTarget.style.background = C.surface; }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.white; }}>
                      <span style={{ flex: 1, fontSize: 12, color: C.text }}>{svc.name}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{fmt(svc.price)}</span>
                      {svcAdded && <span style={{ marginLeft: 8, fontSize: 10, color: C.muted }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Readable summary of condition array
function condSummary(conditions) {
  if (!conditions.length) return 'Any cart';
  return conditions.map(c =>
    c.type === 'cat' ? `Any ${c.cat}` : (SERVICES.find(s => s.id === c.id)?.name ?? '?')
  ).join(' + ');
}

// ── Inline rule editor ────────────────────────────────────────────────────────

function RuleEditor({ draft, setDraft, onSave, onCancel, onDelete, isNew }) {
  const targetPkg = PACKAGE_SERVICES.find(p => p.id === draft.pkgId);
  const canSave   = true;

  return (
    <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', marginTop: 6 }}>

      {/* Conditions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Field label="Cart must include (all of these)">
          <ServiceConditionSelect
            selected={draft.mustContain}
            onChange={v => setDraft({ ...draft, mustContain: v })}
            placeholder="Any cart — no filter"
          />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Leave empty to match any cart</div>
        </Field>
        <Field label="Cart must NOT include (none of these)">
          <ServiceConditionSelect
            selected={draft.mustNotContain}
            onChange={v => setDraft({ ...draft, mustNotContain: v })}
            placeholder="No exclusions"
          />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Leave empty to ignore exclusions</div>
        </Field>
      </div>

      {/* Action — popup or specific package */}
      <Field label="Action">
        <select
          value={draft.outcome === 'suggest_popup' ? 'popup' : (draft.pkgId ?? '')}
          onChange={e => {
            if (e.target.value === 'popup') {
              setDraft({ ...draft, outcome: 'suggest_popup', pkgId: null });
            } else {
              setDraft({ ...draft, outcome: 'package', pkgId: parseInt(e.target.value) || null });
            }
          }}
          style={{ ...inputStyle }}>
          <option value="popup">Show popup</option>
          <option disabled>──────────────</option>
          {PACKAGE_SERVICES.map(p => (
            <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</option>
          ))}
        </select>
        {targetPkg && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, background: CAT_BADGE.Package.bg, color: CAT_BADGE.Package.text, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4 }}>
            ✓ {targetPkg.name} · {fmt(targetPkg.price)}
          </div>
        )}
      </Field>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
        <button onClick={() => canSave && onSave(draft)}
          style={{ padding: '8px 20px', borderRadius: 7, background: canSave ? C.topBg : C.surface2, color: canSave ? C.white : C.muted, border: 'none', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, cursor: canSave ? 'pointer' : 'not-allowed' }}>
          {isNew ? '+ Add Rule' : 'Save Rule'}
        </button>
        <button onClick={onCancel}
          style={{ padding: '8px 16px', borderRadius: 7, background: 'none', color: C.muted, border: `1.5px solid ${C.border}`, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
          Cancel
        </button>
        {!isNew && (
          <button onClick={onDelete}
            style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 7, background: 'none', color: C.danger, border: `1.5px solid ${C.danger}`, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Delete Rule
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tab 1: Welcome Screen ─────────────────────────────────────────────────────

function WelcomeTab({ s, set }) {
  return (
    <div>
      <SectionTitle title="Welcome / Idle Screen" sub="Displayed when kiosk is idle. Changes apply immediately on next kiosk load or via SSE push." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Field label="Heading (English)" sub="Main headline on the idle screen">
          <input value={s.welcomeHeading} onChange={e => set({ ...s, welcomeHeading: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Heading (Bahasa Indonesia)">
          <input value={s.welcomeHeadingId} onChange={e => set({ ...s, welcomeHeadingId: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="CTA Button (English)" sub='"Start Booking" button label'>
          <input value={s.welcomeCta} onChange={e => set({ ...s, welcomeCta: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="CTA Button (Bahasa Indonesia)">
          <input value={s.welcomeCtaId} onChange={e => set({ ...s, welcomeCtaId: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Subtitle (English)" sub="Small helper text below the CTA">
          <input value={s.welcomeSubtitle} onChange={e => set({ ...s, welcomeSubtitle: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Subtitle (Bahasa Indonesia)">
          <input value={s.welcomeSubtitleId} onChange={e => set({ ...s, welcomeSubtitleId: e.target.value })} style={inputStyle} />
        </Field>
      </div>

      {/* ── Session Timeout ── */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
        <SectionTitle title="Session Timeout"
          sub="Once a customer taps Start, if they go idle the session resets and logs a pax out with the step they abandoned at. Does not apply on the welcome screen." />
        <Field label="Inactivity timeout" sub="Seconds of no interaction before the countdown warning appears. A 15-second countdown then plays before auto-reset.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="number" min={10} max={300} step={5}
              value={s.sessionTimeoutSecs}
              onChange={e => set({ ...s, sessionTimeoutSecs: Math.max(10, parseInt(e.target.value) || 60) })}
              style={{ ...inputStyle, width: 90, textAlign: 'right' }} />
            <span style={{ fontSize: 13, color: C.muted }}>seconds</span>
            <span style={{ fontSize: 11, color: C.muted, padding: '4px 10px', background: C.surface, borderRadius: 6 }}>
              → {Math.floor(s.sessionTimeoutSecs / 60) > 0 ? `${Math.floor(s.sessionTimeoutSecs / 60)}m ` : ''}{s.sessionTimeoutSecs % 60 > 0 ? `${s.sessionTimeoutSecs % 60}s` : ''} idle · then 15s countdown
            </span>
          </div>
        </Field>
      </div>
    </div>
  );
}

// ── Tab 2: Services & Display ─────────────────────────────────────────────────

function ServicesDisplayTab({ s, set }) {
  const [dragCat, setDragCat] = useState(null);
  const [dragSvc, setDragSvc] = useState(null); // { id, cat }

  // Category reorder
  const moveCat = (cat, dir) => {
    const i    = s.categoryOrder.indexOf(cat);
    const next = [...s.categoryOrder];
    if (dir === 'up'   && i > 0)                        { [next[i-1], next[i]] = [next[i], next[i-1]]; }
    if (dir === 'down' && i < s.categoryOrder.length-1) { [next[i], next[i+1]] = [next[i+1], next[i]]; }
    set({ ...s, categoryOrder: next });
  };
  const dropCat = (targetCat) => {
    if (!dragCat || dragCat === targetCat) return;
    const next = [...s.categoryOrder];
    const from = next.indexOf(dragCat), to = next.indexOf(targetCat);
    next.splice(from, 1); next.splice(to, 0, dragCat);
    set({ ...s, categoryOrder: next }); setDragCat(null);
  };

  // Service reorder within category
  const moveSvc = (cat, id, dir) => {
    const arr = [...(s.svcOrderByCat[cat] || [])];
    const i   = arr.indexOf(id);
    if (dir === 'up'   && i > 0)            { [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; }
    if (dir === 'down' && i < arr.length-1) { [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; }
    set({ ...s, svcOrderByCat: { ...s.svcOrderByCat, [cat]: arr } });
  };
  const dropSvc = (targetId, cat) => {
    if (!dragSvc || dragSvc.id === targetId || dragSvc.cat !== cat) return;
    const arr  = [...(s.svcOrderByCat[cat] || [])];
    const from = arr.indexOf(dragSvc.id), to = arr.indexOf(targetId);
    arr.splice(from, 1); arr.splice(to, 0, dragSvc.id);
    set({ ...s, svcOrderByCat: { ...s.svcOrderByCat, [cat]: arr } }); setDragSvc(null);
  };

  const arrowBtn = (onClick, disabled, label) => (
    <button onClick={onClick} disabled={disabled}
      style={{ background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? C.surface2 : C.muted, fontSize: 9, padding: '1px 3px', lineHeight: 1 }}>
      {label}
    </button>
  );

  return (
    <div>
      <div>
        <SectionTitle
          title="Services & Display"
          sub="Drag category headers to reorder groups. Drag or use arrows to reorder services within each group. To disable a service at this branch, go to Services."
        />

        {s.categoryOrder.map((cat, catIdx) => {
          const b       = CAT_BADGE[cat] || { bg: '#e0e0d8', text: '#555' };
          const svcIds  = s.svcOrderByCat[cat] || [];
          const svcs    = svcIds.map(id => SERVICES.find(x => x.id === id)).filter(Boolean);

          return (
            <div key={cat} style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${C.border}`, opacity: dragCat === cat ? 0.45 : 1 }}>
              {/* Category header — draggable */}
              <div
                draggable
                onDragStart={() => setDragCat(cat)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => dropCat(cat)}
                onDragEnd={() => setDragCat(null)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: b.bg, cursor: 'grab' }}>
                <span style={{ fontSize: 14, color: b.text, opacity: 0.6, userSelect: 'none' }}>⠿</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: b.text, flex: 1 }}>{cat}</span>
                <span style={{ fontSize: 11, color: b.text, opacity: 0.6 }}>{svcs.length} services</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {arrowBtn(() => moveCat(cat, 'up'),   catIdx === 0,                       '▲')}
                  {arrowBtn(() => moveCat(cat, 'down'), catIdx === s.categoryOrder.length-1, '▼')}
                </div>
              </div>

              {/* Services within category */}
              {svcs.map((svc, svcIdx) => (
                <div key={svc.id}
                  draggable
                  onDragStart={() => setDragSvc({ id: svc.id, cat })}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => dropSvc(svc.id, cat)}
                  onDragEnd={() => setDragSvc(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: C.white, borderTop: `1px solid ${C.border}`, cursor: 'grab', opacity: dragSvc?.id === svc.id ? 0.45 : 1 }}>
                  <span style={{ fontSize: 13, color: C.muted, userSelect: 'none', marginLeft: 8 }}>⠿</span>
                  <span style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{svc.name}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text2, marginRight: 4 }}>{fmt(svc.price)}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {arrowBtn(() => moveSvc(cat, svc.id, 'up'),   svcIdx === 0,              '▲')}
                    {arrowBtn(() => moveSvc(cat, svc.id, 'down'), svcIdx === svcs.length - 1, '▼')}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

      </div>
    </div>
  );
}

// ── Tab 3: Upsell Rules ───────────────────────────────────────────────────────

function UpsellRulesTab({ s, set }) {
  const [editingId, setEditingId] = useState(null); // rule id | 'new' | null
  const [draft,     setDraft]     = useState(null);

  const deepCopyRule = r => ({ ...r, mustContain: [...r.mustContain], mustNotContain: [...r.mustNotContain] });

  const startEdit = rule => { setEditingId(rule.id); setDraft(deepCopyRule(rule)); };
  const startNew  = ()   => { setEditingId('new'); setDraft({ id: `r${Date.now()}`, mustContain: [], mustNotContain: [], outcome: 'package', pkgId: null, active: true }); };
  const cancel    = ()   => { setEditingId(null); setDraft(null); };

  const saveRule = d => {
    const next = editingId === 'new'
      ? [...s.upsellRules, d]
      : s.upsellRules.map(r => r.id === d.id ? d : r);
    set({ ...s, upsellRules: next }); cancel();
  };
  const deleteRule  = id => { set({ ...s, upsellRules: s.upsellRules.filter(r => r.id !== id) }); cancel(); };
  const toggleRule  = id => set({ ...s, upsellRules: s.upsellRules.map(r => r.id === id ? { ...r, active: !r.active } : r) });

  const toggleSuggest = id => {
    const next = s.suggestServices.includes(id)
      ? s.suggestServices.filter(x => x !== id)
      : [...s.suggestServices, id];
    set({ ...s, suggestServices: next });
  };

  return (
    <div>
      <SectionTitle
        title="Upsell Rules"
        sub={'Rules are evaluated top-to-bottom — first match wins. Each rule either suggests a package upgrade or shows the "Complete Your Look" popup.'}
      />

      {/* Global toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, padding: '12px 16px', background: C.surface, borderRadius: 10 }}>
        <Toggle on={s.upsellEnabled} onChange={() => set({ ...s, upsellEnabled: !s.upsellEnabled })} />
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>
            {s.upsellEnabled ? 'Upsell enabled' : 'Upsell disabled'}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {s.upsellEnabled ? 'Rules below are active and evaluated on every cart change.' : 'No rules fire — packages and popup are suppressed globally.'}
          </div>
        </div>
      </div>

      {/* Rule list */}
      <div style={{ opacity: s.upsellEnabled ? 1 : 0.4, pointerEvents: s.upsellEnabled ? 'auto' : 'none', marginBottom: 32 }}>

        {/* Column headers */}
        {s.upsellRules.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 160px 60px 56px', gap: 12, padding: '6px 14px', marginBottom: 2 }}>
            {['#', 'Conditions', 'Outcome', 'Active', ''].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
            ))}
          </div>
        )}

        {s.upsellRules.length === 0 && editingId !== 'new' && (
          <div style={{ padding: 20, background: C.surface, borderRadius: 10, textAlign: 'center', fontSize: 13, color: C.muted, marginBottom: 10 }}>
            No rules defined. Add one below.
          </div>
        )}

        {s.upsellRules.map((rule, i) => {
          const targetPkg = PACKAGE_SERVICES.find(p => p.id === rule.pkgId);
          const isEditing = editingId === rule.id;
          return (
            <div key={rule.id} style={{ marginBottom: 5 }}>
              {!isEditing && (
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 160px 60px 56px', gap: 12, alignItems: 'center', padding: '11px 14px', background: rule.active ? C.white : C.surface, border: `1.5px solid ${rule.active ? C.border : C.surface2}`, borderRadius: 10, transition: 'background 0.15s' }}>
                  {/* Priority */}
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 12, color: C.muted, textAlign: 'center' }}>{i + 1}</span>

                  {/* Conditions */}
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, color: rule.active ? C.text : C.muted }}>
                      {condSummary(rule.mustContain) || 'Any cart'}
                    </div>
                    {rule.mustNotContain.length > 0 && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        not: {condSummary(rule.mustNotContain)}
                      </div>
                    )}
                  </div>

                  {/* Outcome badge */}
                  <div>
                    {rule.outcome === 'package' ? (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: CAT_BADGE.Package.text, background: CAT_BADGE.Package.bg, padding: '2px 7px', borderRadius: 4, display: 'inline-block', marginBottom: 2 }}>Package</div>
                        <div style={{ fontSize: 11, color: rule.active ? C.text : C.muted, fontWeight: 600 }}>
                          {targetPkg ? targetPkg.name : <span style={{ color: C.danger }}>Not set</span>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6ac46a', background: '#1a2a1a', padding: '3px 8px', borderRadius: 4, display: 'inline-block' }}>
                        Show Popup
                      </div>
                    )}
                  </div>

                  {/* Active toggle */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Toggle on={rule.active} onChange={() => toggleRule(rule.id)} />
                  </div>

                  {/* Edit */}
                  <button onClick={() => startEdit(rule)}
                    style={{ padding: '5px 10px', borderRadius: 6, background: 'none', border: `1.5px solid ${C.border}`, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, color: C.text2, cursor: 'pointer' }}>
                    Edit
                  </button>
                </div>
              )}

              {isEditing && (
                <RuleEditor draft={draft} setDraft={setDraft} onSave={saveRule} onCancel={cancel} onDelete={() => deleteRule(rule.id)} isNew={false} />
              )}
            </div>
          );
        })}

        {editingId === 'new' && (
          <RuleEditor draft={draft} setDraft={setDraft} onSave={saveRule} onCancel={cancel} onDelete={null} isNew={true} />
        )}

        {editingId !== 'new' && (
          <button onClick={startNew}
            style={{ marginTop: 8, padding: '9px 18px', borderRadius: 8, background: 'none', border: `1.5px dashed ${C.border}`, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, color: C.muted, cursor: 'pointer', width: '100%' }}>
            + Add Rule
          </button>
        )}

        <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
          {s.upsellRules.filter(r => r.active).length} of {s.upsellRules.length} rules active.
          {' '}{s.upsellRules.filter(r => r.active && r.outcome === 'package').length} package rules,
          {' '}{s.upsellRules.filter(r => r.active && r.outcome === 'suggest_popup').length} popup trigger rules.
        </div>
      </div>

      {/* ── "Complete Your Look" popup config ── */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 28 }}>
        <SectionTitle
          title='"Complete Your Look" Popup Config'
          sub="Configure which services appear inside the popup and the copy. The popup fires when a rule above with outcome 'Show Popup' is triggered."
        />

        {/* Services to suggest */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text, marginBottom: 10 }}>
            Services to Suggest
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 11, color: C.muted, marginLeft: 8 }}>Which services appear as options inside the popup</span>
          </div>

          {/* Grouped by category */}
          {ADDON_CATS.map(cat => {
            const svcsInCat = ADDON_SERVICES.filter(svc => svc.cat === cat);
            const b = CAT_BADGE[cat] || { bg: '#eee', text: '#555' };
            return (
              <div key={cat} style={{ marginBottom: 10, borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${C.border}` }}>
                <div style={{ padding: '8px 14px', background: b.bg }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: b.text }}>{cat}</span>
                </div>
                {svcsInCat.map(svc => {
                  const isOn = s.suggestServices.includes(svc.id);
                  return (
                    <div key={svc.id} onClick={() => toggleSuggest(svc.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', background: isOn ? C.white : C.surface, borderTop: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <Toggle on={isOn} onChange={() => toggleSuggest(svc.id)} />
                      <span style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: isOn ? C.text : C.muted }}>{svc.name}</span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: isOn ? C.text2 : C.muted }}>{fmt(svc.price)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            {s.suggestServices.length} service{s.suggestServices.length !== 1 ? 's' : ''} will appear in the popup.
          </div>
        </div>

        {/* Popup copy */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text, marginBottom: 14 }}>Popup Copy</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Popup Heading (English)">
              <input value={s.upsellHeading} onChange={e => set({ ...s, upsellHeading: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Popup Heading (Bahasa Indonesia)">
              <input value={s.upsellHeadingId} onChange={e => set({ ...s, upsellHeadingId: e.target.value })} style={inputStyle} />
            </Field>
            <Field label='"Switch to Package" Button'>
              <input value={s.upsellSwitchCta} onChange={e => set({ ...s, upsellSwitchCta: e.target.value })} style={inputStyle} />
            </Field>
            <Field label='"Keep My Selection" Button'>
              <input value={s.upsellKeepCta} onChange={e => set({ ...s, upsellKeepCta: e.target.value })} style={inputStyle} />
            </Field>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Tab 4: Tip Presets ────────────────────────────────────────────────────────

function TipPresetsTab({ s, set }) {
  const [newPreset, setNewPreset] = useState('');
  const removePreset = amt => set({ ...s, tipPresets: s.tipPresets.filter(x => x !== amt) });
  const addPreset = () => {
    const n = parseInt(newPreset.replace(/\D/g, ''));
    if (!n || s.tipPresets.includes(n)) return;
    set({ ...s, tipPresets: [...s.tipPresets, n].sort((a, b) => a - b) });
    setNewPreset('');
  };
  return (
    <div>
      <SectionTitle title="Tip Presets" sub="Preset amounts shown on the payment screen. Sorted automatically. Min 2, max 6. Tips go 100% to the individual barber." />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        {s.tipPresets.map(amt => (
          <div key={amt} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 14px' }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text }}>{fmt(amt)}</span>
            <button onClick={() => removePreset(amt)} disabled={s.tipPresets.length <= 2}
              style={{ background: 'none', border: 'none', color: s.tipPresets.length <= 2 ? C.surface2 : C.danger, cursor: s.tipPresets.length <= 2 ? 'not-allowed' : 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input value={newPreset} onChange={e => setNewPreset(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPreset()}
          placeholder="e.g. 30000" style={{ ...inputStyle, width: 160 }} />
        <button onClick={addPreset} disabled={s.tipPresets.length >= 6}
          style={{ padding: '10px 20px', borderRadius: 8, background: C.topBg, color: C.white, border: 'none', cursor: s.tipPresets.length >= 6 ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, opacity: s.tipPresets.length >= 6 ? 0.4 : 1 }}>
          + Add Preset
        </button>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
        {s.tipPresets.length >= 6 ? 'Maximum 6 presets reached.' : `${6 - s.tipPresets.length} more can be added.`}
      </div>
    </div>
  );
}

// ── Live Kiosk Preview ────────────────────────────────────────────────────────

function KioskLivePreview({ settings, previewKey, initialStep, demoPayment, screenLabel }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const KIOSK_W = 1280;
  const KIOSK_H = 800; // typical tablet landscape

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth;
        setScale(Math.min(1, availableW / KIOSK_W));
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div ref={containerRef} style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase' }}>
          Live Kiosk Preview
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#111110', color: '#F5E200', letterSpacing: '0.06em' }}>
          → {screenLabel}
        </div>
      </div>
      <div style={{
        width: Math.floor(KIOSK_W * scale),
        height: Math.floor(KIOSK_H * scale),
        margin: '0 auto',
        borderRadius: 14,
        overflow: 'hidden',
        border: `1.5px solid ${C.border}`,
        background: C.bg,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        <div style={{
          width: KIOSK_W,
          height: KIOSK_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          overflow: 'auto',
          position: 'absolute',
          top: 0,
          left: 0
        }}>
          <BercutKiosk key={previewKey} settings={settings} initialStep={initialStep} demoPayment={demoPayment} />
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function KioskConfig() {
  const [branch,    setBranch]   = useState(BRANCHES[0]);
  const [activeTab, setActiveTab] = useState(0);
  const [settings,  setSettings] = useState({
    ...DEFAULT_SETTINGS,
    upsellRules: DEFAULT_UPSELL_RULES.map(r => ({
      ...r,
      mustContain:    [...r.mustContain],
      mustNotContain: [...r.mustNotContain],
    })),
    svcOrderByCat: Object.fromEntries(
      Object.entries(DEFAULT_SVC_ORDER_BY_CAT).map(([k, v]) => [k, [...v]])
    ),
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // Production: PATCH /api/branches/:id/settings { ...settings }
    //   → server emits SSE kiosk_settings_update with new settings payload
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ padding: '28px 32px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Admin</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 }}>Kiosk Configuration</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Remotely configure kiosk UI per branch. Changes push live via SSE — no code deploy required.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={branch.id} onChange={e => setBranch(BRANCHES.find(b => b.id === parseInt(e.target.value)))}
            style={{ padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: C.white, color: C.text, cursor: 'pointer' }}>
            {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={handleSave}
            style={{ padding: '10px 24px', borderRadius: 8, background: saved ? '#1a3a1a' : C.topBg, color: saved ? '#6fcf6f' : C.white, border: 'none', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
            {saved ? '✓ Saved & Pushed to Kiosk' : 'Save & Push to Kiosk'}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 32px 40px' }}>
        <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{branch.name} Kiosk</span>
            <span style={{ fontSize: 12, color: C.muted, marginLeft: 10 }}>Last sync: 2 minutes ago · Changes go live within 5 seconds of save</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>SSE push enabled ✓</div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `1px solid ${C.border}` }}>
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              style={{ padding: '10px 18px', borderRadius: '8px 8px 0 0', border: 'none', borderBottom: `3px solid ${activeTab === i ? C.text : 'transparent'}`, background: 'transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: activeTab === i ? 700 : 500, fontSize: 13, color: activeTab === i ? C.text : C.muted, cursor: 'pointer', marginBottom: -1 }}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 40 }}>
          <div style={{ background: C.white, borderRadius: 14, padding: 28, border: `1.5px solid ${C.border}` }}>
            {activeTab === 0 && <WelcomeTab         s={settings} set={setSettings} />}
            {activeTab === 1 && <ServicesDisplayTab s={settings} set={setSettings} />}
            {activeTab === 2 && <UpsellRulesTab     s={settings} set={setSettings} />}
            {activeTab === 3 && <TipPresetsTab      s={settings} set={setSettings} />}
          </div>
        </div>

        <KioskLivePreview
          settings={settings}
          previewKey={activeTab}
          initialStep={TAB_PREVIEW[activeTab].initialStep}
          demoPayment={TAB_PREVIEW[activeTab].demoPayment ?? false}
          screenLabel={TAB_PREVIEW[activeTab].label}
        />

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Changes are pushed to the kiosk immediately via SSE — no page reload required.</span>
          <button onClick={handleSave}
            style={{ padding: '11px 28px', borderRadius: 9, background: saved ? '#1a3a1a' : C.topBg, color: saved ? '#6fcf6f' : C.white, border: 'none', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
            {saved ? '✓ Saved & Pushed' : 'Save & Push to Kiosk'}
          </button>
        </div>
      </div>
    </div>
  );
}
