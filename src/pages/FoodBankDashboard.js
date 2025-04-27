import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../App';
import { updateNeedStatus, saveUser } from '../services/userService';
import '../assets/styles/Dashboard.css';
import '../assets/styles/FoodBankDashboard.css';
import GoogleMapsScript from '../components/GoogleMapsScript';
import { useAuth0 } from '@auth0/auth0-react';

const FoodBankDashboard = () => {
  const { userData, setUserData } = useContext(UserContext);
  const { user } = useAuth0(); // Get Auth0 user object
  const [activeTab, setActiveTab] = useState('overview');
  
  // Default data structure (without sample values)
  const foodBankData = {
    receivedDonations: 0,
    upcomingDeliveries: 0,
    recentActivity: []
  };

  // State for form values
  const [priorityLevel, setPriorityLevel] = useState(userData?.needStatus?.priorityLevel || foodBankData.currentPriority);
  const [customStatusMessage, setCustomStatusMessage] = useState(userData?.needStatus?.customMessage || '');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Contact information states
  const [address, setAddress] = useState(userData?.address || '');
  const [email, setEmail] = useState(userData?.email || (user?.email || ''));
  const [phone, setPhone] = useState(userData?.phone || '');
  const [openingHours, setOpeningHours] = useState(userData?.openingHours || '');
  const [editingField, setEditingField] = useState(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSaveStatus, setContactSaveStatus] = useState({ message: '', type: '' });
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const autocompleteInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [addressError, setAddressError] = useState('');

  // Priority level options
  const priorityLevels = [
    { level: 1, label: 'Do not need', description: 'We currently have sufficient supplies', color: '#4CAF50' },
    { level: 2, label: 'Low need', description: 'We could use some specific items, but not urgent', color: '#8BC34A' },
    { level: 3, label: 'Moderate need', description: 'We have some shortages in key areas', color: '#FFC107' },
    { level: 4, label: 'High need', description: 'We have significant shortages', color: '#FF9800' },
    { level: 5, label: 'URGENT NEED', description: '🚨 WE NEED FOOD DONATIONS IMMEDIATELY!! WE ARE GOING TO DIE FROM HUNGER!!! PLEASE HELP US!!! WE WILL ALL DIE FROM HUNGER!!!', color: '#F44336' }
  ];

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

  // Handler for saving contact information
  const handleSaveContact = async () => {
    if (!userData?.auth0Id) {
      console.error('No auth0Id found for user');
      return;
    }
    
    setIsSavingContact(true);
    try {
      // Prepare data to save
      const updatedUserData = {
        auth0Id: userData.auth0Id,
        username: userData.username,
        accountType: userData.accountType || 'distributor',
        address: address.trim(),
        email: email.trim(),
        phone: phone.trim(),
        openingHours: openingHours.trim(),
        ...(userData.needStatus && { needStatus: userData.needStatus })
      };
      
      console.log('Saving contact information:', updatedUserData);
      
      const response = await saveUser(updatedUserData);
      
      if (response && response.success) {
        // Update local userData with the new contact info
        setUserData(response.data);
        setEditingField(null);
        setContactSaveStatus({
          message: "✓ Contact information saved successfully!",
          type: 'success'
        });
        setTimeout(() => setContactSaveStatus({ message: '', type: '' }), 3000);
      } else {
        throw new Error(response.message || 'Failed to save contact information');
      }
    } catch (error) {
      console.error('Error saving contact information:', error);
      setContactSaveStatus({
        message: '⚠ Error saving contact information. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSavingContact(false);
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
    if (userData) {
      if (userData.needStatus) {
        setPriorityLevel(userData.needStatus.priorityLevel || foodBankData.currentPriority);
        setCustomStatusMessage(userData.needStatus.customMessage || '');
      }
      
      if (userData.address) setAddress(userData.address);
      // For email, prefer userData.email if available, otherwise fallback to Auth0 email
      setEmail(userData.email || (user?.email || ''));
      if (userData.phone) setPhone(userData.phone);
      if (userData.openingHours) setOpeningHours(userData.openingHours);
    } else {
      // If userData not available yet but Auth0 user is, use Auth0 email as fallback
      if (user?.email) setEmail(user.email);
    }
  }, [userData, user]);

  // Initialize Google Maps autocomplete when editing address
  useEffect(() => {
    if (editingField === 'address' && isGoogleLoaded && autocompleteInputRef.current) {
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          autocompleteInputRef.current,
          {
            componentRestrictions: { country: ["us", "ca"] },
            fields: ["formatted_address"],
            types: ["address"]
          }
        );

        const listener = autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
          if (place.formatted_address) {
            setAddress(place.formatted_address);
          }
        });

        return () => {
          if (listener) {
            window.google.maps.event.removeListener(listener);
          }
          if (autocompleteRef.current) {
            window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          }
        };
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
        setAddressError('Error initializing address autocomplete');
      }
    }
  }, [editingField, isGoogleLoaded]);

  const handleGoogleMapsLoad = () => {
    setIsGoogleLoaded(true);
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

  const renderContactField = (fieldName, label, value, placeholder) => {
    const isEditing = editingField === fieldName;
    
    return (
      <div className="contact-field">
        <h4>{label}</h4>
        <div className="status-message-display">
          {isEditing ? (
            <>
              {fieldName === 'address' ? (
                <input
                  ref={autocompleteInputRef}
                  className="editable-content"
                  type="text"
                  value={value}
                  onChange={(e) => {
                    switch(fieldName) {
                      case 'address': setAddress(e.target.value); break;
                      case 'email': setEmail(e.target.value); break;
                      case 'phone': setPhone(e.target.value); break;
                      case 'openingHours': setOpeningHours(e.target.value); break;
                      default: break;
                    }
                  }}
                  placeholder={placeholder}
                  disabled={!isGoogleLoaded && fieldName === 'address'}
                  style={{ padding: '0.8rem 3rem 0.8rem 1rem', width: '100%', boxSizing: 'border-box' }}
                />
              ) : fieldName === 'openingHours' ? (
                <textarea
                  className="editable-content"
                  value={value}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  style={{ padding: '0.8rem 3rem 0.8rem 1rem', width: '100%', boxSizing: 'border-box' }}
                />
              ) : (
                <input
                  className="editable-content"
                  type={fieldName === 'email' ? 'email' : 'text'}
                  value={value}
                  onChange={(e) => {
                    switch(fieldName) {
                      case 'email': setEmail(e.target.value); break;
                      case 'phone': setPhone(e.target.value); break;
                      default: break;
                    }
                  }}
                  placeholder={placeholder}
                  style={{ padding: '0.8rem 3rem 0.8rem 1rem', width: '100%', boxSizing: 'border-box' }}
                />
              )}
              <div className="status-edit-buttons">
                <button 
                  className="save-btn modern-btn" 
                  onClick={handleSaveContact}
                  disabled={isSavingContact}
                >
                  {isSavingContact ? 
                    <span className="loading-dots">•••</span> : 
                    <span className="save-icon">✓</span>
                  }
                </button>
                <button 
                  className="cancel-btn modern-btn" 
                  onClick={() => {
                    setEditingField(null);
                    // Reset to original values
                    setAddress(userData?.address || '');
                    setEmail(userData?.email || '');
                    setPhone(userData?.phone || '');
                    setOpeningHours(userData?.openingHours || '');
                  }}
                  disabled={isSavingContact}
                >
                  <span className="cancel-icon">×</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="editable-content" style={{ padding: '0.8rem 3rem 0.8rem 1rem' }}>
                {value || placeholder}
              </div>
              <button className="edit-status-btn" onClick={() => setEditingField(fieldName)}>
                <span className="edit-icon">✏️</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <GoogleMapsScript onLoad={handleGoogleMapsLoad} />
      <div className="dashboard-content">
        <div className="dashboard-nav">
          <button 
            className={activeTab === 'overview' ? 'active' : ''} 
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={activeTab === 'incoming' ? 'active' : ''} 
            onClick={() => setActiveTab('incoming')}
          >
            Incoming Food
          </button>
          <button 
            className={activeTab === 'donation-history' ? 'active' : ''} 
            onClick={() => setActiveTab('donation-history')}
          >
            Donation History
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

            <div className="contact-info-card">
              <h3>Contact Information</h3>
              <div className="contact-fields-container">
                {renderContactField('address', 'Address', address, 'No address provided')}
                {renderContactField('email', 'Email', email, 'No email provided')}
                {renderContactField('phone', 'Phone', phone, 'No phone number provided')}
                {renderContactField('openingHours', 'Opening Hours', openingHours, 'No opening hours provided')}
              </div>
              {contactSaveStatus.message && (
                <div className={`status-message ${contactSaveStatus.type}`}>
                  {contactSaveStatus.message}
                </div>
              )}
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
      </div>
    </>
  );
};

export default FoodBankDashboard; 