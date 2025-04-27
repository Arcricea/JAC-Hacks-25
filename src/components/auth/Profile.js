import React, { useState, useContext, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "../../assets/styles/Profile.css";
import { UserContext } from "../../App";
import { saveUser, updateUserAccountType } from "../../services/userService";

const Profile = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const { userData, setUserData } = useContext(UserContext);
  const [nickname, setNickname] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingAccountType, setIsChangingAccountType] = useState(false);
  const [error, setError] = useState("");
  const [accountTypeError, setAccountTypeError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [accountTypeSuccess, setAccountTypeSuccess] = useState("");

  // Set nickname from userData when it becomes available
  useEffect(() => {
    if (userData?.username) {
      setNickname(userData.username);
    }
  }, [userData]);

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
      // Save to both localStorage and database
      localStorage.setItem(`user_nickname_${user.sub}`, nickname);
      
      if (userData) {
        // Update in database
        await saveUser({
          auth0Id: user.sub,
          username: nickname,
          accountType: userData.accountType || 'individual'
        });
        
        // Update the global userData state
        setUserData(prev => ({
          ...prev,
          username: nickname
        }));
      }
      
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

  const handleBecomeVolunteer = async () => {
    if (!userData?.auth0Id) {
      setAccountTypeError("User profile not properly loaded. Please try again later.");
      return;
    }

    setIsChangingAccountType(true);
    setAccountTypeError("");

    try {
      // Update account type to volunteer
      const response = await saveUser({
        auth0Id: userData.auth0Id,
        username: userData.username,
        accountType: 'volunteer'
      });

      if (response.success) {
        // Update local state
        setUserData(prev => ({
          ...prev,
          accountType: 'volunteer'
        }));

        // Update localStorage
        localStorage.setItem(`user_type_${user.sub}`, 'volunteer');
        localStorage.setItem(`user_type_set_${user.sub}`, 'true');

        // Show success message
        setAccountTypeSuccess("You are now registered as a volunteer! Go to the dashboard to see your volunteer QR code.");
        setTimeout(() => {
          setAccountTypeSuccess("");
          // Reload the page to ensure all data is refreshed
          window.location.reload();
        }, 3000);
      } else {
        setAccountTypeError("Failed to update account type. Please try again.");
      }
    } catch (err) {
      setAccountTypeError("An error occurred. Please try again later.");
      console.error("Error changing account type:", err);
    } finally {
      setIsChangingAccountType(false);
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
                    setNickname(userData?.username || "");
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
        
        <div className="profile-account-type">
          <h3>Account Type</h3>
          <p>{userData?.accountType ? formatAccountType(userData.accountType) : "Not set"}</p>
          
          {userData?.accountType !== 'volunteer' && (
            <div className="volunteer-option">
              <p className="volunteer-info">Want to help distribute food and earn community service hours?</p>
              <button 
                className="become-volunteer-btn"
                onClick={handleBecomeVolunteer}
                disabled={isChangingAccountType}
              >
                {isChangingAccountType ? "Processing..." : "Become a Volunteer"}
              </button>
              {accountTypeError && <p className="error-message">{accountTypeError}</p>}
              {accountTypeSuccess && <p className="success-message">{accountTypeSuccess}</p>}
            </div>
          )}
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

// Helper function to format account type for display
function formatAccountType(type) {
  const types = {
    individual: "Individual User",
    business: "Business / Restaurant",
    distributor: "Food Bank / Distributor",
    volunteer: "Volunteer"
  };
  return types[type] || type;
}

export default Profile; 