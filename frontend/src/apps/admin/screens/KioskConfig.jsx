import { useEffect, useState } from 'react'
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

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 24 }}>
        <SectionTitle title="Upsell Popup Copy"
          sub="Text shown in the 'Complete Your Look' upsell popup during service selection." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Heading (English)">
            <input value={cfg.upsell_heading || ''} onChange={e => setCfg(c => ({ ...c, upsell_heading: e.target.value }))}
              placeholder="e.g. Complete Your Look" style={inputStyle} />
          </Field>
          <Field label="Heading (Bahasa Indonesia)">
            <input value={cfg.upsell_heading_id || ''} onChange={e => setCfg(c => ({ ...c, upsell_heading_id: e.target.value }))}
              placeholder="e.g. Sempurnakan Tampilanmu" style={inputStyle} />
          </Field>
          <Field label="Switch CTA">
            <input value={cfg.upsell_switch_cta || ''} onChange={e => setCfg(c => ({ ...c, upsell_switch_cta: e.target.value }))}
              placeholder="e.g. Switch to Package" style={inputStyle} />
          </Field>
          <Field label="Keep Selection CTA">
            <input value={cfg.upsell_keep_cta || ''} onChange={e => setCfg(c => ({ ...c, upsell_keep_cta: e.target.value }))}
              placeholder="e.g. Keep My Selection" style={inputStyle} />
          </Field>
        </div>
      </div>
    </div>
  )
}

// ── Upsell Rules tab ──────────────────────────────────────────────────────────
function UpsellRulesTab({ cfg, setCfg }) {
  const rules = cfg.upsell_rules || []
  const enabled = !!cfg.upsell_enabled

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <SectionTitle title="Upsell Rules"
          sub="Rules are evaluated against the customer's cart. The first matching rule triggers a package upgrade suggestion or popup." />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: T.muted }}>Enable upsell</span>
          <div onClick={() => setCfg(c => ({ ...c, upsell_enabled: !c.upsell_enabled }))}
            style={{ width: 44, height: 24, borderRadius: 12, background: enabled ? T.topBg : T.surface2, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 2, left: enabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: enabled ? T.accent : T.muted, transition: 'left 0.2s' }} />
          </div>
        </div>
      </div>

      {rules.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', borderRadius: 10, background: T.bg, border: '1px dashed ' + T.border, color: T.muted, fontSize: 13 }}>
          No upsell rules configured.
          <div style={{ marginTop: 8, fontSize: 11 }}>Rules are stored as JSON in the database. Contact your developer to add or modify rules.</div>
        </div>
      )}

      {rules.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map((rule, i) => (
            <div key={rule.id || i} style={{ padding: '14px 16px', borderRadius: 10, background: rule.active !== false ? T.bg : T.surface2, border: '1px solid ' + (rule.active !== false ? T.border : T.surface2), opacity: rule.active !== false ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Rule {i + 1} · {rule.outcome === 'suggest_popup' ? 'Show Popup' : `Suggest Package`}
                  </div>
                  {rule.mustContain && rule.mustContain.length > 0 && (
                    <div style={{ fontSize: 12, color: T.text2, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, color: T.muted }}>Must include: </span>
                      {rule.mustContain.map(c => c.type === 'cat' ? `Any ${c.cat}` : `Service #${c.id}`).join(' + ')}
                    </div>
                  )}
                  {rule.mustNotContain && rule.mustNotContain.length > 0 && (
                    <div style={{ fontSize: 12, color: T.text2, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, color: T.muted }}>Must NOT include: </span>
                      {rule.mustNotContain.map(c => c.type === 'cat' ? `Any ${c.cat}` : `Service #${c.id}`).join(', ')}
                    </div>
                  )}
                  {rule.pkgId && (
                    <div style={{ fontSize: 12, color: T.text2 }}>
                      <span style={{ fontWeight: 600, color: T.muted }}>Action: </span>
                      Suggest Package #{rule.pkgId}
                    </div>
                  )}
                  {rule.outcome === 'suggest_popup' && (
                    <div style={{ fontSize: 12, color: T.text2 }}>
                      <span style={{ fontWeight: 600, color: T.muted }}>Action: </span>
                      Show "Complete Your Look" popup
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: rule.active !== false ? '#F0FDF4' : T.surface2, color: rule.active !== false ? '#16A34A' : T.muted }}>
                  {rule.active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E' }}>
        Upsell rule editing is managed via the database. The rules above are read-only. Contact your developer to modify them.
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
        idle_timeout_sec:        cfg.session_timeout_secs || cfg.idle_timeout_sec || 60,
        show_queue_number:       cfg.show_queue_number,
        payment_methods_enabled: cfg.payment_methods_enabled,
        receipt_footer:          cfg.receipt_footer,
        theme_accent_color:      cfg.theme_accent_color,
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
            {activeTab === 1 && <UpsellRulesTab cfg={cfg} setCfg={setCfg} />}
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
