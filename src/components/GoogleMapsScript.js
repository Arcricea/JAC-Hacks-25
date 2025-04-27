import React, { useEffect } from 'react';

const GoogleMapsScript = ({ onLoad }) => {
  useEffect(() => {
    // Debug logging
    console.log('GoogleMapsScript mounting');
    console.log('API Key available:', !!process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
    
    // Create a unique ID for our script tag
    const scriptId = 'google-maps-script';
    
    // Check if script already exists
    let script = document.getElementById(scriptId);
    
    // If the script is already loaded and Google Maps is available
    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded, calling onLoad');
      onLoad();
      return;
    }
    
    // If the script tag doesn't exist, create it
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      // Add load event listener
      script.addEventListener('load', () => {
        console.log('Google Maps script loaded successfully');
        onLoad();
      });
      
      // Add error event listener
      script.addEventListener('error', (error) => {
        console.error('Error loading Google Maps script:', error);
        console.error('Script URL:', script.src);
      });
      
      // Append the script to the document
      document.head.appendChild(script);
    }
    
    // Cleanup - but don't remove the script tag
    return () => {
      console.log('GoogleMapsScript unmounting');
    };
  }, [onLoad]);

  return null;
};

export default GoogleMapsScript; 