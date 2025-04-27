const mongoose = require('mongoose');

const foodBankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  contactPerson: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  openingHours: {
    type: String,
    trim: true
  },
  needLevel: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  acceptedCategories: {
    type: [String],
    default: ['produce', 'bakery', 'dairy', 'meat', 'canned', 'dry', 'frozen', 'prepared', 'other']
  },
  needMessage: {
    type: String,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a 2dsphere index for geospatial queries
foodBankSchema.index({ location: '2dsphere' });

const FoodBank = mongoose.model('FoodBank', foodBankSchema);

module.exports = FoodBank; 