const mongoose = require('mongoose');

const assignedTaskSchema = new mongoose.Schema({
  volunteerId: {
    type: String,
    required: true,
    ref: 'User'
  },
  donationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Donation'
  },
  itemName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  quantity: {
    type: String,
    required: true
  },
  pickupInfo: {
    type: String,
    required: true
  },
  expirationDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'assigned'
  },
  assignedAt: {
    type: Date,
    default: Date.now
  }
});

const AssignedTask = mongoose.model('AssignedTask', assignedTaskSchema);

module.exports = AssignedTask; 