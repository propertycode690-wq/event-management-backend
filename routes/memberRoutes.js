const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, memberController.getMembers);
router.post('/', memberController.createMember);
router.put('/:id/status', verifyToken, memberController.updateMemberStatus);

module.exports = router;

