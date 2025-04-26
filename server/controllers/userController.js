const User = require('../models/User');

// Create or update a user
exports.saveUser = async (req, res) => {
  try {
    const { auth0Id, username, accountType } = req.body;

    // Validate required fields
    if (!auth0Id || !username || !accountType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: auth0Id, username, and accountType are required' 
      });
    }

    // Check if account type is valid
    const validTypes = ['individual', 'business', 'distributor'];
    if (!validTypes.includes(accountType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid account type. Must be individual, business, or distributor' 
      });
    }

    // Find user by auth0Id or create a new one
    let user = await User.findOne({ auth0Id });

    if (user) {
      // Update existing user
      user.username = username;
      user.accountType = accountType;
    } else {
      // Create new user
      user = new User({
        auth0Id,
        username,
        accountType
      });
    }

    await user.save();
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    // Handle username uniqueness error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.username) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get user by auth0Id
exports.getUserByAuth0Id = async (req, res) => {
  try {
    const { auth0Id } = req.params;
    
    if (!auth0Id) {
      return res.status(400).json({
        success: false,
        message: 'auth0Id is required'
      });
    }
    
    const user = await User.findOne({ auth0Id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}; 