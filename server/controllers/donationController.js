const Donation = require('../models/Donation');
const User = require('../models/User'); // Import User model
// const AssignedTask = require('../models/AssignedTask');
const mongoose = require('mongoose');

// Helper function to properly format donation status for display
const formatDonationStatus = (status) => {
  if (!status) return 'Unknown';
  
  const statusMap = {
    'available': 'Available',
    'scheduled': 'Scheduled',
    'picked_up': 'Picked Up',
    'delivered': 'Delivered',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  
  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
};

// --- Helper Functions for Code Generation (Should match frontend) ---

// Simple hash function (djb2)
const djb2Hash = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Ensure positive integer
};

// Generate an 8-digit code based on a seed string (e.g., auth0Id)
const generateVerificationCode = (seed) => {
  if (!seed) return null; // Return null on error/no seed
  try {
    const hash = djb2Hash(seed);
    const code = hash % 100000000;
    return code.toString().padStart(8, '0');
  } catch (err) {
    console.error("Error generating verification code on server:", err);
    return null;
  }
};

// --- End Helper Functions ---

exports.createDonation = async (req, res) => {
  try {
    const { userId, itemName, category, mealsSaved, co2Prevented } = req.body;
    let targetUserId = userId; // Get target user from body (potential admin action)
    const requestingUser = req.requestingUser; // Get authenticated user from middleware

    // --- Authorization & User ID Assignment ---
    if (!requestingUser) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const isAdmin = requestingUser.accountType === 'organizer';

    if (!isAdmin) {
      // If not an admin, force the userId to be the logged-in user's ID
      targetUserId = requestingUser.auth0Id;
    } else if (!targetUserId) {
      // If admin, but no target userId provided in body, it's an error
      return res.status(400).json({ success: false, message: 'Admin must specify a target userId in the request body.' });
    }
    // --- End Authorization ---

    // Validate required fields (using determined targetUserId)
    if (!itemName || !category || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        requiredFields: {
          itemName: !itemName,
          category: !category,
          userId: !targetUserId
        }
      });
    }

    // Find the target user (the one the donation belongs to)
    const targetUser = await User.findOne({ auth0Id: targetUserId });
    if (!targetUser) {
         return res.status(404).json({ success: false, message: 'Target user specified for donation not found.' });
    }

    // Use target user's address or default
    const businessAddress = targetUser.address || 'Address not available';

    // Handle file upload if present
    let imageUrl = req.body.imageUrl || null;
    if (req.file) {
      // If using multer or similar middleware for file uploads
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const donation = new Donation({
      userId: targetUserId,
      donorType: requestingUser.accountType.charAt(0).toUpperCase() + requestingUser.accountType.slice(1),
      itemName,
      category,
      imageUrl,
      businessAddress,
      // Add Gemini AI impact estimates
      mealsSaved: mealsSaved || 0,
      co2Prevented: co2Prevented || 0
    });

    await donation.save();

    res.status(201).json({
      success: true,
      data: donation
    });
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getAvailableDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ status: 'available' })
      .sort({ createdAt: -1 });

    const userIds = [...new Set(donations.map(d => d.userId))];
    const users = await User.find({ auth0Id: { $in: userIds } });

    const userMap = users.reduce((map, user) => {
      map[user.auth0Id] = {
        businessName: user.businessName,
        username: user.username,
        accountType: user.accountType,
        address: user.address
      };
      return map;
    }, {});

    const donationsWithDetails = donations.map(donation => {
      const user = userMap[donation.userId];
      const donationObj = donation.toObject();
      donationObj.businessName = user?.businessName || user?.username || 'Anonymous';
      donationObj.businessAddress = donation.businessAddress;
      return donationObj;
    });

    res.status(200).json({
      success: true,
      data: donationsWithDetails
    });
  } catch (error) {
    console.error('Error fetching available donations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available donations',
      error: error.message
    });
  }
};

