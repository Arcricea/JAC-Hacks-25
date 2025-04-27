const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const { isOrganizer } = require('../middleware/authMiddleware');

router.post('/', isOrganizer, donationController.createDonation);
router.get('/available', donationController.getAvailableDonations);
router.post('/:donationId/assign', donationController.assignDonationToVolunteer);

// New route for cancelling a donation assignment
router.post('/:donationId/cancel-assignment', donationController.cancelVolunteerAssignment);

// New route for fetching donation receipts for a specific user (donor)
// GET /api/donations/receipts/:userId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/receipts/:userId', donationController.getDonationReceipts);

// New route for fetching supplier overview data
// GET /api/donations/overview/:userId
router.get('/overview/:userId', isOrganizer, donationController.getSupplierOverview);

// New route for fetching a specific supplier's listed (available/scheduled) items
// GET /api/donations/supplier/listed/:userId
router.get('/supplier/listed/:userId', isOrganizer, donationController.getSupplierListedDonations);

// New route for supplier to confirm pickup of their donations
// POST /api/donations/supplier/confirm-pickup/:userId
router.post('/supplier/confirm-pickup/:userId', donationController.confirmSupplierPickup);

// Volunteer Routes
router.get('/volunteer/scheduled/:volunteerId', donationController.getVolunteerScheduledDonations);
router.get('/volunteer/completed-count/:volunteerId', donationController.getVolunteerCompletedDonationCount);
router.get('/volunteer/completed/:volunteerId', donationController.getVolunteerCompletedDonations);

router.post('/assign-volunteer', donationController.assignVolunteerToDonation);

// DELETE /api/donations/:id - Delete a specific donation (Organizer only)
router.delete('/:id', isOrganizer, donationController.deleteDonationById);

module.exports = router; 