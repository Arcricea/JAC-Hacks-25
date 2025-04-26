import React, { useState } from 'react';
import '../assets/styles/Dashboard.css';

const Dashboard = () => {
  // In a real app, this would come from authentication state
  const [userType, setUserType] = useState('supplier');
  const [activeTab, setActiveTab] = useState('overview');

  // Demo data (would come from API in real app)
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

  const individualData = {
    availableAssistance: [
      { id: 1, provider: 'Community Food Bank', type: 'Food Package', location: '123 Main St', date: '2025-04-28' },
      { id: 2, provider: 'Fresh Start', type: 'Hot Meal', location: '45 Oak Ave', date: '2025-04-27' },
    ],
    upcomingAppointments: [
      { id: 1, provider: 'Hope Pantry', date: '2025-04-30', time: '10:00 AM', status: 'Confirmed' }
    ],
    assistanceHistory: [
      { id: 1, provider: 'Community Food Bank', date: '2025-04-15', items: 'Weekly food package' },
      { id: 2, provider: 'Fresh Start', date: '2025-04-08', items: 'Hot meal and groceries' },
    ]
  };

  // Render the appropriate dashboard based on user type
  const renderDashboard = () => {
    switch(userType) {
      case 'supplier':
        return renderSupplierDashboard();
      case 'foodbank':
        return renderFoodBankDashboard();
      case 'individual':
        return renderIndividualDashboard();
      default:
        return <div>Unknown user type</div>;
    }
  };

  const renderSupplierDashboard = () => {
    return (
      <div className="dashboard-content">
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
            <div className="donate-form">
              <div className="form-group">
                <label>Item Name</label>
                <input type="text" placeholder="e.g., Fresh Produce" />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="text" placeholder="e.g., 5 kg or 10 packages" />
              </div>
              <div className="form-group">
                <label>Expiration Date</label>
                <input type="date" />
              </div>
              <div className="form-group">
                <label>Pickup Information</label>
                <textarea placeholder="Details about pickup availability"></textarea>
              </div>
              <button className="primary-btn">List Donation</button>
            </div>
            
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
                      <td><button className="small-btn">Edit</button> <button className="small-btn danger">Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'impact' && (
          <div className="impact-section">
            <h3>Your Impact</h3>
            <div className="impact-charts">
              <div className="impact-chart">
                <h4>Meals Saved</h4>
                <div className="chart-placeholder">📊 Chart would go here</div>
              </div>
              <div className="impact-chart">
                <h4>Environmental Impact</h4>
                <div className="chart-placeholder">📊 Chart would go here</div>
              </div>
            </div>
            <div className="impact-testimonials">
              <h4>Community Impact</h4>
              <div className="testimonial">
                <p>"Your donations have helped us serve over 200 families this month. Thank you for making a difference!"</p>
                <div className="testimonial-source">- Community Food Bank</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFoodBankDashboard = () => {
    return (
      <div className="dashboard-content">
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
            <div className="distribution-tools">
              <div className="form-group">
                <label>Distribution Event</label>
                <input type="text" placeholder="Event Name" />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input type="time" />
              </div>
              <div className="form-group">
                <label>Expected Recipients</label>
                <input type="number" placeholder="Number of recipients" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea placeholder="Distribution details, requirements, etc."></textarea>
              </div>
              <button className="primary-btn">Schedule Distribution</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderIndividualDashboard = () => {
    return (
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <h3>Available Food Assistance</h3>
            <div className="assistance-cards">
              {individualData.availableAssistance.map(assistance => (
                <div key={assistance.id} className="assistance-card">
                  <div className="assistance-details">
                    <h4>{assistance.provider}</h4>
                    <p><strong>Type:</strong> {assistance.type}</p>
                    <p><strong>Location:</strong> {assistance.location}</p>
                    <p><strong>Date:</strong> {assistance.date}</p>
                  </div>
                  <button className="primary-btn">Register</button>
                </div>
              ))}
            </div>
            
            <h3>Upcoming Appointments</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {individualData.upcomingAppointments.map(appointment => (
                  <tr key={appointment.id}>
                    <td>{appointment.provider}</td>
                    <td>{appointment.date}</td>
                    <td>{appointment.time}</td>
                    <td><span className="status confirmed">{appointment.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="history-section">
            <h3>Assistance History</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Date</th>
                  <th>Items Received</th>
                </tr>
              </thead>
              <tbody>
                {individualData.assistanceHistory.map(history => (
                  <tr key={history.id}>
                    <td>{history.provider}</td>
                    <td>{history.date}</td>
                    <td>{history.items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'resources' && (
          <div className="resources-section">
            <h3>Additional Resources</h3>
            <div className="resource-cards">
              <div className="resource-card">
                <h4>Nutrition Information</h4>
                <p>Access guides on balanced meals and nutrition with limited resources.</p>
                <button className="secondary-btn">View Resources</button>
              </div>
              <div className="resource-card">
                <h4>Financial Assistance</h4>
                <p>Information on additional support programs and financial assistance.</p>
                <button className="secondary-btn">Learn More</button>
              </div>
              <div className="resource-card">
                <h4>Volunteer Opportunities</h4>
                <p>Give back to the community by volunteering at local food banks.</p>
                <button className="secondary-btn">Find Opportunities</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // For demo purposes - allows switching between user types
  const switchUserType = (type) => {
    setUserType(type);
    setActiveTab('overview');
  };

  return (
    <div className="dashboard-container">
      {/* Demo Controls - would not be in the real app */}
      <div className="demo-controls">
        <p>Demo Mode: View As</p>
        <div className="demo-buttons">
          <button 
            className={userType === 'supplier' ? 'active' : ''} 
            onClick={() => switchUserType('supplier')}
          >
            Restaurant/Grocer
          </button>
          <button 
            className={userType === 'foodbank' ? 'active' : ''} 
            onClick={() => switchUserType('foodbank')}
          >
            Food Bank
          </button>
          <button 
            className={userType === 'individual' ? 'active' : ''} 
            onClick={() => switchUserType('individual')}
          >
            Individual
          </button>
        </div>
      </div>
      
      <h2>
        {userType === 'supplier' && 'Restaurant/Grocer Dashboard'}
        {userType === 'foodbank' && 'Food Bank Dashboard'}
        {userType === 'individual' && 'Individual Dashboard'}
      </h2>
      
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        
        {userType === 'supplier' && (
          <>
            <button 
              className={activeTab === 'donate' ? 'active' : ''} 
              onClick={() => setActiveTab('donate')}
            >
              Donate Food
            </button>
            <button 
              className={activeTab === 'impact' ? 'active' : ''} 
              onClick={() => setActiveTab('impact')}
            >
              Your Impact
            </button>
          </>
        )}
        
        {userType === 'foodbank' && (
          <>
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
              Manage Distribution
            </button>
          </>
        )}
        
        {userType === 'individual' && (
          <>
            <button 
              className={activeTab === 'history' ? 'active' : ''} 
              onClick={() => setActiveTab('history')}
            >
              Assistance History
            </button>
            <button 
              className={activeTab === 'resources' ? 'active' : ''} 
              onClick={() => setActiveTab('resources')}
            >
              Resources
            </button>
          </>
        )}
      </div>
      
      {renderDashboard()}
    </div>
  );
};

export default Dashboard; 