// New function to generate donation receipts
exports.getDonationReceipts = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from URL parameters
    const { startDate, endDate, all } = req.query; // Get optional date range and "all" flag from query string

    // 1. Find the Donor User to get their details
    const donor = await User.findOne({ auth0Id: userId });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found.'
      });
    }

    // 2. Build the query for donations
    const query = {
      userId: userId
    };
    
    // Only filter by status if 'all' flag is not set to true
    if (all !== 'true') {
      query.status = 'completed'; // Only include completed donations
    }

    // Add date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Adjust endDate to include the whole day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }

    // 3. Fetch donations for the user within the date range
    const donations = await Donation.find(query)
      .sort({ createdAt: -1 }); // Sort by date descending (newest first)

    // 4. Calculate total estimated value (for completed donations)
    const totalEstimatedValue = donations
      .filter(d => d.status === 'completed')
      .reduce((sum, donation) => sum + (donation.estimatedValue || 0), 0);

    // 5. Format the receipt data
    const receiptData = {
      donorInfo: {
        businessName: donor.businessName || donor.username, // Fallback to username
        businessAddress: donor.address || 'Address not provided'
      },
      donations: donations.map(d => ({
        id: d._id,
        date: d.createdAt,
        itemName: d.itemName,
        category: d.category,
        quantity: d.quantity,
        status: formatDonationStatus(d.status),
        estimatedValue: d.estimatedValue || 0,
        mealsSaved: d.mealsSaved || 0,
        co2Prevented: d.co2Prevented || 0
      })),
      summary: {
        totalDonations: donations.length,
        totalEstimatedValue: totalEstimatedValue,
        startDate: startDate || 'Start of records',
        endDate: endDate || 'End of records',
        generatedAt: new Date()
      },
      disclaimer: "The stated approximate value is an internal estimate and may not reflect the Fair Market Value for tax purposes. Consult a tax professional for guidance on charitable donation deductions."
    };

    res.status(200).json({
      success: true,
      data: receiptData
    });

  } catch (error) {
    console.error('Error generating donation receipts:', error); // Log the specific error
    res.status(500).json({
      success: false,
      message: 'Error generating donation receipts',
      error: error.message
    });
  }
};

// New function to get supplier overview data
exports.getSupplierOverview = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get donations by this user
    const donations = await Donation.find({ userId });
    
    // Get recent donations with details
    const recentDonations = await Donation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('itemName quantity createdAt status category mealsSaved co2Prevented')
      .lean();
    
    // Calculate number of donated items
    const donatedItems = donations.length;
    
    // Count upcoming pickups (available or scheduled)
    const upcomingPickups = donations.filter(d => 
      d.status === 'available' || d.status === 'scheduled'
    ).length;
    
    // Sum up AI-estimated impact metrics
    const totalMealsSaved = donations.reduce((sum, donation) => 
      sum + (donation.mealsSaved || 0), 0);
    
    const totalCo2Prevented = donations.reduce((sum, donation) => 
      sum + (parseFloat(donation.co2Prevented) || 0), 0).toFixed(1);
    
    // Format recent donations for display
    const formattedRecentDonations = recentDonations.map(donation => ({
      id: donation._id,
      name: donation.itemName,
      quantity: donation.quantity || 'Not specified',
      date: donation.createdAt,
      status: formatDonationStatus(donation.status),
      category: donation.category,
      mealsSaved: donation.mealsSaved || 0,
      co2Prevented: donation.co2Prevented || 0
    }));
    
    // Prepare response object
    const overview = {
      donatedItems,
      upcomingPickups,
      impactStats: {
        totalMealsSaved,
        totalCo2Prevented
      },
      recentDonations: formattedRecentDonations
    };
    
    return res.status(200).json({
      success: true,
      data: overview
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching supplier overview',
      error: error.message
    });
  }
};

