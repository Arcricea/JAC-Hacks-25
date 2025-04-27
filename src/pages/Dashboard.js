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
        return <SupplierDashboard />;
      case 'foodbank':
        return <FoodBankDashboard />;
      case 'individual':
        return <IndividualDashboard />;
      default:
        return <FoodBankDashboard />; // Default to food bank dashboard
    }
  };

  return (
    <div className="dashboard-container">
      {renderDashboard()}
    </div>
  );
};

export default Dashboard; 