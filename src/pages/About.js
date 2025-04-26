import React from 'react';
import '../assets/styles/About.css';
import backdropFruit from '../assets/backdrop_fruit.jpg';

const About = () => {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container">
          <h1>About MealNet</h1>
          <p className="about-subtitle">Our mission to reduce food waste and fight hunger</p>
        </div>
      </section>

      <section className="about-mission">
        <div className="container">
          <h2>Our Mission</h2>
          <p>
            MealNet is a revolutionary platform designed to address two critical global challenges: food waste and food insecurity.
            We connect food suppliers like restaurants, grocers, and food businesses with food banks, shelters, and individuals in need,
            creating an efficient ecosystem for food rescue and redistribution.
          </p>
          <p>
            Our goal is simple yet powerful: to ensure that surplus food reaches those who need it most,
            rather than ending up in landfills where it contributes to greenhouse gas emissions and climate change.
          </p>
        </div>
      </section>

      <section className="about-sdg">
        <div className="container">
          <h2>Supporting UN Sustainable Development Goals</h2>
          <p>MealNet proudly aligns with several of the United Nations Sustainable Development Goals (SDGs), directly contributing to a more sustainable future:</p>
          <div className="sdg-grid">
            <div className="sdg-item">
              <div className="sdg-number">1</div>
              <h3>No Poverty</h3>
              <p>By providing access to nutritious food, we help reduce financial burdens on vulnerable populations and address a critical aspect of poverty.</p>
            </div>
            <div className="sdg-item">
              <div className="sdg-number">2</div>
              <h3>Zero Hunger</h3>
              <p>Through redirecting surplus food to those in need, we're helping end hunger and improve nutrition in our communities.</p>
            </div>
            <div className="sdg-item">
              <div className="sdg-number">3</div>
              <h3>Good Health and Well-being</h3>
              <p>Access to proper nutrition is foundational to health. Our food recovery helps ensure more people can maintain healthier diets.</p>
            </div>
            <div className="sdg-item">
              <div className="sdg-number">11</div>
              <h3>Sustainable Cities and Communities</h3>
              <p>Our localized approach to food redistribution strengthens community resilience and promotes sustainable urban development.</p>
            </div>
            <div className="sdg-item">
              <div className="sdg-number">12</div>
              <h3>Responsible Consumption</h3>
              <p>Our platform promotes sustainable management of resources by reducing food waste throughout the supply chain.</p>
            </div>
            <div className="sdg-item">
              <div className="sdg-number">13</div>
              <h3>Climate Action</h3>
              <p>By diverting food from landfills, we reduce methane emissions that contribute to climate change.</p>
            </div>
            <div className="sdg-item">
              <div className="sdg-number">17</div>
              <h3>Partnerships for the Goals</h3>
              <p>We foster collaboration between businesses, non-profits, and individuals to create sustainable solutions.</p>
            </div>
          </div>
          <p className="sdg-commitment">
            Our commitment to these global goals guides our operations and future development as we work toward a more sustainable, equitable, and healthy food system for all.
          </p>
        </div>
      </section>

      <section className="about-how-it-works">
        <div className="container">
          <h2>How MealNet Works</h2>
          <div className="about-steps">
            <div className="step">
              <div className="step-icon">🏪</div>
              <h3>Food Suppliers</h3>
              <p>Restaurants, grocers, and food businesses use our platform to list surplus food that would otherwise go to waste.</p>
            </div>
            <div className="step">
              <div className="step-icon">🔄</div>
              <h3>Our Platform</h3>
              <p>We connect suppliers with recipients through an efficient, user-friendly digital platform that handles logistics.</p>
            </div>
            <div className="step">
              <div className="step-icon">🏥</div>
              <h3>Food Banks & Individuals</h3>
              <p>Food banks, community centers, and individuals in need receive timely notifications about available food donations.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-security">
        <div className="container">
          <h2>Data Security & Privacy</h2>
          <div className="security-content">
            <div className="security-icon">🔒</div>
            <div className="security-info">
              <p>
                At MealNet, we take the security of your information extremely seriously. All data on our platform is highly encrypted
                using industry-leading Auth0 authentication and security protocols.
              </p>
              <p>
                Our implementation of Auth0 provides:
              </p>
              <ul className="security-features">
                <li>End-to-end encryption of all personal and business data</li>
                <li>Multi-factor authentication options for enhanced account security</li>
                <li>GDPR and other regulatory compliance for data protection</li>
                <li>Regular security audits and updates to protect against vulnerabilities</li>
              </ul>
              <p>
                We believe that secure technology is essential to building trust in our platform, allowing our community to focus on what matters most:
                reducing food waste and helping those in need.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-impact">
        <div className="container">
          <h2>Our Impact</h2>
          <div className="impact-stats">
            <div className="impact-stat">
              <h3>Reducing Waste</h3>
              <p>Every year, approximately one-third of all food produced globally goes to waste. MealNet aims to significantly reduce this number in our communities.</p>
            </div>
            <div className="impact-stat">
              <h3>Fighting Hunger</h3>
              <p>Millions of people face food insecurity daily. Our platform helps bridge the gap between food surplus and food access.</p>
            </div>
            <div className="impact-stat">
              <h3>Environmental Benefits</h3>
              <p>By diverting food from landfills, we help reduce methane emissions and the overall carbon footprint of food production.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-team">
        <div className="container">
          <h2>Our Team</h2>
          <p>
            MealNet was founded by a passionate team of food sustainability advocates, technologists, 
            and community organizers who believe in the power of technology to solve real-world problems.
          </p>
          <p>
            Our diverse team brings together expertise from the food service industry, 
            non-profit sector, software development, and logistics to create a holistic 
            solution to food waste and hunger.
          </p>
        </div>
      </section>

      <section className="about-join">
        <div className="container">
          <h2>Join The Movement</h2>
          <p>
            Whether you're a restaurant with surplus food, a food bank looking for donations,
            or an individual who wants to help reduce food waste in your community, 
            MealNet welcomes you to join our growing network of change-makers.
          </p>
          <div className="join-buttons">
            <a href="/signup" className="primary-btn">Sign Up Now</a>
            <a href="/contact" className="secondary-btn">Contact Us</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
