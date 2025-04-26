import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/Home.css';

const Home = () => {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Reduce Food Waste, Feed Communities</h1>
          <p>
            FoodForward connects food suppliers with food banks and individuals in need to rescue surplus food 
            before it's wasted. Join us in creating a more sustainable future.
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="primary-btn">Get Started</Link>
            <Link to="/how-it-works" className="secondary-btn">Learn More</Link>
          </div>
        </div>
        <div className="hero-image">
          {/* This would be an image in production */}
          <div className="placeholder-image">
            <span className="hero-emoji">🥗 🍎 🥖</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat-card">
          <h3>1/3</h3>
          <p>of all food produced globally is wasted</p>
        </div>
        <div className="stat-card">
          <h3>$1 Trillion</h3>
          <p>worth of food is lost or wasted annually</p>
        </div>
        <div className="stat-card">
          <h3>Millions</h3>
          <p>of people face food insecurity daily</p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How FoodForward Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-icon">📝</div>
            <h3>Register</h3>
            <p>Sign up as a food supplier, food bank, or individual seeking assistance</p>
          </div>
          <div className="step">
            <div className="step-icon">🔄</div>
            <h3>Connect</h3>
            <p>List surplus food or find available donations in your area</p>
          </div>
          <div className="step">
            <div className="step-icon">🚚</div>
            <h3>Coordinate</h3>
            <p>Arrange pickup or delivery of food items</p>
          </div>
          <div className="step">
            <div className="step-icon">🌱</div>
            <h3>Impact</h3>
            <p>Reduce waste, feed communities, and track your contribution</p>
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="user-types">
        <h2>Who Can Use FoodForward?</h2>
        <div className="user-cards">
          <div className="user-card">
            <div className="user-icon">🍽️</div>
            <h3>Restaurants & Grocery Stores</h3>
            <p>Donate surplus food, reduce waste, and make a difference in your community</p>
            <Link to="/for-restaurants" className="learn-more">Learn More</Link>
          </div>
          <div className="user-card">
            <div className="user-icon">🏠</div>
            <h3>Food Banks & Shelters</h3>
            <p>Connect with food suppliers to receive fresh donations for those in need</p>
            <Link to="/for-foodbanks" className="learn-more">Learn More</Link>
          </div>
          <div className="user-card">
            <div className="user-icon">👪</div>
            <h3>Individuals</h3>
            <p>Access available food assistance or volunteer to help with food distribution</p>
            <Link to="/for-individuals" className="learn-more">Learn More</Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Join the Food Waste Revolution</h2>
        <p>Together, we can build a more sustainable and equitable food system</p>
        <Link to="/signup" className="cta-button">Sign Up Now</Link>
      </section>
    </div>
  );
};

export default Home; 