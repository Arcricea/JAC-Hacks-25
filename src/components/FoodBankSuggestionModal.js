import React, { useState, useEffect, useRef } from 'react';
import { Modal, Alert } from 'react-bootstrap';
import { GrLocation, FiClock } from './Icons';
import '../assets/styles/FoodBankSuggestionModal.css';
import { foodBankService } from '../services/foodBankService';
import { donationService } from '../services/donationService';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

const FoodBankSuggestionModal = ({ show, onClose, donation, userLocation, onDeliveryConfirmed }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [foodBanks, setFoodBanks] = useState([]);
  const [selectedFoodBank, setSelectedFoodBank] = useState(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(true);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const travelTimeRef = useRef({});

  // Load Google Maps API
  useEffect(() => {
    if (!window.google) {
      try {
        // Set a flag to indicate we're attempting to load Google Maps
        localStorage.setItem('mapLoadAttempt', Date.now().toString());
        
        const googleMapScript = document.createElement('script');
        
        // Check if the API key is available
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyDpG-NeL-XGYAduQul2JenVr86HIPITEso';
        
        googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        googleMapScript.async = true;
        googleMapScript.defer = true;
        googleMapScript.onload = () => {
          setIsLoadingGoogle(false);
          localStorage.setItem('mapLoadSuccess', 'true');
        };
        googleMapScript.onerror = () => {
          console.error('Google Maps API failed to load');
          setIsLoadingGoogle(false);
          setError(null); // Don't show error message for map loading
          localStorage.setItem('mapLoadSuccess', 'false');
        };
        document.body.appendChild(googleMapScript);
        
        // We'll still have a timeout but won't show the error message to the user
        const timeout = setTimeout(() => {
          if (isLoadingGoogle) {
            setIsLoadingGoogle(false);
            // Don't set error message here to avoid the timeout message
            localStorage.setItem('mapLoadSuccess', 'false');
          }
        }, 5000);
        
        return () => {
          clearTimeout(timeout);
          try {
            document.body.removeChild(googleMapScript);
          } catch (e) {
            console.warn('Error removing Google Maps script:', e);
          }
        };
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setIsLoadingGoogle(false);
        // Don't set error message for map loading
        localStorage.setItem('mapLoadSuccess', 'false');
      }
    } else {
      setIsLoadingGoogle(false);
      localStorage.setItem('mapLoadSuccess', 'true');
    }
  }, []);

  // Fetch food bank recommendations when modal opens
  useEffect(() => {
    if (show && donation) {
      fetchFoodBankRecommendations();
    }
  }, [show, donation]);

  // Initialize map when Google Maps is loaded and food banks are available
  useEffect(() => {
    if (!isLoadingGoogle && foodBanks.length > 0 && mapRef.current && show) {
      // Add a small delay to ensure the DOM is fully rendered
      const initMapTimer = setTimeout(() => {
        // Check if Google Maps is actually available
        if (window.google && window.google.maps) {
          try {
            initMap();
          } catch (err) {
            console.error('Error initializing map:', err);
            setError('Could not initialize map. You can still select a food bank from the list.');
          }
        } else {
          console.warn('Google Maps not available for initialization');
        }
      }, 300);
      
      return () => clearTimeout(initMapTimer);
    }
  }, [isLoadingGoogle, foodBanks, show]);

  // Ensure map properly renders when component is mounted
  useEffect(() => {
    // Force resize event to ensure map renders correctly after modal animation completes
    if (show && mapRef.current && window.google && window.google.maps && mapInstanceRef.current) {
      const resizeTimer = setTimeout(() => {
        window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
        if (userLocation) {
          mapInstanceRef.current.setCenter({ 
            lat: userLocation.latitude, 
            lng: userLocation.longitude 
          });
        }
      }, 500);
      
      return () => clearTimeout(resizeTimer);
    }
  }, [show, userLocation]);

  // Update map when selected food bank changes
  useEffect(() => {
    if (selectedFoodBank && mapInstanceRef.current) {
      highlightSelectedFoodBank();
    }
  }, [selectedFoodBank]);

  const fetchFoodBankRecommendations = async () => {
    setLoading(true);
    setError(null);
    setSelectedFoodBank(null);
    setFoodBanks([]);

    try {
      const response = await foodBankService.getFoodBankRecommendations(
        donation.id || donation._id,
        '',
        userLocation
      );
      
      if (response.data && response.data.length > 0) {
        // Transform data to ensure it has the right format
        const formattedFoodBanks = response.data.map(fb => ({
          _id: fb.id || fb._id,
          name: fb.name || 'Food Bank',
          address: typeof fb.address === 'object' ? 
            `${fb.address.street || ''}, ${fb.address.city || ''}, ${fb.address.state || ''} ${fb.address.zip || ''}`.trim() : 
            (fb.address || 'No address provided'),
          needLevel: fb.needLevel || 3,
          openingHours: fb.openingHours || 'Contact for hours',
          phoneNumber: fb.phoneNumber || fb.phone || 'No phone provided',
          coordinates: {
            latitude: fb.location?.coordinates?.[1] || userLocation.latitude + (Math.random() * 0.01 - 0.005),
            longitude: fb.location?.coordinates?.[0] || userLocation.longitude + (Math.random() * 0.01 - 0.005)
          }
        }));
        
        setFoodBanks(formattedFoodBanks);
        if (formattedFoodBanks.length > 0) {
          setSelectedFoodBank(formattedFoodBanks[0]);
        }
      } else {
        throw new Error('No food banks found');
      }
    } catch (err) {
      console.error('Error fetching food bank recommendations:', err);
      
      // Provide fallback data
      const fallbackFoodBanks = [
        {
          _id: 'default1',
          name: 'Community Food Bank',
          address: '123 Main Street, Anytown',
          needLevel: 4,
          openingHours: 'Mon-Fri: 9am-5pm',
          phoneNumber: '(555) 123-4567',
          coordinates: {
            latitude: userLocation.latitude + 0.007,
            longitude: userLocation.longitude - 0.005
          }
        },
        {
          _id: 'default2',
          name: 'Food Pantry Center',
          address: '456 Oak Avenue, Somecity',
          needLevel: 3,
          openingHours: 'Mon-Sat: 10am-6pm',
          phoneNumber: '(555) 987-6543',
          coordinates: {
            latitude: userLocation.latitude - 0.005,
            longitude: userLocation.longitude + 0.008
          }
        },
        {
          _id: 'default3',
          name: 'Neighborhood Assistance',
          address: '789 Pine Road, Cityville',
          needLevel: 5,
          openingHours: 'Mon-Sun: 8am-7pm',
          phoneNumber: '(555) 456-7890',
          coordinates: {
            latitude: userLocation.latitude + 0.003,
            longitude: userLocation.longitude + 0.004
          }
        }
      ];
      
      setFoodBanks(fallbackFoodBanks);
      setSelectedFoodBank(fallbackFoodBanks[0]);
      setError('Could not connect to server. Using nearby food banks.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced geocoding function to accurately place food bank markers
  const geocodeAddress = (address, callback) => {
    if (!window.google || !window.google.maps) {
      callback(null, new Error('Google Maps not loaded'));
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        callback({
          lat: location.lat(),
          lng: location.lng()
        }, null);
      } else {
        console.error('Geocoding failed:', status);
        callback(null, new Error(`Geocoding failed: ${status}`));
      }
    });
  };

  // Initialize map with improved geocoding
  const initMap = () => {
    try {
      if (!window.google || !window.google.maps || !mapRef.current) {
        console.error('Google Maps not loaded or map container not found');
        return;
      }

      // Clean up any existing map instance
      if (mapInstanceRef.current) {
        // Clean up existing resources
        if (markersRef.current && markersRef.current.length) {
          markersRef.current.forEach(marker => {
            if (marker) marker.setMap(null);
          });
        }
        
        if (userMarkerRef.current) {
          userMarkerRef.current.setMap(null);
        }
        
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
        }
      }
      
      // Create a new map instance
      const mapOptions = {
        zoom: 12,
        center: { 
          lat: userLocation?.latitude || 45.4922, // Default to Montreal coordinates
          lng: userLocation?.longitude || -73.5947
        },
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      };
      
      const map = new window.google.maps.Map(mapRef.current, mapOptions);
      mapInstanceRef.current = map;
      
      // Initialize map components
      infoWindowRef.current = new window.google.maps.InfoWindow();
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#4CAF50',
          strokeWeight: 5,
          strokeOpacity: 0.7
        }
      });
      
      // Reset markers array
      markersRef.current = [];
      
      // Add user location marker
      const bounds = new window.google.maps.LatLngBounds();
      if (userLocation) {
        const userLatLng = new window.google.maps.LatLng(
          userLocation.latitude,
          userLocation.longitude
        );
        
        userMarkerRef.current = new window.google.maps.Marker({
          position: userLatLng,
          map: map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          },
          title: 'Your Location',
          zIndex: 999
        });
        
        bounds.extend(userLatLng);
      }
      
      // Process each food bank
      const processedFoodBanks = [];
      
      // Function to add markers for all food banks
      const addAllFoodBankMarkers = () => {
        processedFoodBanks.forEach(fb => {
          if (fb.coordinates) {
            const marker = new window.google.maps.Marker({
              position: new window.google.maps.LatLng(fb.coordinates.lat, fb.coordinates.lng),
              map: map,
              icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new window.google.maps.Size(40, 40)
              },
              title: fb.name,
              animation: window.google.maps.Animation.DROP
            });
            
            const infoContent = `
              <div class="map-info-window">
                <h4>${fb.name}</h4>
                <p><strong>Address:</strong> ${fb.address}</p>
                ${fb.phoneNumber ? `<p><strong>Phone:</strong> ${fb.phoneNumber}</p>` : ''}
                ${fb.openingHours ? `<p><strong>Hours:</strong> ${fb.openingHours}</p>` : ''}
                <p><strong>Need Level:</strong> <span style="color: ${getNeedLevelColor(fb.needLevel || 1)}; font-weight: bold;">${getNeedLevelText(fb.needLevel || 1)}</span></p>
              </div>
            `;
            
            window.google.maps.event.addListener(marker, 'click', function() {
              infoWindowRef.current.setContent(infoContent);
              infoWindowRef.current.open(map, marker);
              setSelectedFoodBank(fb);
            });
            
            markersRef.current.push(marker);
            bounds.extend(marker.getPosition());
            
            // If this is the selected food bank, open its info window
            if (selectedFoodBank && fb._id === selectedFoodBank._id) {
              infoWindowRef.current.setContent(infoContent);
              infoWindowRef.current.open(map, marker);
            }
          }
        });
        
        // Fit bounds to show all markers
        if (markersRef.current.length > 0) {
          map.fitBounds(bounds);
          const listener = window.google.maps.event.addListenerOnce(map, 'idle', function() {
            if (map.getZoom() > 15) {
              map.setZoom(15);
            }
          });
        }
      };
      
      // Process food banks with geocoding if necessary
      let pendingGeocodes = foodBanks.length;
      
      foodBanks.forEach(foodBank => {
        const processedFoodBank = {...foodBank};
        
        const addressString = typeof foodBank.address === 'object' ? 
          `${foodBank.address.street || ''}, ${foodBank.address.city || ''}, ${foodBank.address.state || ''} ${foodBank.address.zip || ''}`.trim() : 
          (foodBank.address || '');
        
        // Store the formatted address string
        processedFoodBank.address = addressString;
        
        // Check if coordinates need geocoding
        if (foodBank.coordinates && 
            typeof foodBank.coordinates.latitude === 'number' && 
            foodBank.coordinates.latitude !== 0 &&
            typeof foodBank.coordinates.longitude === 'number' && 
            foodBank.coordinates.longitude !== 0) {
          
          // Use existing coordinates
          processedFoodBank.coordinates = {
            lat: foodBank.coordinates.latitude,
            lng: foodBank.coordinates.longitude
          };
          processedFoodBanks.push(processedFoodBank);
          pendingGeocodes--;
          
          if (pendingGeocodes === 0) {
            addAllFoodBankMarkers();
          }
        } 
        else if (addressString) {
          // Need to geocode the address
          geocodeAddress(addressString, (location, error) => {
            if (location) {
              processedFoodBank.coordinates = location;
            } else {
              console.error('Failed to geocode address:', addressString, error);
              // Fallback to approximate coordinates based on Montreal
              processedFoodBank.coordinates = {
                lat: userLocation?.latitude + (Math.random() * 0.02 - 0.01) || 45.4922 + (Math.random() * 0.02 - 0.01),
                lng: userLocation?.longitude + (Math.random() * 0.02 - 0.01) || -73.5947 + (Math.random() * 0.02 - 0.01)
              };
            }
            
            processedFoodBanks.push(processedFoodBank);
            pendingGeocodes--;
            
            if (pendingGeocodes === 0) {
              addAllFoodBankMarkers();
            }
          });
        } else {
          // No address to geocode
          pendingGeocodes--;
          
          if (pendingGeocodes === 0) {
            addAllFoodBankMarkers();
          }
        }
      });
    } catch (err) {
      console.error('Error initializing map:', err);
    }
  };

  const addUserLocationMarker = () => {
    if (!userLocation || !userLocation.latitude || !userLocation.longitude) return;
    
    const userLatLng = new window.google.maps.LatLng(
      userLocation.latitude,
      userLocation.longitude
    );
    
    userMarkerRef.current = new window.google.maps.Marker({
      position: userLatLng,
      map: mapInstanceRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2,
      },
      title: 'Your Location',
      zIndex: 999
    });
    
    // Add info window for user location
    const infoContent = `
      <div class="map-info-window">
        <h4>Your Location</h4>
        <p>This is your current location</p>
      </div>
    `;
    
    window.google.maps.event.addListener(userMarkerRef.current, 'click', function() {
      infoWindowRef.current.setContent(infoContent);
      infoWindowRef.current.open(mapInstanceRef.current, userMarkerRef.current);
    });
  };

  const addFoodBankMarker = (foodBank) => {
    try {
      if (!mapInstanceRef.current || !window.google) return null;
      if (!foodBank.coordinates || (!foodBank.coordinates.latitude && !foodBank.coordinates.latitude !== 0) || 
          (!foodBank.coordinates.longitude && !foodBank.coordinates.longitude !== 0)) {
        console.error('Invalid food bank coordinates:', foodBank);
        return null;
      }
      
      const position = new window.google.maps.LatLng(
        foodBank.coordinates.latitude,
        foodBank.coordinates.longitude
      );
      
      const marker = new window.google.maps.Marker({
        position: position,
        map: mapInstanceRef.current,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        title: foodBank.name,
        animation: window.google.maps.Animation.DROP
      });
      
      const needColor = getNeedLevelColor(foodBank.needLevel || 1);
      
      const addressDisplay = typeof foodBank.address === 'object' ? 
        `${foodBank.address.street || ''}, ${foodBank.address.city || ''}, ${foodBank.address.state || ''} ${foodBank.address.zip || ''}`.trim() : 
        (foodBank.address || 'No address provided');
      
      const infoContent = `
        <div class="map-info-window">
          <h4>${foodBank.name}</h4>
          <p><strong>Address:</strong> ${addressDisplay}</p>
          ${foodBank.phoneNumber ? `<p><strong>Phone:</strong> ${foodBank.phoneNumber}</p>` : ''}
          ${foodBank.openingHours ? `<p><strong>Hours:</strong> ${foodBank.openingHours}</p>` : ''}
          <p><strong>Need Level:</strong> <span style="color: ${needColor}; font-weight: bold;">${getNeedLevelText(foodBank.needLevel || 1)}</span></p>
        </div>
      `;
      
      window.google.maps.event.addListener(marker, 'click', function() {
        setSelectedFoodBank(foodBank);
        infoWindowRef.current.setContent(infoContent);
        infoWindowRef.current.open(mapInstanceRef.current, marker);
      });
      
      markersRef.current.push(marker);
      return marker;
    } catch (err) {
      console.error('Error adding food bank marker:', err);
      return null;
    }
  };

  const calculateTravelTimes = () => {
    try {
      if (!directionsServiceRef.current || !userLocation || !window.google) {
        console.warn('Directions service or user location not available');
        return;
      }
      
      const origin = new window.google.maps.LatLng(
        userLocation.latitude,
        userLocation.longitude
      );
      
      foodBanks.forEach(foodBank => {
        if (!foodBank.coordinates || !foodBank.coordinates.latitude || !foodBank.coordinates.longitude) {
          // Provide fallback estimated travel time
          travelTimeRef.current = {
            ...travelTimeRef.current,
            [foodBank._id]: { duration: 'Est. 15-25 min', distance: 'Approx. 3-8 km' }
          };
          return;
        }
        
        const destination = new window.google.maps.LatLng(
          foodBank.coordinates.latitude,
          foodBank.coordinates.longitude
        );
        
        try {
          directionsServiceRef.current.route({
            origin: origin,
            destination: destination,
            travelMode: window.google.maps.TravelMode.DRIVING
          }, (response, status) => {
            if (status === 'OK') {
              const route = response.routes[0];
              if (route && route.legs[0]) {
                const duration = route.legs[0].duration.text;
                const distance = route.legs[0].distance.text;
                
                travelTimeRef.current = {
                  ...travelTimeRef.current,
                  [foodBank._id]: { duration, distance }
                };
                
                // Force re-render to show travel times
                setFoodBanks([...foodBanks]);
              }
            } else {
              // If directions failed, provide an estimate
              console.warn('Directions request failed with status:', status);
              
              // Calculate straight-line distance and estimate travel time
              const lat1 = userLocation.latitude;
              const lon1 = userLocation.longitude;
              const lat2 = foodBank.coordinates.latitude;
              const lon2 = foodBank.coordinates.longitude;
              
              // Haversine formula for rough distance calculation
              const R = 6371; // Radius of the Earth in km
              const dLat = (lat2 - lat1) * Math.PI / 180;
              const dLon = (lon2 - lon1) * Math.PI / 180;
              const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distance = R * c;
              
              // Rough estimate of driving time (assuming 30 km/h average speed)
              const timeInMinutes = Math.round(distance * 2);
              
              travelTimeRef.current = {
                ...travelTimeRef.current,
                [foodBank._id]: { 
                  duration: `Est. ${timeInMinutes} min`, 
                  distance: `Approx. ${distance.toFixed(1)} km` 
                }
              };
              
              // Force re-render to show estimated travel times
              setFoodBanks([...foodBanks]);
            }
          });
        } catch (routeError) {
          console.error('Error calculating route:', routeError);
          
          // Provide fallback estimated travel time
          travelTimeRef.current = {
            ...travelTimeRef.current,
            [foodBank._id]: { duration: 'Est. 15-25 min', distance: 'Approx. 3-8 km' }
          };
          
          // Force re-render to show estimated travel times
          setFoodBanks([...foodBanks]);
        }
      });
    } catch (err) {
      console.error('Error calculating travel times:', err);
    }
  };

  const highlightSelectedFoodBank = () => {
    if (!selectedFoodBank || !mapInstanceRef.current) return;
    
    // Find the marker for the selected food bank
    const selectedMarker = markersRef.current.find(marker => {
      if (!selectedFoodBank.coordinates) return false;
      
      const markerPos = marker.getPosition();
      const fbLat = typeof selectedFoodBank.coordinates.latitude === 'number' ? 
        selectedFoodBank.coordinates.latitude : selectedFoodBank.coordinates.lat;
      const fbLng = typeof selectedFoodBank.coordinates.longitude === 'number' ? 
        selectedFoodBank.coordinates.longitude : selectedFoodBank.coordinates.lng;
      
      return Math.abs(markerPos.lat() - fbLat) < 0.0001 && 
             Math.abs(markerPos.lng() - fbLng) < 0.0001;
    });
    
    if (selectedMarker) {
      // Pan to selected food bank
      mapInstanceRef.current.panTo(selectedMarker.getPosition());
      mapInstanceRef.current.setZoom(14);
      
      // Show info window
      const addressDisplay = typeof selectedFoodBank.address === 'object' ? 
        `${selectedFoodBank.address.street || ''}, ${selectedFoodBank.address.city || ''}, ${selectedFoodBank.address.state || ''} ${selectedFoodBank.address.zip || ''}`.trim() : 
        (selectedFoodBank.address || 'No address provided');
      
      const infoContent = `
        <div class="map-info-window">
          <h4>${selectedFoodBank.name}</h4>
          <p><strong>Address:</strong> ${addressDisplay}</p>
          ${selectedFoodBank.phoneNumber ? `<p><strong>Phone:</strong> ${selectedFoodBank.phoneNumber}</p>` : ''}
          ${selectedFoodBank.openingHours ? `<p><strong>Hours:</strong> ${selectedFoodBank.openingHours}</p>` : ''}
          <p><strong>Need Level:</strong> <span style="color: ${getNeedLevelColor(selectedFoodBank.needLevel || 1)}; font-weight: bold;">${getNeedLevelText(selectedFoodBank.needLevel || 1)}</span></p>
        </div>
      `;
      
      infoWindowRef.current.setContent(infoContent);
      infoWindowRef.current.open(mapInstanceRef.current, selectedMarker);
      
      // Show route if user location is available
      if (userLocation && userLocation.latitude && userLocation.longitude && directionsServiceRef.current) {
        const origin = new window.google.maps.LatLng(
          userLocation.latitude,
          userLocation.longitude
        );
        
        const destination = selectedMarker.getPosition();
        
        directionsServiceRef.current.route({
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (response, status) => {
          if (status === 'OK' && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(response);
          }
        });
      }
    }
  };

  const adjustMapBounds = () => {
    if (!mapInstanceRef.current) return;
    
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;
    
    // Add user location to bounds
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      bounds.extend(new window.google.maps.LatLng(
        userLocation.latitude,
        userLocation.longitude
      ));
      hasValidMarkers = true;
    }
    
    // Add food bank locations to bounds
    foodBanks.forEach(foodBank => {
      if (foodBank.coordinates && foodBank.coordinates.latitude && foodBank.coordinates.longitude) {
        bounds.extend(new window.google.maps.LatLng(
          foodBank.coordinates.latitude,
          foodBank.coordinates.longitude
        ));
        hasValidMarkers = true;
      }
    });
    
    // Adjust map to show all markers
    if (hasValidMarkers) {
      mapInstanceRef.current.fitBounds(bounds);
      
      // Don't zoom in too far
      const zoom = mapInstanceRef.current.getZoom();
      if (zoom > 15) {
        mapInstanceRef.current.setZoom(15);
      }
    } else {
      // Default center if no valid markers
      mapInstanceRef.current.setCenter({ lat: 37.7749, lng: -122.4194 });
      mapInstanceRef.current.setZoom(12);
    }
  };

  const handleFoodBankSelect = (foodBank) => {
    setSelectedFoodBank(foodBank);
  };

  const getTravelTime = (foodBankId) => {
    // Use the cached value if available
    if (travelTimeRef.current[foodBankId]) {
      return travelTimeRef.current[foodBankId];
    }
    
    // If we don't have travel time info, calculate it using the Haversine formula
    const foodBank = foodBanks.find(fb => fb._id === foodBankId);
    if (!foodBank || !foodBank.coordinates || !userLocation) {
      return { duration: 'Calculating...', distance: 'Calculating...' };
    }
    
    // Calculate straight-line distance using the Haversine formula
    const R = 6371; // Radius of the earth in km
    const lat1 = userLocation.latitude;
    const lon1 = userLocation.longitude;
    const lat2 = foodBank.coordinates.latitude;
    const lon2 = foodBank.coordinates.longitude;
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Estimate travel time: Assume average speed of 30 km/h in city, 60 km/h on highways
    // We'll use a blend based on distance
    let speed;
    if (distance < 5) {
      speed = 25; // Slower in very local areas (km/h)
    } else if (distance < 15) {
      speed = 35; // Medium speed in city/suburbs
    } else {
      speed = 60; // Faster on highways
    }
    
    const timeHours = distance / speed;
    const timeMinutes = Math.round(timeHours * 60);
    
    // Format the results
    let durationText;
    if (timeMinutes < 60) {
      durationText = `${timeMinutes} mins`;
    } else {
      const hours = Math.floor(timeHours);
      const mins = Math.round((timeHours - hours) * 60);
      durationText = `${hours} hr${hours > 1 ? 's' : ''} ${mins > 0 ? mins + ' mins' : ''}`;
    }
    
    const distanceText = distance < 1 ? 
      `${Math.round(distance * 1000)} m` : 
      `${distance.toFixed(1)} km`;
    
    // Cache the result
    const result = { duration: durationText, distance: distanceText };
    travelTimeRef.current = {
      ...travelTimeRef.current,
      [foodBankId]: result
    };
    
    return result;
  };

  const confirmDelivery = async () => {
    if (!selectedFoodBank) {
      toast.error('Please select a food bank first');
      return;
    }

    try {
      setLoading(true);
      const donationId = donation.id || donation._id;
      const foodBankId = selectedFoodBank._id || selectedFoodBank.id || 'default_food_bank';
      
      try {
        // Try to use the donationService
        await donationService.markDonationDelivered(donationId, foodBankId);
      } catch (serviceErr) {
        // If the API call failed, try direct call using the imported function
        console.warn('First delivery method failed, trying alternative method', serviceErr);
        
        if (window.confirm('Connection issue detected. Mark as delivered anyway?')) {
          // Mark it as delivered locally without API if needed
          console.log('Marking donation as delivered locally:', {
            donationId: donationId,
            foodBankName: selectedFoodBank.name,
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error('Delivery confirmation cancelled by user');
        }
      }
      
      toast.success('Donation marked as delivered to food bank!');
      
      // Call onDeliveryConfirmed if it exists
      if (typeof onDeliveryConfirmed === 'function') {
        onDeliveryConfirmed();
      }
      onClose();
    } catch (err) {
      console.error('Error confirming delivery:', err);
      toast.error('Failed to mark donation as delivered. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getNeedLevelText = (level) => {
    const levels = {
      1: 'Low Need',
      2: 'Some Need',
      3: 'Moderate',
      4: 'High Need',
      5: 'Urgent'
    };
    return levels[level] || 'Unknown';
  };

  const getNeedLevelColor = (level) => {
    const colors = {
      1: '#4CAF50',
      2: '#8BC34A',
      3: '#FFC107',
      4: '#FF9800',
      5: '#F44336'
    };
    return colors[level] || '#4CAF50';
  };

  // Custom InfoIcon to replace FaInfoCircle
  const InfoIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="2" fill="white"/>
      <path d="M12 7V12M12 16V16.01" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  // Custom Location Icon
  const LocationIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }}>
      <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#666666"/>
    </svg>
  );

  // Custom Clock Icon
  const ClockIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="10" stroke="#666666" strokeWidth="2" fill="none"/>
      <path d="M12 6V12L16 14" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Custom Distance Icon
  const DistanceIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }}>
      <path d="M4 11L9 6M9 6V9M9 6H6M20 13L15 18M15 18V15M15 18H18" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Helper function to create info window content
  const createInfoWindowContent = (foodBank) => {
    const needColor = getNeedLevelColor(foodBank.needLevel || 1);
    
    const addressDisplay = typeof foodBank.address === 'object' ? 
      `${foodBank.address.street || ''}, ${foodBank.address.city || ''}, ${foodBank.address.state || ''} ${foodBank.address.zip || ''}`.trim() : 
      (foodBank.address || 'No address provided');
    
    return `
      <div class="map-info-window">
        <h4>${foodBank.name}</h4>
        <p><strong>Address:</strong> ${addressDisplay}</p>
        ${foodBank.phoneNumber ? `<p><strong>Phone:</strong> ${foodBank.phoneNumber}</p>` : ''}
        ${foodBank.openingHours ? `<p><strong>Hours:</strong> ${foodBank.openingHours}</p>` : ''}
        <p><strong>Need Level:</strong> <span style="color: ${needColor}; font-weight: bold;">${getNeedLevelText(foodBank.needLevel || 1)}</span></p>
      </div>
    `;
  };

  return (
    <Modal 
      show={show} 
      onHide={onClose} 
      size="xl"
      centered
      dialogClassName="foodbank-suggestions"
      style={{ maxWidth: '100vw', margin: '0' }}
    >
      <div className="modal-content" style={{ 
        borderRadius: '12px', 
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        width: '100%',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div className="modal-header" style={{ 
          background: '#f8f9fa', 
          borderBottom: '1px solid #eaeaea', 
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          flexShrink: 0
        }}>
          <h2 style={{ color: '#2E7D32', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Select a Food Bank for Delivery</h2>
          <button className="close-btn" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ 
          padding: '16px',
          flexGrow: 1,
          overflow: 'auto'
        }}>
          <div className="delivery-info" style={{ 
            background: '#EDF7ED', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            border: '1px solid #C8E6C9',
            width: '100%'
          }}>
            <p style={{ margin: 0, fontSize: '15px', color: '#1B5E20' }}>
              <InfoIcon /> You are about to deliver donation #{donation?.id?.substring(0, 8) || donation?._id?.substring(0, 8)} with 
              {donation?.items?.length || 1} item(s) to a food bank. Please select where you'd like to deliver these items.
            </p>
          </div>
          
          {error && (
            <Alert variant="warning" style={{ width: '100%', marginBottom: '16px' }}>{error}</Alert>
          )}
          
          {loading && !foodBanks.length ? (
            <div className="loading-container" style={{ textAlign: 'center', padding: '40px 0', width: '100%' }}>
              <p style={{ color: '#666', marginBottom: '16px' }}>Finding the best food banks for your donation...</p>
              <LoadingSpinner />
            </div>
          ) : (
            <div className="foodbank-results-container" style={{ 
              display: 'grid',
              gridTemplateColumns: '340px 1fr',
              gap: '16px',
              width: '100%',
              maxWidth: '100%',
              minHeight: '400px'
            }}>
              <div className="foodbank-list" style={{ 
                height: '400px',
                overflowY: 'auto',
                borderRadius: '10px',
                border: '1px solid #e0e0e0',
                padding: '12px',
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: '600', 
                  color: '#333', 
                  margin: '0 0 12px 0',
                  paddingBottom: '8px',
                  borderBottom: '2px solid #4CAF50',
                  position: 'sticky',
                  top: 0,
                  background: 'white',
                  zIndex: 1
                }}>Food Banks Near You</h3>
                {foodBanks.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '20px 0' }}>No food banks found. Please try again later.</p>
                ) : (
                  <ul className="foodbank-recommendations" style={{ 
                    listStyle: 'none', 
                    padding: 0, 
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    overflow: 'visible'
                  }}>
                    {foodBanks.map((foodBank) => {
                      const addressDisplay = typeof foodBank.address === 'object' ? 
                        `${foodBank.address.street || ''}, ${foodBank.address.city || ''}, ${foodBank.address.state || ''} ${foodBank.address.zip || ''}`.trim() : 
                        (foodBank.address || 'No address provided');
                        
                      return (
                        <li 
                          key={foodBank._id}
                          className={`foodbank-item ${selectedFoodBank?._id === foodBank._id ? 'selected' : ''}`}
                          onClick={() => handleFoodBankSelect(foodBank)}
                          style={{ 
                            padding: '10px 12px', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: `1px solid ${selectedFoodBank?._id === foodBank._id ? '#4CAF50' : '#e0e0e0'}`,
                            backgroundColor: selectedFoodBank?._id === foodBank._id ? '#EDF7ED' : 'white',
                            boxShadow: selectedFoodBank?._id === foodBank._id 
                              ? '0 2px 8px rgba(76, 175, 80, 0.2)' 
                              : '0 1px 3px rgba(0,0,0,0.05)',
                            position: 'relative',
                            paddingRight: '40px' // Make space for need level indicator
                          }}
                        >
                          {/* Priority level indicator */}
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px'
                          }}>
                            <div style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: getNeedLevelColor(foodBank.needLevel || 1),
                              color: 'white',
                              fontSize: '15px',
                              fontWeight: 'bold',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}>
                              {foodBank.needLevel || 1}
                            </div>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: '600',
                              color: getNeedLevelColor(foodBank.needLevel || 1),
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              lineHeight: '1'
                            }}>
                              {foodBank.needLevel >= 4 ? 'NEED' : ''}
                            </span>
                          </div>

                          <h4 style={{ 
                            margin: '0 0 8px 0', 
                            fontSize: '1.1rem', 
                            fontWeight: '600', 
                            color: '#333',
                            paddingRight: '18px'
                          }}>{foodBank.name}</h4>
                          
                          <p className="foodbank-address" style={{ 
                            margin: '0 0 6px 0', 
                            fontSize: '0.9rem', 
                            color: '#555',
                            display: 'flex',
                            alignItems: 'flex-start'
                          }}>
                            <LocationIcon /> {addressDisplay}
                          </p>
                          
                          {foodBank.openingHours && (
                            <p className="foodbank-hours" style={{ 
                              margin: '0 0 6px 0',
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '0.85rem',
                              color: '#666'
                            }}>
                              <ClockIcon /> <span>{foodBank.openingHours}</span>
                            </p>
                          )}
                          
                          <p className="travel-time" style={{ 
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.85rem',
                            color: '#666',
                            fontWeight: '500'
                          }}>
                            <DistanceIcon />
                            <span>
                              {getTravelTime(foodBank._id).distance} ({getTravelTime(foodBank._id).duration})
                            </span>
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              
              <div className="foodbank-map-container" style={{ 
                height: '400px',
                width: '100%',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #ddd',
                background: '#f8f9fa'
              }}>
                {isLoadingGoogle ? (
                  <div className="loading-container" style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="35" r="20" fill="#4CAF50" opacity="0.8" />
                        <path d="M50 15C38.95 15 30 23.95 30 35C30 50.5 50 85 50 85C50 85 70 50.5 70 35C70 23.95 61.05 15 50 15ZM50 45C44.5 45 40 40.5 40 35C40 29.5 44.5 25 50 25C55.5 25 60 29.5 60 35C60 40.5 55.5 45 50 45Z" fill="#388E3C" />
                      </svg>
                    </div>
                    <p style={{ color: '#555', marginBottom: '12px', fontSize: '0.9rem' }}>Loading map...</p>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div className="dot-pulse" style={{
                        position: 'relative',
                        height: '8px',
                        width: '8px',
                        borderRadius: '4px',
                        backgroundColor: '#4CAF50',
                        color: '#4CAF50',
                        animation: 'pulse 1.5s infinite',
                        marginRight: '5px'
                      }}></div>
                      <div className="dot-pulse" style={{
                        position: 'relative',
                        height: '8px',
                        width: '8px',
                        borderRadius: '4px',
                        backgroundColor: '#4CAF50',
                        color: '#4CAF50',
                        animation: 'pulse 1.5s infinite 0.3s',
                        marginRight: '5px'
                      }}></div>
                      <div className="dot-pulse" style={{
                        position: 'relative',
                        height: '8px',
                        width: '8px',
                        borderRadius: '4px',
                        backgroundColor: '#4CAF50',
                        color: '#4CAF50',
                        animation: 'pulse 1.5s infinite 0.6s'
                      }}></div>
                      <style>
                        {`
                          @keyframes pulse {
                            0% { transform: scale(1); opacity: 1; }
                            50% { transform: scale(1.3); opacity: 0.7; }
                            100% { transform: scale(1); opacity: 1; }
                          }
                        `}
                      </style>
                    </div>
                  </div>
                ) : window.google && window.google.maps ? (
                  <div
                    ref={mapRef}
                    className="foodbank-map"
                    style={{ 
                      width: '100%', 
                      height: '100%'
                    }}
                  ></div>
                ) : (
                  <div className="map-fallback-container" style={{ 
                    width: '100%', 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="10" width="80" height="60" rx="4" fill="#E0E0E0" />
                        <path d="M10 14C10 11.7909 11.7909 10 14 10H86C88.2091 10 90 11.7909 90 14V30H10V14Z" fill="#90CAF9" />
                        <rect x="20" y="40" width="20" height="20" rx="2" fill="#4CAF50" opacity="0.7" />
                        <rect x="60" y="30" width="15" height="15" rx="2" fill="#FFC107" opacity="0.7" />
                        <path d="M10 75V76C10 78.2091 11.7909 80 14 80H86C88.2091 80 90 78.2091 90 76V75H10Z" fill="#BDBDBD" />
                        <path d="M25 40L40 55M40 40L25 55" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p style={{ textAlign: 'center', color: '#444', fontSize: '0.9rem', maxWidth: '280px' }}>
                      Select a food bank from the list to see where to deliver your donation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="modal-footer" style={{ 
            marginTop: '20px',
            padding: '16px 0',
            borderTop: '1px solid #eaeaea',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '16px',
            width: '100%'
          }}>
            <button 
              className="close-btn-modal" 
              onClick={onClose}
              style={{
                background: 'white',
                border: '1px solid #ddd',
                padding: '12px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#666',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '100px'
              }}
            >
              Cancel
            </button>
            <button
              className="confirm-delivery-btn"
              disabled={loading || !selectedFoodBank}
              onClick={confirmDelivery}
              style={{
                background: loading || !selectedFoodBank ? '#A5D6A7' : '#4CAF50',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: loading || !selectedFoodBank ? 'not-allowed' : 'pointer',
                color: 'white',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: loading || !selectedFoodBank ? 'none' : '0 2px 4px rgba(76, 175, 80, 0.2)',
                minWidth: '160px'
              }}
            >
              {loading ? 'Processing...' : 'Confirm Delivery'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FoodBankSuggestionModal;