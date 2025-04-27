import React, { useState, useContext, useEffect, useRef } from 'react';
import { UserContext } from '../App';
import { createDonation, getDonationReceipt, getSupplierOverviewData, getSupplierListedItems, confirmSupplierPickup } from '../services/donationService';
import '../assets/styles/Dashboard.css';
import { Html5QrcodeScanner } from 'html5-qrcode';

const SupplierDashboard = ({ previewTargetUserId }) => {
  const { userData } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'produce',
    quantity: '1',
    expirationDate: '',
    pickupInfo: '',
    imageUrl: ''
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

  const validateForm = () => {
    const errors = {};
    if (!formData.itemName.trim()) errors.itemName = 'Item name is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.quantity) errors.quantity = 'Quantity is required';
    if (!formData.expirationDate) errors.expirationDate = 'Expiration date is required';
    if (!formData.pickupInfo.trim()) errors.pickupInfo = 'Pickup information is required';
    
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
      const donationOwnerId = previewTargetUserId || userData.auth0Id;
      const requestingUserId = userData.auth0Id;

      const payload = {
        ...formData,
        userId: donationOwnerId
      };
      const response = await createDonation(payload, requestingUserId);

      if (response.success) {
        setSubmitSuccess(true);
        setFormData({
          itemName: '',
          category: 'produce',
          quantity: '1',
          expirationDate: '',
          pickupInfo: '',
          imageUrl: ''
        });
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      setSubmitError(error.message || 'Failed to create donation. Please try again.');
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

  // --- Function to Fetch Receipt --- START
  const handleFetchReceipt = async () => {
    // Determine whose receipt to fetch
    const resourceUserId = previewTargetUserId || userData?.auth0Id;
    // The requesting user is always the one from context
    const requestingUserId = userData?.auth0Id;

    if (!resourceUserId || !requestingUserId) {
      setReceiptError('User ID not found.');
      return;
    }
    
    // Basic validation for dates if needed (optional)
    // if (!startDate || !endDate) {
    //   setReceiptError('Please select both a start and end date.');
    //   return;
    // }

    setIsLoadingReceipt(true);
    setReceiptError('');
    setReceiptData(null);

    try {
      // Pass resource ID for URL, requester ID for header
      const response = await getDonationReceipt(resourceUserId, startDate, endDate, requestingUserId);
      if (response.success) {
        setReceiptData(response.data);
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
  // --- Function to Fetch Receipt --- END
  
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
              <h3>{overviewData.impactStats?.mealsSaved ?? 'N/A'}</h3>
              <p>Meals Saved (Est.)</p>
            </div>
            <div className="stat-card">
              <h3>{overviewData.impactStats?.co2Prevented ?? 'N/A'} kg</h3>
              <p>CO₂ Prevented (Est.)</p>
            </div>
          </div>
          
          <div className="recent-activity">
            <h3>Recent Donations</h3>
            {overviewData.recentDonations && overviewData.recentDonations.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData.recentDonations.map(donation => (
                    <tr key={donation.id}>
                      <td>{donation.name}</td>
                      <td>{donation.quantity}</td>
                      <td>{formatDate(donation.date)}</td>
                      <td><span className={`status ${donation.status.toLowerCase().replace(' ', '-')}`}>{donation.status}</span></td>
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
          <label htmlFor="itemName">Food Item *</label>
          <input
            id="itemName"
            name="itemName"
            value={formData.itemName}
            onChange={handleInputChange}
            required
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
            <option value="other">Other</option>
          </select>
          {formErrors.category && <span className="error-text">{formErrors.category}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="quantity">Quantity *</label>
          <input
            type="text"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleInputChange}
            required
          />
          {formErrors.quantity && <span className="error-text">{formErrors.quantity}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="expirationDate">Expiration Date *</label>
          <input
            type="date"
            id="expirationDate"
            name="expirationDate"
            value={formData.expirationDate}
            onChange={handleInputChange}
            required
          />
          {formErrors.expirationDate && <span className="error-text">{formErrors.expirationDate}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="pickupInfo">Pickup Information *</label>
          <textarea
            id="pickupInfo"
            name="pickupInfo"
            value={formData.pickupInfo}
            onChange={handleInputChange}
            rows="3"
            placeholder="e.g., Available M-F 9am-5pm at loading dock B"
            required
          />
          {formErrors.pickupInfo && <span className="error-text">{formErrors.pickupInfo}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="imageUrl">Image URL (Optional)</label>
          <input
            type="url"
            id="imageUrl"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleInputChange}
            placeholder="https://example.com/image.jpg"
          />
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
      <h3>Generate Donation Receipt</h3>
      <p>Select a date range to generate a summary of your completed donations.</p>
      
      <div className="receipt-controls form-group">
         <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
                <label htmlFor="startDate">Start Date:</label>
                <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
            </div>
            <div style={{ flex: 1 }}>
                <label htmlFor="endDate">End Date:</label>
                <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>
          </div>
        <button 
          className="primary-btn" 
          onClick={handleFetchReceipt} 
          disabled={isLoadingReceipt}
        >
          {isLoadingReceipt ? 'Generating...' : 'Generate Receipt'}
        </button>
      </div>
      
      {receiptError && (
        <div className="error-message" style={{ marginTop: '1rem' }}>
          Error: {receiptError}
        </div>
      )}

      {receiptData && (
        <div className="receipt-display" style={{ marginTop: '2rem', border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h4>Donation Receipt Summary</h4>
          
          <div className="receipt-donor-info" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #ddd' }}>
            <strong>Donor:</strong> {receiptData.donorInfo.businessName}<br />
            <strong>Address:</strong> {receiptData.donorInfo.businessAddress}
          </div>

          <div className="receipt-summary" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #ddd' }}>
            <strong>Period:</strong> {formatDate(receiptData.summary.startDate) || 'Start'} - {formatDate(receiptData.summary.endDate) || 'End'}<br />
            <strong>Total Completed Donations:</strong> {receiptData.summary.totalDonations}<br />
            <strong>Total Estimated Value:</strong> ${receiptData.summary.totalEstimatedValue.toFixed(2)}<br />
            <strong>Generated On:</strong> {formatDate(receiptData.summary.generatedAt)}
        </div>
        
            <h5>Donation Details:</h5>
            {receiptData.donations.length > 0 ? (
              <table className="data-table" style={{marginBottom: '1rem'}}>
                <thead>
                  <tr>
                    <th>Date Completed</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Est. Value</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.donations.map(donation => (
                    <tr key={donation.id}>
                      <td>{formatDate(donation.date)}</td>
                      <td>{donation.itemName}</td>
                      <td>{donation.category}</td>
                      <td>{donation.quantity}</td>
                      <td>${(donation.estimatedValue || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No completed donations found for this period.</p>
            )}

            <p style={{ fontSize: '0.8em', fontStyle: 'italic', color: '#666', marginTop: '1rem' }}>
              <strong>Disclaimer:</strong> {receiptData.disclaimer}
            </p>
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