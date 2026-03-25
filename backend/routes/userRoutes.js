const express = require('express');
const UserController = require('../controllers/UserController');

const router = express.Router();

// User Routes
router.post('/register', UserController.register);      // Register user
router.post('/login', UserController.login);            // Login user
router.get('/', UserController.getAll);                 // Get all users (admin)
router.get('/:id', UserController.getById);             // Get user by ID
router.get('/email/:email', UserController.getByEmail); // Get user by email
router.put('/:id', UserController.update);              // Update user
router.delete('/:id', UserController.delete);           // Delete user

module.exports = router;
