const API_URL = 'http://localhost:5000/api';

export const validateAddress = async (address) => {
  try {
    const response = await fetch(`${API_URL}/address/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to validate address');
    }
    
    return data;
  } catch (error) {
    console.error('Error validating address:', error);
    throw error;
  }
}; 