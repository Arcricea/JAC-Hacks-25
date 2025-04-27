const express = require('express');
const router = express.Router();
// Import the actual authentication middleware
const { isAuthenticated } = require('../middleware/authMiddleware'); 

// Import the controller
const individualController = require('../controllers/individualController');

// POST /api/individuals/donate - Individual makes a donation
// Requires authentication
router.post('/donate', isAuthenticated, individualController.createDonation);

// POST /api/individuals/request-volunteer - Individual requests a volunteer pickup
// Requires authentication
router.post('/request-volunteer', isAuthenticated, individualController.requestVolunteer);

// GET /api/individuals/donations - Get donations submitted by the logged-in individual
// Requires authentication
router.get('/donations', isAuthenticated, individualController.getMyDonations);

module.exports = router; 