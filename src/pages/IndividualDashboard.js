import React, { useState } from 'react';
import '../assets/styles/Dashboard.css';

const IndividualDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const individualData = {
    availableAssistance: [
      { id: 1, provider: 'Community Food Bank', type: 'Food Package', location: '123 Main St', date: '2025-04-28' },
      { id: 2, provider: 'Fresh Start', type: 'Hot Meal', location: '45 Oak Ave', date: '2025-04-27' },
    ],
    upcomingAppointments: [
      { id: 1, provider: 'Hope Pantry', date: '2025-04-30', time: '10:00 AM', status: 'Confirmed' }
    ],
    assistanceHistory: [
      { id: 1, provider: 'Community Food Bank', date: '2025-04-15', items: 'Weekly food package' },
      { id: 2, provider: 'Fresh Start', date: '2025-04-08', items: 'Hot meal and groceries' },
    ]
  };

  return (
    <div className="dashboard-content">
      <div className="dashboard-nav">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'assistance' ? 'active' : ''} 
          onClick={() => setActiveTab('assistance')}
        >
          Find Assistance
        </button>
        <button 
          className={activeTab === 'appointments' ? 'active' : ''} 
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="upcoming-assistance">
            <h3>Available Assistance</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {individualData.availableAssistance.map(assistance => (
                  <tr key={assistance.id}>
                    <td>{assistance.provider}</td>
                    <td>{assistance.type}</td>
                    <td>{assistance.location}</td>
                    <td>{assistance.date}</td>
                    <td><button className="small-btn">Request</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="appointments">
            <h3>Upcoming Appointments</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {individualData.upcomingAppointments.map(appointment => (
                  <tr key={appointment.id}>
                    <td>{appointment.provider}</td>
                    <td>{appointment.date}</td>
                    <td>{appointment.time}</td>
                    <td><span className="status confirmed">{appointment.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assistance and Appointments tabs would go here */}
    </div>
  );
};

export default IndividualDashboard; 