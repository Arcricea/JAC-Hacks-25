import React, { useState, useContext } from 'react';
import { UserContext } from '../App';
import { createDonation } from '../services/donationService';
import '../assets/styles/Dashboard.css';

const SupplierDashboard = () => {
  const { userData } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    quantity: '',
    expirationDate: '',
    pickupInfo: '',
    imageUrl: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.itemName.trim()) errors.itemName = 'Item name is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.quantity.trim()) errors.quantity = 'Quantity is required';
    if (!formData.expirationDate) errors.expirationDate = 'Expiration date is required';
    if (!formData.pickupInfo.trim()) errors.pickupInfo = 'Pickup information is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    if (!validateForm()) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createDonation({
        ...formData,
        userId: userData.auth0Id
      });

      if (response.success) {
        setSubmitSuccess(true);
        setFormData({
          itemName: '',
          category: '',
          quantity: '',
          expirationDate: '',
          pickupInfo: '',
          imageUrl: ''
        });
        // Optionally, refresh the available items list here
      }
    } catch (error) {
      setSubmitError(error.message || 'Failed to create donation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo data
  const supplierData = {
    donatedItems: 152,
    upcomingPickups: 3,
    impactStats: {
      mealsSaved: 456,
      co2Prevented: 213,
      wasteReduced: 304
    },
    recentDonations: [
      { id: 1, name: 'Fresh Vegetables', quantity: '10 kg', date: '2025-04-25', status: 'Picked Up' },
      { id: 2, name: 'Bread', quantity: '15 loaves', date: '2025-04-24', status: 'Scheduled' },
      { id: 3, name: 'Dairy Products', quantity: '8 items', date: '2025-04-23', status: 'Completed' },
    ],
    availableItems: [
      { id: 1, name: 'Pasta', quantity: '20 boxes', expiry: '2025-05-10' },
      { id: 2, name: 'Canned Soup', quantity: '15 cans', expiry: '2025-08-15' },
    ]
  };

  return (
    <div className="dashboard-content">
      <div className="dashboard-nav">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'donate' ? 'active' : ''} 
          onClick={() => setActiveTab('donate')}
        >
          Donate
        </button>
        <button 
          className={activeTab === 'impact' ? 'active' : ''} 
          onClick={() => setActiveTab('impact')}
        >
          Impact
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="stats-cards">
            <div className="stat-card">
              <h3>{supplierData.donatedItems}</h3>
              <p>Items Donated</p>
            </div>
            <div className="stat-card">
              <h3>{supplierData.upcomingPickups}</h3>
              <p>Upcoming Pickups</p>
            </div>
            <div className="stat-card">
              <h3>{supplierData.impactStats.mealsSaved}</h3>
              <p>Meals Saved</p>
            </div>
            <div className="stat-card">
              <h3>{supplierData.impactStats.co2Prevented} kg</h3>
              <p>CO₂ Emissions Prevented</p>
            </div>
          </div>
          
          <div className="recent-activity">
            <h3>Recent Donations</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {supplierData.recentDonations.map(donation => (
                  <tr key={donation.id}>
                    <td>{donation.name}</td>
                    <td>{donation.quantity}</td>
                    <td>{donation.date}</td>
                    <td><span className={`status ${donation.status.toLowerCase().replace(' ', '-')}`}>{donation.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'donate' && (
        <div className="donate-section">
          <h3>Donate Food Items</h3>
          {submitError && (
            <div className="error-message">
              {submitError}
            </div>
          )}
          <form className="donate-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Item Name *</label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleInputChange}
                placeholder="e.g., Fresh Produce"
              />
              {formErrors.itemName && (
                <span className="error-text">{formErrors.itemName}</span>
              )}
            </div>
            
            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="">Select a category</option>
                <option value="produce">Fresh Produce</option>
                <option value="bakery">Bakery</option>
                <option value="dairy">Dairy</option>
                <option value="meat">Meat & Seafood</option>
                <option value="canned">Canned Goods</option>
                <option value="dry">Dry Goods</option>
                <option value="frozen">Frozen Foods</option>
                <option value="prepared">Prepared Meals</option>
                <option value="other">Other</option>
              </select>
              {formErrors.category && (
                <span className="error-text">{formErrors.category}</span>
              )}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="text"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="e.g., 5 kg or 10 packages"
                />
                {formErrors.quantity && (
                  <span className="error-text">{formErrors.quantity}</span>
                )}
              </div>
              
              <div className="form-group">
                <label>Expiration Date *</label>
                <input
                  type="date"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleInputChange}
                />
                {formErrors.expirationDate && (
                  <span className="error-text">{formErrors.expirationDate}</span>
                )}
              </div>
            </div>
            
            <div className="form-group">
              <label>Pickup Information *</label>
              <textarea
                name="pickupInfo"
                value={formData.pickupInfo}
                onChange={handleInputChange}
                placeholder="Details about pickup availability, storage requirements, or other important information"
              />
              {formErrors.pickupInfo && (
                <span className="error-text">{formErrors.pickupInfo}</span>
              )}
            </div>
            
            <div className="form-group">
              <label>Upload Image (Optional)</label>
              <div className="file-upload">
                <input
                  type="file"
                  id="food-image"
                  accept="image/*"
                  onChange={(e) => {
                    // Handle file upload here
                    // For now, we'll just store the file name
                    setFormData(prev => ({
                      ...prev,
                      imageUrl: e.target.value
                    }));
                  }}
                />
                <label htmlFor="food-image">Choose File</label>
              </div>
            </div>
            
            <div className="form-buttons-container">
              <div className="form-buttons">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Listing...' : 'List Donation'}
                </button>
              </div>
              {submitSuccess && (
                <div className="success-message-inline">
                  <span className="success-icon">✓</span>
                  Donation listed successfully!
                </div>
              )}
            </div>
          </form>
          
          <div className="current-inventory">
            <h3>Current Available Items</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Expiry Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {supplierData.availableItems.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.expiry}</td>
                    <td>
                      <button className="small-btn">Edit</button> 
                      <button className="small-btn danger">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'impact' && (
        <div className="impact-section">
          <h3>Your Environmental & Social Impact</h3>
          
          <div className="impact-cards">
            <div className="impact-card">
              <div className="impact-icon">🍽️</div>
              <h4>Meals Provided</h4>
              <div className="impact-value">{supplierData.impactStats.mealsSaved}</div>
              <p>Meals you've helped provide to people in need</p>
            </div>
            
            <div className="impact-card">
              <div className="impact-icon">🌱</div>
              <h4>CO₂ Emissions Prevented</h4>
              <div className="impact-value">{supplierData.impactStats.co2Prevented} kg</div>
              <p>Equivalent to planting {Math.round(supplierData.impactStats.co2Prevented / 10)} trees</p>
            </div>
            
            <div className="impact-card">
              <div className="impact-icon">♻️</div>
              <h4>Food Waste Diverted</h4>
              <div className="impact-value">{supplierData.impactStats.wasteReduced} kg</div>
              <p>Food waste diverted from landfills</p>
            </div>
          </div>
          
          <div className="impact-charts">
            <div className="chart-container">
              <h4>Your Monthly Impact</h4>
              <div className="chart-placeholder">
                <div className="chart-message">
                  <div className="chart-icon">📊</div>
                  <p>Monthly impact visualization would appear here, showing your contributions over time.</p>
                </div>
              </div>
            </div>
            
            <div className="chart-container">
              <h4>Community Comparison</h4>
              <div className="chart-placeholder">
                <div className="chart-message">
                  <div className="chart-icon">📈</div>
                  <p>You're in the top 15% of contributors in your area!</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="impact-testimonials">
            <h4>Community Impact</h4>
            <div className="testimonial">
              <p>"Your donations have helped us serve over 200 families this month. Thank you for making a difference!"</p>
              <div className="testimonial-source">- MealNet Community Partner</div>
            </div>
            
            <div className="impact-badges">
              <h4>Impact Badges</h4>
              <div className="badges-container">
                <div className="badge">
                  <div className="badge-icon">🌟</div>
                  <div className="badge-name">First Donation</div>
                </div>
                <div className="badge">
                  <div className="badge-icon">🏆</div>
                  <div className="badge-name">100 Meals</div>
                </div>
                <div className="badge">
                  <div className="badge-icon">🌍</div>
                  <div className="badge-name">Climate Champion</div>
                </div>
                <div className="badge inactive">
                  <div className="badge-icon">💯</div>
                  <div className="badge-name">500 Meals</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="impact-share">
            <h4>Share Your Impact</h4>
            <p>Let others know about your contributions to inspire change</p>
            <div className="share-buttons">
              <button className="share-btn facebook">Share on Facebook</button>
              <button className="share-btn twitter">Share on Twitter</button>
              <button className="share-btn linkedin">Share on LinkedIn</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboard; 