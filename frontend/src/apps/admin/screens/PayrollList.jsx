import { useState, useEffect } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { getToken } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Returns a concise date-range string.
// Same-month: "1–31 May 2026"
// Cross-month: "26 Apr – 25 May 2026"
function fmtShortRange(from, to) {
  if (!from || !to) return '—'
  const f = String(from).slice(0, 10)
  const t = String(to).slice(0, 10)
  const [, fMo, fDa] = f.split('-').map(Number)
  const [tYr, tMo, tDa] = t.split('-').map(Number)
  if (fMo === tMo) return `${fDa}–${tDa} ${MONTH_NAMES[tMo-1].slice(0,3)} ${tYr}`
  return `${fDa} ${MONTH_NAMES[fMo-1].slice(0,3)} – ${tDa} ${MONTH_NAMES[tMo-1].slice(0,3)} ${tYr}`
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }) {
  const styles = {
    communicated: { bg: '#DCFCE7', color: '#16A34A' },
    reviewed:     { bg: '#DBEAFE', color: '#2563EB' },
    draft:        { bg: '#FFFBEB', color: '#D97706' },
    not_started:  { bg: T.surface2, color: T.muted  },
  }
  const s = styles[status] || styles.not_started
  const labels = {
    communicated: 'Communicated',
    reviewed:     'Reviewed',
    draft:        'Draft',
    not_started:  'Not Started',
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {labels[status] || 'Not Started'}
    </span>
  )
}

function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', confirmDanger = false }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="admin-card" style={{ width: 440, padding: '28px 30px', animation: 'scaleIn 0.18s ease both' }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6, marginBottom: 24, whiteSpace: 'pre-line' }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{ padding: '9px 20px', borderRadius: 8, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ padding: '9px 20px', borderRadius: 8, background: confirmDanger ? T.danger : T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatPeriodLabel(from, to) {
  const f = String(from).slice(0, 10)
  const t = String(to).slice(0, 10)
  const [, fMo, fDa] = f.split('-').map(Number)
  const [tYr, tMo, tDa] = t.split('-').map(Number)
  return `${fDa} ${MONTH_NAMES[fMo-1].slice(0,3)} – ${tDa} ${MONTH_NAMES[tMo-1].slice(0,3)} ${tYr}`
}

