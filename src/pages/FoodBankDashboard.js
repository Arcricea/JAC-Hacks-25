import React, { useState } from 'react';
import '../assets/styles/Dashboard.css';
import '../assets/styles/FoodBankDashboard.css';

const FoodBankDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Sample data for the food bank
  const foodBankData = {
    receivedDonations: 87,
    upcomingDeliveries: 5,
    peopleServed: 342,
    currentPriority: 3,
    contactInfo: {
      address: '123 Main Street, Springfield, IL',
      phone: '(555) 123-4567',
      email: 'info@communityfoodbank.org',
      hours: 'Mon-Fri: 9am-5pm, Sat: 10am-2pm'
    },
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

  // State for form values
  const [priorityLevel, setPriorityLevel] = useState(foodBankData.currentPriority);
  const [address, setAddress] = useState(foodBankData.contactInfo.address);
  const [phone, setPhone] = useState(foodBankData.contactInfo.phone);
  const [email, setEmail] = useState(foodBankData.contactInfo.email);
  const [openingHours, setOpeningHours] = useState(foodBankData.contactInfo.hours);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // Priority level options
  const priorityLevels = [
    { level: 1, label: 'Do not need', description: 'We currently have sufficient supplies', color: '#4CAF50' },
    { level: 2, label: 'Low need', description: 'We could use some specific items, but not urgent', color: '#8BC34A' },
    { level: 3, label: 'Moderate need', description: 'We have some shortages in key areas', color: '#FFC107' },
    { level: 4, label: 'High need', description: 'We have significant shortages', color: '#FF9800' },
    { level: 5, label: 'URGENT NEED', description: '🚨 WE NEED FOOD DONATIONS IMMEDIATELY!! WE ARE GOING TO DIE FROM HUNGER!!! PLEASE HELP US!!! WE WILL ALL DIE FROM HUNGER!!!', color: '#F44336' }
  ];

  // Handler for saving contact info
  const handleSaveInfo = () => {
    // In a real app, this would save to the backend
    console.log('Saving food bank info:', {
      address,
      phone,
      email,
      openingHours,
      additionalInfo,
      priorityLevel
    });
    setIsEditingInfo(false);
  };

  const renderPriorityBadge = (level) => {
    const priorityInfo = priorityLevels.find(p => p.level === level);
    return (
      <div 
        className="priority-badge" 
        style={{ backgroundColor: priorityInfo.color }}
      >
        {priorityInfo.label}
      </div>
    );
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
          className={activeTab === 'settings' ? 'active' : ''} 
          onClick={() => setActiveTab('settings')}
        >
          Food Bank Settings
        </button>
        <button 
          className={activeTab === 'available' ? 'active' : ''} 
          onClick={() => setActiveTab('available')}
        >
          Available Donations
        </button>
        <button 
          className={activeTab === 'donation-history' ? 'active' : ''} 
          onClick={() => setActiveTab('donation-history')}
        >
          Donation History
        </button>
        <button 
          className={activeTab === 'incoming' ? 'active' : ''} 
          onClick={() => setActiveTab('incoming')}
        >
          Incoming Food
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="priority-status-card">
            <h3>Current Need Status</h3>
            <div className="priority-indicator">
              {renderPriorityBadge(priorityLevel)}
              <p>{priorityLevels.find(p => p.level === priorityLevel).description}</p>
            </div>
            
            <div className="priority-selector-inline">
              <p className="priority-selector-label">Update Need Status:</p>
              <div className="priority-buttons">
                {priorityLevels.map((priority) => (
                  <button 
                    key={priority.level}
                    className={`priority-button ${priorityLevel === priority.level ? 'selected' : ''}`}
                    style={{ 
                      backgroundColor: priorityLevel === priority.level ? priority.color : 'transparent',
                      color: priorityLevel === priority.level ? 'white' : '#333',
                      borderColor: priority.color
                    }}
                    onClick={() => setPriorityLevel(priority.level)}
                    data-label={priority.label}
                  >
                    {priority.level}
                  </button>
                ))}
              </div>
            </div>
          </div>

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

          <div className="food-bank-contact-card">
            <h3>Food Bank Information</h3>
            {isEditingInfo ? (
              <div className="contact-form inline">
                <div className="form-group">
                  <label>Address</label>
                  <input 
                    type="text" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Hours</label>
                  <input 
                    type="text" 
                    value={openingHours} 
                    onChange={(e) => setOpeningHours(e.target.value)}
                  />
                </div>
                <div className="form-buttons">
                  <button 
                    className="primary-btn"
                    onClick={handleSaveInfo}
                  >
                    Save
                  </button>
                  <button 
                    className="secondary-btn"
                    onClick={() => setIsEditingInfo(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="contact-info">
                  <p><strong>Address:</strong> {address}</p>
                  <p><strong>Phone:</strong> {phone}</p>
                  <p><strong>Email:</strong> {email}</p>
                  <p><strong>Hours:</strong> {openingHours}</p>
                </div>
                <button 
                  className="edit-info-btn"
                  onClick={() => setIsEditingInfo(true)}
                >
                  Edit Information
                </button>
              </>
            )}
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

      {activeTab === 'settings' && (
        <div className="settings-section">
          <h3>Food Bank Settings</h3>
          
          <div className="settings-card">
            <h4>Need Priority Level</h4>
            <p>Set your current need level to communicate your donation requirements to the community</p>
            
            <div className="priority-selector">
              {priorityLevels.map((priority) => (
                <div 
                  key={priority.level}
                  className={`priority-option ${priorityLevel === priority.level ? 'selected' : ''}`}
                  onClick={() => setPriorityLevel(priority.level)}
                  style={{ borderColor: priority.color }}
                >
                  <div className="priority-header">
                    <span className="priority-level" style={{ backgroundColor: priority.color }}>
                      Level {priority.level}
                    </span>
                    <span className="priority-label">{priority.label}</span>
                  </div>
                  <p className="priority-description">{priority.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="settings-card">
            <h4>Contact Information</h4>
            <div className="contact-form">
              <div className="form-group">
                <label>Address</label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address, City, State, ZIP"
                />
              </div>
              
              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contact email"
                />
              </div>
              
              <div className="form-group">
                <label>Opening Hours</label>
                <input 
                  type="text" 
                  value={openingHours} 
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder="e.g., Mon-Fri: 9am-5pm, Sat: 10am-2pm"
                />
              </div>
              
              <div className="form-group">
                <label>Additional Information</label>
                <textarea 
                  value={additionalInfo} 
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Any additional information about your food bank"
                  rows={4}
                ></textarea>
              </div>
            </div>
          </div>
          
          <div className="form-buttons">
            <button className="primary-btn" onClick={handleSaveInfo}>Save Changes</button>
            <button className="secondary-btn" onClick={() => setActiveTab('overview')}>Cancel</button>
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

      {activeTab === 'donation-history' && (
        <div className="donation-history-section">
          <h3>Donation History</h3>
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>Your donation history will appear here once you start receiving donations.</p>
            <p className="empty-subtext">You'll be able to see which companies and individuals have donated to your food bank.</p>
          </div>
        </div>
      )}

      {activeTab === 'incoming' && (
        <div className="incoming-food-section">
          <h3>Incoming Food</h3>
          <div className="empty-state">
            <div className="empty-icon">🚚</div>
            <p>Information about incoming food deliveries will appear here.</p>
            <p className="empty-subtext">You'll be able to track scheduled pickups and deliveries from donors.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodBankDashboard; 