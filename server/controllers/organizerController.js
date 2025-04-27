const User = require('../models/User');
const Donation = require('../models/Donation');

exports.getOrganizerDashboardData = async (req, res) => {
  try {
    // Fetch all food banks (distributors)
    const foodBanks = await User.find({ accountType: 'distributor' })
      .select('username needStatus businessName businessAddress auth0Id') // Select relevant fields
      .lean(); // Use lean for faster queries when not modifying docs

    console.log('Fetched Food Banks:', foodBanks.length); // Add log

    // Fetch all donations
    const donations = await Donation.find({})
      .populate({ // Populate Donor Info
        path: 'userId',
        model: 'User',
        select: 'username businessName accountType', // Add accountType
        foreignField: 'auth0Id'
      })
      .populate({ // Populate Volunteer Info
        path: 'volunteerId',    // Field in Donation model
        model: 'User',         // Model to populate from
        select: 'username',     // Fields to select from User
        foreignField: 'auth0Id' // Field in User model to match Donation.volunteerId
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log('Fetched Donations:', donations.length); // Add log

    // Separate donations by status
    const availableDonations = donations.filter(d => d.status === 'available');
    const scheduledDonations = donations.filter(d => d.status === 'scheduled');
    const completedDonations = donations.filter(d => d.status === 'completed');

    console.log('Sending JSON response...'); // Add log

    res.status(200).json({
      success: true,
      data: {
        foodBanks,
        donations: {
          available: availableDonations,
          scheduled: scheduledDonations,
          completed: completedDonations
        }
      }
    });

  } catch (error) {
    console.error('Error fetching organizer dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching organizer data',
      error: error.message
    });
  }
}; 