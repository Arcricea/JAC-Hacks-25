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
          className={activeTab === 'history' ? 'active' : ''} 
          onClick={() => setActiveTab('history')}
        >
          Assistance History
        </button>
        <button 
          className={activeTab === 'resources' ? 'active' : ''} 
          onClick={() => setActiveTab('resources')}
        >
          Resources
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-section">
          <h3>Available Assistance</h3>
          <div className="assistance-cards">
            {individualData.availableAssistance.map(assistance => (
              <div key={assistance.id} className="assistance-card">
                <h4>{assistance.type}</h4>
                <p><strong>Provider:</strong> {assistance.provider}</p>
                <p><strong>Location:</strong> {assistance.location}</p>
                <p><strong>Date:</strong> {assistance.date}</p>
                <button className="primary-btn">Request Assistance</button>
              </div>
            ))}
          </div>
          
          <h3>Upcoming Appointments</h3>
          {individualData.upcomingAppointments.length > 0 ? (
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
                    <td>{appointment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data-message">No upcoming appointments</p>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="history-section">
          <h3>Assistance History</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Date</th>
                <th>Items Received</th>
              </tr>
            </thead>
            <tbody>
              {individualData.assistanceHistory.map(history => (
                <tr key={history.id}>
                  <td>{history.provider}</td>
                  <td>{history.date}</td>
                  <td>{history.items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {activeTab === 'resources' && (
        <div className="resources-section">
          <h3>Additional Resources</h3>
          <div className="resource-cards">
            <div className="resource-card">
              <h4>Nutrition Information</h4>
              <p>Access guides on balanced meals and nutrition with limited resources.</p>
              <button className="secondary-btn">View Resources</button>
            </div>
            <div className="resource-card">
              <h4>Financial Assistance</h4>
              <p>Information on additional support programs and financial assistance.</p>
              <button className="secondary-btn">Learn More</button>
            </div>
            <div className="resource-card">
              <h4>Volunteer Opportunities</h4>
              <p>Give back to the community by volunteering at local food banks.</p>
              <button className="secondary-btn">Find Opportunities</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualDashboard; 