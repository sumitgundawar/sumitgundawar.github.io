import { useEffect, useRef } from 'react';

interface MapComponentProps {
  className?: string;
}

const MapComponent = ({ className }: MapComponentProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Load Google Maps API script dynamically
    const loadGoogleMapsAPI = () => {
      if (!document.querySelector('script[src*="maps.googleapis.com/maps/api"]')) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBnSQ_kM3vVy5K-BPEIvxCJHlNVE5tj6QY&callback=initMap`;
        script.async = true;
        script.defer = true;
        
        // Define the callback function that Google Maps will call
        window.initMap = () => {
          if (mapRef.current) {
            // London coordinates
            const londonCoordinates = { lat: 51.5074, lng: -0.1278 };
            
            // Create the map
            const map = new google.maps.Map(mapRef.current, {
              center: londonCoordinates,
              zoom: 12,
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
            new google.maps.Marker({
              position: londonCoordinates,
              map: map,
              title: "London, UK"
            });
          }
        };
        
        document.head.appendChild(script);
      }
    };
    
    loadGoogleMapsAPI();
    
    // Clean up
    return () => {
      // Remove the global callback when component unmounts
      if (window.initMap) {
        delete window.initMap;
      }
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

// Add TypeScript declaration for the global initMap function
declare global {
  interface Window {
    initMap: () => void;
  }
}

export default MapComponent;