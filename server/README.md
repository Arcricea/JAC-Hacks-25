# MealNet API Server

This is the backend server for the MealNet application, a platform that connects food donors with those in need of food.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)

## Getting Started

1. Clone the repository
2. Navigate to the server directory
3. Install dependencies:
   ```
   npm install
   ```
4. Make sure MongoDB is running on your local machine
5. Start the server:
   ```
   npm run dev
   ```
   
The server will start on port 5000 by default. You can change this by setting the PORT environment variable.

## API Endpoints

### User Routes
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/auth0/:auth0Id` - Get user by Auth0 ID
- `POST /api/users` - Create a new user
- `PATCH /api/users/:id` - Update user information
- `DELETE /api/users/:id` - Delete a user

### Food Routes
- `GET /api/food` - Get all food listings
- `GET /api/food/:id` - Get food item by ID
- `POST /api/food` - Create a new food listing
- `PATCH /api/food/:id` - Update a food listing
- `DELETE /api/food/:id` - Delete a food listing

## Database Models

### User
- `auth0Id` - Auth0 user ID (string, required, unique)
- `username` - Username (string, required)
- `email` - Email address (string, required, unique)
- `userType` - Type of user: "individual", "business", or "distributor" (string, required)
- `location` - User's location (string)
- `profilePicture` - URL to profile picture (string)
- `createdAt` - Creation timestamp (date, default: now)
- `donatedItems` - Array of food items donated by the user (references Food model)
- `claimedItems` - Array of food items claimed by the user (references Food model)

### Food
- `name` - Name of food item (string, required)
- `description` - Description of food item (string, required)
- `quantity` - Quantity available (number, required)
- `expiryDate` - Expiry date (date, required)
- `donorId` - Reference to the user who donated the food (references User model)
- `location` - Location of the food (string, required)
- `status` - Status of the food: "available", "reserved", or "picked-up" (string, default: "available")
- `imageUrl` - URL to image of the food (string)
- `createdAt` - Creation timestamp (date, default: now)

## Technologies Used
- Express.js - Web framework
- Mongoose - MongoDB object modeling
- Cors - Cross-origin resource sharing 