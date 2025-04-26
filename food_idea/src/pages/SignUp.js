import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/Auth.css';

const SignUp = () => {
  const [userType, setUserType] = useState('individual');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    organization: '',
    description: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Signup attempt', { userType, ...formData });
    // Registration logic would go here
  };

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        <h2>Create Your FoodForward Account</h2>
        <div className="user-type-toggle">
          <button 
            className={userType === 'individual' ? 'active' : ''}
            onClick={() => setUserType('individual')}
          >
            Individual
          </button>
          <button 
            className={userType === 'supplier' ? 'active' : ''}
            onClick={() => setUserType('supplier')}
          >
            Restaurant/Grocer
          </button>
          <button 
            className={userType === 'foodbank' ? 'active' : ''}
            onClick={() => setUserType('foodbank')}
          >
            Food Bank
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Common Fields */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input 
              type="tel" 
              id="phone" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required 
            />
          </div>
          
          {/* User Type Specific Fields */}
          {userType === 'individual' && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input 
                type="text" 
                id="name" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                required 
              />
            </div>
          )}
          
          {(userType === 'supplier' || userType === 'foodbank') && (
            <>
              <div className="form-group">
                <label htmlFor="organization">Organization Name</label>
                <input 
                  type="text" 
                  id="organization" 
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input 
                  type="text" 
                  id="address" 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea 
                  id="description" 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                />
              </div>
            </>
          )}
          
          <button type="submit" className="auth-button">Sign Up</button>
        </form>
        
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Log In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SignUp; 