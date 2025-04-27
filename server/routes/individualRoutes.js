const express = require('express');
const router = express.Router();
// Import the actual authentication middleware
const { isAuthenticated } = require('../middleware/authMiddleware'); 

// Import the controller
const individualController = require('../controllers/individualController');
const userController = require('../controllers/userController');
const donationController = require('../controllers/donationController');

// POST /api/individuals/donate - Individual makes a donation
// Requires authentication
router.post('/donate', isAuthenticated, individualController.createDonation);

// POST /api/individuals/request-volunteer - Individual requests a volunteer pickup
// Requires authentication
router.post('/request-volunteer', isAuthenticated, individualController.requestVolunteer);

// GET /api/individuals/donations - Get donations submitted by the logged-in individual
// Requires authentication
router.get('/donations', isAuthenticated, individualController.getMyDonations);

// GET /api/individuals/profile - Get profile data for the logged-in individual
router.get('/profile', isAuthenticated, (req, res) => {
  // Simply return the user data from auth middleware
  return res.status(200).json({
    success: true,
    profile: req.user
  });
});

// POST /api/individuals/profile - Update profile data for the logged-in individual
router.post('/profile', isAuthenticated, userController.saveUser);

// POST /api/individuals/confirm-pickup/:userId - Confirm pickup via code or QR scan
router.post('/confirm-pickup/:userId', isAuthenticated, donationController.confirmSupplierPickup);

module.exports = router; 