const pool = require('../config/db')

async function runInventoryDeduct(bookingId) {
  const bk = await pool.query('SELECT branch_id FROM bookings WHERE id = $1', [bookingId])
  if (!bk.rows.length) return
  const branchId = bk.rows[0].branch_id

  const svcs = await pool.query(
    'SELECT service_id FROM booking_services WHERE booking_id = $1', [bookingId])

  for (const svc of svcs.rows) {
    const consumables = await pool.query(
      'SELECT item_id, qty_per_use FROM service_consumables WHERE service_id = $1',
      [svc.service_id])

    for (const c of consumables.rows) {
      await pool.query(
        'UPDATE inventory_stock SET current_stock = GREATEST(current_stock - $1, 0), updated_at = NOW() WHERE item_id = $2 AND branch_id = $3',
        [c.qty_per_use, c.item_id, branchId])
      await pool.query(
        `INSERT INTO inventory_movements (item_id, branch_id, movement_type, quantity, note)
         VALUES ($1,$2,'out',$3,'service_use')`,
        [c.item_id, branchId, c.qty_per_use])
    }
  }
}

module.exports = { runInventoryDeduct }
