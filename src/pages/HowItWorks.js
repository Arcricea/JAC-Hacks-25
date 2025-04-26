import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/HowItWorks.css';
import donationBox from '../assets/donation_box.webp';
import shoppingVeges from '../assets/shopping_veges.jpg';
import handingApple from '../assets/handing_apple2.webp';

const HowItWorks = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [donationBox, shoppingVeges, handingApple];
  const imageNames = ['Donation Box', 'Shopping Vegetables', 'Handing Apple'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="how-it-works-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1>Making Food Rescue Easier and Faster</h1>
            <p>
              Join our mission to reduce food waste and feed those who need it most. 
              MealNet connects food banks with suppliers and individuals who want to help, in a system that benefits everyone! 
            </p>
            <div className="hero-buttons">
              <Link to="/signup" className="primary-btn">Get Started Now</Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="rotating-images">
              {images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={imageNames[index]}
                  className={`hero-img ${index === currentImageIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="process-section">
        <h2>Our Simple Process</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-icon">📝</div>
            <h3>1. Sign Up</h3>
            <p>Create your account as a food supplier, food bank, or individual volunteer</p>
          </div>
          <div className="step">
            <div className="step-icon">🔍</div>
            <h3>2. Connect</h3>
            <p>Food banks and volunteers can find nearby food suppliers to donate to</p>
          </div>
          <div className="step">
            <div className="step-icon">🤝</div>
            <h3>3. Coordinate</h3>
            <p>Arrange convenient pickup or delivery times through our platform</p>
          </div>
          <div className="step">
            <div className="step-icon">♻️</div>
            <h3>4. Make an Impact</h3>
            <p>Track your contribution to reducing food waste and helping the community</p>
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section className="user-types">
        <h2>Who Can Use MealNet?</h2>
        <div className="user-cards">
          <div className="user-card">
            <div className="user-icon">🏪</div>
            <h3>Food Suppliers</h3>
            <p>Restaurants, grocery stores, and food businesses can easily donate surplus food items</p>
            <ul className="feature-list">
              <li>✓ Simple donation listing</li>
              <li>✓ Flexible pickup scheduling</li>
              <li>✓ Impact tracking dashboard</li>
              <li>✓ Tax deduction documentation</li>
            </ul>
            <Link to="/signup?type=supplier" className="learn-more">Join as Supplier</Link>
          </div>
          <div className="user-card">
            <div className="user-icon">🏢</div>
            <h3>Food Banks & Shelters</h3>
            <p>Food banks and charitable organizations can find and collect available donations</p>
            <ul className="feature-list">
              <li>✓ Real-time donation alerts</li>
              <li>✓ Route optimization</li>
              <li>✓ Inventory management</li>
              <li>✓ Distribution tracking</li>
            </ul>
            <Link to="/signup?type=foodbank" className="learn-more">Join as Food Bank</Link>
          </div>
          <div className="user-card">
            <div className="user-icon">👥</div>
            <h3>Individuals</h3>
            <p>People in need can find available food assistance programs and resources</p>
            <ul className="feature-list">
              <li>✓ Find nearby food banks</li>
              <li>✓ Schedule pickups</li>
              <li>✓ Access resources</li>
              <li>✓ Community support</li>
            </ul>
            <Link to="/signup?type=individual" className="learn-more">Join as Individual</Link>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="stats-section">
        <div className="stat-card">
          <h3>10,000+</h3>
          <p>Meals Rescued</p>
        </div>
        <div className="stat-card">
          <h3>500+</h3>
          <p>Active Partners</p>
        </div>
        <div className="stat-card">
          <h3>5,000+</h3>
          <p>People Helped</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Make a Difference?</h2>
        <p>Join MealNet today and be part of the solution to food waste and hunger</p>
        <Link to="/signup" className="cta-button">Get Started</Link>
      </section>
    </div>
  );
};

export default HowItWorks;