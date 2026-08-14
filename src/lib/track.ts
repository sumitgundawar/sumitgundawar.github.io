/** Thin wrapper over GA4 events.
 *
 *  Everything worth knowing about what people use goes through here, so there
 *  is one place to check what is tracked and one place to change it. Silent
 *  no-op when analytics has not loaded, so callers never need to guard. */
export function track(event: string, params: Record<string, string | number | boolean> = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}
