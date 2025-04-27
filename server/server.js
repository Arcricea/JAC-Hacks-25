const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const donationRoutes = require('./routes/donationRoutes');
const addressRoutes = require('./routes/addressRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const foodBankRoutes = require('./routes/foodBankRoutes');
const messageRoutes = require('./routes/messageRoutes');
const individualRoutes = require('./routes/individualRoutes');

// Import MongoDB URI from test-mongodb.js
const { mongoURI } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS
const corsOptions = {
  origin: [
      'https://mealnet.netlify.app', // Replace with your production URL
      'http://localhost:3000' // Your local React dev server
      // Add any other origins you need to allow
    ],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/foodbanks', foodBankRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/individuals', individualRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB connection successful!');
    
    // Start server after successful database connection
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed!');
    console.error('Error details:', error.message);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  process.exit(1);
}); 