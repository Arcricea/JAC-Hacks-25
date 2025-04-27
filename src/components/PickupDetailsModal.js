import React, { useEffect, useState, useContext } from 'react';
import '../assets/styles/PickupDetailsModal.css';
import GoogleMapsScript from './GoogleMapsScript';
import { UserContext } from '../App';
import { assignDonationToVolunteer, cancelVolunteerAssignment } from '../services/donationService';

const PickupDetailsModal = ({ isOpen, onClose, pickup, onAccept, onCancel }) => {
  const { userData } = useContext(UserContext);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleMapsLoad = () => {
    setIsMapLoaded(true);
  };

  useEffect(() => {
    if (isOpen && isMapLoaded && pickup && pickup.businessAddress) {
      // Try to geocode the address
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: pickup.businessAddress }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setCoordinates({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
            formattedAddress: results[0].formatted_address
          });
          setMapError(null);
          initMap(results[0].geometry.location.lat(), results[0].geometry.location.lng());
        } else {
          setMapError('Could not find this location on the map');
          setCoordinates(null);
        }
      });
    }

    // Clear any previous errors when modal opens/closes
    setError(null);
  }, [isOpen, isMapLoaded, pickup]);

  const initMap = (lat, lng) => {
    try {
      const mapElement = document.getElementById('pickup-map');
      if (mapElement) {
        const map = new window.google.maps.Map(mapElement, {
          center: { lat, lng },
          zoom: 15,
        });

        // Add a marker
        new window.google.maps.Marker({
          position: { lat, lng },
          map,
          title: `${pickup?.businessName || pickup?.donorName || 'Anonymous'} Pickup Address`
        });
      }
    } catch (err) {
      console.error('Error initializing map:', err);
      setMapError('Failed to initialize map');
    }
  };

  const handleAcceptTask = async () => {
    if (!userData?.auth0Id) {
      setError('Please log in to accept tasks');
      return;
    }

    setIsAssigning(true);
    setError(null);

    try {
      const response = await assignDonationToVolunteer(pickup._id, userData.auth0Id);
      if (response.success) {
        // If parent component provided an onAccept callback, call it
        if (onAccept) {
          onAccept(pickup._id);
        }
        // Close the modal after successful assignment
        onClose();
        // Show success message
        alert('Donation scheduled successfully!');
      } else {
        setError(response.message || 'Failed to schedule donation.');
      }
    } catch (err) {
      setError('Failed to schedule donation. Please try again.');
      console.error('Error accepting task:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCancelTask = async () => {
    if (!userData?.auth0Id) {
      setError('Please log in to cancel this pickup');
      return;
    }

    // Confirm before cancelling
    if (!window.confirm('Are you sure you want to cancel this pickup? This action cannot be undone.')) {
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      const response = await cancelVolunteerAssignment(pickup._id, userData.auth0Id);
      if (response.success) {
        // If parent component provided an onCancel callback, call it
        if (onCancel) {
          onCancel(pickup._id);
        }
        // Close the modal after successful cancellation
        onClose();
        // Show success message
        alert('Pickup cancelled successfully.');
      } else {
        setError(response.message || 'Failed to cancel pickup.');
      }
    } catch (err) {
      setError('Failed to cancel pickup. Please try again.');
      console.error('Error cancelling task:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isOpen || !pickup) return null;
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <>
      <GoogleMapsScript onLoad={handleGoogleMapsLoad} />
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Pickup Details</h2>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
          
          <div className="modal-body">
            <div className="pickup-info-section">
              <h3>Items to Pickup:</h3>
              <p className="pickup-item-name">{pickup.itemName} ({pickup.quantity})</p>
              <p className="pickup-category"><span>Category:</span> {pickup.category}</p>
              
              <div className="pickup-dates">
                <p><span>Expiration Date:</span> {formatDate(pickup.expirationDate)}</p>
                <p><span>Listed Date:</span> {formatDate(pickup.createdAt)}</p>
              </div>
              
              <div className="pickup-location-info">
                <h3>Address:</h3>
                <p>{pickup.businessAddress || 'No address provided'}</p>
              </div>
              
              <div className="pickup-location-info">
                <h3>Extra Information:</h3>
                <p>{pickup.pickupInfo}</p>
                {coordinates && <p className="formatted-address">{coordinates.formattedAddress}</p>}
              </div>
              
              <div className="pickup-source">
                <h3>Source:</h3>
                <p>{pickup.businessName || pickup.donorName || 'Anonymous Donor'}</p>
              </div>

              {error && <p className="error-message">{error}</p>}
            </div>
            
            <div className="map-section">
              <h3>Location Map</h3>
              {mapError && <p className="map-error">{mapError}</p>}
              <div id="pickup-map" className="pickup-map"></div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button onClick={onClose} className="close-btn-modal">Close</button>
            
            {pickup.status === 'assigned' && (
              <button 
                className="cancel-pickup-btn"
                onClick={handleCancelTask}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Pickup'}
              </button>
            )}
            
            {pickup.status !== 'assigned' && pickup.status !== 'completed' && pickup.status !== 'delivered' && (
              <button 
                className="accept-pickup-btn"
                onClick={handleAcceptTask}
                disabled={isAssigning}
              >
                {isAssigning ? 'Processing...' : 'Accept Pickup'}
              </button>
            )}
            
            {(pickup.status === 'completed' || pickup.status === 'delivered') && (
              <span className="delivery-status-badge">
                Delivery Completed
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PickupDetailsModal; 