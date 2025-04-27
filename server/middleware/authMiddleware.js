const User = require('../models/User');

const isOrganizer = async (req, res, next) => {
  // Get the ID of the user making the request from a custom header
  const requestingUserId = req.headers['x-requesting-user-id'];

  if (!requestingUserId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized: Missing requesting user ID header (X-Requesting-User-Id).' 
    });
  }

  try {
    const requestingUser = await User.findOne({ auth0Id: requestingUserId }).lean();

    if (!requestingUser) {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: Requesting user not found.' 
      });
    }

    // Log the account type for debugging
    console.log(`[Auth Middleware] Checking account type: ${requestingUser.accountType}`);

    // Allow organizers, distributors, and businesses based on schema & observed need
    if (requestingUser.accountType !== 'organizer' && requestingUser.accountType !== 'distributor' && requestingUser.accountType !== 'business') {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: Action requires organizer, distributor, or business privileges.' 
      });
    }

    req.requestingUser = requestingUser;

    // If checks pass, proceed to the route handler
    next(); 

  } catch (error) {
    console.error('Error in isOrganizer middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authorization check.',
      error: error.message
    });
  }
};

module.exports = { isOrganizer }; 