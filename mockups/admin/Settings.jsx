/**
 * MOCKUP — Bercut Admin: Settings
 *
 * What it does: Global system configuration — 6 tabs:
 *   Catalog (expense categories + inventory master list governance),
 *   Loyalty (points expiry settings),
 *   Payroll (attendance deduction rates + overtime commission config),
 *   WhatsApp (provider: Fonnte now / WA Business API future; credentials; templates; test send),
 *   Users (owner-only: admin accounts + per-section permission toggles),
 *   Audit Log (owner-only: full global activity history with before/after diff).
 * State managed: activeTab, plus per-tab state for each section
 * Production API:
 *   GET/PUT /api/settings/whatsapp
 *   POST /api/settings/whatsapp/test
 *   GET/POST/PATCH /api/expense-categories
 *   GET/POST/PATCH /api/inventory/items
 *   GET/POST/PATCH /api/users
 *   PUT /api/users/:id/permissions
 *   GET /api/audit-log
 * Feeds into: Kiosk (via SSE kiosk_settings_update on branch settings save)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Settings.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { C, BRANCHES, EXPENSE_CATEGORIES, INVENTORY, INV_ITEM_TYPES, SERVICE_CATALOGUE, SVC_CAT_META, OVERTIME_COMM_CONFIG } from './data.js';

// ── Shared helpers ────────────────────────────────────────────────────────────

function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
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

// ── Catalog tab ───────────────────────────────────────────────────────────────

function CatalogTab() {
  const [cats,        setCats]        = useState(EXPENSE_CATEGORIES.map(c => ({ ...c })));
  const [editCatId,   setEditCatId]   = useState(null);
  const [editCatLbl,  setEditCatLbl]  = useState('');
  const [items,       setItems]       = useState(INVENTORY.map(i => ({ ...i })));
  const [invFilter,   setInvFilter]   = useState('all');
  const [editItemId,  setEditItemId]  = useState(null);
  const [editItemForm,setEditItemForm]= useState({});

  const filteredItems = invFilter === 'all' ? items : items.filter(i => i.cat === invFilter);

  function saveCatEdit(id) {
    setCats(c => c.map(x => x.id === id ? { ...x, label: editCatLbl } : x));
    setEditCatId(null);
  }
  function toggleCat(id) { setCats(c => c.map(x => x.id === id ? { ...x, isActive: !x.isActive } : x)); }
  function startEditItem(item) { setEditItemId(item.id); setEditItemForm({ name: item.name, cat: item.cat, unit: item.unit, threshold: item.threshold }); }
  function saveItemEdit(id) { setItems(it => it.map(x => x.id === id ? { ...x, ...editItemForm } : x)); setEditItemId(null); }
  function toggleItem(id) { setItems(it => it.map(x => x.id === id ? { ...x, isActive: !x.isActive } : x)); }

  const tdStyle = { fontSize: 13, padding: '11px 14px', color: C.text, borderBottom: '1px solid ' + C.surface, verticalAlign: 'middle' };
  const thStyle = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, padding: '8px 14px', borderBottom: '1px solid ' + C.surface };

  return (
    <div>
      {/* Expense Categories */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Expense Categories</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Rename or deactivate categories here. New categories are created from the Expenses form.</div>
        </div>
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Label','Key','Badge','Active',''].map((h,i) => <th key={i} style={{ ...thStyle, textAlign: i >= 3 ? 'center' : 'left' }}>{h}</th>)}</tr></thead>
            <tbody>
              {cats.map(cat => (
                <tr key={cat.id} style={{ opacity: cat.isActive ? 1 : 0.5, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}>
                    {editCatId === cat.id
                      ? <input value={editCatLbl} onChange={e => setEditCatLbl(e.target.value)} autoFocus style={{ padding: '5px 9px', borderRadius: 6, border: '1.5px solid ' + C.topBg, fontSize: 13, color: C.text, width: 160 }} />
                      : <span style={{ fontWeight: 600 }}>{cat.label}</span>}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.muted }}>{cat.key}</td>
                  <td style={tdStyle}><span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: cat.bg, color: cat.color }}>{cat.label}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><Toggle checked={cat.isActive} onChange={() => toggleCat(cat.id)} /></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {editCatId === cat.id
                      ? <button onClick={() => saveCatEdit(cat.id)} style={{ padding: '4px 12px', borderRadius: 6, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>Save</button>
                      : <button onClick={() => { setEditCatId(cat.id); setEditCatLbl(cat.label); }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid ' + C.border, background: 'transparent', color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Edit</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Item Master */}
      <div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Inventory Item Master List</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Rename, reclassify, or deactivate items. New items are created from Inventory → Receive Stock.</div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[{ key:'all', label:'All' }, ...INV_ITEM_TYPES].map(t => (
            <button key={t.key} onClick={() => setInvFilter(t.key)}
              style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (invFilter === t.key ? C.topBg : C.border), background: invFilter === t.key ? C.topBg : 'transparent', color: invFilter === t.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Item Name','Type','Unit','Low-Stock Alert','Active',''].map((h,i) => <th key={i} style={{ ...thStyle, textAlign: i >= 4 ? 'center' : 'left' }}>{h}</th>)}</tr></thead>
            <tbody>
              {filteredItems.map(item => {
                const tm = INV_ITEM_TYPES.find(t => t.key === item.cat) || INV_ITEM_TYPES[0];
                const isEditing = editItemId === item.id;
                return (
                  <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>{isEditing ? <input value={editItemForm.name} onChange={e => setEditItemForm(f => ({ ...f, name: e.target.value }))} autoFocus style={{ padding: '5px 9px', borderRadius: 6, border: '1.5px solid ' + C.topBg, fontSize: 13, color: C.text, width: 200 }} /> : <span style={{ fontWeight: 600 }}>{item.name}</span>}</td>
                    <td style={tdStyle}>{isEditing ? <select value={editItemForm.cat} onChange={e => setEditItemForm(f => ({ ...f, cat: e.target.value }))} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid ' + C.border, fontSize: 12, color: C.text }}>{INV_ITEM_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select> : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: tm.bg, color: tm.color }}>{tm.label}</span>}</td>
                    <td style={tdStyle}>{isEditing ? <input value={editItemForm.unit} onChange={e => setEditItemForm(f => ({ ...f, unit: e.target.value }))} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid ' + C.border, fontSize: 12, color: C.text, width: 60 }} /> : <span style={{ fontSize: 12, color: C.text2 }}>{item.unit}</span>}</td>
                    <td style={tdStyle}>{isEditing ? <input type="number" value={editItemForm.threshold} onChange={e => setEditItemForm(f => ({ ...f, threshold: parseInt(e.target.value) || 1 }))} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid ' + C.border, fontSize: 12, color: C.text, width: 60 }} /> : <span style={{ fontSize: 12, color: C.text2 }}>{item.threshold} {item.unit}</span>}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><Toggle checked={item.isActive} onChange={() => toggleItem(item.id)} /></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {isEditing
                        ? <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditItemId(null)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid ' + C.border, background: 'transparent', color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => saveItemEdit(item.id)} style={{ padding: '4px 12px', borderRadius: 6, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>Save</button>
                          </div>
                        : <button onClick={() => startEditItem(item)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid ' + C.border, background: 'transparent', color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Edit</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ── Loyalty tab ───────────────────────────────────────────────────────────────

const LOYALTY_DEFAULTS = {
  expiryMonths: 12,  // 0 = never expire
  warningDays:  30,
};

function LoyaltyTab() {
  const [settings, setSettings] = useState({ ...LOYALTY_DEFAULTS });
  const [saved,    setSaved]    = useState(false);

  function set(key, val) { setSettings(s => ({ ...s, [key]: val })); }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <SectionTitle
        title="Loyalty Programme"
        sub="Point expiry settings apply chain-wide to all customers and branches."
      />

      <SettingRow
        label="Points Expiry Window"
        sub="How many months of inactivity before a customer's points expire. Set to 0 to disable expiry. The clock resets on every completed booking.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Stepper value={settings.expiryMonths} onChange={v => set('expiryMonths', v)} min={0} max={24} unit="months" />
          {settings.expiryMonths === 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#F0FDF4', color: '#16A34A' }}>Never expire</span>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Expiry Warning"
        sub="Show a warning on the kiosk this many days before a customer's points expire. Set to 0 to disable warnings.">
        <Stepper value={settings.warningDays} onChange={v => set('warningDays', v)} min={0} max={90} unit="days before" />
      </SettingRow>

      <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 10, background: C.bg, border: '1px solid ' + C.border }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 6 }}>How it works</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.75 }}>
          {settings.expiryMonths === 0
            ? 'Points never expire — customers keep their balance indefinitely.'
            : <>
                Points expire after <strong style={{ color: C.text }}>{settings.expiryMonths} month{settings.expiryMonths !== 1 ? 's' : ''}</strong> of inactivity.
                The clock resets each time a customer completes a booking at any branch.
                {settings.warningDays > 0 && <> A warning banner is shown on the kiosk Confirm screen <strong style={{ color: C.text }}>{settings.warningDays} days</strong> before expiry.</>}
              </>
          }
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.75 }}>
          A nightly cron job expires overdue points by inserting an{' '}
          <code style={{ fontFamily: 'monospace', fontSize: 11, background: C.surface2, padding: '1px 5px', borderRadius: 3, color: C.text2 }}>expired</code>
          {' '}transaction row in <code style={{ fontFamily: 'monospace', fontSize: 11, background: C.surface2, padding: '1px 5px', borderRadius: 3, color: C.text2 }}>point_transactions</code>,
          zeroing the balance. Expiry history is always visible in the customer's transaction log.
        </div>
      </div>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid ' + C.border }}>
        <button onClick={handleSave}
          style={{ padding: '11px 28px', borderRadius: 9, background: saved ? '#16A34A' : C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
          {saved ? '✓ Saved' : 'Save Loyalty Settings'}
        </button>
        <span style={{ marginLeft: 12, fontSize: 12, color: C.muted }}>Applies globally across all branches and customers.</span>
      </div>
    </div>
  );
}


// ── Payroll tab ───────────────────────────────────────────────────────────────

function PayrollTab() {
  const [config, setConfig] = useState({
    ...OVERTIME_COMM_CONFIG,
    lateRatePerMin:  2_000,
    lateGracePeriod: 5,
    inexcusedRate:   150_000,
    excusedQuota:    2,
    excusedOverRate: 100_000,
  });
  const [saved,  setSaved]  = useState(false);

  function set(key, val) { setConfig(c => ({ ...c, [key]: val })); }

  function toggleExclusion(serviceId) {
    setConfig(c => ({
      ...c,
      excludedServiceIds: c.excludedServiceIds.includes(serviceId)
        ? c.excludedServiceIds.filter(id => id !== serviceId)
        : [...c.excludedServiceIds, serviceId],
    }));
  }

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  const servicesByCategory = SERVICE_CATALOGUE.filter(s => s.isActive).reduce((acc, s) => {
    if (!acc[s.cat]) acc[s.cat] = [];
    acc[s.cat].push(s);
    return acc;
  }, {});

  return (
    <div>
      {/* ── Attendance Deductions ── */}
      <SectionTitle title="Attendance Deductions"
        sub="Rates used to auto-calculate deductions from late arrivals and absences each payroll period." />

      <SettingRow label="Late Deduction Rate"
        sub="Deducted per minute late. Applied automatically from the late minutes count in Payroll.">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:C.muted }}>Rp</span>
          <input type="number" value={config.lateRatePerMin} min={0} step={500}
            onChange={e => set('lateRatePerMin', parseInt(e.target.value) || 0)}
            style={{ width:90, padding:'8px 10px', borderRadius:8, border:'1px solid '+C.border, fontSize:14, fontFamily:"'Inter', sans-serif", fontWeight:700, color:C.text, background:C.white, textAlign:'right' }} />
          <span style={{ fontSize:12, color:C.muted }}>/min</span>
        </div>
      </SettingRow>

      <SettingRow label="Late Arrival Grace Period"
        sub={`Arriving within this window is not penalised at all. Arriving even 1 minute beyond it charges the full late minutes — the grace period is not subtracted from the count. Example: grace = ${config.lateGracePeriod} min, shift at 09:00 → arrive 09:0${config.lateGracePeriod} = Rp 0 · arrive 09:0${config.lateGracePeriod + 1} = ${config.lateGracePeriod + 1} min × Rp ${config.lateRatePerMin.toLocaleString()} = Rp ${((config.lateGracePeriod + 1) * config.lateRatePerMin).toLocaleString()}.`}>
        <Stepper value={config.lateGracePeriod} onChange={v => set('lateGracePeriod', v)} min={0} max={30} unit="min grace" />
      </SettingRow>

      <SettingRow label="Inexcused Off Rate"
        sub="Fixed penalty per inexcused absence day. Applied in full — no free quota applies.">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:C.muted }}>Rp</span>
          <input type="number" value={config.inexcusedRate} min={0} step={50000}
            onChange={e => set('inexcusedRate', parseInt(e.target.value) || 0)}
            style={{ width:110, padding:'8px 10px', borderRadius:8, border:'1px solid '+C.border, fontSize:14, fontFamily:"'Inter', sans-serif", fontWeight:700, color:C.text, background:C.white, textAlign:'right' }} />
          <span style={{ fontSize:12, color:C.muted }}>/day</span>
        </div>
      </SettingRow>

      <SettingRow label="Monthly Excused Off Limit"
        sub="How many excused absences per period are free. Any excused offs above this number will be charged.">
        <Stepper value={config.excusedQuota} onChange={v => set('excusedQuota', v)} min={0} max={10} unit="days free" />
      </SettingRow>

      <SettingRow label="Charge Per Excused Off Above Limit"
        sub={`Each excused off day beyond the ${config.excusedQuota}-day limit is deducted at this rate (or pro-rata if split in Payroll).`}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:C.muted }}>Rp</span>
          <input type="number" value={config.excusedOverRate} min={0} step={25000}
            onChange={e => set('excusedOverRate', parseInt(e.target.value) || 0)}
            style={{ width:110, padding:'8px 10px', borderRadius:8, border:'1px solid '+C.border, fontSize:14, fontFamily:"'Inter', sans-serif", fontWeight:700, color:C.text, background:C.white, textAlign:'right' }} />
          <span style={{ fontSize:12, color:C.muted }}>/day</span>
        </div>
      </SettingRow>

      {/* ── Overtime Commission ── */}
      <div style={{ marginTop:32 }}>
      <SectionTitle title="Overtime Commission"
        sub="Services completed at or after the threshold time earn an additional commission bonus on top of each barber's standard rate." />

      <SettingRow label="Enable Overtime Commission"
        sub="When enabled, qualifying late-hour services earn the bonus percentage in addition to the standard commission.">
        <Toggle checked={config.enabled} onChange={v => set('enabled', v)} />
      </SettingRow>

      {config.enabled && (
        <>
          <SettingRow label="Threshold Time"
            sub="Services booked at or after this time qualify for the overtime bonus.">
            <input type="time" value={config.threshold} onChange={e => set('threshold', e.target.value)}
              style={{ padding:'8px 12px', borderRadius:8, border:'1px solid '+C.border, fontSize:14, fontFamily:"'Inter', sans-serif", fontWeight:700, color:C.text, background:C.white }} />
          </SettingRow>

          <SettingRow label="Bonus Percentage"
            sub="Extra commission % added on top of the barber's standard rate for qualifying services.">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Stepper value={config.bonusPct} onChange={v => set('bonusPct', v)} min={1} max={50} unit="%" />
              <span style={{ fontSize:12, color:C.muted }}>
                e.g. 35% + {config.bonusPct}% = {35 + config.bonusPct}% effective rate
              </span>
            </div>
          </SettingRow>

          {/* Service exclusions */}
          <div style={{ marginTop:28 }}>
            <SectionTitle title="Service Exclusions"
              sub="Checked services are excluded from the overtime bonus — only the standard commission rate applies." />
            {Object.entries(servicesByCategory).map(([cat, services]) => (
              <div key={cat} style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em',
                  color: SVC_CAT_META[cat]?.color ?? C.muted, marginBottom:6 }}>
                  {SVC_CAT_META[cat]?.label ?? cat}
                </div>
                {services.map(s => {
                  const isExcluded = config.excludedServiceIds.includes(s.id);
                  return (
                    <label key={s.id} onClick={() => toggleExclusion(s.id)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:8,
                        background: isExcluded ? '#FEF2F2' : C.bg, border:'1px solid '+(isExcluded ? '#FECACA' : C.border),
                        marginBottom:4, cursor:'pointer', transition:'all 0.12s' }}>
                      <input type="checkbox" checked={isExcluded} onChange={() => {}}
                        style={{ accentColor:'#DC2626', width:15, height:15, flexShrink:0, pointerEvents:'none' }} />
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{s.name}</span>
                        <span style={{ fontSize:11, color:C.muted, marginLeft:10 }}>
                          Rp {Math.round(s.basePrice / 1000)}k · {s.dur} min
                        </span>
                      </div>
                      {isExcluded && (
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4,
                          background:'#FEE2E2', color:'#DC2626' }}>No OT bonus</span>
                      )}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop:28, paddingTop:20, borderTop:'1px solid '+C.border }}>
        <button onClick={handleSave}
          style={{ padding:'11px 28px', borderRadius:9, background: saved ? '#16A34A' : C.topBg, color:C.white, fontFamily:"'DM Sans', sans-serif", fontWeight:700, fontSize:14, border:'none', cursor:'pointer', transition:'background 0.2s' }}>
          {saved ? '✓ Saved' : 'Save Payroll Settings'}
        </button>
      </div>
      </div>{/* end OT commission section */}
    </div>
  );
}

// ── WhatsApp tab ──────────────────────────────────────────────────────────────

const WA_TEMPLATE_DEFAULTS = {
  // Customer templates
  booking_confirmation:
    'Halo {name}! 👋\n\nReservasi Anda di Bercut {branch} telah dikonfirmasi.\n\n✂️ Barber: {barber}\n🕐 Waktu: {time}\n💇 Layanan: {services}\n\nNomor reservasi Anda: *{booking_number}*\n\nSilakan datang tepat waktu. Terima kasih!',
  receipt:
    'Terima kasih {name}! 🙏\n\nPembayaran di Bercut {branch} berhasil.\n\n📋 Reservasi: *{booking_number}*\n💇 Layanan: {services}\n💰 Total: {total}\n\nSampai jumpa di kunjungan berikutnya!',
  late_customer_reminder:
    'Halo {name}! 👋 Pengingat reservasi Bercut {branch}.\n\nKapster {barber} sudah siap menunggu Anda sejak pukul {time}.\n\nSudah {minutes_late} menit — silakan segera datang ya! 🙏\n\n📋 #{booking_number}',
  // Staff templates
  barber_new_booking:
    'Hei {barber_name}! Ada pelanggan baru untukmu 💈\n\n👤 *{customer_name}*\n🕐 Pukul *{time}*\n💇 {services}\n📋 #{booking_number}\n📍 Bercut {branch}\n\nSiapkan dirimu!',
  barber_escalation:
    'Hei {barber_name} ⚠️ Pelanggan *{customer_name}* sudah menunggu *{wait_minutes} menit*.\n\nSegera mulai layanan!\n\n📋 #{booking_number} · Bercut {branch}',
};

const WA_CUSTOMER_TEMPLATES = [
  { key: 'booking_confirmation',   label: 'Booking Confirmation',   icon: '✅', trigger: 'Auto — on booking confirmed (only if customer provided a phone number)',        vars: ['{name}','{branch}','{barber}','{time}','{services}','{booking_number}'] },
  { key: 'receipt',                label: 'Payment Receipt',        icon: '🧾', trigger: 'Auto — on payment confirmed',                                                    vars: ['{name}','{branch}','{services}','{total}','{booking_number}'] },
  { key: 'late_customer_reminder', label: 'Late Customer Reminder', icon: '⏰', trigger: 'Auto — sent once when customer hasn\'t arrived by scheduled time + threshold',   vars: ['{name}','{branch}','{barber}','{time}','{booking_number}','{minutes_late}'] },
];

const WA_STAFF_TEMPLATES = [
  { key: 'barber_new_booking', label: 'New Booking Notification', icon: '📬', trigger: 'Auto — sent to barber\'s WhatsApp on every new booking confirmed for them',                                          vars: ['{barber_name}','{customer_name}','{time}','{services}','{booking_number}','{branch}'] },
  { key: 'barber_escalation',  label: 'Escalation Reminder',      icon: '🚨', trigger: 'Auto — recurring every N min while barber hasn\'t started. Stops when barber taps Start or admin stops escalation', vars: ['{barber_name}','{customer_name}','{wait_minutes}','{booking_number}','{branch}'] },
];

function TemplateEditor({ group, templates, activeTpl, setActiveTpl, setTemplates }) {
  const tpl = group.find(t => t.key === activeTpl) || group[0];
  return (
    <div>
      {/* Template picker */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
        {group.map(t => (
          <button key={t.key} onClick={() => setActiveTpl(t.key)}
            style={{ padding:'7px 13px', borderRadius:8, border:'1.5px solid '+(activeTpl===t.key ? C.topBg : C.border),
              background: activeTpl===t.key ? C.topBg : C.white,
              color: activeTpl===t.key ? C.white : C.text,
              fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer',
              display:'flex', alignItems:'center', gap:5, transition:'all 0.12s' }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tpl && (
        <div style={{ background:C.white, border:'1px solid '+C.border, borderRadius:12, padding:'16px 18px' }}>
          {/* Trigger label */}
          <div style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:4,
            background:'#EFF6FF', color:'#2563EB', display:'inline-block', marginBottom:10 }}>
            {tpl.trigger}
          </div>

          {/* Variable chips */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10, alignItems:'center' }}>
            <span style={{ fontSize:11, color:C.muted, marginRight:2 }}>Variables:</span>
            {tpl.vars.map(v => (
              <span key={v} style={{ fontSize:11, fontFamily:'monospace', padding:'2px 8px', borderRadius:4,
                background:C.surface, border:'1px solid '+C.border, color:C.text2 }}>{v}</span>
            ))}
          </div>

          <textarea value={templates[tpl.key]}
            onChange={e => setTemplates(ts => ({ ...ts, [tpl.key]: e.target.value }))}
            rows={6}
            style={{ width:'100%', padding:'11px 13px', borderRadius:8, border:'1.5px solid '+C.border,
              fontSize:13, color:C.text, lineHeight:1.7, resize:'vertical', boxSizing:'border-box',
              fontFamily:"'DM Sans',sans-serif" }} />

          <div style={{ marginTop:8, padding:'9px 11px', borderRadius:7, background:C.bg, border:'1px solid '+C.border, opacity:0.75 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>WhatsApp Business API (future): </span>
            <span style={{ fontSize:11, color:C.muted }}>Each template will also need a pre-approved Meta template name — body copy stays the same.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsAppTab() {
  const [enabled,    setEnabled]    = useState(false);
  const [provider,   setProvider]   = useState('fonnte');
  const [apiKey,     setApiKey]     = useState('');
  const [showKey,    setShowKey]    = useState(false);
  const [sender,     setSender]     = useState('');
  const [templates,  setTemplates]  = useState({ ...WA_TEMPLATE_DEFAULTS });
  const [activeCust, setActiveCust] = useState('booking_confirmation');
  const [activeStaff,setActiveStaff]= useState('barber_new_booking');
  const [testPhone,  setTestPhone]  = useState('');
  const [testState,  setTestState]  = useState('idle');
  const [saved,      setSaved]      = useState(false);

  function handleTestSend() {
    if (!testPhone.trim()) return;
    setTestState('sending');
    setTimeout(() => { setTestState('ok'); setTimeout(() => setTestState('idle'), 4000); }, 1600);
  }
  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  return (
    <div>

      {/* ── Master toggle ── */}
      <div onClick={() => setEnabled(v => !v)}
        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderRadius:12,
          background: enabled ? '#f0fdf4' : C.bg, border:`1.5px solid ${enabled ? '#bbf7d0' : C.border}`,
          marginBottom:28, cursor:'pointer', transition:'all 0.2s' }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:15, color:C.text }}>WhatsApp Notifications</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:3, lineHeight:1.5 }}>
            Automatic messages to customers and staff. Covers booking confirmation, receipt, late reminders, and barber escalation.
          </div>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      {/* ── Message flow overview ── */}
      <div style={{ marginBottom:28, padding:'16px 18px', borderRadius:12, background:C.bg, border:'1px solid '+C.border }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:13, color:C.text, marginBottom:10 }}>Message Flow</div>
        {[
          { dot:'#2563EB', event:'Customer books',              msg:'→ Customer gets Booking Confirmation (if phone provided) · Barber gets New Booking Notification' },
          { dot:'#D97706', event:'Slot time passes + threshold',msg:'→ Customer gets Late Reminder (once) · Barber gets Escalation (repeating every N min)' },
          { dot:'#7C3AED', event:'Barber taps Start',           msg:'→ Escalation stops automatically' },
          { dot:'#DC2626', event:'Admin stops escalation',      msg:'→ Escalation cancelled · Barber gets no more messages' },
          { dot:'#16A34A', event:'Payment confirmed',           msg:'→ Customer gets Payment Receipt' },
        ].map((row, i) => (
          <div key={i} style={{ display:'flex', gap:10, padding:'6px 0', borderBottom: i < 4 ? '1px solid '+C.border : 'none', alignItems:'flex-start' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:row.dot, marginTop:5, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{row.event}</span>
              <span style={{ fontSize:12, color:C.muted }}> {row.msg}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Provider selector ── */}
      <div style={{ marginBottom:28 }}>
        <SectionTitle title="Provider"
          sub="Fonnte is the active provider. When migrating to the official WhatsApp Business API, change this setting — all templates and send logic stay the same." />
        <div style={{ display:'flex', gap:12 }}>
          <div onClick={() => setProvider('fonnte')}
            style={{ flex:1, padding:'16px 18px', borderRadius:12, cursor:'pointer', transition:'all 0.15s',
              border:`2px solid ${provider==='fonnte' ? C.topBg : C.border}`,
              background: provider==='fonnte' ? C.bg : C.white }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:14, color:C.text }}>Fonnte</div>
              {provider==='fonnte' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:C.topBg, color:C.white }}>ACTIVE</span>}
            </div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>WhatsApp gateway. No Meta template approval needed. Works immediately. High delivery in Indonesia.</div>
          </div>
          <div style={{ flex:1, padding:'16px 18px', borderRadius:12, border:`2px solid ${C.border}`, background:'#fafafa', opacity:0.55, cursor:'not-allowed' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:14, color:C.text }}>WhatsApp Business API</div>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:C.surface2, color:C.muted }}>COMING SOON</span>
            </div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>Official Meta API. Higher volume limits, no third-party dependency. Requires pre-approved templates.</div>
          </div>
        </div>
      </div>

      {/* ── Fonnte credentials ── */}
      <div style={{ marginBottom:28 }}>
        <SectionTitle title="Fonnte Credentials" sub="API key from fonnte.com. Keep it secret — it authorises all sends from your WhatsApp number." />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, maxWidth:640 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:C.muted, marginBottom:5 }}>API Key</label>
            <div style={{ display:'flex', gap:6 }}>
              <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="Paste Fonnte API key"
                style={{ flex:1, padding:'9px 12px', borderRadius:8, border:'1px solid '+C.border, fontSize:13, color:C.text, fontFamily:'monospace', minWidth:0 }} />
              <button onClick={() => setShowKey(v => !v)}
                style={{ padding:'9px 12px', borderRadius:8, border:'1px solid '+C.border, background:C.white, color:C.text2, fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:600, flexShrink:0 }}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:C.muted, marginBottom:5 }}>Sender Number</label>
            <input type="tel" value={sender} onChange={e => setSender(e.target.value)} placeholder="+62812345678"
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid '+C.border, fontSize:13, color:C.text, boxSizing:'border-box' }} />
            <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>The WhatsApp number registered in Fonnte</div>
          </div>
        </div>
      </div>

      {/* ── WA Business API credentials (greyed) ── */}
      <div style={{ marginBottom:28, opacity:0.45, pointerEvents:'none' }}>
        <SectionTitle title="WhatsApp Business API Credentials" sub="These fields activate when switching from Fonnte to the official Meta API." />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, maxWidth:640 }}>
          {[{label:'Phone Number ID',placeholder:'From Meta Developer Console'},{label:'Access Token',placeholder:'Permanent system user token'}].map(f => (
            <div key={f.label}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:C.muted, marginBottom:5 }}>{f.label}</label>
              <input type="text" placeholder={f.placeholder} disabled style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid '+C.border, fontSize:13, color:C.text, boxSizing:'border-box', background:C.surface }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Customer message templates ── */}
      <div style={{ marginBottom:28 }}>
        <SectionTitle title="Customer Message Templates"
          sub="Sent to customers. Use {variables} for dynamic content. Works for both Fonnte and WhatsApp Business API." />
        <TemplateEditor group={WA_CUSTOMER_TEMPLATES} templates={templates} activeTpl={activeCust} setActiveTpl={setActiveCust} setTemplates={setTemplates} />
      </div>

      {/* ── Staff message templates ── */}
      <div style={{ marginBottom:28 }}>
        <SectionTitle title="Staff Message Templates"
          sub="Sent to barbers on their registered WhatsApp number. Bahasa Indonesia — barbers don't see English." />
        <TemplateEditor group={WA_STAFF_TEMPLATES} templates={templates} activeTpl={activeStaff} setActiveTpl={setActiveStaff} setTemplates={setTemplates} />
      </div>

      {/* ── Escalation settings note ── */}
      <div style={{ marginBottom:28, padding:'14px 16px', borderRadius:10, background:'#FFFBEB', border:'1px solid #FDE68A', display:'flex', alignItems:'flex-start', gap:12 }}>
        <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>⏱</span>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:13, color:'#92400E', marginBottom:3 }}>Escalation Timing</div>
          <div style={{ fontSize:12, color:'#78350F', lineHeight:1.65 }}>
            Thresholds for late-customer reminders and barber escalation intervals are configured per branch in{' '}
            <strong>Branches → Edit → Operations tab</strong>:{' '}
            late customer threshold, escalation interval (every N min), and max escalation count before admin alert.
          </div>
        </div>
      </div>

      {/* ── Test send ── */}
      <div style={{ marginBottom:28 }}>
        <SectionTitle title="Test Send" sub="Sends a sample booking_confirmation message to verify your credentials are working." />
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', maxWidth:480 }}>
          <div style={{ flex:1 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:C.muted, marginBottom:5 }}>Send test to</label>
            <input type="tel" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+62812345678"
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid '+C.border, fontSize:13, color:C.text, boxSizing:'border-box' }} />
          </div>
          <button onClick={handleTestSend} disabled={!testPhone.trim() || testState==='sending'}
            style={{ padding:'9px 20px', borderRadius:8, border:'none', whiteSpace:'nowrap', transition:'background 0.2s',
              cursor: testPhone.trim() && testState!=='sending' ? 'pointer' : 'not-allowed',
              background: testState==='sending' ? C.surface2 : C.topBg,
              color: testState==='sending' ? C.muted : C.white,
              fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:13 }}>
            {testState==='sending' ? 'Sending…' : 'Send Test'}
          </button>
        </div>
        {testState==='ok'    && <div style={{ marginTop:10, padding:'10px 14px', borderRadius:8, background:'#f0fdf4', border:'1px solid #bbf7d0', fontSize:12, color:'#16a34a', fontWeight:600 }}>✓ Sent — check your WhatsApp</div>}
        {testState==='error' && <div style={{ marginTop:10, padding:'10px 14px', borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca', fontSize:12, color:'#dc2626', fontWeight:600 }}>✕ Failed — check API key and sender number</div>}
      </div>

      {/* ── Save ── */}
      <div style={{ paddingTop:20, borderTop:'1px solid '+C.border }}>
        <button onClick={handleSave}
          style={{ padding:'11px 28px', borderRadius:9, border:'none', cursor:'pointer', transition:'background 0.2s',
            background: saved ? '#16A34A' : C.topBg, color:C.white, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:14 }}>
          {saved ? '✓ Saved' : 'Save WhatsApp Settings'}
        </button>
        <span style={{ marginLeft:12, fontSize:12, color:C.muted }}>Takes effect immediately for the next outgoing message.</span>
      </div>
    </div>
  );
}


// ── Users tab (owner-only) ────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'reports',        label: 'Reports'        },
  { key: 'barbers',        label: 'Barbers'        },
  { key: 'services',       label: 'Services'       },
  { key: 'customers',      label: 'Customers'      },
  { key: 'expenses',       label: 'Expenses'       },
  { key: 'inventory',      label: 'Inventory'      },
  { key: 'payroll',        label: 'Payroll'        },
  { key: 'online_booking', label: 'Online Booking' },
  { key: 'kiosk_config',   label: 'Kiosk Config'   },
  { key: 'branches',       label: 'Branches'       },
  { key: 'settings',       label: 'Settings'       },
];

