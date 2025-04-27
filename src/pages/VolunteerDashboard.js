import React, { useState, useContext, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserContext } from '../App';
import '../assets/styles/Dashboard.css'; // Reuse existing dashboard styles for now
import '../assets/styles/VolunteerDashboard.css'; // Add specific styles
import { 
  getAvailableDonations, 
  assignDonationToVolunteer,
  getVolunteerScheduledDonations,
  getVolunteerCompletedDonationCount
} from '../services/donationService';

const VolunteerDashboard = () => {
  const { userData, setUserData } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('qrcode'); // Default tab
  const [error, setError] = useState(null);
  const [statsError, setStatsError] = useState(null); // Separate error state for stats
  const [availableTasks, setAvailableTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [scheduledDonations, setScheduledDonations] = useState([]);
  const [completedCount, setCompletedCount] = useState(0); // State for completed count
  const [isLoadingStats, setIsLoadingStats] = useState(false); // Loading state for stats

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

  useEffect(() => {
    if (userData?.auth0Id) {
      fetchCompletedDonationCount();
    }
  }, [userData]);

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

  const fetchCompletedDonationCount = async () => {
    if (!userData?.auth0Id) return;
    setIsLoadingStats(true);
    setStatsError(null);
    try {
      const response = await getVolunteerCompletedDonationCount(userData.auth0Id);
      if (response.success) {
        setCompletedCount(response.data.completedCount);
      } else {
        setStatsError(response.message || 'Failed to load donation stats.');
        console.error('Stats fetch error:', response.message);
      }
    } catch (err) {
      setStatsError('Failed to load donation stats.');
      console.error('Error fetching donation stats:', err);
    } finally {
      setIsLoadingStats(false);
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
        fetchCompletedDonationCount();
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
      
      {/* Stats Overview Section */}
      <div className="stats-overview">
        <div className="stat-card">
          <h4>Completed Pickups</h4>
          {isLoadingStats && <p>Loading...</p>}
          {statsError && <p className="error-message small">{statsError}</p>}
          {!isLoadingStats && !statsError && (
            <p className="stat-value">{completedCount}</p>
          )}
        </div>
        {/* Add more stat cards here if needed */}
      </div>
      
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
                  </select>
                </div>

                {availableTasks.length > 0 ? (
                  <div className="task-list">
                    {availableTasks.map(task => (
                      <div key={task._id} className="task-card">
                        <div className="task-header">
                          <span className="task-title">
                            {task.businessName || task.donorName || 'Anonymous'} Food Delivery Task
                          </span>
                          <span className="task-category">{task.category}</span>
                        </div>
                        
                        <div className="task-content">
                          <div className="task-section">
                            <h4>Items to Pickup:</h4>
                            <p>{task.itemName} ({task.quantity})</p>
                          </div>

                          <div className="task-section">
                            <h4>Pickup Information:</h4>
                            <p>{task.pickupInfo}</p>
                          </div>

                          <div className="task-dates">
                            <div className="date-info">
                              <span className="date-label">Expiration Date:</span>
                              <span className="date-value">{formatDate(task.expirationDate)}</span>
                            </div>
                            <div className="date-info">
                              <span className="date-label">Listed Time:</span>
                              <span className="date-value">{formatDate(task.createdAt)}</span>
                            </div>
                          </div>

                          <div className="task-actions">
                            <button
                              onClick={() => handleAcceptTask(task._id)}
                              disabled={isAssigning}
                              className="accept-pickup-btn"
                            >
                              Accept Pickup
                            </button>
                            <button className="view-details-btn">
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-tasks-message">
                    <p>No available pickups at the moment.</p>
                    <p>Check back later for new opportunities!</p>
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