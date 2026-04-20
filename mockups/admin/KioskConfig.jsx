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

const TABS = ['Welcome Screen', 'Upsell Rules', 'Feedback Tags'];

// Maps each tab index to the kiosk preview screen that should be locked
const TAB_PREVIEW = [
  { initialStep: 0,                    label: 'Welcome'        },
  { initialStep: 1,                    label: 'Service Select' },
  { initialStep: 0, demoPayment: true, label: 'Review Screen'  },
];

// ── Feedback Tags tab data ────────────────────────────────────────────────────

const CONTEXT_META = {
  good:    { label: '4–5 ★',  color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', dot: '#22C55E' },
  neutral: { label: '3 ★',    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B' },
  bad:     { label: '1–2 ★',  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
};

const DEFAULT_FEEDBACK_TAGS = [
  { id: 'ft1',  key: 'great_service',   label: 'Great Service',    context: 'good',    isActive: true  },
  { id: 'ft2',  key: 'clean_haircut',   label: 'Clean Haircut',    context: 'good',    isActive: true  },
  { id: 'ft3',  key: 'fast',            label: 'Fast',             context: 'good',    isActive: true  },
  { id: 'ft4',  key: 'friendly_barber', label: 'Friendly Barber',  context: 'good',    isActive: true  },
  { id: 'ft5',  key: 'good_atmosphere', label: 'Good Atmosphere',  context: 'good',    isActive: true  },
  { id: 'ft6',  key: 'worth_the_price', label: 'Worth the Price',  context: 'good',    isActive: false },
  { id: 'ft7',  key: 'ok_service',      label: 'OK Service',       context: 'neutral', isActive: true  },
  { id: 'ft8',  key: 'expected_better', label: 'Expected Better',  context: 'neutral', isActive: true  },
  { id: 'ft9',  key: 'long_wait',       label: 'Long Wait',        context: 'bad',     isActive: true  },
  { id: 'ft10', key: 'not_as_expected', label: 'Not as Expected',  context: 'bad',     isActive: true  },
  { id: 'ft11', key: 'communication',   label: 'Communication',    context: 'bad',     isActive: true  },
];

function FeedbackTagsTab() {
  const [tags,       setTags]       = useState(DEFAULT_FEEDBACK_TAGS.map(t => ({ ...t })));
  const [newLabel,   setNewLabel]   = useState('');
  const [newContext, setNewContext] = useState('good');
  const [addError,   setAddError]   = useState('');

  function toggleActive(id) {
    setTags(ts => ts.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
  }

  function removeTag(id) {
    setTags(ts => ts.filter(t => t.id !== id));
  }

  function addTag() {
    const label = newLabel.trim();
    if (!label) { setAddError('Tag label is required.'); return; }
    if (tags.some(t => t.label.toLowerCase() === label.toLowerCase())) {
      setAddError('A tag with this label already exists.');
      return;
    }
    const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const id  = 'ft_' + Date.now();
    setTags(ts => [...ts, { id, key, label, context: newContext, isActive: true }]);
    setNewLabel('');
    setAddError('');
  }

  const byContext = ['good', 'neutral', 'bad'].map(ctx => ({
    ctx,
    meta: CONTEXT_META[ctx],
    tags: tags.filter(t => t.context === ctx),
  }));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: '#111110', marginBottom: 4 }}>Feedback Tags</div>
        <div style={{ fontSize: 12, color: '#88887E', lineHeight: 1.6 }}>
          Tags shown on the kiosk review screen after payment. Grouped by star rating context.
          These are fetched at kiosk boot via <code style={{ fontFamily: 'monospace', fontSize: 11, background: '#ECEAE4', padding: '1px 5px', borderRadius: 3 }}>GET /api/feedback-tags</code>.
        </div>
      </div>

      {byContext.map(({ ctx, meta, tags: ctxTags }) => (
        <div key={ctx} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#111110' }}>
              {ctx.charAt(0).toUpperCase() + ctx.slice(1)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: meta.bg, color: meta.color, border: '1px solid ' + meta.border }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 11, color: '#88887E', marginLeft: 2 }}>{ctxTags.filter(t => t.isActive).length} active</span>
          </div>

          {ctxTags.length === 0 ? (
            <div style={{ fontSize: 12, color: '#88887E', padding: '10px 0', fontStyle: 'italic' }}>No tags for this context yet.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ctxTags.map(tag => (
                <div key={tag.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px 6px 12px',
                  borderRadius: 20,
                  border: '1.5px solid ' + (tag.isActive ? meta.border : '#DDDBD4'),
                  background: tag.isActive ? meta.bg : '#F2F0EB',
                  opacity: tag.isActive ? 1 : 0.55,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: tag.isActive ? meta.color : '#88887E', fontFamily: "'DM Sans', sans-serif" }}>{tag.label}</span>
                  <button onClick={() => toggleActive(tag.id)}
                    title={tag.isActive ? 'Deactivate' : 'Activate'}
                    style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', fontSize: 12, color: tag.isActive ? meta.color : '#88887E', lineHeight: 1 }}>
                    {tag.isActive ? '✓' : '○'}
                  </button>
                  <button onClick={() => removeTag(tag.id)}
                    title="Remove tag"
                    style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', fontSize: 11, color: '#88887E', lineHeight: 1 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add new tag */}
      <div style={{ marginTop: 8, padding: '18px 20px', borderRadius: 12, border: '1.5px dashed #DDDBD4', background: '#FAFAF8' }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#111110', marginBottom: 12 }}>Add New Tag</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            value={newLabel}
            onChange={e => { setNewLabel(e.target.value); setAddError(''); }}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="Tag label (e.g. Clean Cut)"
            style={{ flex: 1, minWidth: 160, padding: '9px 12px', borderRadius: 8, border: '1.5px solid ' + (addError ? '#FECACA' : '#DDDBD4'), fontSize: 13, color: '#111110', background: '#FFFFFF', fontFamily: "'DM Sans', sans-serif" }}
          />
          <select value={newContext} onChange={e => setNewContext(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #DDDBD4', fontSize: 13, color: '#111110', background: '#FFFFFF', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}>
            <option value="good">Good (4–5 ★)</option>
            <option value="neutral">Neutral (3 ★)</option>
            <option value="bad">Bad (1–2 ★)</option>
          </select>
          <button onClick={addTag}
            style={{ padding: '9px 18px', borderRadius: 8, background: '#111110', color: '#FFFFFF', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            + Add
          </button>
        </div>
        {addError && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>{addError}</div>}
        <div style={{ fontSize: 11, color: '#88887E', marginTop: 8, lineHeight: 1.5 }}>
          Tags are saved globally and pushed to all kiosks via <code style={{ fontFamily: 'monospace', background: '#ECEAE4', padding: '1px 4px', borderRadius: 3 }}>PATCH /api/branches/:id/settings</code>. Inactive tags are hidden from kiosk but preserved for reporting.
        </div>
      </div>
    </div>
  );
}

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
            {activeTab === 0 && <WelcomeTab     s={settings} set={setSettings} />}
            {activeTab === 1 && <UpsellRulesTab s={settings} set={setSettings} />}
            {activeTab === 2 && <FeedbackTagsTab />}
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
