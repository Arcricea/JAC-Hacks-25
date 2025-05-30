import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../App'; // To check if current user is organizer
import '../assets/styles/Dashboard.css'; // Reuse general dashboard styles
import '../assets/styles/OrganizerDashboard.css'; // <<< ADD ORGANIZER STYLES
import '../assets/styles/FoodBankDashboard.css'; // <<< ADD FOOD BANK STYLES FOR PREVIEW
// import '../assets/styles/AdminDashboard.css'; // Optional: Create specific styles

// Import the new editable components
import EditableNeedStatus from '../components/EditableNeedStatus';
import EditableContactField from '../components/EditableContactField'; 

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
  // Rename foodBanks state to avoid confusion, it holds data from organizer endpoint
  const [distributorData, setDistributorData] = useState([]); 
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
    targetUserId: '',
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

  // Callback function for preview components to update parent state
  const handlePreviewDataUpdate = (updatedUserData) => {
    if (!updatedUserData || !updatedUserData.auth0Id) return;

    console.log("AdminDashboard: Updating previewed user data", updatedUserData.auth0Id);
    // Update the main users list
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u.auth0Id === updatedUserData.auth0Id ? { ...u, ...updatedUserData } : u
      )
    );
    // Update the distributorData list (if the user is a distributor)
    // Note: This assumes handlePreviewDataUpdate is only called for distributors from FoodBankDashboard
    // If other previews call it, this logic might need refinement.
    if (updatedUserData.accountType === 'distributor') {
        setDistributorData(prevDists => 
          prevDists.map(d => 
             d.auth0Id === updatedUserData.auth0Id ? { ...d, ...updatedUserData } : d
          )
        );
    } 
    // We don't need to filter here as the main `users` list is the source of truth
  };

  // <<< ADD FILTERED LIST OF BUSINESS USERS >>>
  const businessUsers = React.useMemo(() => {
    return users.filter(user => user.accountType === 'business');
  }, [users]);
  // <<< END FILTERED LIST >>>

  // <<< DERIVED LIST of Distributors and Organizers for the table >>>
  const managedAccounts = React.useMemo(() => {
    // Combine distributors and organizers from the main users list
    return users.filter(user => user.accountType === 'distributor' || user.accountType === 'organizer')
                .map(user => {
                  // Check if this user exists in distributorData to merge potential edit state
                  const distributorState = distributorData.find(d => d.auth0Id === user.auth0Id);
                  return {
                      ...user, // Base data from the users list
                      ...(distributorState && { // Add edit state if present
                          isEditing: distributorState.isEditing,
                          editData: distributorState.editData
                      })
                  };
                });
  }, [users, distributorData]);
  // <<< END DERIVED LIST >>>

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
          headers: { 'X-Requesting-User-Id': userData.auth0Id }
        });
        if (!organizerResponse.ok) throw new Error(`HTTP error fetching organizer data! status: ${organizerResponse.status}`);
        const organizerResult = await organizerResponse.json();
        if (organizerResult.success) {
          // Store the fetched distributor-specific data separately
          setDistributorData(organizerResult.data.foodBanks || []); 
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
        // Refresh food bank list if the deleted user was a food bank (distributor or organizer)
        // No need to update distributorData state, as derived list uses `users`
        // setDistributorData(prev => prev.filter(fb => fb.auth0Id !== userIdToDelete));
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
        // No need to update distributorData state
        /* setDistributorData(prevFbs => prevFbs.map(fb =>
          fb.auth0Id === userIdToReset ? { ...fb, needStatus: result.data.needStatus } : fb
        )); */
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
        // No need to update distributorData state
        /* setDistributorData(prevFbs => prevFbs.map(fb => 
             fb.auth0Id === userIdToChange ? { ...fb, ...result.data } : fb
        )); */
        // Remove from food bank list if type changed FROM distributor
        // No need to update distributorData state
        /* if (result.data.accountType !== 'distributor') {
             setDistributorData(prevFbs => prevFbs.filter(fb => fb.auth0Id !== userIdToChange));
        } */
        // Add to food bank list if type changed TO distributor (may need refetch for full data)
        // No need to update distributorData state
        /* else if (!distributorData.some(fb => fb.auth0Id === userIdToChange)) {
             setDistributorData(prevFbs => [...prevFbs, result.data]); 
        } */
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
  const handleEditClick = (account) => {
    // Update the edit state for the specific account in the distributorData list
    // We need a way to track edits separately or merge into the main user list state?
    // For simplicity, let's update the `distributorData` state, which gets merged into `managedAccounts`
    setDistributorData(prevDists => prevDists.map(d =>
      d.auth0Id === account.auth0Id
        ? { ...d, isEditing: true, editData: { priorityLevel: account.needStatus?.priorityLevel ?? 1, customMessage: account.needStatus?.customMessage ?? '' } }
        : { ...d, isEditing: false } // Ensure only one is edited
    ));
    // Also add a temporary flag to the main user object? Or rely on managedAccounts merge?
    // Let's rely on the merge in managedAccounts for now.
    setError('');
  };

  const handleCancelEdit = () => {
    // Clear edit state from distributorData
    setDistributorData(prevDists => prevDists.map(d =>
      d.isEditing ? { ...d, editData: undefined, isEditing: false } : d
    ));
    setError('');
  };

  const handleEditFormChange = (e, accountAuth0Id) => {
    const { name, value } = e.target;
    // Update editData within the distributorData state
    setDistributorData(prevDists => prevDists.map(d =>
      d.auth0Id === accountAuth0Id && d.isEditing
        ? { ...d, editData: { ...d.editData, [name]: name === 'priorityLevel' ? parseInt(value, 10) || 1 : value } }
        : d
    ));
  };

  const handleSetFoodBankStatus = async (accountUserId) => {
    // Find the edited data in the distributorData state
    const accountToSave = distributorData.find(d => d.auth0Id === accountUserId && d.isEditing);
    if (!accountToSave || !accountToSave.editData) {
      setError('Could not find edit data. Ensure the account exists in distributorData.');
      return;
    }
    const { priorityLevel, customMessage } = accountToSave.editData;
    try {
      setError('');
      const response = await fetch(`http://localhost:5000/api/users/set-need/${accountUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requesting-User-Id': userData.auth0Id
        },
        body: JSON.stringify({ priorityLevel, customMessage }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        // Update the main users list first
        setUsers(prevUsers => prevUsers.map(u => 
            u.auth0Id === accountUserId ? { ...u, needStatus: result.data.needStatus } : u
        ));
        // Clear the editing state from distributorData
        setDistributorData(prevDists => prevDists.map(d => 
            d.auth0Id === accountUserId ? { ...d, needStatus: result.data.needStatus, editData: undefined, isEditing: false } : d
        ));
        // managedAccounts will automatically update due to dependency on users & distributorData
      } else {
        throw new Error(result.message || 'Failed to set status');
      }
    } catch (err) {
      console.error("Error setting account status:", err);
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
              // Update main users list
              setUsers(prevUsers => prevUsers.map(u => 
                  u.auth0Id === targetFoodBankId ? { ...u, needStatus: result.data.needStatus } : u
              ));
              // Update distributorData list as well (if target was a distributor)
              setDistributorData(prevDists => prevDists.map(d =>
                  d.auth0Id === targetFoodBankId ? { ...d, needStatus: result.data.needStatus } : d
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
        headers: {
          'X-Requesting-User-Id': userData.auth0Id
        }
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
    // <<< VALIDATION FOR targetUserId >>>
    if (!newDonationData.targetUserId) {
      setAddDonationError('Please select the business user you are adding this donation for.');
      return;
    }
    // <<< END VALIDATION >>>
    if (!userData?.auth0Id) {
      setAddDonationError('Cannot add donation: Admin user ID not found.'); // Should not happen if logged in
      return;
    }
    if (!newDonationData.itemName || !newDonationData.quantity || !newDonationData.expirationDate || !newDonationData.pickupInfo) {
      setAddDonationError('Please fill out all required donation fields.');
      return;
    }
    try {
      // Prepare payload, ensuring targetUserId is sent as 'userId'
      const { targetUserId, ...restOfDonationData } = newDonationData;
      const donationPayload = {
        ...restOfDonationData,
        userId: targetUserId, // <<< USE targetUserId for the backend
      };
      const response = await fetch(`http://localhost:5000/api/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
           // Add authentication token/header if needed by backend middleware
           // 'Authorization': `Bearer ${your_auth_token}`
           'X-Requesting-User-Id': userData.auth0Id
        },
        body: JSON.stringify(donationPayload),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setDonations(prev => ({ ...prev, available: [result.data, ...prev.available] }));
        setShowAddDonationForm(false);
        // Reset form including targetUserId
        setNewDonationData({ itemName: '', category: 'other', quantity: '', expirationDate: '', pickupInfo: '', targetUserId: '' });
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
                <td>{donation.items && donation.items.length > 0 ? donation.items[0].name : donation.itemName || 'N/A'}</td>
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
  // <<< END OF ADDED RENDER FUNCTION >>>

  // <<< RESTORE RENDER FUNCTION definition >>>
  const renderRoleView = () => {
    // Find the user object corresponding to the preview type, if applicable
    const targetUser = users.find(u => u.accountType === previewDashboardType && u.auth0Id !== userData.auth0Id);
    const targetUserId = targetUser ? targetUser.auth0Id : null;

    const adminUserData = userData;

    // Pass the target user ID and update handler as props
    const componentProps = { 
      ...(targetUserId && { previewTargetUserId: targetUserId }),
      onUpdate: handlePreviewDataUpdate // Pass the update handler
    }; 

    const wrapInPreviewContext = (Component) => (
      // Context provides ADMIN user data
      <UserContext.Provider value={{ userData: adminUserData }}>
        <Component {...componentProps} />
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
        // Should not happen if dropdown is controlled, but return null as fallback
        return null; 
    }
  };
 // <<< END RESTORED RENDER FUNCTION >>>

  // --- Action Handlers ---
  // We need a consolidated save function for the editable components
  const handleInlineSave = async (accountId, dataToSave) => {
    // Simplify: Always use the general saveUser endpoint
    // No need to check for field type as saveUser handles selective updates
    console.log(`AdminDashboard: Saving inline data for ${accountId}`, dataToSave);
    setError(''); // Clear previous errors
    try {
      const payload = { auth0Id: accountId, ...dataToSave };
      const response = await fetch(`http://localhost:5000/api/users`, {
        method: 'POST', // Use POST which maps to saveUser controller
        headers: { 
          'Content-Type': 'application/json', 
          'X-Requesting-User-Id': userData.auth0Id // Pass requesting user ID for auth/logging
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        // Log the specific error from the backend if available
        console.error(`Error saving data for ${accountId}:`, result.message || response.statusText);
        throw new Error(result.message || `Failed to save field (HTTP ${response.status})`);
      }
      console.log(`AdminDashboard: Successfully saved data for ${accountId}`, result.data);
      // Update local state on success using the returned user data
      setUsers(prevUsers => prevUsers.map(u =>
        u.auth0Id === accountId ? { ...u, ...result.data } : u // Merge full updated user
      ));
      
       // Also update distributorData if the user is a distributor/organizer
       // This ensures the 'Managed Accounts' table reflects changes immediately
       if (result.data.accountType === 'distributor' || result.data.accountType === 'organizer') {
           setDistributorData(prevDists => prevDists.map(d => 
               d.auth0Id === accountId ? { ...d, ...result.data } : d
           ));
       }

    } catch (err) {
      console.error(`Error during inline save for ${accountId}:`, err);
      setError(`Save failed for ${accountId}: ${err.message}`);
      throw err; // Re-throw for the EditableContactField component to potentially handle (e.g., stop loading state)
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

      {/* <<< DISPLAY ADMIN ID >>> */}
      {userData?.auth0Id && (
        <p style={{ fontStyle: 'italic', color: '#666', marginBottom: '20px' }}>
          Logged in as Admin: {userData.auth0Id}
        </p>
      )}
      {/* <<< END DISPLAY ADMIN ID >>> */}

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
            <h2>Managed Accounts (Food Banks & Organizers)</h2>
            <div style={{ marginBottom: '15px' }}> 
              <button 
                onClick={() => { setShowAddRequestForm(true); setAddRequestError(''); }} 
                className="action-button add-button"
              >
                + Set Food Bank Request/Status
              </button>
            </div>
            {managedAccounts.length === 0 ? (
              <p>No food banks or organizers found.</p>
            ) : (
              <table className="data-table organizer-foodbank-table">
                <thead>
                  <tr>
                    <th>Account Name</th> 
                    <th>Need Status</th>{/* Combined Column */}
                    <th>Address</th> 
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managedAccounts.map(account => {
                    const displayName = account.businessName || account.username || 'Unnamed Account';
                    const disableStatusEditing = account.auth0Id === userData.auth0Id; // Example: Disable editing own status
                    
                    return (
                      <tr key={account.auth0Id}>
                        <td>{displayName} ({formatAccountType(account.accountType)})</td>
                        <td>
                          {/* Use EditableNeedStatus component */} 
                          <EditableNeedStatus 
                              auth0Id={account.auth0Id}
                              initialPriority={account.needStatus?.priorityLevel ?? 1}
                              initialMessage={account.needStatus?.customMessage ?? ''}
                              priorityLevels={priorityLevels} // Pass defined levels
                              getPriorityInfo={getPriorityInfo} // Pass helper function
                              onSave={handleInlineSave} // Pass the save handler
                              disabled={disableStatusEditing} // Example condition
                          />
                        </td>
                        <td>
                             {/* Use EditableContactField component - For Address */} 
                            <EditableContactField
                                auth0Id={account.auth0Id}
                                fieldName="address" // Or businessAddress?
                                label="Address" // Hide label visually if needed in table
                                initialValue={account.address || account.businessAddress || ''}
                                placeholder="No address listed"
                                onSave={handleInlineSave}
                                inputType="textarea" // Example: use textarea for address
                            />
                        </td>
                        <td className="action-cell">
                            {/* Other actions like Reset Requests, Delete */}
                            <button 
                                onClick={() => handleResetRequests(account.auth0Id)} 
                                className="action-button reset-button"
                                title="Reset all need requests for this account"
                                disabled={account.accountType !== 'distributor'} // Disable reset for organizers?
                            >
                                Reset
                            </button>
                            {/* Add Delete button here if needed, similar to User Management */}
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
                      <label>Select Food Bank/Organizer*</label>
                      <select name="targetFoodBankId" value={newRequestData.targetFoodBankId} onChange={handleNewRequestChange} required>
                        <option value="" disabled>-- Select a Food Bank/Organizer --</option>
                        {managedAccounts.map(acc => (
                          <option key={acc.auth0Id} value={acc.auth0Id}>{acc.businessName || acc.username || acc.auth0Id} ({formatAccountType(acc.accountType)})</option>
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
                    {/* <<< ADD TARGET USER SELECTOR >>> */}
                    <div className="form-group">
                      <label htmlFor="targetUserId">Add Donation For (Business User)*</label>
                      <select
                        id="targetUserId"
                        name="targetUserId"
                        value={newDonationData.targetUserId}
                        onChange={handleNewDonationChange}
                        required
                      >
                        <option value="" disabled>-- Select Business --</option>
                        {businessUsers.map(user => (
                          <option key={user.auth0Id} value={user.auth0Id}>
                            {user.businessName || user.username} ({user.auth0Id})
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* <<< END TARGET USER SELECTOR >>> */}
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