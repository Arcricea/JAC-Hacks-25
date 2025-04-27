import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get all messages
export const getAllMessages = async () => {
  try {
    const response = await axios.get(`${API_URL}/messages`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { success: false, error: error.message };
  }
};

// Save a new message
export const saveMessage = async (messageData) => {
  try {
    const response = await axios.post(`${API_URL}/messages`, messageData);
    return response.data;
  } catch (error) {
    console.error('Error saving message:', error);
    return { success: false, error: error.message };
  }
};

// Get messages in real-time (for future implementation with websockets)
export const subscribeToMessages = (callback) => {
  // This is a placeholder for real-time functionality
  // In a real implementation, this would use WebSockets or Server-Sent Events
  const interval = setInterval(async () => {
    const messages = await getAllMessages();
    if (messages.success) {
      callback(messages.data);
    }
  }, 5000);
  
  // Return unsubscribe function
  return () => clearInterval(interval);
};

// Delete a message
export const deleteMessage = async (messageId) => {
  try {
    const response = await axios.delete(`${API_URL}/messages/${messageId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting message:', error);
    return { success: false, error: error.message };
  }
}; 