/**
 * IP Geolocation Service
 * Captures geographic location from IP addresses for signup analytics
 * Uses ip-api.com free tier (45 requests/minute, no API key needed)
 */

export interface LocationData {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  ip: string | null;
}

/**
 * Extract IP address from Next.js request headers
 * Checks x-forwarded-for (proxy), x-real-ip, and falls back to connection IP
 */
export function getClientIP(request: Request): string | null {
  const headers = new Headers(request.headers);

  // Check CF-Connecting-IP first (most trustworthy if behind Cloudflare)
  const cfIP = headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP.trim();
  }

  // Check x-forwarded-for (most common for proxied requests)
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP if there are multiple
    return forwarded.split(',')[0].trim();
  }

  // Check x-real-ip (nginx proxy)
  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  return null;
}

/**
 * Check if an IP address is private (RFC 1918, localhost, or IPv6 private)
 * Returns true for IPs that should not be geolocated
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 localhost
  if (ip === '127.0.0.1') return true;

  // IPv6 localhost
  if (ip === '::1') return true;

  // 10.0.0.0/8
  if (ip.startsWith('10.')) return true;

  // 192.168.0.0/16
  if (ip.startsWith('192.168.')) return true;

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1] || '0', 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  // IPv6 Unique Local Addresses (fc00::/7)
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;

  // IPv6 Link-local (fe80::/10)
  if (ip.startsWith('fe80:')) return true;

  return false;
}

/**
 * Fetch geolocation data from IP address
 * Returns null for local/private IPs or on API failure
 */
export async function getLocationFromIP(ip: string | null): Promise<LocationData> {
  // Default response for missing/invalid IPs
  const defaultLocation: LocationData = {
    country: null,
    countryCode: null,
    city: null,
    region: null,
    timezone: null,
    ip: ip,
  };

  if (!ip) {
    return defaultLocation;
  }

  // Skip local/private IPs (RFC 1918 + localhost)
  if (isPrivateIP(ip)) {
    return defaultLocation;
  }

  try {
    // Use ip-api.com free tier (no API key needed)
    // Rate limit: 45 requests/minute
    // HTTPS is supported on free tier
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName,timezone`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // 5 second timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn('[IP-GEO] API request failed:', response.status);
      return defaultLocation;
    }

    const data = await response.json();

    // Check if the API returned success
    if (data.status !== 'success') {
      console.warn('[IP-GEO] API returned non-success status:', data.status);
      return defaultLocation;
    }

    return {
      country: data.country || null,
      countryCode: data.countryCode || null,
      city: data.city || null,
      region: data.regionName || null,
      timezone: data.timezone || null,
      ip: ip,
    };
  } catch (error) {
    // Silently fail on geolocation errors (non-critical feature)
    console.warn('[IP-GEO] Failed to fetch location:', error instanceof Error ? error.message : 'Unknown error');
    return defaultLocation;
  }
}

/**
 * Get country flag emoji from country code
 * Converts ISO 3166-1 alpha-2 code to flag emoji
 */
export function getCountryFlag(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) {
    return '🌍'; // Globe emoji for unknown countries
  }

  // Convert country code to flag emoji
  // Each letter maps to a regional indicator symbol
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Format location for display
 * Returns "City, Country" or "Country" or "Unknown"
 */
export function formatLocation(location: LocationData): string {
  if (!location.country) {
    return 'Unknown';
  }

  if (location.city) {
    return `${location.city}, ${location.country}`;
  }

  return location.country;
}

/**
 * Get location data from Next.js request
 * Convenience function that combines IP extraction and geolocation lookup
 */
export async function getLocationFromRequest(request: Request): Promise<LocationData> {
  const ip = getClientIP(request);
  return getLocationFromIP(ip);
}
