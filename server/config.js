require('dotenv').config();

const config = {
    MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://gurevitchbenjamin:QTsKqh3hH47o5EH5@mealnet.hafpznx.mongodb.net/mealnet?retryWrites=true&w=majority&appName=Mealnet",
    PORT: process.env.PORT || 5000,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY
  };
   
  module.exports = config;