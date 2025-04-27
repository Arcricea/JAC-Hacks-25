import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../App';
import { updateNeedStatus, saveUser, getUserByAuth0Id } from '../services/userService';
import '../assets/styles/Dashboard.css';
import '../assets/styles/FoodBankDashboard.css';
import GoogleMapsScript from '../components/GoogleMapsScript';
import { useAuth0 } from '@auth0/auth0-react';

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
  
  // State for editing UI
  const [priorityLevel, setPriorityLevel] = useState(3);
  const [customStatusMessage, setCustomStatusMessage] = useState('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [editingField, setEditingField] = useState(null); // null | 'address' | 'email' | 'phone' | 'openingHours'
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSaveStatus, setContactSaveStatus] = useState({ message: '', type: '' }); // 'success', 'error', 'info'
  const autocompleteInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [addressError, setAddressError] = useState('');

  // Effect to load initial data
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
        const targetUserId = previewTargetUserId || requestingUserId;
        const response = await getUserByAuth0Id(targetUserId, requestingUserId);
        if (response.success) {
          setDisplayUserData(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch user data');
        }
      } catch (err) {
        console.error("Error loading display user data:", err);
        setDataError(err.message || 'Failed to load user data');
        setDisplayUserData(null);
      } finally {
        setIsLoadingData(false);
      }
    };
    if (adminUserData) loadDisplayData();
  }, [previewTargetUserId, adminUserData]);

  // Effect to synchronize local edit state with loaded data
  useEffect(() => {
    if (displayUserData) {
      setPriorityLevel(displayUserData.needStatus?.priorityLevel || 3);
      setCustomStatusMessage(displayUserData.needStatus?.customMessage || '');
      setAddress(displayUserData.address || '');
      setEmail(displayUserData.email || auth0User?.email || ''); 
      setPhone(displayUserData.phone || '');
      setOpeningHours(displayUserData.openingHours || '');
      // Reset editing state when data reloads
      setIsEditingStatus(false);
      setEditingField(null);
    } else {
      // Reset state if displayUserData is null (e.g., on error)
      setPriorityLevel(3);
      setCustomStatusMessage('');
      setAddress('');
      setEmail(auth0User?.email || '');
      setPhone('');
      setOpeningHours('');
    }
  }, [displayUserData, auth0User]); // Rerun when displayUserData changes

  // Generalized save function (used by status and contact saves)
  const handleSave = async (userId, dataToSave) => {
    const requestingUserId = adminUserData?.auth0Id;
    if (!userId || !requestingUserId) {
      throw new Error("User ID or requesting User ID missing.");
    }

    let apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/users`;
    let method = 'POST';
    let payload = { auth0Id: userId, ...dataToSave };

    if (dataToSave.hasOwnProperty('priorityLevel') || dataToSave.hasOwnProperty('customMessage')) {
        apiUrl = `${apiUrl}/set-need/${userId}`;
        method = 'PUT';
        payload = dataToSave; // PUT expects only the data to update
    }

    const response = await fetch(apiUrl, {
        method: method,
            headers: { 'Content-Type': 'application/json', 'X-Requesting-User-Id': requestingUserId },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save data');
    }

    // Update local state and notify parent if in preview
    if (result.data) {
        setDisplayUserData(prev => prev ? { ...prev, ...result.data } : result.data);
        if (previewTargetUserId && onUpdate) {
            onUpdate(result.data);
        }
    }
    return result.data; // Return updated data
  };
  
  const handleGoogleMapsLoad = () => {
    setIsGoogleLoaded(true);
  };

  // Handler for saving need status
  const handleSaveStatus = async () => {
    const targetUserId = previewTargetUserId || adminUserData?.auth0Id;
    if (!targetUserId) return;
    
    setIsSavingStatus(true);
    try {
      const dataToSave = {
        priorityLevel,
        customMessage: customStatusMessage
      };
      await handleSave(targetUserId, dataToSave); // Use generalized save
      setIsEditingStatus(false); // Close edit UI on success
    } catch (error) {
      console.error('Error saving need status:', error);
      // Consider setting an error message state here
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Handler for saving contact information
  const handleSaveContact = async (fieldName) => {
    const targetUserId = previewTargetUserId || adminUserData?.auth0Id;
    if (!targetUserId) return;
    
    setIsSavingContact(true);
    setContactSaveStatus({ message: 'Saving...', type: 'info' });
    setAddressError('');

    let dataToSave = {};
    switch (fieldName) {
        case 'address':
            if (!address || address.trim() === '') {
                setAddressError('Address cannot be empty.'); setIsSavingContact(false);
                setContactSaveStatus({ message: 'Validation failed.', type: 'error' }); return;
            }
            dataToSave = { address: address.trim() }; break;
        case 'email':
            if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
                 setContactSaveStatus({ message: 'Invalid email format.', type: 'error' }); setIsSavingContact(false); return;
            }
            dataToSave = { email: email.trim() }; break;
        case 'phone': dataToSave = { phone: phone.trim() }; break;
        case 'openingHours': dataToSave = { openingHours: openingHours.trim() }; break;
        default: console.error('Unknown field:', fieldName); setIsSavingContact(false); return;
    }

    try {
        await handleSave(targetUserId, dataToSave); // Use generalized save
        setEditingField(null); // Close edit UI on success
        setContactSaveStatus({ message: 'Saved successfully!', type: 'success' });
        setTimeout(() => setContactSaveStatus({ message: '', type: '' }), 3000);
    } catch (error) {
        console.error(`Error saving ${fieldName}:`, error);
        setContactSaveStatus({ message: error.message || `Failed to save ${fieldName}.`, type: 'error' });
    } finally {
      setIsSavingContact(false);
    }
  };

  // Initialize Autocomplete
  useEffect(() => {
     let listener = null;
    if (isGoogleLoaded && autocompleteInputRef.current && editingField === 'address' && !autocompleteRef.current) {
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          autocompleteInputRef.current,
            { types: ['address'], componentRestrictions: { country: 'us' } }
          );
          listener = autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
            if (place && place.formatted_address) {
            setAddress(place.formatted_address);
              setAddressError('');
            } else {
              setAddressError('Please select a valid address from suggestions.');
            }
          });
      } catch (error) {
          console.error("Error initializing Google Autocomplete:", error);
          setAddressError("Failed to load address suggestions.");
      }
    }
     // Cleanup function
        return () => {
          if (listener) {
            window.google.maps.event.removeListener(listener);
          }
      if (autocompleteRef.current && typeof window.google.maps.event.clearInstanceListeners === 'function') {
          // Check if element still exists before clearing
          if (document.body.contains(autocompleteInputRef.current)) {
            window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          }
         autocompleteRef.current = null;
      }
    };
  }, [isGoogleLoaded, editingField]); // Depend on editingField to re-init/cleanup

  // --- Render Logic --- //
  if (isLoadingData) return <div className="loading-message">Loading Food Bank Data...</div>;
  if (dataError) return <div className="error-message">Error: {dataError}</div>;
  if (!displayUserData) return <div className="info-message">No data available for this user.</div>;

  // Get current displayed values from potentially updated state
  const currentDisplayPriorityLevel = displayUserData.needStatus?.priorityLevel || 3;
  const currentDisplayCustomMessage = displayUserData.needStatus?.customMessage || '';
  const currentPriorityInfo = getPriorityInfo(currentDisplayPriorityLevel);
  
  return (
    <>
     <GoogleMapsScript onLoad={handleGoogleMapsLoad} />

      {/* ----- Need Status Card ----- */}
      <div className="fbd-card need-status-card">
        <h3 className="fbd-card-title">Current Need Status</h3>
        <div className="need-status-display">
           {/* Display Area */}
           <div className="priority-display">
             <span className="priority-level-number" style={{ color: currentPriorityInfo.color }}>
               {currentDisplayPriorityLevel}
             </span>
             <div className="priority-details">
               <span className="priority-label" style={{ color: currentPriorityInfo.color }}>
                 {currentPriorityInfo.label}
               </span>
               <p className="custom-message-display">
                 {currentDisplayCustomMessage || (isEditingStatus ? '' : 'No custom message set.')}
               </p>
             </div>
           </div>

           {/* Edit Trigger */}
           {!isEditingStatus && (
             <button className="fbd-button tertiary" onClick={() => setIsEditingStatus(true)} title="Update Need Status">
               <span className="material-icons">edit</span> Update Status
             </button>
           )}
        </div>

        {/* --- Editing UI (conditional) --- */}
        {isEditingStatus && (
          <div className="need-status-edit-area">
            <label htmlFor="customStatusMessageInput" className="fbd-label">Optional Message:</label>
                    <input 
              id="customStatusMessageInput"
                        type="text" 
              className="fbd-input"
                        value={customStatusMessage}
                        onChange={(e) => setCustomStatusMessage(e.target.value)}
              placeholder="e.g., Need canned vegetables, low on pasta"
            />

            <label className="fbd-label">Select Need Level:</label>
            <div className="priority-selector-grid">
              {priorityLevels.map((p) => {
                const isSelected = p.level === priorityLevel;
                return (
                        <button 
                            key={p.level}
                    className={`priority-selector-button ${isSelected ? 'selected' : ''}`}
                    style={{
                        '--priority-color': p.color, // Use CSS variable for dynamic color
                        '--priority-color-light': `${p.color}20` // Lighter version for background
                      }}
                            onClick={() => setPriorityLevel(p.level)}
                        >
                    <span className="selector-level">{p.level}</span>
                    <span className="selector-label">{p.label}</span>
                        </button>
                );
              })}
                </div>

            <div className="fbd-form-actions">
              <button className="fbd-button secondary" onClick={() => {
                  setIsEditingStatus(false);
                  // Reset edit state to current display state
                  setPriorityLevel(currentDisplayPriorityLevel);
                  setCustomStatusMessage(currentDisplayCustomMessage);
                }}
                    disabled={isSavingStatus}
                >
                Cancel
              </button>
              <button className="fbd-button primary" onClick={handleSaveStatus} disabled={isSavingStatus}>
                {isSavingStatus ? 'Saving...' : 'Save Status'}
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ----- Contact Info Card ----- */}
      <div className="fbd-card contact-info-card">
        <h3 className="fbd-card-title">Contact Information</h3>

        <div className="contact-fields-grid">
          {/* Address */}
          <div className={`contact-field-item ${editingField === 'address' ? 'editing' : ''}`}>
            <label className="fbd-label">Address</label>
            <div className="contact-value-display">
              <span className="value">{address || 'Not set'}</span>
              <button className="fbd-edit-btn small" onClick={() => setEditingField('address')} title="Edit Address">
                <span className="material-icons">edit</span>
              </button>
            </div>
            <div className="contact-edit-input">
              <textarea
                ref={autocompleteInputRef}
                className="fbd-input"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setAddressError(''); }}
                placeholder="Enter full address"
                disabled={!isGoogleLoaded || isSavingContact}
                rows={3}
              />
              {!isGoogleLoaded && <small className="loading-text">Loading address suggestions...</small>}
              {addressError && <small className="error-text">{addressError}</small>}
              <div className="fbd-form-actions inline">
                 <button className="fbd-button secondary small" onClick={() => { setEditingField(null); setAddress(displayUserData.address || ''); setAddressError(''); }} disabled={isSavingContact}>Cancel</button>
                 <button className="fbd-button primary small" onClick={() => handleSaveContact('address')} disabled={isSavingContact || !isGoogleLoaded}>Save</button>
              </div>
            </div>
          </div>

          {/* Email */}
          <div className={`contact-field-item ${editingField === 'email' ? 'editing' : ''}`}>
            <label className="fbd-label">Email</label>
            <div className="contact-value-display">
              <span className="value">{email || 'Not set'}</span>
              <button className="fbd-edit-btn small" onClick={() => setEditingField('email')} title="Edit Email">
                <span className="material-icons">edit</span>
              </button>
            </div>
            <div className="contact-edit-input">
              <input
                type="email"
                className="fbd-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter contact email"
                disabled={isSavingContact}
              />
              <div className="fbd-form-actions inline">
                 <button className="fbd-button secondary small" onClick={() => { setEditingField(null); setEmail(displayUserData.email || auth0User?.email || ''); }} disabled={isSavingContact}>Cancel</button>
                 <button className="fbd-button primary small" onClick={() => handleSaveContact('email')} disabled={isSavingContact}>Save</button>
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className={`contact-field-item ${editingField === 'phone' ? 'editing' : ''}`}>
            <label className="fbd-label">Phone</label>
            <div className="contact-value-display">
              <span className="value">{phone || 'Not set'}</span>
              <button className="fbd-edit-btn small" onClick={() => setEditingField('phone')} title="Edit Phone">
                <span className="material-icons">edit</span>
                </button>
            </div>
            <div className="contact-edit-input">
              <input
                type="tel"
                className="fbd-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                disabled={isSavingContact}
              />
              <div className="fbd-form-actions inline">
                 <button className="fbd-button secondary small" onClick={() => { setEditingField(null); setPhone(displayUserData.phone || ''); }} disabled={isSavingContact}>Cancel</button>
                 <button className="fbd-button primary small" onClick={() => handleSaveContact('phone')} disabled={isSavingContact}>Save</button>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div className={`contact-field-item ${editingField === 'openingHours' ? 'editing' : ''}`}>
             <label className="fbd-label">Opening Hours / Notes</label>
             <div className="contact-value-display">
               {/* Use pre-wrap for display */}
               <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{openingHours || 'Not set'}</span>
               <button className="fbd-edit-btn small" onClick={() => setEditingField('openingHours')} title="Edit Opening Hours">
                 <span className="material-icons">edit</span>
               </button>
             </div>
             <div className="contact-edit-input">
               <textarea
                 className="fbd-input"
                 value={openingHours}
                 onChange={(e) => setOpeningHours(e.target.value)}
                 placeholder="e.g., Mon-Fri 9am-5pm, Sat 10am-2pm"
                 disabled={isSavingContact}
                 rows={3}
               />
               <div className="fbd-form-actions inline">
                  <button className="fbd-button secondary small" onClick={() => { setEditingField(null); setOpeningHours(displayUserData.openingHours || ''); }} disabled={isSavingContact}>Cancel</button>
                  <button className="fbd-button primary small" onClick={() => handleSaveContact('openingHours')} disabled={isSavingContact}>Save</button>
               </div>
             </div>
           </div>
        </div>

         {/* Contact Save Status Message */}
         {contactSaveStatus.message && (
           <div className={`fbd-status-message ${contactSaveStatus.type}`}>
             {contactSaveStatus.message}
               </div>
             )}
     </div>
    </>
  );
};

export default FoodBankDashboard; 
