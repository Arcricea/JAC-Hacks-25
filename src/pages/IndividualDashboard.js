import React, { useState, useEffect } from 'react';
import '../assets/styles/Dashboard.css';
import { useAuth0 } from "@auth0/auth0-react"; // Import the hook
import { getMyDonations } from '../services/individualService'; // Import the new service

const IndividualDashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const [activeTab, setActiveTab] = useState('donate'); // Reintroduce activeTab state

  // State for donation form
  const [donationItemsText, setDonationItemsText] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [donationStatus, setDonationStatus] = useState({ message: '', type: '' });

  // State for contributions tab
  const [contributions, setContributions] = useState([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [contributionsError, setContributionsError] = useState('');

  // --- Fetch Contributions Effect ---
  useEffect(() => {
    if (activeTab === 'contributions' && isAuthenticated && user?.sub) {
      fetchContributions();
    }
    // Reset error when switching tabs
    if (activeTab !== 'contributions') {
        setContributionsError('');
    }
  }, [activeTab, isAuthenticated, user?.sub]);

  const fetchContributions = async () => {
    setContributionsLoading(true);
    setContributionsError('');
    setContributions([]); // Clear previous contributions
    console.log("Fetching contributions for user:", user.sub);
    try {
        // Use the actual service function
        const response = await getMyDonations(user.sub); 
        if (response.success) {
          setContributions(response.data);
        } else {
          setContributionsError(response.message || 'Failed to load contributions.');
        }
    } catch (err) {
      console.error("Error fetching contributions:", err);
      setContributionsError(err.message || 'An error occurred while loading contributions.');
    } finally {
      setContributionsLoading(false);
    }
  };

  const individualData = {
    availableAssistance: [
      { id: 1, provider: 'Community Food Bank', type: 'Food Package', location: '123 Main St', date: '2025-04-28' },
      { id: 2, provider: 'Fresh Start', type: 'Hot Meal', location: '45 Oak Ave', date: '2025-04-27' },
    ],
    upcomingAppointments: [
      { id: 1, provider: 'Hope Pantry', date: '2025-04-30', time: '10:00 AM', status: 'Confirmed' }
    ],
    assistanceHistory: [
      { id: 1, provider: 'Community Food Bank', date: '2025-04-15', items: 'Weekly food package' },
      { id: 2, provider: 'Fresh Start', date: '2025-04-08', items: 'Hot meal and groceries' },
    ]
  };

  // --- Function to handle donation submission ---
  const handleDonationSubmit = async (event) => {
    event.preventDefault();
    setDonationStatus({ message: '', type: '' });

    // Check the real isAuthenticated status and if user object exists
    if (!isAuthenticated || !user?.sub) {
      setDonationStatus({ message: 'You must be logged in to donate.', type: 'error' });
      return;
    }

    // Validate the new items text area
    if (!donationItemsText.trim()) { 
      setDonationStatus({ message: 'Please describe the items you wish to donate.', type: 'error' });
      return;
    }

    // TODO: Get access token if needed (using getAccessTokenSilently)
    // const token = await getAccessTokenSilently(); 

    let response;
    try {
      // Use the absolute URL for the backend server
      const apiUrl = 'http://localhost:5000/api/individuals/donate'; 
      response = await fetch(apiUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use the real user.sub from Auth0
          'x-requesting-user-id': user.sub, 
          // Example for adding token if needed:
          // 'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          // Send the text directly
          itemsDescriptionFromUser: donationItemsText, 
          pickupInstructions: pickupInstructions,
        }),
      });

      // Read the body as text first (consumes the body once)
      const responseText = await response.text();
      let data;

      if (response.ok) {
        try {
          // Try to parse the text as JSON for successful responses
          data = JSON.parse(responseText);
          setDonationStatus({ message: data.message || 'Donation submitted successfully!', type: 'success' });
          setDonationItemsText('');
          setPickupInstructions('');
        } catch (jsonError) {
          // Handle case where backend sent success status but non-JSON body (unlikely but possible)
          console.error('Error parsing JSON from successful response:', jsonError, responseText);
          setDonationStatus({ message: 'Donation submitted, but unexpected response format received.', type: 'warning' });
        }
      } else {
        // Handle error responses (non-2xx status)
        console.error('Donation API Error Status:', response.status, responseText); 
        try {
          // Try to parse the error response text as JSON
          data = JSON.parse(responseText);
          setDonationStatus({ 
            message: data.message || `Error: ${response.status} - Failed to submit donation.`, 
            type: 'error' 
          });
        } catch (jsonError) {
          // If the error response wasn't JSON, use the raw text
          setDonationStatus({ 
            message: `Error: ${response.status} - ${responseText.substring(0, 150)}...`, 
            type: 'error' 
          });
        }
      }
    } catch (error) {
      // Handle network errors or errors before/during fetch
      console.error('Network or other error submitting donation:', error);
      // Ensure response object exists before trying to access status
      const status = response ? response.status : 'N/A'; 
      setDonationStatus({ message: `An error occurred (Status: ${status}): ${error.message}. Please check connection or try again.`, type: 'error' });
    }
  };

  // Optional: Handle loading state from Auth0
  if (isLoading) {
    return <div className="dashboard-content"><p>Loading user information...</p></div>;
  }

  // Optional: Handle case where user is not logged in
  if (!isAuthenticated) {
     return <div className="dashboard-content"><p>Please log in to access the dashboard.</p></div>;
  }

  return (
    <div className="dashboard-content">
      {/* Reintroduce Tab Navigation */}
      <div className="dashboard-nav">
        <button 
          className={activeTab === 'donate' ? 'active' : ''} 
          onClick={() => setActiveTab('donate')}
        >
          Make Donation / Request Pickup
        </button>
        <button 
          className={activeTab === 'contributions' ? 'active' : ''} 
          onClick={() => setActiveTab('contributions')}
        >
          My Contributions
        </button>
      </div>

      {/* Donate Tab Content */}
      {activeTab === 'donate' && (
        <>
          <div className="donate-section">
            <h3>Make a Donation</h3>
            <p>Offer food items for pickup from your registered address.</p>
            
            <form onSubmit={handleDonationSubmit} className="donation-form">
              <div className="form-group">
                <label htmlFor="donation-items-text">Items to Donate (Description):</label>
                <textarea 
                  id="donation-items-text"
                  value={donationItemsText}
                  onChange={(e) => setDonationItemsText(e.target.value)}
                  required 
                  rows="2" // <--- Reduced rows
                ></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="pickup-instructions">Pickup Instructions (optional):</label>
                <textarea 
                  id="pickup-instructions"
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  rows="2" // <--- Reduced rows
                ></textarea>
              </div>

              {donationStatus.message && (
                <p className={`status-message ${donationStatus.type}`}>
                  {donationStatus.message}
                </p>
              )}

              <button type="submit" className="primary-btn">Submit Donation</button>
            </form>
          </div>
        </>
      )}

      {/* Contributions Tab Content */}
      {activeTab === 'contributions' && (
        <div className="contributions-section">
          <h3>My Donation History</h3>
          {contributionsLoading && <p>Loading your contributions...</p>}
          {contributionsError && <p className="error-message">{contributionsError}</p>}
          {!contributionsLoading && !contributionsError && (
            contributions.length > 0 ? (
              <table className="data-table contributions-table">
                <thead>
                  <tr>
                    <th>Items Donated</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                    {/* Add other relevant columns if needed, e.g., Volunteer Assigned */}
                  </tr>
                </thead>
                <tbody>
                  {contributions.map(donation => (
                    <tr key={donation._id}>
                      {/* Accessing items array */}
                      <td>{donation.items && donation.items.length > 0 ? donation.items[0].name : 'N/A'}</td> 
                      <td>{new Date(donation.createdAt).toLocaleDateString()}</td>
                      <td>{donation.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>You haven't made any donations yet.</p>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default IndividualDashboard; 