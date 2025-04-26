import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import '../assets/styles/Navbar.css';
import AuthenticationButton from './auth/AuthenticationButton';
import SignupButton from './auth/SignupButton';

const API_URL = 'http://localhost:5000';

const Navbar = () => {
  const { isAuthenticated, user } = useAuth0();
  const [displayName, setDisplayName] = useState('');
  const [userType, setUserType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Update display name and user type whenever user changes
  useEffect(() => {
    if (user?.sub) {
      setIsLoading(true);
      
      // Fetch user data from MongoDB
      const fetchUserData = async () => {
        try {
          // Try to get user data from MongoDB first
          const response = await fetch(`${API_URL}/api/users/auth0/${user.sub}`);
          
          if (response.ok) {
            // User exists in database, use those details
            const userData = await response.json();
            
            if (userData.username) {
              setDisplayName(userData.username);
              // Sync to localStorage for offline use
              localStorage.setItem(`user_nickname_${user.sub}`, userData.username);
              localStorage.setItem(`username_set_${user.sub}`, 'true');
            } else {
              // Fallback to Auth0 data if no username set in MongoDB
              setDisplayName(user.nickname || (user.name ? user.name.split(' ')[0] : user.email));
            }
            
            if (userData.userType) {
              setUserType(userData.userType);
              // Sync to localStorage for offline use
              localStorage.setItem(`user_type_${user.sub}`, userData.userType);
              localStorage.setItem(`user_type_set_${user.sub}`, 'true');
            }
          } else {
            // User not in database, fall back to localStorage or Auth0 data
            const savedNickname = localStorage.getItem(`user_nickname_${user.sub}`);
            if (savedNickname) {
              setDisplayName(savedNickname);
            } else {
              setDisplayName(user.nickname || (user.name ? user.name.split(' ')[0] : user.email));
            }
            
            const savedUserType = localStorage.getItem(`user_type_${user.sub}`);
            if (savedUserType) {
              setUserType(savedUserType);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Error fetching from database, fall back to localStorage or Auth0 data
          const savedNickname = localStorage.getItem(`user_nickname_${user.sub}`);
          if (savedNickname) {
            setDisplayName(savedNickname);
          } else {
            setDisplayName(user.nickname || (user.name ? user.name.split(' ')[0] : user.email));
          }
          
          const savedUserType = localStorage.getItem(`user_type_${user.sub}`);
          if (savedUserType) {
            setUserType(savedUserType);
          }
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchUserData();
    } else {
      setDisplayName('');
      setUserType('');
    }
  }, [user]);
  
  // Get display label for user type
  const getUserTypeLabel = () => {
    switch(userType) {
      case 'individual':
        return 'Individual';
      case 'business':
        return 'Business';
      case 'distributor':
        return 'Food Bank';
      default:
        return '';
    }
  };

  // Get the correct dashboard route based on user type
  const getDashboardRoute = () => {
    switch(userType) {
      case 'individual':
        return '/individual-dashboard';
      case 'business':
        return '/supplier-dashboard';
      case 'distributor':
        return '/foodbank-dashboard';
      default:
        return '/dashboard'; // Fallback route
    }
  };
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-text">MealNet</span>
          <span className="logo-icon">🌱</span>
        </Link>
        
        <div className="nav-menu">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/how-it-works" className="nav-link">How It Works</Link>
          <Link to="/contact" className="nav-link">Contact</Link>
          {isAuthenticated && <Link to={getDashboardRoute()} className="nav-link">Dashboard</Link>}
        </div>
        
        <div className="auth-buttons">
          {isAuthenticated ? (
            <div className="user-profile-menu">
              <Link to="/profile" className="profile-link">
                <img 
                  src={user?.picture} 
                  alt={displayName || user?.name} 
                  className="profile-image"
                />
                <div className="profile-info">
                  <span className="profile-name">{displayName}</span>
                  {userType && <span className="user-type-badge">{getUserTypeLabel()}</span>}
                </div>
              </Link>
              <AuthenticationButton />
            </div>
          ) : (
            <>
              <AuthenticationButton />
              <SignupButton />
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 