import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import '../../assets/styles/UsernameSetupModal.css';

// API base URL - replace with your actual server URL
const API_URL = 'http://localhost:5000';

const UsernameSetupModal = ({ isOpen, onComplete }) => {
  const { user } = useAuth0();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Save to localStorage for immediate use
      localStorage.setItem(`username_set_${user.sub}`, 'true');
      localStorage.setItem(`user_nickname_${user.sub}`, username);
      
      // Save to MongoDB 
      const userData = {
        auth0Id: user.sub,
        username: username,
        email: user.email,
        userType: '', // Will be set in UserTypeModal
        profilePicture: user.picture
      };
      
      // Check if user already exists
      const checkResponse = await fetch(`${API_URL}/api/users/auth0/${user.sub}`);
      
      if (checkResponse.status === 404) {
        // User doesn't exist, create new user
        await fetch(`${API_URL}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });
      } else {
        // User exists, update username
        const existingUser = await checkResponse.json();
        await fetch(`${API_URL}/api/users/${existingUser._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        });
      }
      
      // Call the onComplete prop
      onComplete(username);
    } catch (error) {
      console.error('Failed to save username:', error);
      setError('Failed to save username. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="username-modal-overlay">
      <div className="username-modal">
        <div className="username-modal-content">
          <h2>Welcome to MealNet!</h2>
          <p>Please choose a username to continue</p>
          
          <form onSubmit={handleSubmit}>
            <div className="username-input-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                autoFocus
              />
              {error && <p className="username-error">{error}</p>}
            </div>
            
            <button 
              type="submit" 
              className="username-submit-btn"
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

export default UsernameSetupModal; 