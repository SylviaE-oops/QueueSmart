const express = require('express');
const ServiceController = require('../controllers/ServiceController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorizeAdmin, ServiceController.create);
router.get('/', ServiceController.list);
router.put('/:id', authenticate, authorizeAdmin, ServiceController.update);

module.exports = router;
