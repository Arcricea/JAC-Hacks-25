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
    ],
    distributionSchedule: [
      { id: 1, event: 'Weekly Food Package Distribution', date: '2025-04-30', time: '09:00 AM', registered: 75 },
      { id: 2, event: 'Emergency Food Relief', date: '2025-04-28', time: '02:00 PM', registered: 25 },
    ],
    inventory: [
      { id: 1, item: 'Rice', quantity: '200 kg', expiry: '2025-12-31' },
      { id: 2, item: 'Canned Vegetables', quantity: '150 units', expiry: '2025-08-15' },
      { id: 3, item: 'Pasta', quantity: '100 boxes', expiry: '2025-10-01' },
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
          <div className="section-header">
            <h2>Available Donations</h2>
            <div className="filter-controls">
              <input type="text" placeholder="Search donations..." className="search-input" />
              <select className="filter-select">
                <option value="distance">Sort by Distance</option>
                <option value="quantity">Sort by Quantity</option>
                <option value="expiry">Sort by Expiry Date</option>
              </select>
            </div>
          </div>

          <div className="donations-list">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Distance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {foodBankData.availableDonations.map(donation => (
                  <tr key={donation.id}>
                    <td>{donation.supplier}</td>
                    <td>{donation.item}</td>
                    <td>{donation.quantity}</td>
                    <td>{donation.distance}</td>
                    <td>
                      <button className="action-btn accept">Accept</button>
                      <button className="action-btn details">Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="current-inventory">
            <h3>Current Inventory</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {foodBankData.inventory.map(item => (
                  <tr key={item.id}>
                    <td>{item.item}</td>
                    <td>{item.quantity}</td>
                    <td>{item.expiry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className="distribution-section">
          <div className="section-header">
            <h2>Distribution Management</h2>
            <button className="primary-btn">Create New Distribution Event</button>
          </div>

          <div className="distribution-schedule">
            <h3>Upcoming Distribution Events</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {foodBankData.distributionSchedule.map(event => (
                  <tr key={event.id}>
                    <td>{event.event}</td>
                    <td>{event.date}</td>
                    <td>{event.time}</td>
                    <td>{event.registered} people</td>
                    <td>
                      <button className="action-btn edit">Edit</button>
                      <button className="action-btn manage">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="distribution-form">
            <h3>Quick Distribution Entry</h3>
            <form className="form-grid">
              <div className="form-group">
                <label>Recipient Name</label>
                <input type="text" placeholder="Enter recipient name" />
              </div>
              <div className="form-group">
                <label>ID Number</label>
                <input type="text" placeholder="Enter ID number" />
              </div>
              <div className="form-group">
                <label>Package Type</label>
                <select>
                  <option>Standard Food Package</option>
                  <option>Emergency Relief Package</option>
                  <option>Special Dietary Package</option>
                </select>
              </div>
              <div className="form-group">
                <label>Additional Notes</label>
                <textarea placeholder="Enter any special requirements or notes"></textarea>
              </div>
              <button type="submit" className="submit-btn">Record Distribution</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodBankDashboard; 