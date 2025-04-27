import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getUserByAuth0Id } from '../services/userService';

// Create the context
const UserContext = createContext();

// Provider component
export const UserProvider = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const [userDetails, setUserDetails] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (isAuthenticated && user?.sub && !isLoading) {
        setIsLoadingUser(true);
        setError(null);

        try {
          // Try to get user data from the database
          const response = await getUserByAuth0Id(user.sub);
          
          if (response.success && response.data) {
            setUserDetails(response.data);
          } else {
            // Fall back to checking localStorage
            const username = localStorage.getItem(`user_nickname_${user.sub}`);
            const accountType = localStorage.getItem(`user_type_${user.sub}`);
            
            if (username && accountType) {
              setUserDetails({
                auth0Id: user.sub,
                username,
                userType: accountType,
                // Additional fields can be added here
              });
            } else {
              // If no data is available, use basic Auth0 info
              setUserDetails({
                auth0Id: user.sub,
                username: user.name || 'User',
                userType: 'guest',
                // Additional fields can be added here
              });
            }
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError("Failed to load user information");
          
          // Fall back to Auth0 data
          setUserDetails({
            auth0Id: user.sub,
            username: user.name || 'User',
            userType: 'guest',
          });
        } finally {
          setIsLoadingUser(false);
        }
      } else if (!isAuthenticated && !isLoading) {
        // Clear user data when not authenticated
        setUserDetails(null);
      }
    };

    fetchUserData();
  }, [isAuthenticated, user, isLoading]);

  // Provide values and functions to consumers
  const value = {
    userDetails,
    setUserDetails,
    isLoadingUser,
    error,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook for consuming the context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext; 