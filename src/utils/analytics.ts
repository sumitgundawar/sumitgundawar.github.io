export const GA_TRACKING_ID = 'G-G6WTGY3N8N';

// Initialize Google Analytics
export const initGA = () => {
  window.dataLayer = window.dataLayer || [];
  
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    send_page_view: false
  });
};

// Track page views
export const trackPageView = (path: string) => {
  window.gtag('event', 'page_view', {
    page_path: path,
    send_to: GA_TRACKING_ID
  });
};

// Track custom events
export const trackEvent = (
  action: string,
  params?: GtagEvent
) => {
  window.gtag('event', action, params);
};