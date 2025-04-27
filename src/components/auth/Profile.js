import React, { useState, useContext, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "../../assets/styles/Profile.css";
import { UserContext } from "../../App";
import { saveUser, updateUserAccountType } from "../../services/userService";
import { validateAddress } from '../../services/addressService';
import GoogleMapsScript from '../GoogleMapsScript';

const Profile = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const { userData, setUserData } = useContext(UserContext);
  const [nickname, setNickname] = useState("");
  const [isEditing, setIsEditing] = useState(false);
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
    if (isEditing && isGoogleLoaded && autocompleteInputRef.current) {
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
            setAddress(place.formatted_address);
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
  }, [isEditing, isGoogleLoaded]);

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
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update username. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBecomeVolunteer = async () => {
    if (!userData?.auth0Id) {
      setAccountTypeError("User profile not properly loaded. Please try again later.");
      return;
    }

    setIsChangingAccountType(true);
    setAccountTypeError("");

    try {
      // Update account type to volunteer
      const response = await saveUser({
        auth0Id: userData.auth0Id,
        username: userData.username,
        accountType: 'volunteer'
      });

      if (response.success) {
        // Update local state
        setUserData(prev => ({
          ...prev,
          accountType: 'volunteer'
        }));

        // Update localStorage
        localStorage.setItem(`user_type_${user.sub}`, 'volunteer');
        localStorage.setItem(`user_type_set_${user.sub}`, 'true');

        // Show success message
        setAccountTypeSuccess("You are now registered as a volunteer! Go to the dashboard to see your volunteer QR code.");
        setTimeout(() => {
          setAccountTypeSuccess("");
          // Reload the page to ensure all data is refreshed
          window.location.reload();
        }, 3000);
      } else {
        setAccountTypeError("Failed to update account type. Please try again.");
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
    if (!address.trim()) {
      setAddressError('Please enter an address');
      return;
    }

    setIsSaving(true);
    try {
      // Make sure we're sending all required fields
      const response = await saveUser({
        auth0Id: userData.auth0Id,
        username: userData.username,
        accountType: userData.accountType || 'individual',
        address: address.trim(),
        ...(userData.needStatus && { needStatus: userData.needStatus })
      });

      if (response.success) {
        setUserData(response.data);
        setIsEditing(false);
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
        message: '⚠ Error saving address. Please try again.',
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
            {isEditing ? (
              <div className="username-edit">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter a username"
                  className="username-input"
                />
                <div className="username-actions">
                  <button 
                    onClick={handleUpdateNickname} 
                    disabled={isSaving}
                    className="save-username-btn"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
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
                  onClick={() => setIsEditing(true)}
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
            
            {userData?.accountType !== 'volunteer' && (
              <div className="volunteer-option">
                <p className="volunteer-info">Want to help distribute food and earn community service hours?</p>
                <button 
                  className="become-volunteer-btn"
                  onClick={handleBecomeVolunteer}
                  disabled={isChangingAccountType}
                >
                  {isChangingAccountType ? "Processing..." : "Become a Volunteer"}
                </button>
                {accountTypeError && <p className="error-message">{accountTypeError}</p>}
                {accountTypeSuccess && <p className="success-message">{accountTypeSuccess}</p>}
              </div>
            )}
          </div>
          
          <div className="profile-section">
            <h3>Address Information</h3>
            {!isEditing ? (
              <div className="address-display">
                {userData?.address ? (
                  <>
                    <p>{userData.address}</p>
                    <button 
                      className="edit-btn"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit Address
                    </button>
                  </>
                ) : (
                  <button 
                    className="primary-btn"
                    onClick={() => setIsEditing(true)}
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
                        setIsEditing(false);
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
    volunteer: "Volunteer"
  };
  return types[type] || type;
}

export default Profile; 