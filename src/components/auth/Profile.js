import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "../../assets/styles/Profile.css";

const API_URL = 'http://localhost:5000';

const Profile = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [userId, setUserId] = useState(null);
  
  // Fetch user data from MongoDB when component mounts
  useEffect(() => {
    if (isAuthenticated && user?.sub) {
      const fetchUserData = async () => {
        try {
          const response = await fetch(`${API_URL}/api/users/auth0/${user.sub}`);
          
          if (response.ok) {
            const userData = await response.json();
            if (userData.username) {
              setNickname(userData.username);
            }
            // Store the MongoDB _id for future API calls
            setUserId(userData._id);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback to localStorage
          const savedNickname = localStorage.getItem(`user_nickname_${user.sub}`);
          if (savedNickname) {
            setNickname(savedNickname);
          }
        }
      };
      
      fetchUserData();
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return <div className="profile-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleUpdateNickname = async () => {
    setIsSaving(true);
    setError("");
    
    try {
      // Save to localStorage for immediate use
      localStorage.setItem(`user_nickname_${user.sub}`, nickname);
      
      // Save to MongoDB
      if (userId) {
        // User exists in MongoDB, update their username
        await fetch(`${API_URL}/api/users/${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: nickname }),
        });
      } else {
        // Try to find user by Auth0 ID
        const response = await fetch(`${API_URL}/api/users/auth0/${user.sub}`);
        
        if (response.status === 404) {
          // User doesn't exist, create new user
          const userData = {
            auth0Id: user.sub,
            username: nickname,
            email: user.email,
            userType: localStorage.getItem(`user_type_${user.sub}`) || '',
            profilePicture: user.picture
          };
          
          const createResponse = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });
          
          if (createResponse.ok) {
            const newUser = await createResponse.json();
            setUserId(newUser._id);
          }
        } else {
          // User exists, update their username
          const userData = await response.json();
          setUserId(userData._id);
          
          await fetch(`${API_URL}/api/users/${userData._id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: nickname }),
          });
        }
      }
      
      // Show success message
      setSuccessMessage("Username updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Exit edit mode
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating username:', err);
      setError("Failed to update username. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <img src={user.picture} alt={user.name} className="profile-picture" />
          <h2>{user.name}</h2>
          <p className="profile-email">{user.email}</p>
        </div>
        
        <div className="profile-username-section">
          <h3>Username</h3>
          {isEditing ? (
            <div className="username-edit">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter a username"
                className="username-input"
              />
              <div className="username-actions">
                <button 
                  onClick={handleUpdateNickname} 
                  disabled={isSaving}
                  className="save-username-btn"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setNickname(user?.nickname || "");
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="error-message">{error}</p>}
            </div>
          ) : (
            <div className="username-display">
              <p>{nickname || "No username set"}</p>
              <button 
                onClick={() => setIsEditing(true)}
                className="edit-username-btn"
              >
                Edit
              </button>
            </div>
          )}
          {successMessage && <p className="success-message">{successMessage}</p>}
        </div>
        
        <div className="profile-details">
          {user.sub && <p><strong>Auth0 ID:</strong> {user.sub}</p>}
          {user.updated_at && (
            <p>
              <strong>Last Updated:</strong>{" "}
              {new Date(user.updated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 