const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');
const app = express();
const PORT = config.PORT;

// Import routes
const foodRoutes = require('./routes/foodRoutes');
const userRoutes = require('./routes/userRoutes');

// CORS Configuration - Allow requests from the React app
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Add your React app URL here
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Other middleware
app.use(express.json());

// MongoDB Connection
mongoose.connect(config.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Routes
app.use('/api/food', foodRoutes);
app.use('/api/users', userRoutes);

// Base Route
app.get('/', (req, res) => {
  res.send('MealNet API is running');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 