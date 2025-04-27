import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../App';
import { updateNeedStatus, saveUser, getUserByAuth0Id } from '../services/userService';
import '../assets/styles/Dashboard.css';
import '../assets/styles/FoodBankDashboard.css';
import GoogleMapsScript from '../components/GoogleMapsScript';
import { useAuth0 } from '@auth0/auth0-react';

// Import the new editable components
import EditableNeedStatus from '../components/EditableNeedStatus';
import EditableContactField from '../components/EditableContactField';

// Assume priorityLevels and getPriorityInfo are defined here or imported
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

const FoodBankDashboard = ({ previewTargetUserId, onUpdate }) => {
  const { userData: adminUserData, setUserData: setAdminUserData } = useContext(UserContext);
  const { user: auth0User } = useAuth0();
  const [displayUserData, setDisplayUserData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  
  // <<< RESTORE useState hooks for editable fields >>>
  const [priorityLevel, setPriorityLevel] = useState(3); // Default
  const [customStatusMessage, setCustomStatusMessage] = useState('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSaveStatus, setContactSaveStatus] = useState({ message: '', type: '' });
  const autocompleteInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [addressError, setAddressError] = useState('');
  // <<< END RESTORED useState hooks >>>

  useEffect(() => {
    const loadDisplayData = async () => {
      setIsLoadingData(true);
      setDataError('');
      const requestingUserId = adminUserData?.auth0Id;
      if (!requestingUserId) {
        setDataError('Admin user data not available.');
        setIsLoadingData(false);
        return;
      }

      try {
        let fetchedData;
        const targetUserId = previewTargetUserId || requestingUserId;
        console.log(`Loading data for ${targetUserId} as admin ${requestingUserId}`);
        const response = await getUserByAuth0Id(targetUserId, requestingUserId);
        if (response.success) {
          fetchedData = response.data;
        } else {
          throw new Error(response.message || 'Failed to fetch user data');
        }
        setDisplayUserData(fetchedData);
      } catch (err) {
        console.error("Error loading display user data:", err);
        setDataError(err.message || 'Failed to load user data');
        setDisplayUserData(null);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (adminUserData) {
       loadDisplayData();
    } else {
        setIsLoadingData(true);
    }
  }, [previewTargetUserId, adminUserData]);

  useEffect(() => {
    if (displayUserData) {
      // Initialize need status state
      setPriorityLevel(displayUserData.needStatus?.priorityLevel || 3);
      setCustomStatusMessage(displayUserData.needStatus?.customMessage || '');

      // Initialize contact state
      setAddress(displayUserData.address || '');
      setEmail(displayUserData.email || auth0User?.email || ''); 
      setPhone(displayUserData.phone || '');
      setOpeningHours(displayUserData.openingHours || '');
      
      setIsEditingStatus(false);
      setEditingField(null);
    } else {
      // Reset state if displayUserData is null
      setPriorityLevel(3);
      setCustomStatusMessage('');
      setAddress('');
      setEmail(auth0User?.email || '');
      setPhone('');
      setOpeningHours('');
    }
  }, [displayUserData, auth0User]);

  const handleSave = async (userId, dataToSave) => {
    const requestingUserId = adminUserData?.auth0Id;
    if (!userId || !requestingUserId) {
      throw new Error("User ID or requesting User ID missing.");
    }

    let updatedUser = null;
    if (dataToSave.hasOwnProperty('priorityLevel') || dataToSave.hasOwnProperty('customMessage')) {
        // Need Status Save (PUT /set-need)
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/users/set-need/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Requesting-User-Id': requestingUserId },
            body: JSON.stringify(dataToSave),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to save status');
        }
        updatedUser = result.data;
    } else {
        // Contact Field Save (POST /users)
        const payload = { auth0Id: userId, ...dataToSave };
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requesting-User-Id': requestingUserId },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to save contact field');
        }
        updatedUser = result.data;
    }

    // Update local state and notify parent if in preview
    if (updatedUser) {
        setDisplayUserData(prev => prev ? { ...prev, ...updatedUser } : updatedUser);
        if (previewTargetUserId && onUpdate) {
            onUpdate(updatedUser);
        }
    }
  };
  
  const handleGoogleMapsLoad = () => {
    setIsGoogleLoaded(true);
  };

  const renderPriorityBadge = (level) => {
    const priorityInfo = priorityLevels.find(p => p.level === level);
    if (!priorityInfo) return null;
    return (
      <div 
        className="priority-badge" 
        style={{ backgroundColor: priorityInfo.color }}
      >
        {priorityInfo.label}
      </div>
    );
  };

  const renderContactField = (fieldName, label, value, placeholder) => {
    const isEditing = editingField === fieldName;
    const InputComponent = (fieldName === 'openingHours' || fieldName === 'address') ? 'textarea' : 'input';
    const inputType = fieldName === 'email' ? 'email' : fieldName === 'phone' ? 'tel' : 'text';

    return (
      <div className="contact-field">
        <h4>{label}</h4>
        <div className="status-message-display">
          {isEditing ? (
            <>
              <InputComponent
                ref={fieldName === 'address' ? autocompleteInputRef : null}
                className="editable-content"
                type={InputComponent === 'input' ? inputType : undefined}
                value={value}
                onChange={(e) => {
                  const newValue = e.target.value;
                  switch(fieldName) {
                    case 'address': setAddress(newValue); break;
                    case 'email': setEmail(newValue); break;
                    case 'phone': setPhone(newValue); break;
                    case 'openingHours': setOpeningHours(newValue); break;
                    default: break;
                  }
                }}
                placeholder={placeholder}
                disabled={fieldName === 'address' && !isGoogleLoaded}
                rows={InputComponent === 'textarea' ? 3 : undefined}
                style={{ paddingRight: '60px' }}
              />
              <div className="edit-actions">
                 <button className="save-btn" onClick={handleSaveContact} disabled={isSavingContact}>✓</button>
                 <button className="cancel-btn" onClick={() => {
                    setEditingField(null);
                    if(displayUserData) {
                       setAddress(displayUserData.address || '');
                       setEmail(displayUserData.email || auth0User?.email || '');
                       setPhone(displayUserData.phone || '');
                       setOpeningHours(displayUserData.openingHours || '');
                    }
                    setContactSaveStatus({ message: '', type: '' });
                  }}>×</button>
              </div>
            </>
          ) : (
            <>
              <span className="display-content">{value || placeholder || 'Not set'}</span>
              <button className="edit-btn" onClick={() => setEditingField(fieldName)}>✏️</button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Handler for saving need status
  const handleSaveStatus = async () => {
    const targetUserId = previewTargetUserId || adminUserData?.auth0Id;
    const requestingUserId = adminUserData?.auth0Id;
    if (!targetUserId || !requestingUserId) {
      console.error('Target User ID or Requesting User ID not found');
      return;
    }
    
    setIsSavingStatus(true);
    try {
      const dataToSave = {
        priorityLevel,
        customMessage: customStatusMessage
      };
      
      console.log('Saving need status:', dataToSave, 'for user:', targetUserId, 'by user:', requestingUserId);
      
      const response = await updateNeedStatus(targetUserId, dataToSave, requestingUserId);
      
      if (response && response.success) {
         console.log('Need status saved successfully');
         setDisplayUserData(prev => prev ? { ...prev, needStatus: response.data.needStatus } : null);
         if (!previewTargetUserId) {
            setAdminUserData(prev => prev ? { ...prev, needStatus: response.data.needStatus } : null);
         } else if (onUpdate) {
            onUpdate(response.data);
         }
         setIsEditingStatus(false);
      } else {
        console.error('Failed to save need status:', response);
      }
    } catch (error) {
      console.error('Error saving need status:', error);
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Handler for saving contact information
  const handleSaveContact = async () => {
    const targetUserId = previewTargetUserId || adminUserData?.auth0Id;
    const requestingUserId = adminUserData?.auth0Id;
    if (!targetUserId || !requestingUserId) {
      console.error('Target User ID or Requesting User ID not found');
      setContactSaveStatus({ message: '⚠ Cannot save contact info: User ID missing.', type: 'error' });
      return;
    }
    
    setIsSavingContact(true);
    setContactSaveStatus({ message: '', type: '' });

    try {
      const updatedUserDataPayload = {
        auth0Id: targetUserId,
        ...(editingField === 'address' && { address: address.trim() }),
        ...(editingField === 'email' && { email: email.trim() }),
        ...(editingField === 'phone' && { phone: phone.trim() }),
        ...(editingField === 'openingHours' && { openingHours: openingHours.trim() }),
      };

      if (!updatedUserDataPayload.auth0Id || Object.keys(updatedUserDataPayload).length <= 1) {
        console.log("No changes detected to save.");
        setEditingField(null);
        setIsSavingContact(false);
        return;
      }

      console.log('Saving contact information payload:', updatedUserDataPayload, 'by user:', requestingUserId);
      
      const response = await saveUser(updatedUserDataPayload, requestingUserId);
      
      if (response && response.success) {
        console.log('Contact info saved successfully for:', targetUserId);
        setDisplayUserData(prev => prev ? { ...prev, ...response.data } : response.data );
        if (!previewTargetUserId) {
          setAdminUserData(prev => prev ? { ...prev, ...response.data } : response.data);
        } else if (onUpdate) {
           onUpdate(response.data);
        }
        setEditingField(null);
        setContactSaveStatus({
          message: "✓ Contact information saved successfully!",
          type: 'success'
        });
        setTimeout(() => setContactSaveStatus({ message: '', type: '' }), 3000);
      } else {
        throw new Error(response?.message || 'Failed to save contact information');
      }
    } catch (error) {
      console.error('Error saving contact information:', error);
      setContactSaveStatus({
        message: `⚠ ${error.message || 'Error saving contact information. Please try again.'}`, 
        type: 'error'
      });
    } finally {
      setIsSavingContact(false);
    }
  };

  // Update need status when priority level changes (if not in editing mode)
  useEffect(() => {
    if (adminUserData?.auth0Id && !isEditingStatus && adminUserData.needStatus?.priorityLevel !== priorityLevel) {
      console.log('Priority level changed, saving...');
      handleSaveStatus();
    }
  }, [priorityLevel]);
  
  // Initialize Google Maps autocomplete when editing address
  useEffect(() => {
    if (editingField === 'address' && isGoogleLoaded && autocompleteInputRef.current) {
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
  }, [editingField, isGoogleLoaded]);

  if (isLoadingData) {
     return <div className="dashboard-loading">Loading User Data...</div>;
  }
  if (dataError) {
     return <div className="dashboard-error">Error: {dataError}</div>;
  }
  if (!displayUserData) {
     return <div className="dashboard-error">Could not load user data.</div>;
  }
  
  return (
    <>
     <GoogleMapsScript onLoad={handleGoogleMapsLoad} />
     <div className="dashboard-content food-bank-dashboard">
        {previewTargetUserId ? (
           <h2>Food Bank Preview ({displayUserData.username || displayUserData.businessName || 'N/A'})</h2>
        ) : (
           <h1>Food Bank Dashboard</h1>
        )}

        <section className="dashboard-section need-status-section">
            <h3>Current Need Status</h3>
            <div className="status-display">
                {renderPriorityBadge(priorityLevel)}
                {isEditingStatus ? (
                    <input 
                        type="text" 
                        value={customStatusMessage}
                        onChange={(e) => setCustomStatusMessage(e.target.value)}
                        className="status-message-input"
                        placeholder="Enter a brief status message..."
                    />
                ) : (
                    <p className="status-message-display">{customStatusMessage || 'No specific message'}</p>
                )}
            </div>
            
            <div className="update-status-controls">
                <h4>Update Need Status:</h4>
                <div className="priority-selector">
                    {priorityLevels.map(p => (
                        <button 
                            key={p.level}
                            className={`priority-option ${priorityLevel === p.level ? 'selected' : ''}`}
                            onClick={() => setPriorityLevel(p.level)}
                            style={{ borderColor: p.color }}
                        >
                           <span>{p.level}</span> {p.label}
                        </button>
                    ))}
                </div>
                 <button 
                    className="edit-status-message-btn" 
                    onClick={() => setIsEditingStatus(!isEditingStatus)}
                >
                    {isEditingStatus ? 'Hide Message Input' : 'Edit Status Message'}
                </button>
                 <button 
                    className="save-status-btn" 
                    onClick={handleSaveStatus}
                    disabled={isSavingStatus}
                >
                    {isSavingStatus ? 'Saving...' : 'Save Need Status'}
                </button>
            </div>
        </section>

        <section className="dashboard-section contact-info-section">
            <h3>Contact Information</h3>
            {renderContactField('address', 'Address', address, 'No address provided')}
            {renderContactField('email', 'Email', email, 'No email provided')}
            {renderContactField('phone', 'Phone', phone, 'No phone provided')}
            {renderContactField('openingHours', 'Opening Hours', openingHours, 'No opening hours provided')}
             {contactSaveStatus.message && (
               <div className={`status-message ${contactSaveStatus.type === 'error' ? 'error' : 'success'}`}>
                 {contactSaveStatus.message}
               </div>
             )}
        </section>
     </div>
    </>
  );
};

export default FoodBankDashboard; 