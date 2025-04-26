import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import '../../assets/styles/UsernameSetupModal.css';

const UsernameSetupModal = ({ isOpen, onComplete }) => {
  const { user } = useAuth0();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
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
    
    // In a production app, you'd verify username availability on your backend
    // For now, we're just saving to localStorage
    try {
      localStorage.setItem(`user_nickname_${user.sub}`, username);
      localStorage.setItem(`username_set_${user.sub}`, 'true');
      
      // Notify parent that username has been set
      onComplete(username);
    } catch (err) {
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