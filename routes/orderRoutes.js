const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET /api/v1/orders - Protected: Scoped orders retrieval
router.get('/', verifyToken, orderController.getOrders);

// GET /api/v1/orders/:id - Protected: Scoped single order retrieval
router.get('/:id', verifyToken, orderController.getOrderById);

// POST /api/v1/orders - Create new order (can be authenticated or public checkout)
router.post('/', orderController.createOrder);

// PUT /api/v1/orders/:id/fulfillment - Protected: Update fulfillment status
router.put('/:id/fulfillment', verifyToken, orderController.updateFulfillment);

// PUT /api/v1/orders/:id/payout - Protected: Update payout status
router.put('/:id/payout', verifyToken, orderController.updatePayout);

module.exports = router;
