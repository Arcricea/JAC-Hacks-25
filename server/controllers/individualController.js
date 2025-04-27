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
        const { itemsDescriptionFromUser, description, pickupInstructions, isPickupRequest, category } = req.body;
        const userId = req.user._id; // Get Mongoose user ID from auth middleware
        const userAuth0Id = req.user.auth0Id; // Get user Auth0 ID from auth middleware
        const userAddress = req.user.address; // Get user address object from auth middleware

        // Basic validation for the user-provided items description
        if (!itemsDescriptionFromUser || typeof itemsDescriptionFromUser !== 'string' || !itemsDescriptionFromUser.trim()) {
            return res.status(400).json({ success: false, message: 'A description of items to donate is required.' });
        }

        // Validate user address obtained from middleware
        if (!userAddress) {
             return res.status(400).json({ success: false, message: 'Your profile address is incomplete. Please update it before donating.' });
        }
        
        // Handle different address formats
        let validAddress = false;
        
        // Case 1: Address has street, city, zip structure
        if (userAddress.street && userAddress.city && userAddress.zip) {
            validAddress = true;
        }
        // Case 2: Address has just street field containing full address
        else if (userAddress.street && userAddress.street.trim()) {
            validAddress = true;
        }
        
        if (!validAddress) {
             return res.status(400).json({ success: false, message: 'Your profile address is incomplete. Please update it before donating.' });
        }

        // --- Prepare data for the NEW Donation schema --- 
        // Format address for storage
        let formattedAddress;
        
        if (typeof userAddress === 'string') {
            // If it's already a string, use as-is
            formattedAddress = userAddress;
        } 
        else if (userAddress && userAddress.street) {
            // If it has a street property, use that directly
            formattedAddress = userAddress.street;
        }
        else if (userAddress) {
            // Otherwise use the whole object
            formattedAddress = userAddress;
        }
        else {
            // Fallback to prevent errors
            formattedAddress = 'No address provided';
        }
        
        const donationData = {
            userId: userAuth0Id, // Store the Auth0 ID string
            donorType: 'Individual', // Set donor type
            items: [{ // Create items array from the description string
                name: itemsDescriptionFromUser.trim(), 
                quantity: 'Various' // Default quantity for text description
            }],
            // Set addresses directly as strings when possible
            pickupAddress: formattedAddress,
            businessAddress: formattedAddress,
            
            pickupInstructions: pickupInstructions?.trim() || '', // Optional instructions
            description: description?.trim() || '', // Optional description
            status: 'available', // Use 'available' as the initial status (must be in schema enum)
            
            // Set itemName to the user's input for backward compatibility
            itemName: itemsDescriptionFromUser.trim(),
            
            // For pickup requests, use the provided category
            category: category || 'other',
            
            // Mark this as a pickup request if specified
            isPickupRequest: isPickupRequest === true,
            
            // Keep necessary defaults
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
            .select('items createdAt status itemName category isPickupRequest businessAddress pickupAddress'); // Include address fields

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