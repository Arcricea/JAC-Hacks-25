// NOTE: API keys should not be stored directly in client-side code.
// This key should be injected server-side or via a build process.
// The server/build process would typically read the key from a .env file.
// const API_KEY = 'YOUR_API_KEY_HERE'; // Replace this or inject dynamically

/**
 * Initializes the map. This function is called by the Google Maps API
 * once it has loaded successfully.
 */
function initMap() {
  // This function will be called once the Google Maps API is loaded.
  // You can initialize your map instance here.
  console.log("Google Maps API loaded successfully.");

  // Example: Initialize a map centered on a default location
  // Assumes you have an HTML element with id="map"
  // const mapElement = document.getElementById('map');
  // if (mapElement) {
  //   const map = new google.maps.Map(mapElement, {
  //     center: { lat: -34.397, lng: 150.644 },
  //     zoom: 8,
  //   });
  //   console.log("Map initialized.");
  // } else {
  //   console.error("Map element not found.");
  // }
}

/**
 * Dynamically loads the Google Maps JavaScript API script.
 */
function loadGoogleMapsScript() {
  // Check if the script is already added
  if (window.google && window.google.maps) {
    console.log("Google Maps API already loaded.");
    // If already loaded but initMap wasn't called (e.g., script added manually),
    // ensure initMap is callable or call it if appropriate.
    if (typeof window.initMap === 'function' && !document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`)) {
       // If script tag isn't present but google.maps exists, might be an edge case.
       // Re-assigning to window just in case.
       window.initMap = initMap;
    } else if (typeof window.initMap === 'function') {
        // If script tag is present and API loaded, maybe call initMap directly?
        // Or rely on the callback mechanism. For simplicity, we'll rely on the callback.
    }
    return;
  }

  // Make initMap globally accessible for the callback parameter in the script URL
  window.initMap = initMap;

  const script = document.createElement('script');
  // Include necessary libraries, like 'maps' and 'marker'
  // IMPORTANT: The API key needs to be added to this URL.
  // Example (requires API_KEY variable to be set, e.g., via server-side templating or build tool):
  // script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap&libraries=maps,marker&v=beta&loading=async`;
  // Or, if injecting the full URL server-side:
  // script.src = getMapScriptUrlFromServer(); 
  script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=maps,marker&v=beta&loading=async`; // Key added
  script.async = true;
  script.defer = true; // Ensure script executes after HTML parsing
  script.onerror = () => {
      console.error("Failed to load Google Maps script.");
      // Clean up the global function if loading failed
      delete window.initMap;
  };

  // Append the script to the <head> for cleaner organization
  document.head.appendChild(script);
}

// Example of how to use it:
// Call loadGoogleMapsScript() when you need the map,
// for example, after the DOM is fully loaded.
// document.addEventListener('DOMContentLoaded', loadGoogleMapsScript);

// Or if you load this script deferred itself, you might call it directly:
// loadGoogleMapsScript();

// Export the function if using modules (optional)
// export { loadGoogleMapsScript }; 