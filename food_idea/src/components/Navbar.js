import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-text">FoodForward</span>
          <span className="logo-icon">🌱</span>
        </Link>
        
        <div className="nav-menu">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/how-it-works" className="nav-link">How It Works</Link>
          <Link to="/contact" className="nav-link">Contact</Link>
        </div>
        
        <div className="auth-buttons">
          <Link to="/login" className="login-btn">Login</Link>
          <Link to="/signup" className="signup-btn">Sign Up</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 