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
import VolunteerDashboard from './pages/VolunteerDashboard';
import Profile from './components/auth/Profile';
import OrganizerDashboard from './pages/OrganizerDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Create a context for user data
export const UserContext = createContext(null);

function App() {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  // Add userData state to store and share user information
  const [userData, setUserData] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated && user) {
      setIsAuthLoading(true);
      
      // Try to get user from the database first
      import('./services/userService').then(({ getUserByAuth0Id }) => {
        getUserByAuth0Id(user.sub)
          .then(response => {
            if (response.success && response.data) {
              // User exists in database, set user data
              setUserData(response.data);
              
              // Update localStorage with most current data
              localStorage.setItem(`username_set_${user.sub}`, 'true');
              localStorage.setItem(`user_nickname_${user.sub}`, response.data.username);
              localStorage.setItem(`user_type_set_${user.sub}`, 'true');
              localStorage.setItem(`user_type_${user.sub}`, response.data.accountType);
              
              setIsAuthLoading(false);
            } else {
              // User not found in database, check localStorage
              checkLocalStorage();
              setIsAuthLoading(false);
            }
          })
          .catch(error => {
            console.error("Error fetching user data:", error);
            // Fallback to localStorage if database fetch fails
            checkLocalStorage();
            setIsAuthLoading(false);
          });
      });
    } else {
      setIsAuthLoading(false);
    }
  }, [isAuthenticated, user]);
  
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
        
        // Attempt to save to database in background to ensure consistency
        // This helps if the user's localStorage data exists but database save failed previously
        import('./services/userService').then(({ saveUser }) => {
          saveUser({
            auth0Id: user.sub,
            username,
            accountType,
            email: user.email || ''
          }).then(response => {
            if (response.success && response.data) {
              // Update with the complete data from the server
              setUserData(response.data);
            }
          }).catch(err => {
            console.error('Background database save failed:', err);
            // Continue with localStorage data even if save fails
          });
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
                  isAuthenticated ? (
                    userData?.accountType === 'business' || userData?.accountType === 'supplier' ? <SupplierDashboard /> :
                    userData?.accountType === 'distributor' || userData?.accountType === 'foodbank' ? <FoodBankDashboard /> :
                    userData?.accountType === 'individual' ? <IndividualDashboard /> :
                    userData?.accountType === 'volunteer' ? <VolunteerDashboard /> :
                    userData?.accountType === 'organizer' ? <OrganizerDashboard /> :
                    isLoading || isCheckingUser || !userData ? <div>Loading dashboard...</div> : 
                    <div>Loading... Determining dashboard type...</div>
                  ) : (
                    <div>Please log in to view the dashboard.</div>
                  )
                } 
              />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<AdminDashboard />} />
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
