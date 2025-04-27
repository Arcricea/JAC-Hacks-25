const crypto = require('crypto');
const speakeasy = require('speakeasy');
const User = require('../models/User');

// Create or update a user
exports.saveUser = async (req, res) => {
  try {
    const { auth0Id, username, accountType, needStatus, address } = req.body;

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
      // Update existing user with all provided fields
      Object.assign(user, {
        username,
        accountType,
        ...(address !== undefined && { address }),
        ...(needStatus && accountType === 'distributor' && {
          needStatus: {
            ...user.needStatus || {},
            ...(needStatus.priorityLevel !== undefined && { priorityLevel: needStatus.priorityLevel }),
            ...(needStatus.customMessage !== undefined && { customMessage: needStatus.customMessage })
          }
        })
      });
    } else {
      // Create new user with all provided fields
      user = new User({
        auth0Id,
        username,
        accountType,
        ...(address !== undefined && { address }),
        ...(needStatus && accountType === 'distributor' && { needStatus })
      });
    }

    // --- Volunteer Secret Logic ---
    if (accountType === 'volunteer') {
      if (!user.volunteerSecret) {
        const secret = speakeasy.generateSecret({ length: 20 });
        user.volunteerSecret = secret.base32;
      }
    } else if (!isNewUser && previousAccountType === 'volunteer' && accountType !== 'volunteer') {
      user.volunteerSecret = null;
    }
    // --- End Volunteer Secret Logic ---

    // Save the user
    await user.save();
    
    // Exclude sensitive info from the response
    const userResponse = user.toObject();
    delete userResponse.volunteerSecret;

    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Save user error:', error); // Add this for debugging
    
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
    
    // Return user data - include secret ONLY if they are a volunteer
    // SECURITY NOTE: Sending the secret to the client is necessary for client-side TOTP generation
    // Ensure your frontend handles this securely and doesn't expose it unnecessarily.
    const userResponse = user.toObject();
    if (user.accountType !== 'volunteer') {
      delete userResponse.volunteerSecret;
    }
    
    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Verify volunteer code (replaces verifyVolunteerToken)
exports.verifyVolunteerCode = async (req, res) => {
  try {
    const { username, code } = req.body;
    
    if (!username || !code) {
      return res.status(400).json({
        success: false,
        isValid: false,
        message: 'Username and 6-digit code are required'
      });
    }
    
    // Find user by username
    const user = await User.findOne({ username: username });
    
    if (!user || user.accountType !== 'volunteer' || !user.volunteerSecret) {
      // User not found, not a volunteer, or doesn't have a secret setup
      return res.status(404).json({
        success: false,
        isValid: false,
        message: 'Invalid username or volunteer setup incomplete.'
      });
    }
    
    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: user.volunteerSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    
    if (verified) {
      res.status(200).json({
        success: true,
        isValid: true,
        message: 'Volunteer code is valid.',
        volunteer: { username: user.username }
      });
    } else {
      res.status(401).json({
        success: false,
        isValid: false,
        message: 'Invalid volunteer code.'
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during code verification.',
      error: error.message
    });
  }
}; 