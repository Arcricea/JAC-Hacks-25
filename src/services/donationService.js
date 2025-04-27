const API_URL = 'http://localhost:5000/api';

export const createDonation = async (donationData) => {
  try {
    const response = await fetch(`${API_URL}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(donationData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create donation');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating donation:', error);
    throw error;
  }
};

export const getAvailableDonations = async () => {
  try {
    const response = await fetch(`${API_URL}/donations/available`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch available donations');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching available donations:', error);
    throw error;
  }
}; 