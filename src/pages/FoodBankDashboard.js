import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../App';
import { updateNeedStatus } from '../services/userService';
import '../assets/styles/Dashboard.css';
import '../assets/styles/FoodBankDashboard.css';

const FoodBankDashboard = () => {
  const { userData, setUserData } = useContext(UserContext);
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
    recentActivity: [
      { id: 1, action: 'Donation Received', details: '15 kg of rice from Metro Grocery', date: '2025-04-25' },
      { id: 2, action: 'Food Distribution', details: 'Served 45 families', date: '2025-04-23' },
    ]
  };

  // State for form values
  const [priorityLevel, setPriorityLevel] = useState(userData?.needStatus?.priorityLevel || foodBankData.currentPriority);
  const [address, setAddress] = useState(foodBankData.contactInfo.address);
  const [phone, setPhone] = useState(foodBankData.contactInfo.phone);
  const [email, setEmail] = useState(foodBankData.contactInfo.email);
  const [openingHours, setOpeningHours] = useState(foodBankData.contactInfo.hours);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [customStatusMessage, setCustomStatusMessage] = useState(userData?.needStatus?.customMessage || '');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

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

  // Handler for saving need status
  const handleSaveStatus = async () => {
    if (!userData?.auth0Id) {
      console.error('No auth0Id found for user');
      return;
    }
    
    setIsSavingStatus(true);
    try {
      // Ensure we're passing the correct data
      const dataToSave = {
        priorityLevel,
        customMessage: customStatusMessage
      };
      
      console.log('Saving need status:', dataToSave, 'for user:', userData.auth0Id);
      
      const response = await updateNeedStatus(userData.auth0Id, dataToSave);
      
      if (response && response.success) {
        // Update local userData with the new status
        setUserData(prev => ({
          ...prev,
          needStatus: {
            priorityLevel,
            customMessage: customStatusMessage
          }
        }));
        console.log('Need status saved successfully');
      } else {
        console.error('Failed to save need status:', response);
      }
    } catch (error) {
      console.error('Error saving need status:', error);
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Update need status when priority level changes (if not in editing mode)
  useEffect(() => {
    // Only save if the user is authenticated and not explicitly editing the message
    if (userData?.auth0Id && !isEditingStatus && userData.needStatus?.priorityLevel !== priorityLevel) {
      console.log('Priority level changed, saving...');
      handleSaveStatus();
    }
  }, [priorityLevel]);
  
  // Initialize from userData when it loads
  useEffect(() => {
    if (userData?.needStatus) {
      setPriorityLevel(userData.needStatus.priorityLevel || foodBankData.currentPriority);
      setCustomStatusMessage(userData.needStatus.customMessage || '');
    }
  }, [userData]);

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
              <div className="status-message-display">
                <div 
                  className="editable-content"
                  contentEditable={isEditingStatus}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => setCustomStatusMessage(e.target.innerText)}
                >
                  {customStatusMessage || priorityLevels.find(p => p.level === priorityLevel).description}
                </div>
                
                {isEditingStatus ? (
                  <div className="status-edit-buttons">
                    <button 
                      className="save-btn modern-btn" 
                      onClick={async () => {
                        await handleSaveStatus();
                        setIsEditingStatus(false);
                      }}
                      disabled={isSavingStatus}
                    >
                      {isSavingStatus ? 
                        <span className="loading-dots">•••</span> : 
                        <span className="save-icon">✓</span>
                      }
                    </button>
                    <button 
                      className="cancel-btn modern-btn" 
                      onClick={() => {
                        setIsEditingStatus(false);
                        setCustomStatusMessage(userData?.needStatus?.customMessage || '');
                      }}
                      disabled={isSavingStatus}
                    >
                      <span className="cancel-icon">×</span>
                    </button>
                  </div>
                ) : (
                  <button className="edit-status-btn" onClick={() => setIsEditingStatus(true)}>
                    <span className="edit-icon">✏️</span>
                  </button>
                )}
              </div>
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
                  >
                    <span className="priority-number">{priority.level}</span>
                    <span className="priority-text">{priority.label}</span>
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
            <div className="food-bank-info-container">
              <div className="info-item">
                <strong>Address:</strong>
                <div 
                  className="editable-field"
                  contentEditable={isEditingInfo}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => setAddress(e.target.innerText)}
                >
                  {address || <span className="placeholder-text">Enter your address here</span>}
                </div>
              </div>
              
              <div className="info-item">
                <strong>Phone:</strong>
                <div 
                  className="editable-field"
                  contentEditable={isEditingInfo}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => setPhone(e.target.innerText)}
                >
                  {phone || <span className="placeholder-text">Enter your phone number here</span>}
                </div>
              </div>
              
              <div className="info-item">
                <strong>Email:</strong>
                <div 
                  className="editable-field"
                  contentEditable={isEditingInfo}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => setEmail(e.target.innerText)}
                >
                  {email || <span className="placeholder-text">Enter your email address here</span>}
                </div>
              </div>
              
              <div className="info-item">
                <strong>Hours:</strong>
                <div 
                  className="editable-field"
                  contentEditable={isEditingInfo}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => setOpeningHours(e.target.innerText)}
                >
                  {openingHours || <span className="placeholder-text">Enter your operating hours here</span>}
                </div>
              </div>
            </div>

            {isEditingInfo ? (
              <div className="edit-controls">
                <button 
                  className="save-btn modern-btn" 
                  onClick={handleSaveInfo}
                >
                  <span className="save-icon">✓</span>
                </button>
                <button 
                  className="cancel-btn modern-btn" 
                  onClick={() => setIsEditingInfo(false)}
                >
                  <span className="cancel-icon">×</span>
                </button>
              </div>
            ) : (
              <button 
                className="edit-info-btn" 
                onClick={() => setIsEditingInfo(true)}
              >
                <span className="edit-icon">✏️</span>
              </button>
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