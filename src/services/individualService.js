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

// Add other individual-specific service functions here if needed 