const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

router.post('/', donationController.createDonation);
router.get('/available', donationController.getAvailableDonations);

module.exports = router; 