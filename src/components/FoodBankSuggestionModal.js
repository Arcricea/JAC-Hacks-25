import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Alert } from 'react-bootstrap';
import { GrLocation, FiClock } from './Icons';
import '../assets/styles/FoodBankSuggestionModal.css';
import { foodBankService, markDonationDelivered } from '../services/foodBankService';
import { donationService } from '../services/donationService';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const FoodBankSuggestionModal = ({ show, onClose, donation, userLocation, onDeliveryConfirmed }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [foodBanks, setFoodBanks] = useState([]);
  const [selectedFoodBank, setSelectedFoodBank] = useState(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(true);
  const [rankedFoodBanks, setRankedFoodBanks] = useState([]);
  const [apiCallAttempts, setApiCallAttempts] = useState(0);
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const travelTimeRef = useRef({});
  const [apiBaseUrl, setApiBaseUrl] = useState(process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [maxDistance, setMaxDistance] = useState(10);
  const [selectedFoodType, setSelectedFoodType] = useState('general');
  const [userLocationState, setUserLocationState] = useState(null);
  const [searchRadius, setSearchRadius] = useState(25); // Default 25 miles
  const { getAccessTokenSilently, user } = useAuth0(); // Add Auth0 hook

  // Update useEffect to get auth token from Auth0
  useEffect(() => {
    const getToken = async () => {
      try {
        // Get token from Auth0
        const accessToken = await getAccessTokenSilently();
        setToken(accessToken);
        console.log('Got Auth0 token:', accessToken ? 'Token received' : 'No token');
        
        // Set userId from Auth0 user if available
        if (user && user.sub) {
          const cleanedId = user.sub.includes('|') ? user.sub.split('|')[1] : user.sub;
          setUserId(cleanedId);
          console.log('Using Auth0 user ID:', cleanedId);
        }
      } catch (error) {
        console.error('Error getting Auth0 token:', error);
      }
    };
    
    getToken();
  }, [getAccessTokenSilently, user]);

  // Define handleFoodBankSelect early in the component
  const handleFoodBankSelect = useCallback((foodBank) => {
    setSelectedFoodBank(foodBank);
    // Don't close modal or confirm delivery yet
  }, []);

  // Add a geocoding cache to avoid repeated geocoding requests
  const geocodeCache = useRef({});

  // Geocode address and cache results
  const geocodeAddressAndCache = useCallback((address) => {
    return new Promise((resolve, reject) => {
      // Check if we already have this address cached
      if (geocodeCache.current[address]) {
        console.log('Using cached geocode result for:', address);
        resolve(geocodeCache.current[address]);
        return;
      }

      // First try OpenStreetMap's Nominatim service which has excellent coverage for Montreal
      const tryNominatim = async () => {
        try {
          // Add Montreal or Quebec to the address if it doesn't contain them
          let searchAddress = address;
          if (!searchAddress.toLowerCase().includes('montreal') && 
              !searchAddress.toLowerCase().includes('québec') && 
              !searchAddress.toLowerCase().includes('quebec')) {
            searchAddress += ', Montreal, Quebec, Canada';
          }
          
          // Encode for URL
          searchAddress = encodeURIComponent(searchAddress);
          
          console.log('Trying Nominatim geocoding for:', searchAddress);
          
          // Make request to Nominatim API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${searchAddress}&format=json&limit=1&addressdetails=1`,
            { 
              headers: { 
                'Accept-Language': 'en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7', 
                'User-Agent': 'FoodRescueApp/1.0'
              } 
            }
          );
          
          if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data && data.length > 0) {
            console.log('Nominatim geocoding result:', data[0]);
            const coords = {
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon),
              formattedAddress: data[0].display_name
            };
            
            // Cache the result
            geocodeCache.current[address] = coords;
            return coords;
          }
          
          throw new Error('No results from Nominatim');
        } catch (err) {
          console.warn('Nominatim geocoding failed:', err);
          // Let it fall through to Google Maps geocoding
          return null;
        }
      };
      
      // Start with Nominatim
      tryNominatim()
        .then(coords => {
          // If Nominatim worked, resolve with those coords
          if (coords) {
            resolve(coords);
            return;
          }
          
          // Fall back to Google Maps geocoding if available
          if (window.google && window.google.maps && window.google.maps.Geocoder) {
            console.log('Falling back to Google Maps geocoding for:', address);
            
            // Create correct formatted address for Montreal
            let searchAddress = address;
            if (!searchAddress.toLowerCase().includes('montreal') && 
                !searchAddress.toLowerCase().includes('québec') && 
                !searchAddress.toLowerCase().includes('quebec')) {
              searchAddress += ', Montreal, Quebec, Canada';
            }
            
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: searchAddress }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const location = results[0].geometry.location;
                const coords = {
                  latitude: location.lat(),
                  longitude: location.lng(),
                  formattedAddress: results[0].formatted_address
                };
                
                console.log('Google Maps geocoding result:', coords);
                
                // Cache the result
                geocodeCache.current[address] = coords;
                
                resolve(coords);
              } else {
                console.warn('Google Maps geocoding failed:', status);
                
                // Last resort - use approximate Montreal coordinates
                // This is just a fallback to show something on the map
                const montrealCoords = {
                  latitude: 45.5017,
                  longitude: -73.5673,
                  formattedAddress: 'Montreal, Quebec, Canada'
                };
                
                resolve(montrealCoords);
              }
            });
          } else {
            console.warn('No geocoding services available');
            
            // Return downtown Montreal as a last resort
            resolve({
              latitude: 45.5017,
              longitude: -73.5673,
              formattedAddress: 'Montreal, Quebec, Canada'
            });
          }
        })
        .catch(err => {
          console.error('Geocoding error:', err);
          reject(err);
        });
    });
  }, []);

  // Initialize directions services when the map is created
  const initializeMapServices = useCallback(() => {
    if (window.google && window.google.maps && window.google.maps.DirectionsService) {
      try {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
        if (window.google.maps.DirectionsRenderer) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#4CAF50',
          strokeWeight: 5,
          strokeOpacity: 0.7
        }
      });
      
          if (mapInstanceRef.current) {
            directionsRendererRef.current.setMap(mapInstanceRef.current);
          }
        }
      } catch (err) {
        console.error('Error initializing map services:', err);
      }
    }
  }, []);

  // Initialize map with food banks and user location
  const initMap = useCallback(() => {
    // Prevent multiple initializations
    if (mapInitialized) {
      console.log('Map already initialized, skipping');
      return;
    }
    
    console.log('Initializing map with foodbanks:', foodBanks);
    
    if (!window.google || !window.google.maps) {
      console.error('Google Maps not loaded');
      setError('Google Maps failed to load. Please refresh the page.');
      return;
    }
    
    if (!userLocationState) {
      console.error('User location not available');
      setError('Your location is not available. Please enable location services.');
      return;
    }
    
    if (!mapRef.current) {
      console.error('Map reference not available');
      return;
    }
    
    try {
      // Ensure we have a valid location with lat/lng properties
      const userPos = {
        lat: parseFloat(userLocationState.lat || userLocationState.latitude),
        lng: parseFloat(userLocationState.lng || userLocationState.longitude)
      };
      
      // Handle Google Maps API quota error
      if (window.google.maps.hasOwnProperty('OverQuotaMapError') || 
          (window.google.maps.hasOwnProperty('DirectionsStatus') && 
           window.google.maps.DirectionsStatus.OVER_QUERY_LIMIT)) {
        console.error('Google Maps quota exceeded');
        setError('Google Maps quota exceeded. Some features may not work properly.');
      }
      
      // Create a new map
      const map = new window.google.maps.Map(mapRef.current, {
        center: userPos,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });
      
      // Store the map reference
      mapInstanceRef.current = map;
        
      // Initialize directions service and renderer after the map is created
      initializeMapServices();
      
      // Create info window (only one for the whole map)
      const infoWindow = new window.google.maps.InfoWindow();
      infoWindowRef.current = infoWindow;
      
      // Add user marker
      new window.google.maps.Marker({
        position: userPos,
                map: map,
        title: 'Your Location',
                icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                  scaledSize: new window.google.maps.Size(40, 40)
                },
        zIndex: 999
      });
      
      const markers = [];
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(userPos);
      
      // Process food banks and create markers
      foodBanks.forEach(async (foodBank, index) => {
        try {
          // Check if we have explicit coordinates
          let position = null;
          
          // Case 1: Check for explicit lat/lng coordinates
          if (foodBank.coordinates?.latitude !== undefined && foodBank.coordinates?.longitude !== undefined) {
            position = {
              lat: parseFloat(foodBank.coordinates.latitude),
              lng: parseFloat(foodBank.coordinates.longitude)
            };
            console.log(`Using explicit coordinates for ${foodBank.name}:`, position);
          }
          // Case 2: Check for lat/lng properties directly
          else if (foodBank.coordinates?.lat !== undefined && foodBank.coordinates?.lng !== undefined) {
            position = {
              lat: parseFloat(foodBank.coordinates.lat),
              lng: parseFloat(foodBank.coordinates.lng)
            };
            console.log(`Using lat/lng coordinates for ${foodBank.name}:`, position);
          }
          // Case 3: Check for GeoJSON format coordinates
          else if (foodBank.location?.coordinates?.length === 2) {
            // GeoJSON format is [longitude, latitude]
            position = {
              lat: parseFloat(foodBank.location.coordinates[1]),
              lng: parseFloat(foodBank.location.coordinates[0])
            };
            console.log(`Using GeoJSON coordinates for ${foodBank.name}:`, position);
          }
          // Case 4: Try to geocode the address
          else if (foodBank.address) {
            try {
              const geocodeResult = await geocodeAddressAndCache(foodBank.address);
              position = {
                lat: parseFloat(geocodeResult.latitude),
                lng: parseFloat(geocodeResult.longitude)
              };
              console.log(`Geocoded address for ${foodBank.name}:`, position);
            } catch (error) {
              console.error(`Failed to geocode address for ${foodBank.name}:`, error);
            }
          }
          
          // If we couldn't get a position, skip this food bank
          if (!position || isNaN(position.lat) || isNaN(position.lng)) {
            console.warn(`No valid position for food bank: ${foodBank.name}`);
            return;
          }
          
          // Determine marker icon based on need level
          let iconUrl = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
          
          // Convert needLevel to string representation for display
          let needLevelText = 'Medium';
          let needLevelColor = '#f0ad4e';
          
          // Handle needLevel whether it's a string or number
          const needLevel = foodBank.needLevel || foodBank.needStatus?.priorityLevel || 3;
          
          if (typeof needLevel === 'string') {
            if (needLevel.toLowerCase() === 'high' || needLevel.toLowerCase() === 'critical' || needLevel.toLowerCase() === 'urgent') {
              iconUrl = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
              needLevelText = 'High';
              needLevelColor = '#d9534f';
            } else if (needLevel.toLowerCase() === 'medium') {
              iconUrl = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
              needLevelText = 'Medium';
              needLevelColor = '#f0ad4e';
            } else if (needLevel.toLowerCase() === 'low') {
              iconUrl = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
              needLevelText = 'Low';
              needLevelColor = '#5cb85c';
            }
          } else if (typeof needLevel === 'number') {
            // Handle numeric need levels
            if (needLevel >= 4) {
              iconUrl = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
              needLevelText = 'High';
              needLevelColor = '#d9534f';
            } else if (needLevel === 3) {
              iconUrl = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
              needLevelText = 'Medium';
              needLevelColor = '#f0ad4e';
            } else {
              iconUrl = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
              needLevelText = 'Low';
              needLevelColor = '#5cb85c';
            }
          }
          
          // Create marker
          const marker = new window.google.maps.Marker({
            position,
            map,
            title: foodBank.name,
            icon: {
              url: iconUrl,
              scaledSize: new window.google.maps.Size(35, 35)
            },
            animation: window.google.maps.Animation.DROP,
            zIndex: 10
          });
          
          // Prepare the address display
          const addressDisplay = typeof foodBank.address === 'object' ? 
            `${foodBank.address.street || ''}, ${foodBank.address.city || ''}, ${foodBank.address.state || ''} ${foodBank.address.zip || ''}`.trim() : 
            (foodBank.address || 'No address provided');
          
          // Add click listener to marker
          marker.addListener('click', () => {
            // Build info window content
            const contentString = `
              <div style="max-width: 250px; padding: 10px;">
                <h5 style="margin-top: 0; color: #3a3a3a;">${foodBank.name}</h5>
                <p style="font-size: 14px; margin: 5px 0;">${addressDisplay}</p>
                ${foodBank.phoneNumber ? `<p style="font-size: 13px; margin: 5px 0;"><strong>Phone:</strong> ${foodBank.phoneNumber}</p>` : ''}
                ${foodBank.email ? `<p style="font-size: 13px; margin: 5px 0;"><strong>Email:</strong> ${foodBank.email}</p>` : ''}
                <div style="margin-top: 8px;">
                  <strong>Need Level:</strong> 
                  <span style="color: ${needLevelColor};">
                    ${needLevelText}
                  </span>
                </div>
                <div style="margin-top: 8px; text-align: center;">
                  <button onclick="window.selectFoodBank('${foodBank._id}')" 
                    style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                    Select This Food Bank
                  </button>
                </div>
              </div>
            `;
            
            // Set info window content and open it
            infoWindow.setContent(contentString);
            infoWindow.open(map, marker);
            
            // Also select this food bank
            setSelectedFoodBank(foodBank);
          });
          
          // Add marker to array and extend bounds
          markers.push(marker);
          bounds.extend(position);
          
          // Store marker reference
          markersRef.current.push(marker);
          
          // If this is the last food bank, fit bounds
          if (index === foodBanks.length - 1) {
            // Fit bounds but ensure we don't zoom in too much for a single point
            map.fitBounds(bounds);
            
            // Set a reasonable zoom level if we're too zoomed in
            const listener = window.google.maps.event.addListener(map, 'idle', () => {
              if (map.getZoom() > 14) {
                map.setZoom(14);
              }
              window.google.maps.event.removeListener(listener);
            });
            
            // After creating all markers, calculate routes for ranking
            setTimeout(() => {
              calculateAllRoutes();
            }, 500);
          }
        } catch (error) {
          console.error(`Error processing food bank ${foodBank.name}:`, error);
        }
      });
      
      // Set up window function to select food bank
      window.selectFoodBank = (foodBankId) => {
        const selected = foodBanks.find(fb => fb._id === foodBankId);
        if (selected) {
          handleFoodBankSelect(selected);
        }
      };
      
      mapRef.current.map = map;
      
      // Mark initialization as complete
      setMapInitialized(true);
    } catch (error) {
      console.error('Error in initMap:', error);
      setError('An error occurred initializing the map. You can still select a food bank from the list.');
    }
  }, [foodBanks, userLocationState, handleFoodBankSelect, initializeMapServices, geocodeAddressAndCache, mapInitialized]);

  // Load Google Maps API
  useEffect(() => {
    if (!window.google) {
      try {
        // Set a flag to indicate we're attempting to load Google Maps
        localStorage.setItem('mapLoadAttempt', Date.now().toString());
        
        // Check if we already have a script tag for Google Maps
        const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
        if (existingScript) {
          console.log('Google Maps script already exists, not adding another');
          setIsLoadingGoogle(false);
          localStorage.setItem('mapLoadSuccess', 'true');
          return;
        }
        
        const googleMapScript = document.createElement('script');
        
        // Check if the API key is available
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyDpG-NeL-XGYAduQul2JenVr86HIPITEso';
        
        googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
        googleMapScript.async = true;
        googleMapScript.defer = true;
        googleMapScript.onload = () => {
          console.log('Google Maps script loaded');
          // Don't initialize services here - wait until the API is fully loaded
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
    let isMounted = true;
    
    if (show && donation && !foodBanks.length && apiCallAttempts < 3) {
      fetchFoodBankRecommendations();
    }
    
    return () => {
      isMounted = false;
    };
  }, [show, donation, apiCallAttempts]);

  // Initialize map when Google Maps is loaded and food banks are available
  useEffect(() => {
    if (!isLoadingGoogle && foodBanks.length > 0 && mapRef.current && show && !mapInitialized) {
      // Add a small delay to ensure the DOM is fully rendered
      const initMapTimer = setTimeout(() => {
        // Check if Google Maps is actually available
        if (window.google && window.google.maps) {
          try {
            initMap();
            setMapInitialized(true);
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
  }, [isLoadingGoogle, foodBanks, show, handleFoodBankSelect, initMap, mapInitialized]);

  // Ensure map properly renders when component is mounted
  useEffect(() => {
    // Force resize event to ensure map renders correctly after modal animation completes
    if (show && mapRef.current && window.google && window.google.maps && mapInstanceRef.current) {
      const resizeTimer = setTimeout(() => {
        window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
        if (userLocationState) {
          mapInstanceRef.current.setCenter({ 
            lat: userLocationState.latitude, 
            lng: userLocationState.longitude 
          });
        }
      }, 500);
      
      return () => clearTimeout(resizeTimer);
    }
  }, [show, userLocationState, mapInitialized]);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setMapInitialized(false);
    }
  }, [show]);

  // Update map when selected food bank changes
  useEffect(() => {
    if (selectedFoodBank && mapInstanceRef.current) {
      highlightSelectedFoodBank();
    }
  }, [selectedFoodBank]);

  // Geocode address using Google Maps Geocoding API
  const geocodeAddress = useCallback((address) => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
        reject(new Error('Google Maps Geocoder not available'));
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
          resolve({
            latitude: location.lat(),
            longitude: location.lng(),
            formattedAddress: results[0].formatted_address
          });
      } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }, []);

  // Update useEffect to get userId from localStorage and clean up auth0 prefix
  useEffect(() => {
    // Try different possible keys for user ID
    const storedUserId = localStorage.getItem('userId') 
      || localStorage.getItem('user_id')
      || localStorage.getItem('userID')
      || localStorage.getItem('user')
      || '';
    
    // Try to parse if it's stored as an object
    let userIdValue = storedUserId;
    if (storedUserId && storedUserId.startsWith('{')) {
      try {
        const userObj = JSON.parse(storedUserId);
        userIdValue = userObj._id || userObj.id || userObj.userId || userObj;
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }
    
    // Log what we found for debugging
    console.log('Looking for user ID in localStorage:', {
      storedUserId,
      parsedValue: userIdValue,
      keys: Object.keys(localStorage).filter(k => k.toLowerCase().includes('user') || k.toLowerCase().includes('auth')),
    });
    
    // If userIdValue is an object, extract the ID
    if (typeof userIdValue === 'object' && userIdValue !== null) {
      userIdValue = userIdValue._id || userIdValue.id || userIdValue.userId || '';
    }
    
    // Clean up auth0 prefix if present
    if (typeof userIdValue === 'string' && userIdValue.includes('|')) {
      userIdValue = userIdValue.split('|')[1];
      console.log('Cleaned auth0 prefix from user ID:', userIdValue);
    }
    
    setUserId(userIdValue || '');
    console.log('Setting user ID to:', userIdValue);
    
    // Also try to get user ID from the donation object if available
    if (donation && (donation.userId || donation.createdBy)) {
      let donationUserId = donation.userId || donation.createdBy;
      
      // Clean up auth0 prefix if present
      if (typeof donationUserId === 'string' && donationUserId.includes('|')) {
        donationUserId = donationUserId.split('|')[1];
        console.log('Cleaned auth0 prefix from donation user ID:', donationUserId);
      }
      
      console.log('Found user ID in donation:', donationUserId);
      if (!userIdValue && donationUserId) {
        setUserId(donationUserId);
        console.log('Using user ID from donation:', donationUserId);
      }
    }
  }, [donation]);

  // Log current headers for debugging
  useEffect(() => {
    console.log('Current request headers will be:', {
      'Authorization': token ? `Bearer ${token}` : 'None',
      'X-Requesting-User-Id': userId || 'None'
    });
  }, [token, userId]);

  // Fetch food bank recommendations based on user location and food type
  const fetchFoodBankRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApiCallAttempts(prev => prev + 1);
    
    try {
      // Try to get a fresh token if needed
      let currentToken = token;
      if (!currentToken) {
        try {
          currentToken = await getAccessTokenSilently();
          setToken(currentToken);
          console.log('Retrieved fresh Auth0 token');
        } catch (tokenError) {
          console.warn('Could not get Auth0 token:', tokenError);
        }
      }
      
      // Try fetching specific distributors by ID first
      const distributorIds = [
        "680df6bdbe06fe5db7767dc9", // WestIslandMission
        "680df78cbe06fe5db7767de6", // OnRockCommunityService
        "680df810be06fe5db7767dfe", // FamilleDeLileOuest
        "680df863be06fe5db7767e22", // CentreVertical
        "680df89cbe06fe5db7767e37", // LesSamaritains
        "680df8e5be06fe5db7767e4a", // MoissonSudOuest
        "680df99cbe06fe5db7767e68"  // ExtendedHands
      ];
      
      // Fetch each distributor individually
      const distributors = [];
      let fetchSuccess = false;
      
      console.log('Fetching distributors by ID with Auth0 token');
      
      // If we've already tried API calls multiple times without success, skip to fallback data
      if (apiCallAttempts >= 2) {
        console.warn('Multiple API attempts failed, using fallback data directly');
        throw new Error('API calls unsuccessful after multiple attempts');
      }
      
      // Limit concurrent API calls to prevent spamming the server
      const MAX_CONCURRENT_REQUESTS = 2;
      
      // Process distributors in smaller batches
      for (let i = 0; i < distributorIds.length; i += MAX_CONCURRENT_REQUESTS) {
        const batch = distributorIds.slice(i, i + MAX_CONCURRENT_REQUESTS);
        
        // Process distributors in current batch concurrently
        const batchResults = await Promise.allSettled(
          batch.map(id => 
            axios.get(
              `${apiBaseUrl}/api/users/${id}`, 
              { 
                headers: { 
                  'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                  'Accept': 'application/json'
                },
                timeout: 3000
              }
            )
          )
        );
        
        // Process results from the current batch
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.data) {
            console.log(`Successfully fetched distributor: ${batch[index]}`, result.value.data);
            distributors.push(result.value.data);
            fetchSuccess = true;
          } else {
            console.warn(`Failed to fetch distributor ${batch[index]}:`, 
              result.reason ? result.reason.message : 'Unknown error');
          }
        });
        
        // Small delay between batches to be nice to the server
        if (i + MAX_CONCURRENT_REQUESTS < distributorIds.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      if (fetchSuccess && distributors.length > 0) {
        // Transform distributor data to food bank format
        const foodBanksFromDistributors = await Promise.all(distributors.map(async (distributor) => {
          // Extract address details
          let addressStr = '';
          let coordinates = null;
          
          if (typeof distributor.address === 'object' && distributor.address !== null) {
            if (distributor.address.street) {
              addressStr = distributor.address.street;
              
              // Add any additional address fields if available
              if (distributor.address.city) addressStr += `, ${distributor.address.city}`;
              if (distributor.address.state) addressStr += `, ${distributor.address.state}`;
              if (distributor.address.zipCode) addressStr += ` ${distributor.address.zipCode}`;
            }
          } else if (typeof distributor.address === 'string') {
            addressStr = distributor.address;
          }

          // Get need priority level, mimicking FoodBankDashboard.js approach
          let needLevel = 3; // Default priority level

          if (distributor.needStatus) {
            // If needStatus exists, try to get priorityLevel or level
            if (typeof distributor.needStatus.priorityLevel !== 'undefined') {
              needLevel = distributor.needStatus.priorityLevel;
            } else if (typeof distributor.needStatus.level !== 'undefined') {
              needLevel = distributor.needStatus.level;
            }
          }
          
          // Try to geocode the address if we don't have coordinates
          if ((!distributor.coordinates || !distributor.coordinates.latitude) && 
              (!distributor.location || !distributor.location.coordinates) && 
              addressStr) {
            try {
              // Try geocoding the address
              coordinates = await geocodeAddressAndCache(addressStr);
              console.log(`Geocoded address for ${distributor.username}:`, coordinates);
            } catch (geocodeErr) {
              console.warn(`Failed to geocode address for ${distributor.username}:`, geocodeErr);
            }
          } else if (distributor.coordinates) {
            coordinates = {
              latitude: distributor.coordinates.latitude,
              longitude: distributor.coordinates.longitude
            };
          } else if (distributor.location?.coordinates?.length === 2) {
            // Handle GeoJSON format coordinates [longitude, latitude]
            coordinates = {
              latitude: distributor.location.coordinates[1],
              longitude: distributor.location.coordinates[0]
            };
          }
          
          // Use exact coordinates for known food banks
          const exactCoordinates = {
            'OnRockCommunityService': { latitude: 45.50336284654082, longitude: -73.77964738937693 },
            'WestIslandMission': { latitude: 45.479481379487986, longitude: -73.80522404704882 },
            'FamilleDeLileOuest': { latitude: 45.48081046638597, longitude: -73.86389826054254 },
            'CentreVertical': { latitude: 45.57115430677246, longitude: -73.54096562985544 },
            'LesSamaritains': { latitude: 45.54947317793671, longitude: -73.64833550286876 },
            'MoissonSudOuest': { latitude: 45.2337964686707, longitude: -74.1180536182237 },
            'ExtendedHands': { latitude: 45.440253589930535, longitude: -73.68039692801301 }
          };
          
          // Check if we have exact coordinates for this distributor based on username
          if (distributor.username && exactCoordinates[distributor.username]) {
            coordinates = exactCoordinates[distributor.username];
            console.log(`Using exact coordinates for ${distributor.username}`);
          }
          
          return {
            _id: distributor._id,
            name: distributor.businessName || distributor.username || 'Food Distribution Center',
            address: addressStr || 'Address not available',
            phoneNumber: distributor.phone || distributor.phoneNumber || '',
            email: distributor.email || '',
            openingHours: distributor.openingHours || '',
            needLevel: needLevel,
            coordinates: coordinates
          };
        }));
        
        console.log('Transformed food banks with priority levels:', foodBanksFromDistributors);
        
        // Filter out food banks without coordinates
        const validFoodBanks = foodBanksFromDistributors.filter(fb => 
          fb.coordinates && (fb.coordinates.latitude !== undefined || fb.coordinates.lat !== undefined)
        );
        
        if (validFoodBanks.length > 0) {
          setFoodBanks(validFoodBanks);
          setLoading(false);
          return;
        } else {
          console.warn('No food banks with valid coordinates found');
        }
      }
      
      // If API attempts fail, use fallback data with exact coordinates
      console.warn('All API attempts failed, using fallback data');
      
      // Define key Montreal food bank locations with actual addresses and coordinates
      const montrealFoodBanks = [
        {
          _id: '1',
          name: 'OnRock Community Services',
          address: '9665 Gouin Blvd W, Pierrefonds, QC H8Y 1R4',
          phoneNumber: '(514) 696-1905',
          email: 'foodbank2@gmail.com',
          openingHours: 'Monday - Friday 9:00 AM - 4:00 PM',
          needLevel: 3, // Using same priority scale as FoodBankDashboard.js
          needStatus: {
            priorityLevel: 3, // Ensuring both formats work
            customMessage: "We have some shortages in key areas"
          },
          coordinates: {
            latitude: 45.50336284654082,
            longitude: -73.77964738937693
          }
        },
        {
          _id: '2',
          name: 'West Island Mission',
          address: '1 Holiday Ave, Pointe-Claire, QC H9R 5N3',
          phoneNumber: '(514) 912-6813',
          email: 'foodbank@gmail.com',
          openingHours: 'Monday - Thursday 9:00 AM - 4:00 PM',
          needLevel: 2,
          needStatus: {
            priorityLevel: 2,
            customMessage: "We could use some specific items, but not urgent"
          },
          coordinates: {
            latitude: 45.479481379487986,
            longitude: -73.80522404704882
          }
        },
        {
          _id: '3',
          name: 'Famille De L\'ile Ouest',
          address: '15650A, boulevard de Pierrefonds, Pierrefonds, QC H9H 4K1',
          phoneNumber: '(514) 620-7373',
          email: 'foodbank3@gmail.com',
          openingHours: 'Monday - Thursday 8:30 AM - 12:00 PM & 1:00 PM - 4:30 PM',
          needLevel: 2,
          needStatus: {
            priorityLevel: 2,
            customMessage: "We could use some specific items, but not urgent"
          },
          coordinates: {
            latitude: 45.48081046638597,
            longitude: -73.86389826054254
          }
        },
        {
          _id: '4',
          name: 'Centre Vertical',
          address: '5700 av. Pierre-de-Coubertin, Montreal, QC H1N 1R5',
          phoneNumber: '(514) 332-5550',
          email: 'foodbank4@gmail.com',
          openingHours: 'Monday - Friday 8:30 AM - 4:30 PM',
          needLevel: 4,
          needStatus: {
            priorityLevel: 4,
            customMessage: "We have significant shortages"
          },
          coordinates: {
            latitude: 45.57115430677246,
            longitude: -73.54096562985544
          }
        },
        {
          _id: '5',
          name: 'Les Samaritains',
          address: '500 Avenue 8e, Lachine, QC H8S 3L4',
          phoneNumber: '(514) 376-5885',
          email: 'foodbank5@gmail.com',
          openingHours: 'Monday - Friday 8:30 AM - 4:30 PM',
          needLevel: 4,
          needStatus: {
            priorityLevel: 4,
            customMessage: "We have significant shortages"
          },
          coordinates: {
            latitude: 45.54947317793671,
            longitude: -73.64833550286876
          }
        },
        {
          _id: '6',
          name: 'Moisson Sud Ouest',
          address: 'Ville St-Laurent, QC',
          phoneNumber: '(450) 377-7691',
          email: 'foodbank6@gmail.com',
          openingHours: 'Monday - Friday 8:00 AM - 4:00 PM',
          needLevel: 3,
          needStatus: {
            priorityLevel: 3,
            customMessage: "We have some shortages in key areas"
          },
          coordinates: {
            latitude: 45.2337964686707,
            longitude: -74.1180536182237
          }
        },
        {
          _id: '7',
          name: 'Extended Hands',
          address: 'Rue Fleury, Ahuntsic, QC',
          phoneNumber: '(514) 482-1701',
          email: 'foodbank7@gmail.com',
          openingHours: 'Wednesdays 10:00 AM - 1:00 PM',
          needLevel: 1,
          needStatus: {
            priorityLevel: 1,
            customMessage: "We currently have sufficient supplies"
          },
          coordinates: {
            latitude: 45.440253589930535,
            longitude: -73.68039692801301
          }
        }
      ];
      
      setFoodBanks(montrealFoodBanks);
      setLoading(false);
      
    } catch (error) {
      console.error('Error in fetchFoodBankRecommendations:', error);
      // Use fallback data directly on error
      const montrealFoodBanks = [
        {
          _id: '1',
          name: 'OnRock Community Services',
          address: '9665 Gouin Blvd W, Pierrefonds, QC H8Y 1R4',
          phoneNumber: '(514) 696-1905',
          email: 'foodbank2@gmail.com',
          openingHours: 'Monday - Friday 9:00 AM - 4:00 PM',
          needLevel: 3,
          coordinates: {
            latitude: 45.50336284654082,
            longitude: -73.77964738937693
          }
        },
        {
          _id: '2',
          name: 'West Island Mission',
          address: '1 Holiday Ave, Pointe-Claire, QC H9R 5N3',
          phoneNumber: '(514) 912-6813',
          email: 'foodbank@gmail.com',
          openingHours: 'Monday - Thursday 9:00 AM - 4:00 PM',
          needLevel: 2,
          coordinates: {
            latitude: 45.479481379487986,
            longitude: -73.80522404704882
          }
        },
        // Include remaining food banks as in the original fallback data
        {
          _id: '3',
          name: 'Famille De L\'ile Ouest',
          address: '15650A, boulevard de Pierrefonds, Pierrefonds, QC H9H 4K1',
          phoneNumber: '(514) 620-7373',
          email: 'foodbank3@gmail.com',
          openingHours: 'Monday - Thursday 8:30 AM - 12:00 PM & 1:00 PM - 4:30 PM',
          needLevel: 2,
          coordinates: {
            latitude: 45.48081046638597,
            longitude: -73.86389826054254
          }
        },
        {
          _id: '4',
          name: 'Centre Vertical',
          address: '5700 av. Pierre-de-Coubertin, Montreal, QC H1N 1R5',
          phoneNumber: '(514) 332-5550',
          email: 'foodbank4@gmail.com',
          openingHours: 'Monday - Friday 8:30 AM - 4:30 PM',
          needLevel: 4,
          coordinates: {
            latitude: 45.57115430677246,
            longitude: -73.54096562985544
          }
        },
        {
          _id: '5',
          name: 'Les Samaritains',
          address: '500 Avenue 8e, Lachine, QC H8S 3L4',
          phoneNumber: '(514) 376-5885',
          email: 'foodbank5@gmail.com',
          openingHours: 'Monday - Friday 8:30 AM - 4:30 PM',
          needLevel: 4,
          coordinates: {
            latitude: 45.54947317793671,
            longitude: -73.64833550286876
          }
        },
        {
          _id: '6',
          name: 'Moisson Sud Ouest',
          address: 'Ville St-Laurent, QC',
          phoneNumber: '(450) 377-7691',
          email: 'foodbank6@gmail.com',
          openingHours: 'Monday - Friday 8:00 AM - 4:00 PM',
          needLevel: 3,
          coordinates: {
            latitude: 45.2337964686707,
            longitude: -74.1180536182237
          }
        },
        {
          _id: '7',
          name: 'Extended Hands',
          address: 'Rue Fleury, Ahuntsic, QC',
          phoneNumber: '(514) 482-1701',
          email: 'foodbank7@gmail.com',
          openingHours: 'Wednesdays 10:00 AM - 1:00 PM',
          needLevel: 1,
          coordinates: {
            latitude: 45.440253589930535,
            longitude: -73.68039692801301
          }
        }
      ];
      
      setFoodBanks(montrealFoodBanks);
      setLoading(false);
    }
  }, [apiBaseUrl, token, userId, geocodeAddressAndCache, getAccessTokenSilently, apiCallAttempts]);

  // Load food banks from API based on location
  const loadFoodBanks = useCallback(async (location) => {
    if (!location || !location.lat || !location.lng) {
      console.error('Invalid location for loadFoodBanks:', location);
      return;
    }

    // Since we're using direct IDs, we'll just call fetchFoodBankRecommendations
    // which will take care of getting the data we need
    fetchFoodBankRecommendations();
    
  }, [fetchFoodBankRecommendations]);

  // Get user location using browser geolocation
  const getUserLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    
    // Check if browser supports geolocation
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please enter your location manually.');
      setLoading(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Got user location:', position);
        const userLoc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocationState(userLoc);
        setLoading(false);
        
        // After getting location, load food banks
        loadFoodBanks(userLoc);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to retrieve your location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'You denied the request for geolocation.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'The request to get your location timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
        }
        
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [loadFoodBanks]);

  // Initialize user location from props when available or get it from browser
  useEffect(() => {
    if (show) {
      if (userLocation) {
        // Format the user location to work with our component
        const formattedLocation = {
          latitude: userLocation.latitude || userLocation.lat,
          longitude: userLocation.longitude || userLocation.lng,
          lat: userLocation.lat || userLocation.latitude,
          lng: userLocation.lng || userLocation.longitude
        };
        
        console.log('Setting user location from props:', formattedLocation);
        setUserLocationState(formattedLocation);
    
        // Load food banks with the user location
        if (formattedLocation.lat && formattedLocation.lng) {
          loadFoodBanks(formattedLocation);
        }
    } else {
        // If no user location is provided, try to get it from the browser
        getUserLocation();
      }
    }
  }, [show, userLocation, getUserLocation, loadFoodBanks]);

  // Initialize map when both food banks and user location are available
  useEffect(() => {
    if (show && mapRef.current && userLocationState && foodBanks.length > 0) {
      initMap();
    }
  }, [show, mapRef, userLocationState, foodBanks, initMap]);

  // Helper functions for need level display
  const getNeedLevelColor = (level) => {
    switch (level) {
      case 1: return '#4CAF50'; // Green - Low need
      case 2: return '#FFC107'; // Yellow - Medium need
      case 3: return '#FF9800'; // Orange - High need
      case 4: return '#F44336'; // Red - Critical need
      case 5: return '#B71C1C'; // Dark red - Urgent need
      default: return '#FF9800'; // Default to orange
    }
  };

  const getNeedLevelText = (level) => {
    switch (level) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Critical';
      case 5: return 'Urgent';
      default: return 'High';
    }
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

  // Helper function to get travel time info for a food bank
  const getTravelTime = (foodBankId) => {
    if (!travelTimeRef.current[foodBankId]) {
      // Return a direct time estimate instead of "Calculating..."
      return { duration: 'Est. 15 min', distance: 'Est. 5 km' };
    }
    return travelTimeRef.current[foodBankId];
  };

  // Calculate a priority score based on need level and distance
  const calculatePriorityScore = useCallback((foodBank) => {
    const needLevel = foodBank.needLevel || foodBank.needStatus?.priorityLevel || 3;
    const travelInfo = travelTimeRef.current[foodBank._id];
    
    // If we don't have travel info yet, return a default medium score
    if (!travelInfo || !travelInfo.durationValue) {
      return 50; // Medium priority if we don't have travel data
    }
    
    // Convert duration to minutes (if it's in seconds)
    const durationInMinutes = travelInfo.durationValue / 60;
    
    // Weight factors - give more weight to distance than before
    const needWeight = 0.6; // Reduced from 0.7
    const proximityWeight = 0.4; // Increased from 0.3
    
    // Calculate individual scores
    // Need score: Higher need level = higher score (scale of 0-100)
    const needScore = (needLevel / 5) * 100;
    
    // Proximity score: Lower duration = higher score (scale of 0-100)
    // Assumes most travel times will be under 60 minutes
    const proximityScore = Math.max(0, 100 - (durationInMinutes * 1.5));
    
    // Calculate weighted score
    const totalScore = (needScore * needWeight) + (proximityScore * proximityWeight);
    
    return totalScore;
  }, []);
  
  // Sort and rank food banks based on priority score
  const rankFoodBanks = useCallback(() => {
    if (!foodBanks.length) return;
    
    // Calculate scores for each food bank
    const scoredFoodBanks = foodBanks.map(foodBank => ({
      ...foodBank,
      priorityScore: calculatePriorityScore(foodBank)
    }));
    
    // Sort by priority score (highest first)
    const sorted = [...scoredFoodBanks].sort((a, b) => b.priorityScore - a.priorityScore);
    
    // Add rank property to each food bank
    const ranked = sorted.map((foodBank, index) => ({
      ...foodBank,
      rank: index + 1
    }));
    
    setRankedFoodBanks(ranked);
  }, [foodBanks, calculatePriorityScore]);

  // Update rankings whenever travel times change
  useEffect(() => {
    const hasAllTravelTimes = foodBanks.every(foodBank => 
      travelTimeRef.current[foodBank._id] && travelTimeRef.current[foodBank._id].durationValue
    );
    
    if (hasAllTravelTimes && foodBanks.length > 0) {
      rankFoodBanks();
    }
  }, [foodBanks, travelTimeRef.current, rankFoodBanks]);

  // Calculate routes and travel times for all food banks
  const calculateAllRoutes = useCallback(() => {
    if (!mapInstanceRef.current || !userLocationState || !foodBanks.length || 
        !window.google || !window.google.maps || !window.google.maps.DirectionsService) {
      return;
    }
    
    const directionsService = new window.google.maps.DirectionsService();
    
    // Find user position
    const userPosition = new window.google.maps.LatLng(
      userLocationState.latitude || userLocationState.lat,
      userLocationState.longitude || userLocationState.lng
    );
    
    // For each food bank, calculate route and travel time
    foodBanks.forEach(foodBank => {
      // Find coordinates for this food bank
      let foodBankPosition = null;
      
      // Try different possible coordinate formats
      if (foodBank.coordinates?.latitude !== undefined && foodBank.coordinates?.longitude !== undefined) {
        foodBankPosition = new window.google.maps.LatLng(
          foodBank.coordinates.latitude,
          foodBank.coordinates.longitude
        );
      } else if (foodBank.coordinates?.lat !== undefined && foodBank.coordinates?.lng !== undefined) {
        foodBankPosition = new window.google.maps.LatLng(
          foodBank.coordinates.lat,
          foodBank.coordinates.lng
        );
      } else if (foodBank.location?.coordinates?.length === 2) {
        // GeoJSON format [longitude, latitude]
        foodBankPosition = new window.google.maps.LatLng(
          foodBank.location.coordinates[1],
          foodBank.location.coordinates[0]
        );
      }
      
      if (!foodBankPosition) {
        console.warn('Could not find position for food bank:', foodBank.name);
        return;
      }
      
      // Request directions
      directionsService.route({
        origin: userPosition,
        destination: foodBankPosition,
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (response, status) => {
        if (status === 'OK') {
          // Update travel time if route contains legs
          if (response.routes && response.routes[0] && response.routes[0].legs && response.routes[0].legs[0]) {
            const leg = response.routes[0].legs[0];
            
            // Store both text and value (seconds/meters) for calculations
            travelTimeRef.current = {
              ...travelTimeRef.current,
              [foodBank._id]: { 
                duration: leg.duration.text, 
                distance: leg.distance.text,
                durationValue: leg.duration.value, // in seconds
                distanceValue: leg.distance.value  // in meters
              }
            };
            
            // Trigger re-render and ranking update
            if (foodBanks.every(fb => travelTimeRef.current[fb._id])) {
              setFoodBanks([...foodBanks]);
              rankFoodBanks();
            }
          }
        } else {
          console.warn('Directions request failed for', foodBank.name, 'with status:', status);
          
          // Set an estimated time based on straight-line distance
          const dist = window.google.maps.geometry.spherical.computeDistanceBetween(
            userPosition, foodBankPosition
          );
          
          // Rough estimate: 50 km/h average speed (0.8 km per minute)
          const estMinutes = Math.ceil(dist / 1000 / 0.8);
          
          travelTimeRef.current = {
            ...travelTimeRef.current,
            [foodBank._id]: { 
              duration: `${estMinutes} min`, 
              distance: `${(dist/1000).toFixed(1)} km`,
              durationValue: estMinutes * 60, // Estimated seconds
              distanceValue: dist  // in meters
            }
          };
          
          // Trigger re-render and ranking update
          if (foodBanks.every(fb => travelTimeRef.current[fb._id])) {
            setFoodBanks([...foodBanks]);
            rankFoodBanks();
          }
        }
      });
    });
  }, [userLocationState, foodBanks, rankFoodBanks]);

  // Call calculateAllRoutes when map is ready
  useEffect(() => {
    if (mapInitialized && mapInstanceRef.current && foodBanks.length > 0 && userLocationState) {
      const timer = setTimeout(() => {
        calculateAllRoutes();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mapInitialized, foodBanks, userLocationState, calculateAllRoutes]);

  // Handle confirmation of delivery
  const confirmDelivery = async () => {
    try {
      if (!selectedFoodBank) {
        toast.error("Please select a food bank before confirming delivery");
        return;
      }

      if (!donation || !donation._id) {
        toast.error("Donation ID not found. Please try again.");
        return;
      }

      setLoading(true);
      
      // MongoDB IDs to Auth0 ID mapping for food banks - using REAL Auth0 IDs
      const foodBankIdMap = {
        // These are the MongoDB IDs mapped to their REAL Auth0 IDs
        "680df6bdbe06fe5db7767dc9": "auth0|680df6aeaa8a0009d4e80f71", // WestIslandMission
        "680df78cbe06fe5db7767de6": "auth0|680df772aa8a0009d4e80f6f", // OnRockCommunityService  
        "680df810be06fe5db7767dfe": "auth0|680df7fbaa8a0009d4e80f73", // FamilleDeLileOuest
        "680df863be06fe5db7767e22": "auth0|680df84caa8a0009d4e80f75", // CentreVertical
        "680df89cbe06fe5db7767e37": "auth0|680df891aa8a0009d4e80f77", // LesSamaritains
        "680df8e5be06fe5db7767e4a": "auth0|680df8ceaa8a0009d4e80f79", // MoissonSudOuest
        "680df99cbe06fe5db7767e68": "auth0|680df973aa8a0009d4e80f7b", // ExtendedHands
      };
      
      // Get the selected food bank's ID
      const selectedId = selectedFoodBank._id.toString();
      console.log('Selected food bank MongoDB ID:', selectedId);
      
      // Look up the Auth0 ID from the mapping - use the REAL Auth0 ID
      let foodBankId = foodBankIdMap[selectedId];
      
      // If we don't have a mapping, fall back to fetching the data
      if (!foodBankId) {
        try {
          // Try to get a fresh token if needed
          let currentToken = token;
          if (!currentToken) {
            try {
              currentToken = await getAccessTokenSilently();
              setToken(currentToken);
            } catch (tokenError) {
              console.warn('Could not get Auth0 token:', tokenError);
            }
          }
          
          // Fetch the actual user data from the API to get the correct Auth0 ID
          const userResponse = await axios.get(
            `${apiBaseUrl}/api/users/${selectedId}`, 
            { 
              headers: { 
                'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                'Accept': 'application/json'
              },
              timeout: 5000
            }
          );
          
          if (userResponse.data && userResponse.data.auth0Id) {
            foodBankId = userResponse.data.auth0Id;
            console.log('Retrieved REAL Auth0 ID from user data:', foodBankId);
          } else {
            // Last resort: use MongoDB ID
            foodBankId = selectedId;
            console.warn('No Auth0 ID found, using MongoDB ID as fallback');
          }
        } catch (fetchError) {
          console.error('Error fetching food bank user data:', fetchError);
          // Last resort: use MongoDB ID
          foodBankId = selectedId;
        }
      }
      
      console.log('Using REAL food bank Auth0 ID:', foodBankId);
      
      // Use the foodBankService directly with the proper payload
      // Including all fields that might be required by the server
      const response = await fetch(`http://localhost:5000/api/foodbanks/mark-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          donationId: donation._id, 
          volunteerId: userId,
          foodBankId: foodBankId, // Use the REAL Auth0 ID
          // Include additional donation fields from original donation
          donorType: donation.donorType || 'individual',
          status: 'picked_up',  // Match the expected initial status in the server
          // Add other fields from the donation if they exist
          title: donation.title,
          description: donation.description,
          category: donation.category,
          quantity: donation.quantity,
          donorId: donation.donorId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to mark donation as delivered');
      }

      toast.success("Delivery confirmed!");
      setLoading(false);
      onClose();
      if (onDeliveryConfirmed) onDeliveryConfirmed();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error("Failed to confirm delivery. Please try again.");
      setLoading(false);
    }
  };

  const highlightSelectedFoodBank = () => {
    if (!selectedFoodBank || !mapInstanceRef.current) return;
    
    // Clear any existing route
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current.setMap(mapInstanceRef.current);
    }
    
    // Find coordinates for the selected food bank
    let selectedPosition = null;
    
    // Try different possible coordinate formats
    if (selectedFoodBank.coordinates?.latitude !== undefined && selectedFoodBank.coordinates?.longitude !== undefined) {
      selectedPosition = new window.google.maps.LatLng(
        selectedFoodBank.coordinates.latitude,
        selectedFoodBank.coordinates.longitude
      );
    } else if (selectedFoodBank.coordinates?.lat !== undefined && selectedFoodBank.coordinates?.lng !== undefined) {
      selectedPosition = new window.google.maps.LatLng(
        selectedFoodBank.coordinates.lat,
        selectedFoodBank.coordinates.lng
      );
    } else if (selectedFoodBank.location?.coordinates?.length === 2) {
      // GeoJSON format [longitude, latitude]
      selectedPosition = new window.google.maps.LatLng(
        selectedFoodBank.location.coordinates[1],
        selectedFoodBank.location.coordinates[0]
      );
    }
    
    if (!selectedPosition) {
      console.warn('Could not find position for selected food bank');
      return;
    }
    
    // Find the marker for the selected food bank by checking position
    const selectedMarker = markersRef.current.find(marker => {
      const markerPos = marker.getPosition();
      return Math.abs(markerPos.lat() - selectedPosition.lat()) < 0.0001 && 
             Math.abs(markerPos.lng() - selectedPosition.lng()) < 0.0001;
    });
    
    if (selectedMarker) {
      // Pan to the selected food bank and highlight it
      mapInstanceRef.current.panTo(selectedPosition);
      mapInstanceRef.current.setZoom(14);
      
      // Bounce animation for the selected marker
      selectedMarker.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => {
        selectedMarker.setAnimation(null);
      }, 1500);
      
      // Create and show info window with selected food bank details
      if (infoWindowRef.current) {
        // Prepare address for display
      const addressDisplay = typeof selectedFoodBank.address === 'object' ? 
        `${selectedFoodBank.address.street || ''}, ${selectedFoodBank.address.city || ''}, ${selectedFoodBank.address.state || ''} ${selectedFoodBank.address.zip || ''}`.trim() : 
        (selectedFoodBank.address || 'No address provided');
      
        // Get need level color and text
        let needLevelText = 'Medium';
        let needLevelColor = '#f0ad4e';
        
        // Determine need level display based on value
        const needLevel = selectedFoodBank.needLevel || selectedFoodBank.needStatus?.priorityLevel || 3;
        if (needLevel >= 4) {
          needLevelColor = '#d9534f';
          needLevelText = 'High';
        } else if (needLevel === 3) {
          needLevelColor = '#f0ad4e';
          needLevelText = 'Medium';
        } else {
          needLevelColor = '#5cb85c';
          needLevelText = 'Low';
        }
        
        // Create info window content
      const infoContent = `
          <div class="map-info-window" style="max-width: 250px; padding: 10px;">
            <h4 style="margin-top: 0; color: #3a3a3a;">${selectedFoodBank.name}</h4>
            <p style="font-size: 14px; margin: 5px 0;"><strong>Address:</strong> ${addressDisplay}</p>
            ${selectedFoodBank.phoneNumber ? `<p style="font-size: 13px; margin: 5px 0;"><strong>Phone:</strong> ${selectedFoodBank.phoneNumber}</p>` : ''}
            ${selectedFoodBank.email ? `<p style="font-size: 13px; margin: 5px 0;"><strong>Email:</strong> ${selectedFoodBank.email}</p>` : ''}
            ${selectedFoodBank.openingHours ? `<p style="font-size: 13px; margin: 5px 0;"><strong>Hours:</strong> ${selectedFoodBank.openingHours}</p>` : ''}
            <p style="font-size: 13px; margin: 5px 0;"><strong>Need Level:</strong> <span style="color: ${needLevelColor}; font-weight: bold;">${needLevelText}</span></p>
            <div style="margin-top: 10px; text-align: center;">
              <span style="background: #4CAF50; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; font-weight: 500;">
                ✓ Selected for Delivery
              </span>
            </div>
        </div>
      `;
      
      infoWindowRef.current.setContent(infoContent);
      infoWindowRef.current.open(mapInstanceRef.current, selectedMarker);
      }
      
      // Calculate and show route if user location is available
      if (userLocationState && directionsServiceRef.current) {
        // Find user position
        const userPosition = new window.google.maps.LatLng(
          userLocationState.latitude || userLocationState.lat,
          userLocationState.longitude || userLocationState.lng
        );
        
        // Request directions
        directionsServiceRef.current.route({
          origin: userPosition,
          destination: selectedPosition,
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (response, status) => {
          if (status === 'OK' && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(response);
            
            // Update travel time if route contains legs
            if (response.routes && response.routes[0] && response.routes[0].legs && response.routes[0].legs[0]) {
              const leg = response.routes[0].legs[0];
              
              // Store both text and value (seconds/meters) for calculations
              travelTimeRef.current = {
                ...travelTimeRef.current,
                [selectedFoodBank._id]: { 
                  duration: leg.duration.text, 
                  distance: leg.distance.text,
                  durationValue: leg.duration.value, // in seconds
                  distanceValue: leg.distance.value  // in meters
                }
              };
              
              console.log(`Route calculated: ${leg.distance.text} (${leg.duration.text})`);
            }
          } else {
            console.warn('Directions request failed with status:', status);
          }
        });
      }
    } else {
      console.warn('Could not find marker for selected food bank');
    }
  };

  const adjustMapBounds = () => {
    if (!mapInstanceRef.current) return;
    
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;
    
    // Add user location to bounds
    if (userLocationState && userLocationState.latitude && userLocationState.longitude) {
      bounds.extend(new window.google.maps.LatLng(
        userLocationState.latitude,
        userLocationState.longitude
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

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (window.selectFoodBank) {
        delete window.selectFoodBank;
      }
      
      // Clear markers
      if (markersRef.current.length > 0) {
        markersRef.current.forEach(marker => {
          if (marker) marker.setMap(null);
        });
        markersRef.current = [];
      }
      
      // Clear directions renderer
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      
      // Clear map instance
      mapInstanceRef.current = null;
    };
  }, []);

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
                {rankedFoodBanks.length > 0 
                  ? rankedFoodBanks.map((foodBank) => {
                    const addressDisplay = typeof foodBank.address === 'object' ? 
                      `${foodBank.address.street || ''}, ${foodBank.address.city || ''}, ${foodBank.address.state || ''} ${foodBank.address.zip || ''}`.trim() : 
                      (foodBank.address || 'No address provided');
                      
                    const travelInfo = getTravelTime(foodBank._id);
                    const isRecommended = foodBank.rank === 1;
                      
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
                          border: `1px solid ${selectedFoodBank?._id === foodBank._id ? '#4CAF50' : isRecommended ? '#4CAF50' : '#e0e0e0'}`,
                          backgroundColor: selectedFoodBank?._id === foodBank._id ? '#EDF7ED' : isRecommended ? 'rgba(76, 175, 80, 0.05)' : 'white',
                          boxShadow: selectedFoodBank?._id === foodBank._id 
                            ? '0 2px 8px rgba(76, 175, 80, 0.2)' 
                            : isRecommended ? '0 1px 3px rgba(76, 175, 80, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
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
                        
                        {isRecommended && (
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '10px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Recommended
                          </div>
                        )}

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
                            {travelInfo.distance} ({travelInfo.duration})
                          </span>
                        </p>
                      </li>
                    );
                  })
                  : foodBanks.map((foodBank) => {
                    // Original rendering logic for when rankings aren't available
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
              {loading ? 'Processing...' : selectedFoodBank ? 'Confirm Delivery' : 'Select a Food Bank'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FoodBankSuggestionModal;