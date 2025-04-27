const API_URL = 'http://localhost:5000/api';

// Get available volunteer opportunities
export const getAvailableVolunteerOpportunities = async (requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/volunteers/opportunities`, {
      headers: {
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      }
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch volunteer opportunities');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching volunteer opportunities:', error);
    throw error;
  }
};

// Register as a volunteer
export const registerVolunteer = async (volunteerData) => {
  try {
    const response = await fetch(`${API_URL}/volunteers/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(volunteerData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to register as volunteer');
    }
    
    return data;
  } catch (error) {
    console.error('Error registering volunteer:', error);
    throw error;
  }
};

// Get volunteer profile
export const getVolunteerProfile = async (volunteerId, requestingUserId) => {
  try {
    const response = await fetch(`${API_URL}/volunteers/${volunteerId}`, {
      headers: {
        ...(requestingUserId && { 'X-Requesting-User-Id': requestingUserId })
      }
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch volunteer profile');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching volunteer profile:', error);
    throw error;
  }
};

// Update volunteer availability
export const updateVolunteerAvailability = async (volunteerId, availabilityData) => {
  try {
    const response = await fetch(`${API_URL}/volunteers/${volunteerId}/availability`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(availabilityData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update volunteer availability');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating volunteer availability:', error);
    throw error;
  }
};

// Get volunteer statistics
export const getVolunteerStats = async (volunteerId) => {
  try {
    const response = await fetch(`${API_URL}/volunteers/${volunteerId}/stats`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch volunteer statistics');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching volunteer statistics:', error);
    throw error;
  }
};

// Submit volunteer feedback
export const submitVolunteerFeedback = async (feedbackData) => {
  try {
    const response = await fetch(`${API_URL}/volunteers/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit volunteer feedback');
    }
    
    return data;
  } catch (error) {
    console.error('Error submitting volunteer feedback:', error);
    throw error;
  }
};

// Verify volunteer token
export const verifyVolunteerToken = async (token) => {
  try {
    const response = await fetch(`${API_URL}/volunteers/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to verify volunteer token');
    }
    
    return data;
  } catch (error) {
    console.error('Error verifying volunteer token:', error);
    throw error;
  }
};

// Verify volunteer code
export const verifyVolunteerCode = async (code, email) => {
  try {
    const response = await fetch(`${API_URL}/volunteers/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, email }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to verify volunteer code');
    }
    
    return data;
  } catch (error) {
    console.error('Error verifying volunteer code:', error);
    throw error;
  }
};

// Assign donation to volunteer
export const assignDonationToVolunteer = async (donationId, volunteerId) => {
  try {
    const response = await fetch(`${API_URL}/donations/${donationId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ volunteerId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to assign donation to volunteer');
    }
    
    return data;
  } catch (error) {
    console.error('Error assigning donation to volunteer:', error);
    throw error;
  }
};

// Get volunteer scheduled donations
export const getVolunteerScheduledDonations = async (volunteerId) => {
  try {
    const response = await fetch(`${API_URL}/volunteers/${volunteerId}/scheduled-donations`);
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

// Get volunteer completed donation count
export const getVolunteerCompletedDonationCount = async (volunteerId) => {
  try {
    const response = await fetch(`${API_URL}/volunteers/${volunteerId}/completed-donations/count`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch volunteer completed donation count');
    }
    
    return data.count;
  } catch (error) {
    console.error('Error fetching volunteer completed donation count:', error);
    throw error;
  }
};

// Cancel volunteer assignment
export const cancelVolunteerAssignment = async (donationId, volunteerId, reason) => {
  try {
    const response = await fetch(`${API_URL}/donations/${donationId}/cancel-assignment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        volunteerId,
        reason
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to cancel volunteer assignment');
    }
    
    return data;
  } catch (error) {
    console.error('Error canceling volunteer assignment:', error);
    throw error;
  }
}; 