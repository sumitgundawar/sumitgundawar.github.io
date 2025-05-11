// Google Analytics utility functions

// Define types for gtag
interface GTagEvent {
  action: string;
  category: string;
  label: string;
  value?: number;
}

// Declare gtag as a global function
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize GA - this is already done in the HTML, but this is here for reference
export const initGA = (id: string): void => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }
};

// Track page views
export const pageview = (url: string): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-G6WTGY3N8N', {
      page_path: url,
    });
  }
};

// Track events
export const event = ({ action, category, label, value }: GTagEvent): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};