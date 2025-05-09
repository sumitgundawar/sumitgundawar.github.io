interface Window {
    dataLayer: Record<string, any>[];
    gtag: {
      (command: 'config', id: string, config?: Record<string, any>): void;
      (command: 'js', date: Date): void;
      (command: 'event', eventName: string, params?: Record<string, any>): void;
    };
  }