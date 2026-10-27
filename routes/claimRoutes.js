const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// GET /api/v1/club-claims - Protected: Super Admin only
router.get('/', verifyToken, requireRole('SUPER_ADMIN'), claimController.getClaims);

// POST /api/v1/club-claims - Public or Authenticated claim submission
router.post('/', claimController.submitClaim);

// PUT /api/v1/club-claims/:id - Protected: Super Admin only
router.put('/:id', verifyToken, requireRole('SUPER_ADMIN'), claimController.updateClaimStatus);

module.exports = router;
