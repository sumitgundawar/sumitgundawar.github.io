import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GA_TRACKING_ID, initGA, trackPageView, trackAllClicks } from '../utils/analytics';

const Analytics = () => {
  const location = useLocation();

  useEffect(() => {
    if (!window.dataLayer) {
      initGA();
      trackAllClicks(); // Add this line
      
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
      document.head.appendChild(script);
    }
    
    trackPageView(location.pathname + location.search);
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
};

export default Analytics;