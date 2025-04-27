import React, { useState, useContext } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { UserContext } from '../App';
import '../assets/styles/Dashboard.css'; // Reuse existing dashboard styles for now

const VolunteerDashboard = () => {
  const { userData } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('qrcode'); // Default tab

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
          <div className="qr-code-section">
            <h3>Your Volunteer ID</h3>
            <p>Present this QR code at participating locations for verification.</p>
            {userData?.volunteerToken ? (
              <div className="qr-code-display">
                <QRCodeCanvas 
                  value={userData.volunteerToken} 
                  size={256}
                  level={"H"}
                  includeMargin={true}
                />
                <p className="token-info">Token: {userData.volunteerToken.substring(0, 8)}...</p> 
              </div>
            ) : (
              <p className="error-message">Volunteer token not found. Please contact support if you believe this is an error.</p>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="tasks-section">
            <h3>Upcoming Shifts</h3>
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