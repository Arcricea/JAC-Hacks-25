const crypto = require('crypto');
const speakeasy = require('speakeasy');
const User = require('../models/User');

// Create or update a user
exports.saveUser = async (req, res) => {
  try {
    const { auth0Id, username, accountType, needStatus } = req.body;

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
      
      // Update needStatus if provided and user is a distributor (food bank)
      if (needStatus && (accountType === 'distributor')) {
        user.needStatus = {
          ...user.needStatus || {},
          ...(needStatus.priorityLevel !== undefined && { priorityLevel: needStatus.priorityLevel }),
          ...(needStatus.customMessage !== undefined && { customMessage: needStatus.customMessage })
        };
      }
    } else {
      // Create new user
      user = new User({
        auth0Id,
        username,
        accountType,
        // Add needStatus if provided and user is a distributor (food bank)
        ...(needStatus && accountType === 'distributor' && { needStatus })
      });
    }

    // --- Volunteer Secret Logic ---
    if (accountType === 'volunteer') {
      // Generate secret if user is becoming a volunteer and doesn't have one
      if (!user.volunteerSecret) {
        const secret = speakeasy.generateSecret({ length: 20 });
        user.volunteerSecret = secret.base32;
      }
    } else if (!isNewUser && previousAccountType === 'volunteer' && accountType !== 'volunteer') {
      // If changing *away* from volunteer, clear the secret
      user.volunteerSecret = null;
    }
    // --- End Volunteer Secret Logic ---

    await user.save();
    
    // Exclude sensitive info like secret from the response if necessary
    const userResponse = user.toObject();
    delete userResponse.volunteerSecret;

    res.status(200).json({
      success: true,
      data: userResponse
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

// PUT /api/users/reset-need/:userId - Reset need status for a food bank (Organizer action)
exports.resetFoodBankNeedStatus = async (req, res) => {
  try {
    const { userId } = req.params; // This is the auth0Id

    const updatedUser = await User.findOneAndUpdate(
      { auth0Id: userId, accountType: 'distributor' }, // Find the food bank user
      { $set: { needStatus: { priorityLevel: 1, customMessage: '' } } }, // Reset status
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Food bank user not found or not a distributor.' });
    }

    // Exclude sensitive info like secret from the response
    const userResponse = updatedUser.toObject();
    delete userResponse.volunteerSecret;

    res.status(200).json({ success: true, message: 'Food bank need status reset successfully', data: userResponse });

  } catch (error) {
    console.error('Error resetting food bank status:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting food bank status',
      error: error.message
    });
  }
};

// PUT /api/users/set-need/:userId - Set need status for a food bank (Organizer action)
exports.setFoodBankNeedStatusByOrganizer = async (req, res) => {
  try {
    const { userId } = req.params; // This is the food bank's auth0Id
    const { priorityLevel, customMessage } = req.body; // Get new status from request body

    // Validate input
    if (priorityLevel === undefined || customMessage === undefined) {
      return res.status(400).json({ success: false, message: 'priorityLevel and customMessage are required in the request body' });
    }
    if (typeof priorityLevel !== 'number' || priorityLevel < 1 || priorityLevel > 5) {
      return res.status(400).json({ success: false, message: 'priorityLevel must be a number between 1 and 5' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { auth0Id: userId, accountType: 'distributor' }, // Find the food bank user
      { $set: { needStatus: { priorityLevel, customMessage } } }, // Set the new status
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Food bank user not found or not a distributor.' });
    }

    // Exclude sensitive info like secret from the response
    const userResponse = updatedUser.toObject();
    delete userResponse.volunteerSecret;

    res.status(200).json({ success: true, message: 'Food bank need status updated successfully', data: userResponse });

  } catch (error) {
    console.error('Error setting food bank status by organizer:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting food bank status',
      error: error.message
    });
  }
};

// DELETE /api/users/:auth0Id - Delete a user (Organizer/Admin action)
exports.deleteUserByAuth0Id = async (req, res) => {
  try {
    const { auth0Id } = req.params;

    // Optional: Add checks here to prevent self-deletion or deletion of other vital accounts

    const deletedUser = await User.findOneAndDelete({ auth0Id: auth0Id });

    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // TODO Optional: Add logic here to delete associated data (e.g., donations made by this user)
    // This depends on your data model and desired behavior.
    // Example: await Donation.deleteMany({ userId: auth0Id });

    res.status(200).json({ success: true, message: 'User deleted successfully' });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
}; 