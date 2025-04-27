const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const donationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  itemName: {
    type: String,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['produce', 'bakery', 'dairy', 'meat', 'canned', 'dry', 'frozen', 'prepared', 'other']
  },
  quantity: {
    type: String,
  },
  expirationDate: {
    type: Date,
  },
  pickupInfo: {
    type: String,
  },
  businessAddress: Schema.Types.Mixed,
  pickupAddress: Schema.Types.Mixed,
  pickupInstructions: {
    type: String,
    trim: true
  },
  donorType: {
    type: String,
    enum: ['Individual', 'Business', 'Distributor'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  items: [{
      name: { type: String, required: true },
      quantity: { type: String }
  }],
  imageUrl: {
    type: String
  },
  estimatedValue: {
    type: Number,
    default: 0
  },
  // New fields for impact estimates
  mealsSaved: {
    type: Number,
    default: 0
  },
  co2Prevented: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['available', 'scheduled', 'picked_up', 'delivered', 'completed', 'cancelled'],
    default: 'available'
  },
  volunteerId: {
    type: String,
    ref: 'User',
    default: null
  },
  foodBankId: {
    type: String,
    ref: 'User',
    default: null
  },
  pickupDate: {
    type: Date,
    default: null
  },
  deliveryDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation; 