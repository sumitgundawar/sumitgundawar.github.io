declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_ID = 'G-G6WTGY3N8N';

export const pageview = (url: string): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_ID, { page_path: url });
  }
};

const fire = (action: string, category: string, label: string, value?: number): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value,
    });
  }
};

// Engagement
export const trackButtonClick = (buttonName: string): void => {
  fire('click', 'engagement', buttonName);
};

export const trackButtonHover = (buttonName: string): void => {
  fire('hover', 'engagement', buttonName);
};

// Navigation
export const trackNavClick = (label: string): void => {
  fire('nav_click', 'navigation', label);
};

export const trackThemeToggle = (nextTheme: string): void => {
  fire('theme_toggle', 'preferences', nextTheme);
};

// Projects
export const trackProjectOpen = (slug: string): void => {
  fire('project_open', 'projects', slug);
};

export const trackProjectFocus = (category: string): void => {
  fire('project_focus', 'projects', category);
};

export const trackProjectFilter = (category: string): void => {
  fire('project_filter', 'projects', category);
};

export const trackProjectSearch = (queryLength: number, resultsCount: number): void => {
  fire('project_search', 'projects', 'search', queryLength);
  fire('project_search_results', 'projects', 'results_count', resultsCount);
};

export const trackProjectNavigation = (from: string, to: string): void => {
  fire('project_navigation', 'projects', `${from}_to_${to}`);
};

// Outbound
export const trackOutboundLink = (href: string, label?: string): void => {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'click', {
    event_category: 'outbound',
    event_label: label ?? href,
    transport_type: 'beacon',
  });
};

// Scroll and section tracking
export const trackScrollDepth = (depth: number): void => {
  fire('scroll_depth', 'engagement', `${depth}%`, depth);
};

export const trackSectionView = (sectionId: string): void => {
  fire('section_view', 'engagement', sectionId);
};

export const trackTimeOnPage = (seconds: number): void => {
  fire('time_on_page', 'engagement', 'seconds', seconds);
};

export const trackLoadTime = (ms: number): void => {
  fire('page_load_time', 'performance', 'ms', ms);
};

export const trackChartInteraction = (chartName: string): void => {
  fire('chart_interaction', 'engagement', chartName);
};

export const trackCVDownload = (): void => {
  fire('cv_download', 'conversion', 'cv_pdf');
};