const MOCK_USERS = [
  { id: 1, name: 'Kadek Wirawan',    email: 'kadek@bercut.id',    role: 'owner',       isActive: true,  lastLogin: '2026-04-10 09:14', permissions: Object.fromEntries(SECTIONS.map(s => [s.key, true]))  },
  { id: 2, name: 'Dewi Santika',     email: 'dewi@bercut.id',     role: 'manager',     isActive: true,  lastLogin: '2026-04-10 08:45', permissions: Object.fromEntries(SECTIONS.map(s => [s.key, true]))  },
  { id: 3, name: 'Made Sukadana',    email: 'made@bercut.id',     role: 'accountant',  isActive: true,  lastLogin: '2026-04-09 17:22', permissions: { ...Object.fromEntries(SECTIONS.map(s => [s.key, true])), kiosk_config: false, branches: false } },
  { id: 4, name: 'Nyoman Arta',      email: 'nyoman@bercut.id',   role: 'manager',     isActive: false, lastLogin: '2026-03-28 11:05', permissions: Object.fromEntries(SECTIONS.map(s => [s.key, true]))  },
];

const ROLE_META = {
  owner:      { label: 'Owner',      color: '#111110', bg: '#F5E200' },
  manager:    { label: 'Manager',    color: '#2563EB', bg: '#EFF6FF' },
  accountant: { label: 'Accountant', color: '#16A34A', bg: '#F0FDF4' },
};

