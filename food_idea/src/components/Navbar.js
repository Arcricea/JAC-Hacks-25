import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import '../assets/styles/Navbar.css';
import AuthenticationButton from './auth/AuthenticationButton';

const Navbar = () => {
  const { isAuthenticated, user } = useAuth0();
  
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
          {isAuthenticated && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
        </div>
        
        <div className="auth-buttons">
          {isAuthenticated ? (
            <div className="user-profile-menu">
              <Link to="/profile" className="profile-link">
                <img 
                  src={user?.picture} 
                  alt={user?.name} 
                  className="profile-image"
                />
                <span className="profile-name">{user?.name?.split(' ')[0]}</span>
              </Link>
              <AuthenticationButton />
            </div>
          ) : (
            <>
              <AuthenticationButton />
              <Link to="/signup" className="signup-btn">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 