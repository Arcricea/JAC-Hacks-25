import React, { useState, useContext, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "../../assets/styles/Profile.css";
import { UserContext } from "../../App";
import { saveUser, updateUserAccountType } from "../../services/userService";
import { validateAddress } from '../../services/addressService';
import GoogleMapsScript from '../GoogleMapsScript';

// Define account types available
const accountTypes = ['individual', 'business', 'distributor', 'volunteer', 'organizer'];

// Function to display address object as a string
const displayAddress = (addressObj) => {
  if (!addressObj) return '';
  
  // Check if addressObj is already a string
  if (typeof addressObj === 'string') return addressObj;
  
  const parts = [];
  if (addressObj.street) parts.push(addressObj.street);
  if (addressObj.city) parts.push(addressObj.city);
  if (addressObj.state) parts.push(addressObj.state);
  if (addressObj.zipCode) parts.push(addressObj.zipCode);
  
  return parts.join(', ');
};

const Profile = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const { userData, setUserData } = useContext(UserContext);
  const [nickname, setNickname] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingAccountType, setIsChangingAccountType] = useState(false);
  const [error, setError] = useState("");
  const [accountTypeError, setAccountTypeError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [accountTypeSuccess, setAccountTypeSuccess] = useState("");
  const [address, setAddress] = useState('');
  const [validatedAddress, setValidatedAddress] = useState(null);
  const [addressError, setAddressError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const autocompleteInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [addressSaveStatus, setAddressSaveStatus] = useState({ message: '', type: '' });
  const [selectedAccountType, setSelectedAccountType] = useState(''); // New state for dropdown

  // Set nickname from userData when it becomes available
  useEffect(() => {
    if (userData?.username) {
      setNickname(userData.username);
    }
  }, [userData]);

  useEffect(() => {
    if (userData?.address) {
      // Handle address which could be a string or an object
      if (typeof userData.address === 'object') {
        // Format the object as a string to display in the input field
        const formattedAddress = displayAddress(userData.address);
        setAddress(formattedAddress);
      } else {
        // If it's a string, use it directly
        setAddress(userData.address);
      }
    }
  }, [userData]);

  useEffect(() => {
    if (isEditingAddress && isGoogleLoaded && autocompleteInputRef.current) {
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          autocompleteInputRef.current,
          {
            componentRestrictions: { country: ["us", "ca"] },
            fields: ["formatted_address"],
            types: ["address"]
          }
        );

        const listener = autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
          if (place.formatted_address) {
            const selectedAddressString = place.formatted_address;
            // Update the input field display
            setAddress(selectedAddressString); 
            
            // Mark as validated with no additional validation needed
            setValidatedAddress({ validated: true });
            
            // Show temporary feedback
            setAddressSaveStatus({ 
              message: "✓ Address selected", 
              type: 'success' 
            });
            setTimeout(() => setAddressSaveStatus({ message: '', type: '' }), 3000);
          }
        });

        return () => {
          if (listener) {
            window.google.maps.event.removeListener(listener);
          }
          if (autocompleteRef.current) {
            window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          }
        };
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
        setAddressError('Error initializing address autocomplete');
      }
    }
  }, [isEditingAddress, isGoogleLoaded]);

  // Initialize selectedAccountType when userData loads
  useEffect(() => {
    if (userData?.accountType) {
      setSelectedAccountType(userData.accountType);
    } else if (accountTypes.length > 0) {
      // Default to the first type if user has no type yet
      setSelectedAccountType(accountTypes[0]); 
    }
  }, [userData]);

  // Monitor userData changes from context
  useEffect(() => {
    console.log('UserContext userData changed:', userData);
  }, [userData]);

  const handleGoogleMapsLoad = () => {
    setIsGoogleLoaded(true);
  };

  if (isLoading) {
    return <div className="profile-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleUpdateNickname = async () => {
    setIsSaving(true);
    setError("");
    
    try {
      // Save to both localStorage and database
      localStorage.setItem(`user_nickname_${user.sub}`, nickname);
      
      if (userData) {
        // Update in database - pass auth0Id as the second parameter
        await saveUser({
          auth0Id: user.sub,
          username: nickname,
          accountType: userData.accountType || 'individual'
        }, user.sub); // Pass the user's Auth0 ID as requestingUserId
        
        // Update the global userData state
        setUserData(prev => ({
          ...prev,
          username: nickname
        }));
      }
      
      // Show success message
      setSuccessMessage("Username updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Exit edit mode
      setIsEditingUsername(false);
    } catch (err) {
      setError("Failed to update username. Please try again.");
      console.error("Error updating username:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Modified function to handle changing to ANY account type
  const handleChangeAccountType = async () => {
    if (!userData?.auth0Id) {
      setAccountTypeError("User profile not properly loaded. Please try again later.");
      return;
    }
    if (!selectedAccountType) {
      setAccountTypeError("Please select an account type.");
      return;
    }
    if (selectedAccountType === userData.accountType) {
        setAccountTypeError("You already have this account type.");
        return;
    }

    setIsChangingAccountType(true);
    setAccountTypeError("");
    setAccountTypeSuccess(""); // Clear previous success message

    try {
      // Log the user ID before making the call
      console.log('handleChangeAccountType: Attempting to save with requestingUserId:', userData?.auth0Id);

      // Update account type to the selected type
      const response = await saveUser({
        auth0Id: userData.auth0Id,
        username: userData.username,
        accountType: selectedAccountType // Use the selected type
      }, userData.auth0Id); // Pass requestingUserId here

      if (response.success) {
        const newType = response.data.accountType || selectedAccountType; // Use response data if available

        // Update local state
        setUserData(prev => ({
          ...prev,
          accountType: newType
        }));

        // Update localStorage
        localStorage.setItem(`user_type_${user.sub}`, newType);
        localStorage.setItem(`user_type_set_${user.sub}`, 'true');

        // Show success message
        setAccountTypeSuccess(`Account type successfully changed to ${formatAccountType(newType)}! Reloading...`);
        setTimeout(() => {
          setAccountTypeSuccess("");
          // Reload the page to ensure all data is refreshed
          window.location.reload();
        }, 2000); // Shorter timeout
      } else {
        setAccountTypeError(`Failed to update account type: ${response.message || 'Please try again.'}`);
      }
    } catch (err) {
      setAccountTypeError("An error occurred. Please try again later.");
      console.error("Error changing account type:", err);
    } finally {
      setIsChangingAccountType(false);
    }
  };

  const handleAddressChange = (e) => {
    setAddress(e.target.value);
    // Reset validation when user types manually
    setValidatedAddress(null);
    setAddressError('');
    setAddressSaveStatus({ message: '', type: '' });
  };

  const handleValidateAddress = async (addressToValidate = address) => {
    // Check if the addressToValidate is valid before trying to trim it
    if (!addressToValidate || 
        (typeof addressToValidate === 'string' && !addressToValidate.trim()) ||
        (typeof addressToValidate === 'object' && 
         (!addressToValidate.street || !addressToValidate.street.trim()))) {
      setAddressError('Please enter an address');
      return;
    }

    setIsValidating(true);
    setAddressError('');

    try {
      // If addressToValidate is an object, convert it to string
      const addressString = typeof addressToValidate === 'object' 
        ? displayAddress(addressToValidate)
        : addressToValidate;
        
      // Just set the address - no need for complex validation
      setAddress(addressString);
      setValidatedAddress({ validated: true });
      setAddressError('');
    } catch (error) {
      console.error('Error validating address:', error);
      setAddressError('Please enter a valid address');
      setValidatedAddress(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveAddress = async () => {
    // Check if the address was selected from dropdown
    if (!validatedAddress || !validatedAddress.validated) {
      setAddressSaveStatus({
        message: '⚠ Please select an address from the dropdown suggestions',
        type: 'error'
      });
      return;
    }

    setIsSaving(true);
    setAddressSaveStatus({ message: '', type: '' }); // Clear previous status

    try {
      // Prepare a simpler payload with the address as a string in the street field
      // This matches how the dashboard handles addresses
      const payload = {
        auth0Id: userData.auth0Id,
        username: userData.username,
        accountType: userData.accountType || 'individual',
        address: {
          street: address.trim()
        },
        ...(userData.needStatus && { needStatus: userData.needStatus })
      };
      
      console.log('Payload being sent to saveUser:', payload);
      
      // Send the payload to the server
      const response = await saveUser(payload, userData.auth0Id);
      
      console.log('Response received from saveUser:', response);
      
      if (response.success) {
        setUserData(response.data);
        setIsEditingAddress(false);
        setValidatedAddress(null); // Clear validation state
        setAddressSaveStatus({
          message: "✓ Address saved successfully!",
          type: 'success'
        });
        setTimeout(() => setAddressSaveStatus({ message: '', type: '' }), 3000);
      } else {
        throw new Error(response.message || 'Failed to save address');
      }
    } catch (error) {
      console.error('Save address error:', error);
      setAddressSaveStatus({
        message: `⚠ Error saving address: ${error.message}. Please try again.`,
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExampleClick = () => {
    const exampleAddress = "123 Main Street, Boston, MA 02108";
    setAddress(exampleAddress);
    if (autocompleteInputRef.current) {
      autocompleteInputRef.current.value = exampleAddress;
    }
  };

  return (
    <>
      <GoogleMapsScript onLoad={handleGoogleMapsLoad} />
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <img src={user.picture} alt={user.name} className="profile-picture" />
            <h2>{user.name}</h2>
            <p className="profile-email">{user.email}</p>
          </div>
          
          <div className="profile-username-section">
            <h3>Username</h3>
            {isEditingUsername ? (
              <div className="username-edit">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter a username"
                  className="username-input"
                />
                <div className="address-buttons">
                  <button 
                    onClick={handleUpdateNickname} 
                    disabled={isSaving}
                    className="primary-btn"
                  >
                    {isSaving ? "Saving..." : "Save Username"}
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingUsername(false);
                      setNickname(userData?.username || "");
                    }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
                {error && <p className="error-message">{error}</p>}
              </div>
            ) : (
              <div className="username-display">
                <p>{nickname || "No username set"}</p>
                <button 
                  onClick={() => setIsEditingUsername(true)}
                  className="edit-username-btn"
                >
                  Edit
                </button>
              </div>
            )}
            {successMessage && <p className="success-message">{successMessage}</p>}
          </div>
          
          <div className="profile-account-type">
            <h3>Account Type</h3>
            <p>{userData?.accountType ? formatAccountType(userData.accountType) : "Not set"}</p>
            
            {/* Debug: Allow changing to any account type */}
            <div className="change-account-type-debug">
              <p className="debug-info"><strong>Debug:</strong> Change Account Type</p>
              <div className="account-type-controls">
                <select 
                  value={selectedAccountType}
                  onChange={(e) => setSelectedAccountType(e.target.value)}
                  disabled={isChangingAccountType}
                  className="account-type-select"
                >
                  {accountTypes.map(type => (
                    <option key={type} value={type}>
                      {formatAccountType(type)}
                    </option>
                  ))}
                </select>
                <button 
                  className="change-type-btn"
                  onClick={handleChangeAccountType} // Use the new handler
                  disabled={isChangingAccountType || selectedAccountType === userData?.accountType}
                >
                  {isChangingAccountType ? "Processing..." : "Change Type"}
                </button>
              </div>
              {accountTypeError && <p className="error-message">{accountTypeError}</p>}
              {accountTypeSuccess && <p className="success-message">{accountTypeSuccess}</p>}
            </div>
            
            {/* Original Volunteer Option - Kept for reference or potential future use, maybe commented out */}
            {/* {userData?.accountType !== 'volunteer' && (
              <div className="volunteer-option">
                <p className="volunteer-info">Want to help distribute food and earn community service hours?</p>
                <button 
                  className="become-volunteer-btn"
                  onClick={handleBecomeVolunteer} // Keep original handler if needed elsewhere or rename it
                  disabled={isChangingAccountType}
                >
                  {isChangingAccountType ? "Processing..." : "Become a Volunteer"}
                </button>
                {accountTypeError && <p className="error-message">{accountTypeError}</p>}
                {accountTypeSuccess && <p className="success-message">{accountTypeSuccess}</p>}
              </div>
            )} */}
          </div>
          
          <div className="profile-section">
            <h3>Address Information</h3>
            {!isEditingAddress ? (
              <div className="address-display">
                {/* Refine check: Ensure address object exists AND has a street property */}
                {userData?.address?.street ? ( 
                  <>
                    {/* Use the display helper function */}
                    <p>{displayAddress(userData.address)}</p> 
                    <button 
                      className="edit-btn"
                      onClick={() => setIsEditingAddress(true)}
                    >
                      Edit Address
                    </button>
                  </>
                ) : (
                  <button 
                    className="primary-btn"
                    onClick={() => setIsEditingAddress(true)}
                  >
                    Add Address 
                  </button>
                )}
              </div>
            ) : (
              <div className="address-form">
                <div className="form-group">
                  <label>Address</label>
                  <div className="address-input-wrapper">
                    <input
                      ref={autocompleteInputRef}
                      type="text"
                      value={address}
                      onChange={handleAddressChange}
                      placeholder="Enter your address"
                      className={addressError ? 'error' : ''}
                      disabled={!isGoogleLoaded}
                    />
                  </div>
                  {!isGoogleLoaded && (
                    <span className="loading-text">Loading address autocomplete...</span>
                  )}
                  {addressError && (
                    <span className="error-text">{addressError}</span>
                  )}
                  <span className="helper-text">
                    Start typing and select an address from the dropdown suggestions
                  </span>
                  {!validatedAddress?.validated && (
                    <span className="warning-text">
                      You must select an address from the dropdown to continue
                    </span>
                  )}
                </div>

                <div className="address-actions-container">
                  <div className="address-buttons">
                    <button
                      className="primary-btn"
                      onClick={handleSaveAddress}
                      disabled={isSaving || !validatedAddress?.validated}
                    >
                      {isSaving ? 'Saving...' : 'Save Address'}
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => {
                        setIsEditingAddress(false);
                        setAddress(userData?.address || '');
                        setAddressSaveStatus({ message: '', type: '' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  
                  {addressSaveStatus.message && (
                    <div className={`status-message ${addressSaveStatus.type}`}>
                      {addressSaveStatus.message}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="profile-details">
            {user.sub && <p><strong>Auth0 ID:</strong> {user.sub}</p>}
            {user.updated_at && (
              <p>
                <strong>Last Updated:</strong>{" "}
                {new Date(user.updated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Helper function to format account type for display
function formatAccountType(type) {
  const types = {
    individual: "Individual User",
    business: "Business / Restaurant",
    distributor: "Food Bank / Distributor",
    volunteer: "Volunteer",
    organizer: "Event Organizer"
  };
  return types[type] || type; // Return the formatted type or the original key
}

export default Profile; 