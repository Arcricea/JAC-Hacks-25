import React, { useState, useContext, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserContext } from '../App';
import '../assets/styles/Dashboard.css'; // Reuse existing dashboard styles for now
import '../assets/styles/VolunteerDashboard.css'; // Add specific styles
import { 
  getAvailableDonations, 
  assignDonationToVolunteer,
  getVolunteerScheduledDonations
} from '../services/donationService';

const VolunteerDashboard = () => {
  const { userData, setUserData } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('qrcode'); // Default tab
  const [error, setError] = useState(null);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [scheduledDonations, setScheduledDonations] = useState([]);

  useEffect(() => {
    if (activeTab === 'available') {
      fetchAvailableTasks();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'tasks' && userData?.auth0Id) {
      fetchScheduledDonations();
    }
  }, [activeTab, userData]);

  const fetchAvailableTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAvailableDonations();
      if (response.success) {
        setAvailableTasks(response.data);
      } else {
        setError(response.message || 'Failed to load available tasks.');
      }
    } catch (err) {
      setError('Failed to load available tasks. Please try again later.');
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScheduledDonations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getVolunteerScheduledDonations(userData.auth0Id);
      if (response.success) {
        setScheduledDonations(response.data);
      } else {
        setError(response.message || 'Failed to load your tasks.');
      }
    } catch (err) {
      console.error('Error fetching my tasks:', err);
      setError('Failed to load your tasks. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const qrCodeValue = userData?.auth0Id 
                      ? `volunteerid:${userData.auth0Id}` 
                      : 'loading';

  const handleAcceptTask = async (donationId) => {
    if (!userData?.auth0Id) {
      setError('Please log in to accept tasks');
      return;
    }

    setIsAssigning(true);
    try {
      const response = await assignDonationToVolunteer(donationId, userData.auth0Id);
      if (response.success) {
        setAvailableTasks(prev => prev.filter(task => task._id !== donationId));
        fetchScheduledDonations();
        alert('Donation scheduled successfully!');
      } else {
        setError(response.message || 'Failed to schedule donation.');
      }
    } catch (err) {
      setError('Failed to schedule donation. Please try again.');
      console.error('Error accepting task:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="dashboard-container">
      <h2>Volunteer Dashboard</h2>
      
      <div className="dashboard-nav">
        <button 
          className={activeTab === 'qrcode' ? 'active' : ''} 
          onClick={() => setActiveTab('qrcode')}
        >
          My QR Code
        </button>
        <button 
          className={activeTab === 'tasks' ? 'active' : ''} 
          onClick={() => setActiveTab('tasks')}
        >
          My Scheduled Pickups
        </button>
        <button 
          className={activeTab === 'available' ? 'active' : ''} 
          onClick={() => setActiveTab('available')}
        >
          Available Pickups
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'qrcode' && (
          <div className="qr-code-section card-style volunteer-id-card">
            <h3><i className="fas fa-qrcode"></i> Your Volunteer Code</h3>
            <p>Ask the location to scan this QR code. It updates automatically.</p>
            
            <div className="verification-details-container single-qr-display">
              {qrCodeValue === 'loading' && <p>Loading QR Code...</p>}
              {qrCodeValue !== 'loading' && qrCodeValue !== 'Error' && (
                <div className="qr-code-container">
                  <QRCodeSVG value={qrCodeValue} size={256} includeMargin={true} />
                  <p style={{marginTop: '1rem', fontWeight: 'bold'}}>Your ID: {userData.auth0Id}</p>
                </div>
              )}
              {qrCodeValue === 'Error' && <p className="error-message">Could not generate QR code.</p>}
            </div> 
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="my-tasks-section">
            <h3>My Scheduled Pickups</h3>
            {isLoading && <p>Loading scheduled pickups...</p>}
            {error && <div className="error-message">{error}</div>}
            {!isLoading && !error && (
              scheduledDonations.length > 0 ? (
                <div className="task-list">
                  {scheduledDonations.map(task => (
                    <div key={task._id} className="task-card">
                      <div className="task-card-header">
                        <h4>{task.itemName} ({task.quantity})</h4>
                        <span className={`status-badge ${task.status}`}>{task.status}</span>
                      </div>
                      
                      <div className="task-card-body">
                        <p><strong>Category:</strong> {task.category}</p>
                        <p><strong>Expires:</strong> {formatDate(task.expirationDate)}</p>
                        <p><strong>Pickup Info:</strong> {task.pickupInfo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-tasks-message">
                  <p>You have no pickups currently scheduled.</p>
                  <p>Check the Available Pickups tab to find tasks!</p>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'available' && (
          <div className="available-tasks-section">
            <h3>Available Donation Pickups</h3>
            
            {isLoading && (
              <div className="loading-spinner">Loading available pickups...</div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {!isLoading && !error && (
              <>
                <div className="task-filters">
                  <input 
                    type="text" 
                    placeholder="Search pickups..."
                    className="task-search"
                  />
                  <select className="task-filter">
                    <option value="">All Categories</option>
                    <option value="produce">Fresh Produce</option>
                    <option value="bakery">Bakery</option>
                    <option value="dairy">Dairy</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="available-tasks-grid">
                  {availableTasks.map(task => (
                    <div key={task._id} className="task-card">
                      <div className="task-card-header">
                        <h4>Food Delivery Task</h4>
                        <span className="task-category">{task.category}</span>
                      </div>
                      
                      <div className="task-card-body">
                        <div className="task-details">
                          <h5>Items to Pickup:</h5>
                          <p className="item-details">
                            <span className="item-name">{task.itemName}</span>
                            <span className="item-quantity">({task.quantity})</span>
                          </p>
                          
                          <h5>Pickup Information:</h5>
                          <p className="pickup-info">{task.pickupInfo}</p>
                          
                          <div className="task-metadata">
                            <p className="expiry-date">
                              <span className="material-icons">Expiration Date: </span>
                              {formatDate(task.expirationDate)}
                            </p>
                            <p className="created-date">
                              <span className="material-icons">Listed Time:</span>
                              {formatDate(task.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="task-card-footer">
                        <button 
                          className="primary-btn"
                          onClick={() => handleAcceptTask(task._id)}
                          disabled={isAssigning}
                        >
                          {isAssigning ? 'Scheduling...' : 'Accept Pickup'}
                        </button>
                        <button className="secondary-btn">View Details</button>
                      </div>
                    </div>
                  ))}
                </div>

                {availableTasks.length === 0 && (
                  <div className="no-tasks-message">
                    <p>No pickups available at the moment.</p>
                    <p>Please check back later for new opportunities.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard; 