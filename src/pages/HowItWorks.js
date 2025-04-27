import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/HowItWorks.css';
import donationBox from '../assets/donation_box.webp';
import shoppingVeges from '../assets/shopping_veges.jpg';
import handingApple from '../assets/handing_apple2.webp';
import AuthSignupButton from '../components/auth/AuthSignupButton';

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
            <h1>How MealNet Works</h1>
            <p>
              MealNet is a prototype platform connecting food suppliers with excess inventory to food banks 
              and individuals in need. Our platform streamlines the donation process through a network of 
              volunteers and organizers.
            </p>
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

      {/* Platform Flow Explanation */}
      <section className="platform-flow">
        <h2>The MealNet Ecosystem</h2>
        <div className="flow-container">
          <div className="flow-step">
            <div className="flow-number">1</div>
            <h3>Food Suppliers List Donations</h3>
            <p>Restaurants, grocery stores, and food businesses with excess food can quickly list available 
            items with details like food type, quantity, and pickup instructions.</p>
          </div>
          <div className="flow-step">
            <div className="flow-number">2</div>
            <h3>Food Banks Signal Needs</h3>
            <p>Food banks and distribution centers can indicate their current need level (from low to urgent) 
            and specify what types of donations they're seeking.</p>
          </div>
          <div className="flow-step">
            <div className="flow-number">3</div>
            <h3>Volunteers Bridge the Gap</h3>
            <p>Volunteers browse available donation tasks, accept pickups, and coordinate delivery 
            to food banks or individuals in need using our verification system.</p>
          </div>
          <div className="flow-step">
            <div className="flow-number">4</div>
            <h3>Organizers Manage the Network</h3>
            <p>Organizers oversee the entire ecosystem, helping match donations with needs, 
            tracking impact data, and ensuring the system runs efficiently.</p>
          </div>
        </div>
      </section>

      {/* User Roles in Detail */}
      <section className="user-roles">
        <h2>Platform Participants</h2>
        
        <div className="role-card">
          <div className="role-icon">🏪</div>
          <div className="role-content">
            <h3>Food Suppliers</h3>
            <p>Businesses with surplus food inventory that would otherwise go to waste.</p>
            <h4>Key Features:</h4>
            <ul>
              <li>Simple donation listing system</li>
              <li>Photo upload and food categorization</li>
              <li>Pickup scheduling and tracking</li>
              <li>Verification codes for secure handoffs</li>
              <li>Impact tracking (meals saved, CO2 prevented)</li>
            </ul>
          </div>
        </div>
        
        <div className="role-card">
          <div className="role-icon">🍲</div>
          <div className="role-content">
            <h3>Food Banks & Distributors</h3>
            <p>Organizations that collect and distribute food to those in need.</p>
            <h4>Key Features:</h4>
            <ul>
              <li>Need status signaling (priority levels)</li>
              <li>Custom status messages for specific needs</li>
              <li>Address and contact information management</li>
              <li>Delivery verification system</li>
              <li>Schedule management for open hours</li>
            </ul>
          </div>
        </div>
        
        <div className="role-card">
          <div className="role-icon">🤝</div>
          <div className="role-content">
            <h3>Volunteers</h3>
            <p>Individuals who transport food from suppliers to food banks or those in need.</p>
            <h4>Key Features:</h4>
            <ul>
              <li>Browse available donation tasks</li>
              <li>Filter donations by location and category</li>
              <li>QR code scanning for pickup verification</li>
              <li>Task management for scheduled pickups</li>
              <li>Food bank recommendations based on location</li>
              <li>Impact tracking for completed deliveries</li>
            </ul>
          </div>
        </div>
        
        <div className="role-card">
          <div className="role-icon">👤</div>
          <div className="role-content">
            <h3>Individuals</h3>
            <p>People in need of food assistance or who can offer small donations.</p>
            <h4>Key Features:</h4>
            <ul>
              <li>Food assistance request system</li>
              <li>Personal donation listing for smaller contributions</li>
              <li>Pickup scheduling for receiving donations</li>
              <li>History tracking of assistance received</li>
            </ul>
          </div>
        </div>
        
        <div className="role-card">
          <div className="role-icon">📋</div>
          <div className="role-content">
            <h3>Organizers</h3>
            <p>Administrators who oversee and manage the entire donation ecosystem.</p>
            <h4>Key Features:</h4>
            <ul>
              <li>Food bank management dashboard</li>
              <li>Donation oversight across all stages</li>
              <li>System-wide data access and reporting</li>
              <li>Manual donation creation and assignment</li>
              <li>Food bank need status management</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Verification System */}
      <section className="verification-section">
        <h2>Our Verification System</h2>
        <div className="verification-content">
          <div className="verification-item">
            <h3>QR Codes & 8-Digit Codes</h3>
            <p>Each donation has a unique verification code that volunteers must scan or enter to confirm pickup and delivery, ensuring accountability throughout the process.</p>
          </div>
          <div className="verification-item">
            <h3>Status Tracking</h3>
            <p>Donations move through multiple statuses: Available → Scheduled → Picked Up → Delivered, with validation at each step.</p>
          </div>
        </div>
      </section>

      {/* Prototype Notice */}
      <section className="prototype-notice">
        <div className="prototype-content">
          <h3>Early Development Stage</h3>
          <p>MealNet is currently a prototype in development. The features described represent our vision for a fully functional platform.</p>
          <p>We're seeking partners for testing and feedback to improve the system before wider release.</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Join the MealNet Network</h2>
        <p>Help us build a more efficient food rescue ecosystem.</p>
        <div className="cta-buttons">
          <AuthSignupButton className="cta-button">Join Our Beta</AuthSignupButton>
          <Link to="/forum" className="secondary-cta">Visit Our Forum</Link>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;