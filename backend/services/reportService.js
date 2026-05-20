const pool = require('../config/db')
const { sendWhatsApp } = require('./notifications')

function formatRupiah(amount) {
  const n = Math.round(Number(amount) || 0)
  return 'Rp.' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function fillTemplate(template, vars) {
  if (!template) return ''
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : ''))
}

async function generateClosingReportData(branch_id, date) {
  const { rows: paxRows } = await pool.query(
    `SELECT COUNT(*) AS total_pax FROM bookings
     WHERE branch_id = $1 AND status = 'completed'
       AND DATE(scheduled_at AT TIME ZONE 'Asia/Makassar') = $2`,
    [branch_id, date]
  )
  const total_pax = parseInt(paxRows[0].total_pax) || 0

  const { rows: salesRows } = await pool.query(
    `SELECT
       COALESCE(SUM(
         (SELECT COALESCE(SUM(bs.price_charged), 0) FROM booking_services bs WHERE bs.booking_id = b.id)
         + (SELECT COALESCE(SUM(be.price * be.quantity), 0) FROM booking_extras be WHERE be.booking_id = b.id)
         - b.points_redeemed * 100
       ), 0) AS total_penjualan
     FROM bookings b
     WHERE b.branch_id = $1 AND b.status = 'completed'
       AND DATE(b.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2`,
    [branch_id, date]
  )
  const total_penjualan = parseFloat(salesRows[0].total_penjualan) || 0

  const { rows: pmRows } = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN b.payment_method = 'cash' THEN
         (SELECT COALESCE(SUM(bs.price_charged), 0) FROM booking_services bs WHERE bs.booking_id = b.id)
         + (SELECT COALESCE(SUM(be.price * be.quantity), 0) FROM booking_extras be WHERE be.booking_id = b.id)
         - b.points_redeemed * 100
       END), 0) AS cash,
       COALESCE(SUM(CASE WHEN b.payment_method IN ('card','manual') THEN
         (SELECT COALESCE(SUM(bs.price_charged), 0) FROM booking_services bs WHERE bs.booking_id = b.id)
         + (SELECT COALESCE(SUM(be.price * be.quantity), 0) FROM booking_extras be WHERE be.booking_id = b.id)
         - b.points_redeemed * 100
       END), 0) AS card,
       COALESCE(SUM(CASE WHEN b.payment_method = 'qris' THEN
         (SELECT COALESCE(SUM(bs.price_charged), 0) FROM booking_services bs WHERE bs.booking_id = b.id)
         + (SELECT COALESCE(SUM(be.price * be.quantity), 0) FROM booking_extras be WHERE be.booking_id = b.id)
         - b.points_redeemed * 100
       END), 0) AS qr
     FROM bookings b
     WHERE b.branch_id = $1 AND b.status = 'completed'
       AND DATE(b.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2`,
    [branch_id, date]
  )
  const cash = parseFloat(pmRows[0].cash) || 0
  const card = parseFloat(pmRows[0].card) || 0
  const qr   = parseFloat(pmRows[0].qr)   || 0

  const { rows: tipRows } = await pool.query(
    `SELECT COALESCE(SUM(t.amount), 0) AS tip
     FROM tips t
     JOIN bookings b ON b.id = t.booking_id
     WHERE t.branch_id = $1
       AND DATE(b.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2`,
    [branch_id, date]
  )
  const tip = parseFloat(tipRows[0].tip) || 0

  const { rows: allSoldRows } = await pool.query(
    `SELECT ii.name, SUM(im.quantity) AS qty
     FROM inventory_movements im
     JOIN inventory_items ii ON ii.id = im.item_id
     WHERE im.branch_id = $1
       AND im.movement_type = 'out'
       AND DATE(im.created_at AT TIME ZONE 'Asia/Makassar') = $2
       AND ii.category IN ('beverage','product')
     GROUP BY ii.name ORDER BY ii.name`,
    [branch_id, date]
  )
  const items_sold = allSoldRows.length
    ? allSoldRows.map(r => `- ${r.name} ${r.qty}`).join('\n')
    : '-'

  const { rows: bevSoldRows } = await pool.query(
    `SELECT ii.name, SUM(im.quantity) AS qty
     FROM inventory_movements im
     JOIN inventory_items ii ON ii.id = im.item_id
     WHERE im.branch_id = $1
       AND im.movement_type = 'out'
       AND DATE(im.created_at AT TIME ZONE 'Asia/Makassar') = $2
       AND ii.category = 'beverage'
     GROUP BY ii.name ORDER BY ii.name`,
    [branch_id, date]
  )
  const beverages_sold = bevSoldRows.length
    ? bevSoldRows.map(r => `- ${r.name} ${r.qty}`).join('\n')
    : '-'

  const { rows: bevStockRows } = await pool.query(
    `SELECT ii.name, ist.current_stock
     FROM inventory_stock ist
     JOIN inventory_items ii ON ii.id = ist.item_id
     WHERE ist.branch_id = $1
       AND ii.category = 'beverage'
     ORDER BY ii.name`,
    [branch_id]
  )
  const beverages_stock = bevStockRows.length
    ? bevStockRows.map(r => `- ${r.name} ${r.current_stock}`).join('\n')
    : '-'

  const { rows: stySoldRows } = await pool.query(
    `SELECT ii.name, SUM(im.quantity) AS qty
     FROM inventory_movements im
     JOIN inventory_items ii ON ii.id = im.item_id
     WHERE im.branch_id = $1
       AND im.movement_type = 'out'
       AND DATE(im.created_at AT TIME ZONE 'Asia/Makassar') = $2
       AND ii.category = 'product'
     GROUP BY ii.name ORDER BY ii.name`,
    [branch_id, date]
  )
  const styling_sold = stySoldRows.length
    ? stySoldRows.map(r => `- ${r.name} ${r.qty}`).join('\n')
    : '-'

  const { rows: styStockRows } = await pool.query(
    `SELECT ii.name, ist.current_stock
     FROM inventory_stock ist
     JOIN inventory_items ii ON ii.id = ist.item_id
     WHERE ist.branch_id = $1
       AND ii.category = 'product'
     ORDER BY ii.name`,
    [branch_id]
  )
  const styling_stock = styStockRows.length
    ? styStockRows.map(r => `- ${r.name} ${r.current_stock}`).join('\n')
    : '-'

  return {
    total_pax,
    total_penjualan,
    cash,
    card,
    qr,
    tip,
    items_sold,
    beverages_sold,
    beverages_stock,
    styling_sold,
    styling_stock,
  }
}

async function generateMonitoringReportData(branch_id, date) {
  const { rows: paxRows } = await pool.query(
    `SELECT COUNT(*) AS total_pax FROM bookings
     WHERE branch_id = $1 AND status = 'completed'
       AND DATE(scheduled_at AT TIME ZONE 'Asia/Makassar') = $2`,
    [branch_id, date]
  )
  const total_pax = parseInt(paxRows[0].total_pax) || 0

  const { rows: svcRows } = await pool.query(
    `SELECT s.name AS service_name, COUNT(*) AS cnt
     FROM booking_services bs
     JOIN bookings b ON b.id = bs.booking_id
     JOIN services s ON s.id = bs.service_id
     WHERE b.branch_id = $1 AND b.status = 'completed'
       AND DATE(b.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
     GROUP BY s.name ORDER BY cnt DESC, s.name`,
    [branch_id, date]
  )
  const services_breakdown = svcRows.length
    ? svcRows.map(r => `- ${r.service_name} ${r.cnt}x`).join('\n')
    : '-'

  return { total_pax, services_breakdown }
}

async function sendClosingReport(branch_id, ws, branchName, date) {
  if (!ws.closing_report_enabled || !ws.tpl_closing_report) return
  const data = await generateClosingReportData(branch_id, date)

  const { rows: psRows } = await pool.query('SELECT ot_commission_enabled, ot_threshold_time FROM payroll_settings LIMIT 1')
  const ps = psRows[0] || {}
  let notes = ''
  if (ps.ot_commission_enabled) {
    const otThreshold = String(ps.ot_threshold_time || '19:00').slice(0, 5)
    const { rows: otRows } = await pool.query(
      `SELECT u.name AS barber_name,
              TO_CHAR(MIN(COALESCE(bk.started_at, bk.scheduled_at)) AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS first_start,
              TO_CHAR(MAX(COALESCE(bk.completed_at, bk.started_at, bk.scheduled_at)) AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS last_end,
              STRING_AGG(DISTINCT s.name, ' + ' ORDER BY s.name) AS service_names
       FROM bookings bk
       JOIN users u ON u.id = bk.barber_id
       JOIN booking_services bs ON bs.booking_id = bk.id
       JOIN services s ON s.id = bs.service_id
       WHERE bk.branch_id = $1
         AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') = $2
         AND bk.status = 'completed'
         AND TO_CHAR(COALESCE(bk.started_at, bk.scheduled_at) AT TIME ZONE 'Asia/Makassar', 'HH24:MI') >= $3
       GROUP BY u.id, u.name
       ORDER BY u.name`,
      [branch_id, date, otThreshold]
    )
    if (otRows.length > 0) {
      const lines = otRows.map(r => `${r.barber_name} lembur ${r.service_names} dari jam ${r.first_start} sampai jam ${r.last_end}`)
      notes = 'Notes:\n' + lines.join('\n')
    }
  }

  const vars = {
    branch: branchName,
    date,
    total_pax: data.total_pax,
    total_penjualan: formatRupiah(data.total_penjualan),
    cash: formatRupiah(data.cash),
    card: formatRupiah(data.card),
    qr: formatRupiah(data.qr),
    tip: formatRupiah(data.tip),
    items_sold: data.items_sold,
    beverages_sold: data.beverages_sold,
    beverages_stock: data.beverages_stock,
    styling_sold: data.styling_sold,
    styling_stock: data.styling_stock,
    notes,
  }
  const message = fillTemplate(ws.tpl_closing_report, vars)
  if (ws.closing_group_1) await sendWhatsApp(ws.closing_group_1, message, ws.fonnte_token)
  if (ws.closing_group_2) await sendWhatsApp(ws.closing_group_2, message, ws.fonnte_token)
}

async function sendMonitoringReport(branch_id, ws, branchName, date) {
  if (!ws.monitoring_report_enabled || !ws.tpl_monitoring_report) return
  const data = await generateMonitoringReportData(branch_id, date)
  const vars = {
    branch: branchName,
    date,
    total_pax: data.total_pax,
    services_breakdown: data.services_breakdown,
  }
  const message = fillTemplate(ws.tpl_monitoring_report, vars)
  if (ws.monitoring_group_1) await sendWhatsApp(ws.monitoring_group_1, message, ws.fonnte_token)
  if (ws.monitoring_group_2) await sendWhatsApp(ws.monitoring_group_2, message, ws.fonnte_token)
}

async function checkAndFireReports(branch_id) {
  try {
    const { rows: wRows } = await pool.query('SELECT * FROM whatsapp_settings LIMIT 1')
    const ws = wRows[0]
    if (!ws || !ws.enabled) return

    const today = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Makassar' }).split(',')[0]

    const tParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
    const currentTime = tParts.find(p => p.type === 'hour').value + ':' + tParts.find(p => p.type === 'minute').value

    const closingTime = ws.closing_time
      ? String(ws.closing_time).slice(0, 5)
      : '21:00'

    if (currentTime < closingTime) return

    const { rows: activeRows } = await pool.query(
      `SELECT id FROM attendance
       WHERE branch_id = $1
         AND DATE(clock_in_at AT TIME ZONE 'Asia/Makassar') = $2
         AND clock_out_at IS NULL`,
      [branch_id, today]
    )
    if (activeRows.length > 0) return

    const { rows: anyRows } = await pool.query(
      `SELECT id FROM attendance
       WHERE branch_id = $1
         AND DATE(clock_in_at AT TIME ZONE 'Asia/Makassar') = $2
       LIMIT 1`,
      [branch_id, today]
    )
    if (anyRows.length === 0) return

    const { rows: branchRows } = await pool.query(
      'SELECT id, name, closing_report_sent_date, monitoring_report_sent_date FROM branches WHERE id = $1',
      [branch_id]
    )
    if (!branchRows.length) return
    const branch = branchRows[0]

    const { rows: claimedClosing } = await pool.query(
      `UPDATE branches SET closing_report_sent_date = $1
       WHERE id = $2 AND (closing_report_sent_date IS NULL OR closing_report_sent_date < $1)
       RETURNING id`,
      [today, branch_id]
    )
    if (claimedClosing.length > 0) {
      await sendClosingReport(branch_id, ws, branch.name, today)
    }

    const { rows: claimedMonitoring } = await pool.query(
      `UPDATE branches SET monitoring_report_sent_date = $1
       WHERE id = $2 AND (monitoring_report_sent_date IS NULL OR monitoring_report_sent_date < $1)
       RETURNING id`,
      [today, branch_id]
    )
    if (claimedMonitoring.length > 0) {
      await sendMonitoringReport(branch_id, ws, branch.name, today)
    }
  } catch (e) {
    console.error('[ReportService] checkAndFireReports error:', e.message)
  }
}

module.exports = {
  checkAndFireReports,
  sendClosingReport,
  sendMonitoringReport,
  generateClosingReportData,
  generateMonitoringReportData,
}
