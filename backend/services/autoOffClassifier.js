const pool = require('../config/db')

/**
 * Get the Monday of the Mon–Sun calendar week containing `date`.
 * @param {Date} date
 * @returns {Date} Monday at 00:00:00 local time
 */
function getMondayOfWeek(date) {
  const dow = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const monday = new Date(date)
  monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1))
  return monday
}

/**
 * Nightly auto-off classifier.
 * For each active barber in each active branch:
 *   - If they have neither a clock-in nor an off_record for yesterday (WITA), auto-insert one.
 *   - If they already have ≥1 auto-excused off in the same Mon–Sun calendar week → inexcused.
 *   - Otherwise → excused.
 * Manual off records (is_auto = false) do NOT count toward the weekly free quota.
 */
async function runAutoOffClassifier() {
  // Yesterday in WITA (Asia/Makassar, UTC+8)
  const nowWITA = new Date(Date.now() + 8 * 60 * 60 * 1000) // shift to UTC+8
  const yesterdayWITA = new Date(nowWITA)
  yesterdayWITA.setUTCDate(nowWITA.getUTCDate() - 1)
  const yesterday = yesterdayWITA.toISOString().slice(0, 10) // 'YYYY-MM-DD'

  // Determine Mon–Sun week bounds for yesterday (dates as strings, WITA)
  const yesterdayDate = new Date(yesterday + 'T00:00:00Z') // treat as plain date
  const monday = getMondayOfWeek(yesterdayDate)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const weekStart = monday.toISOString().slice(0, 10)
  const weekEnd   = sunday.toISOString().slice(0, 10)

  // Fetch all active barbers with their branch (only active branches)
  const { rows: barbers } = await pool.query(
    `SELECT ba.id AS barber_id, ba.branch_id
     FROM barbers ba
     JOIN branches br ON br.id = ba.branch_id
     WHERE ba.status != 'inactive'
       AND br.is_active = true`)

  let inserted = 0
  let skipped  = 0

  for (const { barber_id, branch_id } of barbers) {
    // Check for existing clock-in on yesterday
    const { rows: clockIns } = await pool.query(
      `SELECT id FROM attendance
       WHERE barber_id = $1
         AND DATE(clock_in_at AT TIME ZONE 'Asia/Makassar') = $2
       LIMIT 1`,
      [barber_id, yesterday])

    if (clockIns.length) { skipped++; continue }

    // Check for existing off_record on yesterday (manual or auto)
    const { rows: offRecs } = await pool.query(
      `SELECT id FROM off_records
       WHERE barber_id = $1 AND date = $2
       LIMIT 1`,
      [barber_id, yesterday])

    if (offRecs.length) { skipped++; continue }

    // Count auto-excused offs in the same Mon–Sun calendar week
    const { rows: weekAutoExcused } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM off_records
       WHERE barber_id = $1
         AND is_auto = true
         AND type = 'excused'
         AND date BETWEEN $2 AND $3`,
      [barber_id, weekStart, weekEnd])

    const autoExcusedCount = parseInt(weekAutoExcused[0].cnt, 10)
    const offType = autoExcusedCount === 0 ? 'excused' : 'inexcused'

    try {
      await pool.query(
        `INSERT INTO off_records (barber_id, branch_id, date, type, has_doctor_note, is_auto, logged_by)
         VALUES ($1, $2, $3, $4, false, true, NULL)`,
        [barber_id, branch_id, yesterday, offType])
      inserted++
    } catch (e) {
      // Race condition guard — record may have been inserted between our check and insert
      if (e.code !== '23505') { // unique_violation
        console.error('[autoOffClassifier] INSERT failed:', e.message, { barber_id, yesterday })
      }
    }
  }

  if (inserted > 0 || skipped > 0) {
    console.log(`[autoOffClassifier] date=${yesterday} inserted=${inserted} skipped=${skipped}`)
  }
}

module.exports = { runAutoOffClassifier }
