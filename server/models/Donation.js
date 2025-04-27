const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['produce', 'bakery', 'dairy', 'meat', 'canned', 'dry', 'frozen', 'prepared', 'other']
  },
  quantity: {
    type: String,
    required: [true, 'Quantity is required']
  },
  expirationDate: {
    type: Date,
    required: [true, 'Expiration date is required']
  },
  pickupInfo: {
    type: String,
    required: [true, 'Pickup information is required']
  },
  businessAddress: {
    type: String,
    default: '4873 Westmount Ave, Westmount, Quebec H3Y 1X9'
  },
  imageUrl: {
    type: String
  },
  estimatedValue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['available', 'scheduled', 'completed', 'cancelled'],
    default: 'available'
  },
  volunteerId: {
    type: String,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation; 