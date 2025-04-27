const Donation = require('../models/Donation');
const User = require('../models/User'); // Import User model
// const AssignedTask = require('../models/AssignedTask');

exports.createDonation = async (req, res) => {
  try {
    const { itemName, category, quantity, expirationDate, pickupInfo, imageUrl, userId } = req.body;

    // Validate required fields
    if (!itemName || !category || !quantity || !expirationDate || !pickupInfo || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        requiredFields: {
          itemName: !itemName,
          category: !category,
          quantity: !quantity,
          expirationDate: !expirationDate,
          pickupInfo: !pickupInfo,
          userId: !userId
        }
      });
    }

    // TODO: Implement logic to calculate estimatedValue based on item details
    // --- Basic Placeholder Calculation --- START
    let calculatedValue = 0;
    // Attempt to parse quantity as a number
    const quantityValue = parseFloat(quantity);
    
    // Simple estimate: $1 per unit of quantity (VERY basic)
    if (!isNaN(quantityValue)) {
        calculatedValue = quantityValue * 1; // $1 per unit 
    } else {
        // Fallback if quantity is not a simple number (e.g., "10 kg")
        calculatedValue = 1; // Default to $1 if parsing fails
        console.warn(`Could not parse quantity "${quantity}" for value estimation. Defaulting to 1.`);
    }
    
    // Note: This doesn't consider item category or actual cost!
    const estimatedValue = calculatedValue; 
    // --- Basic Placeholder Calculation --- END

    const donation = new Donation({
      userId,
      itemName,
      category,
      quantity,
      expirationDate,
      pickupInfo,
      imageUrl,
      estimatedValue // Add calculated value here eventually
    });

    await donation.save();

    res.status(201).json({
      success: true,
      data: donation
    });
  } catch (error) {
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
      .sort({ createdAt: -1 }); // Most recent first

    res.status(200).json({
      success: true,
      data: donations
    });
  } catch (error) {
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
    const { userId } = req.params; // Get userId (auth0Id) from URL parameters

    // Validate user exists (optional, but good practice)
    const donor = await User.findOne({ auth0Id: userId, accountType: 'business' });
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Supplier user not found.' });
    }

    // Get total number of donations made by this user
    const totalDonationsCount = await Donation.countDocuments({ userId: userId });

    // Get number of donations currently scheduled for pickup
    const upcomingPickupsCount = await Donation.countDocuments({ userId: userId, status: 'scheduled' });

    // Get the 5 most recent donations (regardless of status)
    const recentDonations = await Donation.find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('itemName quantity createdAt status'); // Select only needed fields

    // Placeholder for impact stats - replace with real calculation later
    const impactStats = {
      mealsSaved: totalDonationsCount * 3, // Example placeholder calculation
      co2Prevented: Math.round(totalDonationsCount * 1.5), // Example placeholder
      wasteReduced: totalDonationsCount * 2, // Example placeholder
    };

    const overviewData = {
      donatedItems: totalDonationsCount,
      upcomingPickups: upcomingPickupsCount,
      recentDonations: recentDonations.map(d => ({
        id: d._id,
        name: d.itemName,
        quantity: d.quantity,
        date: d.createdAt,
        status: d.status.charAt(0).toUpperCase() + d.status.slice(1) // Capitalize status
      })),
      impactStats: impactStats
    };

    res.status(200).json({
      success: true,
      data: overviewData
    });

  } catch (error) {
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
    const { userId } = req.params; // Get userId (auth0Id) from URL parameters

    // Find donations by this user that are either available or scheduled
    const donations = await Donation.find({
      userId: userId,
      status: { $in: ['available', 'scheduled'] } // Filter by status
    })
    .sort({ createdAt: -1 }) // Show most recent first
    .select('itemName quantity expirationDate status'); // Select relevant fields

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