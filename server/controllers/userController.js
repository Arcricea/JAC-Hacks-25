const crypto = require('crypto');
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
    const validTypes = ['individual', 'business', 'distributor', 'volunteer'];
    if (!validTypes.includes(accountType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid account type. Must be one of: ' + validTypes.join(', ') 
      });
    }

    // Find user by auth0Id or create a new one
    let user = await User.findOne({ auth0Id });

    const isNewUser = !user;
    const previousAccountType = user?.accountType;

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

    // --- Volunteer Token Logic ---
    if (accountType === 'volunteer') {
      // Generate token if user is volunteer and doesn't have one
      if (!user.volunteerToken) {
        // Generate a unique token (16 bytes = 32 hex chars)
        user.volunteerToken = crypto.randomBytes(16).toString('hex');
        // Note: Extremely unlikely, but a collision could theoretically occur.
        // A robust implementation might loop and check DB uniqueness before saving.
      }
    } else if (!isNewUser && previousAccountType === 'volunteer' && accountType !== 'volunteer') {
      // If changing *away* from volunteer, clear the token
      user.volunteerToken = null;
    }
    // --- End Volunteer Token Logic ---

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

// Verify volunteer token
exports.verifyVolunteerToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Volunteer token is required'
      });
    }
    
    // Find user by the volunteer token
    const user = await User.findOne({ volunteerToken: token });
    
    if (!user) {
      // Token doesn't match any user
      return res.status(404).json({
        success: false,
        isValid: false,
        message: 'Invalid or unknown volunteer token.'
      });
    }
    
    // Check if the found user is actually a volunteer
    if (user.accountType !== 'volunteer') {
      // Token belongs to a user, but they are not a volunteer
      return res.status(403).json({
        success: false,
        isValid: false,
        message: 'Token holder is not registered as a volunteer.'
      });
    }
    
    // If token is found and user is a volunteer, return success
    res.status(200).json({
      success: true,
      isValid: true,
      message: 'Volunteer token is valid.',
      volunteer: {
        username: user.username
        // Add any other volunteer details you want to return upon verification
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during token verification.',
      error: error.message
    });
  }
}; 