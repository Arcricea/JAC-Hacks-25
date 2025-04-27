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

// Update user account type
export const updateUserAccountType = async (auth0Id, accountType) => {
  try {
    // First get the user data
    const userData = await getUserByAuth0Id(auth0Id);
    
    if (!userData.success) {
      throw new Error('Failed to get user data');
    }
    
    // Update the account type
    const updatedUserData = {
      ...userData.data,
      accountType: accountType
    };
    
    // Save the updated user data
    const response = await saveUser(updatedUserData);
    
    return response;
  } catch (error) {
    console.error('Error updating user account type:', error);
    throw error;
  }
};

// Verify volunteer token
export const verifyVolunteerToken = async (token) => {
  try {
    const response = await fetch(`${API_URL}/users/verify-volunteer/${token}`);
    
    const data = await response.json();
    
    // Even if response is 4xx/5xx, we might get a JSON body with { success: false, message: ... }
    // We'll return the whole data object and let the caller check `success` or `isValid` flags.
    if (!response.ok && !data) {
      // Handle cases where the response is not ok and doesn't have a JSON body
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return data; // Return the full response data (includes success, isValid, message, volunteer details)
  } catch (error) {
    console.error('Error verifying volunteer token:', error);
    // Return a generic error structure or re-throw
    return { success: false, isValid: false, message: error.message || 'Network error or failed to verify token.' };
  }
};

// Verify volunteer code (replaces verifyVolunteerToken)
export const verifyVolunteerCode = async (username, code) => {
  try {
    const response = await fetch(`${API_URL}/users/verify-volunteer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, code }),
    });
    
    const data = await response.json();
    
    if (!response.ok && !data) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return data; // Contains success, isValid, message, etc.
  } catch (error) {
    console.error('Error verifying volunteer code:', error);
    return { success: false, isValid: false, message: error.message || 'Network error or failed to verify code.' };
  }
};

// Update need status for a food bank
export const updateNeedStatus = async (auth0Id, statusData) => {
  try {
    // First get the user data
    const userData = await getUserByAuth0Id(auth0Id);
    
    if (!userData.success) {
      throw new Error('Failed to get user data');
    }
    
    // Update the need status
    const updatedUserData = {
      ...userData.data,
      needStatus: {
        priorityLevel: statusData.priorityLevel,
        customMessage: statusData.customMessage
      }
    };
    
    // Save the updated user data
    const response = await saveUser(updatedUserData);
    
    return response;
  } catch (error) {
    console.error('Error updating need status:', error);
    throw error;
  }
}; 