import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/Home.css';
import freshFruit from '../assets/fresh_fruit.jpg';
import freshVegetables from '../assets/fresh_vegetables.jpg';
import freshCooked from '../assets/fresh_cooked.webp';
import mainBackground from '../assets/main_background2.jpg';
import AuthSignupButton from '../components/auth/AuthSignupButton';

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
      <section 
        className="hero-section" 
        style={{ 
          backgroundImage: `url(${mainBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="hero-container">
          <div className="hero-content">
            <h1>Reduce Food Waste, Feed Communities</h1>
            <p>
              MealNet connects food suppliers with food banks and individuals in need to rescue surplus food 
              before it's wasted.
            </p>
            <div className="hero-buttons">
              <AuthSignupButton className="primary-btn">Get Started</AuthSignupButton>
              <Link to="/how-it-works" className="secondary-btn">Learn More</Link>
              <Link to="/about" className="secondary-btn">About Us</Link>
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

      {/* Brief Description Section */}
      <section className="brief-description">
        <div className="description-content">
          <h2>Who We Serve</h2>
          <div className="description-items">
            <div className="description-item">
              <h3>Food Suppliers</h3>
              <p>Restaurants, grocery stores, and food manufacturers</p>
            </div>
            <div className="description-item">
              <h3>Food Banks</h3>
              <p>Shelters and distribution centers</p>
            </div>
            <div className="description-item">
              <h3>Individuals</h3>
              <p>People seeking food assistance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Food Waste Statistics Section */}
      <section className="statistics-section">
        <div className="statistics-content">
          <h2>The Food Waste Crisis</h2>
          <div className="statistics-items">
            <div className="statistics-item highlight">
              <h3>1/3</h3>
              <p>Approximately 1/3 of all food produced is wasted, worth nearly $1 trillion annually.</p>
            </div>
            <div className="statistics-item">
              <h3>1.3B Tons</h3>
              <p>1.3 billion tons of food is wasted globally each year while millions go hungry.</p>
            </div>
            <div className="statistics-item">
              <h3>8%</h3>
              <p>Food waste contributes to 8% of global greenhouse gas emissions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to make a difference?</h2>
          <AuthSignupButton className="cta-button">Sign Up Now</AuthSignupButton>
        </div>
      </section>
    </div>
  );
};

export default Home; 