const API_URL = 'http://localhost:5000/api';

// Save user data (username and account type)
export const saveUser = async (userData, requestingUserId) => {
  try {
    console.log('Saving user data:', userData); // Add this for debugging
    
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    console.log('Save user response:', data); // Add this for debugging
    
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
// Add requestingUserId to include header for authorization
export const getUserByAuth0Id = async (auth0Id, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/users/${auth0Id}`, {
      headers: {
         ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      }
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get user data');
    }
    
    return data;
  } catch (error) {
    console.error('Error getting user data by Auth0 ID:', error);
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
export const updateNeedStatus = async (userId, statusData) => {
  try {
    // Get the current user data
    const userData = await getUserByAuth0Id(userId, userId);
    
    if (!userData || !userData.success || !userData.data) {
      throw new Error('Failed to get user data');
    }
    
    // Update the needStatus field only
    const updatedUserData = {
      ...userData.data,
      needStatus: {
        priorityLevel: statusData.priorityLevel,
        customMessage: statusData.customMessage
      }
    };
    
    // Use the regular saveUser endpoint which doesn't require organizer privileges
    const response = await saveUser(updatedUserData);
    
    return response;
  } catch (error) {
    console.error('Error updating need status:', error);
    throw error;
  }
};

// Add a new function to update food bank information
export const updateFoodBankInfo = async (auth0Id, foodBankInfo) => {
  try {
    console.log(`Updating food bank info for user ${auth0Id}`);
    const response = await fetch(`${API_URL}/users/${auth0Id}/foodbank-info`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(foodBankInfo),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error updating food bank info:', errorData);
      return { success: false, error: errorData };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error updating food bank info:', error);
    return { success: false, error };
  }
}; 