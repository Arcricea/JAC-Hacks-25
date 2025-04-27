import React, { useEffect, useState, useContext } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import '../assets/styles/Navbar.css';
import AuthenticationButton from './auth/AuthenticationButton';
import SignupButton from './auth/SignupButton';
import { UserContext } from '../App';

const Navbar = () => {
  const { isAuthenticated, user } = useAuth0();
  const { userData } = useContext(UserContext);
  const [displayName, setDisplayName] = useState('');
  const [userType, setUserType] = useState('');
  
  // Update display name and user type whenever user or userData changes
  useEffect(() => {
    if (userData) {
      // If we have userData from context, use it (this is the most up-to-date)
      setDisplayName(userData.username || '');
      setUserType(userData.accountType || '');
    } else if (user?.sub) {
      // Fallback to localStorage if context doesn't have data yet
      const savedNickname = localStorage.getItem(`user_nickname_${user.sub}`);
      if (savedNickname) {
        setDisplayName(savedNickname);
      } else {
        // Fall back to user object data
        setDisplayName(user.nickname || (user.name ? user.name.split(' ')[0] : user.email));
      }
      
      // Get user type
      const savedUserType = localStorage.getItem(`user_type_${user.sub}`);
      if (savedUserType) {
        setUserType(savedUserType);
      }
    } else {
      setDisplayName('');
      setUserType('');
    }
  }, [user, userData]);
  
  // Get display label for user type
  const getUserTypeLabel = () => {
    switch(userType) {
      case 'individual':
        return 'Individual';
      case 'business':
        return 'Business';
      case 'distributor':
        return 'Food Bank';
      case 'volunteer':
        return 'Volunteer';
      case 'organizer':
        return 'Organizer';
      default:
        return '';
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
          <Link to="/forum" className="nav-link">Forum</Link>
          {isAuthenticated && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
          {isAuthenticated && userData?.accountType === 'organizer' && (
            <NavLink 
              to="/admin" 
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              Admin
            </NavLink>
          )}
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