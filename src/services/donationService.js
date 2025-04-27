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

export const getDonationReceipt = async (userId, startDate, endDate) => {
  try {
    // Construct the URL with query parameters for dates if they exist
    let url = `${API_URL}/donations/receipts/${userId}`;
    const params = new URLSearchParams();
    if (startDate) {
      params.append('startDate', startDate);
    }
    if (endDate) {
      params.append('endDate', endDate);
    }
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch donation receipt');
    }

    return data;
  } catch (error) {
    console.error('Error fetching donation receipt:', error);
    throw error;
  }
};

export const getSupplierOverviewData = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/donations/overview/${userId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch supplier overview data');
    }

    return data;
  } catch (error) {
    console.error('Error fetching supplier overview data:', error);
    throw error;
  }
};

export const getSupplierListedItems = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/donations/supplier/listed/${userId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch supplier listed items');
    }

    return data;
  } catch (error) {
    console.error('Error fetching supplier listed items:', error);
    throw error;
  }
};

export const confirmSupplierPickup = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/donations/supplier/confirm-pickup/${userId}`, {
      method: 'POST',
      // No body needed for this simplified version
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to confirm pickup');
    }

    return data; // Contains success message and modifiedCount
  } catch (error) {
    console.error('Error confirming supplier pickup:', error);
    throw error;
  }
}; 