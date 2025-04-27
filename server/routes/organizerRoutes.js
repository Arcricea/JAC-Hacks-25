const express = require('express');
const router = express.Router();
const organizerController = require('../controllers/organizerController');
// const { checkJwt } = require('../middleware/authMiddleware'); // Assuming you have auth middleware -- Removed

// GET /api/organizer/dashboard - Fetch data for the organizer dashboard
// Removed checkJwt middleware for now
router.get('/dashboard', organizerController.getOrganizerDashboardData);

module.exports = router; 