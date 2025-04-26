import React, { useState, useEffect } from 'react';
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
import Profile from './components/auth/Profile';

function App() {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  
  useEffect(() => {
    // Only run this check when the user is authenticated and user object is available
    if (isAuthenticated && user?.sub && !isLoading && !isCheckingUser) {
      setIsCheckingUser(true);
      
      // First, check the database for user data
      getUserByAuth0Id(user.sub)
        .then(response => {
          if (response.success && response.data) {
            // User exists in database, update localStorage and don't show modals
            const userData = response.data;
            localStorage.setItem(`user_nickname_${user.sub}`, userData.username);
            localStorage.setItem(`username_set_${user.sub}`, 'true');
            localStorage.setItem(`user_type_${user.sub}`, userData.accountType);
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
    }
  }, [isAuthenticated, user, isLoading]);
  
  // Function to check localStorage if database check fails
  const checkLocalStorage = () => {
    // Check if username has been set in localStorage
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
  };
  
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
            <Route path="/dashboard" element={<Dashboard />} />
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
