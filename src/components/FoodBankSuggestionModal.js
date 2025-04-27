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
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const handleGoogleMapsLoad = () => {
    setIsMapLoaded(true);
  };
  
  useEffect(() => {
    if (isOpen && pickup) {
      // Always fetch recommendations when modal opens, with or without userLocation
      fetchRecommendations();
    }
    
    return () => {
      // Cleanup
      setError(null);
      setRecommendations([]);
      setSelectedFoodBank(null);
    };
  }, [isOpen, pickup]);
  
  // Add a separate effect to log coordinates for debugging
  useEffect(() => {
    if (recommendations.length > 0) {
      console.log('Food bank recommendations loaded:', recommendations);
      recommendations.forEach(fb => {
        if (fb.location && fb.location.coordinates) {
          console.log(`Food bank ${fb.name} has coordinates:`, fb.location.coordinates);
        } else {
          console.log(`Food bank ${fb.name} is missing coordinates`);
          // Log the entire food bank object to identify its structure
          console.log('Full object:', fb);
        }
      });
    }
  }, [recommendations]);
  
  useEffect(() => {
    if (isMapLoaded && recommendations.length > 0) {
      initMap();
    }
  }, [isMapLoaded, recommendations]);
  
  const geocodeAddress = async (address) => {
    try {
      // Use Google Maps Geocoding API directly
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        
        return new Promise((resolve, reject) => {
          geocoder.geocode({ address: address }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              const location = results[0].geometry.location;
              console.log(`Geocoded ${address} to:`, location.lat(), location.lng());
              
              // Return in the format expected by our app
              resolve([location.lng(), location.lat()]);
            } else {
              console.warn(`Geocoding failed for address: ${address}`, status);
              // Fall back to generateCoordinatesFromAddress
              const fallbackCoords = generateCoordinatesFromAddress(address);
              console.log(`Using fallback coordinates for ${address}:`, fallbackCoords);
              resolve(fallbackCoords);
            }
          });
        });
      } else {
        // Fall back to our function if Google Geocoder is not available
        return generateCoordinatesFromAddress(address);
      }
    } catch (error) {
      console.error('Error in geocodeAddress:', error);
      return generateCoordinatesFromAddress(address);
    }
  };
  
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
        // Process the food banks with proper geocoding
        const processedRecommendations = await Promise.all(response.data.map(async foodBank => {
          let coordinates;
          
          // Use the food bank's existing coordinates if available
          if (foodBank.location && foodBank.location.coordinates && 
              Array.isArray(foodBank.location.coordinates) && 
              foodBank.location.coordinates.length === 2) {
            coordinates = foodBank.location.coordinates;
          } else {
            // Otherwise, geocode the address
            coordinates = await geocodeAddress(foodBank.address);
          }
          
          return {
            id: foodBank.id || foodBank._id || 'default_id',
            name: foodBank.name || 'Food Bank',
            address: foodBank.address || 'Address not provided',
            needLevel: foodBank.needLevel || 3,
            needMessage: foodBank.needMessage || 'No specific needs mentioned',
            acceptedCategories: foodBank.acceptedCategories || ['other'],
            openingHours: foodBank.openingHours || 'Contact for hours',
            score: foodBank.score || 5,
            recommendation: foodBank.recommendation || 'This food bank is available for your donation',
            // Use the geocoded coordinates
            location: {
              type: 'Point',
              coordinates: coordinates
            }
          };
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
        recommendation: 'This is the nearest food bank available for your donation',
        location: {
          type: 'Point',
          coordinates: [-73.6049, 45.4850] // Montreal coordinates
        }
      };
      
      setRecommendations([defaultFoodBank]);
      setSelectedFoodBank(defaultFoodBank);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate approximate coordinates for demonstration purposes when actual coordinates are missing
  const generateCoordinatesFromAddress = (address) => {
    // Default to Montreal coordinates
    let baseLat = 45.5017;
    let baseLng = -73.5673;
    
    // Create a deterministic but random-looking offset based on the address string
    // This is just for demonstration - in production, you'd use a geocoding service
    if (address) {
      // Use the string to generate a hash-like number
      let hash = 0;
      for (let i = 0; i < address.length; i++) {
        hash = (hash << 5) - hash + address.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Use the hash to generate small offsets (±0.03 degrees, ~3km)
      const latOffset = (hash % 600) / 10000; // ±0.03 latitude
      const lngOffset = ((hash >> 10) % 600) / 10000; // ±0.03 longitude
      
      return [baseLng + lngOffset, baseLat + latOffset];
    }
    
    return [baseLng, baseLat];
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
      
      // We'll no longer auto-close on error
      // Instead, let the user try again
      setIsMarking(false);
    } finally {
      setIsMarking(false);
    }
  };
  
  const initMap = () => {
    if (!window.google || !window.google.maps) return;
    
    try {
      const mapElement = document.getElementById('foodbank-map');
      if (!mapElement) return;
      
      console.log('Initializing map with recommendations:', recommendations);
      
      // Create the map with a default center
      const defaultCenter = { lat: 45.5017, lng: -73.5673 }; // Montreal
      const map = new window.google.maps.Map(mapElement, {
        center: defaultCenter,
        zoom: 13, // Higher default zoom level
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
        },
        fullscreenControl: true,
        streetViewControl: false,
      });
      
      // Create bounds to encapsulate all markers
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidMarkers = false;
      let markers = [];
      
      // Add markers for all food banks
      recommendations.forEach((foodBank, index) => {
        try {
          console.log(`Attempting to add marker for food bank ${index}: ${foodBank.name}`);
          
          // Extract coordinates, defaulting to empty array if not present
          const coordinates = foodBank.location?.coordinates || [];
          console.log(`Food bank coordinates:`, coordinates);
          
          // Check if coordinates are valid (array with 2 elements)
          if (Array.isArray(coordinates) && coordinates.length >= 2) {
            // Create position from coordinates
            const position = { 
              lat: parseFloat(coordinates[1]), // latitude
              lng: parseFloat(coordinates[0])  // longitude
            };
            
            console.log(`Marker position:`, position);
            
            // Validate the position coordinates
            if (isNaN(position.lat) || isNaN(position.lng)) {
              console.warn(`Invalid coordinates for food bank ${foodBank.name}`);
              return; // Skip this food bank
            }
            
            // Create marker with a highly visible icon
            const marker = new window.google.maps.Marker({
              position: position,
              map: map,
              title: foodBank.name,
              animation: window.google.maps.Animation.DROP,
              icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                // Make the icon larger
                scaledSize: new window.google.maps.Size(42, 42)
              },
              zIndex: 100 // Ensure food banks appear on top
            });
            
            // Add marker to array for later reference
            markers.push({ marker, foodBank });
            
            // Create info window with food bank details
            const infoContent = `
              <div class="map-info-window">
                <h4>${foodBank.name}</h4>
                <p><strong>Address:</strong> ${foodBank.address}</p>
                <p><strong>Need Level:</strong> ${foodBank.needLevel}/5</p>
                ${foodBank.openingHours ? `<p><strong>Hours:</strong> ${foodBank.openingHours}</p>` : ''}
                <p><strong>${foodBank.recommendation}</strong></p>
              </div>
            `;
            
            const infoWindow = new window.google.maps.InfoWindow({
              content: infoContent,
              maxWidth: 320
            });
            
            // Add click event for info window and selection
            marker.addListener('click', () => {
              // Close any open info windows
              markers.forEach(m => {
                if (m.infoWindow && m.infoWindow.getMap()) {
                  m.infoWindow.close();
                }
              });
              
              // Open this info window
              infoWindow.open(map, marker);
              
              // Select this food bank
              handleSelectFoodBank(foodBank);
              
              // Pan map to this marker and zoom in
              map.panTo(marker.getPosition());
              map.setZoom(15);
            });
            
            // Store info window on marker object
            marker.infoWindow = infoWindow;
            
            // Extend bounds to include this marker
            bounds.extend(position);
            hasValidMarkers = true;
            
            // If this is the selected food bank, add a highlight effect and open its info window
            if (selectedFoodBank && selectedFoodBank.id === foodBank.id) {
              setTimeout(() => {
                infoWindow.open(map, marker);
                map.panTo(marker.getPosition());
                map.setZoom(15);
                marker.setAnimation(window.google.maps.Animation.BOUNCE);
                setTimeout(() => {
                  marker.setAnimation(null);
                }, 1500);
              }, 500);
            }
          } else {
            console.warn(`Food bank ${foodBank.name} has invalid coordinates format:`, coordinates);
          }
        } catch (err) {
          console.error(`Error adding marker for food bank ${foodBank.name}:`, err);
        }
      });
      
      // Add user location marker if available (This is the pickup location)
      if (userLocation) {
        try {
          const userPosition = { 
            lat: parseFloat(userLocation.latitude), 
            lng: parseFloat(userLocation.longitude) 
          };
          
          // Validate user coordinates
          if (!isNaN(userPosition.lat) && !isNaN(userPosition.lng)) {
            const userMarker = new window.google.maps.Marker({
              position: userPosition,
              map: map,
              title: 'Pickup Location',
              icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new window.google.maps.Size(36, 36)
              },
              zIndex: 50, // Below food banks
              animation: window.google.maps.Animation.DROP
            });
            
            // Create info window for pickup location
            const pickupInfoContent = `
              <div class="map-info-window">
                <h4>Pickup Location</h4>
                <p><strong>Item:</strong> ${pickup.itemName}</p>
                <p><strong>Quantity:</strong> ${pickup.quantity || '1'}</p>
                <p><strong>Category:</strong> ${pickup.category || 'Not specified'}</p>
              </div>
            `;
            
            const pickupInfoWindow = new window.google.maps.InfoWindow({
              content: pickupInfoContent,
              maxWidth: 320
            });
            
            // Add click event for pickup location
            userMarker.addListener('click', () => {
              pickupInfoWindow.open(map, userMarker);
              map.panTo(userMarker.getPosition());
              map.setZoom(15);
            });
            
            // Include user location in bounds
            bounds.extend(userPosition);
            hasValidMarkers = true;
            
            // If no food bank is selected yet, focus on pickup location first
            if (!selectedFoodBank) {
              setTimeout(() => {
                pickupInfoWindow.open(map, userMarker);
                map.panTo(userMarker.getPosition());
                map.setZoom(15);
              }, 500);
            }
          }
        } catch (error) {
          console.error('Error adding user location marker:', error);
        }
      }
      
      // Adjust map bounds to show all markers
      if (hasValidMarkers) {
        console.log('Adjusting map bounds to show all markers');
        map.fitBounds(bounds);
        
        // Add a padding to the bounds
        const boundsListener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          map.setZoom(Math.min(13, map.getZoom()));
        });
      } else {
        console.warn('No valid markers found, using default map center');
        map.setCenter(defaultCenter);
      }
      
      // Add a control to toggle between viewing all markers and focusing on selected
      const controlDiv = document.createElement('div');
      controlDiv.style.backgroundColor = '#fff';
      controlDiv.style.border = '2px solid #fff';
      controlDiv.style.borderRadius = '3px';
      controlDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
      controlDiv.style.cursor = 'pointer';
      controlDiv.style.marginBottom = '22px';
      controlDiv.style.textAlign = 'center';
      controlDiv.title = 'Click to toggle view';
      
      const controlUI = document.createElement('div');
      controlUI.style.color = 'rgb(25,25,25)';
      controlUI.style.fontFamily = 'Roboto,Arial,sans-serif';
      controlUI.style.fontSize = '12px';
      controlUI.style.lineHeight = '38px';
      controlUI.style.paddingLeft = '5px';
      controlUI.style.paddingRight = '5px';
      controlUI.innerHTML = 'Show All Locations';
      controlDiv.appendChild(controlUI);
      
      // Add a click event to toggle between viewing all markers and focusing on selected
      controlDiv.addEventListener('click', function() {
        if (controlUI.innerHTML === 'Show All Locations') {
          map.fitBounds(bounds);
          controlUI.innerHTML = 'Focus Selected';
        } else {
          if (selectedFoodBank) {
            const found = markers.find(m => m.foodBank.id === selectedFoodBank.id);
            if (found) {
              map.panTo(found.marker.getPosition());
              map.setZoom(15);
            }
          }
          controlUI.innerHTML = 'Show All Locations';
        }
      });
      
      map.controls[window.google.maps.ControlPosition.TOP_CENTER].push(controlDiv);
      
      // Store map reference for potential later use
      window.foodBankMap = map;
      
    } catch (err) {
      console.error('Error initializing map:', err);
    }
  };
  
  const toggleFullscreen = () => {
    console.log('Toggling fullscreen mode, current state:', isFullscreen);
    
    // When entering fullscreen, we'll need to initialize the fullscreen map
    if (!isFullscreen) {
      setIsFullscreen(true);
      document.body.style.overflow = 'hidden'; // Prevent scrolling when fullscreen is active
      
      // Short delay to ensure DOM is ready
      setTimeout(() => {
        try {
          initFullscreenMap();
          console.log('Fullscreen map initialized');
        } catch (err) {
          console.error('Error initializing fullscreen map:', err);
        }
      }, 100);
    } else {
      setIsFullscreen(false);
      document.body.style.overflow = ''; // Restore scrolling
      console.log('Exiting fullscreen mode');
    }
  };
  
  const initFullscreenMap = () => {
    if (!window.google || !window.google.maps) {
      console.error('Google Maps API not loaded');
      return;
    }
    
    try {
      const mapElement = document.getElementById('fullscreen-map');
      if (!mapElement) {
        console.error('Fullscreen map element not found');
        return;
      }
      
      console.log('Initializing fullscreen map');
      
      // Create the map with the same center as the regular map
      const defaultCenter = { lat: 45.5017, lng: -73.5673 }; // Montreal
      const map = new window.google.maps.Map(mapElement, {
        center: defaultCenter,
        zoom: 13,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
        },
        fullscreenControl: false,
        streetViewControl: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
      });
      
      // Force a resize event after map creation
      setTimeout(() => {
        window.google.maps.event.trigger(map, 'resize');
      }, 100);
      
      // Create bounds for markers
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidMarkers = false;
      
      // Add markers for all food banks
      recommendations.forEach((foodBank) => {
        try {
          const coordinates = foodBank.location?.coordinates || [];
          
          if (Array.isArray(coordinates) && coordinates.length >= 2) {
            const position = { 
              lat: parseFloat(coordinates[1]),
              lng: parseFloat(coordinates[0])
            };
            
            if (isNaN(position.lat) || isNaN(position.lng)) {
              return;
            }
            
            const marker = new window.google.maps.Marker({
              position: position,
              map: map,
              title: foodBank.name,
              animation: window.google.maps.Animation.DROP,
              icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new window.google.maps.Size(42, 42)
              },
              zIndex: 100
            });
            
            const infoContent = `
              <div class="map-info-window">
                <h4>${foodBank.name}</h4>
                <p><strong>Address:</strong> ${foodBank.address}</p>
                <p><strong>Need Level:</strong> ${foodBank.needLevel}/5</p>
                ${foodBank.openingHours ? `<p><strong>Hours:</strong> ${foodBank.openingHours}</p>` : ''}
                <p><strong>${foodBank.recommendation || ''}</strong></p>
              </div>
            `;
            
            const infoWindow = new window.google.maps.InfoWindow({
              content: infoContent,
              maxWidth: 320
            });
            
            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });
            
            // If this is the selected food bank, highlight it
            if (selectedFoodBank && selectedFoodBank.id === foodBank.id) {
              infoWindow.open(map, marker);
              map.setCenter(position);
              map.setZoom(15);
            }
            
            bounds.extend(position);
            hasValidMarkers = true;
          }
        } catch (err) {
          console.error(`Error adding marker for food bank ${foodBank.name}:`, err);
        }
      });
      
      // Add user location marker (pickup location)
      if (userLocation) {
        try {
          const userPosition = { 
            lat: parseFloat(userLocation.latitude), 
            lng: parseFloat(userLocation.longitude) 
          };
          
          if (!isNaN(userPosition.lat) && !isNaN(userPosition.lng)) {
            const userMarker = new window.google.maps.Marker({
              position: userPosition,
              map: map,
              title: 'Pickup Location',
              icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new window.google.maps.Size(36, 36)
              },
              zIndex: 50,
              animation: window.google.maps.Animation.DROP
            });
            
            const pickupInfoContent = `
              <div class="map-info-window">
                <h4>Pickup Location</h4>
                <p><strong>Item:</strong> ${pickup.itemName}</p>
                <p><strong>Quantity:</strong> ${pickup.quantity || '1'}</p>
                <p><strong>Category:</strong> ${pickup.category || 'Not specified'}</p>
              </div>
            `;
            
            const pickupInfoWindow = new window.google.maps.InfoWindow({
              content: pickupInfoContent,
              maxWidth: 320
            });
            
            userMarker.addListener('click', () => {
              pickupInfoWindow.open(map, userMarker);
            });
            
            bounds.extend(userPosition);
            hasValidMarkers = true;
          }
        } catch (error) {
          console.error('Error adding user location marker:', error);
        }
      }
      
      // Adjust map bounds to show all markers
      if (hasValidMarkers) {
        map.fitBounds(bounds);
        const boundsListener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          map.setZoom(Math.min(13, map.getZoom()));
        });
      } else {
        map.setCenter(defaultCenter);
      }
    } catch (err) {
      console.error('Error initializing fullscreen map:', err);
    }
  };
  
  const ensureMapVisibility = () => {
    // Check if map element exists but is not visible
    if (isOpen && isMapLoaded) {
      setTimeout(() => {
        const mapElement = document.getElementById('foodbank-map');
        if (mapElement && (mapElement.clientWidth === 0 || mapElement.clientHeight === 0)) {
          console.log('Map element has zero dimensions, attempting to fix...');
          // Force reinitialization
          initMap();
        }
      }, 500);
    }
    
    return null; // Return null to avoid rendering issues
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <GoogleMapsScript onLoad={handleGoogleMapsLoad} />
      <div className="modal-overlay" onLoad={ensureMapVisibility()}>
        <div className="modal-content foodbank-suggestions">
          <div className="modal-header">
            <h2>Nearby Food Banks</h2>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
          
          <div className="modal-body">
            <div className="foodbank-search-section">
              <div>
                <h3>Food Bank Delivery</h3>
                <p>Select a food bank to deliver: <strong>{pickup.itemName}</strong></p>
              </div>
              
              <form onSubmit={handleSubmitQuery} className="foodbank-query-form">
                <input
                  type="text"
                  placeholder="Search food banks (e.g., needs dairy)"
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
                <div 
                  id="foodbank-map" 
                  className="foodbank-map"
                  style={{ width: '100%', height: '100%' }}
                ></div>
                {/* Added an explicit fullscreen button with high visibility */}
                <button 
                  className="fullscreen-button" 
                  onClick={toggleFullscreen}
                  title="View map in fullscreen mode"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                  </svg>
                </button>
              </div>
            </div>
            
            {selectedFoodBank && (
              <div className="selected-foodbank">
                <h3>{selectedFoodBank.name}</h3>
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
      
      {/* Improved fullscreen map overlay */}
      <div className={`map-fullscreen-overlay ${isFullscreen ? 'active' : ''}`}>
        <button 
          className="close-fullscreen-btn" 
          onClick={toggleFullscreen}
          title="Exit fullscreen"
        >
          &times;
        </button>
        <div className="fullscreen-map-container">
          <div 
            id="fullscreen-map" 
            className="fullscreen-map"
          ></div>
        </div>
      </div>
    </>
  );
};

export default FoodBankSuggestionModal;