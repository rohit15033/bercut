import { useState, useEffect, useRef } from 'react'
import { tokens as T } from '../../../shared/tokens.js'
import { api } from '../../../shared/api.js'
import * as XLSX from 'xlsx'

const fmt  = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const fmtM = n => {
  const v = Number(n || 0)
  if (v >= 1_000_000) return 'Rp ' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt'
  if (v >= 1_000)     return 'Rp ' + v.toLocaleString('id-ID')
  return 'Rp ' + v
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmtDate(s) {
  if (!s) return '—'
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return s
  return `${MONTH_NAMES[parseInt(m[2])-1]} ${parseInt(m[3])} ${m[1]}`
}

function getPeriodDates(period, customFrom, customTo) {
  if (period === 'custom') return { from: customFrom, to: customTo }
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  if (period === 'today') { const t = iso(now); return { from: t, to: t } }
  if (period === 'week') {
    const day = now.getDay()
    const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { from: iso(mon), to: iso(sun) }
  }
  return { from: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, to: iso(now) }
}

function initials(name) {
  return (name || '').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
}

const SOURCE_CFG = {
  kiosk_timeout: { label: 'Session timeout', color: '#2563EB', bg: '#EFF6FF' },
  kiosk_back:    { label: 'Back to welcome', color: '#7C3AED', bg: '#EDE9FE' },
  cctv_manual:   { label: 'CCTV logged',     color: '#D97706', bg: '#FFFBEB' },
}

// ── DateRangePicker ───────────────────────────────────────────────────────────

function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen]       = useState(false)
  const [hover, setHover]     = useState(null)
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const rightMonth = viewMonth === 11 ? 0            : viewMonth + 1
  const rightYear  = viewMonth === 11 ? viewYear + 1 : viewYear

  function prev() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) } else setViewMonth(m => m-1) }
  function next() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) } else setViewMonth(m => m+1) }

  function handleDay(iso) {
    if (!from || to || iso < from) { onChange(iso, null) }
    else if (iso === from)         { onChange(null, null) }
    else                           { onChange(from, iso); setOpen(false) }
  }

  function renderMonth(year, month, showPrev, showNext) {
    const firstDow = new Date(year, month, 1).getDay()
    const daysInM  = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInM; d++) cells.push(`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
    while (cells.length % 7 !== 0) cells.push(null)

    const hoverEnd    = !to && from && hover && hover >= from ? hover : null
    const effectiveTo = to || hoverEnd

    return (
      <div style={{ width: 216 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {showPrev ? <button onClick={prev}  style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: T.surface, color: T.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button> : <div style={{ width: 26 }} />}
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{MONTH_NAMES[month]} {year}</div>
          {showNext ? <button onClick={next} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: T.surface, color: T.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button> : <div style={{ width: 26 }} />}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontSize: 9, fontWeight: 700, color: T.muted, textAlign: 'center', padding: '2px 0', textTransform: 'uppercase' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {cells.map((iso, idx) => {
            if (!iso) return <div key={`e${idx}`} />
            const isStart = iso === from, isEnd = iso === to
            const inRange = !!from && !!effectiveTo && iso > from && iso < effectiveTo
            const isTod   = iso === todayISO()
            const active  = isStart || isEnd
            const isHoverEnd = iso === hoverEnd
            const bg  = active ? T.topBg : isHoverEnd ? 'rgba(17,17,16,0.2)' : inRange ? '#F5E20055' : 'transparent'
            const clr = active || isHoverEnd ? '#fff' : T.text
            return (
              <div key={iso} onClick={() => handleDay(iso)}
                onMouseEnter={() => { if (from && !to) setHover(iso) }}
                onMouseLeave={() => { if (from && !to) setHover(null) }}
                style={{ textAlign: 'center', padding: '6px 2px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : isTod ? 600 : 400, background: bg, color: clr, outline: isTod && !active ? '1.5px solid ' + T.border : 'none', outlineOffset: -1, transition: 'background 0.08s', userSelect: 'none' }}>
                {parseInt(iso.split('-')[2])}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const label = from && to ? `${fmtDate(from)}  –  ${fmtDate(to)}` : from ? `From ${fmtDate(from)}` : 'Pick range'

  return (
    <div style={{ position: 'relative' }}>
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />}
      <button onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid ' + (from || to ? T.topBg : T.border), background: from || to ? 'rgba(17,17,16,0.06)' : T.white, color: from || to ? T.topBg : T.text, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: from || to ? 600 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
        <span style={{ fontSize: 12 }}>📅</span>
        <span>{label}</span>
        {(from || to) && (
          <span onClick={e => { e.stopPropagation(); onChange(null, null) }}
            style={{ marginLeft: 2, width: 15, height: 15, borderRadius: 3, background: T.surface2, color: T.muted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>✕</span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, background: T.white, borderRadius: 12, border: '1px solid ' + T.border, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '18px 20px', minWidth: 'fit-content' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            {renderMonth(viewYear, viewMonth, true, false)}
            <div style={{ width: 1, background: T.surface, alignSelf: 'stretch' }} />
            {renderMonth(rightYear, rightMonth, false, true)}
          </div>
          {from && !to && <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + T.surface, textAlign: 'center', fontSize: 11, color: T.muted }}>Click an end date · click start again to reset</div>}
          {from && to && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + T.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(from)} – {fmtDate(to)}</span>
              <button onClick={() => onChange(null, null)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: T.surface, color: T.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── PeriodFilter ──────────────────────────────────────────────────────────────

function PeriodFilter({ period, filterFrom, filterTo, onPeriod, onDates }) {
  const presets = [
    { key: 'today', label: 'Today'      },
    { key: 'week',  label: 'This Week'  },
    { key: 'month', label: 'This Month' },
    { key: 'custom',label: 'Custom'     },
  ]
  const btnSt = active => ({
    padding: '5px 13px', borderRadius: 5, border: 'none',
    background: active ? T.topBg : 'transparent',
    color:      active ? T.white  : T.muted,
    fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.12s',
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2, background: T.surface, padding: 2, borderRadius: 7 }}>
        {presets.map(p => (
          <button key={p.key} style={btnSt(period === p.key)} onClick={() => onPeriod(p.key)}>{p.label}</button>
        ))}
      </div>
      {period === 'custom' && <DateRangePicker from={filterFrom} to={filterTo} onChange={onDates} />}
    </div>
  )
}

// ── BarChart ──────────────────────────────────────────────────────────────────

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, padding: '0 4px' }}>
      {data.map((d, i) => {
        const h      = Math.max(4, Math.round((d.revenue / max) * 120))
        const isPeak = d.revenue === max
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, fontFamily: "'Inter', sans-serif" }}>{fmtM(d.revenue)}</div>
            <div style={{ width: '100%', height: h, background: isPeak ? T.accent : T.topBg, borderRadius: '4px 4px 0 0', position: 'relative' }}
              title={`${d.label}: ${fmt(d.revenue)} · ${d.bookings} bookings`}>
              {isPeak && <div style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: T.accent, whiteSpace: 'nowrap' }}>Peak</div>}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.text2, marginTop: 4 }}>{d.label}</div>
            <div style={{ fontSize: 10, color: T.muted }}>{d.bookings}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── DualBarChart ──────────────────────────────────────────────────────────────

function DualBarChart({ data }) {
  const maxVal = Math.max(...data.flatMap(d => [d.paxIn || 0, d.paxOut || 0]), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140, padding: '0 4px' }}>
      {data.map((d, i) => {
        const inH  = d.paxIn  ? Math.max(4, Math.round((d.paxIn  / maxVal) * 120)) : 0
        const outH = Math.max(4, Math.round((d.paxOut / maxVal) * 120))
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, width: '100%', justifyContent: 'center' }}>
              {inH > 0 && <div title={`Pax in: ${d.paxIn}`}  style={{ flex: 1, maxWidth: 20, height: inH,  background: T.topBg, borderRadius: '3px 3px 0 0' }} />}
              <div title={`Pax out: ${d.paxOut}`} style={{ flex: 1, maxWidth: 20, height: outH, background: '#DC2626', borderRadius: '3px 3px 0 0', opacity: 0.75 }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.text2 }}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [filterPeriod, setFilterPeriod] = useState('month')
  const [filterFrom,   setFilterFrom]   = useState(null)
  const [filterTo,     setFilterTo]     = useState(null)
  const [branchId,     setBranchId]     = useState('')
  const [activeTab,    setActiveTab]    = useState('revenue')
  const [branches,     setBranches]     = useState([])
  const [exportOpen,   setExportOpen]   = useState(false)
  const exportRef                       = useRef(null)

  // Revenue
  const [revData,       setRevData]       = useState([])
  const [revLoading,    setRevLoading]    = useState(false)

  // Barber performance
  const [barbers,       setBarbers]       = useState([])
  const [barbersLoad,   setBarbersLoad]   = useState(false)
  const [selectedBarber,setSelectedBarber]= useState(null)
  const [barberTx,      setBarberTx]      = useState([])
  const [barberTxLoad,  setBarberTxLoad]  = useState(false)
  const [perfSortBy,    setPerfSortBy]    = useState('total_revenue')
  const [perfSortDir,   setPerfSortDir]   = useState('desc')

  // Demand
  const [demandData,    setDemandData]    = useState([])
  const [demandLoad,    setDemandLoad]    = useState(false)

  // Delay
  const [delayData,     setDelayData]     = useState([])
  const [delayLoad,     setDelayLoad]     = useState(false)
  const [resolvedIds,   setResolvedIds]   = useState(new Set())

  // Transactions
  const [txData,        setTxData]        = useState([])
  const [txLoad,        setTxLoad]        = useState(false)
  const [expandedTx,    setExpandedTx]    = useState(new Set())

  const { from: dateFrom, to: dateTo } = getPeriodDates(filterPeriod, filterFrom, filterTo)

  function buildQs(extra = {}) {
    const p = new URLSearchParams()
    if (branchId) p.set('branch_id', branchId)
    if (dateFrom) p.set('date_from', dateFrom)
    if (dateTo)   p.set('date_to',   dateTo)
    Object.entries(extra).forEach(([k, v]) => p.set(k, v))
    return p.toString()
  }

  useEffect(() => {
    api.get('/branches').then(d => setBranches(d || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab !== 'revenue') return
    setRevLoading(true)
    api.get('/reports/revenue?' + buildQs({ group_by: 'day' }))
      .then(d => setRevData(d || []))
      .catch(() => setRevData([]))
      .finally(() => setRevLoading(false))
  }, [activeTab, branchId, dateFrom, dateTo])

  useEffect(() => {
    if (activeTab !== 'performance') return
    setBarbersLoad(true)
    api.get('/reports/barbers?' + buildQs())
      .then(d => setBarbers(d || []))
      .catch(() => setBarbers([]))
      .finally(() => setBarbersLoad(false))
  }, [activeTab, branchId, dateFrom, dateTo])

  useEffect(() => {
    if (activeTab !== 'demand') return
    setDemandLoad(true)
    api.get('/reports/demand?' + buildQs())
      .then(d => setDemandData(d || []))
      .catch(() => setDemandData([]))
      .finally(() => setDemandLoad(false))
  }, [activeTab, branchId, dateFrom, dateTo])

  useEffect(() => {
    if (activeTab !== 'delay') return
    setDelayLoad(true)
    api.get('/reports/delay?' + buildQs())
      .then(d => setDelayData((d || []).filter(r => Number(r.delay_minutes || 0) > 5)))
      .catch(() => setDelayData([]))
      .finally(() => setDelayLoad(false))
  }, [activeTab, branchId, dateFrom, dateTo])

  useEffect(() => {
    if (activeTab !== 'transactions') return
    setTxLoad(true)
    api.get('/reports/transactions?' + buildQs())
      .then(d => setTxData(d || []))
      .catch(() => setTxData([]))
      .finally(() => setTxLoad(false))
  }, [activeTab, branchId, dateFrom, dateTo])

  useEffect(() => {
    if (!selectedBarber) { setBarberTx([]); return }
    setBarberTxLoad(true)
    api.get('/reports/barber-transactions?' + buildQs({ barber_id: selectedBarber.id }))
      .then(d => setBarberTx(d || []))
      .catch(() => setBarberTx([]))
      .finally(() => setBarberTxLoad(false))
  }, [selectedBarber, dateFrom, dateTo])

  // Revenue KPIs
  const totalRevenue  = revData.reduce((a, r) => a + Number(r.revenue    || 0), 0)
  const totalTips     = revData.reduce((a, r) => a + Number(r.tips_total || 0), 0)
  const totalBookings = revData.reduce((a, r) => a + Number(r.booking_count || 0), 0)
  const avgOrder      = totalBookings ? Math.round(totalRevenue / totalBookings) : 0

  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const chartData = revData.map(r => {
    const d = new Date(r.period)
    return {
      label:    filterPeriod === 'month' ? String(d.getDate()) : DAY_NAMES[d.getDay()],
      revenue:  Number(r.revenue || 0),
      bookings: Number(r.booking_count || 0),
    }
  })

  // Demand KPIs
  const stepBreakdown = demandData.reduce((acc, row) => {
    const key = row.step_label || 'CCTV / No step'
    acc[key] = (acc[key] || 0) + Number(row.count || 0)
    return acc
  }, {})
  const totalPaxOut   = Object.values(stepBreakdown).reduce((a, v) => a + v, 0)
  const topDropStep   = Object.entries(stepBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const demandByDay = demandData.reduce((acc, row) => {
    const label = DAY_NAMES[new Date(row.date).getDay()]
    if (!acc[label]) acc[label] = { label, paxOut: 0 }
    acc[label].paxOut += Number(row.count || 0)
    return acc
  }, {})
  const dualChartData = Object.values(demandByDay)

  // Delay KPIs
  const totalIncidents = delayData.length
  const avgDelay       = totalIncidents ? Math.round(delayData.reduce((a, d) => a + Number(d.delay_minutes || 0), 0) / totalIncidents) : 0
  const flaggedCount   = delayData.filter(d => !resolvedIds.has(d.id)).length
  const resolvedCount  = totalIncidents - flaggedCount

  // Perf
  const sortedBarbers = [...barbers].sort((a, b) => {
    const av = Number(a[perfSortBy] || 0), bv = Number(b[perfSortBy] || 0)
    return perfSortDir === 'desc' ? bv - av : av - bv
  })
  function toggleSort(key) {
    if (perfSortBy === key) setPerfSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setPerfSortBy(key); setPerfSortDir('desc') }
  }
  const perfTotal = {
    services:   barbers.reduce((s, b) => s + Number(b.booking_count || 0), 0),
    revenue:    barbers.reduce((s, b) => s + Number(b.total_revenue || 0), 0),
    tips:       barbers.reduce((s, b) => s + Number(b.tips_total    || 0), 0),
  }
  const txRevenue = barberTx.reduce((s, r) => s + Number(r.total_amount || 0), 0)
  const txTips    = barberTx.reduce((s, r) => s + Number(r.tip          || 0), 0)

  const periodLabel = filterPeriod === 'custom' && filterFrom && filterTo
    ? `${fmtDate(filterFrom)} – ${fmtDate(filterTo)}`
    : filterPeriod === 'today' ? 'Today' : filterPeriod === 'week' ? 'This Week' : 'This Month'

  function buildTxRows() {
    const headers = ['Date','Booking','Scheduled','Started','Ended','Client','Phone','Barber','Service','Rate%','Commission','Amount','Tip','Payment']
    const rows = [headers]
    txData.forEach(r => {
      const svcs   = Array.isArray(r.services) ? r.services : []
      const extras = Array.isArray(r.extras)   ? r.extras   : []
      const base = [
        r.date || '', r.booking_number || '', r.time_scheduled || '',
        r.time_started || '', r.time_ended || '',
        r.customer_name || '', r.customer_phone || '', r.barber_name || '',
      ]
      if (svcs.length === 0) {
        rows.push([...base, '', '', '', r.total_amount || '', r.tip || '', r.payment_method || ''])
      } else {
        svcs.forEach((sv, i) => {
          rows.push([
            ...base,
            sv.service_name || '',
            sv.commission_rate != null ? Number(sv.commission_rate).toFixed(0) : '',
            sv.commission != null ? sv.commission : '',
            i === 0 ? (r.total_amount || '') : '', i === 0 ? (r.tip || '') : '', i === 0 ? (r.payment_method || '') : '',
          ])
        })
        extras.forEach(ex => {
          rows.push([...base, `${ex.name}${ex.quantity > 1 ? ` ×${ex.quantity}` : ''} (add-on)`, '', '', '', '', ''])
        })
      }
    })
    return rows
  }

  function exportCSV() {
    setExportOpen(false)
    let rows, filename
    if (activeTab === 'transactions') {
      rows = buildTxRows()
      filename = `bercut-transactions-${todayISO()}.csv`
    } else {
      rows = [['Period','Bookings','Revenue','Tips']]
      revData.forEach(r => rows.push([r.period, r.booking_count, r.revenue, r.tips_total]))
      filename = `bercut-revenue-${todayISO()}.csv`
    }
    const escape = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s }
    const csv = rows.map(r => r.map(escape).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = filename
    a.click()
  }

  function exportXLSX() {
    setExportOpen(false)
    let rows, filename, sheetName
    if (activeTab === 'transactions') {
      rows = buildTxRows()
      filename  = `bercut-transactions-${todayISO()}.xlsx`
      sheetName = 'Transactions'
    } else {
      rows = [['Period','Bookings','Revenue','Tips']]
      revData.forEach(r => rows.push([r.period, r.booking_count, r.revenue, r.tips_total]))
      filename  = `bercut-revenue-${todayISO()}.xlsx`
      sheetName = 'Revenue'
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    // Bold header row
    const range = XLSX.utils.decode_range(ws['!ref'])
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
      if (cell) cell.s = { font: { bold: true } }
    }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, filename)
  }

  function SortHeader({ label, sortKey }) {
    const active = perfSortBy === sortKey
    return (
      <div onClick={() => toggleSort(sortKey)} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: active ? T.text : T.muted }}>{label}</span>
        <span style={{ fontSize: 9, color: active ? T.text : T.border }}>{active ? (perfSortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </div>
    )
  }

  const TABS = [
    { key: 'revenue',      label: 'Revenue'           },
    { key: 'demand',       label: 'Demand'             },
    { key: 'delay',        label: 'Delay Report'       },
    { key: 'performance',  label: 'Barber Performance' },
    { key: 'transactions', label: 'Transactions'       },
  ]

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: T.text }}>Reports</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Revenue, pax out demand analysis, and delay incidents</div>
        </div>
        <div ref={exportRef} style={{ position: 'relative' }}>
          {exportOpen && <div onClick={() => setExportOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />}
          <button onClick={() => setExportOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: T.topBg, color: T.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            ↓ Export
            <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>▾</span>
          </button>
          {exportOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100, background: T.white, borderRadius: 10, border: '1px solid ' + T.border, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', overflow: 'hidden', minWidth: 160 }}>
              <button onClick={exportCSV}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '11px 16px', background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: T.text, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span style={{ fontSize: 15 }}>📄</span> CSV
              </button>
              <div style={{ height: 1, background: T.surface }} />
              <button onClick={exportXLSX}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '11px 16px', background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: T.text, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span style={{ fontSize: 15 }}>📊</span> Excel (.xlsx)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <PeriodFilter
          period={filterPeriod}
          filterFrom={filterFrom}
          filterTo={filterTo}
          onPeriod={k => { setFilterPeriod(k); if (k !== 'custom') { setFilterFrom(null); setFilterTo(null) } }}
          onDates={(f, t) => { setFilterFrom(f); setFilterTo(t) }}
        />
        <select value={branchId} onChange={e => setBranchId(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid ' + T.border, background: T.white, fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>
          <option value=''>All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid ' + T.border, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid ' + T.topBg : '2px solid transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: activeTab === t.key ? T.text : T.muted, cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s' }}>
            {t.label}
            {t.key === 'delay' && flaggedCount > 0 && (
              <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', padding: '1px 6px', borderRadius: 10 }}>{flaggedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── REVENUE TAB ── */}
      {activeTab === 'revenue' && <>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Revenue',   value: fmtM(totalRevenue), sub: periodLabel,              accent: '#16A34A' },
            { label: 'Total Bookings',  value: totalBookings,       sub: 'Across all services',   accent: T.text    },
            { label: 'Avg Order Value', value: fmtM(avgOrder),     sub: 'Revenue per booking',   accent: '#2563EB' },
            { label: 'Tips Collected',  value: fmtM(totalTips),    sub: 'Separate from revenue', accent: '#9333EA' },
          ].map((k, i) => (
            <div key={k.label} className="admin-card" style={{ padding: '18px 20px', animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 24, color: k.accent, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 24 }}>
          <div className="admin-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>Revenue by Day</div>
              <div style={{ fontSize: 11, color: T.muted }}>IDR</div>
            </div>
            {revLoading ? (
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
            ) : chartData.length > 0 ? (
              <BarChart data={chartData} />
            ) : (
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>No data for this period</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: T.topBg }} />
                <span style={{ fontSize: 11, color: T.muted }}>Revenue</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: T.accent }} />
                <span style={{ fontSize: 11, color: T.muted }}>Peak Day</span>
              </div>
            </div>
          </div>

          <div className="admin-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 20 }}>Payment Methods</div>
            {[
              { label: 'QRIS',          color: T.topBg,    pct: 0 },
              { label: 'Card (Xendit)', color: '#2563EB',  pct: 0 },
            ].map(m => (
              <div key={m.label} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{m.label}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: T.text }}>—</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: T.surface2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: m.pct + '%', background: m.color, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>See Barber Performance for detail</div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid ' + T.border, paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>Tips Collected</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 20, color: '#9333EA' }}>{fmtM(totalTips)}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Individual — not pooled</div>
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>Transaction Log</div>
            <div style={{ fontSize: 12, color: T.muted }}>Drill in via Barber Performance tab</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 0.5fr 1fr 1fr 1.2fr 2fr 0.7fr 0.9fr 0.6fr', padding: '8px 18px', borderBottom: '1px solid ' + T.surface }}>
            {['Date','Time','Client','Branch','Barber','Service','Method','Amount','Tip'].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
            ))}
          </div>
          <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
            Select a barber in the <strong>Barber Performance</strong> tab to view individual transactions
          </div>
        </div>
      </>}

      {/* ── DEMAND TAB ── */}
      {activeTab === 'demand' && <>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Pax Out (period)', value: totalPaxOut,  sub: 'Left without service',  accent: '#DC2626' },
            { label: 'Top Drop-off',     value: topDropStep,  sub: 'Highest abandon step',  accent: '#D97706' },
          ].map((k, i) => (
            <div key={k.label} className="admin-card" style={{ padding: '18px 20px', animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 22, color: k.accent, lineHeight: 1.1, wordBreak: 'break-word' }}>{k.value}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 24 }}>
          <div className="admin-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>Pax Out by Day</div>
              <div style={{ fontSize: 11, color: T.muted }}>Daily</div>
            </div>
            {demandLoad ? (
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
            ) : dualChartData.length > 0 ? (
              <DualBarChart data={dualChartData} />
            ) : (
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>No pax-out events for this period</div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: '#DC2626', opacity: 0.75 }} />
                <span style={{ fontSize: 11, color: T.muted }}>Pax Out</span>
              </div>
            </div>
          </div>

          <div className="admin-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 4 }}>Drop-off by Step</div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 20 }}>Where customers abandoned</div>
            {Object.entries(stepBreakdown).length === 0 && !demandLoad && (
              <div style={{ fontSize: 13, color: T.muted, textAlign: 'center', paddingTop: 20 }}>No data</div>
            )}
            {Object.entries(stepBreakdown).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
              const pct   = totalPaxOut ? Math.round(count / totalPaxOut * 100) : 0
              const isTop = label === topDropStep
              return (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{label}</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: T.text }}>{count}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: T.surface2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: isTop ? '#DC2626' : T.topBg, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{pct}% of pax out</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>Pax Out Log</div>
            <div style={{ fontSize: 12, color: T.muted }}>{demandData.length} entries</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 0.7fr', padding: '8px 18px', borderBottom: '1px solid ' + T.surface }}>
            {['Date','Branch','Step','Count'].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
            ))}
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {!demandLoad && demandData.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>No pax-out events recorded</div>
            ) : demandData.map((e, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 0.7fr', padding: '11px 18px', borderBottom: '1px solid ' + T.surface, alignItems: 'center' }}
                onMouseEnter={ev => ev.currentTarget.style.background = T.bg}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.muted }}>{e.date}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>{e.branch_name || '—'}</div>
                <div style={{ fontSize: 12, color: e.step_label ? T.text : T.muted, fontStyle: e.step_label ? 'normal' : 'italic' }}>{e.step_label ?? '—'}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{e.count}</div>
              </div>
            ))}
          </div>
        </div>
      </>}

      {/* ── DELAY REPORT TAB ── */}
      {activeTab === 'delay' && <>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Incidents', value: totalIncidents,    accent: T.text    },
            { label: 'Avg Delay',       value: avgDelay + ' min', accent: '#D97706' },
            { label: 'Flagged',         value: flaggedCount,      accent: '#DC2626' },
            { label: 'Resolved',        value: resolvedCount,     accent: '#16A34A' },
          ].map((k, i) => (
            <div key={k.label} className="admin-card" style={{ padding: '18px 20px', animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: k.accent, lineHeight: 1 }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 1.5fr 0.7fr 0.7fr 0.7fr 0.5fr 0.8fr 0.7fr', padding: '10px 18px', borderBottom: '1px solid ' + T.surface }}>
            {['Date','Barber','Booking','Scheduled','Started','Delay','Status',''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
            ))}
          </div>
          <div style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 160, overflowY: 'auto' }}>
            {delayLoad && <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 14 }}>Loading…</div>}
            {!delayLoad && delayData.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 14 }}>No delay incidents for this period</div>
            )}
            {delayData.map(d => {
              const isFlagged = !resolvedIds.has(d.id)
              const delayMin  = Math.round(Number(d.delay_minutes || 0))
              return (
                <div key={d.id}
                  style={{ display: 'grid', gridTemplateColumns: '0.6fr 1.5fr 0.7fr 0.7fr 0.7fr 0.5fr 0.8fr 0.7fr', padding: '12px 18px', borderBottom: '1px solid ' + T.surface, alignItems: 'center', background: isFlagged ? '#FFFBEB' : 'transparent' }}
                  onMouseEnter={e => { if (!isFlagged) e.currentTarget.style.background = T.bg }}
                  onMouseLeave={e => { if (!isFlagged) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ fontSize: 12, color: T.muted }}>{d.date}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{d.barber_name}</div>
                  <div style={{ fontSize: 12, color: T.muted, fontFamily: 'monospace' }}>{d.booking_number}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{d.slot_time}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.muted }}>—</div>
                  <div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: delayMin >= 20 ? '#DC2626' : delayMin >= 10 ? '#D97706' : T.text }}>
                      +{delayMin}m
                    </span>
                  </div>
                  <div>
                    {isFlagged
                      ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#FEF2F2', color: '#DC2626' }}>Flagged</span>
                      : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#F0FDF4', color: '#16A34A' }}>Resolved</span>
                    }
                  </div>
                  <div>
                    {isFlagged && (
                      <button onClick={() => setResolvedIds(s => new Set([...s, d.id]))}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #16A34A', background: 'transparent', color: '#16A34A', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: T.muted }}>
          Incidents auto-generated when actual start exceeds scheduled time by more than 5 minutes.
        </div>
      </>}

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab === 'transactions' && (() => {
        const txTotal     = txData.reduce((s, r) => s + Number(r.total_amount || 0), 0)
        const txTipsTotal = txData.reduce((s, r) => s + Number(r.tip || 0), 0)
        const txCommTotal = txData.reduce((s, r) => {
          const svcs = Array.isArray(r.services) ? r.services : []
          return s + svcs.reduce((a, sv) => a + Number(sv.commission || 0), 0)
        }, 0)

        // Date | Booking | Scheduled | Started | Ended | Client | Phone | Barber | Service | Rate | Commission | Amount | Tip
        const COL  = '0.75fr 0.65fr 0.5fr 0.5fr 0.5fr 1fr 0.85fr 0.9fr 1.1fr 0.4fr 0.8fr 0.85fr 0.5fr'
        const HDRS = ['Date', 'Booking', 'Scheduled', 'Started', 'Ended', 'Client', 'Phone', 'Barber', 'Service', 'Rate', 'Commission', 'Amount', 'Tip']

        function toggleTx(id) {
          setExpandedTx(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
        }

        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Transactions', value: txData.length,      accent: T.text    },
                { label: 'Total Revenue',       value: fmtM(txTotal),      accent: '#16A34A' },
                { label: 'Total Commission',    value: fmtM(txCommTotal),  accent: '#D97706' },
                { label: 'Tips Collected',      value: fmtM(txTipsTotal),  accent: '#9333EA' },
              ].map((k, i) => (
                <div key={k.label} className="admin-card" style={{ padding: '18px 20px', animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 24, color: k.accent, lineHeight: 1 }}>{k.value}</div>
                </div>
              ))}
            </div>

            <div className="admin-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>Transaction Detail</div>
                <div style={{ fontSize: 12, color: T.muted }}>{txData.length} transactions · click multi-service rows to expand</div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '10px 18px', borderBottom: '2px solid ' + T.border, background: T.bg, minWidth: 1000, position: 'sticky', top: 0, zIndex: 2 }}>
                  {HDRS.map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: i === 9 ? '#D97706' : i === 11 ? T.text : T.muted }}>{h}</div>
                  ))}
                </div>

                <div style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 160, overflowY: 'auto', minWidth: 1000 }}>
                  {txLoad && <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 14 }}>Loading…</div>}
                  {!txLoad && txData.length === 0 && (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 14 }}>No completed transactions for this period</div>
                  )}
                  {txData.map(r => {
                    const svcs       = Array.isArray(r.services) ? r.services : []
                    const extras     = Array.isArray(r.extras) ? r.extras : []
                    const isExpanded = expandedTx.has(r.id)
                    const multiSvc   = svcs.length > 1
                    const hasExtras  = extras.length > 0
                    const sv0        = svcs[0]
                    const svcLabel   = svcs.length === 0 ? '—'
                      : svcs.length === 1 ? sv0.service_name
                      : svcs.length === 2 ? `${svcs[0].service_name} · ${svcs[1].service_name}`
                      : `${svcs[0].service_name} · ${svcs[1].service_name} +${svcs.length - 2}`
                    const extrasLabel = extras.map(e => e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name).join(', ')
                    const rowComm    = svcs.reduce((a, sv) => a + Number(sv.commission || 0), 0)
                    const rowRate    = !multiSvc && sv0 ? sv0.commission_rate : null
                    const canExpand  = multiSvc || hasExtras

                    return (
                      <div key={r.id}>
                        {/* Main booking row */}
                        <div
                          onClick={() => canExpand && toggleTx(r.id)}
                          style={{ display: 'grid', gridTemplateColumns: COL, padding: '12px 18px', borderBottom: '1px solid ' + T.surface, alignItems: 'center', cursor: canExpand ? 'pointer' : 'default', background: isExpanded ? T.surface : 'transparent', transition: 'background 0.1s' }}
                          onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = T.bg }}
                          onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}>

                          <div style={{ fontSize: 11, fontWeight: 600, color: T.text2, whiteSpace: 'nowrap' }}>
                            {r.date ? new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {canExpand && <span style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>{isExpanded ? '▼' : '▶'}</span>}
                            <span style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace' }}>{r.booking_number || '—'}</span>
                          </div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.muted }}>{r.time_scheduled || '—'}</div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: r.time_started ? T.text2 : T.muted }}>{r.time_started || '—'}</div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: r.time_ended ? T.text2 : T.muted }}>{r.time_ended || '—'}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>{r.customer_name || '—'}</div>
                          <div style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>{r.customer_phone || '—'}</div>
                          <div style={{ fontSize: 12, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>{r.barber_name || '—'}</div>
                          <div style={{ overflow: 'hidden', paddingRight: 6 }}>
                            <div style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svcLabel}</div>
                            {hasExtras && <div style={{ fontSize: 10, color: '#9333EA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{extrasLabel}</div>}
                          </div>

                          {/* Rate — show for single-service; "mix" badge for multi */}
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: T.text2 }}>
                            {multiSvc
                              ? <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: T.surface, color: T.muted }}>mix</span>
                              : rowRate != null ? `${Number(rowRate).toFixed(0)}%` : '—'}
                          </div>

                          {/* Commission */}
                          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#D97706' }}>
                            {rowComm > 0 ? fmtM(rowComm) : '—'}
                          </div>

                          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: T.text }}>{fmtM(r.total_amount)}</div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: Number(r.tip) > 0 ? '#9333EA' : T.muted }}>{Number(r.tip) > 0 ? fmtM(r.tip) : '—'}</div>
                        </div>

                        {/* Expanded per-service rows */}
                        {isExpanded && svcs.map((sv, si) => (
                          <div key={si} style={{ display: 'grid', gridTemplateColumns: COL, padding: '8px 18px 8px 32px', borderBottom: '1px dashed ' + T.surface, background: '#FAFAF9', alignItems: 'center' }}>
                            <div /><div /><div /><div /><div /><div /><div /><div />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{sv.service_name}</div>
                              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{fmtM(sv.price)}</div>
                            </div>
                            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: T.text2 }}>
                              {sv.commission_rate != null ? `${Number(sv.commission_rate).toFixed(0)}%` : '—'}
                            </div>
                            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#D97706' }}>
                              {sv.commission != null ? fmtM(sv.commission) : '—'}
                            </div>
                            <div /><div />
                          </div>
                        ))}
                        {/* Expanded extras rows */}
                        {isExpanded && extras.map((ex, ei) => (
                          <div key={'ex' + ei} style={{ display: 'grid', gridTemplateColumns: COL, padding: '8px 18px 8px 32px', borderBottom: ei < extras.length - 1 ? '1px dashed ' + T.surface : '2px solid ' + T.border, background: '#FAF8FF', alignItems: 'center' }}>
                            <div /><div /><div /><div /><div /><div /><div /><div />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#9333EA' }}>{ex.name}{ex.quantity > 1 ? ` ×${ex.quantity}` : ''}</div>
                              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{fmtM(ex.price)}</div>
                            </div>
                            <div style={{ fontSize: 10, color: T.muted }}>add-on</div>
                            <div />
                            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#9333EA' }}>{fmtM(ex.price * ex.quantity)}</div>
                            <div />
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── BARBER PERFORMANCE TAB ── */}
      {activeTab === 'performance' && <>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Services',    value: perfTotal.services,       accent: T.text,    sub: 'This period'        },
            { label: 'Revenue Generated', value: fmtM(perfTotal.revenue),  accent: '#16A34A', sub: 'From all barbers'   },
            { label: 'Tips Collected',    value: fmtM(perfTotal.tips),     accent: '#2563EB', sub: 'Individual, not pooled' },
          ].map((k, i) => (
            <div key={k.label} className="admin-card" style={{ padding: '18px 20px', animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 24, color: k.accent, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="admin-card" style={{ overflow: 'hidden', marginBottom: selectedBarber ? 16 : 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>Barber Rankings</div>
            <div style={{ fontSize: 12, color: T.muted }}>Click a barber to see their transactions</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '0.3fr 1.6fr 0.7fr 1fr 0.9fr 0.7fr 0.8fr', padding: '10px 18px', borderBottom: '1px solid ' + T.surface }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted }}>#</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted }}>Barber</div>
            <SortHeader label="Services"   sortKey="booking_count"     />
            <SortHeader label="Revenue"    sortKey="total_revenue"     />
            <SortHeader label="Avg Ticket" sortKey="avg_booking_value" />
            <SortHeader label="Rating"     sortKey="avg_rating"        />
            <SortHeader label="Tips"       sortKey="tips_total"        />
          </div>
          {barbersLoad && <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 14 }}>Loading…</div>}
          {!barbersLoad && barbers.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 14 }}>No barber data for this period</div>
          )}
          {sortedBarbers.map((b, i) => {
            const isSelected = selectedBarber?.id === b.id
            return (
              <div key={b.id}
                onClick={() => setSelectedBarber(isSelected ? null : b)}
                style={{ display: 'grid', gridTemplateColumns: '0.3fr 1.6fr 0.7fr 1fr 0.9fr 0.7fr 0.8fr', padding: '13px 18px', borderBottom: '1px solid ' + T.surface, alignItems: 'center', cursor: 'pointer', background: isSelected ? T.surface : 'transparent', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bg }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 13, color: i === 0 ? '#D97706' : T.muted }}>{i + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: T.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 10, color: T.accent }}>{initials(b.name)}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: T.text }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{b.branch_name || ''}</div>
                  </div>
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{b.booking_count || 0}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#16A34A' }}>{fmtM(b.total_revenue)}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, color: T.text2 }}>{fmtM(b.avg_booking_value)}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, color: '#D97706' }}>{b.avg_rating ? Number(b.avg_rating).toFixed(1) + ' ★' : '—'}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, color: '#2563EB' }}>{fmtM(b.tips_total)}</div>
              </div>
            )
          })}
        </div>

        {selectedBarber && (
          <div className="admin-card" style={{ overflow: 'hidden', animation: 'fadeUp 0.18s ease both' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.topBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 11, color: T.accent }}>{initials(selectedBarber.name)}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>{selectedBarber.name}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>Transaction Log</div>
                </div>
              </div>
              <button onClick={() => setSelectedBarber(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: T.muted, cursor: 'pointer', padding: 4 }}>×</button>
            </div>

            <div style={{ padding: '12px 18px', borderBottom: '1px solid ' + T.surface, display: 'flex', gap: 28 }}>
              {[
                { label: 'Transactions', value: barberTx.length,  color: T.text    },
                { label: 'Revenue',      value: fmtM(txRevenue),  color: '#16A34A' },
                { label: 'Tips',         value: fmtM(txTips),     color: '#2563EB' },
              ].map(k => (
                <div key={k.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted }}>{k.label}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, color: k.color, marginTop: 2 }}>{k.value}</div>
                </div>
              ))}
            </div>

            {(() => {
              const breakdown = barberTx.reduce((acc, r) => {
                const svcs = Array.isArray(r.services) ? r.services : []
                svcs.forEach(svc => {
                  if (!acc[svc]) acc[svc] = { count: 0 }
                  acc[svc].count++
                })
                return acc
              }, {})
              const rows = Object.entries(breakdown).sort((a, b) => b[1].count - a[1].count)
              if (!rows.length) return null
              return (
                <div style={{ padding: '12px 18px', borderBottom: '1px solid ' + T.surface, background: T.bg, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginRight: 4 }}>Services</span>
                  {rows.map(([svc, s]) => (
                    <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: T.white, border: '1px solid ' + T.border }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{svc}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{s.count}×</span>
                    </div>
                  ))}
                </div>
              )
            })()}

            <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 0.5fr 0.85fr 1.1fr 2fr 0.55fr 0.9fr 0.6fr', padding: '8px 18px', borderBottom: '1px solid ' + T.surface }}>
              {['Date','Time','Booking','Customer','Service','Method','Amount','Tip'].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
              ))}
            </div>

            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {barberTxLoad && <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>}
              {!barberTxLoad && barberTx.length === 0 && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>No transactions found</div>
              )}
              {barberTx.map((r, i) => {
                const svcs = Array.isArray(r.services) ? r.services.join(', ') : '—'
                return (
                  <div key={r.id || i} style={{ display: 'grid', gridTemplateColumns: '0.6fr 0.5fr 0.85fr 1.1fr 2fr 0.55fr 0.9fr 0.6fr', padding: '11px 18px', borderBottom: i < barberTx.length - 1 ? '1px solid ' + T.surface : 'none', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontSize: 11, color: T.muted }}>{r.date}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.muted }}>{r.slot_time}</div>
                    <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace' }}>{r.booking_number}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>{r.customer_name}</div>
                    <div style={{ fontSize: 12, color: T.muted, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svcs}</div>
                    <div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: r.payment_method === 'qris' ? T.topBg : '#EFF6FF', color: r.payment_method === 'qris' ? T.accent : '#2563EB', border: r.payment_method !== 'qris' ? '1px solid #BFDBFE' : 'none' }}>
                        {(r.payment_method || '').toUpperCase() || '—'}
                      </span>
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: T.text }}>{fmtM(r.total_amount)}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: Number(r.tip) > 0 ? '#2563EB' : T.muted }}>{Number(r.tip) > 0 ? fmtM(r.tip) : '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </>}

    </div>
  )
}
