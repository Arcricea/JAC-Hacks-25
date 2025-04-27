const Donation = require('../models/Donation');
const User = require('../models/User'); // Import User model
const AssignedTask = require('../models/AssignedTask');

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
    const { userId } = req.params; // Get userId (auth0Id) from URL parameters
    // Note: In a real scenario, you might want to verify something from the scanned QR code 
    // passed in the request body (e.g., req.body.scannedCode) to ensure the correct pickup is being confirmed.
    // For this implementation, we are simply confirming based on the logged-in user triggering the action.

    // Find donations by this user that are either available or scheduled
    const updateResult = await Donation.updateMany(
      { 
        userId: userId, 
        status: { $in: ['available', 'scheduled'] } 
      },
      { $set: { status: 'completed' } } // Update status to completed
    );

    if (updateResult.matchedCount === 0) {
      return res.status(200).json({
        success: true, 
        message: 'No available or scheduled donations found to mark as completed.',
        modifiedCount: 0
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully marked ${updateResult.modifiedCount} donation(s) as completed.`,
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
    const { volunteerId } = req.body;

    // Find the donation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Create new assigned task
    const assignedTask = new AssignedTask({
      volunteerId,
      donationId: donation._id,
      itemName: donation.itemName,
      category: donation.category,
      quantity: donation.quantity,
      pickupInfo: donation.pickupInfo,
      expirationDate: donation.expirationDate
    });

    // Save the assigned task
    await assignedTask.save();

    // Remove the donation from available donations
    await Donation.findByIdAndDelete(donationId);

    res.status(200).json({
      success: true,
      data: assignedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning task',
      error: error.message
    });
  }
};

exports.getVolunteerTasks = async (req, res) => {
  try {
    const { volunteerId } = req.params;
    
    const tasks = await AssignedTask.find({ volunteerId })
      .sort({ assignedAt: -1 });

    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching volunteer tasks',
      error: error.message
    });
  }
};

// Add this function to the existing controller
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const task = await AssignedTask.findByIdAndUpdate(
      taskId,
      { status },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating task status',
      error: error.message
    });
  }
}; 