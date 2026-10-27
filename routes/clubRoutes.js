const express = require('express');
const router = express.Router();
const clubController = require('../controllers/clubController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', clubController.getClubs);
router.post('/claims', clubController.createClaimRequest);
router.get('/:id', clubController.getClubById);
router.put('/:id', verifyToken, clubController.updateClub);
router.post('/:id/donations/pledge', clubController.pledgeClubDonation);

module.exports = router;

