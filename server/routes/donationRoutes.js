const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

router.post('/', donationController.createDonation);
router.get('/available', donationController.getAvailableDonations);
router.post('/:donationId/assign', donationController.assignDonationToVolunteer);
router.get('/volunteer/:volunteerId/tasks', donationController.getVolunteerTasks);

// New route for fetching donation receipts for a specific user (donor)
// GET /api/donations/receipts/:userId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/receipts/:userId', donationController.getDonationReceipts);

// New route for fetching supplier overview data
// GET /api/donations/overview/:userId
router.get('/overview/:userId', donationController.getSupplierOverview);

// New route for fetching a specific supplier's listed (available/scheduled) items
// GET /api/donations/supplier/listed/:userId
router.get('/supplier/listed/:userId', donationController.getSupplierListedDonations);

// New route for supplier to confirm pickup of their donations
// POST /api/donations/supplier/confirm-pickup/:userId
router.post('/supplier/confirm-pickup/:userId', donationController.confirmSupplierPickup);

// Add this route to the existing routes
router.patch('/tasks/:taskId/status', donationController.updateTaskStatus);

module.exports = router; 