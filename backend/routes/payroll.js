const router   = require('express').Router()
const pool     = require('../config/db')
const ExcelJS  = require('exceljs')
const { requireAdmin, requireOwner, checkPermission } = require('../middleware/auth')

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
router.post('/periods/generate', requireAdmin, checkPermission('payroll'), async (req, res) => {
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
       ON CONFLICT (branch_id, period_from, period_to) DO NOTHING RETURNING *`,
      [branch_id || null, period_month, period_from, period_to, req.user.id])

    let period
    if (periodInsert.rows.length) {
      period = periodInsert.rows[0]
      await client.query(
        `UPDATE payroll_periods SET generated_at = NOW() WHERE id = $1`,
        [period.id])
    } else {
      // Period already exists — fetch it and recalculate entries
      const existing = await client.query(
        `SELECT * FROM payroll_periods
         WHERE period_from = $1 AND period_to = $2
           AND (branch_id = $3 OR (branch_id IS NULL AND $3 IS NULL))`,
        [period_from, period_to, branch_id || null])
      if (!existing.rows.length) {
        await client.query('ROLLBACK')
        return res.status(500).json({ message: 'Period conflict but not found' })
      }
      period = existing.rows[0]
      await client.query(
        `UPDATE payroll_periods SET status = 'draft', generated_at = NOW() WHERE id = $1`,
        [period.id])
    }

    const ps = await client.query('SELECT * FROM payroll_settings LIMIT 1')
    const cfg = ps.rows[0] || {}
    const lateDeductPerMin       = parseInt(cfg.late_deduction_per_minute || 2000)
    const lateGrace              = parseInt(cfg.late_grace_period_minutes  || 5)
    const inexcusedFlatDeduct    = parseInt(cfg.inexcused_off_flat_deduction || 150000)
    const excusedFlatDeduct      = parseInt(cfg.excused_off_flat_deduction   || 150000)
    const offQuotaPerWeek        = parseInt(cfg.off_quota_per_week || 1)

    const periodDays = Math.round((new Date(period_to) - new Date(period_from)) / 86400000) + 1
    const periodQuota = Math.floor(periodDays / 7) * offQuotaPerWeek
    const otEnabled              = cfg.ot_commission_enabled || false
    const otThresholdTime        = cfg.ot_threshold_time || '19:00'
    const otBonusPct             = parseFloat(cfg.ot_bonus_pct || 10)
    const otExcludedIds          = Array.isArray(cfg.ot_excluded_service_ids) ? cfg.ot_excluded_service_ids : []
    const workingDaysStd         = Math.round(parseFloat(cfg.working_days_per_week || 6) * 52 / 12)

    const barberCond = branch_id
      ? 'WHERE branch_id = $1 AND is_active = true'
      : 'WHERE is_active = true'
    const barbers = await client.query(
      `SELECT * FROM barbers ${barberCond}`, branch_id ? [branch_id] : [])

    for (const barber of barbers.rows) {
      const targetBranchId = barber.branch_id

      // One row per work-date (latest clock-in wins) — matches what Attendance screen shows
      const attRows = await client.query(
        `SELECT DISTINCT ON (DATE(clock_in_at AT TIME ZONE 'Asia/Makassar'))
           late_minutes
         FROM attendance
         WHERE barber_id = $1
           AND DATE(clock_in_at AT TIME ZONE 'Asia/Makassar') BETWEEN $2 AND $3
         ORDER BY DATE(clock_in_at AT TIME ZONE 'Asia/Makassar'), clock_in_at DESC`,
        [barber.id, period_from, period_to])

      const workedDays = attRows.rows.length
      const totalLateMinutes = attRows.rows.reduce((sum, r) => sum + (parseInt(r.late_minutes) || 0), 0)

      // Off records in period
      const offRows = await client.query(
        `SELECT type FROM off_records WHERE barber_id = $1 AND date BETWEEN $2 AND $3`,
        [barber.id, period_from, period_to])
      const inexcusedDays = offRows.rows.filter(r => r.type === 'inexcused').length
      const excusedDays   = offRows.rows.filter(r => r.type === 'excused').length

      // Bookings: regular vs OT (by scheduled time)
      // commission split per-service: excluded services always get standard rate,
      // OT-eligible services get the OT bonus when booking is after threshold
      const fallbackRate = parseFloat(barber.commission_rate || 40)
      const bkRows = await client.query(
        `SELECT
           (
             COALESCE((SELECT SUM(price_charged) FROM booking_services WHERE booking_id = bk.id), 0) +
             COALESCE((SELECT SUM(price * quantity) FROM booking_extras WHERE booking_id = bk.id), 0) -
             bk.points_redeemed * 100
           ) AS total_amount,
           COALESCE((
             SELECT SUM(bsv.price_charged * COALESCE(bsv.commission_rate, $4) / 100)
             FROM booking_services bsv
             WHERE bsv.booking_id = bk.id
               AND bsv.service_id = ANY($5::uuid[])
           ), 0) AS commission_excluded,
           COALESCE((
             SELECT SUM(bsv.price_charged * COALESCE(bsv.commission_rate, $4) / 100)
             FROM booking_services bsv
             WHERE bsv.booking_id = bk.id
               AND NOT (bsv.service_id = ANY($5::uuid[]))
           ), 0) AS commission_ot_eligible,
           COALESCE((
             SELECT SUM(bsv.price_charged)
             FROM booking_services bsv
             WHERE bsv.booking_id = bk.id
               AND NOT (bsv.service_id = ANY($5::uuid[]))
           ), 0) AS ot_eligible_revenue,
           TO_CHAR(COALESCE(bk.started_at, bk.scheduled_at) AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time
         FROM bookings bk
         WHERE bk.barber_id = $1
           AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') BETWEEN $2 AND $3
           AND bk.status = 'completed'`,
        [barber.id, period_from, period_to, fallbackRate, otExcludedIds])

      let grossRevReg = 0, grossRevOt = 0, commRegBase = 0, commOtBase = 0, otEligRevBase = 0
      for (const bk of bkRows.rows) {
        const isOt       = otEnabled && bk.slot_time >= otThresholdTime
        const amt        = Math.max(0, parseFloat(bk.total_amount || 0))
        const commExcl   = Math.max(0, parseFloat(bk.commission_excluded   || 0))
        const commOtElig = Math.max(0, parseFloat(bk.commission_ot_eligible || 0))
        const otEligRev  = Math.max(0, parseFloat(bk.ot_eligible_revenue    || 0))
        if (isOt) {
          grossRevOt    += amt
          commRegBase   += commExcl     // excluded services → always standard rate
          commOtBase    += commOtElig   // eligible services base commission
          otEligRevBase += otEligRev    // eligible service revenue for additive bonus
        } else {
          grossRevReg += amt
          commRegBase += commExcl + commOtElig   // non-OT booking → everything standard
        }
      }
      const grossRevTotal = grossRevReg + grossRevOt
      const commRegular = Math.round(commRegBase)
      // Additive: standard commission + bonus% of eligible revenue (e.g. 40%+10% = 50%)
      const commOt      = Math.round(commOtBase + otEligRevBase * otBonusPct / 100)

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
      const lateDeduction = totalLateMinutes * lateDeductPerMin

      const prorataRate = Math.round(parseInt(barber.base_salary || 0) / workingDaysStd)
      const isProrata   = barber.off_deduction_type === 'prorata'

      const inexcusedDeduct = isProrata
        ? Math.round(inexcusedDays * prorataRate)
        : inexcusedDays * inexcusedFlatDeduct

      const excusedOver   = Math.max(0, excusedDays - periodQuota)
      const excusedDeduct = isProrata
        ? Math.round(excusedOver * prorataRate)
        : excusedOver * excusedFlatDeduct

      // Kasbon total from expenses (used for net_pay calculation)
      let kasbonTotal = 0
      const kasbonResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
         WHERE type = 'kasbon' AND barber_id = $1 AND expense_date BETWEEN $2 AND $3
         AND (deduct_period = 'current' OR deduct_period IS NULL)`,
        [barber.id, period_from, period_to])
      kasbonTotal = parseInt(kasbonResult.rows[0].total)

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

      // Auto-import kasbon from expenses into payroll_adjustments
      const kasbonExpenses = await client.query(
        `SELECT * FROM expenses
         WHERE type = 'kasbon'
           AND barber_id = $1
           AND expense_date BETWEEN $2 AND $3`,
        [barber.id, period_from, period_to])

      const insertedEntry = await client.query(
        'SELECT id FROM payroll_entries WHERE period_id = $1 AND barber_id = $2',
        [period.id, barber.id])
      const entryId = insertedEntry.rows[0]?.id

      if (entryId) {
        // Delete existing auto-imported kasbon adjustments, then re-insert fresh
        await client.query(
          `DELETE FROM payroll_adjustments
           WHERE payroll_entry_id = $1 AND is_kasbon = true AND expense_id IS NOT NULL`,
          [entryId])
        for (const exp of kasbonExpenses.rows) {
          await client.query(
            `INSERT INTO payroll_adjustments
               (payroll_entry_id, type, category, remarks, amount, by, date, is_kasbon, expense_id, deduct_period)
             VALUES ($1, 'deduction', 'Kasbon', $2, $3, $4, $5, true, $6, $7)`,
            [entryId, exp.description || 'Kasbon', exp.amount, exp.submitted_by,
             exp.expense_date, exp.id, exp.deduct_period || 'current'])
        }
      }
    }

    await client.query('COMMIT')
    const updatedPeriod = await pool.query('SELECT * FROM payroll_periods WHERE id = $1', [period.id])
    const entries = await pool.query(
      `SELECT pe.*, b.name AS barber_name FROM payroll_entries pe
       JOIN barbers b ON b.id = pe.barber_id
       WHERE pe.period_id = $1 ORDER BY b.name`, [period.id])
    res.status(201).json({ period: updatedPeriod.rows[0], entries: entries.rows })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
})

