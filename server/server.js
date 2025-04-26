const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');
const app = express();
const PORT = config.PORT;

// Import routes
const foodRoutes = require('./routes/foodRoutes');
const userRoutes = require('./routes/userRoutes');

// Middleware
app.use(cors());
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