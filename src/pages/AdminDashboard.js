import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../App'; // To check if current user is organizer
import '../assets/styles/Dashboard.css'; // Reuse general dashboard styles
import '../assets/styles/OrganizerDashboard.css'; // <<< ADD ORGANIZER STYLES
// import '../assets/styles/AdminDashboard.css'; // Optional: Create specific styles

// <<< Import other dashboard components HERE >>>
import IndividualDashboard from './IndividualDashboard';
import SupplierDashboard from './SupplierDashboard'; 
import FoodBankDashboard from './FoodBankDashboard';
import VolunteerDashboard from './VolunteerDashboard';
// <<< END OF IMPORT OTHER DASHBOARD COMPONENTS >>>

// <<< ADD PRIORITY LEVELS (copied from OrganizerDashboard) >>>
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
// <<< END OF ADDED PRIORITY LEVELS >>>

// <<< ADD STATE FOR FOOD BANKS AND DONATIONS >>>
// const [foodBanks, setFoodBanks] = useState([]);
// const [donations, setDonations] = useState({ available: [], scheduled: [], completed: [] });
// const [activeDonationTab, setActiveDonationTab] = useState('available');
// <<< END OF ADDED STATE >>>
// const [isLoading, setIsLoading] = useState(true);
// const [error, setError] = useState('');
// const [userTypeChanges, setUserTypeChanges] = useState({}); // { userId: newType }

// Possible account types (could be fetched or defined statically)
// const accountTypes = ['individual', 'business', 'distributor', 'volunteer', 'organizer'];

// <<< ADD STATE FOR MODALS AND FORMS (copied/adapted from OrganizerDashboard) >>>
// const [showAddDonationForm, setShowAddDonationForm] = useState(false);
// const [newDonationData, setNewDonationData] = useState({
//   itemName: '',
//   category: 'other',
//   quantity: '',
//   expirationDate: '',
//   pickupInfo: '',
// });
// const [addDonationError, setAddDonationError] = useState('');

// Note: Adding food bank requests might be less relevant for admin, but including for completeness
// const [showAddRequestForm, setShowAddRequestForm] = useState(false);
// const [newRequestData, setNewRequestData] = useState({
//   targetFoodBankId: '',
//   priorityLevel: 3,  
//   customMessage: '',
// });
// const [addRequestError, setAddRequestError] = useState('');
// <<< END OF ADDED STATE >>>

// <<< ADD STATE FOR DASHBOARD PREVIEW >>>
// const [previewDashboardType, setPreviewDashboardType] = useState(null); // e.g., 'individual', 'business'

