const express = require('express');
const QueueController = require('../controllers/QueueController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/join', authenticate, QueueController.join);
router.post('/leave', authenticate, QueueController.leave);
router.post('/serve-next', authenticate, authorizeAdmin, QueueController.serveNext);
router.get('/wait-time/:serviceId/:userId', authenticate, QueueController.waitTime);
router.get('/:serviceId', authenticate, QueueController.listByService);

module.exports = router;
