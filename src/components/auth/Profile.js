<<<<<<< HEAD
import React, { useState } from "react";
=======
import React from "react";
>>>>>>> 639b2e151a493d6e1b2c70216b734204e47e5c23
import { useAuth0 } from "@auth0/auth0-react";
import "../../assets/styles/Profile.css";

const Profile = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
<<<<<<< HEAD
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
=======
>>>>>>> 639b2e151a493d6e1b2c70216b734204e47e5c23

  if (isLoading) {
    return <div className="profile-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

<<<<<<< HEAD
  const handleUpdateNickname = async () => {
    // This would require Auth0 Management API setup
    // For now, we'll just save it to localStorage as a demo
    setIsSaving(true);
    setError("");
    
    try {
      // In a real implementation, you would call the Auth0 Management API
      // For demo purposes, we'll store in localStorage
      localStorage.setItem(`user_nickname_${user.sub}`, nickname);
      
      // Show success message
      setSuccessMessage("Username updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Exit edit mode
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update username. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

=======
>>>>>>> 639b2e151a493d6e1b2c70216b734204e47e5c23
  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <img src={user.picture} alt={user.name} className="profile-picture" />
          <h2>{user.name}</h2>
          <p className="profile-email">{user.email}</p>
        </div>
<<<<<<< HEAD
        
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
        
=======
>>>>>>> 639b2e151a493d6e1b2c70216b734204e47e5c23
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