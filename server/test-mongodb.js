const mongoose = require('mongoose');

// MongoDB connection URI - update with your own connection string if different
const mongoURI = 'mongodb+srv://gurevitchbenjamin:Dx1pu98X2evCxkgl@mealnet.hafpznx.mongodb.net/?retryWrites=true&w=majority&appName=Mealnet';

async function testConnection() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('MongoDB connection successful!');
    
    // Check database connection status
    const connectionState = mongoose.connection.readyState;
    console.log('Connection state:', getConnectionStateName(connectionState));
    
    // List all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(collection => console.log(`- ${collection.name}`));
    
  } catch (error) {
    console.error('MongoDB connection failed!');
    console.error('Error details:', error.message);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Helper function to get connection state name
function getConnectionStateName(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[state] || 'unknown';
}

// Run the test
testConnection(); 