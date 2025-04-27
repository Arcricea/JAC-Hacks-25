const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const donationRoutes = require('./routes/donationRoutes');
const addressRoutes = require('./routes/addressRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const messageRoutes = require('./routes/messageRoutes');

// <<< REMOVE THESE FRONTEND IMPORTS >>>
// import React, { useState, useEffect, useContext } from 'react';
// import { UserContext } from '../App'; // To check if current user is organizer
// import '../assets/styles/Dashboard.css'; // Reuse general dashboard styles
// import '../assets/styles/OrganizerDashboard.css'; // <<< ADD ORGANIZER STYLES
// import IndividualDashboard from './IndividualDashboard';
// import SupplierDashboard from './SupplierDashboard';
// import FoodBankDashboard from './FoodBankDashboard';
// import VolunteerDashboard from './VolunteerDashboard';

// <<< REMOVE PRIORITY LEVEL CONSTANTS - Belongs in Frontend >>>
// const priorityLevels = [
//   { level: 1, label: 'Do not need', color: '#4CAF50' },
//   { level: 2, label: 'Low need', color: '#8BC34A' },
//   { level: 3, label: 'Moderate need', color: '#FFC107' },
//   { level: 4, label: 'High need', color: '#FF9800' },
//   { level: 5, label: 'URGENT NEED', color: '#F44336' }
// ];

// Import MongoDB URI from test-mongodb.js
const { mongoURI } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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
app.use('/api/messages', messageRoutes);

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