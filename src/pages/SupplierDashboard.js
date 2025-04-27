import React, { useState, useContext, useEffect, useRef } from 'react';
import { UserContext } from '../App';
import { createDonation, getDonationReceipt, getSupplierOverviewData, getSupplierListedItems, confirmSupplierPickup } from '../services/donationService';
import { estimateFoodDonationImpact, estimateFoodDonationValue, batchEstimateFoodDonationValues } from '../services/geminiService';
import '../assets/styles/Dashboard.css';
import { Html5QrcodeScanner } from 'html5-qrcode';

const SupplierDashboard = ({ previewTargetUserId }) => {
  const { userData } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.substring(1);
    return ['overview', 'donate', 'receipts', 'confirm'].includes(hash) ? hash : 'overview';
  });
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'produce',
    imageFile: null,
    imagePreview: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // --- State for Receipts --- START
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [receiptData, setReceiptData] = useState(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  // --- State for Receipts --- END

  // --- State for Overview & Listed Items --- 
  const [overviewData, setOverviewData] = useState(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true); // Default to true
  const [overviewError, setOverviewError] = useState('');
  const [supplierListedItems, setSupplierListedItems] = useState([]);
  const [isLoadingListedItems, setIsLoadingListedItems] = useState(true); // Default to true
  const [listedItemsError, setListedItemsError] = useState('');

  // State for Confirmation (Code or QR)
  const [confirmationResult, setConfirmationResult] = useState(null); 
  const [isConfirming, setIsConfirming] = useState(false); 
  const [enteredCode, setEnteredCode] = useState(''); // State for the entered code
  const [showScanner, setShowScanner] = useState(false); // Re-add state for scanner visibility
  const scannerRef = useRef(null); // Re-add scanner ref

  // --- State for Triggering Data Refresh --- START
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // --- State for Triggering Data Refresh --- END

  // Add a new state for tracking value estimation
  const [estimatingValues, setEstimatingValues] = useState({});
  const [estimatedValues, setEstimatedValues] = useState({});

  // Effect to update URL hash when tab changes
  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          imageFile: file,
          imagePreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.itemName.trim()) errors.itemName = 'Food information is required';
    if (!formData.category) errors.category = 'Category is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    if (!validateForm()) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Make sure we have valid user IDs
      if (!userData || !userData.auth0Id) {
        throw new Error('User data is missing. Please log in again.');
      }
      
      const donationOwnerId = previewTargetUserId || userData.auth0Id;
      const requestingUserId = userData.auth0Id;

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('userId', donationOwnerId);
      formDataToSend.append('itemName', formData.itemName);
      formDataToSend.append('category', formData.category);
      
      // Set guaranteed default values for the impact estimates
      let mealsSaved = 2;
      let co2Prevented = 1.0;
      
      try {
        // Try to get impact estimates from Gemini
        const impactEstimates = await estimateFoodDonationImpact(
          formData.itemName, 
          formData.category
        );
        
        // Only use the estimates if they exist and are valid
        if (impactEstimates && 
            impactEstimates.mealsSaved !== undefined && 
            impactEstimates.co2Prevented !== undefined) {
          
          // Ensure these are properly formatted as numbers
          const parsedMeals = parseInt(impactEstimates.mealsSaved);
          const parsedCO2 = parseFloat(impactEstimates.co2Prevented);
          
          if (!isNaN(parsedMeals)) mealsSaved = parsedMeals;
          if (!isNaN(parsedCO2)) co2Prevented = parsedCO2;
        }
      } catch (apiError) {
        console.error("Failed to get AI estimates, using defaults:", apiError);
        // Continue with default values
      }
      
      console.log("Submitting with impact values:", { mealsSaved, co2Prevented });
      
      // Add the impact estimates as strings (server expects string values from FormData)
      formDataToSend.append('mealsSaved', String(mealsSaved));
      formDataToSend.append('co2Prevented', String(co2Prevented));
      
      // Add image file if it exists
      if (formData.imageFile) {
        formDataToSend.append('image', formData.imageFile);
      }
      
      try {
        const response = await createDonation(formDataToSend, requestingUserId);
        
        if (response.success) {
          setSubmitSuccess(true);
          setFormData({
            itemName: '',
            category: 'produce',
            imageFile: null,
            imagePreview: ''
          });
          setRefreshTrigger(prev => prev + 1);
        } else {
          setSubmitError(response.message || 'Unknown error occurred');
        }
      } catch (submitError) {
        console.error("Submission error details:", submitError);
        setSubmitError(submitError.message || 'Failed to create donation. Please try again.');
      }
    } catch (error) {
      console.error("Form handling error:", error);
      setSubmitError(error.message || 'Failed to process donation form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      if (!userData || !userData.auth0Id) {
        throw new Error("User data not available.");
      }
      
      // Determine the user ID whose pickup is being confirmed
      const resourceUserId = previewTargetUserId || userData.auth0Id;
      // The requestingUserId is always the logged-in user
      const requestingUserId = userData.auth0Id;
      
      // Pass resource ID for URL path, requester ID for header
      // Pass the enteredCode
      const response = await confirmSupplierPickup(resourceUserId, { confirmationCode: enteredCode }, requestingUserId);
      
      setConfirmationResult({ 
        success: true, 
        message: response.message || 'Pickup confirmed! Items are now on their way to food banks.' 
      });
      setEnteredCode(''); // Clear input on success
      
      // Optionally trigger refresh of overview/listed items if needed
      if (response.success && response.modifiedCount > 0) {
        setRefreshTrigger(prev => prev + 1); // Increment to trigger useEffect refresh
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

    console.log(`QR Code matched = ${decodedText}`);
    setShowScanner(false); // Hide scanner after successful scan
    setIsConfirming(true);
    setConfirmationResult(null); // Clear previous result

    try {
      if (!userData || !userData.auth0Id) {
        throw new Error("User data not available.");
      }

      // Extract volunteer ID from scanned text
      const parts = decodedText.split(':');
      let scannedVolunteerId = null;
      if (parts.length === 2 && parts[0].trim().toLowerCase() === 'volunteerid' && parts[1]) {
        scannedVolunteerId = parts[1].trim();
      } else {
        // Handle cases where the QR code doesn't contain the expected format
        // Check if it might be the 8-digit code itself (though unlikely)
        if (decodedText.length === 8 && /^[0-9]+$/.test(decodedText)) {
           console.log("QR code contained an 8-digit number, treating as confirmation code.");
           // If it's the 8-digit code, call the backend with confirmationCode
            const resourceUserId = previewTargetUserId || userData.auth0Id;
            const requestingUserId = userData.auth0Id;
            const response = await confirmSupplierPickup(resourceUserId, { confirmationCode: decodedText }, requestingUserId);
            setConfirmationResult({ 
              success: response.success, 
              message: response.message || (response.success ? 'Pickup confirmed via scanned code!' : 'Failed to confirm via scanned code.') 
            });
             // Trigger refresh if needed
            if (response.success && response.modifiedCount > 0) {
               setRefreshTrigger(prev => prev + 1);
            }
            setIsConfirming(false);
            return; // Exit early
        } else {
             throw new Error("Invalid QR code format. Expected 'volunteerid:value' or an 8-digit code.");
        }
      }
      
      // If we extracted scannedVolunteerId, proceed with that
      const resourceUserId = previewTargetUserId || userData.auth0Id;
      const requestingUserId = userData.auth0Id;
      const response = await confirmSupplierPickup(resourceUserId, { scannedVolunteerId: scannedVolunteerId }, requestingUserId);
      
      setConfirmationResult({ 
        success: response.success, // Use success field from response
        message: response.message || (response.success ? 'Pickup confirmed via QR Scan!' : 'Failed to confirm QR Scan.') 
      });

      // Trigger refresh if needed
      if (response.success && response.modifiedCount > 0) {
        setRefreshTrigger(prev => prev + 1);
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

  // --- Fetch Overview Data (Remove isAdminView check) --- START
  useEffect(() => {
    const fetchOverview = async () => {
      // Determine whose overview to fetch
      const resourceUserId = previewTargetUserId || userData?.auth0Id;
      // The requesting user is always the one from context
      const requestingUserId = userData?.auth0Id;

      if (resourceUserId && requestingUserId) {
        setIsLoadingOverview(true);
        setOverviewError('');
        try {
          // Pass resource ID for URL, requester ID for header
          const response = await getSupplierOverviewData(resourceUserId, requestingUserId);
          if (response.success) {
            setOverviewData(response.data);
          } else {
            setOverviewError(response.message || 'Failed to load overview data.');
          }
        } catch (error) {
          console.error("Overview fetch error:", error);
          setOverviewError(error.message || 'An error occurred fetching overview data.');
        } finally {
          setIsLoadingOverview(false);
        }
      }
    };
    fetchOverview();
  }, [userData, refreshTrigger]); // Remove isAdminView dependency
  // --- Fetch Overview Data --- END

  // --- Fetch Supplier's Listed Items (Remove isAdminView check) --- START
  useEffect(() => {
    const fetchListedItems = async () => {
      // Determine whose items to fetch
      const resourceUserId = previewTargetUserId || userData?.auth0Id;
      // The requesting user is always the one from context
      const requestingUserId = userData?.auth0Id;

      if (resourceUserId && requestingUserId) { 
        setIsLoadingListedItems(true);
        setListedItemsError('');
        try {
           // Pass resource ID for URL, requester ID for header
          const response = await getSupplierListedItems(resourceUserId, requestingUserId);
          if (response.success) {
            setSupplierListedItems(response.data);
          } else {
            setListedItemsError(response.message || 'Failed to load listed items.');
          }
        } catch (error) {
          console.error("Listed items fetch error:", error);
          setListedItemsError(error.message || 'An error occurred fetching listed items.');
        } finally {
          setIsLoadingListedItems(false);
        }
      }
    };
    fetchListedItems();
  }, [userData, submitSuccess, refreshTrigger]); // Remove isAdminView dependency
  // --- Fetch Supplier's Listed Items --- END

<<<<<<< HEAD
  // Effect to setup scanner (keep as is, just ensure element ID matches)
  useEffect(() => {
    if (showScanner) {
      // Ensure the container is visible before creating scanner
      const qrReaderElement = document.getElementById("qr-reader-container");
      if(qrReaderElement) qrReaderElement.style.display = 'block';

      // Prevent duplicate scanners
      if (!scannerRef.current) {
          scannerRef.current = new Html5QrcodeScanner(
            "qr-reader-supplier",
            { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [0] }, 
            false
          );
          scannerRef.current.render(onScanSuccess, onScanFailure);
      }
    } else {
        // Cleanup if scanner is explicitly closed
        if (scannerRef.current && typeof scannerRef.current.clear === 'function') {
          scannerRef.current.clear().catch(error => {
             if (error.name !== 'NotRunning') { 
                console.error("Failed to clear html5QrcodeScanner:", error);
             }
           });
           scannerRef.current = null;
        }
    }

    // General cleanup on unmount
    return () => {
      if (scannerRef.current && typeof scannerRef.current.clear === 'function') {
         scannerRef.current.clear().catch(error => { /* ignore */ });
         scannerRef.current = null;
      }
    };
  }, [showScanner]);

  // Reset state to allow scanning again
  const handleScanAgain = () => {
      setConfirmationResult(null);
      setShowScanner(true); // Just show scanner again
  };

  // First, update the useEffect to fetch receipt data automatically
  useEffect(() => {
    // Only fetch when the receipts tab is active
    if (activeTab === 'receipts') {
      fetchReceiptData();
    }
  }, [activeTab, refreshTrigger]);

  // Change handleFetchReceipt to a separate function 
  const fetchReceiptData = async () => {
=======
  // --- Function to Fetch Receipt --- START
  const handleFetchReceipt = async () => {
    // Determine whose receipt to fetch
>>>>>>> b6d349b23939291b2961cb2a264f030cd968ba70
    const resourceUserId = previewTargetUserId || userData?.auth0Id;
    const requestingUserId = userData?.auth0Id;

    if (!resourceUserId || !requestingUserId) {
      setReceiptError('User ID not found.');
      return;
    }

    setIsLoadingReceipt(true);
    setReceiptError('');
    setEstimatedValues({});
    setEstimatingValues({});

    try {
      // Pass resource ID for URL, requester ID for header, always get all donations
      const response = await getDonationReceipt(resourceUserId, null, null, requestingUserId);
      if (response.success) {
        setReceiptData(response.data);
        
        // Use batch estimation for all donations instead of individual calls
        if (response.data.donations && response.data.donations.length > 0) {
          // Mark all donations as being estimated
          const estimatingObj = {};
          response.data.donations.forEach(donation => {
            estimatingObj[donation.id] = true;
          });
          setEstimatingValues(estimatingObj);
          
          try {
            // Make a single API call for all donations
            const batchEstimates = await batchEstimateFoodDonationValues(
              response.data.donations.map(donation => ({
                id: donation.id,
                itemName: donation.itemName,
                category: donation.category || 'food'
              }))
            );
            
            // Set all the estimated values at once
            setEstimatedValues(batchEstimates);
          } catch (error) {
            console.error("Error batch estimating donation values:", error);
          } finally {
            // Mark all estimations as complete
            const completedEstimating = {};
            response.data.donations.forEach(donation => {
              completedEstimating[donation.id] = false;
            });
            setEstimatingValues(completedEstimating);
          }
        }
      } else {
        setReceiptError(response.message || 'Failed to fetch receipt.');
      }
    } catch (error) {
      console.error("Receipt fetch error:", error);
      setReceiptError(error.message || 'An error occurred while fetching the receipt.');
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  // Helper function to format date (optional but nice)
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Use toLocaleDateString for better formatting
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); 
    } catch (e) {
      return dateString; // Fallback
    }
  };

  // Add a helper function to format addresses from MongoDB
  const formatAddress = (address) => {
    if (!address) return 'Address not available';
    
    // If it's a string, return it directly
    if (typeof address === 'string') return address;
    
    // If it's an object with MongoDB format
    if (typeof address === 'object') {
      const parts = [];
      
      // Add street if available
      if (address.street) parts.push(address.street);
      
      // Add city, state/province, postal code if available
      const cityRegion = [];
      if (address.city) cityRegion.push(address.city);
      if (address.state || address.province) cityRegion.push(address.state || address.province);
      if (cityRegion.length > 0) parts.push(cityRegion.join(', '));
      
      // Add postal code if available
      if (address.postalCode || address.zipCode) {
        parts.push(address.postalCode || address.zipCode);
      }
      
      // Add country if available
      if (address.country) parts.push(address.country);
      
      // Join all parts with commas or return default if empty
      return parts.length > 0 ? parts.join(', ') : 'Address not available';
    }
    
    return 'Address not available';
  };

  const renderOverview = () => (
    <div className="overview-section">
      {isLoadingOverview ? (
        <p>Loading overview...</p>
      ) : overviewError ? (
        <div className="error-message">Error: {overviewError}</div>
      ) : overviewData ? (
        <>
          <div className="stats-cards">
            <div className="stat-card">
              <h3>{overviewData.donatedItems ?? 'N/A'}</h3>
              <p>Items Donated</p>
            </div>
            <div className="stat-card">
              <h3>{overviewData.upcomingPickups ?? 'N/A'}</h3>
              <p>Upcoming Pickups</p>
            </div>
            <div className="stat-card">
              <h3>{overviewData.impactStats?.totalMealsSaved ?? 'N/A'}</h3>
              <p>Meals Saved</p>
              <div className="stat-source">Powered by Gemini AI</div>
            </div>
            <div className="stat-card">
              <h3>{overviewData.impactStats?.totalCo2Prevented ?? 'N/A'} kg</h3>
              <p>CO₂ Prevented</p>
              <div className="stat-source">Powered by Gemini AI</div>
            </div>
          </div>
          
          <div className="recent-activity">
            <h3>Recent Donations</h3>
            {overviewData.recentDonations && overviewData.recentDonations.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Meals</th>
                    <th>CO₂ (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData.recentDonations.map(donation => (
                    <tr key={donation.id}>
                      <td>{donation.name}</td>
                      <td>{formatDate(donation.date)}</td>
                      <td><span className={`status ${donation.status.toLowerCase().replace(' ', '-')}`}>{donation.status}</span></td>
                      <td>{donation.mealsSaved || 0}</td>
                      <td>{donation.co2Prevented || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No recent donation activity found.</p>
            )}
          </div>
        </>
      ) : (
        <p>No overview data available.</p>
      )}
    </div>
  );

  const renderDonateForm = () => (
    <div className="donate-section">
      <h3>List a New Donation</h3>
      {submitError && <div className="error-message">Error: {submitError}</div>}
      {submitSuccess && <div className="success-message">Donation listed successfully!</div>}
      <form onSubmit={handleSubmit} className="donate-form">
        <div className="form-group">
          <label htmlFor="itemName">Food Information *</label>
          <textarea
            id="itemName"
            name="itemName"
            value={formData.itemName}
            onChange={handleInputChange}
            rows="12"
            placeholder="Please include detailed information about the food donation. Include:
- Type and rough quantity of food items
- Where to pick up the items
- Estimated expiration date
- Any special handling instructions
The more details you provide, the easier it will be for volunteers to process your donation."
            required
            style={{ 
              fontSize: '16px', 
              lineHeight: '1.6',
              padding: '16px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              resize: 'vertical',
              width: '100%',
              transition: 'border 0.3s ease, box-shadow 0.3s ease',
              minHeight: '250px'
            }}
          />
          {formErrors.itemName && <span className="error-text">{formErrors.itemName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
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
          {formErrors.category && <span className="error-text">{formErrors.category}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="imageUpload">Add a Photo (Optional)</label>
          <div className="file-upload-container" style={{ 
            border: '2px dashed #ccc', 
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '10px',
            backgroundColor: '#f9f9f9',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            <input
              type="file"
              id="imageUpload"
              name="imageUpload"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="imageUpload" style={{ cursor: 'pointer', display: 'block' }}>
              {formData.imagePreview ? (
                <div>
                  <img 
                    src={formData.imagePreview} 
                    alt="Upload preview" 
                    style={{
                      maxWidth: '100%', 
                      maxHeight: '200px', 
                      borderRadius: '8px',
                      marginBottom: '10px'
                    }} 
                  />
                  <div style={{ color: '#666' }}>Click to change image</div>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    fontSize: '40px', 
                    color: '#888', 
                    marginBottom: '10px' 
                  }}>
                    📷
                  </div>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Click to upload an image</div>
                  <div style={{ color: '#666', fontSize: '14px' }}>or drag and drop</div>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="form-buttons">
          <button type="submit" className="primary-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'List Donation'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderReceipts = () => (
    <div className="receipts-section">
      <h3 style={{ 
        fontSize: '1.8rem', 
        fontWeight: '600', 
        color: '#2e7d32', 
        marginBottom: '0.5rem' 
      }}>Donation Receipt</h3>
      <p style={{ 
        color: '#666', 
        marginBottom: '2rem' 
      }}>View a summary of your donations, with values powered by AI.</p>
      
      {isLoadingReceipt && (
        <div style={{ 
          margin: '3rem 0', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #f3f3f3', 
            borderTop: '3px solid #2e7d32', 
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#666' }}>Loading donation data...</p>
        </div>
      )}
      
      {receiptError && (
        <div style={{ 
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          Error: {receiptError}
        </div>
      )}

      {receiptData && (
        <div style={{ 
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          backgroundColor: 'white',
          overflow: 'hidden'
        }}>
          {/* Header Section */}
          <div style={{ 
            padding: '1.5rem',
            background: 'linear-gradient(90deg, #2e7d32, #4caf50)',
            color: 'white'
          }}>
            <h4 style={{ 
              fontSize: '1.4rem', 
              fontWeight: '600', 
              margin: 0
            }}>Donation Receipt</h4>
          </div>
          
          {/* Donor Info */}
          <div style={{ 
            padding: '1.5rem', 
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontWeight: '500', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {receiptData.donorInfo.businessName}
              </div>
              <div style={{ color: '#666' }}>
                {formatAddress(receiptData.donorInfo.businessAddress)}
              </div>
            </div>
            <div style={{ 
              textAlign: 'right', 
              color: '#666',
              fontSize: '0.9rem'
            }}>
              <div style={{ marginBottom: '0.3rem' }}>Generated: {formatDate(new Date())}</div>
              <div>Total Donations: {receiptData.donations ? receiptData.donations.length : 0}</div>
            </div>
          </div>

          {/* Summary Section */}
          {Object.keys(estimatedValues).length > 0 && (
            <div style={{ 
              padding: '1.5rem',
              textAlign: 'center', 
              borderBottom: '1px solid #eee',
              backgroundColor: '#f9f9f9'
            }}>
              <div style={{ 
                fontSize: '2.2rem', 
                fontWeight: '600', 
                color: '#2e7d32'
              }}>
                ${Object.values(estimatedValues).reduce((sum, val) => sum + val, 0).toFixed(2)}
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#666', 
                marginTop: '0.3rem'
              }}>
                Total Estimated Value • Powered by Gemini AI
              </div>
            </div>
          )}
        
          {/* Donation List */}
          <div style={{ padding: '1.5rem' }}>
            <h5 style={{ 
              fontSize: '1.1rem', 
              fontWeight: '600', 
              color: '#333',
              marginTop: 0,
              marginBottom: '1rem'
            }}>Donation Details</h5>
            
            {receiptData.donations && receiptData.donations.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: '0',
                  fontSize: '0.95rem'
                }}>
                  <thead>
                    <tr style={{ 
                      textAlign: 'left',
                      backgroundColor: '#f5f5f5'
                    }}>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee', borderRadius: '8px 0 0 0' }}>Date</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Item</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Category</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Status</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee', borderRadius: '0 8px 0 0', textAlign: 'right' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sort donations with scheduled first, then by recency */}
                    {[...receiptData.donations]
                      .sort((a, b) => {
                        // First priority: scheduled items at top
                        if ((a.status === 'Scheduled' || a.status === 'scheduled') && 
                            (b.status !== 'Scheduled' && b.status !== 'scheduled')) return -1;
                        if ((a.status !== 'Scheduled' && a.status !== 'scheduled') && 
                            (b.status === 'Scheduled' || b.status === 'scheduled')) return 1;
                        // Second priority: sort by date (newest first)
                        return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
                      })
                      .map((donation, index) => (
                        <tr key={donation.id} style={{ 
                          backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
                        }}>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                            {formatDate(donation.date || donation.createdAt)}
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: '500' }}>
                            {donation.itemName}
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee', textTransform: 'capitalize' }}>
                            {donation.category}
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '30px',
                              fontSize: '0.8rem',
                              fontWeight: '500',
                              backgroundColor: 
                                (donation.status || '').toLowerCase().includes('scheduled') ? '#FFF8E1' : 
                                (donation.status || '').toLowerCase().includes('completed') ? '#E8F5E9' : 
                                (donation.status || '').toLowerCase().includes('picked') ? '#E1F5FE' : 
                                '#F5F5F5',
                              color: 
                                (donation.status || '').toLowerCase().includes('scheduled') ? '#F57C00' : 
                                (donation.status || '').toLowerCase().includes('completed') ? '#2E7D32' : 
                                (donation.status || '').toLowerCase().includes('picked') ? '#0277BD' : 
                                '#757575'
                            }}>
                              {donation.status || 'Pending'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                            {estimatingValues[donation.id] ? (
                              <span style={{ color: '#9e9e9e', fontStyle: 'italic', fontSize: '0.9rem' }}>Estimating...</span>
                            ) : estimatedValues[donation.id] ? (
                              <span style={{ fontWeight: '600', color: '#2e7d32' }}>${estimatedValues[donation.id].toFixed(2)}</span>
                            ) : (
                              <span style={{ color: '#9e9e9e' }}>--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 0',
                color: '#9e9e9e'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
                <p>No donations found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderConfirmPickup = () => (
    <div className="verify-section card-style"> 
      <h3>Confirm Donation Pickup</h3>
      {/* Update instruction text */}
      <p>Enter the 8-digit code OR scan the QR code provided by the volunteer/driver to confirm pickup.</p>

      {/* Container for both methods */} 
      <div className="confirmation-methods">
          {/* Method 1: Code Input */} 
          <div className="code-input-area confirmation-box">
              <h4>Enter 8-Digit Code</h4>
              <div className="code-input-form">
                <div className="code-input-group">
                  <input 
                    type="text" 
                    className="code-input large" 
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={8}
                    placeholder="8-Digit Code"
                    disabled={isConfirming}
                    aria-label="Volunteer confirmation code"
                  />
                  <button 
                    className="primary-btn verify-button"
                    onClick={handleConfirmCode} 
                    disabled={isConfirming || enteredCode.length !== 8}
                  >
                    {isConfirming ? 'Confirming...' : 'Confirm Code'}
                  </button>
                </div>
              </div>
          </div>

          {/* Separator */} 
          <div className="confirmation-separator">OR</div>

          {/* Method 2: QR Scanner */} 
          <div className="scanner-area confirmation-box">
              <h4>Scan QR Code</h4>
              {!showScanner && (
                  <button 
                    className="primary-btn scan-button large" 
                    onClick={() => {
                      setShowScanner(true); 
                      setEnteredCode(''); // Clear code input when starting scan
                      setConfirmationResult(null); // Clear previous result
                    }}
                    disabled={isConfirming}
                  >
                    <i className="fas fa-camera"></i> Start Camera Scan
                  </button>
              )}
              {showScanner && (
                  <div className="scanner-active-container">
                      <div id="qr-reader-supplier" style={{ width: '100%', maxWidth: '400px', margin: '1rem auto' }}></div> 
                      <button className="secondary-btn cancel-scan-btn" onClick={() => setShowScanner(false)} disabled={isConfirming}>
                          Cancel Scan
                      </button>
                  </div>
              )}
          </div>
      </div>

      {/* Keep confirmation result display - make it common */} 
      <div className="confirmation-result-area">
          {isConfirming && <p style={{marginTop: '1rem', textAlign: 'center'}}>Confirming pickup...</p>} 
          {confirmationResult && (
            <div 
              className={`confirmation-result ${confirmationResult.success ? 'success-message' : 'error-message'}`} 
              style={{marginTop: '1.5rem'}} // Add more margin
            >
              {confirmationResult.success ? '✅ ' : '❌ '}
              {confirmationResult.message}
              {!confirmationResult.success && (
                <button 
                  onClick={() => {
                      setConfirmationResult(null);
                      setShowScanner(false); // Ensure scanner is off
                      setEnteredCode(''); // Clear code
                  }} 
                  className="secondary-btn try-again-btn" 
                  style={{marginLeft: '1rem'}}
                >
                  Try Again
                </button>
              )}
            </div>
          )}
      </div>

    </div>
  );

  // --- Re-add Effect to setup scanner ---
  useEffect(() => {
    if (showScanner) {
      // Ensure the container is visible before creating scanner
      const qrReaderElement = document.getElementById("qr-reader-supplier");
      if(qrReaderElement) qrReaderElement.style.display = 'block';

      // Prevent duplicate scanners
      if (!scannerRef.current) {
          try {
            scannerRef.current = new Html5QrcodeScanner(
              "qr-reader-supplier",
              {
                 fps: 10, 
                 qrbox: (viewfinderWidth, viewfinderHeight) => { // Responsive qrbox
                      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                      const qrboxSize = Math.max(200, Math.floor(minEdge * 0.7)); // Min 200px, 70% of smallest edge
                      return { width: qrboxSize, height: qrboxSize };
                  },
                 supportedScanTypes: [0] // 0 for camera
              }, 
              /* verbose= */ false
            );
            scannerRef.current.render(onScanSuccess, onScanFailure);
          } catch (error) {
              console.error("Failed to initialize Html5QrcodeScanner:", error);
              setConfirmationResult({ success: false, message: "Failed to initialize QR scanner." });
              setShowScanner(false); // Hide scanner UI if init fails
          }
      }
    } else {
        // Cleanup scanner instance if it exists and we are hiding it
        if (scannerRef.current && typeof scannerRef.current.getState === 'function' && scannerRef.current.getState() === 2) { // Check if scanner is running (state 2)
          scannerRef.current.clear().then(() => {
             console.log("QR Scanner cleared successfully.");
             scannerRef.current = null; // Ensure ref is cleared after stopping
          }).catch(error => {
             // Ignore "NotRunning" error, log others
             if (String(error).includes('HTML Element with id=')) {
                 console.warn("Scanner already removed from DOM?");
             } else if (error.name !== 'NotRunning') { 
                console.error("Failed to clear html5QrcodeScanner:", error);
             }
             scannerRef.current = null; // Still clear ref on error
           });
        } else {
            // If scanner wasn't running or ref is already null, just ensure ref is null
             scannerRef.current = null;
        }
    }

    // General cleanup on component unmount
    return () => {
      if (scannerRef.current && typeof scannerRef.current.clear === 'function') {
         scannerRef.current.clear().catch(error => { /* ignore */ });
         scannerRef.current = null;
      }
    };
  // Add dependencies based on handlers used inside
  }, [showScanner, userData, previewTargetUserId]); 

  return (
    <div className="dashboard-container">
      {previewTargetUserId ? (
         <h2>Supplier Preview ({overviewData?.username || 'N/A'})</h2>
      ) : (
         <h1>{userData?.businessName || userData?.username || 'Supplier'} Dashboard</h1>
      )}

      <div className="dashboard-tabs">
        <button onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? 'active' : ''}>Overview</button>
        <button onClick={() => setActiveTab('donate')} className={activeTab === 'donate' ? 'active' : ''}>Donate</button>
        <button onClick={() => setActiveTab('receipts')} className={activeTab === 'receipts' ? 'active' : ''}>Donation Receipts</button>
        <button onClick={() => setActiveTab('confirm')} className={activeTab === 'confirm' ? 'active' : ''}>Confirm Pickup</button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'donate' && renderDonateForm()}
        {activeTab === 'receipts' && renderReceipts()}
        {activeTab === 'confirm' && renderConfirmPickup()}
      </div>
    </div>
  );
};

export default SupplierDashboard;