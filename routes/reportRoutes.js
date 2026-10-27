const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

const FINANCIAL_OVERVIEW_ROLES = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'STATE_ADMIN', 'CLUB_ADMIN', 'EVENT_ADMIN'];
const STATE_REPORT_ROLES = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'STATE_ADMIN', 'CLUB_ADMIN', 'EVENT_ADMIN'];
const COMMISSIONS_REPORT_ROLES = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'STATE_ADMIN', 'CLUB_ADMIN', 'EVENT_ADMIN'];

router.get('/financial-overview', verifyToken, requireRole(...FINANCIAL_OVERVIEW_ROLES), reportController.getFinancialOverview);
router.get('/state-performance', verifyToken, requireRole(...STATE_REPORT_ROLES), reportController.getStatePerformanceReport);
router.get('/revenue-commissions', verifyToken, requireRole(...COMMISSIONS_REPORT_ROLES), reportController.getRevenueCommissionsReport);

module.exports = router;
