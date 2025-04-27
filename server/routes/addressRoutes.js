const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');

router.post('/validate', addressController.validateAddress);

module.exports = router; 