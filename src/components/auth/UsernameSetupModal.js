import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import '../../assets/styles/UsernameSetupModal.css';
import { saveUser, getUserByAuth0Id } from '../../services/userService';

const UsernameSetupModal = ({ isOpen, onComplete }) => {
  const { user } = useAuth0();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Check if user already exists in database when modal opens
  useEffect(() => {
    if (isOpen && user?.sub) {
      setInitialLoading(true);
      
      // Try to get existing user data
      getUserByAuth0Id(user.sub)
        .then(userData => {
          if (userData.success && userData.data) {
            // If user exists, use their username and complete setup
            localStorage.setItem(`user_nickname_${user.sub}`, userData.data.username);
            localStorage.setItem(`username_set_${user.sub}`, 'true');
            
            // Close the modal and proceed
            onComplete(userData.data.username);
          }
        })
        .catch(error => {
          // User doesn't exist in database yet, which is expected for new users
          console.log('New user setup required');
        })
        .finally(() => {
          setInitialLoading(false);
        });
    }
  }, [isOpen, user, onComplete]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    // Regular expression to check if username only contains letters, numbers, and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Save to localStorage for quick access
      localStorage.setItem(`user_nickname_${user.sub}`, username);
      localStorage.setItem(`username_set_${user.sub}`, 'true');
      
      // Check if user already exists and has an account type
      try {
        const userData = await getUserByAuth0Id(user.sub);
        if (userData.success && userData.data) {
          // If user exists, update with new username
          await saveUser({
            auth0Id: user.sub,
            username,
            accountType: userData.data.accountType
          });
        }
      } catch (error) {
        // User doesn't exist yet, which is fine
        // Will be created when account type is selected
      }
      
      // Notify parent that username has been set
      onComplete(username);
    } catch (err) {
      setError(err.message || 'Failed to save username. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  
  if (initialLoading) {
    return (
      <div className="username-modal-overlay">
        <div className="username-modal">
          <div className="username-modal-content">
            <h2>Loading...</h2>
            <p>Checking your account information</p>
          </div>
        </div>
      </div>
    );
  }

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