// <<< MOVE COMPONENT DEFINITION HERE >>>
const AdminDashboard = () => {
  // <<< UNCOMMENT hooks and state setters inside the component >>>
  const { userData } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [foodBanks, setFoodBanks] = useState([]);
  const [donations, setDonations] = useState({ available: [], scheduled: [], completed: [] });
  const [activeDonationTab, setActiveDonationTab] = useState('available');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userTypeChanges, setUserTypeChanges] = useState({});
  const accountTypes = ['individual', 'business', 'distributor', 'volunteer', 'organizer'];
  const [showAddDonationForm, setShowAddDonationForm] = useState(false);
  const [newDonationData, setNewDonationData] = useState({
    itemName: '',
    category: 'other',
    quantity: '',
    expirationDate: '',
    pickupInfo: '',
  });
  const [addDonationError, setAddDonationError] = useState('');
  const [showAddRequestForm, setShowAddRequestForm] = useState(false);
  const [newRequestData, setNewRequestData] = useState({
    targetFoodBankId: '',
    priorityLevel: 3,  
    customMessage: '',
  });
  const [addRequestError, setAddRequestError] = useState('');
  const [previewDashboardType, setPreviewDashboardType] = useState(null);
  const [adminRefreshTrigger, setAdminRefreshTrigger] = useState(0);

  // --- Fetch Initial Data (Users, Food Banks, Donations) ---
  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      setError('');
      try {
        // Fetch all users (for general management)
        // TODO: Add authorization headers if backend requires them
        const usersResponse = await fetch('http://localhost:5000/api/users', {
          headers: {
            'X-Requesting-User-Id': userData.auth0Id
          }
        });
        if (!usersResponse.ok) throw new Error(`HTTP error fetching users! status: ${usersResponse.status}`);
        const usersResult = await usersResponse.json();
        if (usersResult.success) {
          setUsers(usersResult.data || []);
        } else {
          throw new Error(usersResult.message || 'Failed to fetch users');
        }

        // Fetch organizer data (food banks with needs, donations)
        // TODO: Add authorization headers if backend requires them
        const organizerResponse = await fetch('http://localhost:5000/api/organizer/dashboard', {
          // Assuming this might also need protection
          // headers: { 'X-Requesting-User-Id': userData.auth0Id }
        });
        if (!organizerResponse.ok) throw new Error(`HTTP error fetching organizer data! status: ${organizerResponse.status}`);
        const organizerResult = await organizerResponse.json();
        if (organizerResult.success) {
          setFoodBanks(organizerResult.data.foodBanks || []);
          setDonations(organizerResult.data.donations || { available: [], scheduled: [], completed: [] });
        } else {
          throw new Error(organizerResult.message || 'Failed to fetch organizer data');
        }

      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError(err.message || 'An error occurred while fetching data.');
      } finally {
        setIsLoading(false);
      }
    };

    if (userData?.accountType === 'organizer') {
      fetchAdminData();
    } else {
      setError('Access Denied. You do not have permission to view this page.');
      setIsLoading(false);
    }
  }, [userData, adminRefreshTrigger]);

  // --- Action Handlers ---

  const handleDeleteUser = async (userIdToDelete) => {
    // Prevent organizer from deleting themselves (optional safeguard)
    if (userIdToDelete === userData?.auth0Id) {
       alert("You cannot delete your own account from the admin panel.");
       return;
    }

    if (!window.confirm('Are you sure you want to DELETE this user account? This action cannot be undone.')) {
      return;
    }
    try {
      setError('');
      // TODO: Add authorization headers if backend requires them
      const response = await fetch(`http://localhost:5000/api/users/${userIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'X-Requesting-User-Id': userData.auth0Id
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('User deleted successfully');
        // Refresh user list
        setUsers(prev => prev.filter(u => u.auth0Id !== userIdToDelete));
        // Refresh food bank list if the deleted user was a food bank
        setFoodBanks(prev => prev.filter(fb => fb.auth0Id !== userIdToDelete));
      } else {
        throw new Error(result.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(err.message || 'An error occurred while deleting the user.');
    }
  };

  const handleResetRequests = async (userIdToReset) => {
    if (!window.confirm('Are you sure you want to RESET requests for this food bank?')) {
      return;
    }
    try {
      setError('');
      // TODO: Add authorization headers if backend requires them
      const response = await fetch(`http://localhost:5000/api/users/reset-requests/${userIdToReset}`, {
        method: 'PUT',
        headers: {
          'X-Requesting-User-Id': userData.auth0Id
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Requests reset successfully');
        // Refresh user list by updating the specific user's status
        setUsers(prev => prev.map(u =>
          u.auth0Id === userIdToReset ? { ...u, needStatus: result.data.needStatus } : u
        ));
        // ALSO update in the foodBanks list if they are/were a distributor
        setFoodBanks(prev => prev.map(fb =>
          fb.auth0Id === userIdToReset ? { ...fb, needStatus: result.data.needStatus } : fb
        ));
      } else {
        throw new Error(result.message || 'Failed to reset requests');
      }
    } catch (err) {
      console.error("Error resetting requests:", err);
      setError(err.message || 'An error occurred while resetting requests.');
    }
  };

  const handleChangeAccountType = async (userIdToChange, newType) => {
    if (!newType) {
      alert('Please select a new account type.');
      return;
    }

    // Optional: Confirm before changing
    if (!window.confirm(`Are you sure you want to change this user's account type to ${formatAccountType(newType)}?`)) {
      return;
    }

    try {
      setError('');
      // TODO: Add authorization headers if backend requires them
      const response = await fetch(`http://localhost:5000/api/users/change-type/${userIdToChange}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requesting-User-Id': userData.auth0Id
        },
        body: JSON.stringify({ newAccountType: newType }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Account type changed successfully');
        // Update the user in the main user list
        setUsers(prevUsers => prevUsers.map(u =>
          u.auth0Id === userIdToChange ? { ...u, ...result.data } : u // Use result.data for full update
        ));
        // ALSO update in the foodBanks list if they are/were a distributor
        setFoodBanks(prevFbs => prevFbs.map(fb => 
             fb.auth0Id === userIdToChange ? { ...fb, ...result.data } : fb
        ));
        // Remove from food bank list if type changed FROM distributor
        if (result.data.accountType !== 'distributor') {
             setFoodBanks(prevFbs => prevFbs.filter(fb => fb.auth0Id !== userIdToChange));
        }
        // Add to food bank list if type changed TO distributor (may need refetch for full data)
        else if (!foodBanks.some(fb => fb.auth0Id === userIdToChange)) {
             // Simplest is to refetch, or push result.data if it contains all needed fields
             setFoodBanks(prevFbs => [...prevFbs, result.data]); 
        }
        setUserTypeChanges(prev => {
          const newState = { ...prev };
          delete newState[userIdToChange];
          return newState;
        });
      } else {
        throw new Error(result.message || 'Failed to change account type');
      }
    } catch (err) {
      console.error("Error changing account type:", err);
      setError(err.message || 'An error occurred while changing the account type.');
    }
  };

  // Handler for the select dropdown change
  const handleTypeSelectionChange = (userId, selectedType) => {
    setUserTypeChanges(prev => ({
      ...prev,
      [userId]: selectedType,
    }));
  };

  // --- Helper to format account type ---
  const formatAccountType = (type) => {
    const types = {
      individual: "Individual",
      business: "Business",
      distributor: "Food Bank",
      volunteer: "Volunteer",
      organizer: "Organizer"
    };
    return types[type] || type;
  };

  // Food Bank Need/Request Handlers (Copied/adapted from OrganizerDashboard)
  const handleEditClick = (foodBank) => {
    setFoodBanks(prev => prev.map(fb =>
      fb.auth0Id === foodBank.auth0Id
        ? { ...fb, isEditing: true, editData: { priorityLevel: fb.needStatus?.priorityLevel ?? 1, customMessage: fb.needStatus?.customMessage ?? '' } }
        : { ...fb, isEditing: false }
    ));
    setError('');
  };

  const handleCancelEdit = () => {
    setFoodBanks(prev => prev.map(fb =>
      fb.isEditing ? { ...fb, editData: undefined, isEditing: false } : fb
    ));
    setError('');
  };

  const handleEditFormChange = (e, foodBankAuth0Id) => {
    const { name, value } = e.target;
    setFoodBanks(prev => prev.map(fb =>
      fb.auth0Id === foodBankAuth0Id && fb.isEditing
        ? { ...fb, editData: { ...fb.editData, [name]: name === 'priorityLevel' ? parseInt(value, 10) || 1 : value } }
        : fb
    ));
  };

  const handleSetFoodBankStatus = async (foodBankUserId) => {
    const foodBankToSave = foodBanks.find(fb => fb.auth0Id === foodBankUserId && fb.isEditing);
    if (!foodBankToSave || !foodBankToSave.editData) {
      setError('Could not find edit data.');
      return;
    }
    const { priorityLevel, customMessage } = foodBankToSave.editData;
    try {
      setError('');
      // Uses the set-need endpoint, already present in user routes
      const response = await fetch(`http://localhost:5000/api/users/set-need/${foodBankUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requesting-User-Id': userData.auth0Id
        },
        body: JSON.stringify({ priorityLevel, customMessage }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setFoodBanks(prev => prev.map(fb =>
          fb.auth0Id === foodBankUserId ? { ...fb, needStatus: result.data.needStatus, editData: undefined, isEditing: false } : fb
        ));
      } else {
        throw new Error(result.message || 'Failed to set status');
      }
    } catch (err) {
      console.error("Error setting food bank status:", err);
      setError(err.message || 'An error occurred while setting status.');
    }
  };

  // Handler for adding a NEW food bank request (less common for admin?)
  const handleAddNewRequest = async (e) => {
      e.preventDefault();
      setAddRequestError('');
      if (!newRequestData.targetFoodBankId) {
          setAddRequestError('Please select a food bank.');
          return;
      }
      try {
          const { targetFoodBankId, priorityLevel, customMessage } = newRequestData;
          // Uses the set-need endpoint
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
              setFoodBanks(prev => prev.map(fb =>
                  fb.auth0Id === targetFoodBankId ? { ...fb, needStatus: result.data.needStatus } : fb
              ));
              setShowAddRequestForm(false);
              setNewRequestData({ targetFoodBankId: '', priorityLevel: 3, customMessage: '' });
          } else {
              throw new Error(result.message || 'Failed to add/update request');
          }
      } catch (err) {
          console.error("Error adding/updating request:", err);
          setAddRequestError(err.message || 'An error occurred while processing request.');
      }
  };

  const handleNewRequestChange = (e) => {
      const { name, value } = e.target;
      setNewRequestData(prev => ({
          ...prev,
          [name]: name === 'priorityLevel' ? parseInt(value, 10) : value,
      }));
  };

  // Donation Handlers (Copied/adapted from OrganizerDashboard)
  const handleDeleteDonation = async (donationId) => {
    if (!window.confirm('Are you sure you want to delete this donation?')) return;
    try {
      setError('');
      const response = await fetch(`http://localhost:5000/api/donations/${donationId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (response.ok && result.success) {
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
      setError(err.message || 'An error occurred while deleting donation.');
    }
  };

  const handleAddNewDonation = async (e) => {
    e.preventDefault();
    setAddDonationError('');
    if (!userData?.auth0Id) {
      setAddDonationError('Cannot add donation: Admin user ID not found.');
      return;
    }
    if (!newDonationData.itemName || !newDonationData.quantity || !newDonationData.expirationDate || !newDonationData.pickupInfo) {
      setAddDonationError('Please fill out all required donation fields.');
      return;
    }
    try {
      const donationPayload = {
        ...newDonationData,
        userId: userData.auth0Id, // Admin listed as the donor?
      };
      const response = await fetch(`http://localhost:5000/api/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donationPayload),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setDonations(prev => ({ ...prev, available: [result.data, ...prev.available] }));
        setShowAddDonationForm(false);
        setNewDonationData({ itemName: '', category: 'other', quantity: '', expirationDate: '', pickupInfo: '' });
        // <<< TRIGGER REFRESH AFTER ADDING DONATION >>>
        setAdminRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(result.message || 'Failed to add donation');
      }
    } catch (err) {
      console.error("Error adding donation:", err);
      setAddDonationError(err.message || 'An error occurred while adding donation.');
    }
  };

  const handleNewDonationChange = (e) => {
    const { name, value } = e.target;
    setNewDonationData(prev => ({ ...prev, [name]: value }));
  };

  // <<< ADD RENDER FUNCTION FOR DONATION TABLE (copied from OrganizerDashboard) >>>
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
          </tr>
        </thead>
        <tbody>
          {donationList.map(donation => {
            const donorName = donation.userId?.accountType === 'business' 
                              ? donation.userId?.businessName 
                              : donation.userId?.username;
            return (
              <tr key={donation._id}>
                <td>{donation.itemName}</td>
                <td>{donation.quantity}</td>
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
  // <<< END OF ADDED RENDER FUNCTION >>>

  // <<< RESTORE RENDER FUNCTION (was renderPreviewDashboard) >>>
  const renderRoleView = () => {
    const previewUserData = { 
      ...userData,
      accountType: previewDashboardType 
    };
    const commonProps = {
      allDonations: donations, 
      allFoodBanks: foodBanks,
      // <<< Add isAdminView prop >>>
      isAdminView: true 
    };
    const wrapInPreviewContext = (Component) => (
      <UserContext.Provider value={{ userData: previewUserData }}>
        <Component {...commonProps} />
      </UserContext.Provider>
    );
    switch (previewDashboardType) {
      case 'individual':
        return wrapInPreviewContext(IndividualDashboard);
      case 'business':
        return wrapInPreviewContext(SupplierDashboard);
      case 'distributor':
        return wrapInPreviewContext(FoodBankDashboard);
      case 'volunteer':
        return wrapInPreviewContext(VolunteerDashboard);
      default:
        return null; 
    }
  };

  // --- Render Logic ---

  if (isLoading) {
    return <div className="dashboard-loading">Loading Admin Dashboard...</div>;
  }

  // Handle access denied case based on initial check
  if (error && error.startsWith('Access Denied')) {
     return <div className="dashboard-error">{error}</div>;
  }

  // Handle other errors
  if (error) {
     // Optionally display error prominently or allow retrying
     // For now, just showing it above the potentially empty table
     console.error("Admin Dashboard Error:", error);
  }

  // Ensure user is an organizer before rendering the main content
  if (userData?.accountType !== 'organizer') {
     // This case should theoretically be caught by the loading/error state,
     // but it's a fallback.
     return <div className="dashboard-error">Access Denied. Organizers only.</div>;
  }

  return (
    <div className="dashboard-content admin-dashboard">
      <h1>Admin Dashboard</h1>

      {/* Dashboard Role View Selector */}
      <div className="preview-selector" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <label htmlFor="previewType" style={{ marginRight: '10px', fontWeight: 'bold' }}>View Dashboard As:</label>
        <select 
          id="previewType"
          value={previewDashboardType || 'admin'} 
          onChange={(e) => setPreviewDashboardType(e.target.value === 'admin' ? null : e.target.value)}
        >
          <option value="admin">Admin View (Default)</option>
          <option value="business">Business/Supplier</option>
          <option value="distributor">Food Bank/Distributor</option>
          <option value="volunteer">Volunteer</option>
          <option value="individual">Individual</option>
        </select>
        {previewDashboardType && (
          <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
            Displaying {formatAccountType(previewDashboardType)} dashboard layout using Admin data context.
          </p>
        )}
      </div>

      {error && <div className="dashboard-error" style={{ marginBottom: '15px' }}>Error: {error}</div>}

      {/* --- RESTORE CONDITIONAL RENDERING: ROLE VIEW OR ADMIN VIEW --- */} 
      {previewDashboardType ? (
         renderRoleView() // Render the selected role view
      ) : (
        <> {/* Render the standard Admin sections */} 
          <section className="admin-section"> 
            <h2>All Users Management</h2>
            {users.length === 0 && !isLoading ? (
              <p>No users found.</p>
            ) : (
              <table className="data-table admin-user-table"> {/* Add specific class */}
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Account Type</th>
                    <th>Business Name</th>
                    <th>Business Address</th>
                    <th>Auth0 ID</th> {/* Good for debugging */}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    // <<< GET THE SELECTED NEW TYPE FOR THIS USER (IF ANY) >>>
                    const selectedNewType = userTypeChanges[user.auth0Id] || '';
                    
                    return (
                      <tr key={user.auth0Id}>
                        <td>{user.username}</td>
                        <td>{formatAccountType(user.accountType)}</td>
                        <td>{user.accountType === 'business' ? user.businessName : 'N/A'}</td>
                        <td>{user.accountType === 'business' ? user.businessAddress : 'N/A'}</td>
                         <td>{user.auth0Id}</td>
                        <td className="action-cell"> {/* Added class for potential styling */}
                          {/* Change Type Dropdown and Button */}
                          <div className="change-type-controls" style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <select 
                              value={selectedNewType} 
                              onChange={(e) => handleTypeSelectionChange(user.auth0Id, e.target.value)}
                              disabled={user.auth0Id === userData?.auth0Id} // Disable changing own type
                              style={{ marginRight: '5px' }}
                            >
                              <option value="" disabled>Change to...</option>
                              {accountTypes
                                .filter(type => type !== user.accountType) // Don't show current type
                                .map(type => (
                                  <option key={type} value={type}>{formatAccountType(type)}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleChangeAccountType(user.auth0Id, selectedNewType)}
                              className="action-button save-button" // Use save style maybe?
                              disabled={!selectedNewType || user.auth0Id === userData?.auth0Id}
                              title="Apply account type change"
                            >
                              Change
                            </button>
                          </div>

                          {/* General Delete Button */}
                          <div className="other-actions" style={{ marginTop: '5px' }}>
                             <button
                               onClick={() => handleDeleteUser(user.auth0Id)}
                               className="action-button delete-button"
                               title="Delete this user account"
                               disabled={user.auth0Id === userData?.auth0Id}
                             >
                               Delete User
                             </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section className="organizer-section"> 
            <h2>Food Bank Needs Overview</h2>
            <div style={{ marginBottom: '15px' }}> 
              <button 
                onClick={() => { setShowAddRequestForm(true); setAddRequestError(''); }} 
                className="action-button add-button"
              >
                + Set Food Bank Request/Status
              </button>
            </div>
            {foodBanks.length === 0 ? (
              <p>No food banks found.</p>
            ) : (
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
                    const isEditing = fb.isEditing;
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
                              value={currentPriority ?? 1}
                              onChange={(e) => handleEditFormChange(e, fb.auth0Id)}
                              className="inline-edit-input"
                            >
                              {priorityLevels.map(p => (
                                <option key={p.level} value={p.level}>{p.level} - {p.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="priority-badge-inline" style={{ backgroundColor: priorityInfo.color }}>
                              {priorityInfo.label}
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input 
                              type="text"
                              name="customMessage"
                              value={currentMessage ?? ''}
                              onChange={(e) => handleEditFormChange(e, fb.auth0Id)}
                              className="inline-edit-input"
                              placeholder="Enter status message"
                            />
                          ) : (
                            currentMessage || 'No specific message'
                          )}
                        </td>
                        <td>{fb.businessAddress || 'No address listed'}</td>
                        <td> 
                          {isEditing ? (
                            <>
                              <button onClick={() => handleSetFoodBankStatus(fb.auth0Id)} className="action-button save-button">Save</button>
                              <button onClick={handleCancelEdit} className="action-button cancel-button">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEditClick(fb)} className="action-button edit-button">Edit Status</button>
                              <button 
                                onClick={() => handleResetRequests(fb.auth0Id)} 
                                className="action-button reset-button"
                                title="Reset all need requests for this food bank"
                              >
                                Reset Requests
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section className="organizer-section">
            <h2>Donation Overview</h2>
            <div className="donation-tabs">
              <button className={activeDonationTab === 'available' ? 'active' : ''} onClick={() => setActiveDonationTab('available')}>Available ({donations.available.length})</button>
              <button className={activeDonationTab === 'scheduled' ? 'active' : ''} onClick={() => setActiveDonationTab('scheduled')}>Scheduled ({donations.scheduled.length})</button>
              <button className={activeDonationTab === 'completed' ? 'active' : ''} onClick={() => setActiveDonationTab('completed')}>Completed ({donations.completed.length})</button>
            </div>
            <div style={{ marginBottom: '15px' }}> 
              <button onClick={() => { setShowAddDonationForm(true); setAddDonationError(''); }} className="action-button add-button">+ Add New Donation</button>
            </div>
            <div className="donation-tab-content">
              {activeDonationTab === 'available' && renderDonationTable(donations.available)}
              {activeDonationTab === 'scheduled' && renderDonationTable(donations.scheduled)}
              {activeDonationTab === 'completed' && renderDonationTable(donations.completed)}
            </div>
          </section>

          {/* Modals remain accessible */} 
          {showAddRequestForm && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <form onSubmit={handleAddNewRequest} className="modal-form">
                    <h3>Set Food Bank Request/Status</h3>
                    <button type="button" className="modal-close-button" onClick={() => setShowAddRequestForm(false)}>&times;</button>
                    {addRequestError && <p className="error-message">{addRequestError}</p>}
                    <div className="form-group">
                      <label>Select Food Bank*</label>
                      <select name="targetFoodBankId" value={newRequestData.targetFoodBankId} onChange={handleNewRequestChange} required>
                        <option value="" disabled>-- Select a Food Bank --</option>
                        {foodBanks.map(fb => (
                          <option key={fb.auth0Id} value={fb.auth0Id}>{fb.username || fb.businessName || fb.auth0Id}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                       <div className="form-group">
                          <label>Priority Level*</label>
                          <select name="priorityLevel" value={newRequestData.priorityLevel} onChange={handleNewRequestChange} required>
                             {priorityLevels.map(p => (<option key={p.level} value={p.level}>{p.level} - {p.label}</option>))}
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

          {showAddDonationForm && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <form onSubmit={handleAddNewDonation} className="modal-form">
                    <h3>Add New Donation (as Admin)</h3>
                    <button type="button" className="modal-close-button" onClick={() => setShowAddDonationForm(false)}>&times;</button>
                    {addDonationError && <p className="error-message">{addDonationError}</p>}
                    {/* Form content copied from OrganizerDashboard */}
                    <div className="form-row">
                       <div className="form-group"><label>Item Name*</label><input type="text" name="itemName" value={newDonationData.itemName} onChange={handleNewDonationChange} required /></div>
                       <div className="form-group"><label>Quantity*</label><input type="text" name="quantity" value={newDonationData.quantity} onChange={handleNewDonationChange} required /></div>
                    </div>
                    <div className="form-row">
                       <div className="form-group"><label>Category*</label><select name="category" value={newDonationData.category} onChange={handleNewDonationChange} required><option value="produce">Produce</option><option value="bakery">Bakery</option><option value="dairy">Dairy</option><option value="meat">Meat</option><option value="canned">Canned Goods</option><option value="dry">Dry Goods</option><option value="frozen">Frozen</option><option value="prepared">Prepared Meals</option><option value="other">Other</option></select></div>
                       <div className="form-group"><label>Expiration Date*</label><input type="date" name="expirationDate" value={newDonationData.expirationDate} onChange={handleNewDonationChange} required /></div>
                    </div>
                    <div className="form-group"><label>Pickup Information*</label><textarea name="pickupInfo" value={newDonationData.pickupInfo} onChange={handleNewDonationChange} required></textarea></div>
                    <div className="form-actions"><button type="submit" className="action-button save-button">Add Donation</button><button type="button" onClick={() => setShowAddDonationForm(false)} className="action-button cancel-button">Cancel</button></div>
                  </form>
                </div>
              </div>
          )}
        </>
      )}
      {/* --- END OF CONDITIONAL RENDERING --- */}

    </div>
  );
};

export default AdminDashboard; 