const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET /api/v1/results - List sanctioned competition results from DB
router.get('/', resultController.getResults);

// POST /api/v1/results - Publish official trial result (Admin protected)
router.post('/', verifyToken, resultController.createResult);

module.exports = router;
