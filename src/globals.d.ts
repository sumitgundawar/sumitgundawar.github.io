
Copy
interface Window {
  dataLayer: any[];
  gtag: Gtag.Gtag;
}

type GtagEvent = {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: any;
};

declare const gtag: Gtag.Gtag;