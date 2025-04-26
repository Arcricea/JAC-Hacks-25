import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import '../../assets/styles/UserTypeModal.css';

// API base URL - replace with your actual server URL
const API_URL = 'http://localhost:5000';

const UserTypeModal = ({ isOpen, onComplete }) => {
  const { user } = useAuth0();
  const [selectedType, setSelectedType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const userTypes = [
    {
      id: 'individual',
      title: 'Individual',
      description: 'I want to find and share meals with my community',
      icon: '👤'
    },
    {
      id: 'business',
      title: 'Business',
      description: 'I represent a restaurant, cafe, or food service business',
      icon: '🏢'
    },
    {
      id: 'distributor',
      title: 'Food Bank / Distributor',
      description: 'I represent a food bank or distribution organization',
      icon: '🍲'
    }
  ];

  const handleSelection = async (selectedType) => {
    setIsSubmitting(true);
    
    try {
      // Save to localStorage for immediate use
      localStorage.setItem(`user_type_${user.sub}`, selectedType);
      localStorage.setItem(`user_type_set_${user.sub}`, 'true');
      
      // Save to MongoDB - update the user record
      // First find the user by Auth0 ID
      const response = await fetch(`${API_URL}/api/users/auth0/${user.sub}`);
      
      if (response.ok) {
        const userData = await response.json();
        // Update the user type
        const updateResponse = await fetch(`${API_URL}/api/users/${userData._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userType: selectedType }),
        });
        
        if (!updateResponse.ok) {
          console.error('Failed to update user type in database');
          setError('Failed to update user type. Please try again.');
          return;
        }
      } else {
        console.error('User not found in database');
        // Create a new user record if not found
        const createResponse = await fetch(`${API_URL}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth0Id: user.sub,
            username: localStorage.getItem(`user_nickname_${user.sub}`) || user.nickname || user.name,
            email: user.email,
            userType: selectedType,
            profilePicture: user.picture
          }),
        });
        
        if (!createResponse.ok) {
          console.error('Failed to create user in database');
          setError('Failed to save user information. Please try again.');
          return;
        }
      }
      
      // Call the onComplete prop
      onComplete(selectedType);
    } catch (error) {
      console.error('Failed to save user type:', error);
      setError('Failed to save user type. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedType) {
      setError('Please select an account type to continue');
      return;
    }

    handleSelection(selectedType);
  };

  if (!isOpen) return null;

  return (
    <div className="usertype-modal-overlay">
      <div className="usertype-modal">
        <div className="usertype-modal-content">
          <h2>Tell us about yourself</h2>
          <p>Select the option that best describes you</p>
          
          <form onSubmit={handleSubmit}>
            <div className="usertype-options">
              {userTypes.map(type => (
                <div 
                  key={type.id}
                  className={`usertype-option ${selectedType === type.id ? 'selected' : ''}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <div className="usertype-icon">{type.icon}</div>
                  <div className="usertype-details">
                    <h3>{type.title}</h3>
                    <p>{type.description}</p>
                  </div>
                  <div className="usertype-radio">
                    <div className="radio-outer">
                      {selectedType === type.id && <div className="radio-inner"></div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {error && <p className="usertype-error">{error}</p>}
            
            <button 
              type="submit" 
              className="usertype-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserTypeModal; 