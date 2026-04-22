import { useEffect, useRef, useState } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const TABS = ['Welcome Screen', 'Upsell Rules', 'Feedback Tags']

// ── Shared helpers ────────────────────────────────────────────────────────────
function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

function Field({ label, sub, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, color: T.text2, marginBottom: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, lineHeight: 1.5 }}>{sub}</div>}
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1.5px solid ${T.border}`, fontSize: 13,
  fontFamily: "'DM Sans', sans-serif", color: T.text,
  background: T.white, outline: 'none', boxSizing: 'border-box',
}

// ── Welcome Screen tab ────────────────────────────────────────────────────────
function WelcomeTab({ cfg, setCfg }) {
  return (
    <div>
      <SectionTitle title="Welcome / Idle Screen"
        sub="Displayed when kiosk is idle. Changes apply to the kiosk on next boot or settings refresh." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Field label="CTA Button (English)" sub='"Book Now" button label'>
          <input value={cfg.welcome_cta || ''} onChange={e => setCfg(c => ({ ...c, welcome_cta: e.target.value }))}
            placeholder="e.g. Book Now" style={inputStyle} />
        </Field>
        <Field label="CTA Button (Bahasa Indonesia)">
          <input value={cfg.welcome_cta_id || ''} onChange={e => setCfg(c => ({ ...c, welcome_cta_id: e.target.value }))}
            placeholder="e.g. Pesan Sekarang" style={inputStyle} />
        </Field>
        <Field label="Subtitle (English)" sub="Small helper text below the CTA">
          <input value={cfg.welcome_subtitle || ''} onChange={e => setCfg(c => ({ ...c, welcome_subtitle: e.target.value }))}
            placeholder="e.g. No. 1 Barber in Bali" style={inputStyle} />
        </Field>
        <Field label="Subtitle (Bahasa Indonesia)">
          <input value={cfg.welcome_subtitle_id || ''} onChange={e => setCfg(c => ({ ...c, welcome_subtitle_id: e.target.value }))}
            placeholder="e.g. Barber Terbaik di Pulau Dewata" style={inputStyle} />
        </Field>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 24 }}>
        <SectionTitle title="Session Timeout"
          sub="Seconds of no interaction before the countdown warning appears. A 15-second countdown then plays before auto-reset." />
        <Field label="Inactivity timeout">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="number" min={10} max={300} step={5}
              value={cfg.session_timeout_secs || 60}
              onChange={e => setCfg(c => ({ ...c, session_timeout_secs: Math.max(10, parseInt(e.target.value) || 60) }))}
              style={{ ...inputStyle, width: 90, textAlign: 'right' }} />
            <span style={{ fontSize: 13, color: T.muted }}>seconds</span>
            <span style={{ fontSize: 11, color: T.muted, padding: '4px 10px', background: T.surface, borderRadius: 6 }}>
              → {Math.floor((cfg.session_timeout_secs || 60) / 60) > 0 ? `${Math.floor((cfg.session_timeout_secs || 60) / 60)}m ` : ''}{(cfg.session_timeout_secs || 60) % 60 > 0 ? `${(cfg.session_timeout_secs || 60) % 60}s` : ''} idle · then 15s countdown
            </span>
          </div>
        </Field>
      </div>

    </div>
  )
}

// ── Upsell Rules tab ──────────────────────────────────────────────────────────
const CAT_META = {
  Haircut:   { label: 'Haircut',    color: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD' },
  Beard:     { label: 'Beard',      color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
  Treatment: { label: 'Treatment',  color: '#6D28D9', bg: '#EDE9FE', border: '#C4B5FD' },
  HairColor: { label: 'Hair Color', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
}

const normCat = cat => ({ haircut:'Haircut', beard:'Beard', treatment:'Treatment', hair_color:'HairColor', package:'Package' }[cat?.toLowerCase?.()] || cat)
const condKey = c => c.type === 'cat' ? `cat:${c.cat}` : `svc:${c.id}`

const condSummary = (conditions, svcs) => {
  if (!conditions?.length) return 'Any cart'
  return conditions.map(c =>
    c.type === 'cat' ? `Any ${CAT_META[c.cat]?.label || c.cat}` : (svcs.find(s => s.id === c.id)?.name || '?')
  ).join(' + ')
}

function ServiceConditionSelect({ selected, onChange, nonPackageSvcs, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const isSelected = c => selected.some(s => condKey(s) === condKey(c))
  const addItem    = item => { if (!isSelected(item)) onChange([...selected, item]); setOpen(false) }
  const removeItem = item => onChange(selected.filter(s => condKey(s) !== condKey(item)))

  const cats = [...new Set(nonPackageSvcs.map(s => normCat(s.category)))].filter(c => CAT_META[c])

  const chipLabel = c => c.type === 'cat'
    ? `Any ${CAT_META[c.cat]?.label || c.cat}`
    : (nonPackageSvcs.find(s => s.id === c.id)?.name || '?')
  const chipMeta  = c => {
    const res = c.type === 'cat'
      ? CAT_META[c.cat]
      : CAT_META[normCat(nonPackageSvcs.find(s => s.id === c.id)?.category)]
    return res || { color: '#555', bg: '#f1f1f1', border: '#e5e5e5' }
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display:'flex', flexWrap:'wrap', gap:5, minHeight:38, padding:'5px 8px', background:T.white, border:`1.5px solid ${open ? T.text : T.border}`, borderRadius:8, cursor:'pointer', alignItems:'center', transition:'border 0.15s' }}>
        {selected.map(item => {
          const m = chipMeta(item)
          return (
            <span key={condKey(item)} style={{ display:'inline-flex', alignItems:'center', gap:4, background:m.bg, color:m.color, fontSize:11, fontWeight:600, padding:'3px 8px 3px 9px', borderRadius:4, border:`1px solid ${m.border}` }}>
              {item.type === 'cat' && <span style={{ opacity:0.65, fontSize:9, fontWeight:700, textTransform:'uppercase' }}>all</span>}
              {chipLabel(item)}
              <span onClick={e => { e.stopPropagation(); removeItem(item) }} style={{ fontWeight:800, fontSize:13, lineHeight:1, cursor:'pointer', opacity:0.7, marginLeft:1 }}>×</span>
            </span>
          )
        })}
        {selected.length === 0 && <span style={{ fontSize:12, color:T.muted, userSelect:'none' }}>{placeholder || 'Select…'}</span>}
        <span style={{ marginLeft:'auto', fontSize:10, color:T.muted, paddingLeft:4, userSelect:'none' }}>{open ? '▴' : '▾'}</span>
      </div>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:T.white, border:`1.5px solid ${T.border}`, borderRadius:8, boxShadow:'0 6px 20px rgba(0,0,0,0.10)', zIndex:200, maxHeight:240, overflowY:'auto' }}>
          {cats.map(cat => {
            const m = CAT_META[cat]
            const catCond  = { type:'cat', cat }
            const catAdded = isSelected(catCond)
            const svcsInCat = nonPackageSvcs.filter(s => normCat(s.category) === cat)
            return (
              <div key={cat}>
                <div onClick={() => !catAdded && addItem(catCond)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:m.bg, cursor:catAdded?'default':'pointer', opacity:catAdded?0.5:1, borderTop:'1px solid rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:m.color }}>Any {m.label}</span>
                  <span style={{ fontSize:10, color:m.color, opacity:0.65 }}>— whole category</span>
                  {catAdded && <span style={{ marginLeft:'auto', fontSize:10, color:m.color }}>✓</span>}
                </div>
                {svcsInCat.map(svc => {
                  const svcCond  = { type:'svc', id:svc.id }
                  const svcAdded = isSelected(svcCond)
                  return (
                    <div key={svc.id} onClick={() => !svcAdded && addItem(svcCond)}
                      style={{ display:'flex', alignItems:'center', padding:'7px 14px 7px 24px', cursor:svcAdded?'default':'pointer', opacity:svcAdded?0.4:1, borderTop:`1px solid ${T.surface}`, background:T.white }}
                      onMouseEnter={e => { if (!svcAdded) e.currentTarget.style.background = T.surface }}
                      onMouseLeave={e => { e.currentTarget.style.background = T.white }}>
                      <span style={{ flex:1, fontSize:12, color:T.text }}>{svc.name}</span>
                      <span style={{ fontSize:11, color:T.muted }}>{'Rp ' + Number(svc.price || svc.base_price || 0).toLocaleString('id-ID')}</span>
                      {svcAdded && <span style={{ marginLeft:8, fontSize:10, color:T.muted }}>✓</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
          {cats.length === 0 && <div style={{ padding:'14px', fontSize:12, color:T.muted, textAlign:'center' }}>No services found for this branch.</div>}
        </div>
      )}
    </div>
  )
}

function RuleEditor({ draft, setDraft, onSave, onCancel, onDelete, isNew, nonPackageSvcs, packages }) {
  const targetPkg = packages.find(p => p.id === draft.pkgId)
  return (
    <div style={{ background:T.bg, border:`1.5px solid ${T.border}`, borderRadius:10, padding:'16px 18px', marginTop:6 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Cart must include (all of these)">
          <ServiceConditionSelect selected={draft.mustContain} onChange={v => setDraft({ ...draft, mustContain:v })} nonPackageSvcs={nonPackageSvcs} placeholder="Any cart — no filter" />
          <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>Leave empty to match any cart</div>
        </Field>
        <Field label="Cart must NOT include (none of these)">
          <ServiceConditionSelect selected={draft.mustNotContain} onChange={v => setDraft({ ...draft, mustNotContain:v })} nonPackageSvcs={nonPackageSvcs} placeholder="No exclusions" />
          <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>Leave empty to ignore exclusions</div>
        </Field>
      </div>

      <Field label="Action">
        <select
          value={draft.outcome === 'suggest_popup' ? 'popup' : (draft.pkgId ?? '')}
          onChange={e => {
            if (e.target.value === 'popup') setDraft({ ...draft, outcome:'suggest_popup', pkgId:null })
            else setDraft({ ...draft, outcome:'package', pkgId:e.target.value || null })
          }}
          style={inputStyle}>
          <option value="popup">Show "Complete Your Look" popup</option>
          <option disabled>──────────────</option>
          {packages.map(p => <option key={p.id} value={p.id}>{p.name} — Rp {Number(p.price || p.base_price || 0).toLocaleString('id-ID')}</option>)}
        </select>
        {targetPkg && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:6, background:'#DBEAFE', color:'#1D4ED8', fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:4 }}>
            ✓ Suggest: {targetPkg.name}
          </div>
        )}
        {draft.outcome !== 'suggest_popup' && packages.length === 0 && (
          <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>No packages found. Add services with category "Package" first.</div>
        )}
      </Field>

      <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
        <button onClick={() => onSave(draft)}
          style={{ padding:'8px 20px', borderRadius:7, background:T.topBg, color:T.white, border:'none', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer' }}>
          {isNew ? '+ Add Rule' : 'Save Rule'}
        </button>
        <button onClick={onCancel}
          style={{ padding:'8px 16px', borderRadius:7, background:'none', color:T.muted, border:`1.5px solid ${T.border}`, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:12, cursor:'pointer' }}>
          Cancel
        </button>
        {!isNew && (
          <button onClick={onDelete}
            style={{ marginLeft:'auto', padding:'8px 14px', borderRadius:7, background:'none', color:T.danger, border:`1.5px solid ${T.danger}`, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:12, cursor:'pointer' }}>
            Delete Rule
          </button>
        )}
      </div>
    </div>
  )
}

function UpsellRulesTab({ cfg, setCfg, branchId }) {
  const [allSvcs,   setAllSvcs]   = useState([])
  const [editingId, setEditingId] = useState(null)
  const [draft,     setDraft]     = useState(null)

  const rules   = cfg.upsell_rules || []
  const enabled = !!cfg.upsell_enabled

  useEffect(() => {
    if (!branchId) return
    api.get(`/services?branch_id=${branchId}`)
      .then(d => setAllSvcs(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [branchId])

  const nonPackageSvcs = allSvcs.filter(s => s.category !== 'package')
  const packages       = allSvcs.filter(s => s.category === 'package')

  const startEdit  = rule => { setEditingId(rule.id); setDraft({ ...rule, mustContain:[...rule.mustContain], mustNotContain:[...rule.mustNotContain] }) }
  const startNew   = ()   => { setEditingId('new');   setDraft({ id:Date.now().toString(), active:true, outcome:'suggest_popup', mustContain:[], mustNotContain:[], pkgId:null }) }
  const cancelEdit = ()   => { setEditingId(null); setDraft(null) }

  const saveRule = updated => {
    if (editingId === 'new') setCfg(c => ({ ...c, upsell_rules:[...(c.upsell_rules||[]), updated] }))
    else                     setCfg(c => ({ ...c, upsell_rules:(c.upsell_rules||[]).map(r => r.id === updated.id ? updated : r) }))
    cancelEdit()
  }
  const deleteRule  = id => { setCfg(c => ({ ...c, upsell_rules:(c.upsell_rules||[]).filter(r => r.id !== id) })); cancelEdit() }
  const toggleRule  = id => setCfg(c => ({ ...c, upsell_rules:(c.upsell_rules||[]).map(r => r.id === id ? { ...r, active: r.active === false } : r) }))

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <SectionTitle title="Upsell Rules"
          sub="Rules are evaluated in order when customer taps Continue. First matching rule triggers a package swap or popup." />
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:13, color:T.muted }}>Enable upsell</span>
          <div onClick={() => setCfg(c => ({ ...c, upsell_enabled:!c.upsell_enabled }))}
            style={{ width:44, height:24, borderRadius:12, background:enabled?T.topBg:T.surface2, position:'relative', cursor:'pointer', transition:'background 0.2s' }}>
            <div style={{ position:'absolute', top:2, left:enabled?22:2, width:20, height:20, borderRadius:'50%', background:enabled?T.accent:T.muted, transition:'left 0.2s' }} />
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
        {rules.length === 0 && editingId !== 'new' && (
          <div style={{ padding:'28px', textAlign:'center', borderRadius:10, background:T.bg, border:'1px dashed '+T.border, color:T.muted, fontSize:13 }}>
            No rules yet. Add one below.
          </div>
        )}
        {rules.map((rule, i) => {
          const isEditing = editingId === rule.id
          const outcomeLabel = rule.outcome === 'suggest_popup'
            ? 'Show popup'
            : (() => { const p = packages.find(p => p.id === rule.pkgId); return p ? `→ ${p.name}` : '→ Package' })()
          return (
            <div key={rule.id}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:10, border:`1.5px solid ${isEditing?T.topBg:T.border}`, background:isEditing?'#F8F8FF':T.white, opacity:rule.active===false?0.6:1 }}>
                <div onClick={() => toggleRule(rule.id)}
                  style={{ width:32, height:18, borderRadius:9, background:rule.active!==false?T.topBg:T.surface2, position:'relative', cursor:'pointer', flexShrink:0, transition:'background 0.2s' }}>
                  <div style={{ position:'absolute', top:2, left:rule.active!==false?15:2, width:14, height:14, borderRadius:'50%', background:rule.active!==false?T.accent:T.muted, transition:'left 0.2s' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:2 }}>Rule {i+1}</div>
                  <div style={{ fontSize:12, color:T.text2 }}>
                    {rule.mustContain?.length
                      ? <><span style={{ color:T.text, fontWeight:600 }}>If:</span> {condSummary(rule.mustContain, nonPackageSvcs)}</>
                      : <span style={{ color:T.muted }}>Any cart</span>}
                    {rule.mustNotContain?.length > 0 && <span style={{ color:T.muted }}> · Not: {condSummary(rule.mustNotContain, nonPackageSvcs)}</span>}
                    <span style={{ marginLeft:6, fontWeight:600, color:T.text }}> {outcomeLabel}</span>
                  </div>
                </div>
                <button onClick={() => isEditing ? cancelEdit() : startEdit(rule)}
                  style={{ padding:'5px 12px', borderRadius:6, border:`1.5px solid ${isEditing?T.topBg:T.border}`, background:isEditing?T.topBg:'transparent', color:isEditing?T.white:T.text2, fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {isEditing && (
                <RuleEditor draft={draft} setDraft={setDraft} isNew={false}
                  nonPackageSvcs={nonPackageSvcs} packages={packages}
                  onSave={saveRule} onCancel={cancelEdit} onDelete={() => deleteRule(rule.id)} />
              )}
            </div>
          )
        })}

        {editingId === 'new' && (
          <RuleEditor draft={draft} setDraft={setDraft} isNew={true}
            nonPackageSvcs={nonPackageSvcs} packages={packages}
            onSave={saveRule} onCancel={cancelEdit} onDelete={null} />
        )}
      </div>

      {editingId !== 'new' && (
        <button onClick={startNew}
          style={{ padding:'9px 18px', borderRadius:8, border:'1.5px dashed '+T.border, background:T.white, color:T.text2, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, cursor:'pointer', width:'100%' }}>
          + Add Rule
        </button>
      )}

      {/* ── Complete Your Look — service picker ── */}
      <div style={{ borderTop:'1px solid '+T.border, marginTop:28, paddingTop:24 }}>
        <SectionTitle title="Complete Your Look — Services"
          sub="Services shown as add-on suggestions in the popup when a 'Show popup' rule fires. Leave all unselected to show every non-package service." />
        {nonPackageSvcs.length === 0 ? (
          <div style={{ fontSize:12, color:T.muted }}>No services found. Select a branch first.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[...new Set(nonPackageSvcs.map(s => normCat(s.category)))].map(cat => {
              const m = CAT_META[cat]
              if (!m) return null
              return (
                <div key={cat}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:m.color, marginBottom:8 }}>
                    {m.label}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {nonPackageSvcs.filter(s => normCat(s.category) === cat).map(svc => {
                      const cur      = cfg.suggest_services || []
                      const selected = cur.includes(svc.id)
                      return (
                        <button key={svc.id}
                          onClick={() => {
                            const next = selected ? cur.filter(id => id !== svc.id) : [...cur, svc.id]
                            setCfg(c => ({ ...c, suggest_services: next.length ? next : null }))
                          }}
                          style={{ padding:'6px 13px', borderRadius:6, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, background:selected?m.bg:T.white, color:selected?m.color:T.muted, border:`1.5px solid ${selected?m.border:T.border}`, transition:'all 0.15s' }}>
                          {selected ? '✓ ' : ''}{svc.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ fontSize:11, color:T.muted, marginTop:10 }}>
          {cfg.suggest_services?.length
            ? `${cfg.suggest_services.length} service${cfg.suggest_services.length > 1 ? 's' : ''} selected`
            : 'All non-package services will be shown in the popup'}
        </div>
      </div>

      {/* ── Popup copy ── */}
      <div style={{ borderTop:'1px solid '+T.border, marginTop:28, paddingTop:24 }}>
        <SectionTitle title="Upsell Popup Copy" sub="Text shown in the popup when a rule fires." />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Field label="Heading (English)">
            <input value={cfg.upsell_heading||''} onChange={e => setCfg(c => ({ ...c, upsell_heading:e.target.value }))} placeholder="e.g. Complete Your Look" style={inputStyle} />
          </Field>
          <Field label="Heading (Bahasa Indonesia)">
            <input value={cfg.upsell_heading_id||''} onChange={e => setCfg(c => ({ ...c, upsell_heading_id:e.target.value }))} placeholder="e.g. Sempurnakan Tampilanmu" style={inputStyle} />
          </Field>
          <Field label="Switch CTA">
            <input value={cfg.upsell_switch_cta||''} onChange={e => setCfg(c => ({ ...c, upsell_switch_cta:e.target.value }))} placeholder="e.g. Switch to Package" style={inputStyle} />
          </Field>
          <Field label="Keep Selection CTA">
            <input value={cfg.upsell_keep_cta||''} onChange={e => setCfg(c => ({ ...c, upsell_keep_cta:e.target.value }))} placeholder="e.g. Keep My Selection" style={inputStyle} />
          </Field>
        </div>
      </div>
    </div>
  )
}

// ── Feedback Tags tab ─────────────────────────────────────────────────────────
const CONTEXT_META = {
  good:    { label: '4–5 ★', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', dot: '#22C55E' },
  neutral: { label: '3 ★',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B' },
  bad:     { label: '1–2 ★', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
}

function FeedbackTagsTab() {
  const [tags,       setTags]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [newLabel,   setNewLabel]   = useState('')
  const [newContext, setNewContext] = useState('good')
  const [addError,   setAddError]   = useState('')
  const [addBusy,    setAddBusy]    = useState(false)

  function loadTags() {
    setLoading(true)
    api.get('/settings/feedback-tags').then(d => {
      setTags(Array.isArray(d) ? d : [])
    }).catch(() => setTags([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadTags() }, [])

  async function handleAdd() {
    const label = newLabel.trim()
    if (!label) { setAddError('Tag label is required.'); return }
    if (tags.some(t => t.label.toLowerCase() === label.toLowerCase())) {
      setAddError('A tag with this label already exists.'); return
    }
    setAddBusy(true)
    try {
      await api.post('/settings/feedback-tags', { label, sentiment: newContext })
      setNewLabel(''); setAddError('')
      loadTags()
    } catch { setAddError('Failed to add tag.') } finally { setAddBusy(false) }
  }

  async function handleRemove(id) {
    try {
      await api.delete('/settings/feedback-tags/' + id)
      loadTags()
    } catch { /* ignore */ }
  }

  const byContext = ['good', 'neutral', 'bad'].map(ctx => ({
    ctx,
    meta: CONTEXT_META[ctx],
    tags: tags.filter(t => t.sentiment === ctx || t.context === ctx),
  }))

  if (loading) return <div style={{ padding: '24px', color: T.muted, fontSize: 13 }}>Loading tags…</div>

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 4 }}>Feedback Tags</div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
          Tags shown on the kiosk review screen after payment. Grouped by star rating context.
          Fetched at kiosk boot via <code style={{ fontFamily: 'monospace', fontSize: 11, background: T.surface2, padding: '1px 5px', borderRadius: 3 }}>GET /api/feedback-tags</code>.
        </div>
      </div>

      {byContext.map(({ ctx, meta, tags: ctxTags }) => (
        <div key={ctx} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>
              {ctx.charAt(0).toUpperCase() + ctx.slice(1)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: meta.bg, color: meta.color, border: '1px solid ' + meta.border }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 11, color: T.muted, marginLeft: 2 }}>{ctxTags.length} tags</span>
          </div>

          {ctxTags.length === 0 ? (
            <div style={{ fontSize: 12, color: T.muted, padding: '10px 0', fontStyle: 'italic' }}>No tags for this context yet.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ctxTags.map(tag => (
                <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 12px', borderRadius: 20, border: '1.5px solid ' + meta.border, background: meta.bg, transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: meta.color, fontFamily: "'DM Sans', sans-serif" }}>{tag.label}</span>
                  <button onClick={() => handleRemove(tag.id)}
                    title="Remove tag"
                    style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', fontSize: 11, color: meta.color, lineHeight: 1, opacity: 0.6 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add new tag */}
      <div style={{ marginTop: 8, padding: '18px 20px', borderRadius: 12, border: '1.5px dashed ' + T.border, background: T.bg }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 12 }}>Add New Tag</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            value={newLabel}
            onChange={e => { setNewLabel(e.target.value); setAddError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Tag label (e.g. Clean Cut)"
            style={{ flex: 1, minWidth: 160, padding: '9px 12px', borderRadius: 8, border: '1.5px solid ' + (addError ? '#FECACA' : T.border), fontSize: 13, color: T.text, background: T.white, fontFamily: "'DM Sans', sans-serif" }}
          />
          <select value={newContext} onChange={e => setNewContext(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}>
            <option value="good">Good (4–5 ★)</option>
            <option value="neutral">Neutral (3 ★)</option>
            <option value="bad">Bad (1–2 ★)</option>
          </select>
          <button onClick={handleAdd} disabled={addBusy}
            style={{ padding: '9px 18px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {addBusy ? 'Adding…' : '+ Add'}
          </button>
        </div>
        {addError && <div style={{ fontSize: 11, color: T.danger, marginTop: 6 }}>{addError}</div>}
        <div style={{ fontSize: 11, color: T.muted, marginTop: 8, lineHeight: 1.5 }}>
          Tags are saved globally and served to all kiosks at boot. Deleted tags are removed immediately.
        </div>
      </div>
    </div>
  )
}

// ── Token modal ───────────────────────────────────────────────────────────────
function TokenModal({ branch, onClose }) {
  const [token,   setToken]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [tokens,  setTokens]  = useState([])

  useEffect(() => {
    api.get('/kiosk/tokens?branch_id=' + branch.id).then(d => setTokens(Array.isArray(d) ? d : [])).catch(() => {})
  }, [branch.id])

  async function generate() {
    setLoading(true)
    try {
      const res = await api.post('/kiosk/tokens', { branch_id: branch.id, device_name: 'Kiosk' })
      setToken(res.token)
      api.get('/kiosk/tokens?branch_id=' + branch.id).then(d => setTokens(Array.isArray(d) ? d : [])).catch(() => {})
    } catch (err) { alert(err?.message || 'Failed') } finally { setLoading(false) }
  }

  async function revoke(id) {
    await api.delete('/kiosk/tokens/' + id).catch(() => {})
    api.get('/kiosk/tokens?branch_id=' + branch.id).then(d => setTokens(Array.isArray(d) ? d : [])).catch(() => {})
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-card" style={{ width: 520, padding: 28, animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 15 }}>Kiosk Tokens</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{branch.name}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {token && (
          <div style={{ padding: '14px 16px', borderRadius: 9, background: '#F0FDF4', border: '1px solid #BBF7D0', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', marginBottom: 6 }}>New Token — Copy now, won't be shown again</div>
            <code style={{ fontFamily: 'monospace', fontSize: 13, color: '#111110', wordBreak: 'break-all', display: 'block', background: '#DCFCE7', padding: '8px 12px', borderRadius: 6 }}>{token}</code>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Active Tokens</div>
          {tokens.length === 0 && <div style={{ fontSize: 13, color: T.muted }}>No active tokens.</div>}
          {tokens.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: T.bg, border: '1px solid ' + T.border, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13 }}>{t.device_name}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {t.token_preview} · Last seen: {t.last_seen_at ? new Date(t.last_seen_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                </div>
              </div>
              <button onClick={() => revoke(t.id)}
                style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #FECACA', background: 'transparent', color: T.danger, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Revoke
              </button>
            </div>
          ))}
        </div>

        <button onClick={generate} disabled={loading}
          style={{ width: '100%', padding: '10px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          {loading ? 'Generating…' : '+ Generate New Token'}
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function KioskConfig() {
  const [branches,    setBranches]    = useState([])
  const [branchId,    setBranchId]    = useState('')
  const [activeTab,   setActiveTab]   = useState(0)
  const [cfg,         setCfg]         = useState({})
  const [loading,     setLoading]     = useState(true)
  const [saved,       setSaved]       = useState(false)
  const [busy,        setBusy]        = useState(false)
  const [tokenModal,  setTokenModal]  = useState(false)

  useEffect(() => {
    api.get('/branches').then(d => {
      const list = Array.isArray(d) ? d : []
      setBranches(list)
      if (list.length) setBranchId(list[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!branchId) return
    setLoading(true)
    api.get(`/settings/kiosk/${branchId}`).then(d => {
      setCfg(d || {})
    }).catch(() => setCfg({})).finally(() => setLoading(false))
  }, [branchId])

  async function handleSave() {
    if (!branchId || busy) return
    setBusy(true)
    try {
      await api.patch(`/settings/kiosk/${branchId}`, {
        session_timeout_secs:    cfg.session_timeout_secs || 60,
        show_queue_number:       cfg.show_queue_number,
        payment_methods_enabled: cfg.payment_methods_enabled,
        receipt_footer:          cfg.receipt_footer,
        theme_accent_color:      cfg.theme_accent_color,
        welcome_cta:             cfg.welcome_cta,
        welcome_cta_id:          cfg.welcome_cta_id,
        welcome_subtitle:        cfg.welcome_subtitle,
        welcome_subtitle_id:     cfg.welcome_subtitle_id,
        upsell_enabled:          cfg.upsell_enabled ?? false,
        upsell_rules:            cfg.upsell_rules || [],
        suggest_services:        cfg.suggest_services || null,
        upsell_heading:          cfg.upsell_heading,
        upsell_heading_id:       cfg.upsell_heading_id,
        upsell_switch_cta:       cfg.upsell_switch_cta,
        upsell_keep_cta:         cfg.upsell_keep_cta,
      })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  const selectedBranch = branches.find(b => b.id === branchId)

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {tokenModal && selectedBranch && (
        <TokenModal branch={selectedBranch} onClose={() => setTokenModal(false)} />
      )}

      {/* Page header */}
      <div style={{ padding: '28px 32px 0', borderBottom: `1px solid ${T.border}`, marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: T.muted, textTransform: 'uppercase', marginBottom: 4 }}>Admin</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 6 }}>Kiosk Configuration</div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Configure kiosk UI per branch. Changes apply on next kiosk settings fetch.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={branchId} onChange={e => setBranchId(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: T.white, color: T.text, cursor: 'pointer' }}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {selectedBranch && (
            <button onClick={() => setTokenModal(true)}
              style={{ padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.white, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Manage Tokens
            </button>
          )}
          <button onClick={handleSave} disabled={busy || loading}
            style={{ padding: '10px 24px', borderRadius: 8, background: saved ? '#1a3a1a' : T.topBg, color: saved ? '#6fcf6f' : T.white, border: 'none', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, cursor: busy || loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            {saved ? '✓ Saved' : busy ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 32px 40px' }}>
        {/* Branch status */}
        {selectedBranch && (
          <div style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{selectedBranch.name} Kiosk</span>
              <span style={{ fontSize: 12, color: T.muted, marginLeft: 10 }}>Settings saved here apply to the branch kiosk on next boot or refresh</span>
            </div>
            <div style={{ fontSize: 11, color: T.muted }}>Manage device tokens → Manage Tokens</div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `1px solid ${T.border}` }}>
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              style={{ padding: '10px 18px', borderRadius: '8px 8px 0 0', border: 'none', borderBottom: `3px solid ${activeTab === i ? T.topBg : 'transparent'}`, background: 'transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: activeTab === i ? 700 : 500, fontSize: 13, color: activeTab === i ? T.text : T.muted, cursor: 'pointer', marginBottom: -1 }}>
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading settings…</div>
        ) : (
          <div style={{ background: T.white, borderRadius: 14, padding: 28, border: `1.5px solid ${T.border}` }}>
            {activeTab === 0 && <WelcomeTab     cfg={cfg} setCfg={setCfg} />}
            {activeTab === 1 && <UpsellRulesTab cfg={cfg} setCfg={setCfg} branchId={branchId} />}
            {activeTab === 2 && <FeedbackTagsTab />}
          </div>
        )}

        {activeTab !== 2 && !loading && (
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, color: T.muted }}>Settings apply to the branch kiosk on next boot or settings refresh.</span>
            <button onClick={handleSave} disabled={busy}
              style={{ padding: '11px 28px', borderRadius: 9, background: saved ? '#1a3a1a' : T.topBg, color: saved ? '#6fcf6f' : T.white, border: 'none', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {saved ? '✓ Saved' : busy ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
