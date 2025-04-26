import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "../../assets/styles/Profile.css";

const Profile = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <div className="profile-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <img src={user.picture} alt={user.name} className="profile-picture" />
          <h2>{user.name}</h2>
          <p className="profile-email">{user.email}</p>
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