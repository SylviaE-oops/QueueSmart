const express = require('express');
const HistoryController = require('../controllers/HistoryController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/:userId', authenticate, HistoryController.getUserHistory);

module.exports = router;
