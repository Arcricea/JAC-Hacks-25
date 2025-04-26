import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './App.css';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import UsernameSetupModal from './components/auth/UsernameSetupModal';
import UserTypeModal from './components/auth/UserTypeModal';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Contact from './pages/Contact';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import SupplierDashboard from './pages/SupplierDashboard';
import FoodBankDashboard from './pages/FoodBankDashboard';
import IndividualDashboard from './pages/IndividualDashboard';
import Profile from './components/auth/Profile';

function App() {
  const { isAuthenticated, user } = useAuth0();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  
  useEffect(() => {
    // Only run this check when the user is authenticated and user object is available
    if (isAuthenticated && user?.sub) {
      // Check if username has been set
      const hasUsername = localStorage.getItem(`username_set_${user.sub}`);
      if (!hasUsername) {
        setShowUsernameModal(true);
      } else {
        // If username is set, check if user type is set
        const hasUserType = localStorage.getItem(`user_type_set_${user.sub}`);
        if (!hasUserType) {
          setShowUserTypeModal(true);
        }
      }
    }
  }, [isAuthenticated, user]);
  
  const handleUsernameComplete = (username) => {
    setShowUsernameModal(false);
    // After username is set, show user type modal
    setShowUserTypeModal(true);
  };
  
  const handleUserTypeComplete = (userType) => {
    setShowUserTypeModal(false);
    // Do something with the selected user type if needed
    console.log('User type selected:', userType);
  };

  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/supplier-dashboard" element={<SupplierDashboard />} />
            <Route path="/foodbank-dashboard" element={<FoodBankDashboard />} />
            <Route path="/individual-dashboard" element={<IndividualDashboard />} />
            <Route path="/profile" element={<Profile />} />
            {/* Add more routes as needed */}
          </Routes>
        </main>
        <Footer />
        
        {/* Modals */}
        <UsernameSetupModal 
          isOpen={showUsernameModal} 
          onComplete={handleUsernameComplete} 
        />
        <UserTypeModal 
          isOpen={showUserTypeModal} 
          onComplete={handleUserTypeComplete} 
        />
      </div>
    </Router>
  );
}

export default App;
