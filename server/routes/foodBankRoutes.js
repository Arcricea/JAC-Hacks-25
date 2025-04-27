const express = require('express');
const router = express.Router();
const foodBankController = require('../controllers/foodBankController');

// Food bank CRUD operations
router.post('/', foodBankController.createFoodBank);
router.get('/', foodBankController.getAllFoodBanks);
router.get('/:id', foodBankController.getFoodBankById);
router.put('/:id', foodBankController.updateFoodBank);
router.delete('/:id', foodBankController.deleteFoodBank);

// Specialized routes
router.post('/nearby', foodBankController.findNearbyFoodBanks);
router.post('/recommend', foodBankController.recommendFoodBanks);
router.post('/mark-pickup', foodBankController.markDonationPickedUp);
router.post('/mark-delivery', foodBankController.markDonationDelivered);

module.exports = router; 