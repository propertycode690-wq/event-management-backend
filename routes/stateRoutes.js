const express = require('express');
const router = express.Router();
const stateController = require('../controllers/stateController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', stateController.getStates);
router.post('/', verifyToken, stateController.createState);
router.get('/:id', stateController.getStateById);
router.post('/:id/donations/pledge', stateController.pledgeStateDonation);

module.exports = router;
