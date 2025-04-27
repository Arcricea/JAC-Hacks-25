import React, { useState, useContext, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth'; // Import otpauth
import { UserContext } from '../App';
import '../assets/styles/Dashboard.css'; // Reuse existing dashboard styles for now
import '../assets/styles/VolunteerDashboard.css'; // Add specific styles

const VolunteerDashboard = () => {
  const { userData } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('qrcode'); // Default tab
  const [currentCode, setCurrentCode] = useState('------');
  const [timeRemaining, setTimeRemaining] = useState(30); // TOTP period (usually 30s)
  const intervalRef = useRef(null);
  const totpRef = useRef(null);

  useEffect(() => {
    // Clear previous interval on component unmount or when secret changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (userData?.volunteerSecret) {
      // Initialize TOTP instance
      try {
        totpRef.current = OTPAuth.URI.parse(`otpauth://totp/MealNet:${userData.username}?secret=${userData.volunteerSecret}&issuer=MealNet&algorithm=SHA1&digits=6&period=30`);
      } catch (error) {
        console.error("Error parsing OTPAuth URI:", error);
        setCurrentCode('Error');
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      const updateCodeAndTime = () => {
        if (!totpRef.current) return;

        const code = totpRef.current.generate();
        setCurrentCode(code);

        const remaining = totpRef.current.period - (Math.floor(Date.now() / 1000) % totpRef.current.period);
        setTimeRemaining(remaining);
      };

      // Update immediately
      updateCodeAndTime();

      // Set interval to update every second
      if (intervalRef.current) clearInterval(intervalRef.current); // Clear previous interval
      intervalRef.current = setInterval(updateCodeAndTime, 1000);

    } else {
      // No secret, clear interval and reset state
      setCurrentCode('------');
      setTimeRemaining(30);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    // Cleanup function for this effect
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userData?.volunteerSecret, userData?.username]); // Rerun if secret or username changes

  // Combine username and code for the QR code value
  const qrCodeValue = (userData?.username && currentCode && currentCode !== '------' && currentCode !== 'Error') 
                      ? `${userData.username}:${currentCode}` 
                      : 'loading'; // Fallback value

  // Basic volunteer data - can be expanded later
  const volunteerData = {
    tasksCompleted: 12, // Example data
    upcomingShifts: [
      { id: 1, location: 'Community Food Bank', date: '2025-05-10', time: '9:00 AM - 12:00 PM' },
      { id: 2, location: 'Downtown Shelter', date: '2025-05-15', time: '1:00 PM - 4:00 PM' },
    ]
  };

  return (
    <div className="dashboard-container">
      <h2>Volunteer Dashboard</h2>
      
      <div className="dashboard-nav">
        <button 
          className={activeTab === 'qrcode' ? 'active' : ''} 
          onClick={() => setActiveTab('qrcode')}
        >
          My QR Code
        </button>
        <button 
          className={activeTab === 'tasks' ? 'active' : ''} 
          onClick={() => setActiveTab('tasks')}
        >
          Volunteer Tasks
        </button>
        {/* Add more tabs as needed */}
      </div>

      <div className="dashboard-content">
        {activeTab === 'qrcode' && (
          <div className="qr-code-section card-style volunteer-id-card">
            <h3><i className="fas fa-qrcode"></i> Your Volunteer Code</h3>
            <p>Ask the location to scan this QR code. It updates automatically.</p>
            
            <div className="verification-details-container single-qr-display">
              {/* Combined QR Code and Timer */} 
              <div className="dynamic-code-section full-width">
                  {userData?.volunteerSecret && userData?.username ? (
                    <div className="totp-display-combined">
                       <div className="qr-code-container">
                          <div className="qr-code-display">
                            {qrCodeValue !== 'loading' ? (
                               <QRCodeSVG 
                                value={qrCodeValue} // Combined value
                                size={200} 
                                level={"H"} 
                                includeMargin={true}
                              />
                            ) : (
                               <div className="qr-loading">Generating code...</div>
                            )}
                           
                          </div>
                       </div>
                       <div className="totp-timer">
                        <span>Code: <strong>{currentCode}</strong></span>
                        <span>Refreshes in: {timeRemaining}s</span>
                        <div className="timer-bar-container">
                          <div 
                              className="timer-bar" 
                              style={{ width: `${(timeRemaining / 30) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-warning">Code generation unavailable. Ensure profile is complete.</div>
                  )}
              </div>
            </div> 
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="tasks-section card-style">
            <h3><i className="fas fa-tasks"></i> Upcoming Shifts</h3>
             <table className="data-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {volunteerData.upcomingShifts.map(shift => (
                  <tr key={shift.id}>
                    <td>{shift.location}</td>
                    <td>{shift.date}</td>
                    <td>{shift.time}</td>
                    <td><button className="secondary-btn">View Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="stats-overview">
                 <div className="stat-card">
                    <h4>Tasks Completed</h4>
                    <p className="stat-value">{volunteerData.tasksCompleted}</p>
                </div>
                {/* Add more stats */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard; 