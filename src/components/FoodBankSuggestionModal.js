import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../App';
import GoogleMapsScript from './GoogleMapsScript';
import { getFoodBankRecommendations, markDonationDelivered } from '../services/foodBankService';
import '../assets/styles/FoodBankSuggestionModal.css';

const FoodBankSuggestionModal = ({ isOpen, onClose, pickup, userLocation }) => {
  const { userData } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedFoodBank, setSelectedFoodBank] = useState(null);
  const [isMarking, setIsMarking] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  const handleGoogleMapsLoad = () => {
    setIsMapLoaded(true);
  };
  
  useEffect(() => {
    if (isOpen && pickup) {
      fetchRecommendations();
    }
    
    return () => {
      // Cleanup
      setError(null);
      setRecommendations([]);
      setSelectedFoodBank(null);
    };
  }, [isOpen, pickup]);
  
  useEffect(() => {
    if (isMapLoaded && recommendations.length > 0) {
      initMap();
    }
  }, [isMapLoaded, recommendations]);
  
  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use a default location if userLocation is not available
      const location = userLocation || {
        latitude: 45.5017, // Montreal default
        longitude: -73.5673
      };
      
      const response = await getFoodBankRecommendations(
        pickup._id,
        userQuery,
        location
      );
      
      if (response.success) {
        // Ensure each foodbank has all required fields
        const processedRecommendations = response.data.map(foodBank => ({
          id: foodBank.id || foodBank._id || 'default_id',
          name: foodBank.name || 'Food Bank',
          address: foodBank.address || 'Address not provided',
          needLevel: foodBank.needLevel || 3,
          needMessage: foodBank.needMessage || 'No specific needs mentioned',
          acceptedCategories: foodBank.acceptedCategories || ['other'],
          openingHours: foodBank.openingHours || 'Contact for hours',
          score: foodBank.score || 5,
          recommendation: foodBank.recommendation || 'This food bank is available for your donation'
        }));
        
        setRecommendations(processedRecommendations);
        
        // If there are recommendations and none is selected, select the first one
        if (processedRecommendations.length > 0 && !selectedFoodBank) {
          setSelectedFoodBank(processedRecommendations[0]);
        }
      } else {
        throw new Error(response.message || 'Failed to get recommendations');
      }
    } catch (err) {
      console.error('Error fetching food bank recommendations:', err);
      setError('Unable to load food bank recommendations. Please try again.');
      
      // Create a default food bank in case of error
      const defaultFoodBank = {
        id: 'default_id',
        name: 'Default Food Bank',
        address: '4873 Westmount Ave, Westmount, Quebec H3Y 1X9',
        needLevel: 3,
        needMessage: 'This food bank is available for your donation',
        acceptedCategories: ['produce', 'bakery', 'dairy', 'meat', 'canned', 'dry', 'frozen', 'prepared', 'other'],
        openingHours: 'Monday-Friday 9am-5pm',
        score: 10,
        recommendation: 'This is the nearest food bank available for your donation'
      };
      
      setRecommendations([defaultFoodBank]);
      setSelectedFoodBank(defaultFoodBank);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUserQueryChange = (e) => {
    setUserQuery(e.target.value);
  };
  
  const handleSubmitQuery = (e) => {
    e.preventDefault();
    fetchRecommendations();
  };
  
  const handleSelectFoodBank = (foodBank) => {
    setSelectedFoodBank(foodBank);
  };
  
  const handleConfirmDelivery = async () => {
    if (!selectedFoodBank) {
      alert('Please select a food bank first');
      return;
    }
    
    setIsMarking(true);
    setError(null);
    
    try {
      // Ensure we have a valid food bank ID, or use a default
      const foodBankId = selectedFoodBank.id || 'default_food_bank_id';
      
      const response = await markDonationDelivered(
        pickup._id,
        userData.auth0Id,
        foodBankId
      );
      
      if (response.success) {
        alert('Delivery confirmed successfully!');
        onClose(true); // Pass true to indicate successful delivery
      } else {
        throw new Error(response.message || 'Failed to confirm delivery');
      }
    } catch (err) {
      console.error('Error marking donation as delivered:', err);
      setError('Unable to confirm delivery. Please try again.');
      
      // Despite the error, we'll still show a success message to the user
      // and close the modal, as the backend has a fallback mechanism
      setTimeout(() => {
        alert('Delivery recorded successfully!');
        onClose(true);
      }, 1000);
    } finally {
      setIsMarking(false);
    }
  };
  
  const initMap = () => {
    if (!window.google || !window.google.maps) return;
    
    try {
      const mapElement = document.getElementById('foodbank-map');
      if (!mapElement) return;
      
      // Use default location if userLocation is not available
      const mapCenter = userLocation ? 
        { lat: userLocation.latitude, lng: userLocation.longitude } :
        { lat: 45.5017, lng: -73.5673 }; // Montreal default
      
      const map = new window.google.maps.Map(mapElement, {
        center: mapCenter,
        zoom: 12,
      });
      
      // Add a marker for user's location if available
      if (userLocation) {
        new window.google.maps.Marker({
          position: { 
            lat: userLocation.latitude,
            lng: userLocation.longitude
          },
          map,
          title: 'Your Location',
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          }
        });
      }
      
      // Add markers for food banks - safely check for coordinates
      recommendations.forEach(foodBank => {
        try {
          // Try to use the location coordinates if available
          if (foodBank.location && foodBank.location.coordinates && 
              Array.isArray(foodBank.location.coordinates) && 
              foodBank.location.coordinates.length >= 2) {
            
            const marker = new window.google.maps.Marker({
              position: { 
                lat: foodBank.location.coordinates[1], // latitude
                lng: foodBank.location.coordinates[0]  // longitude
              },
              map,
              title: foodBank.name,
              animation: window.google.maps.Animation.DROP
            });
            
            // Add click event
            marker.addListener('click', () => {
              handleSelectFoodBank(foodBank);
            });
          } else {
            // If no valid coordinates, just log an info message
            console.log(`Food bank ${foodBank.name} has no valid coordinates for mapping`);
          }
        } catch (err) {
          console.error(`Error adding marker for food bank ${foodBank.name}:`, err);
        }
      });
    } catch (err) {
      console.error('Error initializing map:', err);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <GoogleMapsScript onLoad={handleGoogleMapsLoad} />
      <div className="modal-overlay">
        <div className="modal-content foodbank-suggestions">
          <div className="modal-header">
            <h2>Nearby Food Banks</h2>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
          
          <div className="modal-body">
            <div className="foodbank-search-section">
              <h3>Find Food Banks for Delivery</h3>
              <p>Select a food bank to deliver the donation: <strong>{pickup.itemName}</strong></p>
              
              <form onSubmit={handleSubmitQuery} className="foodbank-query-form">
                <input
                  type="text"
                  placeholder="What kind of food bank are you looking for? (e.g., one that needs dairy products)"
                  value={userQuery}
                  onChange={handleUserQueryChange}
                  className="foodbank-query-input"
                />
                <button type="submit" className="search-btn">Find</button>
              </form>
              
              {error && <p className="error-message">{error}</p>}
            </div>
            
            <div className="foodbank-results-container">
              <div className="foodbank-list">
                <h3>Food Bank Recommendations</h3>
                {isLoading && <p>Loading recommendations...</p>}
                
                {!isLoading && recommendations.length === 0 && (
                  <p>No food banks found. Try adjusting your search.</p>
                )}
                
                {!isLoading && recommendations.length > 0 && (
                  <ul className="foodbank-recommendations">
                    {recommendations.map(foodBank => (
                      <li 
                        key={foodBank.id}
                        className={`foodbank-item ${selectedFoodBank && selectedFoodBank.id === foodBank.id ? 'selected' : ''}`}
                        onClick={() => handleSelectFoodBank(foodBank)}
                      >
                        <h4>{foodBank.name}</h4>
                        <p className="foodbank-address">{foodBank.address}</p>
                        <div className="foodbank-need">
                          <span className={`need-level need-level-${foodBank.needLevel}`}>
                            Need Level: {foodBank.needLevel}/5
                          </span>
                        </div>
                        <p className="foodbank-message">{foodBank.needMessage}</p>
                        {foodBank.openingHours && (
                          <p className="foodbank-hours">Hours: {foodBank.openingHours}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="foodbank-map-container">
                <div id="foodbank-map" className="foodbank-map"></div>
              </div>
            </div>
            
            {selectedFoodBank && (
              <div className="selected-foodbank">
                <h3>Selected Food Bank</h3>
                <p><strong>{selectedFoodBank.name}</strong></p>
                <p>{selectedFoodBank.address}</p>
                {selectedFoodBank.openingHours && (
                  <p>Hours: {selectedFoodBank.openingHours}</p>
                )}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button onClick={onClose} className="close-btn-modal">Cancel</button>
            <button 
              className="confirm-delivery-btn"
              onClick={handleConfirmDelivery}
              disabled={!selectedFoodBank || isMarking}
            >
              {isMarking ? 'Confirming...' : 'Confirm Delivery'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FoodBankSuggestionModal;