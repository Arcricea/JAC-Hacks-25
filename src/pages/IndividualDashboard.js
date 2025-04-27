import React, { useState, useEffect } from 'react';
import '../assets/styles/Dashboard.css';
import { useAuth0 } from "@auth0/auth0-react"; // Import the hook
import { getMyDonations, confirmIndividualPickup } from '../services/individualService'; // Import the service
import { Html5QrcodeScanner } from 'html5-qrcode';

const IndividualDashboard = () => {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [activeTab, setActiveTab] = useState('donate');
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // State for donation form
  const [donationItemsText, setDonationItemsText] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [itemCategory, setItemCategory] = useState('produce');
  const [donationStatus, setDonationStatus] = useState({ message: '', type: '' });
  
  // State for pickup request
  const [pickupRequested, setPickupRequested] = useState(false);
  const [currentPickupRequest, setCurrentPickupRequest] = useState(null);
  const [hasActiveDonation, setHasActiveDonation] = useState(false);

  // State for contributions tab
  const [contributions, setContributions] = useState([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [contributionsError, setContributionsError] = useState('');
  
  // State for confirm pickup tab
  const [enteredCode, setEnteredCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // QR Scanner setup and cleanup
  useEffect(() => {
    let scanner = null;

    if (activeTab === 'confirmPickup' && showScanner) {
      // Initialize QR scanner when tab is active and scanner should be shown
      scanner = new Html5QrcodeScanner(
        "qr-reader-individual", 
        { fps: 10, qrbox: 250 },
        /* verbose= */ false
      );
      
      scanner.render(onScanSuccess, onScanFailure);
    }

    // Cleanup function
    return () => {
      if (scanner) {
        scanner.clear().catch(error => {
          console.error("Failed to clear scanner instance:", error);
        });
      }
    };
  }, [activeTab, showScanner, userProfile]);
  
  // --- Code Confirmation Handler ---
  const handleConfirmCode = async () => {
    if (isConfirming) return; // Prevent multiple submissions
    if (!enteredCode || enteredCode.length !== 8 || !/^[0-9]+$/.test(enteredCode)) { // Basic validation
        setConfirmationResult({ success: false, message: 'Please enter a valid 8-digit code.' });
        return;
    }

    setIsConfirming(true);
    setConfirmationResult(null); // Clear previous result

    try {
      if (!user?.sub) {
        throw new Error("User data not available.");
      }
      
      // Determine the user ID whose pickup is being confirmed
      const resourceUserId = user.sub;
      // The requestingUserId is always the logged-in user
      const requestingUserId = user.sub;
      
      // Pass resource ID for URL path, requester ID for header
      // Pass the enteredCode
      const response = await confirmIndividualPickup(resourceUserId, { confirmationCode: enteredCode }, requestingUserId);
      
      setConfirmationResult({ 
        success: true, 
        message: response.message || 'Pickup confirmed! Items are now on their way to food banks.' 
      });
      setEnteredCode(''); // Clear input on success
      
      // Optionally trigger refresh of contributions
      if (response.success && response.modifiedCount > 0) {
        setRefreshTrigger(prev => prev + 1); 
        fetchContributions();
      }

    } catch (error) {
      console.error("Pickup confirmation error:", error);
      setConfirmationResult({ success: false, message: error.message || 'Failed to confirm pickup.' });
    } finally {
      setIsConfirming(false);
    }
  };

  // --- QR Code Scan Success Handler ---
  const onScanSuccess = async (decodedText, decodedResult) => {
    if (isConfirming) return; // Prevent multiple submissions
    setIsConfirming(true);
    setConfirmationResult(null); // Clear previous result
    
    try {
      if (!user?.sub) {
        throw new Error("User data not available.");
      }
      
      console.log("QR Code Scanned Content:", decodedText);
      
      // Extract the volunteer ID from the QR code
      // Expected format: "volunteer:auth0|123456789"
      let scannedVolunteerId = null;
      
      if (decodedText.startsWith('volunteer:')) {
        scannedVolunteerId = decodedText.substring('volunteer:'.length);
      } else {
        throw new Error("Invalid QR code format. Expected volunteer QR code.");
      }
      
      if (!scannedVolunteerId) {
        throw new Error("Could not extract volunteer ID from QR code.");
      }
      
      // If we extracted scannedVolunteerId, proceed with that
      const resourceUserId = user.sub;
      const requestingUserId = user.sub;
      const response = await confirmIndividualPickup(resourceUserId, { scannedVolunteerId: scannedVolunteerId }, requestingUserId);
      
      setConfirmationResult({ 
        success: response.success, // Use success field from response
        message: response.message || (response.success ? 'Pickup confirmed via QR Scan!' : 'Failed to confirm QR Scan.') 
      });

      // Trigger refresh if needed
      if (response.success && response.modifiedCount > 0) {
        setRefreshTrigger(prev => prev + 1);
        fetchContributions();
      }

    } catch (error) {
      console.error("Pickup confirmation error (QR Scan):", error);
      setConfirmationResult({ success: false, message: error.message || 'Failed to confirm pickup via QR scan.' });
    } finally {
      setIsConfirming(false);
    }
  };

  // --- QR Code Scan Failure Handler ---
  const onScanFailure = (error) => {
    // console.warn(`QR Code scan error = ${error}`);
    // Can add feedback here if needed, e.g., setConfirmationResult({success: false, message: `Scan Error: ${error}`})
  };
  
  // Fetch user profile when component mounts
  useEffect(() => {
    if (isAuthenticated && user?.sub) {
      fetchUserProfile();
    }
  }, [isAuthenticated, user?.sub]);

  // Check for active donations when component mounts or tab changes
  useEffect(() => {
    if (isAuthenticated && user?.sub && activeTab === 'requestPickup') {
      checkActivePickupRequests();
    }
  }, [isAuthenticated, user?.sub, activeTab]);
  
  // Function to check if user has any active pickup requests
  const checkActivePickupRequests = async () => {
    setContributionsLoading(true);
    try {
      const response = await getMyDonations(user.sub);
      if (response.success && response.data.length > 0) {
        // Check if any donation is in a pending/active state (not completed or cancelled)
        const activeRequest = response.data.find(donation => 
          donation.isPickupRequest && 
          !['Completed', 'Cancelled', 'Delivered'].includes(donation.status)
        );
        
        if (activeRequest) {
          setHasActiveDonation(true);
          setPickupRequested(true);
          setCurrentPickupRequest({
            id: activeRequest._id,
            items: activeRequest.items && activeRequest.items.length > 0 
              ? activeRequest.items[0].name 
              : 'Items pending pickup',
            category: activeRequest.category || 'N/A',
            status: activeRequest.status || 'Pending Pickup',
            requestDate: activeRequest.createdAt
          });
        } else {
          setHasActiveDonation(false);
          setPickupRequested(false);
          setCurrentPickupRequest(null);
        }
      } else {
        setHasActiveDonation(false);
      }
    } catch (error) {
      console.error("Error checking active pickup requests:", error);
      setHasActiveDonation(false);
    } finally {
      setContributionsLoading(false);
    }
  };
  
  const fetchUserProfile = async () => {
    setProfileLoading(true);
    try {
      // First try to get the profile from our backend
      const token = await getAccessTokenSilently();
      const response = await fetch('http://localhost:5000/api/individuals/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-requesting-user-id': user.sub
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Profile data from API:', data);
        if (data.profile) {
          setUserProfile(data.profile);
          console.log('User profile loaded:', data.profile);
        } else {
          // If profile exists but in a different format
          setUserProfile(data);
          console.log('User profile loaded (alternative format):', data);
        }
      } else {
        // If there's no profile or other error, create a temporary profile from Auth0 user data
        console.log('Could not load user profile from backend, using Auth0 profile data');
        setUserProfile({
          name: user.name,
          email: user.email,
          // Assume profile is complete if we have basic Auth0 info
          isComplete: true
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to Auth0 user data
      setUserProfile({
        name: user.name,
        email: user.email,
        // Assume profile is complete if we have basic Auth0 info
        isComplete: true
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Function to update the user's profile with a default address
  const updateUserProfile = async () => {
    setIsUpdatingProfile(true);
    setDonationStatus({ message: 'Updating your profile...', type: 'info' });
    
    try {
      const token = await getAccessTokenSilently();
      
      // First, fetch the current profile to preserve any existing address
      const profileResponse = await fetch('http://localhost:5000/api/individuals/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-requesting-user-id': user.sub
        }
      });
      
      // Check if the user already has an address
      let existingAddress = null;
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.profile && profileData.profile.address) {
          existingAddress = profileData.profile.address;
          console.log('Found existing address:', existingAddress);
        }
      }
      
      // Only use default address if no address exists
      // Format address properly - if it's already a string use it directly
      let addressToUse;
      
      if (existingAddress) {
        // If existing address has street field with actual address, use that directly
        if (existingAddress.street && typeof existingAddress.street === 'string') {
          addressToUse = existingAddress.street;
        } 
        // If it's already a string, use as-is
        else if (typeof existingAddress === 'string') {
          addressToUse = existingAddress;
        }
        // Otherwise use the whole object
        else {
          addressToUse = existingAddress;
        }
      } else {
        // Default address as a plain string
        addressToUse = '123 Main Street, Anytown, CA 12345, USA';
      }
      
      const updateData = {
        auth0Id: user.sub, // Required for saveUser
        name: user.name || '',
        email: user.email || '',
        phone: '555-123-4567',
        address: addressToUse // Store as a direct string
      };
      
      console.log('Updating profile with:', updateData);
      
      const response = await fetch('http://localhost:5000/api/individuals/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-requesting-user-id': user.sub
        },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Profile update response:', data);
        
        if (data.success) {
          setUserProfile({
            ...updateData,
            isComplete: true
          });
          setDonationStatus({ message: 'Profile updated successfully!', type: 'success' });
          return true;
        } else {
          setDonationStatus({ message: data.message || 'Failed to update profile.', type: 'error' });
          return false;
        }
      } else {
        const errorText = await response.text();
        console.error('Profile update failed:', errorText);
        setDonationStatus({ message: 'Failed to update profile. Please try again.', type: 'error' });
        return false;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setDonationStatus({ message: 'Error updating profile: ' + error.message, type: 'error' });
      return false;
    } finally {
      setIsUpdatingProfile(false);
    }
  };

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

    // Check if this is a pickup request and the user already has an active request
    if (activeTab === 'requestPickup' && hasActiveDonation) {
      setDonationStatus({ 
        message: 'You already have an active pickup request. Please wait for it to be completed before creating a new one.', 
        type: 'error' 
      });
      return;
    }

    // Validate the new items text area
    if (!donationItemsText.trim()) { 
      setDonationStatus({ message: 'Please describe the items you wish to donate.', type: 'error' });
      return;
    }

    try {
      // First update the user profile to ensure it has an address
      await updateUserProfile();
      
      // Get token for authentication after profile update
      const token = await getAccessTokenSilently();
      
      // Use the individual-specific API endpoint for both donation and pickup
      const apiUrl = 'http://localhost:5000/api/individuals/donate';
      
      // Create a simpler payload without profile data as we've already updated it
      const payload = {
        itemsDescriptionFromUser: donationItemsText,
        isPickupRequest: activeTab === 'requestPickup',
        category: itemCategory, // Always include category for both donation types
      };
      
      // Add specific fields for pickup requests or donations
      if (activeTab === 'requestPickup') {
        // No additional fields needed here as category is already included above
      } else {
        payload.pickupInstructions = pickupInstructions;
      }
      
      setDonationStatus({ message: 'Submitting your request...', type: 'info' });
      
      console.log('Sending payload:', payload);
      
      const response = await fetch(apiUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-requesting-user-id': user.sub,
        },
        body: JSON.stringify(payload),
      });

      console.log('Donation submission response status:', response.status);
      
      // Read the body as text first (consumes the body once)
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let data;

      if (response.ok) {
        try {
          // Try to parse the text as JSON for successful responses
          data = JSON.parse(responseText);
          console.log('Parsed response data:', data);
          
          if (activeTab === 'requestPickup') {
            setDonationStatus({ message: 'Pickup request submitted successfully!', type: 'success' });
            setPickupRequested(true);
            setHasActiveDonation(true);
            setCurrentPickupRequest({
              id: data.donationId || data._id,
              items: donationItemsText,
              category: itemCategory,
              status: 'Pending Pickup',
              requestDate: new Date().toISOString()
            });
            
            // Refresh contributions
            fetchContributions();
          } else {
            setDonationStatus({ message: 'Donation submitted successfully!', type: 'success' });
            setDonationItemsText('');
            setPickupInstructions('');
          }
        } catch (jsonError) {
          // Handle case where backend sent success status but non-JSON body
          console.error('Error parsing JSON from successful response:', jsonError, responseText);
          setDonationStatus({ message: 'Request submitted, but unexpected response format received.', type: 'warning' });
        }
      } else {
        // Handle error responses
        try {
          data = JSON.parse(responseText);
          setDonationStatus({ 
            message: data.message || `Error: ${response.status} - Failed to submit request.`, 
            type: 'error' 
          });
        } catch (jsonError) {
          setDonationStatus({ 
            message: `Error: ${response.status} - ${responseText.substring(0, 150)}...`, 
            type: 'error' 
          });
        }
      }
    } catch (error) {
      console.error('Network or other error submitting donation:', error);
      setDonationStatus({ 
        message: `An error occurred: ${error.message}. Please try again.`, 
        type: 'error' 
      });
    }
  };

  // Function to handle delivery confirmation
  const handleConfirmDelivery = async () => {
    if (!currentPickupRequest || !currentPickupRequest.id) {
      setDonationStatus({ message: 'No active pickup request to confirm', type: 'error' });
      return;
    }

    setDonationStatus({ message: 'Processing confirmation...', type: 'info' });

    try {
      // Get token for authentication
      const token = await getAccessTokenSilently({
        audience: 'https://foodrescue-api/',
        scope: 'profile email'
      });
      
      // Use the individual-specific API endpoint
      const apiUrl = `http://localhost:5000/api/individuals/confirm-delivery/${currentPickupRequest.id}`; 
      
      try {
        const response = await fetch(apiUrl, { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-requesting-user-id': user.sub,
          },
          body: JSON.stringify({
            status: 'Delivered'
          })
        });

        // Try to parse response as JSON
        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.error('Error parsing JSON from delivery confirmation:', e);
          data = { message: 'Unexpected response format' };
        }

        if (response.ok) {
          setDonationStatus({ message: data.message || 'Delivery confirmed successfully!', type: 'success' });
          // Reset the pickup request state
          setPickupRequested(false);
          setCurrentPickupRequest(null);
          setHasActiveDonation(false);
          setDonationItemsText('');
          setItemCategory('produce');
          
          // Refresh contributions
          fetchContributions();
        } else {
          setDonationStatus({ 
            message: data.message || `Error: Failed to confirm delivery.`, 
            type: 'error' 
          });
        }
      } catch (error) {
        console.error('Error confirming delivery:', error);
        setDonationStatus({ 
          message: `An error occurred: ${error.message}. Please try again.`, 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error getting access token:', error);
      setDonationStatus({ 
        message: `An error occurred: ${error.message}. Please try again.`, 
        type: 'error' 
      });
    }
  };

  // Cancel the current pickup request
  const handleCancelRequest = async () => {
    if (!currentPickupRequest || !currentPickupRequest.id) {
      setDonationStatus({ message: 'No active pickup request to cancel', type: 'error' });
      return;
    }

    setDonationStatus({ message: 'Cancelling request...', type: 'info' });

    try {
      // Get token for authentication
      const token = await getAccessTokenSilently({
        audience: 'https://foodrescue-api/',
        scope: 'profile email'
      });
      
      // Use the individual-specific API endpoint
      const apiUrl = `http://localhost:5000/api/individuals/cancel-request/${currentPickupRequest.id}`; 
      
      const response = await fetch(apiUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-requesting-user-id': user.sub,
        }
      });

      // Try to parse response as JSON
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Error parsing JSON from cancel request:', e);
        data = { message: 'Unexpected response format' };
      }

      if (response.ok) {
        setDonationStatus({ message: data.message || 'Request cancelled successfully!', type: 'success' });
        // Reset the form and pickup request state
        setPickupRequested(false);
        setCurrentPickupRequest(null);
        setHasActiveDonation(false);
        setDonationItemsText('');
        setItemCategory('produce');
        
        // Refresh contributions
        fetchContributions();
      } else {
        setDonationStatus({ 
          message: data.message || `Error: Failed to cancel request.`, 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      setDonationStatus({ 
        message: `An error occurred: ${error.message}. Please try again.`, 
        type: 'error' 
      });
    }
  };

  // Helper function to format category name
  const formatCategoryName = (category) => {
    if (!category) return 'Other';
    // Capitalize first letter and return
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Optional: Reset pickup request state when changing tabs
  useEffect(() => {
    if (activeTab !== 'requestPickup') {
      // Don't reset the state flags - they need to persist between tab switches
      setDonationStatus({ message: '', type: '' });
    }
  }, [activeTab]);

  // Function to render the Confirm Pickup tab
  const renderConfirmPickup = () => (
    <div className="verify-section">
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        {/* Header Section */}
        <div style={{
          background: 'linear-gradient(135deg, #2e7d32, #388e3c)',
          padding: '2rem',
          color: 'white',
          textAlign: 'center'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.8rem',
            fontWeight: '600'
          }}>Confirm Donation Pickup</h3>
          <p style={{
            margin: '1rem 0 0',
            opacity: '0.9',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: '1.5'
          }}>
            Confirm that a volunteer has picked up your donations by scanning their QR code
            or entering their 8-digit confirmation code.
          </p>
        </div>
        
        {/* Content Section */}
        <div style={{ padding: '2.5rem' }}>
          {/* Methods Container */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {/* Code Input Method */}
            <div style={{
              background: '#f9f9f9',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <h4 style={{
                margin: '0 0 1rem',
                color: '#333',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{
                  background: '#2e7d32',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>1</span>
                Enter Confirmation Code
              </h4>
              
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', color: '#666' }}>
                  Ask the volunteer for their 8-digit confirmation code:
                </p>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem',
                  maxWidth: '500px'
                }}>
                  <input 
                    type="text" 
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.slice(0, 8))}
                    placeholder="Enter 8-digit code"
                    maxLength={8}
                    disabled={isConfirming || showScanner}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      flex: 1,
                      fontSize: '1rem'
                    }}
                  />
                  <button 
                    onClick={handleConfirmCode}
                    disabled={isConfirming || showScanner || !enteredCode || enteredCode.length !== 8}
                    style={{
                      background: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: (isConfirming || showScanner || !enteredCode || enteredCode.length !== 8) ? 'not-allowed' : 'pointer',
                      opacity: (isConfirming || showScanner || !enteredCode || enteredCode.length !== 8) ? '0.7' : '1',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Verify Code
                  </button>
                </div>
              </div>
              
              <div style={{ 
                marginTop: '2rem',
                borderTop: '1px solid #eee',
                paddingTop: '1.5rem'
              }}>
                <h4 style={{
                  margin: '0 0 1rem',
                  color: '#333',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{
                    background: '#2e7d32',
                    color: 'white',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>2</span>
                  Or Scan Volunteer QR Code
                </h4>
              </div>
              
              {!showScanner ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <button 
                    onClick={() => {
                      setShowScanner(true); 
                      setEnteredCode('');
                      setConfirmationResult(null);
                    }}
                    disabled={isConfirming}
                    style={{
                      background: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '1rem 2rem',
                      borderRadius: '8px',
                      fontWeight: '500',
                      fontSize: '1rem',
                      cursor: isConfirming ? 'not-allowed' : 'pointer',
                      opacity: isConfirming ? '0.7' : '1',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    Start Camera Scan
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '1rem 0', 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div id="qr-reader-individual" style={{ 
                    width: '100%', 
                    maxWidth: '350px', 
                    margin: '0 auto',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
                  }}></div>
                  
                  <button 
                    onClick={() => setShowScanner(false)}
                    disabled={isConfirming}
                    style={{
                      background: 'transparent',
                      color: '#666',
                      border: '1px solid #ccc',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Cancel Scan
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Result Display */}
          {(isConfirming || confirmationResult) && (
            <div style={{ 
              marginTop: '2rem',
              padding: '1.5rem',
              borderRadius: '12px',
              background: confirmationResult ? (confirmationResult.success ? '#e8f5e9' : '#ffebee') : '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              {isConfirming && (
                <>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '3px solid #f3f3f3',
                    borderTop: '3px solid #2e7d32',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ color: '#555', fontWeight: '500' }}>Confirming pickup...</span>
                </>
              )}
              
              {confirmationResult && (
                <>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: confirmationResult.success ? '#2e7d32' : '#e53935',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 'bold'
                  }}>
                    {confirmationResult.success ? '✓' : '!'}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: '500', 
                      color: confirmationResult.success ? '#2e7d32' : '#c62828',
                      fontSize: '1.1rem'
                    }}>
                      {confirmationResult.success ? 'Success!' : 'Error'}
                    </div>
                    <div style={{ 
                      color: confirmationResult.success ? '#3e7041' : '#d32f2f',
                      marginTop: '0.25rem'
                    }}>
                      {confirmationResult.message}
                    </div>
                  </div>
                  
                  {confirmationResult && (
                    <button 
                      onClick={() => {
                        setConfirmationResult(null);
                        setShowScanner(false);
                        setEnteredCode('');
                      }}
                      style={{
                        background: '#f5f5f5',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        color: '#555',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Try Again
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Optional: Handle loading state from Auth0
  if (isLoading || profileLoading) {
    return <div className="dashboard-content"><p>Loading user information...</p></div>;
  }

  // Optional: Handle case where user is not logged in
  if (!isAuthenticated) {
     return <div className="dashboard-content"><p>Please log in to access the dashboard.</p></div>;
  }

  return (
    <div className="dashboard-content">
      {/* Updated Tab Navigation */}
      <div className="dashboard-nav">
        <button 
          className={activeTab === 'donate' ? 'active' : ''} 
          onClick={() => setActiveTab('donate')}
        >
          Make Donation
        </button>
        <button 
          className={activeTab === 'requestPickup' ? 'active' : ''} 
          onClick={() => setActiveTab('requestPickup')}
        >
          Request Pickup
        </button>
        <button 
          className={activeTab === 'contributions' ? 'active' : ''} 
          onClick={() => setActiveTab('contributions')}
        >
          My Contributions
        </button>
        <button 
          className={activeTab === 'confirmPickup' ? 'active' : ''} 
          onClick={() => setActiveTab('confirmPickup')}
        >
          Confirm Pickup
        </button>
      </div>

      {/* Donate Tab Content */}
      {activeTab === 'donate' && (
        <div className="donate-section">
          <h3>Make a Donation</h3>
          <p>Offer food items for donation.</p>
          
          <form onSubmit={handleDonationSubmit} className="donation-form">
            <div className="form-group">
              <label htmlFor="donation-items-text">Items to Donate (Description):</label>
              <textarea 
                id="donation-items-text"
                value={donationItemsText}
                onChange={(e) => setDonationItemsText(e.target.value)}
                required 
                rows="2"
              ></textarea>
            </div>
            
            <div className="form-group">
              <label htmlFor="item-category">Category:</label>
              <select
                id="item-category"
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                required
              >
                <option value="produce">Produce</option>
                <option value="dairy">Dairy</option>
                <option value="bakery">Bakery</option>
                <option value="meat">Meat</option>
                <option value="frozen">Frozen</option>
                <option value="canned">Canned Goods</option>
                <option value="dry">Dry Goods</option>
                <option value="prepared">Prepared Meals</option>
                <option value="other">Other</option>
              </select>
            </div>

            {donationStatus.message && (
              <p className={`status-message ${donationStatus.type}`}>
                {donationStatus.message}
              </p>
            )}

            <button type="submit" className="primary-btn" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? 'Processing...' : 'Submit Donation'}
            </button>
          </form>
        </div>
      )}

      {/* Request Pickup Tab Content */}
      {activeTab === 'requestPickup' && (
        <div className="pickup-section">
          <h3>Request Pickup</h3>
          <p>Request a pickup for your donated items from your registered address.</p>
          
          {contributionsLoading ? (
            <p>Checking your active pickup requests...</p>
          ) : pickupRequested && currentPickupRequest ? (
            <div className="current-pickup-request">
              <div className="request-details">
                <h4>Current Pickup Request</h4>
                <div className="details-card">
                  <p><strong>Items:</strong> {currentPickupRequest.items}</p>
                  <p><strong>Category:</strong> {formatCategoryName(currentPickupRequest.category)}</p>
                  <p><strong>Status:</strong> {currentPickupRequest.status}</p>
                  <p><strong>Requested on:</strong> {new Date(currentPickupRequest.requestDate).toLocaleDateString()}</p>
                </div>
                
                {donationStatus.message && (
                  <p className={`status-message ${donationStatus.type}`}>
                    {donationStatus.message}
                  </p>
                )}
                
                <button onClick={handleConfirmDelivery} className="primary-btn confirm-btn">
                  Confirm Delivery
                </button>
                <button 
                  onClick={handleCancelRequest}
                  className="secondary-btn"
                >
                  Cancel Request
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDonationSubmit} className="pickup-form">
              <div className="form-group">
                <label htmlFor="donation-items-text">Items for Pickup (Description):</label>
                <textarea 
                  id="donation-items-text"
                  value={donationItemsText}
                  onChange={(e) => setDonationItemsText(e.target.value)}
                  required 
                  rows="2"
                ></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="item-category">Category:</label>
                <select
                  id="item-category"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  required
                >
                  <option value="produce">Produce</option>
                  <option value="dairy">Dairy</option>
                  <option value="bakery">Bakery</option>
                  <option value="meat">Meat</option>
                  <option value="frozen">Frozen</option>
                  <option value="canned">Canned Goods</option>
                  <option value="dry">Dry Goods</option>
                  <option value="prepared">Prepared Meals</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {donationStatus.message && (
                <p className={`status-message ${donationStatus.type}`}>
                  {donationStatus.message}
                </p>
              )}

              <button type="submit" className="primary-btn" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? 'Processing...' : 'Request Pickup'}
              </button>
            </form>
          )}
        </div>
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
                    <th>Category</th>
                    <th>Type</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map(donation => (
                    <tr key={donation._id}>
                      <td>{donation.itemName || (donation.items && donation.items.length > 0 ? donation.items[0].name : 'N/A')}</td>
                      <td>{formatCategoryName(donation.category)}</td>
                      <td>{donation.isPickupRequest ? 'Pickup Request' : 'Donation'}</td>
                      <td>{new Date(donation.createdAt).toLocaleDateString()}</td>
                      <td>{donation.status || 'Pending'}</td>
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
      
      {/* Confirm Pickup Tab Content */}
      {activeTab === 'confirmPickup' && renderConfirmPickup()}
    </div>
  );
};

export default IndividualDashboard; 