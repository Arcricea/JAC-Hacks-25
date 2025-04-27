const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isOrganizer } = require('../middleware/authMiddleware');

// GET /api/users - Get all users (Admin/Organizer only)
router.get('/', isOrganizer, userController.getAllUsers);

// Route to save a user (create or update) - NO AUTH MIDDLEWARE (TEMP)
router.post('/', userController.saveUser);

// Route to get a user by Auth0 ID - REQUIRES ORGANIZER AUTH WHEN CALLED BY ADMIN
router.get('/:auth0Id', isOrganizer, userController.getUserByAuth0Id);

// Route to verify a volunteer code (POST request with username and code in body)
// This might be public or require specific auth, adjust as needed
router.post('/verify-volunteer', userController.verifyVolunteerCode);

// PUT /api/users/reset-need/:userId - Reset a food bank's need status (Organizer only)
router.put('/reset-need/:userId', isOrganizer, userController.resetFoodBankNeedStatus);

// PUT /api/users/set-need/:userId - Set a food bank's need status (Organizer only)
router.put('/set-need/:userId', isOrganizer, userController.setFoodBankNeedStatusByOrganizer);

// PUT /api/users/reset-requests/:auth0Id - Reset a food bank's request/need status (Organizer only)
router.put('/reset-requests/:auth0Id', isOrganizer, userController.resetUserRequests);

// PUT /api/users/change-type/:auth0Id - Change a user's account type (Admin/Organizer only)
router.put('/change-type/:auth0Id', isOrganizer, userController.changeUserAccountType);

// DELETE /api/users/:auth0Id - Delete a user (Organizer only)
router.delete('/:auth0Id', isOrganizer, userController.deleteUserByAuth0Id);

module.exports = router; 