import React, { useState } from 'react';
import '../assets/styles/Dashboard.css';

const FoodBankDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const foodBankData = {
    receivedDonations: 87,
    upcomingDeliveries: 5,
    peopleServed: 342,
    availableDonations: [
      { id: 1, supplier: 'Garden Fresh', item: 'Vegetables', quantity: '12 kg', distance: '3.2 km' },
      { id: 2, supplier: 'Baker Bros', item: 'Bread', quantity: '10 loaves', distance: '1.5 km' },
      { id: 3, supplier: 'Farm Foods', item: 'Eggs', quantity: '5 dozen', distance: '4.7 km' },
    ],
    recentActivity: [
      { id: 1, action: 'Donation Received', details: '15 kg of rice from Metro Grocery', date: '2025-04-25' },
      { id: 2, action: 'Food Distribution', details: 'Served 45 families', date: '2025-04-23' },
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
          className={activeTab === 'available' ? 'active' : ''} 
          onClick={() => setActiveTab('available')}
        >
          Available Donations
        </button>
        <button 
          className={activeTab === 'distribution' ? 'active' : ''} 
          onClick={() => setActiveTab('distribution')}
        >
          Distribution
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="stats-cards">
            <div className="stat-card">
              <h3>{foodBankData.receivedDonations}</h3>
              <p>Donations Received</p>
            </div>
            <div className="stat-card">
              <h3>{foodBankData.upcomingDeliveries}</h3>
              <p>Upcoming Deliveries</p>
            </div>
            <div className="stat-card">
              <h3>{foodBankData.peopleServed}</h3>
              <p>People Served</p>
            </div>
          </div>

          <div className="recent-activity">
            <h3>Recent Activity</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {foodBankData.recentActivity.map(activity => (
                  <tr key={activity.id}>
                    <td>{activity.action}</td>
                    <td>{activity.details}</td>
                    <td>{activity.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'available' && (
        <div className="available-section">
          <h3>Available Donations</h3>
          <div className="donation-filters">
            <input type="text" placeholder="Search by item or supplier" />
            <select>
              <option>Sort by distance</option>
              <option>Sort by expiry date</option>
              <option>Sort by quantity</option>
            </select>
          </div>
          
          <div className="available-donations">
            {foodBankData.availableDonations.map(donation => (
              <div key={donation.id} className="donation-card">
                <div className="donation-info">
                  <h4>{donation.item}</h4>
                  <p><strong>Supplier:</strong> {donation.supplier}</p>
                  <p><strong>Quantity:</strong> {donation.quantity}</p>
                  <p><strong>Distance:</strong> {donation.distance}</p>
                </div>
                <div className="donation-actions">
                  <button className="primary-btn">Request Pickup</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className="distribution-section">
          <h3>Manage Distribution</h3>
          <div className="distribution-form">
            <div className="form-group">
              <label>Distribution Event Name</label>
              <input type="text" placeholder="e.g., Weekly Food Distribution" />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <input type="date" />
              </div>
              
              <div className="form-group">
                <label>Time</label>
                <input type="time" />
              </div>
            </div>
            
            <div className="form-group">
              <label>Location</label>
              <input type="text" placeholder="Distribution location" />
            </div>
            
            <div className="form-group">
              <label>Expected Number of Recipients</label>
              <input type="number" placeholder="Number of people" />
            </div>
            
            <div className="form-group">
              <label>Notes</label>
              <textarea placeholder="Additional information about the distribution event"></textarea>
            </div>
            
            <div className="form-buttons">
              <button className="primary-btn">Schedule Distribution</button>
              <button className="secondary-btn">Save Draft</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodBankDashboard; 