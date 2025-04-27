import React, { useState, useContext, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserContext } from '../App';
import '../assets/styles/Dashboard.css'; // Reuse existing dashboard styles for now
import '../assets/styles/VolunteerDashboard.css'; // Add specific styles
import PickupDetailsModal from '../components/PickupDetailsModal';
import FoodBankSuggestionModal from '../components/FoodBankSuggestionModal';
import { 
  getAvailableDonations, 
  assignDonationToVolunteer,
  getVolunteerScheduledDonations,
  getVolunteerCompletedDonationCount,
  cancelVolunteerAssignment
} from '../services/donationService';
import { markDonationPickedUp } from '../services/foodBankService';

const VolunteerDashboard = () => {
  const { userData, setUserData } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('qrcode'); // Default tab
  const [error, setError] = useState(null);
  const [statsError, setStatsError] = useState(null); // Separate error state for stats
  const [availableTasks, setAvailableTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [scheduledDonations, setScheduledDonations] = useState([]);
  const [completedCount, setCompletedCount] = useState(0); // State for completed count
  const [isLoadingStats, setIsLoadingStats] = useState(false); // Loading state for stats
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isFoodBankModalOpen, setIsFoodBankModalOpen] = useState(false);
  const [isPickingUp, setIsPickingUp] = useState(false);

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

  useEffect(() => {
    // Get user's location for food bank recommendations
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

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
        // If modal is open with this pickup, close it
        if (selectedPickup && selectedPickup._id === donationId) {
          setIsModalOpen(false);
        }
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

  const handleCancelTask = async (donationId) => {
    if (!userData?.auth0Id) {
      setError('Please log in to cancel a task');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this pickup? This action cannot be undone.')) {
      return;
    }

    setIsCancelling(true);
    setError(null);
    
    try {
      const response = await cancelVolunteerAssignment(donationId, userData.auth0Id);
      if (response.success) {
        // Update UI by removing the task from scheduled donations
        setScheduledDonations(prev => prev.filter(task => task._id !== donationId));
        // Close the modal if it's open with this task
        if (selectedPickup && selectedPickup._id === donationId) {
          setIsModalOpen(false);
        }
        alert('Pickup cancelled successfully.');
      } else {
        setError(response.message || 'Failed to cancel pickup.');
      }
    } catch (err) {
      setError('Failed to cancel pickup. Please try again.');
      console.error('Error cancelling task:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleViewDetails = (pickup) => {
    setSelectedPickup(pickup);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleModalAccept = (donationId) => {
    // Update the available tasks list
    setAvailableTasks(prev => prev.filter(task => task._id !== donationId));
    
    // Refresh scheduled donations and stats
    fetchScheduledDonations();
    fetchCompletedDonationCount();
  };

  const handleModalCancel = (donationId) => {
    // Update the scheduled donations list
    setScheduledDonations(prev => prev.filter(task => task._id !== donationId));
    
    // Refresh stats
    fetchCompletedDonationCount();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const handleScanQRCode = async (donationId) => {
    if (!userData?.auth0Id) {
      setError('Please log in to scan the QR code');
      return;
    }

    if (!donationId) {
      alert('Invalid QR code');
      return;
    }

    setIsPickingUp(true);
    setError(null);

    try {
      // Find the donation in the scheduled list
      const donation = scheduledDonations.find(d => d._id === donationId);
      
      if (!donation) {
        throw new Error('Donation not found in your scheduled pickups');
      }
      
      // Check if already picked up
      if (donation.status === 'picked_up') {
        // Open food bank modal for delivery
        setSelectedPickup(donation);
        setIsFoodBankModalOpen(true);
      } else if (donation.status === 'scheduled') {
        // Mark as picked up
        const response = await markDonationPickedUp(donationId, userData.auth0Id);
        
        if (response.success) {
          // Update the local state
          const updatedDonations = scheduledDonations.map(d => 
            d._id === donationId ? { ...d, status: 'picked_up' } : d
          );
          setScheduledDonations(updatedDonations);
          
          alert('Pickup confirmed! Please deliver to a food bank.');
          
          // Get the updated donation and open food bank modal
          setSelectedPickup({...donation, status: 'picked_up'});
          setIsFoodBankModalOpen(true);
        } else {
          throw new Error(response.message || 'Failed to confirm pickup');
        }
      } else {
        throw new Error(`Cannot process donation with status: ${donation.status}`);
      }
    } catch (err) {
      console.error('Error processing QR scan:', err);
      setError(err.message || 'Failed to process QR code. Please try again.');
    } finally {
      setIsPickingUp(false);
    }
  };

  const handleFoodBankModalClose = (wasDelivered = false) => {
    setIsFoodBankModalOpen(false);
    
    if (wasDelivered) {
      // Refresh data after delivery
      fetchScheduledDonations();
      fetchCompletedDonationCount();
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
                        <p><strong>Address:</strong> {task.businessAddress || 'No address provided'}</p>
                        <p><strong>Extra Information:</strong> {task.pickupInfo}</p>
                        <div className="task-actions">
                          <button 
                            className="view-details-btn"
                            onClick={() => handleViewDetails(task)}
                          >
                            View Details
                          </button>
                          {task.status === 'scheduled' && (
                            <>
                              <button 
                                className="scan-qr-btn"
                                onClick={() => handleScanQRCode(task._id)}
                                disabled={isPickingUp}
                              >
                                {isPickingUp ? 'Processing...' : 'Scan QR & Pickup'}
                              </button>
                              <button 
                                className="cancel-pickup-btn"
                                onClick={() => handleCancelTask(task._id)}
                                disabled={isCancelling}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {task.status === 'picked_up' && (
                            <button 
                              className="delivery-btn"
                              onClick={() => {
                                setSelectedPickup(task);
                                setIsFoodBankModalOpen(true);
                              }}
                            >
                              Deliver to Food Bank
                            </button>
                          )}
                        </div>
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
                            <h4>Address:</h4>
                            <p>{task.businessAddress || 'No address provided'}</p>
                          </div>

                          <div className="task-section">
                            <h4>Extra Information:</h4>
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
                            <button 
                              className="view-details-btn"
                              onClick={() => handleViewDetails(task)}
                            >
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

      {/* Modal for viewing pickup details */}
      {isModalOpen && selectedPickup && (
        <PickupDetailsModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          pickup={selectedPickup}
          onAccept={handleModalAccept}
          onCancel={handleModalCancel}
        />
      )}
      
      {/* Modal for food bank suggestions */}
      {isFoodBankModalOpen && selectedPickup && userLocation && (
        <FoodBankSuggestionModal
          isOpen={isFoodBankModalOpen}
          onClose={handleFoodBankModalClose}
          pickup={selectedPickup}
          userLocation={userLocation}
        />
      )}
    </div>
  );
};

export default VolunteerDashboard; 