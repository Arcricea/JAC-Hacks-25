const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

// Initialize Gemini AI with API key
const API_KEY = config.GEMINI_API_KEY || '';
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * Get food bank recommendations based on donation and user query
 * @param {Object} donation - The donation to be delivered
 * @param {Array} foodBanks - List of nearby food banks
 * @param {String} userQuery - The user's query/preferences
 * @returns {Array} - Ranked list of food banks with reasoning
 */
async function getRecommendations(donation, foodBanks, userQuery = '') {
  if (!genAI) {
    console.error('Gemini API not available. Please provide GEMINI_API_KEY in environment variables.');
    return { error: 'AI recommendation service unavailable', foodBanks };
  }

  try {
    // Format the donation and food bank data for the prompt
    const donationData = JSON.stringify({
      itemName: donation.itemName,
      category: donation.category,
      quantity: donation.quantity,
      expirationDate: donation.expirationDate
    });

    const foodBanksData = JSON.stringify(foodBanks.map(fb => ({
      id: fb.id || fb._id,
      name: fb.name,
      address: fb.address,
      needLevel: fb.needLevel,
      acceptedCategories: fb.acceptedCategories,
      needMessage: fb.needMessage
    })));

    // Create a prompt for the AI
    const prompt = `
    As a food distribution AI assistant, analyze this donation and recommend the best food banks for delivery.
    
    Donation information:
    ${donationData}
    
    Available nearby food banks:
    ${foodBanksData}
    
    User preferences or query:
    "${userQuery}"
    
    Please rank the food banks based on the following criteria:
    1. How well the donation matches the food bank's needs
    2. The need level of the food bank (higher need should be prioritized)
    3. Any specific user preferences mentioned in their query
    
    For each food bank, provide:
    - A ranking score from 1-10
    - A very brief reason (1-2 sentences) explaining why this food bank is a good match
    
    Respond with a valid JSON array of objects with the following structure:
    [
      {
        "id": "food_bank_id",
        "score": 9,
        "reason": "Brief explanation of match"
      }
    ]
    `;

    // Generate a response from Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    try {
      // Extract the JSON part if the response includes extra text
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const rankings = JSON.parse(jsonMatch[0]);
        
        // Combine rankings with original food bank data
        const rankedFoodBanks = rankings.map(ranking => {
          const foodBank = foodBanks.find(fb => 
            (fb.id === ranking.id || fb._id === ranking.id)
          );
          
          if (!foodBank) return null;
          
          return {
            ...foodBank,
            score: ranking.score,
            recommendation: ranking.reason
          };
        }).filter(fb => fb !== null);
        
        // Sort by score descending
        rankedFoodBanks.sort((a, b) => b.score - a.score);
        
        return rankedFoodBanks;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (jsonError) {
      console.error('Error parsing AI response:', jsonError);
      return { 
        error: 'Could not parse AI recommendations', 
        foodBanks: foodBanks 
      };
    }
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    return { 
      error: error.message || 'AI recommendation failed',
      foodBanks: foodBanks 
    };
  }
}

module.exports = {
  getRecommendations
}; 