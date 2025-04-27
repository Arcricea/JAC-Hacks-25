const API_URL = 'http://localhost:5000/api';

export const createDonation = async (donationData, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
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

export const getAvailableDonations = async (requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/donations/available`, {
      headers: {
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      }
    });
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

export const getDonationReceipt = async (userId, startDate, endDate, requestingUserId) => {
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

    const response = await fetch(url, {
      headers: {
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      }
    });
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

export const getSupplierOverviewData = async (userId, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/donations/overview/${userId}`, {
      headers: {
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      }
    });
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

export const getSupplierListedItems = async (userId, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/donations/supplier/listed/${userId}`, {
      headers: {
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      }
    });
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

export const confirmSupplierPickup = async (userId, codePayload, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/donations/supplier/confirm-pickup/${userId}`, {
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
    console.error('Error confirming supplier pickup:', error);
    throw error;
  }
};

export const assignDonationToVolunteer = async (donationId, volunteerId, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/donations/${donationId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      },
      body: JSON.stringify({ volunteerId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to assign donation');
    }
    
    return data;
  } catch (error) {
    console.error('Error assigning donation:', error);
    throw error;
  }
};

export const getVolunteerScheduledDonations = async (volunteerId, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/donations/volunteer/scheduled/${volunteerId}`, {
      headers: {
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      }
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch volunteer scheduled donations');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching volunteer scheduled donations:', error);
    throw error;
  }
};

export const getVolunteerCompletedDonationCount = async (volunteerId, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/donations/volunteer/completed-count/${volunteerId}`, {
      headers: {
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      }
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch volunteer completed donation count');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching volunteer completed donation count:', error);
    throw error;
  }
};

// Get volunteer completed donations for history
export const getVolunteerCompletedDonations = async (volunteerId, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/donations/volunteer/completed/${volunteerId}`, {
      headers: {
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      }
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch volunteer completed donations');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching volunteer completed donations:', error);
    throw error;
  }
};

// Cancel a donation assignment for a volunteer
export const cancelVolunteerAssignment = async (donationId, volunteerId) => {
  try {
    const response = await fetch(`${API_URL}/donations/${donationId}/cancel-assignment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ volunteerId }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to cancel pickup');
      } else {
        // Handle non-JSON responses (like HTML error pages)
        const text = await response.text();
        console.error('Server returned non-JSON response:', text);
        throw new Error('Server returned an invalid response. Please try again later.');
      }
    }
    
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error cancelling pickup:', error);
    return { success: false, message: error.message || 'Failed to cancel pickup' };
  }
};

// --- Remove unused functions below ---
/*
export const getVolunteerTasks = async (volunteerId) => {
  try {
    const response = await fetch(`${API_URL}/donations/volunteer/${volunteerId}/tasks`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch volunteer tasks');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching volunteer tasks:', error);
    throw error;
  }
};

export const updateTaskStatus = async (taskId, status) => {
  try {
    const response = await fetch(`${API_URL}/donations/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update task status');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};
*/ 

export const donationService = {
  createDonation,
  getSupplierListedItems,
  getSupplierOverviewData,
  getAvailableDonations,
  assignDonationToVolunteer,
  cancelVolunteerAssignment,
  confirmSupplierPickup,
  getVolunteerScheduledDonations,
  getVolunteerCompletedDonations,
  getVolunteerCompletedDonationCount,
  getDonationReceipt,
  markDonationDelivered: async (donationId, foodBankId) => {
    try {
      const response = await fetch(`${API_URL}/donations/${donationId}/delivered`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ foodBankId }),
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
  }
}; 