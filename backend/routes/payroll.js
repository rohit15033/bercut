const router   = require('express').Router()
const pool     = require('../config/db')
const ExcelJS  = require('exceljs')
const { requireAdmin, requireOwner } = require('../middleware/auth')

// GET /api/payroll/periods?branch_id=
router.get('/periods', requireAdmin, async (req, res) => {
  try {
    const { branch_id } = req.query
    const conds = branch_id ? ['branch_id = $1 OR branch_id IS NULL'] : []
    const vals  = branch_id ? [branch_id] : []
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT * FROM payroll_periods ${where} ORDER BY period_from DESC`, vals)
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/payroll/periods/generate
router.post('/periods/generate', requireAdmin, requireOwner, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { branch_id, period_month, period_from, period_to } = req.body
    if (!period_month || !period_from || !period_to) {
      return res.status(400).json({ message: 'period_month, period_from, period_to required' })
    }

    const periodInsert = await client.query(
      `INSERT INTO payroll_periods (branch_id, period_month, period_from, period_to, generated_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT DO NOTHING RETURNING *`,
      [branch_id || null, period_month, period_from, period_to, req.user.id])
    if (!periodInsert.rows.length) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Period already exists' })
    }
    const period = periodInsert.rows[0]

    const ps = await client.query('SELECT * FROM payroll_settings LIMIT 1')
    const cfg = ps.rows[0] || {}
    const lateDeductPerMin       = parseInt(cfg.late_deduction_per_minute || 2000)
    const lateGrace              = parseInt(cfg.late_grace_period_minutes  || 5)
    const inexcusedFlatDeduct    = parseInt(cfg.inexcused_off_flat_deduction || 150000)
    const excusedFlatDeduct      = parseInt(cfg.excused_off_flat_deduction   || 150000)
    const otEnabled              = cfg.ot_commission_enabled || false
    const otThresholdTime        = cfg.ot_threshold_time || '19:00'
    const otBonusPct             = parseFloat(cfg.ot_bonus_pct || 5)
    const workingDaysStd         = Math.round(parseFloat(cfg.working_days_per_week || 6) * 52 / 12)

    // shift start assumed 09:00 WITA — no branch-level config
    const SHIFT_START = '09:00'

    const barberCond = branch_id
      ? 'WHERE branch_id = $1 AND is_active = true'
      : 'WHERE is_active = true'
    const barbers = await client.query(
      `SELECT * FROM barbers ${barberCond}`, branch_id ? [branch_id] : [])

    for (const barber of barbers.rows) {
      const targetBranchId = barber.branch_id

      // Attendance: clock-ins within period
      const attRows = await client.query(
        `SELECT clock_in_at AT TIME ZONE 'Asia/Makassar' AS clock_in_local,
                DATE(clock_in_at AT TIME ZONE 'Asia/Makassar') AS work_date
         FROM attendance
         WHERE barber_id = $1
           AND DATE(clock_in_at AT TIME ZONE 'Asia/Makassar') BETWEEN $2 AND $3`,
        [barber.id, period_from, period_to])

      const workedDays = attRows.rows.length
      let totalLateMinutes = 0
      for (const att of attRows.rows) {
        const shiftMins = parseInt(SHIFT_START.split(':')[0]) * 60 + parseInt(SHIFT_START.split(':')[1])
        const cinLocal = new Date(att.clock_in_local)
        const cinMins  = cinLocal.getHours() * 60 + cinLocal.getMinutes()
        const late = Math.max(0, cinMins - shiftMins - lateGrace)
        totalLateMinutes += late
      }

      // Off records in period
      const offRows = await client.query(
        `SELECT type FROM off_records WHERE barber_id = $1 AND date BETWEEN $2 AND $3`,
        [barber.id, period_from, period_to])
      const inexcusedDays = offRows.rows.filter(r => r.type === 'inexcused').length
      const excusedDays   = offRows.rows.filter(r => r.type === 'excused').length

      // Bookings: regular vs OT (by scheduled time)
      const bkRows = await client.query(
        `SELECT
           EXTRACT(EPOCH FROM (
             COALESCE((SELECT SUM(price_charged) FROM booking_services WHERE booking_id = bk.id), 0) +
             COALESCE((SELECT SUM(price * quantity) FROM booking_extras WHERE booking_id = bk.id), 0) -
             bk.points_redeemed * 100
           )) AS total_amount,
           TO_CHAR(bk.scheduled_at AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time
         FROM bookings bk
         WHERE bk.barber_id = $1
           AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') BETWEEN $2 AND $3
           AND bk.status = 'completed'`,
        [barber.id, period_from, period_to])

      let grossRevReg = 0, grossRevOt = 0
      for (const bk of bkRows.rows) {
        const isOt = otEnabled && bk.slot_time >= otThresholdTime
        const amt = Math.max(0, parseFloat(bk.total_amount || 0))
        if (isOt) grossRevOt += amt; else grossRevReg += amt
      }
      const grossRevTotal = grossRevReg + grossRevOt
      const commRate = parseFloat(barber.commission_rate || 40) / 100
      const commRegular = Math.round(grossRevReg * commRate)
      const commOt      = Math.round(grossRevOt  * commRate * (1 + otBonusPct / 100))

      // Tips
      const tipsResult = await client.query(
        `SELECT COALESCE(SUM(t.amount), 0) AS total FROM tips t
         JOIN bookings bk ON bk.id = t.booking_id
         WHERE t.barber_id = $1
           AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') BETWEEN $2 AND $3`,
        [barber.id, period_from, period_to])
      const totalTips = parseInt(tipsResult.rows[0].total)

      // Base salary from barber record
      const baseSalary = parseInt(barber.base_salary || 0)

      // Deductions
      const lateDeduction     = totalLateMinutes * lateDeductPerMin
      const inexcusedDeduct   = inexcusedDays * inexcusedFlatDeduct
      const excusedDeduct     = excusedDays   * excusedFlatDeduct

      // Kasbon from payroll_adjustments (if any existing entry)
      let kasbonTotal = 0
      const existingEntry = await client.query(
        'SELECT id FROM payroll_entries WHERE period_id = $1 AND barber_id = $2',
        [period.id, barber.id])
      if (existingEntry.rows.length) {
        const adjRes = await client.query(
          `SELECT COALESCE(SUM(amount),0) AS total FROM payroll_adjustments
           WHERE payroll_entry_id = $1 AND is_kasbon = true`, [existingEntry.rows[0].id])
        kasbonTotal = parseInt(adjRes.rows[0].total)
      }

      const netPay = baseSalary + commRegular + commOt + totalTips
                   - lateDeduction - inexcusedDeduct - excusedDeduct - kasbonTotal

      await client.query(
        `INSERT INTO payroll_entries
           (period_id, barber_id, branch_id, pay_type, base_salary,
            gross_service_revenue, commission_regular, commission_ot, total_tips,
            total_late_minutes, inexcused_fixed_days, excused_fixed_days,
            working_days, late_deduction, inexcused_off_deduction, excused_off_deduction,
            kasbon_total, net_pay)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (period_id, barber_id) DO UPDATE SET
           gross_service_revenue=$6, commission_regular=$7, commission_ot=$8, total_tips=$9,
           total_late_minutes=$10, inexcused_fixed_days=$11, excused_fixed_days=$12,
           working_days=$13, late_deduction=$14, inexcused_off_deduction=$15,
           excused_off_deduction=$16, kasbon_total=$17, net_pay=$18`,
        [period.id, barber.id, targetBranchId, barber.pay_type || 'commission',
         baseSalary, Math.round(grossRevTotal), commRegular, commOt, totalTips,
         totalLateMinutes, inexcusedDays, excusedDays,
         workingDaysStd, lateDeduction, inexcusedDeduct, excusedDeduct,
         kasbonTotal, netPay])
    }

    await client.query('COMMIT')
    const entries = await pool.query(
      `SELECT pe.*, b.name AS barber_name FROM payroll_entries pe
       JOIN barbers b ON b.id = pe.barber_id
       WHERE pe.period_id = $1 ORDER BY b.name`, [period.id])
    res.status(201).json({ period, entries: entries.rows })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
})

// GET /api/payroll/periods/:id/entries
router.get('/periods/:id/entries', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pe.*, b.name AS barber_name, b.pay_type
       FROM payroll_entries pe
       JOIN barbers b ON b.id = pe.barber_id
       WHERE pe.period_id = $1 ORDER BY b.name`, [req.params.id])
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PATCH /api/payroll/entries/:id — admin manual override
router.patch('/entries/:id', requireAdmin, requireOwner, async (req, res) => {
  try {
    const allowed = ['working_days','late_deduction','inexcused_off_deduction',
      'excused_off_deduction','kasbon_total','net_pay','base_salary']
    const sets = []; const vals = []; let idx = 1
    for (const key of allowed) {
      if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); vals.push(req.body[key]) }
    }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    vals.push(req.params.id)
    const { rows } = await pool.query(
      `UPDATE payroll_entries SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals)
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/payroll/periods/:id/export — Excel
router.get('/periods/:id/export', requireAdmin, async (req, res) => {
  try {
    const period = await pool.query('SELECT * FROM payroll_periods WHERE id = $1', [req.params.id])
    if (!period.rows.length) return res.status(404).json({ message: 'Not found' })
    const p = period.rows[0]

    const { rows } = await pool.query(
      `SELECT pe.*, b.name AS barber_name FROM payroll_entries pe
       JOIN barbers b ON b.id = pe.barber_id WHERE pe.period_id = $1 ORDER BY b.name`,
      [req.params.id])

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Payroll')
    ws.columns = [
      { header: 'Barber',              key: 'barber_name',             width: 20 },
      { header: 'Pay Type',            key: 'pay_type',                width: 14 },
      { header: 'Working Days',        key: 'working_days',            width: 14 },
      { header: 'Base Salary',         key: 'base_salary',             width: 16 },
      { header: 'Service Revenue',     key: 'gross_service_revenue',   width: 18 },
      { header: 'Commission Regular',  key: 'commission_regular',      width: 20 },
      { header: 'Commission OT',       key: 'commission_ot',           width: 16 },
      { header: 'Tips',                key: 'total_tips',              width: 12 },
      { header: 'Late Minutes',        key: 'total_late_minutes',      width: 14 },
      { header: 'Late Deduction',      key: 'late_deduction',          width: 16 },
      { header: 'Inexcused Off Days',  key: 'inexcused_fixed_days',    width: 18 },
      { header: 'Inexcused Deduction', key: 'inexcused_off_deduction', width: 20 },
      { header: 'Excused Off Days',    key: 'excused_fixed_days',      width: 18 },
      { header: 'Excused Deduction',   key: 'excused_off_deduction',   width: 18 },
      { header: 'Kasbon',              key: 'kasbon_total',            width: 12 },
      { header: 'Net Pay',             key: 'net_pay',                 width: 14 }
    ]
    rows.forEach(r => ws.addRow(r))

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=payroll_${p.period_from}_${p.period_to}.xlsx`)
    await wb.xlsx.write(res)
    res.end()
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// GET /api/payroll/adjustments?payroll_entry_id=
router.get('/adjustments', requireAdmin, async (req, res) => {
  try {
    const { payroll_entry_id } = req.query
    const conds = payroll_entry_id ? ['pa.payroll_entry_id = $1'] : []
    const vals  = payroll_entry_id ? [payroll_entry_id] : []
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT pa.*, b.name AS barber_name FROM payroll_adjustments pa
       JOIN payroll_entries pe ON pe.id = pa.payroll_entry_id
       JOIN barbers b ON b.id = pe.barber_id
       ${where} ORDER BY pa.date DESC`, vals)
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// POST /api/payroll/adjustments
router.post('/adjustments', requireAdmin, requireOwner, async (req, res) => {
  try {
    const { payroll_entry_id, type, category, remarks, amount, date, is_kasbon, expense_id, deduct_period } = req.body
    if (!payroll_entry_id || !type || !amount) {
      return res.status(400).json({ message: 'payroll_entry_id, type, amount required' })
    }
    const { rows } = await pool.query(
      `INSERT INTO payroll_adjustments
         (payroll_entry_id, type, category, remarks, amount, by, date, is_kasbon, expense_id, deduct_period)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [payroll_entry_id, type, category||'', remarks||null, amount, req.user.id,
       date||null, is_kasbon||false, expense_id||null, deduct_period||'current'])
    res.status(201).json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PATCH /api/payroll/periods/:id/status
router.patch('/periods/:id/status', requireAdmin, requireOwner, async (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ['draft','reviewed','communicated']
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' })
    const setCommunicated = status === 'communicated'
      ? ', communicated_by = $2, communicated_at = NOW()' : ''
    const vals = setCommunicated ? [status, req.user.id, req.params.id] : [status, req.params.id]
    const { rows } = await pool.query(
      `UPDATE payroll_periods SET status = $1${setCommunicated} WHERE id = $${vals.length} RETURNING *`, vals)
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
