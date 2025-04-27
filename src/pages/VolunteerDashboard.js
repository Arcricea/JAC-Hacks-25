import React, { useState, useContext, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth'; // Import otpauth
import { UserContext } from '../App';
import '../assets/styles/Dashboard.css'; // Reuse existing dashboard styles for now
import '../assets/styles/VolunteerDashboard.css'; // Add specific styles
import { saveUser } from '../services/userService'; // Import saveUser service
import { 
  getAvailableDonations, 
  assignDonationToVolunteer, 
  getVolunteerTasks,
  updateTaskStatus 
} from '../services/donationService';

const VolunteerDashboard = () => {
  const { userData, setUserData } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('qrcode'); // Default tab
  const [currentCode, setCurrentCode] = useState('------');
  const [timeRemaining, setTimeRemaining] = useState(30); // TOTP period (usually 30s)
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const totpRef = useRef(null);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [myTasks, setMyTasks] = useState([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    // Clear previous interval on component unmount or when secret changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (userData?.volunteerSecret) {
      // Initialize TOTP instance
      try {
        totpRef.current = OTPAuth.URI.parse(`otpauth://totp/MealNet:${userData.username}?secret=${userData.volunteerSecret}&issuer=MealNet&algorithm=SHA1&digits=6&period=30`);
      } catch (error) {
        console.error("Error parsing OTPAuth URI:", error);
        setCurrentCode('Error');
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      const updateCodeAndTime = () => {
        if (!totpRef.current) return;

        const code = totpRef.current.generate();
        setCurrentCode(code);

        const remaining = totpRef.current.period - (Math.floor(Date.now() / 1000) % totpRef.current.period);
        setTimeRemaining(remaining);
      };

      // Update immediately
      updateCodeAndTime();

      // Set interval to update every second
      if (intervalRef.current) clearInterval(intervalRef.current); // Clear previous interval
      intervalRef.current = setInterval(updateCodeAndTime, 1000);

    } else {
      // No secret, clear interval and reset state
      setCurrentCode('------');
      setTimeRemaining(30);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    // Cleanup function for this effect
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userData?.volunteerSecret, userData?.username]); // Rerun if secret or username changes

  useEffect(() => {
    if (activeTab === 'available') {
      fetchAvailableTasks();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'tasks' && userData?.auth0Id) {
      fetchMyTasks();
    }
  }, [activeTab, userData]);

  const fetchAvailableTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAvailableDonations();
      if (response.success) {
        setAvailableTasks(response.data);
      }
    } catch (err) {
      setError('Failed to load available tasks. Please try again later.');
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyTasks = async () => {
    try {
      const response = await getVolunteerTasks(userData.auth0Id);
      if (response.success) {
        setMyTasks(response.data);
      }
    } catch (err) {
      console.error('Error fetching my tasks:', err);
    }
  };

  // Function to format the date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Combine username and code for the QR code value
  const qrCodeValue = (userData?.username && currentCode && currentCode !== '------' && currentCode !== 'Error') 
                      ? `${userData.username}:${currentCode}` 
                      : 'loading'; // Fallback value

  // Function to generate/regenerate volunteer secret
  const generateVolunteerSecret = async () => {
    if (!userData || !userData.auth0Id || !userData.username) {
      setError('User profile incomplete. Please complete your profile first.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Save user with volunteer account type which will trigger secret generation on the server
      const response = await saveUser({
        auth0Id: userData.auth0Id,
        username: userData.username,
        accountType: 'volunteer'
      });

      if (response.success) {
        // Update local state with the response data
        // Note: The secret is not returned in the response for security reasons
        // We need to make another request to get the full user data including the secret
        
        // Reload the page to trigger a new user data fetch from the server
        window.location.reload();
      } else {
        setError(response.message || 'Failed to generate volunteer secret');
      }
    } catch (error) {
      setError(error.message || 'An error occurred while generating volunteer secret');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptTask = async (taskId) => {
    if (!userData?.auth0Id) {
      setError('Please log in to accept tasks');
      return;
    }

    setIsAssigning(true);
    try {
      const response = await assignDonationToVolunteer(taskId, userData.auth0Id);
      if (response.success) {
        // Remove the task from available tasks
        setAvailableTasks(prev => prev.filter(task => task._id !== taskId));
        // Refresh my tasks
        await fetchMyTasks();
        // Show success message
        alert('Task accepted successfully!');
      }
    } catch (err) {
      setError('Failed to accept task. Please try again.');
      console.error('Error accepting task:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    if (!userData?.auth0Id) {
      setError('Please log in to update tasks');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const response = await updateTaskStatus(taskId, newStatus);
      if (response.success) {
        // Update the task in the local state
        setMyTasks(prev => prev.map(task => 
          task._id === taskId ? { ...task, status: newStatus } : task
        ));
        // Show success message
        alert(`Task marked as ${newStatus.replace('_', ' ')}!`);
      }
    } catch (err) {
      setError('Failed to update task status. Please try again.');
      console.error('Error updating task status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Example data - this would come from your backend in a real application
  const volunteerData = {
    tasksCompleted: 12,
    upcomingShifts: [
      { id: 1, location: 'Community Food Bank', date: '2025-05-10', time: '9:00 AM - 12:00 PM' },
      { id: 2, location: 'Downtown Shelter', date: '2025-05-15', time: '1:00 PM - 4:00 PM' },
    ],
    // Add available tasks data
    availableTasks: [
      {
        id: 1,
        organization: 'Community Food Bank',
        role: 'Food Sorter',
        date: '2025-05-20',
        time: '10:00 AM - 2:00 PM',
        location: '123 Main St',
        spots: 5,
        description: 'Help sort and organize food donations for distribution.',
        requirements: ['Must be able to lift 20lbs', 'Food handling experience preferred']
      },
      {
        id: 2,
        organization: 'Local Soup Kitchen',
        role: 'Meal Server',
        date: '2025-05-21',
        time: '11:30 AM - 2:30 PM',
        location: '456 Oak Ave',
        spots: 3,
        description: 'Serve meals to community members in need.',
        requirements: ['Food handling certificate required', 'Standing for extended periods']
      },
      {
        id: 3,
        organization: 'Food Rescue Program',
        role: 'Delivery Driver',
        date: '2025-05-22',
        time: '8:00 AM - 12:00 PM',
        location: '789 Pine St',
        spots: 2,
        description: 'Pick up and deliver food donations from local businesses to food banks.',
        requirements: ['Valid driver\'s license', 'Clean driving record', 'Own vehicle']
      }
    ]
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
          My Tasks
        </button>
        <button 
          className={activeTab === 'available' ? 'active' : ''} 
          onClick={() => setActiveTab('available')}
        >
          Available Deliveries
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'qrcode' && (
          <div className="qr-code-section card-style volunteer-id-card">
            <h3><i className="fas fa-qrcode"></i> Your Volunteer Code</h3>
            <p>Ask the location to scan this QR code. It updates automatically.</p>
            
            <div className="verification-details-container single-qr-display">
              {/* Combined QR Code and Timer */} 
              <div className="dynamic-code-section full-width">
                  {userData?.volunteerSecret && userData?.username ? (
                    <div className="totp-display-combined">
                       <div className="qr-code-container">
                          <div className="qr-code-display">
                            {qrCodeValue !== 'loading' ? (
                               <QRCodeSVG 
                                value={qrCodeValue} // Combined value
                                size={200} 
                                level={"H"} 
                                includeMargin={true}
                              />
                            ) : (
                               <div className="qr-loading">Generating code...</div>
                            )}
                           
                          </div>
                       </div>
                       <div className="totp-timer">
                        <span>Code: <strong>{currentCode}</strong></span>
                        <span>Refreshes in: {timeRemaining}s</span>
                        <div className="timer-bar-container">
                          <div 
                              className="timer-bar" 
                              style={{ width: `${(timeRemaining / 30) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-warning">
                      Code generation unavailable. Ensure profile is complete.
                      {error && <p className="error-message">{error}</p>}
                      <button 
                        className="primary-btn" 
                        onClick={generateVolunteerSecret}
                        disabled={isGenerating}
                      >
                        {isGenerating ? 'Generating...' : 'Generate Volunteer Code'}
                      </button>
                    </div>
                  )}
              </div>
            </div> 
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="tasks-section">
            <h3>My Assigned Deliveries</h3>
            <div className="assigned-tasks-grid">
              {myTasks.map(task => (
                <div key={task._id} className="task-card">
                  <div className="task-card-header">
                    <h4>{task.itemName}</h4>
                    <span className={`status-badge ${task.status}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="task-card-body">
                    <p><strong>Category:</strong> {task.category}</p>
                    <p><strong>Quantity:</strong> {task.quantity}</p>
                    <p><strong>Pickup Info:</strong> {task.pickupInfo}</p>
                    <p><strong>Expires:</strong> {formatDate(task.expirationDate)}</p>
                    <p><strong>Assigned:</strong> {formatDate(task.assignedAt)}</p>
                  </div>

                  <div className="task-card-footer">
                    {task.status !== 'completed' && (
                      <button 
                        className="primary-btn"
                        onClick={() => handleUpdateTaskStatus(task._id, 'completed')}
                        disabled={isUpdatingStatus}
                      >
                        {isUpdatingStatus ? 'Updating...' : 'Mark as Completed'}
                      </button>
                    )}
                    {task.status === 'completed' && (
                      <span className="completed-message">✓ Delivery Completed</span>
                    )}
                  </div>
                </div>
              ))}

              {myTasks.length === 0 && (
                <div className="no-tasks-message">
                  <p>You haven't accepted any deliveries yet.</p>
                  <p>Check the Available Deliveries tab to find tasks!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'available' && (
          <div className="available-tasks-section">
            <h3>Available Food Deliveries</h3>
            
            {isLoading && (
              <div className="loading-spinner">Loading available tasks...</div>
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
                    placeholder="Search deliveries..."
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
                          <h5>Items to Deliver:</h5>
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
                          {isAssigning ? 'Accepting...' : 'Accept Delivery'}
                        </button>
                        <button className="secondary-btn">View Details</button>
                      </div>
                    </div>
                  ))}
                </div>

                {availableTasks.length === 0 && (
                  <div className="no-tasks-message">
                    <p>No deliveries available at the moment.</p>
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