import { headers } from 'next/headers';
import { geolocation } from '@vercel/functions';

/**
 * Get country code from Vercel geolocation headers.
 * Returns undefined in development or if geolocation is unavailable.
 */
export async function getCountryCode(): Promise<string | undefined> {
  const headersList = await headers();
  const geo = geolocation({ headers: headersList });
  return geo.country;
}
