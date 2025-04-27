import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/Auth.css';
import AuthSignupButton from '../components/auth/AuthSignupButton';

const Login = () => {
  const [userType, setUserType] = useState('individual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt', { userType, email, password });
    // Authentication logic would go here
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Log In to MealNet</h2>
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
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <div className="forgot-password">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          
          <button type="submit" className="auth-button">Log In</button>
        </form>
        
        <div className="auth-footer">
          <p>Don't have an account? <AuthSignupButton className="auth-link" style={{ border: 'none', background: 'transparent', padding: 0, color: '#2e7d32', textDecoration: 'none', cursor: 'pointer', fontWeight: 'inherit', fontSize: 'inherit' }}>Sign Up</AuthSignupButton></p>
        </div>
      </div>
    </div>
  );
};

export default Login; 