import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import '../../assets/styles/UserTypeModal.css';
import { saveUser } from '../../services/userService';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedType) {
      setError('Please select an account type to continue');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get the username from localStorage (set in UsernameSetupModal)
      const username = localStorage.getItem(`user_nickname_${user.sub}`);
      
      if (!username) {
        throw new Error('Username not found. Please set a username first.');
      }
      
      // Save to MongoDB via API
      await saveUser({
        auth0Id: user.sub,
        username,
        accountType: selectedType
      });
      
      // Still save to localStorage as a backup/for quick access
      localStorage.setItem(`user_type_${user.sub}`, selectedType);
      localStorage.setItem(`user_type_set_${user.sub}`, 'true');
      
      // Notify parent that user type has been set
      onComplete(selectedType);
    } catch (err) {
      setError(err.message || 'Failed to save selection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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