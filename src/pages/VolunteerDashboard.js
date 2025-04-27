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
          <div className="qr-code-section card-style">
            <h3><i className="fas fa-id-badge"></i> Your Volunteer ID & Code</h3>
            
            {/* Section for Static ID QR Code */} 
            <div className="static-id-section">
              <p>Let the business scan this QR code to identify you:</p>
              {userData?.username ? (
                 <div className="qr-code-container">
                    <div className="qr-code-display">
                      <QRCodeSVG 
                        value={userData.username} // QR Code now contains the username
                        size={180} 
                        level={"H"} 
                        includeMargin={true}
                      />
                    </div>
                    <p className="token-info">ID: {userData.username}</p> 
                 </div>
              ) : (
                 <div className="alert alert-warning">Username not found. Cannot display ID QR code.</div>
              )}
            </div>
            
            <hr className="divider" />

            {/* Section for Dynamic TOTP Code */} 
             <div className="dynamic-code-section">
                <p>Then, provide the following 6-digit code:</p>
                {userData?.volunteerSecret ? (
                  <div className="totp-display">
                    <div className="totp-code">{currentCode}</div>
                    <div className="totp-timer">
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
                  <div className="alert alert-warning">Volunteer secret not set up. Cannot generate code.</div>
                )}
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