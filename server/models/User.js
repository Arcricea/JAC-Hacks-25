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
    unique: true,
    trim: true,
    minlength: 3
  },
  accountType: {
    type: String,
    required: true,
    enum: ['individual', 'business', 'distributor', 'volunteer'],
    default: 'individual'
  },
  volunteerToken: {
    type: String,
    unique: true,
    sparse: true // Allows multiple nulls, but token must be unique if present
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User; 