function UsersTab() {
  const [users,       setUsers]       = useState(MOCK_USERS);
  const [selectedId,  setSelectedId]  = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [newForm,     setNewForm]     = useState({ name: '', email: '', role: 'manager', password: '' });
  const [permSaved,   setPermSaved]   = useState(false);

  const selectedUser = users.find(u => u.id === selectedId);

  function togglePerm(userId, section) {
    setUsers(us => us.map(u => u.id === userId
      ? { ...u, permissions: { ...u.permissions, [section]: !u.permissions[section] } }
      : u
    ));
  }

  function toggleActive(userId) {
    setUsers(us => us.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
  }

  function handleAdd() {
    if (!newForm.name.trim() || !newForm.email.trim()) return;
    setUsers(us => [...us, {
      id: Date.now(),
      ...newForm,
      isActive: true,
      lastLogin: '—',
      permissions: Object.fromEntries(SECTIONS.map(s => [s.key, true])),
    }]);
    setNewForm({ name: '', email: '', role: 'manager', password: '' });
    setShowAdd(false);
  }

  function handlePermSave() {
    setPermSaved(true);
    setTimeout(() => setPermSaved(false), 1800);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 320px' : '1fr', gap: 20, alignItems: 'start' }}>

      {/* User list */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Admin Accounts</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Owner accounts always have full access regardless of permissions.</div>
          </div>
          <button onClick={() => { setShowAdd(v => !v); setSelectedId(null); }}
            style={{ padding: '7px 14px', borderRadius: 8, background: showAdd ? C.surface2 : C.topBg, color: showAdd ? C.text : C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
            {showAdd ? '✕ Cancel' : '+ New User'}
          </button>
        </div>

        {/* Add user form */}
        {showAdd && (
          <div style={{ padding: '16px 18px', borderRadius: 10, background: C.bg, border: '1px solid ' + C.border, marginBottom: 16 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 12 }}>New Admin User</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {[
                { label: 'Full Name', key: 'name',     type: 'text',     placeholder: 'e.g. Wayan Sari'         },
                { label: 'Email',     key: 'email',    type: 'email',    placeholder: 'e.g. wayan@bercut.id'    },
                { label: 'Password',  key: 'password', type: 'password', placeholder: 'Temporary password'      },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type} value={newForm[f.key]} onChange={e => setNewForm(form => ({ ...form, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '8px 11px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 13, color: C.text, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 4 }}>Role</label>
                <select value={newForm.role} onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))}
                  style={{ width: '100%', padding: '8px 11px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 13, color: C.text }}>
                  <option value="manager">Manager</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              New users get full access to all sections by default. Configure permissions after creation.
            </div>
            <button onClick={handleAdd}
              style={{ padding: '8px 20px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              Create User
            </button>
          </div>
        )}

        {/* User table */}
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name','Role','Last Login','Status',''].map((h,i) => (
                  <th key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, padding: '8px 14px', borderBottom: '1px solid ' + C.surface, textAlign: i >= 3 ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const rm = ROLE_META[user.role];
                const isOwner = user.role === 'owner';
                const isSelected = selectedId === user.id;
                return (
                  <tr key={user.id}
                    style={{ opacity: user.isActive ? 1 : 0.5, background: isSelected ? C.bg : 'transparent', transition: 'background 0.1s, opacity 0.15s', cursor: isOwner ? 'default' : 'pointer' }}
                    onClick={() => !isOwner && setSelectedId(isSelected ? null : user.id)}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.bg; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                    <td style={{ fontSize: 13, padding: '12px 14px', color: C.text, borderBottom: '1px solid ' + C.surface, verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600 }}>{user.name}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{user.email}</div>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid ' + C.surface, verticalAlign: 'middle' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: rm.bg, color: rm.color }}>{rm.label}</span>
                      {isOwner && <span style={{ marginLeft: 6, fontSize: 10, color: C.muted }}>Immutable</span>}
                    </td>
                    <td style={{ fontSize: 12, padding: '12px 14px', color: C.text2, borderBottom: '1px solid ' + C.surface, verticalAlign: 'middle' }}>{user.lastLogin}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid ' + C.surface, verticalAlign: 'middle', textAlign: 'center' }}>
                      {isOwner
                        ? <span style={{ fontSize: 11, color: C.muted }}>—</span>
                        : <Toggle checked={user.isActive} onChange={() => toggleActive(user.id)} />
                      }
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid ' + C.surface, verticalAlign: 'middle', textAlign: 'right' }}>
                      {!isOwner && (
                        <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? C.topBg : C.muted }}>
                          {isSelected ? 'Editing ▸' : 'Permissions'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions panel */}
      {selectedUser && (
        <div className="admin-card" style={{ padding: '18px 20px', position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: C.text }}>{selectedUser.name}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Section permissions</div>
            </div>
            <button onClick={() => setSelectedId(null)}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid ' + C.border, background: 'transparent', color: C.text2, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, padding: '8px 10px', borderRadius: 6, background: C.bg, lineHeight: 1.5 }}>
            Overview is always visible. All other sections can be toggled off individually.
          </div>

          {/* Always-on overview row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid ' + C.surface }}>
            <span style={{ fontSize: 13, color: C.text2 }}>Overview</span>
            <span style={{ fontSize: 11, color: C.muted }}>Always on</span>
          </div>

          {SECTIONS.map(s => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid ' + C.surface }}>
              <span style={{ fontSize: 13, color: selectedUser.permissions[s.key] ? C.text : C.muted }}>{s.label}</span>
              <Toggle checked={selectedUser.permissions[s.key]} onChange={() => togglePerm(selectedUser.id, s.key)} />
            </div>
          ))}

          <button onClick={handlePermSave}
            style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 8, background: permSaved ? '#16A34A' : C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
            {permSaved ? '✓ Saved' : 'Save Permissions'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Audit Log tab (owner-only) ────────────────────────────────────────────────

const MOCK_AUDIT = [
  { id:1,  user:'Dewi Santika',  action:'barber.updated',         entity:'Barber: Rizky Fauzan',     detail:'commission_rate: 35% → 40%',                                  branch:'Seminyak', at:'2026-04-10 09:02' },
  { id:2,  user:'Made Sukadana', action:'expense.created',        entity:'Expense: Rp 450.000',       detail:'category: Supplies · Laundry April',                           branch:'Canggu',   at:'2026-04-10 08:45' },
  { id:3,  user:'Dewi Santika',  action:'service.updated',        entity:'Service: Fade & Style',     detail:'base_price: Rp 80.000 → Rp 90.000',                            branch:null,       at:'2026-04-09 17:30' },
  { id:4,  user:'Kadek Wirawan', action:'user.created',           entity:'User: Nyoman Arta',         detail:'role: manager · full access granted',                          branch:null,       at:'2026-04-09 15:10' },
  { id:5,  user:'Dewi Santika',  action:'payroll.status_changed', entity:'Payroll: March 2026 · Seminyak', detail:'status: reviewed → communicated',                       branch:'Seminyak', at:'2026-04-09 14:00' },
  { id:6,  user:'Made Sukadana', action:'inventory.stock_in',     entity:'Item: Wax Strip (box)',     detail:'qty: +50 · branch: Ubud',                                      branch:'Ubud',     at:'2026-04-09 11:22' },
  { id:7,  user:'Kadek Wirawan', action:'user.permissions_updated', entity:'User: Made Sukadana',    detail:'kiosk_config: true → false · branches: true → false',          branch:null,       at:'2026-04-08 16:45' },
  { id:8,  user:'Dewi Santika',  action:'barber.deactivated',     entity:'Barber: Putu Arya',         detail:'is_active: true → false',                                      branch:'Canggu',   at:'2026-04-08 14:30' },
  { id:9,  user:'Dewi Santika',  action:'branch.settings_updated', entity:'Branch: Bercut Ubud',     detail:'lateThresh: 10 → 15 min · speakerOn: true',                    branch:'Ubud',     at:'2026-04-07 10:15' },
  { id:10, user:'Made Sukadana', action:'payroll.adjustment_added', entity:'Payroll: March 2026',    detail:'type: kasbon · barber: Rizky · Rp 500.000 · deduct: this month', branch:'Seminyak', at:'2026-04-07 09:00' },
];

const ACTION_META = {
  'barber.updated':            { color: '#2563EB', bg: '#EFF6FF', label: 'Updated'   },
  'barber.deactivated':        { color: '#D97706', bg: '#FFFBEB', label: 'Deactivated'},
  'expense.created':           { color: '#16A34A', bg: '#F0FDF4', label: 'Created'   },
  'service.updated':           { color: '#2563EB', bg: '#EFF6FF', label: 'Updated'   },
  'user.created':              { color: '#16A34A', bg: '#F0FDF4', label: 'Created'   },
  'user.permissions_updated':  { color: '#7C3AED', bg: '#F5F3FF', label: 'Permissions'},
  'payroll.status_changed':    { color: '#2563EB', bg: '#EFF6FF', label: 'Status'    },
  'payroll.adjustment_added':  { color: '#16A34A', bg: '#F0FDF4', label: 'Adjustment'},
  'inventory.stock_in':        { color: '#16A34A', bg: '#F0FDF4', label: 'Stock In'  },
  'branch.settings_updated':   { color: '#2563EB', bg: '#EFF6FF', label: 'Settings'  },
};

function AuditLogTab() {
  const [filterUser,   setFilterUser]   = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const uniqueUsers   = [...new Set(MOCK_AUDIT.map(e => e.user))];
  const uniqueActions = [...new Set(MOCK_AUDIT.map(e => e.action.split('.')[0]))];

  const filtered = MOCK_AUDIT.filter(e =>
    (filterUser   === 'all' || e.user === filterUser) &&
    (filterAction === 'all' || e.action.startsWith(filterAction))
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Activity History</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>All admin actions across all branches. Most recent first.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 12, color: C.text }}>
            <option value="all">All users</option>
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid ' + C.border, fontSize: 12, color: C.text }}>
            <option value="all">All actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Timestamp','User','Action','Entity','Change','Branch'].map((h,i) => (
                <th key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, padding: '8px 14px', borderBottom: '1px solid ' + C.surface, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, i) => {
              const am = ACTION_META[entry.action] || { color: C.text2, bg: C.surface, label: entry.action };
              return (
                <tr key={entry.id}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ transition: 'background 0.1s' }}>
                  <td style={{ fontSize: 11, padding: '11px 14px', color: C.muted, borderBottom: '1px solid ' + C.surface, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{entry.at}</td>
                  <td style={{ fontSize: 12, padding: '11px 14px', color: C.text, borderBottom: '1px solid ' + C.surface, fontWeight: 500, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{entry.user}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '1px solid ' + C.surface, verticalAlign: 'top' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: am.bg, color: am.color, whiteSpace: 'nowrap' }}>{am.label}</span>
                  </td>
                  <td style={{ fontSize: 12, padding: '11px 14px', color: C.text, borderBottom: '1px solid ' + C.surface, fontWeight: 500, verticalAlign: 'top' }}>{entry.entity}</td>
                  <td style={{ fontSize: 11, padding: '11px 14px', color: C.text2, borderBottom: '1px solid ' + C.surface, maxWidth: 260, lineHeight: 1.5, verticalAlign: 'top' }}>{entry.detail}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '1px solid ' + C.surface, verticalAlign: 'top' }}>
                    {entry.branch
                      ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: C.surface, color: C.text2 }}>{entry.branch}</span>
                      : <span style={{ fontSize: 11, color: C.muted }}>Global</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: C.muted, fontSize: 13 }}>No entries match the selected filters.</div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
        Showing {filtered.length} of {MOCK_AUDIT.length} entries. Production: paginated with 50 per page.
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Mock current user role — in production this comes from auth context
const CURRENT_USER_ROLE = 'owner';

export default function Settings() {
  const [tab, setTab] = useState('catalog');

  const isOwner = CURRENT_USER_ROLE === 'owner';

  const TABS = [
    { key: 'catalog',    label: 'Catalog',    ownerOnly: false },
    { key: 'loyalty',    label: 'Loyalty',    ownerOnly: false },
    { key: 'payroll',    label: 'Payroll',    ownerOnly: false },
    { key: 'whatsapp',   label: 'WhatsApp',   ownerOnly: false },
    { key: 'users',      label: 'Users',      ownerOnly: true  },
    { key: 'audit-log',  label: 'Audit Log',  ownerOnly: true  },
  ].filter(t => !t.ownerOnly || isOwner);

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Settings</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          Global system configuration. Per-branch operational settings are in <strong style={{ color: C.text }}>Branches → Edit → Operations</strong>.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid ' + C.border, marginBottom: 28, gap: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid ' + C.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: tab === t.key ? C.text : C.muted, cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.label}
            {t.ownerOnly && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#F5E200', color: '#111110', letterSpacing: '0.05em' }}>OWNER</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'catalog' && (
        <div>
          <SectionTitle title="Reference Data Catalog" sub="Rename or deactivate existing categories and items. New ones are created at the point of use (Expenses / Inventory)." />
          <CatalogTab />
        </div>
      )}

      {tab === 'loyalty' && <LoyaltyTab />}

      {tab === 'payroll' && <PayrollTab />}

      {tab === 'whatsapp' && <WhatsAppTab />}

      {tab === 'users' && (
        <div>
          <UsersTab />
        </div>
      )}

      {tab === 'audit-log' && (
        <div>
          <AuditLogTab />
        </div>
      )}
    </div>
  );
}
