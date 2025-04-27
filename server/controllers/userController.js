const crypto = require('crypto');
const speakeasy = require('speakeasy');
const User = require('../models/User');

// Create or update a user
exports.saveUser = async (req, res) => {
  try {
    const { auth0Id, username, accountType, needStatus, address, email, phone, openingHours, businessName, businessAddress, organizerPassword } = req.body;

    // Validate required fields
    if (!auth0Id || !username || !accountType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: auth0Id, username, and accountType are required' 
      });
    }

    // Check if account type is valid
    const validTypes = ['individual', 'business', 'distributor', 'volunteer', 'organizer'];
    if (!validTypes.includes(accountType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid account type. Must be one of: ' + validTypes.join(', ') 
      });
    }

    // Check if the organizer password is correct
    if (accountType === 'organizer') {
      const requiredPassword = 'ScoobyDoo'; // The password
      if (!organizerPassword || organizerPassword !== requiredPassword) {
        return res.status(403).json({ // 403 Forbidden
          success: false,
          message: 'Incorrect or missing password required for organizer account type.'
        });
      }
      // If password is correct, proceed
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
        ...(businessName !== undefined && { businessName }),
        ...(businessAddress !== undefined && { businessAddress }),
        ...(address !== undefined && { address }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(openingHours !== undefined && { openingHours }),
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
        ...(businessName !== undefined && { businessName }),
        ...(businessAddress !== undefined && { businessAddress }),
        ...(address !== undefined && { address }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(openingHours !== undefined && { openingHours }),
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

// PUT /api/users/reset-requests/:auth0Id - Reset need status for a food bank (Organizer action)
exports.resetUserRequests = async (req, res) => {
  try {
    const { auth0Id } = req.params;

    const updatedUser = await User.findOneAndUpdate(
      { auth0Id: auth0Id, accountType: 'distributor' }, // Ensure it's a food bank
      { 
        $set: { 
          needStatus: { 
            priorityLevel: 1, // Set to 'Do not need'
            customMessage: ''   // Clear custom message
          } 
        }
      },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Food bank user not found or is not a distributor.' });
    }

    // Exclude sensitive info from the response
    const userResponse = updatedUser.toObject();
    delete userResponse.volunteerSecret;

    res.status(200).json({ success: true, message: 'Food bank requests reset successfully', data: userResponse });

  } catch (error) {
    console.error('Error resetting food bank requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting food bank requests',
      error: error.message
    });
  }
};

// PUT /api/users/change-type/:auth0Id - Change a user's account type (Admin/Organizer action)
exports.changeUserAccountType = async (req, res) => {
  try {
    const { auth0Id } = req.params;
    const { newAccountType } = req.body;

    // TODO: Add middleware to ensure only admins/organizers can access this

    // Validate the new account type
    const validTypes = User.schema.path('accountType').enumValues;
    if (!newAccountType || !validTypes.includes(newAccountType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid account type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const user = await User.findOne({ auth0Id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const previousAccountType = user.accountType;
    const currentUsername = user.username;

    // <<< START USERNAME GENERATION LOGIC >>>
    const typeSuffixes = {
      individual: '_I',
      business: '_B',
      distributor: '_D',
      volunteer: '_V',
      organizer: '_O' 
    };
    const newSuffix = typeSuffixes[newAccountType];

    // Attempt to find and strip existing suffix to get base name
    let baseUsername = currentUsername;
    const knownSuffixes = Object.values(typeSuffixes);
    for (const suffix of knownSuffixes) {
      if (currentUsername.endsWith(suffix)) {
        baseUsername = currentUsername.slice(0, -suffix.length);
        break; // Stop after finding the first match
      }
    }

    const newUsername = `${baseUsername}${newSuffix}`;
    // <<< END USERNAME GENERATION LOGIC >>>

    // Update the account type and username
    user.accountType = newAccountType;
    user.username = newUsername; 

    // Handle side effects: Remove volunteer secret if no longer a volunteer
    if (previousAccountType === 'volunteer' && newAccountType !== 'volunteer') {
      user.volunteerSecret = undefined; // Remove the secret
    }

    // <<< Wrap save in try/catch for username uniqueness >>>
    try {
      await user.save();
    } catch (saveError) {
      // Check if it's the unique constraint violation for username
      if (saveError.code === 11000 && saveError.keyPattern && saveError.keyPattern.username) {
        return res.status(409).json({ // 409 Conflict
          success: false,
          message: `Failed to update: The generated username '${newUsername}' already exists. Please change the original username first.`
        });
      }
      // Re-throw other save errors
      throw saveError;
    }
    // <<< End uniqueness handling >>>

    // Exclude sensitive info from the response
    const userResponse = user.toObject();
    delete userResponse.volunteerSecret;

    res.status(200).json({ success: true, message: 'User account type and username updated successfully', data: userResponse });

  } catch (error) {
    // Catch errors from findOne or non-unique save errors
    console.error('Error changing user account type:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing account type',
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

// GET /api/users - Get all users (Admin/Organizer action)
exports.getAllUsers = async (req, res) => {
  try {
    // TODO: Add middleware to ensure only admins/organizers can access this
    const users = await User.find({}).select('-volunteerSecret'); // Exclude volunteerSecret

    res.status(200).json({ success: true, data: users });

  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
      error: error.message
    });
  }
}; 