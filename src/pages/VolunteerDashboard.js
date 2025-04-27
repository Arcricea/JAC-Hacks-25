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
  cancelVolunteerAssignment,
  getVolunteerCompletedDonations
} from '../services/donationService';
import { markDonationPickedUp, markDonationDelivered } from '../services/foodBankService';

// Simple hash function (djb2) - you can replace this with a more robust one if needed
const djb2Hash = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Ensure positive integer
};

// Generate an 8-digit code based on a seed string (e.g., auth0Id)
const generateVerificationCode = (seed) => {
  if (!seed) return 'Error';
  try {
    const hash = djb2Hash(seed);
    // Take the hash modulo 10^8 to get an 8-digit number
    const code = hash % 100000000; 
    // Pad with leading zeros if needed
    return code.toString().padStart(8, '0'); 
  } catch (err) {
    console.error("Error generating verification code:", err);
    return 'Error';
  }
};

const VolunteerDashboard = () => {
  const { userData, setUserData } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('qrcode'); // Default tab
  const [error, setError] = useState(null);
  const [statsError, setStatsError] = useState(null); // Separate error state for stats
  const [availableTasks, setAvailableTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [scheduledDonations, setScheduledDonations] = useState([]);
  const [completedDonations, setCompletedDonations] = useState([]); // For history tab
  const [completedCount, setCompletedCount] = useState(0); // State for completed count
  const [isLoadingStats, setIsLoadingStats] = useState(false); // Loading state for stats
  const [isLoadingHistory, setIsLoadingHistory] = useState(false); // Loading state for history
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
    if (activeTab === 'history' && userData?.auth0Id) {
      fetchCompletedDonations();
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

  // Apply filters whenever availableTasks, searchTerm, or selectedCategory changes
  useEffect(() => {
    let filtered = [...availableTasks];
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(task => task.category.toLowerCase() === selectedCategory.toLowerCase());
    }
    
    // Apply search filter if implemented
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.businessName && task.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.pickupInfo && task.pickupInfo.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredTasks(filtered);
  }, [availableTasks, selectedCategory, searchTerm]);

  const fetchAvailableTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAvailableDonations();
      if (response.success) {
        setAvailableTasks(response.data);
        setFilteredTasks(response.data);
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

  const fetchCompletedDonations = async () => {
    if (!userData?.auth0Id) return;
    setIsLoadingHistory(true);
    setError(null);
    try {
      const response = await getVolunteerCompletedDonations(userData.auth0Id);
      if (response.success) {
        setCompletedDonations(response.data);
      } else {
        setError(response.message || 'Failed to load your completed deliveries.');
      }
    } catch (err) {
      console.error('Error fetching completed deliveries:', err);
      setError('Failed to load your completed deliveries. Please try again later.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Replace qrCodeValue with verificationCodeValue
  const verificationCodeValue = userData?.auth0Id
                                ? generateVerificationCode(userData.auth0Id)
                                : 'loading';
  // Re-add qrCodeValue for the QR code itself
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
        
        // Refresh available tasks so the cancelled donation appears there
        if (activeTab === 'available') {
          fetchAvailableTasks();
        } else {
          // If not currently on available tab, refresh next time user navigates there
          // by invalidating the current data
          setAvailableTasks([]);
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

  // Sort function for tasks - update to include awaiting_actions priority
  const sortTasks = (a, b) => {
    // Show "picked_up" (awaiting actions) items first
    if (a.status === 'picked_up' && b.status !== 'picked_up') return -1;
    if (a.status !== 'picked_up' && b.status === 'picked_up') return 1;
    // Then sort by creation date (newest first)
    return new Date(b.createdAt) - new Date(a.createdAt);
  };

  // New function to handle the state transition from scheduled to awaiting_actions
  const handleMoveToAwaitingActions = async (donationId) => {
    if (!userData?.auth0Id) {
      setError('Please log in to update this donation');
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
      
      if (donation.status === 'scheduled') {
        // Mark as picked up - the backend still uses this terminology
        const response = await markDonationPickedUp(donationId, userData.auth0Id);
        
        if (response.success) {
          // Update the local state
          const updatedDonations = scheduledDonations.map(d => 
            d._id === donationId ? { ...d, status: 'picked_up' } : d
          );
          setScheduledDonations(updatedDonations);
          
          alert('Donation moved to awaiting actions');
        } else {
          throw new Error(response.message || 'Failed to update donation');
        }
    } else {
        throw new Error(`Cannot update donation with status: ${donation.status}`);
      }
    } catch (err) {
      console.error('Error updating donation status:', err);
      setError(err.message || 'Failed to update donation. Please try again.');
    } finally {
      setIsPickingUp(false);
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
      fetchCompletedDonations(); // Refresh history data
    }
  };

  const handleDirectMarkAsDelivered = async (task) => {
    if (!userData?.auth0Id) {
      setError('Please log in to mark as delivered');
      return;
    }

    // Confirm the action
    if (!window.confirm(`Are you sure you want to mark "${task.itemName}" as delivered?`)) {
      return;
    }

    setIsPickingUp(true); // Reuse the loading state
    setError(null);

    try {
      // Use a default food bank ID since it's a direct action
      const response = await markDonationDelivered(
        task._id,
        userData.auth0Id,
        'default_food_bank_id'
      );
      
      if (response.success) {
        // Update the UI by removing this task from scheduled donations
        setScheduledDonations(prev => prev.filter(d => d._id !== task._id));
        
        // Refresh the completed donations and count
        fetchCompletedDonationCount();
        fetchCompletedDonations();
        
        alert('Delivery confirmed successfully!');
      } else {
        throw new Error(response.message || 'Failed to mark as delivered');
      }
    } catch (err) {
      console.error('Error marking donation as delivered:', err);
      setError(err.message || 'Failed to mark as delivered. Please try again.');
    } finally {
      setIsPickingUp(false);
    }
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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
          My Code 
        </button>
        <button 
          className={activeTab === 'available' ? 'active' : ''} 
          onClick={() => setActiveTab('available')}
        >
          Available Pickups
        </button>
        <button 
          className={activeTab === 'tasks' ? 'active' : ''} 
          onClick={() => setActiveTab('tasks')}
        >
          My Scheduled Pickups
        </button>
        <button 
          className={activeTab === 'history' ? 'active' : ''} 
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'qrcode' && (
          <div className="verification-code-section card-style volunteer-id-card">
            <h3><i className="fas fa-id-card"></i> Your Volunteer ID</h3>
            <p>Provide this code OR ask the location to scan the QR code for pickup confirmation.</p>
            
            <div className="verification-details-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              {(verificationCodeValue === 'loading' || qrCodeValue === 'loading') && <p>Loading...</p>}
              
              {verificationCodeValue !== 'loading' && verificationCodeValue !== 'Error' && (
                <div className="verification-code-container text-code-display" style={{ textAlign: 'center' }}>
                  <h4>8-Digit Code:</h4>
                  <div className="verification-code-display">
                    {verificationCodeValue}
                  </div>
                </div>
              )}
              {verificationCodeValue === 'Error' && <p className="error-message small-error">Could not generate verification code.</p>}

              {qrCodeValue !== 'loading' && qrCodeValue !== 'Error' && (
                <div className="qr-code-container qr-display" style={{ textAlign: 'center' }}>
                  <h4>QR Code:</h4>
                  <QRCodeSVG value={qrCodeValue} size={150} includeMargin={true} />
                </div>
              )}
              {qrCodeValue === 'Error' && <p className="error-message small-error">Could not generate QR code.</p>}
            </div>
            
            {(verificationCodeValue !== 'loading' && qrCodeValue !== 'loading') && (
                 <p style={{marginTop: '1.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: '#666', textAlign: 'center', width: '100%'}}>Your ID: {userData.auth0Id}</p> 
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="my-tasks-section">
            <h3>My Pickups</h3>
            {isLoading && <p>Loading your pickups...</p>}
            {error && <div className="error-message">{error}</div>}
            {!isLoading && !error && (
              scheduledDonations.length > 0 ? (
                <div className="task-list">
                  {[...scheduledDonations]
                    .sort(sortTasks)
                    .map(task => (
                      <div 
                        key={task._id} 
                        className={`task-card ${task.status === 'picked_up' ? 'task-in-progress' : ''}`}
                      >
                        <div className="task-card-header">
                          <h4>{task.businessName || 'Unknown Business'}</h4>
                          <span className={`status-badge ${task.status}`}>
                            {task.status === 'picked_up' ? 'Awaiting Actions' : task.status}
                          </span>
                        </div>
                        
                        <div className="task-card-body">
                          <p><strong>Item:</strong> {task.itemName} {task.quantity ? `(${task.quantity})` : ''}</p>
                          <p><strong>Category:</strong> {task.category}</p>
                          <p><strong>Address:</strong> {typeof task.businessAddress === 'object' ? 
                            (task.businessAddress?.street ? 
                              `${task.businessAddress.street}${task.businessAddress.city ? `, ${task.businessAddress.city}` : ''}${task.businessAddress.state ? `, ${task.businessAddress.state}` : ''}${task.businessAddress.postalCode ? ` ${task.businessAddress.postalCode}` : ''}` 
                              : 'No address details') 
                            : task.businessAddress || 'No address provided'}</p>
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
                                className="food-bank-btn"
                                onClick={() => {
                                  setSelectedPickup(task);
                                  setIsFoodBankModalOpen(true);
                                }}
                                disabled={isPickingUp}
                              >
                                Choose Food Bank
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  ) : (
                <div className="no-tasks-message">
                  <p>You have no pickups scheduled or in progress.</p>
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
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                  <select 
                    className="task-filter" 
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                  >
                    <option value="">All Categories</option>
                    <option value="produce">Produce</option>
                    <option value="bakery">Bakery</option>
                    <option value="dairy">Dairy</option>
                    <option value="meat">Meat</option>
                    <option value="canned">Canned Goods</option>
                    <option value="dry">Dry Goods</option>
                    <option value="frozen">Frozen</option>
                    <option value="prepared">Prepared Meals</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {filteredTasks.length > 0 ? (
                  <div className="task-list">
                    {filteredTasks.map(task => (
                      <div 
                        key={task._id} 
                        className={`task-card ${task.status === 'picked_up' ? 'task-in-progress' : ''}`}
                      >
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
                            <p>{typeof task.businessAddress === 'object' ? 
                              (task.businessAddress?.street ? 
                                `${task.businessAddress.street}${task.businessAddress.city ? `, ${task.businessAddress.city}` : ''}${task.businessAddress.state ? `, ${task.businessAddress.state}` : ''}${task.businessAddress.postalCode ? ` ${task.businessAddress.postalCode}` : ''}` 
                                : 'No address details') 
                              : task.businessAddress || 'No address provided'}</p>
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
                    <p>No available pickups {selectedCategory ? `in ${selectedCategory} category` : ''} at the moment.</p>
                    <p>Check back later for new opportunities!</p>
            </div> 
                )}
              </>
            )}
          </div>
        )}

        {/* History tab for completed deliveries */}
        {activeTab === 'history' && (
          <div className="history-section">
            <h3>Completed Deliveries</h3>
            {isLoadingHistory && <p>Loading your delivery history...</p>}
            {error && <div className="error-message">{error}</div>}
            {!isLoadingHistory && !error && (
              completedDonations.length > 0 ? (
                <div className="task-list">
                  {completedDonations.map(task => (
                    <div 
                      key={task._id} 
                      className="task-card completed-task"
                    >
                      <div className="task-card-header">
                        <h4>{task.itemName} ({task.quantity})</h4>
                        <span className="status-badge completed">Completed</span>
                      </div>
                      
                      <div className="task-card-body">
                        <p><strong>Category:</strong> {task.category}</p>
                        <p><strong>Delivery Date:</strong> {formatDate(task.deliveryDate || task.updatedAt)}</p>
                        <p><strong>Donor:</strong> {task.businessName || 'Anonymous'}</p>
                        <p><strong>Address:</strong> {typeof task.businessAddress === 'object' ? 
                          (task.businessAddress?.street ? 
                            `${task.businessAddress.street}${task.businessAddress.city ? `, ${task.businessAddress.city}` : ''}${task.businessAddress.state ? `, ${task.businessAddress.state}` : ''}${task.businessAddress.postalCode ? ` ${task.businessAddress.postalCode}` : ''}` 
                            : 'No address details') 
                          : task.businessAddress || 'No address provided'}</p>
                        <div className="task-actions">
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
                  <p>You have no completed deliveries yet.</p>
                  <p>Deliveries will appear here after you complete them.</p>
            </div>
              )
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
      {isFoodBankModalOpen && selectedPickup && (
        <FoodBankSuggestionModal
          show={isFoodBankModalOpen}
          onClose={handleFoodBankModalClose}
          donation={selectedPickup}
          userLocation={userLocation || { latitude: 0, longitude: 0 }}
          onDeliveryConfirmed={() => handleFoodBankModalClose(true)}
        />
      )}
    </div>
  );
};

export default VolunteerDashboard; 