async function downloadExport(periodId, label, format = 'xlsx', branchName = 'AllBranch') {
  const token = getToken()
  const BASE = import.meta.env.VITE_API_URL ?? '/api'
  try {
    const res = await fetch(`${BASE}/payroll/periods/${periodId}/export?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Bercut${branchName}_payroll_${label.replace(/\s+/g, '_')}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export error', err)
  }
}

export default function PayrollList({ onOpen, onViewAttendance }) {
  const [branches,       setBranches]       = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [dbPeriods,      setDbPeriods]      = useState([])
  const [loadingPeriods, setLoadingPeriods] = useState(true)
  const [generatingId,   setGeneratingId]   = useState(null) // preset period_from being generated
  const [customFrom,     setCustomFrom]     = useState('')
  const [customTo,       setCustomTo]       = useState('')
  const [customGenerating, setCustomGenerating] = useState(false)
  const [splitMode,        setSplitMode]        = useState(false)
  const [perfFrom,         setPerfFrom]         = useState('')
  const [perfTo,           setPerfTo]           = useState('')
  const [attendanceFrom,   setAttendanceFrom]   = useState('')
  const [attendanceTo,     setAttendanceTo]     = useState('')
  const [confirmRegen,   setConfirmRegen]   = useState(null) // { period, label }
  const [confirmDelete,  setConfirmDelete]  = useState(null) // { period, label }
  const [deletingId,     setDeletingId]     = useState(null)
  const [error,          setError]          = useState('')

  // Load branches once
  useEffect(() => {
    api.get('/branches').then(d => {
      const list = d || []
      setBranches(list)
      if (list[0]) setSelectedBranch(String(list[0].id))
    }).catch(() => {})
  }, [])

  // Load periods whenever branch changes
  useEffect(() => {
    if (!selectedBranch) return
    setLoadingPeriods(true)
    setDbPeriods([])
    api.get(`/payroll/periods?branch_id=${selectedBranch}`)
      .then(d => setDbPeriods(d || []))
      .catch(() => setDbPeriods([]))
      .finally(() => setLoadingPeriods(false))
  }, [selectedBranch])

  const rows = [...dbPeriods]
    .map(p => ({
      label:       formatPeriodLabel(String(p.period_from).slice(0,10), String(p.period_to).slice(0,10)),
      period_from: String(p.period_from).slice(0,10),
      period_to:   String(p.period_to).slice(0,10),
      period_month: String(p.period_from).slice(0,7),
      dbPeriod:    p,
      status:      p.status || 'draft',
    }))
    .sort((a, b) => b.period_from.localeCompare(a.period_from))

  async function handleRegenerate(period, label) {
    setConfirmRegen(null)
    setGeneratingId(period.period_from?.slice(0, 10))
    setError('')
    try {
      const result = await api.post('/payroll/periods/' + period.id + '/regenerate', {})
      onOpen(result.period, branches.find(b => String(b.id) === String(selectedBranch))?.name?.replace(/\s+/g, '') || 'AllBranch')
    } catch (err) {
      setError('Failed to reset period. Please try again.')
    } finally {
      setGeneratingId(null)
    }
  }

  async function handleCustomGenerate() {
    if (splitMode) {
      if (!perfFrom || !perfTo || !attendanceFrom || !attendanceTo) return
      const duplicate = dbPeriods.find(p =>
        String(p.performance_from).slice(0, 10) === perfFrom &&
        String(p.performance_to).slice(0, 10)   === perfTo
      )
      if (duplicate) {
        setError('A payroll period for these dates already exists. Open it from the list.')
        return
      }
      setCustomGenerating(true)
      setError('')
      try {
        const result = await api.post('/payroll/periods/generate', {
          branch_id:        selectedBranch,
          period_month:     attendanceFrom.slice(0, 7),
          performance_from: perfFrom,
          performance_to:   perfTo,
          attendance_from:  attendanceFrom,
          attendance_to:    attendanceTo,
        })
        onOpen(result.period, branches.find(b => String(b.id) === String(selectedBranch))?.name?.replace(/\s+/g, '') || 'AllBranch')
      } catch (err) {
        setError('Failed to generate custom period. Please try again.')
      } finally {
        setCustomGenerating(false)
      }
    } else {
      if (!customFrom || !customTo) return
      const duplicate = dbPeriods.find(p =>
        String(p.period_from).slice(0, 10) === customFrom &&
        String(p.period_to).slice(0, 10)   === customTo
      )
      if (duplicate) {
        setError('A payroll period for these dates already exists. Open it from the list.')
        return
      }
      setCustomGenerating(true)
      setError('')
      try {
        const fromMonth = customFrom.slice(0, 7)
        const fromMN = Number(customFrom.slice(5, 7)) - 1
        const toMN   = Number(customTo.slice(5, 7)) - 1
        const toYear = customTo.slice(0, 4)
        const label = `${customFrom.slice(8)} ${MONTH_NAMES[fromMN]?.slice(0,3) ?? ''} – ${customTo.slice(8)} ${MONTH_NAMES[toMN]?.slice(0,3) ?? ''} ${toYear}`
        const result = await api.post('/payroll/periods/generate', {
          branch_id:    selectedBranch,
          period_month: fromMonth,
          period_from:  customFrom,
          period_to:    customTo,
        })
        onOpen(result.period, branches.find(b => String(b.id) === String(selectedBranch))?.name?.replace(/\s+/g, '') || 'AllBranch')
      } catch (err) {
        setError('Failed to generate custom period. Please try again.')
      } finally {
        setCustomGenerating(false)
      }
    }
  }

  async function handleDelete(period, label) {
    setConfirmDelete(null)
    setDeletingId(period.id)
    setError('')
    try {
      await api.delete(`/payroll/periods/${period.id}`)
      setDbPeriods(prev => prev.filter(p => p.id !== period.id))
    } catch (err) {
      setError('Failed to delete period. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const isGenerating = id => generatingId === id

  return (
    <div style={{ padding: '28px 32px' }}>

      {confirmRegen && (
        <ConfirmDialog
          title={`Reset ${confirmRegen.label}?`}
          message={`Are you sure you want to reset ${confirmRegen.label}?\nThis will recalculate all values from raw attendance and booking data.\nAny manual edits to this period will be reset. Status will return to Draft.`}
          onConfirm={() => handleRegenerate(confirmRegen.period, confirmRegen.label)}
          onCancel={() => setConfirmRegen(null)}
          confirmLabel="Yes, Reset"
          confirmDanger
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${confirmDelete.label}?`}
          message={`This will permanently delete the payroll period "${confirmDelete.label}" and all its entries and adjustments.\nThis cannot be undone.`}
          onConfirm={() => handleDelete(confirmDelete.period, confirmDelete.label)}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Yes, Delete"
          confirmDanger
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Payroll</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Select a period to view or generate a new one</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onViewAttendance && (
            <button onClick={onViewAttendance}
              style={{ padding: '9px 16px', borderRadius: 8, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, border: '1px solid ' + T.border, cursor: 'pointer' }}>
              ← Attendance
            </button>
          )}
          {/* Branch selector */}
          <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid ' + T.border, background: T.white, fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: '#FEE2E2', border: '1px solid #FECACA', color: T.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {/* Periods table */}
      <div className="admin-card fu" style={{ overflow: 'hidden', marginBottom: 24 }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 2.2fr', padding: '10px 20px', borderBottom: '1px solid ' + T.border }}>
          {['Period', 'Status', 'Generated At', 'Actions'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
          ))}
        </div>

        {loadingPeriods && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading periods…</div>
        )}

        {!loadingPeriods && rows.map((row, i) => {
          return (
            <div key={row.period_from}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 2.2fr',
                padding: '13px 20px',
                borderBottom: i < rows.length - 1 ? '1px solid ' + T.surface : 'none',
                alignItems: 'center',
                background: T.white,
              }}>

              {/* Period label */}
              {(() => {
                const isSplit = !!(row.dbPeriod.performance_from)
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>
                        {row.label}
                      </span>
                      {isSplit && (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: T.surface2,
                          color: T.muted,
                          fontFamily: "'DM Sans', sans-serif",
                          flexShrink: 0,
                        }}>
                          Split
                        </span>
                      )}
                    </div>
                    {isSplit && (
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 3, fontFamily: "'Inter', sans-serif" }}>
                        Perf: {fmtShortRange(row.dbPeriod.performance_from, row.dbPeriod.performance_to)}
                        &nbsp;&nbsp;·&nbsp;&nbsp;
                        Att: {fmtShortRange(row.dbPeriod.attendance_from, row.dbPeriod.attendance_to)}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Status badge */}
              <div><StatusBadge status={row.status} /></div>

              {/* Generated at */}
              <div style={{ fontSize: 12, color: T.muted }}>
                {fmtDateTime(row.dbPeriod.generated_at || row.dbPeriod.created_at)}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => onOpen(row.dbPeriod, branches.find(b => String(b.id) === String(selectedBranch))?.name?.replace(/\s+/g, '') || 'AllBranch')} style={{ padding: '5px 14px', borderRadius: 6, background: T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>Open</button>
                <button onClick={() => setConfirmRegen({ period: row.dbPeriod, label: row.label })} disabled={!!generatingId} style={{ padding: '5px 12px', borderRadius: 6, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, border: '1px solid ' + T.border, cursor: generatingId ? 'not-allowed' : 'pointer', opacity: generatingId ? 0.65 : 1 }}>{isGenerating(row.period_from) ? 'Resetting…' : 'Reset ↺'}</button>
                <button onClick={() => downloadExport(row.dbPeriod.id, row.label, 'xlsx', branches.find(b => String(b.id) === String(selectedBranch))?.name?.replace(/\s+/g, '') || 'AllBranch')} style={{ padding: '5px 12px', borderRadius: 6, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, border: '1px solid ' + T.border, cursor: 'pointer' }}>↓ Excel</button>
                <button onClick={() => downloadExport(row.dbPeriod.id, row.label, 'csv', branches.find(b => String(b.id) === String(selectedBranch))?.name?.replace(/\s+/g, '') || 'AllBranch')} style={{ padding: '5px 12px', borderRadius: 6, background: T.surface, color: T.text2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, border: '1px solid ' + T.border, cursor: 'pointer' }}>↓ CSV</button>
                {row.status === 'draft' && (
                  <button
                    onClick={() => setConfirmDelete({ period: row.dbPeriod, label: row.label })}
                    disabled={deletingId === row.dbPeriod.id}
                    style={{ padding: '5px 10px', borderRadius: 6, background: '#FEE2E2', color: T.danger, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, border: '1px solid #FECACA', cursor: deletingId === row.dbPeriod.id ? 'not-allowed' : 'pointer', opacity: deletingId === row.dbPeriod.id ? 0.65 : 1 }}>
                    {deletingId === row.dbPeriod.id ? 'Deleting…' : '✕ Delete'}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {!loadingPeriods && rows.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>No periods found.</div>
        )}
      </div>

      {/* Custom Period section */}
      <div className="admin-card fu" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>Custom Period</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={splitMode}
              onChange={e => setSplitMode(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: T.text2, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Split periods</span>
          </label>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Generate a payroll period with a custom date range</div>
        {!splitMode ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted }}>From</span>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted }}>To</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white }} />
            </div>
            <button
              onClick={handleCustomGenerate}
              disabled={!customFrom || !customTo || customGenerating}
              style={{ marginTop: 18, padding: '8px 20px', borderRadius: 8, background: (!customFrom || !customTo || customGenerating) ? T.surface2 : T.topBg, color: (!customFrom || !customTo || customGenerating) ? T.muted : T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: (!customFrom || !customTo || customGenerating) ? 'not-allowed' : 'pointer' }}>
              {customGenerating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
              {/* Performance Period group */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.muted }}>Performance Period</div>
                <div style={{ fontSize: 10, color: T.border, marginTop: 2, marginBottom: 10 }}>commissions, OT, tips, late</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted }}>From</span>
                    <input type="date" value={perfFrom} onChange={e => setPerfFrom(e.target.value)}
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted }}>To</span>
                    <input type="date" value={perfTo} onChange={e => setPerfTo(e.target.value)}
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white }} />
                  </div>
                </div>
              </div>
              {/* Attendance Period group */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.muted }}>Attendance Period</div>
                <div style={{ fontSize: 10, color: T.border, marginTop: 2, marginBottom: 10 }}>base salary, offs, kasbon</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted }}>From</span>
                    <input type="date" value={attendanceFrom} onChange={e => setAttendanceFrom(e.target.value)}
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted }}>To</span>
                    <input type="date" value={attendanceTo} onChange={e => setAttendanceTo(e.target.value)}
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid ' + T.border, fontSize: 13, color: T.text, background: T.white }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex' }}>
              <button
                onClick={handleCustomGenerate}
                disabled={!perfFrom || !perfTo || !attendanceFrom || !attendanceTo || customGenerating}
                style={{ padding: '8px 20px', borderRadius: 8, background: (!perfFrom || !perfTo || !attendanceFrom || !attendanceTo || customGenerating) ? T.surface2 : T.topBg, color: (!perfFrom || !perfTo || !attendanceFrom || !attendanceTo || customGenerating) ? T.muted : T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: (!perfFrom || !perfTo || !attendanceFrom || !attendanceTo || customGenerating) ? 'not-allowed' : 'pointer' }}>
                {customGenerating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: T.muted }}>
        Periods are calculated from raw attendance and booking data. Regenerating a period will reset manual edits.
      </div>
    </div>
  )
}
