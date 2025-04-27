# Food Connect Server

## Environment Setup

To run the server properly with all features enabled, you need to set up the following environment variables in the `.env` file:

### Required Environment Variables

1. **MONGODB_URI**: Your MongoDB connection string (already configured)
2. **PORT**: Server port (default: 5000)
3. **GOOGLE_MAPS_API_KEY**: API key for Google Maps geocoding and mapping
4. **GEMINI_API_KEY**: API key for Google's Gemini AI model (for food bank recommendations)

### How to Get a Google Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click on "Get API key" or "Create API key"
4. Accept the terms and conditions
5. Copy the generated API key
6. Paste it as the `GEMINI_API_KEY` value in your `.env` file

### How to Get a Google Maps API Key

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project if you don't have one
3. Navigate to APIs & Services > Credentials
4. Click "Create Credentials" > "API Key"
5. Enable the Maps JavaScript API and Geocoding API for your project
6. Copy the API key
7. Paste it as the `GOOGLE_MAPS_API_KEY` value in your `.env` file

## Food Bank Feature

The server now includes a complete food bank integration with:

- Food bank model with geospatial querying
- QR code scanning for pickup and delivery verification
- AI-powered food bank recommendations
- Status tracking throughout the donation lifecycle

### Status Flow

Donations follow this lifecycle:
1. `available` - Initial state when donation is created
2. `scheduled` - Assigned to a volunteer
3. `picked_up` - Volunteer has picked up the donation
4. `delivered` - Donation delivered to a food bank
5. `completed` - Donation process completed
6. `cancelled` - Donation cancelled

### New Routes

- `/api/foodbanks` - CRUD operations for food banks
- `/api/foodbanks/nearby` - Find nearby food banks based on location
- `/api/foodbanks/recommend` - Get AI-powered food bank recommendations
- `/api/foodbanks/mark-pickup` - Mark donation as picked up
- `/api/foodbanks/mark-delivery` - Mark donation as delivered to a food bank 