// POST /api/payroll/periods/:id/regenerate
router.post('/periods/:id/regenerate', requireAdmin, checkPermission('payroll'), async (req, res) => {
  const precheck = await pool.query('SELECT * FROM payroll_periods WHERE id = $1', [req.params.id])
  if (!precheck.rows.length) return res.status(404).json({ message: 'Period not found' })
  const period = precheck.rows[0]
  if (period.status === 'communicated') {
    return res.status(403).json({ message: 'Cannot regenerate a communicated period' })
  }

  const client = await pool.connect()
  try {
    const period_from = String(period.period_from).slice(0, 10)
    const period_to   = String(period.period_to).slice(0, 10)
    const branch_id   = period.branch_id

    await client.query('BEGIN')
    await client.query(
      `UPDATE payroll_periods SET status = 'draft', generated_at = NOW() WHERE id = $1`,
      [period.id])
    await client.query('DELETE FROM payroll_entries WHERE period_id = $1', [period.id])

    const ps = await client.query('SELECT * FROM payroll_settings LIMIT 1')
    const cfg = ps.rows[0] || {}
    const lateDeductPerMin       = parseInt(cfg.late_deduction_per_minute || 2000)
    const lateGrace              = parseInt(cfg.late_grace_period_minutes  || 5)
    const inexcusedFlatDeduct    = parseInt(cfg.inexcused_off_flat_deduction || 150000)
    const excusedFlatDeduct      = parseInt(cfg.excused_off_flat_deduction   || 150000)
    const offQuotaPerWeek        = parseInt(cfg.off_quota_per_week || 1)

    const periodDays = Math.round((new Date(period_to) - new Date(period_from)) / 86400000) + 1
    const periodQuota = Math.floor(periodDays / 7) * offQuotaPerWeek
    const otEnabled              = cfg.ot_commission_enabled || false
    const otThresholdTime        = cfg.ot_threshold_time || '19:00'
    const otBonusPct             = parseFloat(cfg.ot_bonus_pct || 10)
    const otExcludedIds          = Array.isArray(cfg.ot_excluded_service_ids) ? cfg.ot_excluded_service_ids : []
    const workingDaysStd         = Math.round(parseFloat(cfg.working_days_per_week || 6) * 52 / 12)

    const barberCond = branch_id
      ? 'WHERE branch_id = $1 AND is_active = true'
      : 'WHERE is_active = true'
    const barbers = await client.query(
      `SELECT * FROM barbers ${barberCond}`, branch_id ? [branch_id] : [])

    for (const barber of barbers.rows) {
      const targetBranchId = barber.branch_id

      // One row per work-date (latest clock-in wins) — matches what Attendance screen shows
      const attRows = await client.query(
        `SELECT DISTINCT ON (DATE(clock_in_at AT TIME ZONE 'Asia/Makassar'))
           late_minutes
         FROM attendance
         WHERE barber_id = $1
           AND DATE(clock_in_at AT TIME ZONE 'Asia/Makassar') BETWEEN $2 AND $3
         ORDER BY DATE(clock_in_at AT TIME ZONE 'Asia/Makassar'), clock_in_at DESC`,
        [barber.id, period_from, period_to])

      const workedDays = attRows.rows.length
      const totalLateMinutes = attRows.rows.reduce((sum, r) => sum + (parseInt(r.late_minutes) || 0), 0)

      // Off records in period
      const offRows = await client.query(
        `SELECT type FROM off_records WHERE barber_id = $1 AND date BETWEEN $2 AND $3`,
        [barber.id, period_from, period_to])
      const inexcusedDays = offRows.rows.filter(r => r.type === 'inexcused').length
      const excusedDays   = offRows.rows.filter(r => r.type === 'excused').length

      // Bookings: regular vs OT (by scheduled time)
      // commission split per-service: excluded services always get standard rate,
      // OT-eligible services get the OT bonus when booking is after threshold
      const fallbackRate = parseFloat(barber.commission_rate || 40)
      const bkRows = await client.query(
        `SELECT
           (
             COALESCE((SELECT SUM(price_charged) FROM booking_services WHERE booking_id = bk.id), 0) +
             COALESCE((SELECT SUM(price * quantity) FROM booking_extras WHERE booking_id = bk.id), 0) -
             bk.points_redeemed * 100
           ) AS total_amount,
           COALESCE((
             SELECT SUM(bsv.price_charged * COALESCE(bsv.commission_rate, $4) / 100)
             FROM booking_services bsv
             WHERE bsv.booking_id = bk.id
               AND bsv.service_id = ANY($5::uuid[])
           ), 0) AS commission_excluded,
           COALESCE((
             SELECT SUM(bsv.price_charged * COALESCE(bsv.commission_rate, $4) / 100)
             FROM booking_services bsv
             WHERE bsv.booking_id = bk.id
               AND NOT (bsv.service_id = ANY($5::uuid[]))
           ), 0) AS commission_ot_eligible,
           COALESCE((
             SELECT SUM(bsv.price_charged)
             FROM booking_services bsv
             WHERE bsv.booking_id = bk.id
               AND NOT (bsv.service_id = ANY($5::uuid[]))
           ), 0) AS ot_eligible_revenue,
           TO_CHAR(COALESCE(bk.started_at, bk.scheduled_at) AT TIME ZONE 'Asia/Makassar', 'HH24:MI') AS slot_time
         FROM bookings bk
         WHERE bk.barber_id = $1
           AND DATE(bk.scheduled_at AT TIME ZONE 'Asia/Makassar') BETWEEN $2 AND $3
           AND bk.status = 'completed'`,
        [barber.id, period_from, period_to, fallbackRate, otExcludedIds])

      let grossRevReg = 0, grossRevOt = 0, commRegBase = 0, commOtBase = 0, otEligRevBase = 0
      for (const bk of bkRows.rows) {
        const isOt       = otEnabled && bk.slot_time >= otThresholdTime
        const amt        = Math.max(0, parseFloat(bk.total_amount || 0))
        const commExcl   = Math.max(0, parseFloat(bk.commission_excluded   || 0))
        const commOtElig = Math.max(0, parseFloat(bk.commission_ot_eligible || 0))
        const otEligRev  = Math.max(0, parseFloat(bk.ot_eligible_revenue    || 0))
        if (isOt) {
          grossRevOt    += amt
          commRegBase   += commExcl     // excluded services → always standard rate
          commOtBase    += commOtElig   // eligible services base commission
          otEligRevBase += otEligRev    // eligible service revenue for additive bonus
        } else {
          grossRevReg += amt
          commRegBase += commExcl + commOtElig   // non-OT booking → everything standard
        }
      }
      const grossRevTotal = grossRevReg + grossRevOt
      const commRegular = Math.round(commRegBase)
      // Additive: standard commission + bonus% of eligible revenue (e.g. 40%+10% = 50%)
      const commOt      = Math.round(commOtBase + otEligRevBase * otBonusPct / 100)

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
      const lateDeduction = totalLateMinutes * lateDeductPerMin

      const prorataRate = Math.round(parseInt(barber.base_salary || 0) / workingDaysStd)
      const isProrata   = barber.off_deduction_type === 'prorata'

      const inexcusedDeduct = isProrata
        ? Math.round(inexcusedDays * prorataRate)
        : inexcusedDays * inexcusedFlatDeduct

      const excusedOver   = Math.max(0, excusedDays - periodQuota)
      const excusedDeduct = isProrata
        ? Math.round(excusedOver * prorataRate)
        : excusedOver * excusedFlatDeduct

      // Kasbon total from expenses (used for net_pay calculation)
      let kasbonTotal = 0
      const kasbonResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
         WHERE type = 'kasbon' AND barber_id = $1 AND expense_date BETWEEN $2 AND $3
         AND (deduct_period = 'current' OR deduct_period IS NULL)`,
        [barber.id, period_from, period_to])
      kasbonTotal = parseInt(kasbonResult.rows[0].total)

      const netPay = baseSalary + commRegular + commOt + totalTips
                   - lateDeduction - inexcusedDeduct - excusedDeduct - kasbonTotal

      await client.query(
        `INSERT INTO payroll_entries
           (period_id, barber_id, branch_id, pay_type, base_salary,
            gross_service_revenue, commission_regular, commission_ot, total_tips,
            total_late_minutes, inexcused_fixed_days, excused_fixed_days,
            working_days, late_deduction, inexcused_off_deduction, excused_off_deduction,
            kasbon_total, net_pay)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [period.id, barber.id, targetBranchId, barber.pay_type || 'commission',
         baseSalary, Math.round(grossRevTotal), commRegular, commOt, totalTips,
         totalLateMinutes, inexcusedDays, excusedDays,
         workingDaysStd, lateDeduction, inexcusedDeduct, excusedDeduct,
         kasbonTotal, netPay])

      // Auto-import kasbon from expenses into payroll_adjustments
      const kasbonExpenses = await client.query(
        `SELECT * FROM expenses
         WHERE type = 'kasbon'
           AND barber_id = $1
           AND expense_date BETWEEN $2 AND $3`,
        [barber.id, period_from, period_to])

      const insertedEntry = await client.query(
        'SELECT id FROM payroll_entries WHERE period_id = $1 AND barber_id = $2',
        [period.id, barber.id])
      const entryId = insertedEntry.rows[0]?.id

      if (entryId) {
        // Delete existing auto-imported kasbon adjustments, then re-insert fresh
        await client.query(
          `DELETE FROM payroll_adjustments
           WHERE payroll_entry_id = $1 AND is_kasbon = true AND expense_id IS NOT NULL`,
          [entryId])
        for (const exp of kasbonExpenses.rows) {
          await client.query(
            `INSERT INTO payroll_adjustments
               (payroll_entry_id, type, category, remarks, amount, by, date, is_kasbon, expense_id, deduct_period)
             VALUES ($1, 'deduction', 'Kasbon', $2, $3, $4, $5, true, $6, $7)`,
            [entryId, exp.description || 'Kasbon', exp.amount, exp.submitted_by,
             exp.expense_date, exp.id, exp.deduct_period || 'current'])
        }
      }
    }

    await client.query('COMMIT')
    const updatedPeriod = await pool.query('SELECT * FROM payroll_periods WHERE id = $1', [period.id])
    const entries = await pool.query(
      `SELECT pe.*, b.name AS barber_name FROM payroll_entries pe
       JOIN barbers b ON b.id = pe.barber_id
       WHERE pe.period_id = $1 ORDER BY b.name`, [period.id])
    res.status(200).json({ period: updatedPeriod.rows[0], entries: entries.rows })
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
      `SELECT pe.*, b.name AS barber_name, b.pay_type,
              (SELECT COUNT(*)::int FROM attendance a
               JOIN payroll_periods pp ON pp.id = pe.period_id
               WHERE a.barber_id = pe.barber_id
                 AND DATE(a.clock_in_at AT TIME ZONE 'Asia/Makassar')
                     BETWEEN pp.period_from AND pp.period_to) AS present_days
       FROM payroll_entries pe
       JOIN barbers b ON b.id = pe.barber_id
       WHERE pe.period_id = $1 ORDER BY b.name`, [req.params.id])
    res.json(rows)
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PATCH /api/payroll/entries/:id — admin manual override
router.patch('/entries/:id', requireAdmin, checkPermission('payroll'), async (req, res) => {
  try {
    const entryCheck = await pool.query(
      `SELECT pe.id, pp.status FROM payroll_entries pe
       JOIN payroll_periods pp ON pp.id = pe.period_id
       WHERE pe.id = $1`, [req.params.id])
    if (!entryCheck.rows.length) return res.status(404).json({ message: 'Not found' })
    if (entryCheck.rows[0].status === 'communicated') {
      return res.status(403).json({ message: 'Cannot edit a communicated period' })
    }
    const allowed = ['working_days','late_deduction','total_late_minutes',
      'inexcused_off_deduction','inexcused_fixed_days',
      'excused_off_deduction','excused_fixed_days',
      'kasbon_total','net_pay','base_salary']
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

// GET /api/payroll/periods/:id/export?format=xlsx|csv — Excel or CSV
router.get('/periods/:id/export', requireAdmin, async (req, res) => {
  try {
    const period = await pool.query('SELECT * FROM payroll_periods WHERE id = $1', [req.params.id])
    if (!period.rows.length) return res.status(404).json({ message: 'Not found' })
    const p = period.rows[0]

    const { rows } = await pool.query(
      `SELECT pe.*, b.name AS barber_name,
        ROUND((pp.period_to - pp.period_from + 1) * 6.0 / 7)::int AS computed_working_days,
        GREATEST(0, ROUND((pp.period_to - pp.period_from + 1) * 6.0 / 7)::int
          - pe.inexcused_fixed_days - pe.excused_fixed_days) AS days_present
       FROM payroll_entries pe
       JOIN barbers b ON b.id = pe.barber_id
       JOIN payroll_periods pp ON pp.id = pe.period_id
       WHERE pe.period_id = $1 ORDER BY b.name`,
      [req.params.id])

    const COLS = [
      { header: 'Barber',              key: 'barber_name'             },
      { header: 'Pay Type',            key: 'pay_type'                },
      { header: 'Working Days',        key: 'computed_working_days'   },
      { header: 'Days Present',        key: 'days_present'            },
      { header: 'Base Salary',         key: 'base_salary'             },
      { header: 'Service Revenue',     key: 'gross_service_revenue'   },
      { header: 'Commission Regular',  key: 'commission_regular'      },
      { header: 'Commission OT',       key: 'commission_ot'           },
      { header: 'Tips',                key: 'total_tips'              },
      { header: 'Late Minutes',        key: 'total_late_minutes'      },
      { header: 'Late Deduction',      key: 'late_deduction'          },
      { header: 'Inexcused Off Days',  key: 'inexcused_fixed_days'    },
      { header: 'Inexcused Deduction', key: 'inexcused_off_deduction' },
      { header: 'Excused Off Days',    key: 'excused_fixed_days'      },
      { header: 'Excused Deduction',   key: 'excused_off_deduction'   },
      { header: 'Kasbon',              key: 'kasbon_total'            },
      { header: 'Net Pay',             key: 'net_pay'                 },
    ]

    const fmt = (req.query.format || 'xlsx').toLowerCase()
    const fileBase = `payroll_${p.period_from}_${p.period_to}`

    if (fmt === 'csv') {
      const escape = v => {
        const s = v === null || v === undefined ? '' : String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
      }
      const header = COLS.map(c => escape(c.header)).join(',')
      const body   = rows.map(r => COLS.map(c => escape(r[c.key])).join(',')).join('\r\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename=${fileBase}.csv`)
      res.send('﻿' + header + '\r\n' + body)
      return
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Payroll')
    ws.columns = COLS.map(c => ({ ...c, width: Math.max(c.header.length + 4, 14) }))
    rows.forEach(r => ws.addRow(r))
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=${fileBase}.xlsx`)
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
router.post('/adjustments', requireAdmin, checkPermission('payroll'), async (req, res) => {
  try {
    const { payroll_entry_id, type, category, remarks, amount, date, is_kasbon, expense_id, deduct_period } = req.body
    if (!payroll_entry_id || !type || !amount) {
      return res.status(400).json({ message: 'payroll_entry_id, type, amount required' })
    }
    const periodCheck = await pool.query(
      `SELECT pp.status FROM payroll_entries pe JOIN payroll_periods pp ON pp.id = pe.period_id WHERE pe.id = $1`,
      [payroll_entry_id])
    if (periodCheck.rows[0]?.status === 'communicated') {
      return res.status(403).json({ message: 'Cannot edit a communicated period' })
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

// DELETE /api/payroll/adjustments/:id
router.delete('/adjustments/:id', requireAdmin, checkPermission('payroll'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pa.id, pa.is_kasbon, pp.status
       FROM payroll_adjustments pa
       JOIN payroll_entries pe ON pe.id = pa.payroll_entry_id
       JOIN payroll_periods pp ON pp.id = pe.period_id
       WHERE pa.id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    if (rows[0].is_kasbon) return res.status(400).json({ message: 'Cannot delete kasbon adjustments' })
    if (rows[0].status === 'communicated') return res.status(403).json({ message: 'Cannot edit a communicated period' })
    await pool.query('DELETE FROM payroll_adjustments WHERE id = $1', [req.params.id])
    res.status(204).end()
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PATCH /api/payroll/adjustments/:id
router.patch('/adjustments/:id', requireAdmin, checkPermission('payroll'), async (req, res) => {
  try {
    const { deduct_period } = req.body
    if (!['current','next'].includes(deduct_period)) {
      return res.status(400).json({ message: 'deduct_period must be current or next' })
    }
    const check = await pool.query(
      `SELECT pp.status FROM payroll_adjustments pa
       JOIN payroll_entries pe ON pe.id = pa.payroll_entry_id
       JOIN payroll_periods pp ON pp.id = pe.period_id
       WHERE pa.id = $1`, [req.params.id])
    if (!check.rows.length) return res.status(404).json({ message: 'Not found' })
    if (check.rows[0].status === 'communicated') return res.status(403).json({ message: 'Cannot edit a communicated period' })
    const { rows } = await pool.query(
      'UPDATE payroll_adjustments SET deduct_period = $1 WHERE id = $2 RETURNING *',
      [deduct_period, req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// DELETE /api/payroll/periods/:id  (draft only)
router.delete('/periods/:id', requireAdmin, checkPermission('payroll'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, status FROM payroll_periods WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    if (rows[0].status !== 'draft') return res.status(400).json({ message: 'Only draft periods can be deleted' })
    await pool.query('DELETE FROM payroll_periods WHERE id = $1', [req.params.id])
    res.status(204).end()
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

// PATCH /api/payroll/periods/:id/status
router.patch('/periods/:id/status', requireAdmin, checkPermission('payroll'), async (req, res) => {
  try {
    const { status } = req.body
    const { rows: cur } = await pool.query('SELECT status FROM payroll_periods WHERE id = $1', [req.params.id])
    if (!cur.length) return res.status(404).json({ message: 'Not found' })
    const transitions = { draft: 'reviewed', reviewed: 'communicated' }
    if (transitions[cur[0].status] !== status) {
      return res.status(400).json({ message: `Cannot transition from ${cur[0].status} to ${status}` })
    }
    const setCommunicated = status === 'communicated'
      ? ', communicated_by = $2, communicated_at = NOW()' : ''
    const vals = setCommunicated ? [status, req.user.id, req.params.id] : [status, req.params.id]
    const { rows } = await pool.query(
      `UPDATE payroll_periods SET status = $1${setCommunicated} WHERE id = $${vals.length} RETURNING *`, vals)
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Internal server error' }) }
})

module.exports = router
