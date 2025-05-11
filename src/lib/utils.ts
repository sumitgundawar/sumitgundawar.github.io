import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Smoothly scrolls to an element with the specified ID
 * @param elementId The ID of the element to scroll to
 */
export function scrollToElement(elementId: string): void {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Opens the default email client with the specified email address
 * @param email The email address to use
 * @param subject Optional email subject
 * @param body Optional email body
 */
export function openMailto(email: string, subject?: string, body?: string): void {
  let mailtoUrl = `mailto:${email}`;
  
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  
  if (params.length > 0) {
    mailtoUrl += '?' + params.join('&');
  }
  
  window.location.href = mailtoUrl;
}
