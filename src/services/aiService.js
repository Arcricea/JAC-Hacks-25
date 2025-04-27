/**
 * Service for handling Gemini AI API requests.
 * Uses the environment variable REACT_APP_GEMINI_API_KEY.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Sends a message to the Gemini AI API and returns the response
 * @param {string} message - The user message to send to the AI
 * @returns {Promise<string>} - The AI response text
 */
export const sendMessageToAI = async (message) => {
  try {
    // Get API key from environment variables, checking multiple possible names
    let apiKey = process.env.REACT_APP_GEMINI_API_KEY || 
                 process.env.GEMINI_API_KEY || 
                 process.env.API_KEY_GEMINI || 
                 'AIzaSyCQN-U_bV2iNdWKJBGTEXKodOVNE-WoV0k'; // Fallback to a hardcoded key if needed
    
    if (!apiKey) {
      console.error('Gemini API key not found in environment variables');
      return 'Sorry, the AI service is currently unavailable. Please try again later.';
    }
    
    console.log('API key first 4 chars:', apiKey.substring(0, 4)); // Debug log (only first 4 chars for security)
    
    // Initialize the Generative AI SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });
    
    // Create chat session
    const chat = model.startChat({
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      history: [
        {
          role: "user",
          parts: [{ text: "You are a helpful assistant for a food donation platform."}],
        },
        {
          role: "model",
          parts: [{ text: "I'm your helpful assistant for the food donation platform. I can provide information about donations, food banks, volunteering, and more. How can I assist you today?"}],
        },
      ],
    });
    
    // Send message and get response
    const result = await chat.sendMessage(message);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error sending message to AI:', error);
    return 'Sorry, I encountered an error. Please try again later. Error details: ' + error.message;
  }
}; 