import React from "react";
import { Link } from "react-router-dom";
import "../assets/styles/Landing.css";

const Landing = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>
            <span className="highlight">MealNet</span>
            <br /> Connecting Excess Food With Those Who Need It
          </h1>
          <p>
            MealNet bridges the gap between food suppliers with excess
            inventory and food banks and individuals in need of assistance.
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="primary-btn">
              Get Started
            </Link>
            <Link to="/how-it-works" className="secondary-btn">
              Learn More
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <div className="placeholder-image">
            <span className="hero-emoji">🥑 ➡️ 💪</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>How MealNet Helps</h2>
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-icon">🍎</div>
            <h3>Reduce Food Waste</h3>
            <p>
              Help suppliers donate excess food instead of throwing it away,
              reducing environmental impact
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Support Communities</h3>
            <p>
              Connect food banks with reliable sources of nutritious food for
              those in need
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Simple Platform</h3>
            <p>
              Easy-to-use app that streamlines the food donation and collection
              process
            </p>
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="user-types-section">
        <h2>Who We Serve</h2>
        <div className="user-types-container">
          <div className="user-type">
            <h3>Food Suppliers</h3>
            <p>
              Restaurants, grocery stores, and food manufacturers can easily
              donate excess food
            </p>
            <Link to="/signup?type=supplier" className="user-type-link">
              Join as Supplier →
            </Link>
          </div>
          <div className="user-type">
            <h3>Food Banks</h3>
            <p>
              Shelters and food banks can find and collect available donations
              efficiently
            </p>
            <Link to="/signup?type=foodbank" className="user-type-link">
              Join as Food Bank →
            </Link>
          </div>
          <div className="user-type">
            <h3>Individuals</h3>
            <p>
              People in need can find available food assistance programs and
              resources
            </p>
            <Link to="/signup?type=individual" className="user-type-link">
              Join as Individual →
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <h2>What People Are Saying</h2>
        <div className="testimonials-container">
          <div className="testimonial">
            <p>
              "MealNet has revolutionized how we manage food donations.
              We've increased our donations by 30% and reduced waste
              significantly."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">RS</div>
              <div className="author-details">
                <h4>Robert Smith</h4>
                <p>Restaurant Owner</p>
              </div>
            </div>
          </div>
          <div className="testimonial">
            <p>
              "Thanks to MealNet, our shelter now has a consistent supply
              of fresh food. The platform is incredibly easy to use and has made
              a huge difference for our community."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">JP</div>
              <div className="author-details">
                <h4>Julia Parker</h4>
                <p>Food Bank Director</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat">
          <h3>10,000+</h3>
          <p>Meals Rescued</p>
        </div>
        <div className="stat">
          <h3>500+</h3>
          <p>Businesses Participating</p>
        </div>
        <div className="stat">
          <h3>50+</h3>
          <p>Food Banks Connected</p>
        </div>
        <div className="stat">
          <h3>5,000+</h3>
          <p>People Helped</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Join the Movement?</h2>
        <p>
          Be part of the solution to food waste and hunger in your community.
        </p>
        <Link to="/signup" className="cta-button">
          Get Started
        </Link>
      </section>
    </div>
  );
};

export default Landing; 