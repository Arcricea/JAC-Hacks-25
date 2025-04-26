const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  auth0Id: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  userType: {
    type: String,
    enum: ['individual', 'business', 'distributor'],
    required: true
  },
  location: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  donatedItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food'
  }],
  claimedItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food'
  }]
});

module.exports = mongoose.model('User', userSchema); 