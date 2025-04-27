import React, { useState, useEffect, useContext } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import '../../assets/styles/UserTypeModal.css';
import { saveUser, getUserByAuth0Id } from '../../services/userService';
import { UserContext } from '../../App';

const UserTypeModal = ({ isOpen, onComplete }) => {
  const { user } = useAuth0();
  const { setUserData } = useContext(UserContext);
  const [selectedType, setSelectedType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  // Check if user already exists in database with account type when modal opens
  useEffect(() => {
    if (isOpen && user?.sub) {
      setInitialLoading(true);
      
      // Try to get existing user data
      getUserByAuth0Id(user.sub)
        .then(userData => {
          if (userData.success && userData.data && userData.data.accountType !== 'error') {
            // If user exists with valid account type, use it and complete setup
            localStorage.setItem(`user_type_${user.sub}`, userData.data.accountType);
            localStorage.setItem(`user_type_set_${user.sub}`, 'true');
            
            // Update global userData state
            setUserData(userData.data);
            
            // Close the modal and proceed
            onComplete(userData.data.accountType);
          } else if (userData.success && userData.data) {
            // User exists but needs to select account type
            setSelectedType(userData.data.accountType === 'error' ? '' : userData.data.accountType);
          }
        })
        .catch(error => {
          // User doesn't exist in database yet or other error
          console.log('Account type selection required');
        })
        .finally(() => {
          setInitialLoading(false);
        });
    }
  }, [isOpen, user, onComplete, setUserData]);

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
    },
    {
      id: 'volunteer',
      title: 'Volunteer',
      description: 'I want to help with food collection and distribution',
      icon: '🤝' // Example icon, change if desired
    },
    {
      id: 'organizer',
      title: 'Organizer',
      description: 'I organize food events or collections',
      icon: '🤝' // Example icon, change if desired
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
      const response = await saveUser({
        auth0Id: user.sub,
        username,
        accountType: selectedType
      });
      
      // Update the global userData state with the returned user data
      if (response.success && response.data) {
        setUserData(response.data);
      }
      
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
  
  if (initialLoading) {
    return (
      <div className="usertype-modal-overlay">
        <div className="usertype-modal">
          <div className="usertype-modal-content">
            <h2>Loading...</h2>
            <p>Checking your account information</p>
          </div>
        </div>
      </div>
    );
  }

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