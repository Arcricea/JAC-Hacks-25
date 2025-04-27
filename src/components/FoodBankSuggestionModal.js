import React, { useState, useEffect, useRef } from 'react';
import { Modal, Alert } from 'react-bootstrap';
import { GrLocation, FiClock, FaInfoCircle } from './Icons';
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
      const googleMapScript = document.createElement('script');
      googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      googleMapScript.async = true;
      googleMapScript.defer = true;
      googleMapScript.onload = () => setIsLoadingGoogle(false);
      document.body.appendChild(googleMapScript);
      return () => {
        document.body.removeChild(googleMapScript);
      };
    } else {
      setIsLoadingGoogle(false);
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
      initMap();
    }
  }, [isLoadingGoogle, foodBanks, show]);

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
        donation.id,
        '',
        userLocation
      );
      
      setFoodBanks(response.data);
      if (response.data.length > 0) {
        setSelectedFoodBank(response.data[0]);
      }
    } catch (err) {
      console.error('Error fetching food bank recommendations:', err);
      setError('Failed to load food bank recommendations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const initMap = () => {
    if (!window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: userLocation.latitude, lng: userLocation.longitude },
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU
      }
    });

    mapInstanceRef.current = map;
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

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // Add user location marker
    addUserLocationMarker();
    
    // Add food bank markers
    foodBanks.forEach(foodBank => {
      addFoodBankMarker(foodBank);
    });

    // Calculate travel times for all food banks
    calculateTravelTimes();
    
    // Fit map to show all markers
    adjustMapBounds();
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
    if (!foodBank.coordinates || !foodBank.coordinates.latitude || !foodBank.coordinates.longitude) {
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
    
    const infoContent = `
      <div class="map-info-window">
        <h4>${foodBank.name}</h4>
        <p><strong>Address:</strong> ${foodBank.address}</p>
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
  };

  const calculateTravelTimes = () => {
    if (!directionsServiceRef.current || !userLocation) return;
    
    const origin = new window.google.maps.LatLng(
      userLocation.latitude,
      userLocation.longitude
    );
    
    foodBanks.forEach(foodBank => {
      if (!foodBank.coordinates || !foodBank.coordinates.latitude || !foodBank.coordinates.longitude) {
        return;
      }
      
      const destination = new window.google.maps.LatLng(
        foodBank.coordinates.latitude,
        foodBank.coordinates.longitude
      );
      
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
        }
      });
    });
  };

  const highlightSelectedFoodBank = () => {
    if (!selectedFoodBank || !selectedFoodBank.coordinates || !directionsServiceRef.current) return;
    
    // Reset directions
    directionsRendererRef.current.setDirections({ routes: [] });
    
    // Find the marker for the selected food bank
    const selectedMarker = markersRef.current.find(marker => 
      marker.getPosition().lat() === selectedFoodBank.coordinates.latitude && 
      marker.getPosition().lng() === selectedFoodBank.coordinates.longitude
    );
    
    if (selectedMarker) {
      // Pan to selected food bank
      mapInstanceRef.current.panTo(selectedMarker.getPosition());
      mapInstanceRef.current.setZoom(14);
      
      // Show info window
      const needColor = getNeedLevelColor(selectedFoodBank.needLevel || 1);
      const infoContent = `
        <div class="map-info-window">
          <h4>${selectedFoodBank.name}</h4>
          <p><strong>Address:</strong> ${selectedFoodBank.address}</p>
          ${selectedFoodBank.phoneNumber ? `<p><strong>Phone:</strong> ${selectedFoodBank.phoneNumber}</p>` : ''}
          ${selectedFoodBank.openingHours ? `<p><strong>Hours:</strong> ${selectedFoodBank.openingHours}</p>` : ''}
          <p><strong>Need Level:</strong> <span style="color: ${needColor}; font-weight: bold;">${getNeedLevelText(selectedFoodBank.needLevel || 1)}</span></p>
        </div>
      `;
      
      infoWindowRef.current.setContent(infoContent);
      infoWindowRef.current.open(mapInstanceRef.current, selectedMarker);
      
      // Show route from user location to selected food bank
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        const origin = new window.google.maps.LatLng(
          userLocation.latitude,
          userLocation.longitude
        );
        
        const destination = new window.google.maps.LatLng(
          selectedFoodBank.coordinates.latitude,
          selectedFoodBank.coordinates.longitude
        );
        
        directionsServiceRef.current.route({
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (response, status) => {
          if (status === 'OK') {
            directionsRendererRef.current.setDirections(response);
            mapInstanceRef.current.fitBounds(new window.google.maps.LatLngBounds(origin, destination));
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
    return travelTimeRef.current[foodBankId] || { duration: 'Calculating...', distance: 'Calculating...' };
  };

  const confirmDelivery = async () => {
    if (!selectedFoodBank) {
      toast.error('Please select a food bank first');
      return;
    }

    try {
      setLoading(true);
      await donationService.markDonationDelivered(donation.id, selectedFoodBank._id);
      
      toast.success('Donation marked as delivered to food bank!');
      onDeliveryConfirmed();
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
      3: 'Moderate Need',
      4: 'High Need',
      5: 'Urgent Need'
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

  return (
    <Modal 
      show={show} 
      onHide={onClose} 
      size="xl"
      centered
      dialogClassName="foodbank-suggestions"
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>Select a Food Bank for Delivery</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="delivery-info">
            <p>
              <FaInfoCircle /> You are about to deliver donation #{donation?.id?.substring(0, 8)} with 
              {donation?.items?.length || 0} item(s) to a food bank. Please select where you'd like to deliver these items.
            </p>
          </div>
          
          {error && (
            <Alert variant="danger">{error}</Alert>
          )}
          
          {loading && !foodBanks.length ? (
            <div className="loading-container">
              <p>Finding the best food banks for your donation...</p>
              <LoadingSpinner />
            </div>
          ) : (
            <div className="foodbank-results-container redesigned">
              <div className="foodbank-list">
                <h3>Recommended Food Banks</h3>
                {foodBanks.length === 0 ? (
                  <p>No food banks found. Please try again later.</p>
                ) : (
                  <ul className="foodbank-recommendations">
                    {foodBanks.map((foodBank) => (
                      <li 
                        key={foodBank._id}
                        className={`foodbank-item ${selectedFoodBank?._id === foodBank._id ? 'selected' : ''}`}
                        onClick={() => handleFoodBankSelect(foodBank)}
                      >
                        <div className="foodbank-card-header">
                          <h4>{foodBank.name}</h4>
                          <span className={`need-level need-level-${foodBank.needLevel || 1}`}>
                            {getNeedLevelText(foodBank.needLevel || 1)}
                          </span>
                        </div>
                        <div className="foodbank-card-body">
                          <p className="foodbank-address">
                            <GrLocation /> {foodBank.address}
                          </p>
                          <div className="foodbank-card-details">
                            {foodBank.openingHours && (
                              <p className="foodbank-hours">
                                <FiClock /> Hours: <span>{foodBank.openingHours}</span>
                              </p>
                            )}
                            <p className="travel-time">
                              <span>
                                {travelTimeRef.current[foodBank._id] ? 
                                  `${getTravelTime(foodBank._id).distance} (${getTravelTime(foodBank._id).duration})` : 
                                  'Calculating...'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="foodbank-map-container expanded">
                {isLoadingGoogle ? (
                  <div className="loading-container">
                    <p>Loading map...</p>
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div
                    ref={mapRef}
                    className="foodbank-map"
                  />
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="close-btn-modal" onClick={onClose}>
            Cancel
          </button>
          <button
            className="confirm-delivery-btn"
            disabled={loading || !selectedFoodBank}
            onClick={confirmDelivery}
          >
            {loading ? 'Processing...' : 'Confirm Delivery'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FoodBankSuggestionModal;