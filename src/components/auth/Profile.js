import React, { useState, useContext, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "../../assets/styles/Profile.css";
import { UserContext } from "../../App";
import { saveUser, updateUserAccountType } from "../../services/userService";
import { validateAddress } from '../../services/addressService';
import GoogleMapsScript from '../GoogleMapsScript';

// Define account types available
const accountTypes = ['individual', 'business', 'distributor', 'volunteer', 'organizer'];

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
      setAddress(userData.address);
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
            
            // Now, automatically validate the selected address to get components
            handleValidateAddress(selectedAddressString); 

            // Show temporary feedback (optional, validation provides its own)
            // setAddressSaveStatus({ 
            //   message: "✓ Address selected, validating...", 
            //   type: 'info' 
            // });
            // setTimeout(() => setAddressSaveStatus({ message: '', type: '' }), 3000);
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
        // Update in database
        await saveUser({
          auth0Id: user.sub,
          username: nickname,
          accountType: userData.accountType || 'individual'
        });
        
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
    setValidatedAddress(null);
    setAddressError('');
  };

  const handleValidateAddress = async (addressToValidate = address) => {
    if (!addressToValidate.trim()) {
      setAddressError('Please enter an address');
      return;
    }

    setIsValidating(true);
    setAddressError('');

    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: addressToValidate }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0]);
          } else {
            reject(new Error('Address validation failed'));
          }
        });
      });

      const addressComponents = {
        formatted: result.formatted_address,
        street_number: '',
        street_name: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        validated: true
      };

      // Extract address components
      result.address_components.forEach(component => {
        const types = component.types;
        if (types.includes('street_number')) {
          addressComponents.street_number = component.long_name;
        } else if (types.includes('route')) {
          addressComponents.street_name = component.long_name;
        } else if (types.includes('locality')) {
          addressComponents.city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          addressComponents.state = component.short_name;
        } else if (types.includes('postal_code')) {
          addressComponents.zip = component.long_name;
        } else if (types.includes('country')) {
          addressComponents.country = component.short_name;
        }
      });

      // --- Add Logging --- 
      console.log("Extracted Address Components:", addressComponents);
      // --- End Logging ---

      setValidatedAddress(addressComponents);
      setAddress(result.formatted_address);
    } catch (error) {
      console.error('Error validating address:', error);
      setAddressError('Please enter a valid address');
      setValidatedAddress(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveAddress = async () => {
    // Use the validated address data if available
    if (!validatedAddress || !validatedAddress.validated) { 
      setAddressSaveStatus({
          message: '⚠ Please select a valid address from suggestions first.',
          type: 'error'
      });
      // Optionally re-trigger validation if desired
      // handleValidateAddress(address);
      return;
    }

    setIsSaving(true);
    setAddressSaveStatus({ message: '', type: '' }); // Clear previous status

    // Prepare the address object in the format the backend expects
    const addressData = {
        street: `${validatedAddress.street_number || ''} ${validatedAddress.street_name || ''}`.trim(),
        city: validatedAddress.city || '',
        state: validatedAddress.state || '',
        zip: validatedAddress.zip || ''
        // country: validatedAddress.country || '' // Add if needed
    };
    
    // Check if essential parts are present after extraction
    if (!addressData.street || !addressData.city || !addressData.zip) {
        setAddressSaveStatus({
          message: '⚠ Validation result missing required fields (street, city, zip). Please try again.',
          type: 'error'
        });
        setIsSaving(false);
        return;
    }

    // --- Add Logging before sending --- 
    console.log('Attempting to save address with data:', addressData);
    const payload = {
      auth0Id: userData.auth0Id,
      username: userData.username,
      accountType: userData.accountType || 'individual',
      address: addressData, // Send the structured object
      ...(userData.needStatus && { needStatus: userData.needStatus })
    };
    console.log('Payload being sent to saveUser:', payload);
    // --- End Logging ---

    try {
      // Send the structured addressData object
      const response = await saveUser(payload); // Pass the constructed payload

      // --- Add Logging for response --- 
      console.log('Response received from saveUser:', response);
      // --- End Logging ---

      if (response.success) {
        // --- Add Logging before state update --- 
        console.log('Save successful, updating userData context with:', response.data);
        // --- End Logging ---
        setUserData(response.data);
        setIsEditingAddress(false);
        setValidatedAddress(null); // Clear validation state after successful save
        setAddressSaveStatus({
          message: "✓ Address saved successfully!",
          type: 'success'
        });
        setTimeout(() => setAddressSaveStatus({ message: '', type: '' }), 3000);
      } else {
         // Log specific failure message from backend
        console.error('Backend indicated save failure:', response.message);
        throw new Error(response.message || 'Failed to save address (backend)');
      }
    } catch (error) {
      console.error('Save address error (catch block):', error);
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

  // Improve address display when not editing
  const displayAddress = (addr) => {
    if (!addr) return "No address set";
    if (typeof addr === 'string') return addr; // Handle old string addresses
    // Format the address object for display
    const parts = [
      addr.street,
      addr.city,
      addr.state,
      addr.zip
    ];
    return parts.filter(part => part).join(', '); // Join non-empty parts
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
                      onChange={(e) => setAddress(e.target.value)}
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
                </div>

                <div className="address-actions-container">
                  <div className="address-buttons">
                    <button
                      className="primary-btn"
                      onClick={handleSaveAddress}
                      disabled={isSaving || !address.trim()}
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