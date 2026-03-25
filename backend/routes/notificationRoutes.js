const express = require('express');
const NotificationController = require('../controllers/NotificationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/:userId', authenticate, NotificationController.getUserNotifications);

module.exports = router;
