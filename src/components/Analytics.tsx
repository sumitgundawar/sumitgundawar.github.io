import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GA_TRACKING_ID = 'G-G6WTGY3N8N';

const Analytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Initialize data layer
    window.dataLayer = window.dataLayer || [];
    
    // Properly typed gtag initialization
    window.gtag = window.gtag || function() { 
      window.dataLayer.push(arguments);
    };

    // Configuration
    window.gtag('js', new Date());
    window.gtag('config', GA_TRACKING_ID, {
      page_path: location.pathname,
      send_page_view: true
    });

  }, [location]);

  return null;
};

export default Analytics;