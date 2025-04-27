import axios from 'axios';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export const sendMessageToGemini = async (messages) => {
  try {
    // Format the messages for Gemini API
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await axios.post(
      `${API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: formattedMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      },
      { 
        timeout: 15000, // 15 second timeout
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const responseText = response.data.candidates[0].content.parts[0].text;
      return { success: true, data: responseText };
    } else {
      return { success: false, error: 'No response from Gemini API' };
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Check for rate limiting (429) errors
    if (error.response && error.response.status === 429) {
      return { 
        success: false, 
        error: '429: Rate limit exceeded. Please try again later.',
        isRateLimit: true
      };
    }
    
    // Check for timeout
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Request timed out. The service may be busy.',
        isTimeout: true
      };
    }
    
    // Network errors
    if (error.request && !error.response) {
      return {
        success: false,
        error: 'Network error. Please check your connection.',
        isNetworkError: true
      };
    }
    
    return { 
      success: false, 
      error: error.response?.data?.error?.message || 'Failed to connect to Gemini API' 
    };
  }
};

// Gemini 2.0 Flash API integration for food donation impact estimation

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY; // Use environment variable

/**
 * Estimates the environmental impact of food donations using Gemini 2.0 
 * @param {string} foodDescription - Detailed description of the food being donated
 * @param {string} category - Food category
 * @returns {Promise<{mealsSaved: number, co2Prevented: number}>} Impact estimates
 */
export const estimateFoodDonationImpact = async (foodDescription, category) => {
  try {
    const prompt = `
You are an expert in food waste reduction and environmental impact assessment. 
Analyze this food donation and provide a scientific estimate of:
1. Number of meals that can be made from this food (1 meal = approximately 600 calories)
2. Kilograms of CO2 emissions prevented by rescuing this food from disposal

Food description: ${foodDescription}
Category: ${category}

Respond ONLY with a JSON object in this exact format:
{
  "mealsSaved": [number of meals, integer only],
  "co2Prevented": [kg of CO2 prevented, rounded to 1 decimal place]
}
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      return { mealsSaved: 0, co2Prevented: 0 }; // Default values on error
    }

    // Extract text from Gemini response
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Parse the JSON response
    try {
      // Find JSON object in the response text (in case there's any extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const estimates = JSON.parse(jsonMatch[0]);
        
        // Validate and sanitize values
        const mealsSaved = Math.max(0, parseInt(estimates.mealsSaved) || 0);
        const co2Prevented = Math.max(0, parseFloat(estimates.co2Prevented) || 0);
        
        return { 
          mealsSaved: mealsSaved, 
          co2Prevented: co2Prevented.toFixed(1)
        };
      }
      
      throw new Error('Invalid JSON format in response');
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError, generatedText);
      return { mealsSaved: 0, co2Prevented: 0 };
    }
  } catch (error) {
    console.error('Error estimating food donation impact:', error);
    return { mealsSaved: 0, co2Prevented: 0 };
  }
};

/**
 * Estimates the monetary value of food donations
 * @param {string} foodDescription - Description of the food being donated
 * @param {string} category - Food category
 * @returns {Promise<{estimatedValue: number}>} Monetary value estimate in USD
 */
export const estimateFoodDonationValue = async (foodDescription, category) => {
  try {
    const prompt = `
You are an expert in food valuation and pricing. 
Analyze this food donation and provide a reasonable estimate of its monetary value.

Food description: ${foodDescription}
Category: ${category}

Consider factors such as:
- Typical retail prices for similar items
- Quantity described
- Quality/freshness (if mentioned)
- Market value in the United States

Respond ONLY with a JSON object in this exact format:
{
  "estimatedValue": [estimated dollar value, number only, rounded to 2 decimal places]
}
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      // Use a fixed fallback value instead of a function call
      return { estimatedValue: 0.00 }; // Default value on error
    }

    // Extract text from Gemini response
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Parse the JSON response
    try {
      // Find JSON object in the response text (in case there's any extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const estimate = JSON.parse(jsonMatch[0]);
        
        // Validate and sanitize value
        const value = Math.max(0, parseFloat(estimate.estimatedValue) || 0);
        
        return { 
          estimatedValue: parseFloat(value.toFixed(2))
        };
      }
      
      throw new Error('Invalid JSON format in response');
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError, generatedText);
      return { estimatedValue: 0.00 };
    }
  } catch (error) {
    console.error('Error estimating food donation value:', error);
    return { estimatedValue: 0.00 };
  }
};

/**
 * Batch estimates the monetary value of multiple food donations in a single request
 * @param {Array<{id: string, itemName: string, category: string}>} donations - Array of donations to estimate
 * @returns {Promise<Object>} Map of donation IDs to their estimated values
 */
export const batchEstimateFoodDonationValues = async (donations) => {
  if (!donations || donations.length === 0) {
    return {};
  }
  
  try {
    // Create donation list for prompt
    const donationList = donations.map((d, index) => 
      `Donation ${index + 1}:\n- Description: ${d.itemName || 'No description'}\n- Category: ${d.category || 'Other'}\n- ID: ${d.id}`
    ).join('\n\n');
    
    const prompt = `
You are an expert in food valuation and pricing. 
Analyze the following food donations and provide reasonable monetary value estimates for each one.

${donationList}

Consider factors such as:
- Typical retail prices for similar items
- Quantity described (if large quantities, provide total value)
- Quality/freshness (if mentioned)
- Market value in the United States

Respond ONLY with a valid JSON object in this exact format:
{
  "estimates": [
    {"id": "donation_id_1", "value": 10.50},
    {"id": "donation_id_2", "value": 25.75},
    ...etc for all donations
  ]
}

The "id" field must match exactly the IDs provided in the donation list, and the "value" field must be a number representing the estimated dollar value (USD) rounded to 2 decimal places.
`;

    console.log(`Sending batch request for ${donations.length} donations to Gemini API`);
    
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 2048, // Increased for larger responses
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API batch estimation error:', data);
      // Return default values for all donations
      return donations.reduce((acc, donation) => {
        acc[donation.id] = 0.00;
        return acc;
      }, {});
    }

    // Extract text from Gemini response
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Parse the JSON response
    try {
      // Find JSON object in the response text
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const estimatesObj = JSON.parse(jsonMatch[0]);
        
        if (!estimatesObj.estimates || !Array.isArray(estimatesObj.estimates)) {
          throw new Error('Invalid response format: missing estimates array');
        }
        
        // Convert array to map of id -> value
        const estimatesMap = {};
        estimatesObj.estimates.forEach(item => {
          if (item.id && typeof item.value !== 'undefined') {
            // Ensure value is a valid number
            const value = parseFloat(item.value);
            estimatesMap[item.id] = isNaN(value) ? 0.00 : Math.max(0, value);
          }
        });
        
        // Add default values for any donations that weren't in the response
        donations.forEach(donation => {
          if (!estimatesMap[donation.id]) {
            estimatesMap[donation.id] = 0.00;
          }
        });
        
        return estimatesMap;
      }
      
      throw new Error('Invalid JSON format in batch response');
    } catch (parseError) {
      console.error('Error parsing Gemini batch response:', parseError, generatedText);
      // Return default values for all donations
      return donations.reduce((acc, donation) => {
        acc[donation.id] = 0.00;
        return acc;
      }, {});
    }
  } catch (error) {
    console.error('Error in batch estimation:', error);
    // Return default values for all donations
    return donations.reduce((acc, donation) => {
      acc[donation.id] = 0.00;
      return acc;
    }, {});
  }
}; 