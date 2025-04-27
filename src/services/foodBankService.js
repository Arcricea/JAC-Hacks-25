const API_URL = 'http://localhost:5000/api';

// Get all food banks
export const getAllFoodBanks = async () => {
  try {
    const response = await fetch(`${API_URL}/foodbanks`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch food banks');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching food banks:', error);
    throw error;
  }
};

// Get a single food bank by ID
export const getFoodBankById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/foodbanks/${id}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch food bank');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching food bank:', error);
    throw error;
  }
};

// Find nearby food banks
export const findNearbyFoodBanks = async (coordinates, options = {}) => {
  try {
    const { maxDistance, category, needLevel } = options;
    
    const payload = {
      longitude: coordinates.longitude,
      latitude: coordinates.latitude,
      ...(maxDistance && { maxDistance }),
      ...(category && { category }),
      ...(needLevel && { needLevel })
    };
    
    const response = await fetch(`${API_URL}/foodbanks/nearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to find nearby food banks');
    }
    
    return data;
  } catch (error) {
    console.error('Error finding nearby food banks:', error);
    throw error;
  }
};

// Get food bank recommendations
export const getFoodBankRecommendations = async (donationId, userQuery, coordinates) => {
  try {
    const payload = {
      donationId,
      userQuery,
      location: coordinates
    };
    
    const response = await fetch(`${API_URL}/foodbanks/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get food bank recommendations');
    }
    
    return data;
  } catch (error) {
    console.error('Error getting food bank recommendations:', error);
    throw error;
  }
};

// Mark donation as picked up
export const markDonationPickedUp = async (donationId, volunteerId) => {
  try {
    const response = await fetch(`${API_URL}/foodbanks/mark-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ donationId, volunteerId }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to mark donation as picked up');
    }
    
    return data;
  } catch (error) {
    console.error('Error marking donation as picked up:', error);
    throw error;
  }
};

// Mark donation as delivered to food bank
export const markDonationDelivered = async (donationId, volunteerId, foodBankId) => {
  try {
    const response = await fetch(`${API_URL}/foodbanks/mark-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ donationId, volunteerId, foodBankId }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to mark donation as delivered');
    }
    
    return data;
  } catch (error) {
    console.error('Error marking donation as delivered:', error);
    throw error;
  }
};

export const foodBankService = {
  getAllFoodBanks,
  getFoodBankById,
  findNearbyFoodBanks,
  getFoodBankRecommendations,
  markDonationPickedUp,
  markDonationDelivered
}; 