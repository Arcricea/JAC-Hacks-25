import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../App'; // Assuming UserContext holds token or user info
import { useAuth0 } from '@auth0/auth0-react'; // To get access token
import '../assets/styles/Dashboard.css'; // Reuse general dashboard styles
import '../assets/styles/OrganizerDashboard.css'; // Specific styles for this dashboard

const OrganizerDashboard = () => {
  const { userData } = useContext(UserContext);
  const { getAccessTokenSilently } = useAuth0();
  const [foodBanks, setFoodBanks] = useState([]);
  const [donations, setDonations] = useState({ available: [], scheduled: [], completed: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDonationTab, setActiveDonationTab] = useState('available'); // 'available', 'scheduled', 'completed'

  // State for adding new donations
  const [showAddDonationForm, setShowAddDonationForm] = useState(false);
  const [newDonationData, setNewDonationData] = useState({
    itemName: '',
    category: 'other', // Default category
    quantity: '',
    expirationDate: '',
    pickupInfo: '',
  });
  const [addDonationError, setAddDonationError] = useState('');

  // State for adding new food bank requests
  const [showAddRequestForm, setShowAddRequestForm] = useState(false);
  const [newRequestData, setNewRequestData] = useState({
    targetFoodBankId: '', // Store the auth0Id of the selected food bank
    priorityLevel: 3,    // Default priority
    customMessage: '',
  });
  const [addRequestError, setAddRequestError] = useState('');

  // Priority level descriptions (similar to FoodBankDashboard)
  const priorityLevels = [
    { level: 1, label: 'Do not need', color: '#4CAF50' },
    { level: 2, label: 'Low need', color: '#8BC34A' },
    { level: 3, label: 'Moderate need', color: '#FFC107' },
    { level: 4, label: 'High need', color: '#FF9800' },
    { level: 5, label: 'URGENT NEED', color: '#F44336' }
  ];

  const getPriorityInfo = (level) => {
    return priorityLevels.find(p => p.level === level) || { label: 'Unknown', color: '#9E9E9E' };
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        // const token = await getAccessTokenSilently(); // Removed token fetching
        const response = await fetch('http://localhost:5000/api/organizer/dashboard', { // Use absolute URL
          // headers: { // Removed headers
          //   Authorization: `Bearer ${token}`,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setFoodBanks(result.data.foodBanks || []);
          setDonations(result.data.donations || { available: [], scheduled: [], completed: [] });
        } else {
          throw new Error(result.message || 'Failed to fetch data');
        }
      } catch (err) {
        console.error("Error fetching organizer data:", err);
        setError(err.message || 'An error occurred while fetching data.');
      } finally {
        setIsLoading(false);
      }
    };

    if (userData?.accountType === 'organizer') {
      fetchData();
    }
  }, [userData, getAccessTokenSilently]);

  // --- Action Handlers --- //

  const handleDeleteDonation = async (donationId) => {
    // Optional: Add confirmation dialog
    if (!window.confirm('Are you sure you want to delete this donation?')) {
      return;
    }

    try {
      // We removed auth, so no token needed for now
      const response = await fetch(`http://localhost:5000/api/donations/${donationId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Donation deleted successfully');
        // Refresh data by removing the donation from state
        setDonations(prev => ({
          available: prev.available.filter(d => d._id !== donationId),
          scheduled: prev.scheduled.filter(d => d._id !== donationId),
          completed: prev.completed.filter(d => d._id !== donationId),
        }));
      } else {
        throw new Error(result.message || 'Failed to delete donation');
      }
    } catch (err) {
      console.error("Error deleting donation:", err);
      setError(err.message || 'An error occurred while deleting the donation.');
      // Optionally show a more user-friendly error message
    }
  };

  const handleDeleteFoodBank = async (foodBankUserId) => {
    // Optional: Add confirmation dialog
    if (!window.confirm('Are you sure you want to DELETE this food bank account? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/users/${foodBankUserId}`, {
        method: 'DELETE',
        // headers: { 'Content-Type': 'application/json' }, // No body needed usually for this reset
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Food bank deleted successfully');
        // Refresh data by removing the food bank from state
        setFoodBanks(prev => prev.filter(fb => 
          fb.auth0Id !== foodBankUserId
        ));
      } else {
        throw new Error(result.message || 'Failed to delete food bank');
      }
    } catch (err) {
      console.error("Error deleting food bank:", err);
      setError(err.message || 'An error occurred while deleting the food bank.');
    }
  };

  const handleResetFoodBankRequests = async (foodBankUserId) => {
    // Optional: Add confirmation dialog
    if (!window.confirm('Are you sure you want to RESET all requests/needs for this food bank? Existing needs will be cleared.')) {
      return;
    }
    try {
      // TODO: Implement the backend endpoint for this
      const response = await fetch(`http://localhost:5000/api/users/reset-requests/${foodBankUserId}`, {
        method: 'PUT', // Or POST, depending on backend implementation
        // No body needed usually for this reset
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Food bank requests reset successfully');
        // Refresh data by potentially updating the food bank state
        // For now, just refetch all data to be safe
        // TODO: Optimize this later if needed by updating state directly
        const fetchData = async () => {
          setIsLoading(true);
          setError('');
          try {
            const response = await fetch('http://localhost:5000/api/organizer/dashboard');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.success) {
              setFoodBanks(result.data.foodBanks || []);
              setDonations(result.data.donations || { available: [], scheduled: [], completed: [] });
            } else {
              throw new Error(result.message || 'Failed to fetch data');
            }
          } catch (err) {
            console.error("Error refetching data after reset:", err);
            setError(err.message || 'An error occurred while refreshing data.');
          } finally {
            setIsLoading(false);
          }
        };
        fetchData();
      } else {
        throw new Error(result.message || 'Failed to reset food bank requests');
      }
    } catch (err) {
      console.error("Error resetting food bank requests:", err);
      setError(err.message || 'An error occurred while resetting requests.');
    }
  };

  const handleSetFoodBankStatus = async (foodBankUserId) => {
    // Find the edited data from the state
    const foodBankToSave = foodBanks.find(fb => fb.auth0Id === foodBankUserId && fb.isEditing);
    if (!foodBankToSave || !foodBankToSave.editData) {
      console.error('Could not find edit data for food bank:', foodBankUserId);
      setError('An internal error occurred. Could not save changes.');
      return;
    }
    const { priorityLevel, customMessage } = foodBankToSave.editData;

    try {
      const response = await fetch(`http://localhost:5000/api/users/set-need/${foodBankUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorityLevel, customMessage }), // Send new status data from editData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Food bank status set successfully');
        console.log('API Success, updating state for:', foodBankUserId);
        // Refresh data by updating the food bank in state & removing editData
        setFoodBanks(prev => prev.map(fb => 
          fb.auth0Id === foodBankUserId ? { ...fb, needStatus: result.data.needStatus, editData: undefined, isEditing: false } : fb
        ));
        console.log('Setting editingFoodBankId to null');
        // No longer need editingFoodBankId state
      } else {
        throw new Error(result.message || 'Failed to set status');
      }
    } catch (err) {
      console.error("Error setting food bank status:", err);
      setError(err.message || 'An error occurred while setting the status.');
    }
  };

  const handleAddNewDonation = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setAddDonationError('');

    if (!userData?.auth0Id) {
      setAddDonationError('Cannot add donation: Organizer user ID not found.');
      return;
    }

    // Basic validation (add more as needed)
    if (!newDonationData.itemName || !newDonationData.quantity || !newDonationData.expirationDate || !newDonationData.pickupInfo) {
      setAddDonationError('Please fill out all required donation fields.');
      return;
    }

    try {
      const donationPayload = {
        ...newDonationData,
        userId: userData.auth0Id, // Set organizer as the donor
        // imageUrl and estimatedValue could be added later if needed
      };

      const response = await fetch(`http://localhost:5000/api/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donationPayload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Donation added successfully');
        // Add the new donation to the appropriate state list (assume 'available')
        setDonations(prev => ({
          ...prev,
          available: [result.data, ...prev.available], 
        }));
        setShowAddDonationForm(false); // Hide form
        setNewDonationData({ // Reset form
          itemName: '',
          category: 'other',
          quantity: '',
          expirationDate: '',
          pickupInfo: '',
        }); 
      } else {
        throw new Error(result.message || 'Failed to add donation');
      }
    } catch (err) {
      console.error("Error adding donation:", err);
      setAddDonationError(err.message || 'An error occurred while adding the donation.');
    }
  };

  const handleNewDonationChange = (e) => {
    const { name, value } = e.target;
    setNewDonationData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // --- Edit State Management --- //
  const handleEditClick = (foodBank) => {
    // Store temporary edit data directly on the food bank object in state
    // Set isEditing true for the clicked one, false for others
    setFoodBanks(prev => prev.map(fb => 
      fb.auth0Id === foodBank.auth0Id 
        ? { 
            ...fb, 
            isEditing: true, // Set editing flag
            editData: { 
              priorityLevel: fb.needStatus?.priorityLevel ?? 1, // Use ?? for nullish coalescing
              customMessage: fb.needStatus?.customMessage ?? '', 
            } 
          }
        : { ...fb, isEditing: false } // Ensure others are not editing
    ));
    setError(''); // Clear previous errors
  };

  const handleCancelEdit = () => {
    // Remove temporary editData from the specific food bank object
    setFoodBanks(prev => prev.map(fb => 
      fb.isEditing ? { ...fb, editData: undefined, isEditing: false } : fb
    ));
    setError(''); 
  };

  const handleEditFormChange = (e, foodBankAuth0Id) => {
    const { name, value } = e.target;
    // Update the temporary editData on the specific food bank object
    setFoodBanks(prev => prev.map(fb => 
      // Only update the one currently being edited
      fb.auth0Id === foodBankAuth0Id && fb.isEditing 
        ? {
            ...fb,
            editData: {
              ...fb.editData,
              [name]: name === 'priorityLevel' ? parseInt(value, 10) || 1 : value, // Ensure priority is number, default 1
            }
          }
        : fb
    ));
  };

  const handleAddNewRequest = async (e) => {
    e.preventDefault();
    setAddRequestError('');

    if (!newRequestData.targetFoodBankId) {
      setAddRequestError('Please select a food bank.');
      return;
    }

    try {
      const { targetFoodBankId, priorityLevel, customMessage } = newRequestData;

      const response = await fetch(`http://localhost:5000/api/users/set-need/${targetFoodBankId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requesting-User-Id': userData.auth0Id  
        },
        body: JSON.stringify({ priorityLevel, customMessage }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Food bank request (status) added/updated successfully');
        // Update the specific food bank in the main list
        setFoodBanks(prev => prev.map(fb => 
          fb.auth0Id === targetFoodBankId ? { ...fb, needStatus: result.data.needStatus } : fb
        ));
        setShowAddRequestForm(false); // Hide form
        setNewRequestData({ // Reset form
          targetFoodBankId: '',
          priorityLevel: 3,
          customMessage: '',
        });
      } else {
        throw new Error(result.message || 'Failed to add/update request');
      }
    } catch (err) {
      console.error("Error adding/updating request:", err);
      setAddRequestError(err.message || 'An error occurred while processing the request.');
    }
  };

  const handleNewRequestChange = (e) => {
    const { name, value } = e.target;
    setNewRequestData(prev => ({
      ...prev,
      [name]: name === 'priorityLevel' ? parseInt(value, 10) : value,
    }));
  };

  // --- Render Functions --- //

  const renderDonationTable = (donationList) => {
    if (donationList.length === 0) {
      return <p>No donations in this category.</p>;
    }

    return (
      <table className="data-table organizer-donation-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Donor</th>
            <th>Status</th>
            <th>Date Listed</th>
            <th>Volunteer</th>
            <th>Actions</th>
            {/* Add more columns as needed, e.g., Expiry, Pickup Info */}
          </tr>
        </thead>
        <tbody>
          {donationList.map(donation => {
            // Determine donor name based on account type
            const donorName = donation.userId?.accountType === 'business' 
                              ? donation.userId?.businessName 
                              : donation.userId?.username;
            
            return (
              <tr key={donation._id}>
                {/* Display item name from the items array */}
                <td>{donation.items && donation.items.length > 0 ? donation.items[0].name : donation.itemName || 'N/A'}</td> 
                {/* Display quantity from the items array or default */}
                <td>{donation.items && donation.items.length > 0 ? donation.items[0].quantity : donation.quantity || 'N/A'}</td>
                <td>{donorName || 'N/A'}</td>
                <td>{donation.status}</td>
                <td>{new Date(donation.createdAt).toLocaleDateString()}</td>
                <td>{donation.volunteerId?.username || 'Not Assigned'}</td>
                <td>
                  <button 
                    onClick={() => handleDeleteDonation(donation._id)} 
                    className="action-button delete-button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  if (isLoading) {
    return <div className="dashboard-loading">Loading Organizer Dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  if (userData?.accountType !== 'organizer') {
    return <div className="dashboard-error">Access Denied. This dashboard is for organizers only.</div>;
  }

  return (
    <div className="dashboard-content organizer-dashboard">
      <h1>Organizer Dashboard</h1>
      
      <section className="organizer-section">
        <h2>Food Bank Needs Overview</h2>
        {/* Add Request Button */} 
        <div style={{ marginBottom: '15px' }}> {/* Add some spacing */} 
          <button 
            onClick={() => { setShowAddRequestForm(true); setAddRequestError(''); }} 
            className="action-button add-button"
          >
            + Add Food Bank Request
          </button>
        </div>

        {foodBanks.length === 0 ? (
          <p>No food banks found.</p>
        ) : (
          <>
            {console.log('Checking foodBanks state before mapping:', foodBanks)} {/* DEBUG LOG */}
            <table className="data-table organizer-foodbank-table">
              <thead>
                <tr>
                  <th>Food Bank Name</th>
                  <th>Priority Level</th>
                  <th>Status Message</th>
                  <th>Address</th> 
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {foodBanks.map(fb => {
                  const isEditing = fb.isEditing; // Use the flag directly
                  console.log('Rendering FB:', fb.auth0Id, 'isEditing:', isEditing, 'editData:', fb.editData); // DEBUG LOG
                  // Use editData if editing, otherwise use needStatus
                  const currentPriority = isEditing ? fb.editData?.priorityLevel : fb.needStatus?.priorityLevel;
                  const currentMessage = isEditing ? fb.editData?.customMessage : fb.needStatus?.customMessage;
                  const priorityInfo = getPriorityInfo(currentPriority);
                  
                  return (
                    <tr key={fb.auth0Id}> 
                      <td>{fb.username || fb.businessName || 'Unnamed Food Bank'}</td>
                      <td>
                        {isEditing ? (
                          <select
                            name="priorityLevel"
                            key={`${fb.auth0Id}-priority`}
                            value={currentPriority ?? 1} // Use currentPriority, default 1
                            onChange={(e) => handleEditFormChange(e, fb.auth0Id)} // Pass auth0Id
                            className="inline-edit-input"
                          >
                            {priorityLevels.map(p => (
                              <option key={p.level} value={p.level}>{p.level} - {p.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span 
                            className="priority-badge-inline" 
                            style={{ backgroundColor: priorityInfo.color }}
                          >
                            {priorityInfo.label}
                          </span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input 
                            type="text"
                            name="customMessage"
                            key={`${fb.auth0Id}-message`}
                            value={currentMessage ?? ''} // Use currentMessage, default empty string
                            onChange={(e) => handleEditFormChange(e, fb.auth0Id)} // Pass auth0Id
                            className="inline-edit-input"
                            placeholder="Enter status message"
                          />
                        ) : (
                          currentMessage || 'No specific message'
                        )}
                      </td>
                      <td>{fb.businessAddress || 'No address listed'}</td>
                      <td> {/* Actions Cell */}
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSetFoodBankStatus(fb.auth0Id)} className="action-button save-button">Save</button>
                            <button onClick={handleCancelEdit} className="action-button cancel-button">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEditClick(fb)} className="action-button edit-button">Edit Status</button>
                            <button 
                              onClick={() => handleResetFoodBankRequests(fb.auth0Id)}
                              className="action-button reset-button"
                              title="Reset all need requests for this food bank"
                            >
                              Reset Requests
                            </button>
                            <button 
                              onClick={() => handleDeleteFoodBank(fb.auth0Id)} 
                              className="action-button delete-button"
                              title="Delete this food bank account"
                            >
                              Delete Food Bank
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* Add Request Modal */} 
      {showAddRequestForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleAddNewRequest} className="modal-form">
              <h3>Add Food Bank Request</h3>
              <button type="button" className="modal-close-button" onClick={() => setShowAddRequestForm(false)}>&times;</button>
              {addRequestError && <p className="error-message">{addRequestError}</p>}

              <div className="form-group">
                <label>Select Food Bank*</label>
                <select name="targetFoodBankId" value={newRequestData.targetFoodBankId} onChange={handleNewRequestChange} required>
                  <option value="" disabled>-- Select a Food Bank --</option>
                  {foodBanks.map(fb => (
                    <option key={fb.auth0Id} value={fb.auth0Id}>
                      {fb.username || fb.businessName || fb.auth0Id} 
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority Level*</label>
                  <select name="priorityLevel" value={newRequestData.priorityLevel} onChange={handleNewRequestChange} required>
                    {priorityLevels.map(p => (
                      <option key={p.level} value={p.level}>{p.level} - {p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Request Details / Status Message*</label>
                <textarea name="customMessage" value={newRequestData.customMessage} onChange={handleNewRequestChange} required></textarea>
              </div>

              <div className="form-actions">
                <button type="submit" className="action-button save-button">Set Request/Status</button>
                <button type="button" onClick={() => setShowAddRequestForm(false)} className="action-button cancel-button">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="organizer-section">
        <h2>Donation Overview</h2>
        <div className="donation-tabs">
          <button 
            className={activeDonationTab === 'available' ? 'active' : ''}
            onClick={() => setActiveDonationTab('available')}
          >
            Available ({donations.available.length})
          </button>
          <button 
            className={activeDonationTab === 'scheduled' ? 'active' : ''}
            onClick={() => setActiveDonationTab('scheduled')}
          >
            Scheduled ({donations.scheduled.length})
          </button>
          <button 
            className={activeDonationTab === 'completed' ? 'active' : ''}
            onClick={() => setActiveDonationTab('completed')}
          >
            Completed ({donations.completed.length})
          </button>
        </div>
        
        {/* Add Donation Button */} 
        <div style={{ marginBottom: '15px' }}> 
          <button 
            onClick={() => { setShowAddDonationForm(true); setAddDonationError(''); }}
            className="action-button add-button"
          >
            + Add New Donation
          </button>
        </div>

        <div className="donation-tab-content">
          {activeDonationTab === 'available' && renderDonationTable(donations.available)}
          {activeDonationTab === 'scheduled' && renderDonationTable(donations.scheduled)}
          {activeDonationTab === 'completed' && renderDonationTable(donations.completed)}
        </div>
      </section>

      {/* Add Donation Modal */} 
      {showAddDonationForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleAddNewDonation} className="modal-form">
              <h3>Add New Donation</h3>
              <button type="button" className="modal-close-button" onClick={() => setShowAddDonationForm(false)}>&times;</button>
              {addDonationError && <p className="error-message">{addDonationError}</p>}
              
              {/* Form content remains the same */} 
              <div className="form-row">
                <div className="form-group">
                  <label>Item Name*</label>
                  <input type="text" name="itemName" value={newDonationData.itemName} onChange={handleNewDonationChange} required />
                </div>
                <div className="form-group">
                  <label>Quantity*</label>
                  <input type="text" name="quantity" value={newDonationData.quantity} onChange={handleNewDonationChange} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category*</label>
                  <select name="category" value={newDonationData.category} onChange={handleNewDonationChange} required>
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
                <div className="form-group">
                  <label>Expiration Date*</label>
                  <input type="date" name="expirationDate" value={newDonationData.expirationDate} onChange={handleNewDonationChange} required />
                </div>
              </div>

              <div className="form-group">
                <label>Pickup Information*</label>
                <textarea name="pickupInfo" value={newDonationData.pickupInfo} onChange={handleNewDonationChange} required></textarea>
              </div>

              <div className="form-actions">
                <button type="submit" className="action-button save-button">Add Donation</button>
                <button type="button" onClick={() => setShowAddDonationForm(false)} className="action-button cancel-button">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;

// Basic CSS for OrganizerDashboard (add to OrganizerDashboard.css)
/*
.organizer-dashboard {
  padding: 20px;
}

.organizer-section {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.organizer-section h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.data-table.organizer-foodbank-table,
.data-table.organizer-donation-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  text-align: left;
  padding: 12px 15px;
  border-bottom: 1px solid #ddd;
}

.data-table th {
  background-color: #f8f8f8;
  font-weight: bold;
  color: #555;
}

.priority-badge-inline {
  padding: 4px 8px;
  border-radius: 12px;
  color: white;
  font-size: 0.9em;
  display: inline-block;
}

.donation-tabs {
  margin-bottom: 20px;
  border-bottom: 1px solid #ccc;
}

.donation-tabs button {
  background: none;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 1em;
  margin-right: 5px;
  border-bottom: 3px solid transparent;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.donation-tabs button:hover {
  color: #007bff;
}

.donation-tabs button.active {
  border-bottom-color: #007bff;
  color: #007bff;
  font-weight: bold;
}

.donation-tab-content {
  margin-top: 20px;
}

*/ 