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
    category: '',
    quantity: '',
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

  // State for QR Scanner / Confirmation
  const [showScanner, setShowScanner] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null); // Renamed from verificationResult
  const [isConfirming, setIsConfirming] = useState(false); // Renamed from isVerifying
  const scannerRef = useRef(null);

  // --- State for Triggering Data Refresh --- START
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // --- State for Triggering Data Refresh --- END

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
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
    if (!formData.quantity.trim()) errors.quantity = 'Quantity is required';
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
      // Determine the user ID for whom the donation is being created
      const donationOwnerId = previewTargetUserId || userData.auth0Id;
      // The requestingUserId is always the logged-in user (admin in preview mode)
      const requestingUserId = userData.auth0Id;

      const response = await createDonation({
        ...formData,
        userId: donationOwnerId // Use the determined owner ID
      }, requestingUserId); // Pass requester ID for header

      if (response.success) {
        setSubmitSuccess(true);
        setFormData({
          itemName: '',
          category: '',
          quantity: '',
          expirationDate: '',
          pickupInfo: '',
          imageUrl: ''
        });
        // Optionally, refresh the available items list here
      }
    } catch (error) {
      setSubmitError(error.message || 'Failed to create donation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // QR Code Scan Success Handler
  const onScanSuccess = async (decodedText, decodedResult) => {
    if (isConfirming) return; // Prevent multiple submissions

    console.log(`Code matched = ${decodedText}`, decodedResult);
    setShowScanner(false); // Hide scanner after successful scan
    setIsConfirming(true);
    setConfirmationResult(null); // Clear previous result

    try {
      if (!userData || !userData.auth0Id) {
        throw new Error("User data not available.");
      }
      // Call the new function to confirm pickup
      // --- Extract volunteer ID from scanned text --- START
      console.log("Raw Scanned Text:", decodedText);
      const parts = decodedText.split(':');
      let scannedVolunteerId = null;
      if (parts.length === 2 && parts[0].trim().toLowerCase() === 'volunteerid' && parts[1]) {
        scannedVolunteerId = parts[1].trim();
      } 
      
      if (!scannedVolunteerId) {
        throw new Error("Invalid QR code format. Expected 'volunteerid:value'.");
      }
      // --- Extract volunteer ID from scanned text --- END
      
      // Determine the user ID whose pickup is being confirmed
      const resourceUserId = previewTargetUserId || userData.auth0Id;
      // The requestingUserId is always the logged-in user
      const requestingUserId = userData.auth0Id;
      
      // Pass resource ID for URL path, requester ID for header
      const response = await confirmSupplierPickup(resourceUserId, scannedVolunteerId, requestingUserId);
      setConfirmationResult({ 
        success: true, 
        message: response.message || 'Pickup confirmed! Items are now on their way to food banks.' 
      });
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

  // QR Code Scan Failure Handler (keep as is)
  const onScanFailure = (error) => {
    // console.warn(`Code scan error = ${error}`);
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

  return (
    <div className="dashboard-container">
    <div className="dashboard-content">
      <div className="dashboard-nav">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'donate' ? 'active' : ''} 
          onClick={() => setActiveTab('donate')}
        >
          Donate
        </button>
        <button 
            className={activeTab === 'receipts' ? 'active' : ''} 
            onClick={() => setActiveTab('receipts')}
          >
            Donation Receipts
          </button>
          <button 
            className={activeTab === 'confirm-pickup' ? 'active' : ''} 
            onClick={() => setActiveTab('confirm-pickup')}
          >
            Confirm Pickup
        </button>
      </div>

      {activeTab === 'overview' && (
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
      )}
      
      {activeTab === 'donate' && (
        <div className="donate-section">
          <h3>List a New Donation</h3>
          {submitError && (
            <div className="error-message">
              {submitError}
            </div>
          )}
          <form className="donate-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Item Name *</label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleInputChange}
                placeholder="e.g., Fresh Produce"
              />
              {formErrors.itemName && (
                <span className="error-text">{formErrors.itemName}</span>
              )}
            </div>
            
            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="">Select a category</option>
                <option value="produce">Fresh Produce</option>
                <option value="bakery">Bakery</option>
                <option value="dairy">Dairy</option>
                <option value="meat">Meat & Seafood</option>
                <option value="canned">Canned Goods</option>
                <option value="dry">Dry Goods</option>
                <option value="frozen">Frozen Foods</option>
                <option value="prepared">Prepared Meals</option>
                <option value="other">Other</option>
              </select>
              {formErrors.category && (
                <span className="error-text">{formErrors.category}</span>
              )}
            </div>
            
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="text"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                placeholder="e.g., 10 kg, 5 loaves, 3 boxes"
                />
                {formErrors.quantity && (
                  <span className="error-text">{formErrors.quantity}</span>
                )}
              </div>
              
              <div className="form-group">
                <label>Expiration Date *</label>
                <input
                  type="date"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleInputChange}
                />
                {formErrors.expirationDate && (
                  <span className="error-text">{formErrors.expirationDate}</span>
                )}
            </div>
            
            <div className="form-group">
              <label>Pickup Information *</label>
              <textarea
                name="pickupInfo"
                rows="3"
                value={formData.pickupInfo}
                onChange={handleInputChange}
                placeholder="e.g., Available Mon-Fri 9am-5pm at loading dock B"
              ></textarea>
              {formErrors.pickupInfo && (
                <span className="error-text">{formErrors.pickupInfo}</span>
              )}
            </div>
            
            <div className="form-group">
              <label>Upload Image (Optional)</label>
              <div className="file-upload">
                <input
                  type="file"
                  id="food-image"
                  accept="image/*"
                  onChange={(e) => {
                    // Handle file upload here
                    // For now, we'll just store the file name
                    setFormData(prev => ({
                      ...prev,
                      imageUrl: e.target.value
                    }));
                  }}
                />
                <label htmlFor="food-image">Choose File</label>
              </div>
            </div>
            
            <div className="form-buttons-container">
            <div className="form-buttons">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Listing...' : 'List Donation'}
                </button>
              </div>
              {submitSuccess && (
                <div className="success-message-inline">
                  <span className="success-icon">✓</span>
                  Donation listed successfully!
                </div>
              )}
            </div>
          </form>
          
          <hr style={{ margin: '2rem 0' }}/>

          {/* Display Current Listed Items */}
          <h3>Your Currently Listed Items (Available/Scheduled)</h3>
          {isLoadingListedItems ? (
            <p>Loading listed items...</p>
          ) : listedItemsError ? (
            <div className="error-message">Error: {listedItemsError}</div>
          ) : supplierListedItems.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                    <th>Item Name</th>
                  <th>Quantity</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Actions</th> {/* Optional actions column */} 
                </tr>
              </thead>
              <tbody>
                  {supplierListedItems.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                      <td>{formatDate(item.expiry)}</td>
                      <td>
                        <span className={`status ${item.status?.toLowerCase()}`}>{item.status}</span>
                      </td>
                    <td>
                        {/* Add actions like Edit/Cancel later if needed */}
                      <button className="small-btn">Edit</button> 
                        <button className="small-btn danger" style={{marginLeft: '5px'}}>Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>You have no items currently listed as available or scheduled for pickup.</p>
          )}
        </div>
      )}
      
      {activeTab === 'receipts' && (
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
      )}
      
      {activeTab === 'confirm-pickup' && (
        <div className="verify-section"> {/* Keep class name or rename if desired */} 
          <h3>Confirm Donation Pickup</h3>
          <p>Scan the QR code presented by the volunteer/driver to confirm they have picked up your available donations. This will mark the items as 'on its way'.</p>

                 {!showScanner && (
                    <button 
              className="primary-btn" 
              onClick={() => {
                setShowScanner(true); 
                setConfirmationResult(null); // Clear previous result when showing scanner
              }}
              disabled={isConfirming}
            >
              Start Camera Scan
                    </button>
                 )}

          {showScanner && (
            <> 
              {/* Ensure this div ID matches the one used in useEffect */}
              <div id="qr-reader-supplier" style={{ width: '100%', maxWidth: '500px', margin: '1rem auto' }}></div> 
              <button className="secondary-btn" onClick={() => setShowScanner(false)}>Cancel Scan</button>
            </>
          )}

          {isConfirming && <p style={{marginTop: '1rem'}}>Confirming pickup...</p>}

          {confirmationResult && (
            <div 
              className={confirmationResult.success ? 'success-message' : 'error-message'}
              style={{marginTop: '1rem'}}
            >
              {confirmationResult.success ? '✅ ' : '❌ '}
              {confirmationResult.message}
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard; 