const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isOrganizer } = require('../middleware/authMiddleware');

// GET /api/users - Get all users (Admin/Organizer only)
router.get('/', isOrganizer, userController.getAllUsers);

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
router.put('/set-need/:userId', isOrganizer, userController.setFoodBankNeedStatusByOrganizer);

// PUT /api/users/reset-requests/:auth0Id - Reset a food bank's request/need status (Organizer only)
// TODO: Add middleware to check if user is an organizer
router.put('/reset-requests/:auth0Id', isOrganizer, userController.resetUserRequests);

// PUT /api/users/change-type/:auth0Id - Change a user's account type (Admin/Organizer only)
// TODO: Add middleware to check if user is an organizer/admin
router.put('/change-type/:auth0Id', isOrganizer, userController.changeUserAccountType);

// DELETE /api/users/:auth0Id - Delete a user (Organizer only)
// TODO: Add middleware to check if user is an organizer
router.delete('/:auth0Id', isOrganizer, userController.deleteUserByAuth0Id);

module.exports = router; 