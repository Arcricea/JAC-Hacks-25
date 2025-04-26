import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/Home.css';
import freshFruit from '../assets/fresh_fruit.jpg';
import freshVegetables from '../assets/fresh_vegetables.jpg';
import freshCooked from '../assets/fresh_cooked.webp';

const Home = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [freshFruit, freshVegetables, freshCooked];
  const imageNames = ['Fresh Fruit', 'Fresh Vegetables', 'Fresh Cooked'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1>Reduce Food Waste, Feed Communities</h1>
            <p>
              MealNet connects food suppliers with food banks and individuals in need to rescue surplus food 
              before it's wasted. Join us in creating a more sustainable future.
            </p>
            <div className="hero-buttons">
              <Link to="/signup" className="primary-btn">Get Started</Link>
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
        <h2>How MealNet Works</h2>
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
        <h2>Who Can Use MealNet?</h2>
        <div className="user-cards">
          <div className="user-card">
            <div className="user-icon">🍽️</div>
            <h3>Restaurants & Grocery Stores</h3>
            <p>Donate surplus food, reduce waste, and make a difference in your community</p>
          </div>
          <div className="user-card">
            <div className="user-icon">🏠</div>
            <h3>Food Banks & Shelters</h3>
            <p>Connect with food suppliers to receive fresh donations for those in need</p>
          </div>
          <div className="user-card">
            <div className="user-icon">👪</div>
            <h3>Individuals</h3>
            <p>Access available food assistance or volunteer to help with food distribution</p>
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