const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
  getPaymentConfig,
  processCharge,
  handleWebhook,
  verifyPaymentStatus,
  getTransactions
} = require('../controllers/paymentController');

// GET /api/v1/payments/config - Retrieve current gateway status and merchant ID (public gateway status)
router.get('/config', getPaymentConfig);

// POST /api/v1/payments/charge - Process card/digital payment through Clover
router.post('/charge', processCharge);

// POST /api/v1/payments/webhook - Clover webhook verification & payment confirmation callback
router.post('/webhook', handleWebhook);

// GET /api/v1/payments/webhook - Clover webhook setup verification handshake
router.get('/webhook', handleWebhook);

// GET /api/v1/payments/verify/:transactionId - Protected: Verify transaction settlement status with authorization
router.get('/verify/:transactionId', verifyToken, verifyPaymentStatus);

// GET /api/v1/payments/transactions - Protected: Transaction ledger
router.get('/transactions', verifyToken, getTransactions);

module.exports = router;
