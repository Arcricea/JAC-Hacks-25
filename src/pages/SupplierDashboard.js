import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { verifyVolunteerCode } from '../services/userService'; // Import renamed function
import '../assets/styles/Dashboard.css';
import '../assets/styles/Verification.css'; // Add specific styles for verification

const SupplierDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedUsername, setScannedUsername] = useState(null); // Store scanned username
  const [inputCode, setInputCode] = useState(''); // Store code input by business
  const [verificationResult, setVerificationResult] = useState(null); // Renamed scanResult
  const [isVerifying, setIsVerifying] = useState(false);
  const scannerRef = useRef(null); // Ref for scanner instance
  
  // Demo data
  const supplierData = {
    donatedItems: 152,
    upcomingPickups: 3,
    impactStats: {
      mealsSaved: 456,
      co2Prevented: 213,
      wasteReduced: 304
    },
    recentDonations: [
      { id: 1, name: 'Fresh Vegetables', quantity: '10 kg', date: '2025-04-25', status: 'Picked Up' },
      { id: 2, name: 'Bread', quantity: '15 loaves', date: '2025-04-24', status: 'Scheduled' },
      { id: 3, name: 'Dairy Products', quantity: '8 items', date: '2025-04-23', status: 'Completed' },
    ],
    availableItems: [
      { id: 1, name: 'Pasta', quantity: '20 boxes', expiry: '2025-05-10' },
      { id: 2, name: 'Canned Soup', quantity: '15 cans', expiry: '2025-08-15' },
    ]
  };

  useEffect(() => {
    if (showScanner) {
      // Clear previous state when opening scanner
      setScannedUsername(null);
      setInputCode('');
      setVerificationResult(null);
      
      const onScanSuccess = (decodedText, decodedResult) => {
        console.log(`ID Scanned = ${decodedText}`);
        setScannedUsername(decodedText); // Store the scanned username
        setShowScanner(false); // Hide scanner UI
        
        // Clear the scanner instance
        if (scannerRef.current && typeof scannerRef.current.clear === 'function') {
          scannerRef.current.clear().catch(error => {
             if (error.name !== 'NotRunning') { 
                console.error("Failed to clear html5QrcodeScanner:", error);
             }
           });
           scannerRef.current = null;
        }
      };

      const onScanFailure = (error) => { /* Usually ignore */ };

      // Ensure the container is visible before creating scanner
      const qrReaderElement = document.getElementById("qr-reader-container");
      if(qrReaderElement) qrReaderElement.style.display = 'block';

      // Prevent duplicate scanners
      if (!scannerRef.current) {
          scannerRef.current = new Html5QrcodeScanner(
            "qr-reader", 
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

  // Handle verification submission
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!scannedUsername || inputCode.length !== 6 || !/^[0-9]{6}$/.test(inputCode)) {
       setVerificationResult({ success: false, isValid: false, message: 'Please scan a valid ID and enter the 6-digit code.'});
       return;
    }
    
    setIsVerifying(true);
    setVerificationResult({ message: 'Verifying...' }); // Show intermediate state

    try {
      const result = await verifyVolunteerCode(scannedUsername, inputCode);
      setVerificationResult(result);
    } catch (error) {
      console.error("Verification API call failed:", error);
      setVerificationResult({ success: false, isValid: false, message: 'Verification failed. Please try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset state to allow scanning again
  const handleScanAgain = () => {
      setScannedUsername(null);
      setInputCode('');
      setVerificationResult(null);
      setShowScanner(true);
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
            className={activeTab === 'impact' ? 'active' : ''} 
            onClick={() => setActiveTab('impact')}
          >
            Impact
          </button>
          <button 
            className={activeTab === 'verify' ? 'active' : ''} 
            onClick={() => setActiveTab('verify')}
          >
            Verify Volunteer
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-cards">
              <div className="stat-card">
                <h3>{supplierData.donatedItems}</h3>
                <p>Items Donated</p>
              </div>
              <div className="stat-card">
                <h3>{supplierData.upcomingPickups}</h3>
                <p>Upcoming Pickups</p>
              </div>
              <div className="stat-card">
                <h3>{supplierData.impactStats.mealsSaved}</h3>
                <p>Meals Saved</p>
              </div>
              <div className="stat-card">
                <h3>{supplierData.impactStats.co2Prevented} kg</h3>
                <p>CO₂ Emissions Prevented</p>
              </div>
            </div>
            
            <div className="recent-activity">
              <h3>Recent Donations</h3>
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
                  {supplierData.recentDonations.map(donation => (
                    <tr key={donation.id}>
                      <td>{donation.name}</td>
                      <td>{donation.quantity}</td>
                      <td>{donation.date}</td>
                      <td><span className={`status ${donation.status.toLowerCase().replace(' ', '-')}`}>{donation.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'donate' && (
          <div className="donate-section">
            <h3>Donate Food Items</h3>
            <div className="donate-form">
              <div className="form-group">
                <label>Item Name</label>
                <input type="text" placeholder="e.g., Fresh Produce" />
              </div>
              
              <div className="form-group">
                <label>Category</label>
                <select>
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
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="text" placeholder="e.g., 5 kg or 10 packages" />
                </div>
                
                <div className="form-group">
                  <label>Expiration Date</label>
                  <input type="date" />
                </div>
              </div>
              
              <div className="form-group">
                <label>Pickup Information</label>
                <textarea placeholder="Details about pickup availability, storage requirements, or other important information"></textarea>
              </div>
              
              <div className="form-group">
                <label>Upload Image (Optional)</label>
                <div className="file-upload">
                  <input type="file" id="food-image" accept="image/*" />
                  <label htmlFor="food-image">Choose File</label>
                </div>
              </div>
              
              <div className="form-buttons">
                <button className="primary-btn">List Donation</button>
                <button className="secondary-btn">Save Draft</button>
              </div>
            </div>
            
            <div className="current-inventory">
              <h3>Current Available Items</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Expiry Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierData.availableItems.map(item => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.expiry}</td>
                      <td>
                        <button className="small-btn">Edit</button> 
                        <button className="small-btn danger">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'impact' && (
          <div className="impact-section">
            <h3>Your Environmental & Social Impact</h3>
            
            <div className="impact-cards">
              <div className="impact-card">
                <div className="impact-icon">🍽️</div>
                <h4>Meals Provided</h4>
                <div className="impact-value">{supplierData.impactStats.mealsSaved}</div>
                <p>Meals you've helped provide to people in need</p>
              </div>
              
              <div className="impact-card">
                <div className="impact-icon">🌱</div>
                <h4>CO₂ Emissions Prevented</h4>
                <div className="impact-value">{supplierData.impactStats.co2Prevented} kg</div>
                <p>Equivalent to planting {Math.round(supplierData.impactStats.co2Prevented / 10)} trees</p>
              </div>
              
              <div className="impact-card">
                <div className="impact-icon">♻️</div>
                <h4>Food Waste Diverted</h4>
                <div className="impact-value">{supplierData.impactStats.wasteReduced} kg</div>
                <p>Food waste diverted from landfills</p>
              </div>
            </div>
            
            <div className="impact-charts">
              <div className="chart-container">
                <h4>Your Monthly Impact</h4>
                <div className="chart-placeholder">
                  <div className="chart-message">
                    <div className="chart-icon">📊</div>
                    <p>Monthly impact visualization would appear here, showing your contributions over time.</p>
                  </div>
                </div>
              </div>
              
              <div className="chart-container">
                <h4>Community Comparison</h4>
                <div className="chart-placeholder">
                  <div className="chart-message">
                    <div className="chart-icon">📈</div>
                    <p>You're in the top 15% of contributors in your area!</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="impact-testimonials">
              <h4>Community Impact</h4>
              <div className="testimonial">
                <p>"Your donations have helped us serve over 200 families this month. Thank you for making a difference!"</p>
                <div className="testimonial-source">- MealNet Community Partner</div>
              </div>
              
              <div className="impact-badges">
                <h4>Impact Badges</h4>
                <div className="badges-container">
                  <div className="badge">
                    <div className="badge-icon">🌟</div>
                    <div className="badge-name">First Donation</div>
                  </div>
                  <div className="badge">
                    <div className="badge-icon">🏆</div>
                    <div className="badge-name">100 Meals</div>
                  </div>
                  <div className="badge">
                    <div className="badge-icon">🌍</div>
                    <div className="badge-name">Climate Champion</div>
                  </div>
                  <div className="badge inactive">
                    <div className="badge-icon">💯</div>
                    <div className="badge-name">500 Meals</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="impact-share">
              <h4>Share Your Impact</h4>
              <p>Let others know about your contributions to inspire change</p>
              <div className="share-buttons">
                <button className="share-btn facebook">Share on Facebook</button>
                <button className="share-btn twitter">Share on Twitter</button>
                <button className="share-btn linkedin">Share on LinkedIn</button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'verify' && (
          <div className="verify-volunteer-section card-style"> 
            <h3><i className="fas fa-user-check"></i> Verify Volunteer</h3>

            {/* Step 1: Scan ID or Show Input Form */} 
            {!scannedUsername ? (
              <>
                <p>Scan the volunteer's ID QR code.</p>
                {!showScanner && (
                  <button 
                    className="primary-btn scan-button" 
                    onClick={() => setShowScanner(true)} 
                    disabled={isVerifying}
                  >
                    <i className="fas fa-qrcode"></i> Scan Volunteer ID
                  </button>
                )}
                {/* Scanner container (conditionally rendered or displayed) */} 
                <div id="qr-reader-container" style={{ display: showScanner ? 'block' : 'none' }}>
                   <p><i>Point camera at the volunteer's ID QR code...</i></p>
                   <div id="qr-reader"></div> 
                   <button 
                      className="secondary-btn cancel-scan-btn" 
                      onClick={() => setShowScanner(false)} 
                      disabled={isVerifying}
                    >
                     Cancel Scan
                    </button>
                </div>
              </>
            ) : (
              <> 
                 {/* Step 2: Enter Code */} 
                <form onSubmit={handleVerificationSubmit} className="verify-code-form">
                   <p>Volunteer ID Scanned: <strong>{scannedUsername}</strong></p>
                   <p>Enter the 6-digit code provided by the volunteer:</p>
                   <div className="form-group code-input-group">
                     <input 
                       type="text" 
                       inputMode="numeric" // Hint for numeric keyboard
                       pattern="[0-9]*" // Basic pattern
                       maxLength="6"
                       value={inputCode}
                       onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ''))} // Allow only digits
                       className="code-input"
                       placeholder="_ _ _ _ _ _"
                       required
                       disabled={isVerifying}
                     />
                     <button 
                       type="submit" 
                       className="primary-btn verify-button" 
                       disabled={isVerifying || inputCode.length !== 6}
                     >
                       {isVerifying ? 'Verifying...' : 'Verify Code'}
                     </button>
                   </div>
                 </form>
              </>
            )}
            
            {/* Display Verification Result */} 
            {verificationResult && (
              <div className={`verification-result ${verificationResult.isValid === true ? 'valid' : verificationResult.isValid === false ? 'invalid' : 'pending'}`}>
                <h4>
                  {verificationResult.isValid === true 
                    ? <><i className="fas fa-check-circle"></i> Verification Successful</>
                    : verificationResult.isValid === false
                    ? <><i className="fas fa-times-circle"></i> Verification Failed</>
                    : <><i className="fas fa-spinner fa-spin"></i> Verifying...</>
                  }
                </h4>
                <p>{verificationResult.message}</p>
                {verificationResult.isValid && verificationResult.volunteer && (
                  <p><strong>Volunteer:</strong> {verificationResult.volunteer.username}</p>
                )}
                {/* Button to scan again */} 
                 <button 
                    className="secondary-btn scan-again-btn" 
                    onClick={handleScanAgain} 
                    disabled={isVerifying || showScanner}
                  >
                    Verify Another Volunteer
                  </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard; 