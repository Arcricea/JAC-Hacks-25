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