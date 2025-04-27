const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true
  },
  userType: {
    type: String,
    enum: ['individual', 'business', 'distributor', 'volunteer', 'organizer', 'guest'],
    default: 'guest'
  },
  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?background=random'
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true
  },
  auth0Id: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema); 