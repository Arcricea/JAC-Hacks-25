const Donation = require('../models/Donation');
const User = require('../models/User'); // Import User model
// const AssignedTask = require('../models/AssignedTask');
const mongoose = require('mongoose');

exports.createDonation = async (req, res) => {
  try {
    const { itemName, category, quantity, expirationDate, pickupInfo, imageUrl } = req.body;
    let targetUserId = req.body.userId; // Get target user from body (potential admin action)
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
    if (!itemName || !category || !quantity || !expirationDate || !pickupInfo || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        requiredFields: {
          itemName: !itemName,
          category: !category,
          quantity: !quantity,
          expirationDate: !expirationDate,
          pickupInfo: !pickupInfo,
          userId: !targetUserId // Check the determined targetUserId
        }
      });
    }

    // Find the target user (the one the donation belongs to)
    const targetUser = await User.findOne({ auth0Id: targetUserId });
    if (!targetUser) {
         return res.status(404).json({ success: false, message: 'Target user specified for donation not found.' });
    }
    // Ensure only businesses or admins acting as businesses can create donations (optional strict check)
    // if (!isAdmin && targetUser.accountType !== 'business') {
    //   return res.status(403).json({ success: false, message: 'Only business accounts can create donations directly.' });
    // }
    // if (isAdmin && targetUser.accountType !== 'business') {
    //   console.warn(`Admin (${requestingUser.auth0Id}) creating donation for non-business user (${targetUserId})`);
    //   // Decide if this should be allowed or return an error
    // }


    // Use target user's address or default
    const businessAddress = targetUser.address || 'Address not available'; // Adjusted default

    // Calculate estimated value
    let calculatedValue = 0;
    const quantityValue = parseFloat(quantity);
    if (!isNaN(quantityValue)) {
      calculatedValue = quantityValue * 1;
    } else {
      calculatedValue = 1;
      console.warn(`Could not parse quantity "${quantity}" for value estimation. Defaulting to 1.`);
    }

    const donation = new Donation({
      userId: targetUserId, // Use the determined target user ID
      itemName,
      category,
      quantity,
      expirationDate,
      pickupInfo,
      imageUrl,
      businessAddress,
      estimatedValue: calculatedValue
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
    const { startDate, endDate } = req.query; // Get optional date range from query string

    // 1. Find the Donor User to get their details
    const donor = await User.findOne({ auth0Id: userId, accountType: 'business' });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Business donor not found.'
      });
    }

    // 2. Build the query for donations
    const query = {
      userId: userId, 
      status: 'completed' // Only include completed donations
    };

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

    // 3. Fetch completed donations for the user within the date range
    const donations = await Donation.find(query)
      .sort({ createdAt: 1 }); // Sort by date ascending

    // 4. Calculate total estimated value
    const totalEstimatedValue = donations.reduce((sum, donation) => sum + (donation.estimatedValue || 0), 0);

    // 5. Format the receipt data
    const receiptData = {
      donorInfo: {
        businessName: donor.businessName || donor.username, // Fallback to username
        businessAddress: donor.businessAddress || 'Address not provided'
      },
      donations: donations.map(d => ({
        id: d._id,
        date: d.createdAt,
        itemName: d.itemName,
        category: d.category,
        quantity: d.quantity,
        estimatedValue: d.estimatedValue || 0
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
    const { userId } = req.params; // ID from URL (could be admin's or supplier's)
    const { requestingUser } = req; // User making the request (from middleware)

    let targetUserId = userId; // By default, use the ID from the URL
    let isRequestFromAdmin = requestingUser?.accountType === 'organizer';

    // If admin is making the request, they are querying data relative to *their own* actions
    if (isRequestFromAdmin) {
      targetUserId = requestingUser.auth0Id; // Use admin's ID for querying donations
    } else {
      // If not admin, ensure the requesting user matches the URL ID and is a business
      const donor = await User.findOne({ auth0Id: userId, accountType: 'business' });
      if (!donor) {
        return res.status(404).json({ success: false, message: 'Supplier user not found or ID mismatch.' });
      }
    }

    // --- Fetch data using targetUserId --- 
    const totalDonationsCount = await Donation.countDocuments({ userId: targetUserId });
    const upcomingPickupsCount = await Donation.countDocuments({ userId: targetUserId, status: 'scheduled' });
    const recentDonations = await Donation.find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('itemName quantity createdAt status'); 

    // Placeholder for impact stats - base on targetUserId's donations
    const impactStats = {
      mealsSaved: totalDonationsCount * 3,
      co2Prevented: Math.round(totalDonationsCount * 1.5),
      wasteReduced: totalDonationsCount * 2,
    };

    const overviewData = {
      donatedItems: totalDonationsCount,
      upcomingPickups: upcomingPickupsCount,
      recentDonations: recentDonations.map(d => ({
        id: d._id,
        name: d.itemName,
        quantity: d.quantity,
        date: d.createdAt,
        status: d.status.charAt(0).toUpperCase() + d.status.slice(1)
      })),
      impactStats: impactStats
    };

    res.status(200).json({
      success: true,
      data: overviewData
    });

  } catch (error) { // <<< Ensure catch block wraps the logic >>>
    console.error('Error fetching supplier overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier overview data',
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

// New function for Supplier to confirm pickup via QR scan
exports.confirmSupplierPickup = async (req, res) => {
  try {
    const { userId } = req.params; // Supplier's auth0Id
    const { scannedVolunteerId } = req.body; // Get volunteer ID from QR scan data

    if (!scannedVolunteerId) {
      return res.status(400).json({ success: false, message: 'Scanned volunteer ID is required.' });
    }

    // Find donations by this supplier, scheduled for this specific volunteer
    const updateResult = await Donation.updateMany(
      { 
        userId: userId, 
        volunteerId: scannedVolunteerId, // Match the specific volunteer
        status: 'scheduled' 
      },
      { $set: { status: 'completed' } } // Update status to completed
    );

    if (updateResult.matchedCount === 0) {
      return res.status(200).json({
        success: true, 
        message: 'No scheduled donations found for this supplier and volunteer combination to mark as completed.', // Updated message
        modifiedCount: 0
      });
    }

    // If update was successful, maybe update related AssignedTask status if that model is still used elsewhere
    // Example: await AssignedTask.updateMany({ volunteerId: scannedVolunteerId, status: 'pending' }, { $set: { status: 'completed' } });

    res.status(200).json({
      success: true,
      message: `Successfully marked ${updateResult.modifiedCount} donation(s) from volunteer ${scannedVolunteerId} as completed.`, // Updated message
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
      status: 'scheduled'
    })
    .sort({ createdAt: 1 }); // Or sort by expirationDate, etc.

    res.status(200).json({
      success: true,
      data: scheduledDonations
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