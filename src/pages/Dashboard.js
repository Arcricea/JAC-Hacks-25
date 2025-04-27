import React from 'react';
import '../assets/styles/Dashboard.css';
import FoodBankDashboard from './FoodBankDashboard';
import SupplierDashboard from './SupplierDashboard';
import IndividualDashboard from './IndividualDashboard';

const Dashboard = ({ userType = 'foodbank' }) => {
  // Render the appropriate dashboard based on user type
  const renderDashboard = () => {
    switch(userType) {
      case 'supplier':
        return (
          <>
            <h2>Restaurant/Grocer Dashboard</h2>
            <SupplierDashboard />
          </>
        );
      case 'foodbank':
        return (
          <>
            <h2>Food Bank Dashboard</h2>
            <FoodBankDashboard />
          </>
        );
      case 'individual':
        return (
          <>
            <h2>Individual Dashboard</h2>
            <IndividualDashboard />
          </>
        );
      default:
        return <div>Unknown user type</div>;
    }
  };

  return (
    <div className="dashboard-container">
      {renderDashboard()}
    </div>
  );
};

export default Dashboard; 