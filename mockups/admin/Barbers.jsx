/**
 * MOCKUP — Bercut Admin: Barber Management
 *
 * What it does: View, add, edit, and deactivate barbers across all branches.
 *   Barbers tab: list with inline service capability expansion (click a row).
 *   Attendance Log tab: raw clock-in/out records (monthly overview in Attendance & Payroll).
 * State managed: branchFilter, showModal, editBarber, expandedBarber,
 *   barberServices, flagged
 * Production API:
 *   GET    /api/barbers?branch_id=
 *   POST   /api/barbers
 *   PATCH  /api/barbers/:id
 *   GET    /api/barbers/:id/services
 *   PUT    /api/barbers/:id/services
 *   GET    /api/attendance?barber_id=&from=&to=
 * Feeds into: Kiosk (service capability filter), Attendance & Payroll (barber list)
 *
 * VISUAL PROTOTYPE — no backend calls.
 * Antigravity: build production version at
 * frontend/src/apps/admin/screens/Barbers.jsx
 * Reference prompt: _ai/prompting-guide.md Section 07
 */

import { useState } from 'react';
import { ALL_BARBERS, ATTENDANCE_LOG, BRANCHES, CHAIRS, BARBER_SERVICES, SERVICE_CATALOGUE, SVC_CAT_META, C } from './data.js';

const PAY_TYPE_META = {
  salary_plus_commission: { label: 'Salary + Comm', color: '#2563EB', bg: '#EFF6FF' },
  commission_only:        { label: 'Commission',    color: '#7C3AED', bg: '#EDE9FE' },
  daily_rate:             { label: 'Freelance',     color: '#D97706', bg: '#FFFBEB' },
};

