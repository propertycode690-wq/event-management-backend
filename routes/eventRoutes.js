const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

const ADMIN_ROLES = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'EVENT_ADMIN', 'CLUB_ADMIN'];

router.get('/', eventController.getEvents);
router.get('/entries', eventController.getEntries);
router.get('/:id', eventController.getEventById);
router.post('/', verifyToken, requireRole(...ADMIN_ROLES), eventController.createEvent);
router.put('/:id', verifyToken, requireRole(...ADMIN_ROLES), eventController.updateEvent);
router.delete('/:id', verifyToken, requireRole(...ADMIN_ROLES), eventController.deleteEvent);
router.post('/:id/pre-signup', eventController.preSignUpEntry);
router.put('/entries/:id/check-in', verifyToken, eventController.checkInEntry);
router.put('/entries/:id/payment', verifyToken, eventController.updateEntryPayment);

module.exports = router;

