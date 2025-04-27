import React, { useState, useEffect, useContext } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import '../../assets/styles/UsernameSetupModal.css';
import { saveUser, getUserByAuth0Id } from '../../services/userService';
import { UserContext } from '../../App';

const UsernameSetupModal = ({ isOpen, onComplete }) => {
  const { user } = useAuth0();
  const { setUserData } = useContext(UserContext);
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
            
            // Update global userData state
            setUserData(userData.data);
            
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
  }, [isOpen, user, onComplete, setUserData]);

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
      
      // Save user to database with temporary account type (will be updated in UserTypeModal)
      // This ensures the user is created in the database even if they don't complete the account type step
      const response = await saveUser({
        auth0Id: user.sub,
        username,
        accountType: 'individual', // Default temporary type
        email: user.email || '' // Include email from Auth0 if available
      });
      
      // Update userData with server response
      if (response.success && response.data) {
        setUserData(response.data);
      } else {
        // If server save failed, still continue with localStorage data
        setUserData({
          auth0Id: user.sub,
          username,
          accountType: 'individual' // Default, will be properly set in UserTypeModal
        });
      }
      
      // Notify parent that username has been set
      onComplete(username);
    } catch (err) {
      console.error('Error saving user:', err);
      
      // If server save failed due to duplicate username, show error
      if (err.message && err.message.includes('already exists')) {
        setError(err.message || 'Username already taken. Please try another one.');
        setIsSubmitting(false);
        return;
      }
      
      // For other errors, still continue with localStorage only as fallback
      // This allows the flow to continue even if the database save fails
      setUserData({
        auth0Id: user.sub,
        username,
        accountType: 'individual'
      });
      
      // Notify parent that username has been set
      onComplete(username);
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