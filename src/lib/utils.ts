import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a participant's name for anonymous display.
 * Format: "FirstName L. (**XX)" where L is the last name initial and XX are the last 2 digits of the phone.
 * Example: "María G. (**45)"
 */
export function formatAnonymousName(fullName: string, phone?: string): string {
  const parts = fullName.trim().split(' ');
  const firstName = parts[0];
  const lastNameInitial = parts.length > 1 ? parts[1].charAt(0).toUpperCase() + '.' : '';
  const phoneDigits = phone && phone.length >= 2 
    ? `(**${phone.slice(-2)})` 
    : '';
  
  return `${firstName} ${lastNameInitial} ${phoneDigits}`.trim();
}
