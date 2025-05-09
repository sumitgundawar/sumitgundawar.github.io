interface Window {
  dataLayer: Record<string, any>[];
  gtag: Gtag.Gtag;
}

declare namespace Gtag {
  interface Gtag {
    (command: 'config', targetId: string, config?: Record<string, any>): void;
    (command: 'event', action: string, params?: Record<string, any>): void;
    (command: 'js', date: Date): void;
    (command: 'set', params: Record<string, any>): void;
  }
}