// Extracts branch_id from query, body, or kiosk token.
// Attaches to req.branchId. Optional — routes that need it call directly.

function branchScope(req, res, next) {
  // Kiosk token auth already sets req.branchId
  if (req.branchId) return next()

  const branchId =
    req.query.branch_id ||
    req.body?.branch_id ||
    req.params?.branch_id

  if (branchId) req.branchId = branchId
  next()
}

function requireBranch(req, res, next) {
  branchScope(req, res, () => {
    if (!req.branchId) {
      return res.status(400).json({ message: 'branch_id is required' })
    }
    next()
  })
}

module.exports = { branchScope, requireBranch }
