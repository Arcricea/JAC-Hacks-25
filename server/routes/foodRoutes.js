const express = require('express');
const router = express.Router();
const Food = require('../models/Food');

// Get all food listings
router.get('/', async (req, res) => {
  try {
    const foodItems = await Food.find().sort({ createdAt: -1 });
    res.json(foodItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific food item
router.get('/:id', async (req, res) => {
  try {
    const foodItem = await Food.findById(req.params.id).populate('donorId', 'username email');
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.json(foodItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a food listing
router.post('/', async (req, res) => {
  const foodItem = new Food({
    name: req.body.name,
    description: req.body.description,
    quantity: req.body.quantity,
    expiryDate: req.body.expiryDate,
    donorId: req.body.donorId,
    location: req.body.location,
    imageUrl: req.body.imageUrl
  });

  try {
    const newFoodItem = await foodItem.save();
    res.status(201).json(newFoodItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a food listing
router.patch('/:id', async (req, res) => {
  try {
    const updatedFoodItem = await Food.findByIdAndUpdate(
      req.params.id, 
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedFoodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    
    res.json(updatedFoodItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a food listing
router.delete('/:id', async (req, res) => {
  try {
    const foodItem = await Food.findById(req.params.id);
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    
    await Food.findByIdAndDelete(req.params.id);
    res.json({ message: 'Food item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 