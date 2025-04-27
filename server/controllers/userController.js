const crypto = require('crypto');
const speakeasy = require('speakeasy');
const User = require('../models/User');

// Create or update a user
exports.saveUser = async (req, res) => {
  try {
    // Get auth0Id from payload, other fields are optional for update
    const { auth0Id, username, accountType: incomingAccountType, needStatus, address, email, phone, openingHours, businessName, businessAddress, organizerPassword } = req.body;

    if (!auth0Id) { // Only auth0Id is strictly required in the payload now
      return res.status(400).json({ success: false, message: 'Missing required field: auth0Id' });
    }

    let user = await User.findOne({ auth0Id });
    const isNewUser = !user;

    if (isNewUser) {
      // If creating a new user, username and accountType ARE required
      if (!username || !incomingAccountType) {
        return res.status(400).json({ success: false, message: 'Missing required fields for new user: username and accountType' });
      }
       // Validate new user accountType and organizer password
       const validTypes = User.schema.path('accountType').enumValues;
       if (!validTypes.includes(incomingAccountType)) {
         return res.status(400).json({ success: false, message: 'Invalid account type for new user.' });
       }
       if (incomingAccountType === 'organizer') {
         const requiredPassword = 'ScoobyDoo';
         if (!organizerPassword || organizerPassword !== requiredPassword) {
            return res.status(403).json({ success: false, message: 'Incorrect or missing password required for new organizer account.'});
         }
       }
       
       const finalAccountType = incomingAccountType; // Use provided type for new user
       // Prepare data for NEW user creation
       const createData = {
          username,
          accountType: finalAccountType,
          ...(req.body.address !== undefined && { address: req.body.address.trim() }),
          ...(req.body.email !== undefined && { email: req.body.email.trim() }),
          ...(req.body.phone !== undefined && { phone: req.body.phone.trim() }),
          ...(req.body.openingHours !== undefined && finalAccountType === 'distributor' && { openingHours: req.body.openingHours.trim() }),
          ...(req.body.businessName !== undefined && (finalAccountType === 'business' || finalAccountType === 'distributor') && { businessName: req.body.businessName.trim() }),
          ...(req.body.businessAddress !== undefined && (finalAccountType === 'business' || finalAccountType === 'distributor') && { businessAddress: req.body.businessAddress.trim() }),
          ...(req.body.needStatus && finalAccountType === 'distributor' && { needStatus: req.body.needStatus })
          // Add other fields as needed for creation
       };
       user = new User({ auth0Id, ...createData });
       // Handle volunteer secret generation for new volunteer user
       if (finalAccountType === 'volunteer') {
         const secret = speakeasy.generateSecret({ length: 20 });
         user.volunteerSecret = secret.base32;
       }
       
    } else {
      // If updating existing user:
      const previousAccountType = user.accountType; // Store before potential update
      let finalAccountType = user.accountType; // Start with existing type
      
      // **CRITICAL: Prevent changing an admin/organizer type via this general save route.**
      if (user.accountType === 'organizer' && incomingAccountType && incomingAccountType !== 'organizer') {
         console.warn(`Attempt blocked to change organizer (${auth0Id}) type via saveUser`);
         // Don't update finalAccountType if it's an organizer being changed
      } else if (incomingAccountType && incomingAccountType !== user.accountType) {
         // Allow changing type if not organizer (and validate incoming type)
         const validTypes = User.schema.path('accountType').enumValues;
          if (!validTypes.includes(incomingAccountType)) {
              return res.status(400).json({ success: false, message: 'Invalid account type provided for update.' });
          }
          // Handle organizer password check if changing TO organizer
          if (incomingAccountType === 'organizer') { 
             const requiredPassword = 'ScoobyDoo';
             if (!req.body.organizerPassword || req.body.organizerPassword !== requiredPassword) {
                return res.status(403).json({ success: false, message: 'Incorrect or missing password required to change account type to organizer.'});
             }
          }
          finalAccountType = incomingAccountType; // Use the new valid type
      }
      
      // Prepare update data - only include fields present in the request body
      const updateData = {
        ...(finalAccountType !== user.accountType && { accountType: finalAccountType }), // Only include if changed
        ...(username && { username }), // Only update username if provided
        ...(req.body.address !== undefined && { address: req.body.address.trim() }),
        ...(req.body.email !== undefined && { email: req.body.email.trim() }),
        ...(req.body.phone !== undefined && { phone: req.body.phone.trim() }),
        // Apply role-specific fields if type is distributor OR organizer
        ...(req.body.openingHours !== undefined && (finalAccountType === 'distributor' || finalAccountType === 'organizer') && { openingHours: req.body.openingHours.trim() }),
        ...(req.body.businessName !== undefined && (finalAccountType === 'business' || finalAccountType === 'distributor' || finalAccountType === 'organizer') && { businessName: req.body.businessName.trim() }), // Org might have a name
        ...(req.body.businessAddress !== undefined && (finalAccountType === 'business' || finalAccountType === 'distributor' || finalAccountType === 'organizer') && { businessAddress: req.body.businessAddress.trim() }), // Org might have address
        ...(req.body.needStatus && (finalAccountType === 'distributor' || finalAccountType === 'organizer') && {
           needStatus: {
             ...(user.needStatus?.toObject() || { priorityLevel: 1, customMessage: '' }), 
             ...(req.body.needStatus.priorityLevel !== undefined && { priorityLevel: req.body.needStatus.priorityLevel }),
             ...(req.body.needStatus.customMessage !== undefined && { customMessage: req.body.needStatus.customMessage })
           }
         })
      };

      // Remove undefined or unchanged fields before assigning? No, Object.assign overwrites.
      // Remove fields that are not meant to be updated (e.g., accountType if organizer)
      if (user.accountType === 'organizer' && updateData.accountType !== 'organizer'){
        delete updateData.accountType;
      }

      Object.assign(user, updateData);

      // Handle volunteer secret logic based on finalAccountType and previous type
      if (finalAccountType === 'volunteer' && !user.volunteerSecret) { 
         const secret = speakeasy.generateSecret({ length: 20 });
         user.volunteerSecret = secret.base32;
      }
      else if (previousAccountType === 'volunteer' && finalAccountType !== 'volunteer') { 
        user.volunteerSecret = null; 
      }
    }

    // Save the user with specific error handling for save operation
    try {
      await user.save();
    } catch (saveError) {
      // Log the detailed error
      console.error('Error during user.save():', saveError);

      // Check for Mongoose validation errors
      if (saveError.name === 'ValidationError') {
        // Extract meaningful messages from the validation error
        const messages = Object.values(saveError.errors).map(el => el.message);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${messages.join(', ')}`,
          errors: saveError.errors
        });
      } 
      // Check for duplicate key errors (e.g., username already exists)
      else if (saveError.code === 11000) {
         return res.status(409).json({ // 409 Conflict
           success: false,
           message: `Save failed: A user with that ${Object.keys(saveError.keyValue).join(', ')} already exists.`,
           keyValue: saveError.keyValue
         });
      }
      
      // For other types of errors during save, return a generic 500
      return res.status(500).json({
        success: false,
        message: 'Server error occurred while saving user data.',
        error: saveError.message
      });
    }
    
    // Exclude sensitive info from the response
    const userResponse = user.toObject();
    delete userResponse.volunteerSecret;

    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    // Catch errors from findOne or other operations before save
    console.error('Error in saveUser controller (before save attempt):', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing user data request.',
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