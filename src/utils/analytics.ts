export const GA_TRACKING_ID = 'G-G6WTGY3N8N';

// Initialize Google Analytics
export const initGA = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_TRACKING_ID);
  };

// Track page views
export const trackPageView = (url: string) => {
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

// Track custom events
export const trackEvent = ({ action, category, label }: {
  action: string;
  category: string;
  label?: string;
}) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
  });
};

export const trackAllClicks = () => {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      // Add proper type casting here
      const button = target.closest<HTMLElement>('button, a[role="button"], .clickable');
  
      if (button) {
        // Now TypeScript knows this is an HTMLElement
        const action = button.dataset.analyticsAction || 'click';
        const category = button.dataset.analyticsCategory || `Page: ${window.location.pathname}`;
        const label = button.dataset.analyticsLabel || `Element: ${button.textContent?.trim() || 'Unlabeled Button'}`;
  
        trackEvent({ action, category, label });
      }
    });
  };