// New function to get a specific supplier's available/scheduled donations
exports.getSupplierListedDonations = async (req, res) => {
  try {
    const { userId } = req.params; // ID from URL
    const { requestingUser } = req; // User making the request
    
    let targetUserId = userId;
    let isRequestFromAdmin = requestingUser?.accountType === 'organizer';

    if (isRequestFromAdmin) {
      targetUserId = requestingUser.auth0Id; // Admin views their own added donations
    } else {
      // Optional: Verify non-admin is requesting their own data
      if (userId !== requestingUser?.auth0Id) {
         return res.status(403).json({ success: false, message: 'Forbidden: Cannot fetch donations for another user.' });
      }
    }

    // Find donations by targetUserId that are available or scheduled
    const donations = await Donation.find({
      userId: targetUserId, // Use targetUserId here
      status: { $in: ['available', 'scheduled'] } 
    })
    .sort({ createdAt: -1 }) 
    .select('itemName quantity expirationDate status'); 

    res.status(200).json({
      success: true,
      data: donations.map(d => ({
        id: d._id,
        name: d.itemName,
        quantity: d.quantity,
        expiry: d.expirationDate,
        status: d.status
      }))
    });

  } catch (error) {
    console.error('Error fetching supplier listed donations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier listed donations',
      error: error.message
    });
  }
};

