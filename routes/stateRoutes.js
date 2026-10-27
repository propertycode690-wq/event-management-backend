const express = require('express');
const router = express.Router();
const stateController = require('../controllers/stateController');

router.get('/', stateController.getStates);
router.get('/:id', stateController.getStateById);
router.post('/:id/donations/pledge', stateController.pledgeStateDonation);

module.exports = router;
