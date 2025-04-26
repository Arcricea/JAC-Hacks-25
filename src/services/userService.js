const API_URL = 'http://localhost:5000/api';

// Save user data (username and account type)
export const saveUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to save user data');
    }
    
    return data;
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

// Get user data by Auth0 ID
export const getUserByAuth0Id = async (auth0Id) => {
  try {
    const response = await fetch(`${API_URL}/users/${auth0Id}`);
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get user data');
    }
    
    return data;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
}; 