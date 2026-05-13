// lib/montree/referral/payout-country-support.ts
//
// Which countries Stripe Connect Express supports for receiving payouts.
// Used to:
//   1. Validate the country passed to createConnectAccount()
//   2. Suggest payout_method='manual_wire' when Tredoux is issuing a code
//      to an agent in an unsupported country
//
// Source: Stripe's Connect cross-border supported-countries list.
// Last updated: Session 109 (May 2026). Stripe periodically expands this —
// when an agent reports they're in a country we say is unsupported but Stripe
// actually supports it now, just add the ISO code below and ship.
//
// Format: ISO 3166-1 alpha-2 country codes.

/**
 * Countries Stripe Connect Express supports for receiving USD transfers
 * to a local bank account. This is conservative — only include countries
 * we've verified Stripe accepts via accounts.create({ country: <code> }).
 */
export const STRIPE_CONNECT_SUPPORTED_COUNTRIES: readonly string[] = [
  // North America
  'US', 'CA', 'MX',
  // UK + Europe (EEA)
  'GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT',
  'SE', 'NO', 'DK', 'FI', 'CH', 'LU', 'PL', 'CZ', 'GR', 'HU',
  'RO', 'BG', 'HR', 'EE', 'LV', 'LT', 'SK', 'SI', 'CY', 'MT',
  // Asia-Pacific
  'AU', 'NZ', 'JP', 'SG', 'HK', 'TH', 'MY', 'IN', 'KR',
  // Middle East
  'AE', 'BH',
  // Latin America
  'BR',
  // Africa — confirmed NOT supported by Stripe Connect Express (verified via
  // Stripe API error May 2026 — "ZA is not currently supported by Stripe").
  // Stripe has been rolling out African coverage but Connect Express specifically
  // remains unsupported. When Stripe adds it, just add 'ZA' back to this list.
  // For now: ZA agents use payout_method='manual_wire'.
];

const SUPPORTED_SET = new Set(STRIPE_CONNECT_SUPPORTED_COUNTRIES);

/**
 * Returns true if the given ISO country code is one we expect Stripe Connect
 * Express to accept. Case-insensitive on input.
 */
export function isStripeConnectSupported(country: string | null | undefined): boolean {
  if (!country) return false;
  return SUPPORTED_SET.has(country.toUpperCase());
}

/**
 * Recommended payout method for a given country. Used by ReferralsTab as the
 * default selection when issuing a new agent code.
 *
 * Supported country → 'stripe_connect' (automated, low friction)
 * Unsupported / unknown → 'manual_wire' (super-admin wires monthly)
 */
export function recommendedPayoutMethod(country: string | null | undefined): 'stripe_connect' | 'manual_wire' {
  return isStripeConnectSupported(country) ? 'stripe_connect' : 'manual_wire';
}

/**
 * Display label for a country code. Used in UI to show "ZA" as "South Africa"
 * etc. This is a stripped subset — for unknown codes the raw code is returned.
 */
export const COUNTRY_DISPLAY_NAMES: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
  GB: 'United Kingdom',
  IE: 'Ireland',
  FR: 'France',
  DE: 'Germany',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  BE: 'Belgium',
  AT: 'Austria',
  PT: 'Portugal',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  CH: 'Switzerland',
  LU: 'Luxembourg',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  SG: 'Singapore',
  HK: 'Hong Kong',
  TH: 'Thailand',
  MY: 'Malaysia',
  IN: 'India',
  KR: 'South Korea',
  AE: 'United Arab Emirates',
  BH: 'Bahrain',
  BR: 'Brazil',
  ZA: 'South Africa',
  // Notable unsupported — listed so UI can show full name and explain
  CN: 'China (mainland)',
  PS: 'Palestine',
  LB: 'Lebanon',
  SY: 'Syria',
  IQ: 'Iraq',
  EG: 'Egypt',
  IR: 'Iran',
  RU: 'Russia',
};

export function countryDisplayName(code: string | null | undefined): string {
  if (!code) return '—';
  const upper = code.toUpperCase();
  return COUNTRY_DISPLAY_NAMES[upper] || upper;
}
