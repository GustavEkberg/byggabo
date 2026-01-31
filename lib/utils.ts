import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Format a number as SEK currency with 'kr' suffix.
 * Uses Swedish locale for proper thousand separators.
 */
export function formatSEK(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return '0 kr';

  return (
    new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num) + ' kr'
  );
}
