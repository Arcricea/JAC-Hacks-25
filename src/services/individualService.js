const API_URL = 'http://localhost:5000/api/individuals'; // Base URL for individual routes

// Function to get the logged-in individual's donation history
export const getMyDonations = async (requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/donations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Pass the Auth0 ID for authentication
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch donation history');
    }
    
    return data; // Should be { success: true, data: [...] }
  } catch (error) {
    console.error('Error fetching donation history:', error);
    throw error; // Re-throw the error to be caught by the component
  }
};

// Function to confirm pickup for individuals
export const confirmIndividualPickup = async (userId, codePayload, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/confirm-pickup/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      },
      body: JSON.stringify(codePayload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to confirm pickup');
    }

    return data; // Contains success message and modifiedCount
  } catch (error) {
    console.error('Error confirming individual pickup:', error);
    throw error;
  }
};

// Add other individual-specific service functions here if needed 