// barberId → chair label at their home branch
const CHAIR_MAP = {};
CHAIRS.forEach(c => { if (c.assignedBarberId) CHAIR_MAP[c.assignedBarberId] = c.label; });

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ initials, size = 36, inactive }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: inactive ? C.surface2 : C.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: size * 0.36, color: inactive ? C.muted : C.white, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── Edit / Add modal ──────────────────────────────────────────────────────────
function BarberModal({ barber, onClose }) {
  const isNew = !barber;
  const [form, setForm] = useState(barber ? { ...barber } : {
    name: '', specialty: '', phone: '', branch: 'Seminyak',
    baseSalary: 2500000, dailyRate: 350000, payType: 'salary_plus_commission', isActive: true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isFreelance = form.payType === 'daily_rate';

  const fldStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, boxSizing: 'border-box' };
  const lblStyle = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 520, padding: '24px 28px', animation: 'scaleIn 0.2s ease both', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: C.text }}>{isNew ? 'Add Barber' : 'Edit Barber'}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
          {[
            { label: 'Full Name',       key: 'name',      full: true  },
            { label: 'Specialty (EN)',  key: 'specialty', full: false },
            { label: 'WhatsApp Number', key: 'phone',     full: false },
          ].map(({ label, key, full }) => (
            <div key={key} style={{ gridColumn: full ? '1 / -1' : undefined }}>
              <label style={lblStyle}>{label}</label>
              <input value={form[key] || ''} onChange={e => set(key, e.target.value)} style={fldStyle} />
            </div>
          ))}

          {/* Pay Type — pick this first as it controls other fields */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lblStyle}>Pay Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'salary_plus_commission', label: 'Salary + Commission' },
                { key: 'commission_only',         label: 'Commission Only'     },
                { key: 'daily_rate',              label: 'Freelance (Daily Rate)' },
              ].map(opt => (
                <button key={opt.key} onClick={() => set('payType', opt.key)}
                  style={{ flex: 1, padding: '9px 8px', borderRadius: 8, border: '1.5px solid ' + (form.payType === opt.key ? C.topBg : C.border), background: form.payType === opt.key ? C.topBg : 'transparent', color: form.payType === opt.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {isFreelance && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
                Freelance barbers have no home branch and earn no commission. They are paid a fixed daily rate for each day they work.
              </div>
            )}
          </div>

          {/* Home Branch — hidden for freelancers */}
          {!isFreelance ? (
            <div>
              <label style={lblStyle}>Home Branch</label>
              <select value={form.branch || ''} onChange={e => set('branch', e.target.value)}
                style={{ ...fldStyle, padding: '9px 11px' }}>
                {BRANCHES.map(b => <option key={b.id}>{b.city}</option>)}
              </select>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Chair assignment is managed in Branches.</div>
            </div>
          ) : (
            <div>
              <label style={lblStyle}>Home Branch</label>
              <div style={{ padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.surface2, background: C.surface, fontSize: 13, color: C.muted, fontStyle: 'italic' }}>
                None — Freelance
              </div>
            </div>
          )}

          {/* Pay details — context-dependent */}
          {form.payType === 'salary_plus_commission' && (
            <div>
              <label style={lblStyle}>Base Salary (IDR / month)</label>
              <input type="number" value={form.baseSalary} onChange={e => set('baseSalary', parseInt(e.target.value) || 0)}
                style={fldStyle} />
            </div>
          )}
          {form.payType === 'commission_only' && (
            <div>
              <label style={lblStyle}>Base Salary</label>
              <div style={{ padding: '9px 11px', borderRadius: 8, border: '1.5px solid ' + C.surface2, background: C.surface, fontSize: 13, color: C.muted, fontStyle: 'italic' }}>
                None — Commission only
              </div>
            </div>
          )}
          {isFreelance && (
            <div>
              <label style={lblStyle}>Daily Rate (IDR / day)</label>
              <input type="number" value={form.dailyRate || 350000} onChange={e => set('dailyRate', parseInt(e.target.value) || 0)}
                style={fldStyle} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Paid per day present. No deductions.</div>
            </div>
          )}
        </div>

        {!isNew && (
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: form.isActive ? C.bg : '#FEF2F2', borderRadius: 8, border: '1px solid ' + (form.isActive ? C.border : '#FECACA') }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: form.isActive ? C.text : '#DC2626' }}>{form.isActive ? 'Active' : 'Deactivated'}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Deactivated barbers are hidden from the kiosk but history is preserved.</div>
            </div>
            <button onClick={() => set('isActive', !form.isActive)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid ' + (form.isActive ? C.danger : '#16A34A'), background: 'transparent', color: form.isActive ? C.danger : '#16A34A', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {form.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 9, background: C.surface, color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { alert('Saved (demo)'); onClose(); }}
            style={{ flex: 2, padding: '11px', borderRadius: 9, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            {isNew ? 'Add Barber' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Default commission rate used when no per-service override is set
const DEFAULT_COMM_RATE = 35;

// ── Inline service capability panel ──────────────────────────────────────────
function ServicePanel({ barber, barberSvcs, onToggle, barberSvcRates, onRateChange }) {
  const svcCategories = ['haircut', 'beard', 'treatment', 'hair_color', 'package'];
  // Local state for whichever rate badge is currently being edited
  const [editingRate, setEditingRate] = useState(null); // { serviceId, draft }

  function startEditRate(e, serviceId, currentRate) {
    e.stopPropagation();
    setEditingRate({ serviceId, draft: String(currentRate ?? DEFAULT_COMM_RATE) });
  }

  function commitRate(serviceId) {
    if (!editingRate) return;
    const val = parseInt(editingRate.draft, 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      onRateChange(barber.id, serviceId, val === DEFAULT_COMM_RATE ? null : val);
    }
    setEditingRate(null);
  }

  return (
    <div style={{ background: C.bg, borderBottom: '1px solid ' + C.border, padding: '14px 20px 16px 72px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 12 }}>
        Service Capability — <span style={{ color: C.text }}>{barber.name}</span>
        <span style={{ fontWeight: 400, marginLeft: 8, color: C.muted }}>Toggle capability · click % to set commission rate per service.</span>
      </div>


      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ padding: '1px 5px', borderRadius: 3, background: C.surface2, color: C.muted, fontWeight: 700, fontSize: 9 }}>35%</span>
          Default rate
        </span>
        <span style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ padding: '1px 5px', borderRadius: 3, background: '#FEF9C3', color: '#854D0E', fontWeight: 700, fontSize: 9 }}>40%</span>
          Custom rate — click % badge to edit
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {svcCategories.map(cat => {
          const meta     = SVC_CAT_META[cat];
          const services = SERVICE_CATALOGUE.filter(s => s.cat === cat && s.isActive);
          if (!services.length) return null;
          return (
            <div key={cat}>
              <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: meta.bg, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'inline-block', marginBottom: 6 }}>{meta.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {services.map(s => {
                  const branchLocked  = s.branchConfig[barber.branchId]?.available === false;
                  const enabled       = barberSvcs[barber.id]?.[s.id] ?? true;
                  const rateOverride  = barberSvcRates[barber.id]?.[s.id] ?? null; // null = default
                  const displayRate   = rateOverride ?? DEFAULT_COMM_RATE;
                  const isCustomRate  = rateOverride !== null;
                  const isEditingThis = editingRate?.serviceId === s.id;

                  if (branchLocked) {
                    return (
                      <div key={s.id} title={`Disabled at ${barber.branch} branch level — enable in Services first`}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1.5px solid ' + C.surface2, background: C.surface2, color: C.border, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, cursor: 'not-allowed', opacity: 0.7 }}>
                        <span style={{ fontSize: 9 }}>🔒</span>
                        {s.name}
                      </div>
                    );
                  }

                  // Split pill: [toggle half] [rate half]
                  const pillBorder  = '1.5px solid ' + (enabled ? C.topBg : C.border);
                  const pillBg      = enabled ? C.topBg : C.white;
                  const pillColor   = enabled ? C.white : C.muted;
                  const dividerColor= enabled ? 'rgba(255,255,255,0.2)' : C.border;

                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'stretch', borderRadius: 6, border: pillBorder, overflow: 'hidden', transition: 'all 0.15s' }}>
                      {/* Toggle half */}
                      <button
                        onClick={() => onToggle(barber.id, s.id)}
                        title={enabled ? 'Click to disable for this barber' : 'Click to enable for this barber'}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', background: pillBg, color: pillColor, border: 'none', borderRight: '1px solid ' + dividerColor, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {enabled
                          ? <span style={{ fontSize: 9 }}>✓</span>
                          : <span style={{ fontSize: 9, opacity: 0.4 }}>✕</span>
                        }
                        {s.name}
                      </button>

                      {/* Rate half */}
                      {isEditingThis ? (
                        <div style={{ display: 'flex', alignItems: 'center', background: C.white, padding: '0 6px', gap: 1 }}>
                          <input
                            autoFocus
                            type="number" min="0" max="100"
                            value={editingRate.draft}
                            onChange={e => setEditingRate(r => ({ ...r, draft: e.target.value }))}
                            onBlur={() => commitRate(s.id)}
                            onKeyDown={e => { if (e.key === 'Enter') commitRate(s.id); if (e.key === 'Escape') setEditingRate(null); }}
                            style={{ width: 36, padding: '2px 4px', border: '1px solid ' + C.topBg, borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: C.text, textAlign: 'center', background: C.white }} />
                          <span style={{ fontSize: 10, color: C.muted }}>%</span>
                        </div>
                      ) : (
                        <button
                          onClick={e => startEditRate(e, s.id, rateOverride)}
                          title="Click to set commission rate for this service"
                          style={{
                            display: 'flex', alignItems: 'center', padding: '5px 7px',
                            background: isCustomRate ? '#FEF9C3' : enabled ? C.white : C.surface,
                            color:      isCustomRate ? '#854D0E' : enabled ? C.text : C.muted,
                            border: 'none', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 10,
                            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                          }}>
                          {displayRate}%
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Barbers() {
  const [activeTab,     setActiveTab]     = useState('barbers');
  const [branchFilter,  setBranchFilter]  = useState('all');
  const [showInactive,  setShowInactive]  = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [editBarber,    setEditBarber]    = useState(null);
  const [expandedBarber,setExpandedBarber]= useState(null);
  const [flagged,       setFlagged]       = useState(new Set());

  const [barberSvcs, setBarberSvcs] = useState(() => {
    const init = {};
    ALL_BARBERS.forEach(b => {
      init[b.id] = {};
      SERVICE_CATALOGUE.forEach(s => {
        init[b.id][s.id] = BARBER_SERVICES[b.id]?.[s.id] ?? true;
      });
    });
    return init;
  });

  // Per-barber per-service commission rate overrides. null = use DEFAULT_COMM_RATE.
  const [barberSvcRates, setBarberSvcRates] = useState({});

  function toggleService(barberId, serviceId) {
    setBarberSvcs(prev => ({
      ...prev,
      [barberId]: { ...prev[barberId], [serviceId]: !prev[barberId][serviceId] },
    }));
  }

  function setServiceRate(barberId, serviceId, rate) {
    setBarberSvcRates(prev => ({
      ...prev,
      [barberId]: { ...(prev[barberId] || {}), [serviceId]: rate },
    }));
  }

  const filtered = ALL_BARBERS
    .filter(b => branchFilter === 'all' || (branchFilter === 'freelance' ? b.payType === 'daily_rate' : b.branch === branchFilter))
    .filter(b => showInactive ? true : b.isActive);

  const totalBarbers    = ALL_BARBERS.filter(b => b.isActive && b.payType !== 'daily_rate').length;
  const totalFreelance  = ALL_BARBERS.filter(b => b.isActive && b.payType === 'daily_rate').length;

  function toggleFlag(i) { setFlagged(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; }); }

  return (
    <div style={{ padding: '28px 32px' }}>
      {showModal && <BarberModal barber={editBarber} onClose={() => setShowModal(false)} />}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>Barbers</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Manage barber profiles and service capability</div>
        </div>
        <button onClick={() => { setEditBarber(null); setShowModal(true); }}
          style={{ padding: '9px 16px', borderRadius: 8, background: C.topBg, color: C.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          + Add Barber
        </button>
      </div>

      {/* Stat card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, max-content)', gap: 14, marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: '16px 24px', display: 'inline-flex', gap: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted }}>Active Barbers</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: C.text, marginTop: 4 }}>{totalBarbers}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Across all branches</div>
          </div>
          <div style={{ borderLeft: '1px solid ' + C.border, paddingLeft: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted }}>Freelancers</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: '#D97706', marginTop: 4 }}>{totalFreelance}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Daily rate</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid ' + C.border, marginBottom: 20 }}>
        {[
          { key: 'barbers',    label: 'Barbers'        },
          { key: 'attendance', label: 'Attendance Log'  },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid ' + C.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: activeTab === t.key ? C.text : C.muted, cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Barbers tab ── */}
      {activeTab === 'barbers' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {[{ key: 'all', label: 'All Branches' }, ...BRANCHES.map(b => ({ key: b.city, label: b.city })), { key: 'freelance', label: 'Freelance' }].map(f => (
              <button key={f.key} onClick={() => setBranchFilter(f.key)}
                style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (branchFilter === f.key ? C.topBg : C.border), background: branchFilter === f.key ? C.topBg : 'transparent', color: branchFilter === f.key ? C.white : C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                {f.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Show inactive</span>
              <div onClick={() => setShowInactive(v => !v)} style={{ width: 36, height: 20, borderRadius: 99, background: showInactive ? C.topBg : C.surface2, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', width: 14, height: 14, background: C.white, borderRadius: '50%', top: 3, left: showInactive ? 19 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Click a row to manage service capability.</div>

          <div className="admin-card" style={{ overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.6fr 1fr 1fr 0.8fr 0.5fr', padding: '10px 18px', borderBottom: '1px solid ' + C.surface }}>
              {['Barber', 'Branch', 'Chair', 'Pay Type', 'Pay Details', 'Services', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
              ))}
            </div>

            <div style={{ maxHeight: 'calc(100vh - 390px)', minHeight: 200, overflowY: 'auto' }}>
              {filtered.map((b, i) => {
                const ptm      = PAY_TYPE_META[b.payType] ?? PAY_TYPE_META.salary_plus_commission;
                const svcCount = barberSvcs[b.id] ? Object.values(barberSvcs[b.id]).filter(Boolean).length : 0;
                const isExpanded = expandedBarber === b.id;
                const chairLabel   = CHAIR_MAP[b.id] ?? null;
                const isFreelance  = b.payType === 'daily_rate';

                return (
                  <div key={b.id} style={{ animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}>
                    {/* Barber row */}
                    <div
                      onClick={() => setExpandedBarber(isExpanded ? null : b.id)}
                      style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.6fr 1fr 1fr 0.8fr 0.5fr', padding: '12px 18px', borderBottom: '1px solid ' + C.surface, alignItems: 'center', transition: 'background 0.1s', opacity: b.isActive ? 1 : 0.5, cursor: 'pointer', background: isExpanded ? C.surface : 'transparent' }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = C.bg; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = isExpanded ? C.surface : 'transparent'; }}>

                      {/* Barber name + specialty */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar initials={b.initials} inactive={!b.isActive} />
                        <div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{b.name}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                            {b.specialty}
                            {!b.isActive && <span style={{ marginLeft: 6, fontSize: 10, color: C.danger, fontStyle: 'italic' }}>Inactive</span>}
                          </div>
                        </div>
                      </div>

                      {/* Branch */}
                      <div style={{ fontSize: 12, color: isFreelance ? C.muted : C.text2, fontWeight: 500, fontStyle: isFreelance ? 'italic' : 'normal' }}>
                        {isFreelance ? 'Freelance' : (b.branch ?? '—')}
                      </div>

                      {/* Chair */}
                      <div>
                        {chairLabel
                          ? <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 12, padding: '3px 8px', borderRadius: 5, background: C.topBg, color: C.accent }}>{chairLabel}</span>
                          : <span style={{ fontSize: 12, color: C.muted }}>—</span>
                        }
                      </div>

                      {/* Pay type badge */}
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: ptm.bg, color: ptm.color }}>{ptm.label}</span>
                      </div>

                      {/* Pay details */}
                      <div style={{ fontSize: 12, color: C.text2 }}>
                        {b.payType === 'salary_plus_commission' && b.baseSalary > 0
                          ? 'Rp ' + (b.baseSalary / 1000000).toFixed(1).replace('.0', '') + 'jt/mo'
                          : b.payType === 'daily_rate' && b.dailyRate
                          ? 'Rp ' + Math.round(b.dailyRate / 1000) + 'rb/day'
                          : <span style={{ color: C.muted }}>—</span>
                        }
                      </div>

                      {/* Services */}
                      <div style={{ fontSize: 12, color: isExpanded ? C.topBg : C.muted, fontWeight: isExpanded ? 700 : 400 }}>
                        {isFreelance ? <span style={{ color: C.muted }}>—</span> : `${svcCount} enabled`}
                      </div>

                      <button onClick={e => { e.stopPropagation(); setEditBarber(b); setShowModal(true); }}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + C.border, background: 'transparent', color: C.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        Edit
                      </button>
                    </div>

                    {/* Expanded service capability */}
                    {isExpanded && (
                      <ServicePanel
                        barber={b}
                        barberSvcs={barberSvcs}
                        onToggle={toggleService}
                        barberSvcRates={barberSvcRates}
                        onRateChange={setServiceRate}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Attendance Log tab ── */}
      {activeTab === 'attendance' && (
        <>
          <div style={{ padding: '10px 16px', borderRadius: 9, background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: 16, fontSize: 12, color: '#1D4ED8' }}>
            This is the raw clock-in/out log. For monthly attendance summaries, off-day tracking, and payroll, see <strong>Attendance &amp; Payroll</strong>.
          </div>
          <div className="admin-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 2fr 1.3fr 0.8fr 0.8fr 0.6fr 0.8fr', padding: '10px 18px', borderBottom: '1px solid ' + C.surface }}>
              {['Date', 'Barber', 'Branch', 'Clock In', 'Clock Out', 'Hours', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{h}</div>
              ))}
            </div>
            <div style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 200, overflowY: 'auto' }}>
              {ATTENDANCE_LOG.map((a, i) => {
                const isFlagged = flagged.has(i);
                return (
                  <div key={i}
                    style={{ display: 'grid', gridTemplateColumns: '0.7fr 2fr 1.3fr 0.8fr 0.8fr 0.6fr 0.8fr', padding: '12px 18px', borderBottom: i < ATTENDANCE_LOG.length - 1 ? '1px solid ' + C.surface : 'none', alignItems: 'center', transition: 'background 0.1s', background: isFlagged ? '#FFFBEB' : 'transparent', animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}
                    onMouseEnter={e => { if (!isFlagged) e.currentTarget.style.background = C.bg; }}
                    onMouseLeave={e => { if (!isFlagged) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ fontSize: 11, color: C.muted }}>{a.date}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{a.barber}</div>
                    <div style={{ fontSize: 12, color: C.text2 }}>{a.branch}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.text }}>{a.clockIn}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: a.clockOut ? C.text : C.muted }}>{a.clockOut ?? '—'}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{a.hours}</div>
                    <button onClick={() => toggleFlag(i)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid ' + (isFlagged ? '#D97706' : C.border), background: isFlagged ? '#FFFBEB' : 'transparent', color: isFlagged ? '#D97706' : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {isFlagged ? '⚑ Flagged' : 'Flag'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
