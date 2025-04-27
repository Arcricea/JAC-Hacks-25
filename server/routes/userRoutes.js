const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route to save a user (create or update)
router.post('/', userController.saveUser);

// Route to get a user by Auth0 ID
router.get('/:auth0Id', userController.getUserByAuth0Id);

// Route to verify a volunteer code (POST request with username and code in body)
router.post('/verify-volunteer', userController.verifyVolunteerCode);

// PUT /api/users/reset-need/:userId - Reset a food bank's need status (Organizer only)
// TODO: Add middleware to check if user is an organizer
router.put('/reset-need/:userId', userController.resetFoodBankNeedStatus);

// PUT /api/users/set-need/:userId - Set a food bank's need status (Organizer only)
// TODO: Add middleware to check if user is an organizer
router.put('/set-need/:userId', userController.setFoodBankNeedStatusByOrganizer);

// DELETE /api/users/:auth0Id - Delete a user (Organizer only)
// TODO: Add middleware to check if user is an organizer
router.delete('/:auth0Id', userController.deleteUserByAuth0Id);

module.exports = router; 