// New function for Supplier to confirm pickup via Code or QR Scan
exports.confirmSupplierPickup = async (req, res) => {
  try {
    const { userId } = req.params; // Supplier's auth0Id
    const { confirmationCode, scannedVolunteerId } = req.body; // Get potential inputs

    let matchedVolunteerId = null;

    // --- Option 1: Validate using Confirmation Code ---
    if (confirmationCode) {
        if (confirmationCode.length !== 8 || !/^[0-9]+$/.test(confirmationCode)) {
            return res.status(400).json({ success: false, message: 'Invalid 8-digit confirmation code format.' });
        }

        // Find potential volunteers based on supplier's scheduled donations
        const scheduledDonations = await Donation.find({
            userId: userId,
            status: 'scheduled' 
        }).select('volunteerId').lean();

        if (!scheduledDonations || scheduledDonations.length === 0) {
            return res.status(404).json({ success: false, message: 'No scheduled donations found for this supplier to verify code against.' });
        }
        const potentialVolunteerIds = [...new Set(scheduledDonations.map(d => d.volunteerId).filter(id => id))];
        if (potentialVolunteerIds.length === 0) {
             return res.status(404).json({ success: false, message: 'No volunteers assigned to scheduled donations for this supplier.' });
        }

        const potentialVolunteers = await User.find({ 
             auth0Id: { $in: potentialVolunteerIds },
             accountType: 'volunteer' 
        }).select('auth0Id').lean();

        // Find the volunteer whose code matches
        for (const volunteer of potentialVolunteers) {
            const generatedCode = generateVerificationCode(volunteer.auth0Id);
            if (generatedCode === confirmationCode) {
                matchedVolunteerId = volunteer.auth0Id;
                break; 
            }
        }

        if (!matchedVolunteerId) {
            return res.status(400).json({ success: false, message: 'Invalid confirmation code provided.' });
        }
        console.log(`Confirmation successful via code for volunteer: ${matchedVolunteerId}`);

    // --- Option 2: Validate using Scanned Volunteer ID ---
    } else if (scannedVolunteerId) {
        // Basic validation if needed (e.g., check format if there's a standard)
        if (typeof scannedVolunteerId !== 'string' || scannedVolunteerId.trim() === '') { // Basic check
             return res.status(400).json({ success: false, message: 'Invalid scanned volunteer ID format.' });
        }
        // Assume the scanned ID is the correct volunteer ID
        // Optional: You *could* add a check here to ensure this volunteer ID exists 
        //           and is actually scheduled for a pickup from this supplier, for extra security.
        // Example Check (optional):
        // const isValidAssignment = await Donation.findOne({ userId: userId, volunteerId: scannedVolunteerId, status: 'scheduled' });
        // if (!isValidAssignment) {
        //     return res.status(400).json({ success: false, message: 'Scanned volunteer is not scheduled for a pickup from this supplier.' });
        // }
        matchedVolunteerId = scannedVolunteerId.trim();
        console.log(`Confirmation successful via scanned ID for volunteer: ${matchedVolunteerId}`);

    // --- No valid input provided ---
    } else {
        return res.status(400).json({ success: false, message: 'Confirmation code or scanned volunteer ID is required.' });
    }

    // --- If we have a matchedVolunteerId (from either method), proceed --- 
    if (!matchedVolunteerId) {
         // This should technically be caught by the specific checks above, but acts as a safeguard.
         return res.status(400).json({ success: false, message: 'Could not determine volunteer ID for confirmation.' });
    }

    // Update donations for the matched volunteer
    const updateResult = await Donation.updateMany(
      { 
        userId: userId, 
        volunteerId: matchedVolunteerId, 
        status: 'scheduled' 
      },
      { $set: { status: 'picked_up', pickupDate: new Date() } } 
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false, 
        message: 'No scheduled donations found for the verified volunteer to mark as picked up.', 
        modifiedCount: 0
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully confirmed pickup for ${updateResult.modifiedCount} donation(s). Volunteer ID: ${matchedVolunteerId}`,
      modifiedCount: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('Error confirming supplier pickup:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming supplier pickup',
      error: error.message
    });
  }
};

exports.assignDonationToVolunteer = async (req, res) => {
  try {
    const { donationId } = req.params;
    const { volunteerId } = req.body; // Expect volunteer's auth0Id

    if (!volunteerId) {
      return res.status(400).json({ success: false, message: 'Volunteer ID is required.' });
    }

    // Find the donation and check if it's available
    const donation = await Donation.findById(donationId);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.status !== 'available') {
        return res.status(400).json({ success: false, message: 'Donation is not available for assignment.' });
    }

    // Update the donation status and assign volunteer
    const updatedDonation = await Donation.findByIdAndUpdate(
      donationId,
      { 
        status: 'scheduled', 
        volunteerId: volunteerId 
      },
      { new: true } // Return the updated document
    );

    // --- Commented Out AssignedTask logic --- 
    // const assignedTask = new AssignedTask(...);
    // await assignedTask.save();
    // await Donation.findByIdAndDelete(donationId);
    // --- End Commented Out AssignedTask logic ---

    // Ensure updatedDonation is not null before sending response
    if (!updatedDonation) {
      // This case might happen if the donation was deleted between findById and findByIdAndUpdate
      return res.status(404).json({ success: false, message: 'Donation not found during update.' });
    }

    res.status(200).json({
      success: true,
      message: 'Donation successfully scheduled for pickup.',
      data: updatedDonation // Return the updated donation object
    });

  } catch (error) {
    console.error("Error assigning donation:", error); // Added logging
    res.status(500).json({
      success: false,
      message: 'Error assigning donation to volunteer', // Updated message
      error: error.message
    });
  }
};

// New function for volunteers to see their scheduled donations
exports.getVolunteerScheduledDonations = async (req, res) => {
  try {
    const { volunteerId } = req.params; // Expect volunteer's auth0Id

    const scheduledDonations = await Donation.find({
      volunteerId: volunteerId,
      status: { $in: ['scheduled', 'picked_up'] }  // Include both scheduled and picked_up status
    })
    .sort({ createdAt: 1 }); // Or sort by expirationDate, etc.

    // Get user info for each donation's donor
    const userIds = [...new Set(scheduledDonations.map(d => d.userId))];
    const donors = await User.find({ auth0Id: { $in: userIds } });
    
    // Create a map of user data
    const donorMap = donors.reduce((map, user) => {
      map[user.auth0Id] = {
        businessName: user.businessName,
        username: user.username,
        address: user.address
      };
      return map;
    }, {});
    
    // Add donor info to each donation
    const donationsWithDonorInfo = scheduledDonations.map(donation => {
      const donationObj = donation.toObject();
      const donor = donorMap[donation.userId];
      
      if (donor) {
        donationObj.businessName = donor.businessName || donor.username || 'Unknown';
        // If businessAddress is not already set, use donor's address
        if (!donationObj.businessAddress || donationObj.businessAddress === 'N/A') {
          donationObj.businessAddress = donor.address;
        }
      }
      
      return donationObj;
    });

    res.status(200).json({
      success: true,
      data: donationsWithDonorInfo
    });

  } catch (error) {
    console.error("Error fetching volunteer scheduled donations:", error);
    res.status(500).json({
      success: false,
      message: 'Error fetching volunteer scheduled donations',
      error: error.message
    });
  }
};

// New function to get the count of completed donations for a volunteer
exports.getVolunteerCompletedDonationCount = async (req, res) => {
  try {
    const { volunteerId } = req.params; // Expect volunteer's auth0Id

    if (!volunteerId) {
      return res.status(400).json({ success: false, message: 'Volunteer ID is required.' });
    }

    const completedCount = await Donation.countDocuments({
      volunteerId: volunteerId,
      status: 'completed'
    });

    res.status(200).json({
      success: true,
      data: {
        completedCount: completedCount
      }
    });

  } catch (error) {
    console.error("Error fetching volunteer completed donation count:", error);
    res.status(500).json({
      success: false,
      message: 'Error fetching volunteer completed donation count',
      error: error.message
    });
  }
};

exports.assignVolunteerToDonation = async (req, res) => {
  // ... existing code ...
};

// DELETE /api/donations/:id - Delete a donation (Organizer action)
exports.deleteDonationById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.requestingUser; // Get authenticated user from middleware

    // --- Authorization Check ---
    if (!requestingUser) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (requestingUser.accountType !== 'organizer') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only organizers can delete donations.' });
    }
    // --- End Authorization Check ---

    // Validate the ID format (optional but recommended)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Donation ID format' });
    }

    const deletedDonation = await Donation.findByIdAndDelete(id);

    if (!deletedDonation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    res.status(200).json({ success: true, message: 'Donation deleted successfully' });

  } catch (error) {
    console.error('Error deleting donation:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting donation',
      error: error.message
    });
  }
};

// Handle cancelling a volunteer assignment
exports.cancelVolunteerAssignment = async (req, res) => {
  try {
    const { donationId } = req.params;
    const { volunteerId } = req.body;

    // Validate inputs
    if (!donationId || !volunteerId) {
      return res.status(400).json({
        success: false,
        message: 'Donation ID and volunteer ID are required'
      });
    }

    // Validate donation ID format
    if (!mongoose.Types.ObjectId.isValid(donationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid donation ID format'
      });
    }

    // Find the donation
    const donation = await Donation.findById(donationId);
    
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Verify that this volunteer is assigned to this donation
    if (donation.volunteerId !== volunteerId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this pickup - it is not assigned to you'
      });
    }

    // Update the donation status back to available and remove the volunteer assignment
    donation.status = 'available';
    donation.volunteerId = null;
    
    await donation.save();

    res.status(200).json({
      success: true,
      message: 'Donation assignment cancelled successfully',
      data: donation
    });
  } catch (error) {
    console.error('Error cancelling volunteer assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// New function to get a volunteer's completed donations for history
exports.getVolunteerCompletedDonations = async (req, res) => {
  try {
    const { volunteerId } = req.params; // Expect volunteer's auth0Id

    const completedDonations = await Donation.find({
      volunteerId: volunteerId,
      status: 'completed'
    })
    .sort({ deliveryDate: -1 }); // Most recent completions first

    res.status(200).json({
      success: true,
      data: completedDonations
    });

  } catch (error) {
    console.error("Error fetching volunteer completed donations:", error);
    res.status(500).json({
      success: false,
      message: 'Error fetching volunteer completed donations',
      error: error.message
    });
  }
}; 