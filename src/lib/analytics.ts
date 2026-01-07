// Google Analytics utility functions

// Define types for gtag
interface GTagEvent {
  action: string;
  category: string;
  label: string;
  value?: number;
  params?: Record<string, unknown>;
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

// Track button clicks
export const trackButtonClick = (buttonName: string): void => {
  event({
    action: 'click',
    category: 'engagement',
    label: buttonName,
  });
};

export const trackNavClick = (label: string): void => {
  event({ action: "nav_click", category: "navigation", label });
};

export const trackThemeToggle = (nextTheme: string): void => {
  event({ action: "theme_toggle", category: "preferences", label: nextTheme });
};

export const trackProjectOpen = (slug: string): void => {
  event({ action: "project_open", category: "projects", label: slug });
};

export const trackProjectFocus = (category: string): void => {
  event({ action: "project_focus", category: "projects", label: category });
};

export const trackProjectFilter = (category: string): void => {
  event({ action: "project_filter", category: "projects", label: category });
};

export const trackProjectSearch = (queryLength: number, resultsCount: number): void => {
  event({ action: "project_search", category: "projects", label: "search", value: queryLength });
  event({ action: "project_search_results", category: "projects", label: "results_count", value: resultsCount });
};

export const trackOutboundLink = (href: string, label?: string): void => {
  if (typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", "click", {
    event_category: "outbound",
    event_label: label ?? href,
    transport_type: "beacon",
  });
};
