const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// Get all messages
router.get('/', messageController.getAllMessages);

// Create a new message
router.post('/', messageController.createMessage);

// Delete a message
router.delete('/:id', messageController.deleteMessage);

module.exports = router; 