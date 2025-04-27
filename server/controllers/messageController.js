const Message = require('../models/Message');

// Get all messages
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ timestamp: 1 }) // Sort by timestamp ascending
      .limit(100); // Limit to last 100 messages
    
    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching messages'
    });
  }
};

// Create a new message
exports.createMessage = async (req, res) => {
  try {
    const { username, userType, avatar, content, auth0Id } = req.body;
    
    // Basic validation
    if (!content || !username) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username and content'
      });
    }
    
    // Create message
    const message = await Message.create({
      username,
      userType: userType || 'guest',
      avatar,
      content,
      auth0Id, // This can be undefined if not provided
      timestamp: new Date()
    });
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while creating message'
    });
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message ID format'
      });
    }
    
    // Find and delete the message
    const message = await Message.findByIdAndDelete(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting message'
    });
  }
}; 