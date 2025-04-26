import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>MealNet</h3>
          <p>Reducing food waste, fighting hunger, and building a more sustainable future together.</p>
        </div>
        
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/how-it-works">How It Works</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>User Types</h3>
          <ul>
            <li><Link to="/for-restaurants">Restaurants & Grocers</Link></li>
            <li><Link to="/for-foodbanks">Food Banks & Shelters</Link></li>
            <li><Link to="/for-individuals">Individuals</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Connect With Us</h3>
          <div className="social-icons">
            <a href="#" className="social-icon">📱</a>
            <a href="#" className="social-icon">📘</a>
            <a href="#" className="social-icon">📸</a>
            <a href="#" className="social-icon">🐦</a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} MealNet. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 