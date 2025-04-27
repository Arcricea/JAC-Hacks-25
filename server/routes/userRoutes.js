const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route to save a user (create or update)
router.post('/', userController.saveUser);

// Route to get a user by Auth0 ID
router.get('/:auth0Id', userController.getUserByAuth0Id);

// Route to verify a volunteer code (POST request with username and code in body)
router.post('/verify-volunteer', userController.verifyVolunteerCode);

module.exports = router; 