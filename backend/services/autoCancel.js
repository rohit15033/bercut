const pool = require('../config/db')
const { emitEvent } = require('../routes/events')

async function runAutoCancel() {
  // Temporarily disabled automatic cancellations per user request
  return;
}

module.exports = { runAutoCancel }
