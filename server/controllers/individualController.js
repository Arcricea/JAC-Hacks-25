// Placeholder for individual user controllers
// Assume User model exists and includes address field and methods
// const User = require('../models/User'); // TODO: Adjust path and uncomment
// TODO: Define a placeholder User model/object structure if actual model isn't ready
const User = { 
    findById: async (id) => {
        // Placeholder: Simulate fetching user, replace with actual DB query
        console.warn('User Model: Using placeholder findById');
        if (id === 'placeholderUserId') {
            return { 
                id: 'placeholderUserId', 
                name: 'Test User', 
                // address: {} // Simulate user WITHOUT address initially
                address: { street: '123 Main St', city: 'Anytown', zip: '12345' } // Simulate user WITH address
            };
        } 
        return null;
    }
}; 

// Assume Donation model/service exists
// const Donation = require('../models/Donation'); // TODO: Adjust path and uncomment
// Assume VolunteerRequest model/service exists
// const VolunteerRequest = require('../models/VolunteerRequest'); // TODO: Adjust path and uncomment

// Import actual models
const Donation = require('../models/Donation'); 

// Controller function for creating a donation by an Individual
exports.createDonation = async (req, res) => {
    try {
        // Extract data specific to individual donations from req.body
        const { itemsDescriptionFromUser, description, pickupInstructions } = req.body;
        const userId = req.user._id; // Get Mongoose user ID from auth middleware
        const userAuth0Id = req.user.auth0Id; // Get user Auth0 ID from auth middleware
        const userAddress = req.user.address; // Get user address object from auth middleware

        // Basic validation for the user-provided items description
        if (!itemsDescriptionFromUser || typeof itemsDescriptionFromUser !== 'string' || !itemsDescriptionFromUser.trim()) {
            return res.status(400).json({ success: false, message: 'A description of items to donate is required.' });
        }

        // Validate user address obtained from middleware
        if (!userAddress || !userAddress.street || !userAddress.city || !userAddress.zip) {
             return res.status(400).json({ success: false, message: 'Your profile address is incomplete. Please update it before donating.' });
        }

        // --- Prepare data for the NEW Donation schema --- 
        const donationData = {
            userId: userAuth0Id, // Store the Auth0 ID string
            donorType: 'Individual', // Set donor type
            items: [{ // Create items array from the description string
                name: itemsDescriptionFromUser.trim(), 
                quantity: 'Various' // Default quantity for text description
            }],
            pickupAddress: userAddress, // Use the object from user profile
            pickupInstructions: pickupInstructions?.trim() || '', // Optional instructions
            description: description?.trim() || '', // Optional description
            status: 'available', // Use 'available' as the initial status (must be in schema enum)

            // --- Provide DEFAULT values for OLD REQUIRED fields --- 
            // Remove these if the frontend should use the `items` array instead
            // itemName: 'Individual Donation Items', // REMOVING DEFAULT
            // category: 'other', // Keep default or remove?
            // quantity: '1 Box/Bag', // REMOVING DEFAULT
            // expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Keep default or remove?
            // pickupInfo: 'Scheduled pickup required - see instructions' // Keep default or remove?

            // Keep necessary defaults if still required by schema and not provided otherwise
            category: 'other', // Assuming still required
            expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Assuming still required
            pickupInfo: 'Individual donation pickup' // Assuming still required, but more generic
        };

        // Create and save the new donation record
        const newDonation = new Donation(donationData);
        await newDonation.save();

        console.log(`Individual Donation record created: ${newDonation._id} by User: ${userId}`);
        // Respond with success and the created donation
        res.status(201).json({
             success: true, // Added success flag
             message: 'Donation successfully recorded.', 
             donation: newDonation 
        });

    } catch (error) {
        console.error('Error creating individual donation:', error); // Log the actual error
        // Check for Mongoose validation errors specifically
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(el => el.message);
             return res.status(400).json({ 
                 success: false, 
                 message: `Validation Failed: ${messages.join(', ')}`,
                 errors: error.errors // Send detailed errors back (optional)
             });
        }
        // Generic error for other issues
        res.status(500).json({ 
            success: false, // Added success flag
            message: 'Failed to record donation.', // Keep original message for frontend
            error: error.message // Send specific error message
        });
    }
};

// Controller function for requesting a volunteer pickup at user's address
// This still needs review based on the updated Donation schema
exports.requestVolunteer = async (req, res) => {
    // ... (requestVolunteer code needs updating for new schema too) ...
    // Placeholder response for now
     res.status(51).json({ message: 'Volunteer request endpoint needs update for new schema.' });
};

// Controller function for getting donations submitted by the logged-in individual
exports.getMyDonations = async (req, res) => {
    try {
        const userAuth0Id = req.user.auth0Id; // Get user Auth0 ID from auth middleware

        // Find donations where the userId matches the logged-in user's auth0Id
        const donations = await Donation.find({ userId: userAuth0Id })
            .sort({ createdAt: -1 }) // Sort by newest first
            .select('items createdAt status'); // Select only needed fields

        res.status(200).json({
            success: true,
            data: donations
        });

    } catch (error) {
        console.error('Error fetching individual donations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch donation history.',
            error: error.message
        });
    }
}; 