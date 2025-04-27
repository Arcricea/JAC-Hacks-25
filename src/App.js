import React, { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './App.css';
import { getUserByAuth0Id } from './services/userService';

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
import Dashboard from './pages/Dashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import FoodBankDashboard from './pages/FoodBankDashboard';
import IndividualDashboard from './pages/IndividualDashboard';
import Profile from './components/auth/Profile';

// Create a context for user data
export const UserContext = createContext(null);

function App() {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  // Add userData state to store and share user information
  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    // Only run this check when the user is authenticated and user object is available
    if (isAuthenticated && user?.sub && !isLoading && !isCheckingUser) {
      setIsCheckingUser(true);
      
      // First, check the database for user data
      getUserByAuth0Id(user.sub)
        .then(response => {
          if (response.success && response.data) {
            // User exists in database, update localStorage and don't show modals
            const dbUserData = response.data;
            
            // Store user data in state for immediate access across the app
            setUserData(dbUserData);
            
            // Also update localStorage
            localStorage.setItem(`user_nickname_${user.sub}`, dbUserData.username);
            localStorage.setItem(`username_set_${user.sub}`, 'true');
            localStorage.setItem(`user_type_${user.sub}`, dbUserData.accountType);
            localStorage.setItem(`user_type_set_${user.sub}`, 'true');
            
            // Don't show the modals since user is already set up
            setShowUsernameModal(false);
            setShowUserTypeModal(false);
          } else {
            // Should not happen - API should return 404 if user not found
            checkLocalStorage();
          }
        })
        .catch(error => {
          // User doesn't exist in database, check localStorage as fallback
          checkLocalStorage();
        })
        .finally(() => {
          setIsCheckingUser(false);
        });
    } else if (!isAuthenticated) {
      // Clear userData when not authenticated
      setUserData(null);
    }
  }, [isAuthenticated, user, isLoading]);
  
  // Function to check localStorage if database check fails
  const checkLocalStorage = () => {
    if (!user?.sub) return;
    
    // Check if username has been set in localStorage
    const hasUsername = localStorage.getItem(`username_set_${user.sub}`);
    if (!hasUsername) {
      setShowUsernameModal(true);
    } else {
      // Get username from localStorage
      const username = localStorage.getItem(`user_nickname_${user.sub}`);
      
      // If username is set, check if user type is set
      const hasUserType = localStorage.getItem(`user_type_set_${user.sub}`);
      if (!hasUserType) {
        setShowUserTypeModal(true);
      } else {
        // Get account type from localStorage
        const accountType = localStorage.getItem(`user_type_${user.sub}`);
        
        // Store local data in userData state
        setUserData({
          auth0Id: user.sub,
          username,
          accountType
        });
      }
    }
  };
  
  const handleUsernameComplete = (username) => {
    setShowUsernameModal(false);
    
    // Update userData with the new username
    setUserData(prev => ({
      ...prev,
      auth0Id: user?.sub,
      username
    }));
    
    // After username is set, show user type modal
    setShowUserTypeModal(true);
  };
  
  const handleUserTypeComplete = (userType) => {
    setShowUserTypeModal(false);
    
    // Update userData with the selected userType
    setUserData(prev => ({
      ...prev,
      accountType: userType
    }));
    
    console.log('User type selected:', userType);
  };

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
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
              <Route 
                path="/dashboard" 
                element={
                  <Dashboard 
                    userType={
                      userData?.accountType === 'business' || userData?.accountType === 'supplier' ? 'supplier' :
                      userData?.accountType === 'distributor' || userData?.accountType === 'foodbank' ? 'foodbank' :
                      userData?.accountType === 'individual' ? 'individual' : 
                      'foodbank' // Default fallback type
                    }
                  />
                } 
              />
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
    </UserContext.Provider>
  );
}

export default App;
