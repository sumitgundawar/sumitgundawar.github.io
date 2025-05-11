import { useEffect, useRef } from 'react';

interface MapComponentProps {
  className?: string;
}

const MapComponent = ({ className }: MapComponentProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Function to initialize the map once the API is loaded
    const initMap = async () => {
      if (!mapRef.current || !window.google?.maps) return;
      
      try {
        // Dynamically import the Maps JavaScript API
        const { Map, Marker } = await window.google.maps.importLibrary("maps") as google.maps.MapsLibrary;
        
        // London coordinates
        const position = { lat: 51.5074, lng: -0.1278 };
        
        // Create the map instance
        const map = new Map(mapRef.current, {
          center: position,
          zoom: 12,
          mapId: "LONDON_MAP",
          styles: [
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [{ "color": "#e9e9e9" }, { "lightness": 17 }]
            },
            {
              "featureType": "landscape",
              "elementType": "geometry",
              "stylers": [{ "color": "#f5f5f5" }, { "lightness": 20 }]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry.fill",
              "stylers": [{ "color": "#ffffff" }, { "lightness": 17 }]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry.stroke",
              "stylers": [{ "color": "#ffffff" }, { "lightness": 29 }, { "weight": 0.2 }]
            },
            {
              "featureType": "road.arterial",
              "elementType": "geometry",
              "stylers": [{ "color": "#ffffff" }, { "lightness": 18 }]
            },
            {
              "featureType": "road.local",
              "elementType": "geometry",
              "stylers": [{ "color": "#ffffff" }, { "lightness": 16 }]
            },
            {
              "featureType": "poi",
              "elementType": "geometry",
              "stylers": [{ "color": "#f5f5f5" }, { "lightness": 21 }]
            },
            {
              "featureType": "poi.park",
              "elementType": "geometry",
              "stylers": [{ "color": "#dedede" }, { "lightness": 21 }]
            },
            {
              "elementType": "labels.text.stroke",
              "stylers": [{ "visibility": "on" }, { "color": "#ffffff" }, { "lightness": 16 }]
            },
            {
              "elementType": "labels.text.fill",
              "stylers": [{ "saturation": 36 }, { "color": "#333333" }, { "lightness": 40 }]
            },
            {
              "elementType": "labels.icon",
              "stylers": [{ "visibility": "off" }]
            },
            {
              "featureType": "transit",
              "elementType": "geometry",
              "stylers": [{ "color": "#f2f2f2" }, { "lightness": 19 }]
            },
            {
              "featureType": "administrative",
              "elementType": "geometry.fill",
              "stylers": [{ "color": "#fefefe" }, { "lightness": 20 }]
            },
            {
              "featureType": "administrative",
              "elementType": "geometry.stroke",
              "stylers": [{ "color": "#fefefe" }, { "lightness": 17 }, { "weight": 1.2 }]
            }
          ]
        });
        
        // Add a marker for London
        new Marker({
          position,
          map,
          title: "London, UK"
        });
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    // Check if Google Maps API is already loaded
    if (window.google?.maps) {
      initMap();
    } else {
      // Set up a listener for when the API becomes available
      const checkGoogleMapsLoaded = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkGoogleMapsLoaded);
          initMap();
        }
      }, 100);
      
      // Clear interval after 10 seconds to prevent infinite checking
      setTimeout(() => clearInterval(checkGoogleMapsLoaded), 10000);
    }
    
    return () => {
      // Clean up any resources if needed
    };
  }, []);
  
  return (
    <div 
      ref={mapRef} 
      className={`w-full h-64 rounded-lg shadow-md ${className}`}
      aria-label="Map showing London, UK location"
    />
  );
};

// Add TypeScript declarations for Google Maps
declare global {
  interface Window {
    google: {
      maps: {
        importLibrary: (library: string) => Promise<any>;
      }
    }
  }
}

// Define the MapsLibrary interface
namespace google.maps {
  export interface MapsLibrary {
    Map: typeof google.maps.Map;
    Marker: typeof google.maps.Marker;
  }
}

export default MapComponent;