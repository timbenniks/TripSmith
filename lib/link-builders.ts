/**
 * Link Builders Utility (F2-BE-1)
 * Deterministic, side-effect free URL constructors for external deep links.
 * Start with Google Flights; future: maps, hotel searches, transit planners.
 *
 * NOTE: Keep functions pure & easily unit-testable. Do not fetch or mutate.
 */

interface FlightLinkParams {
  origin: string;      // IATA code (e.g., AMS)
  destination: string; // IATA code (e.g., NRT)
  departDate: string;  // ISO date yyyy-mm-dd
  returnDate?: string; // ISO date yyyy-mm-dd
  adults?: number;     // default 1
  cabin?: 'ECONOMY' | 'BUSINESS' | 'FIRST' | 'PREMIUM_ECONOMY';
}

function sanitizeIata(code: string): string {
  return (code || '').toUpperCase().trim().slice(0, 3).replace(/[^A-Z]/g, '');
}

function normalizeDate(date: string): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  // Google Flights expects YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

/**
 * Builds a Google Flights deep link. Pattern (observed public format):
 * https://www.google.com/travel/flights?q=Flights%20from%20AMS%20to%20NRT%20on%202025-03-15
 * For multi-parameter deterministic path usage we keep simple query form for stability.
 */
export function buildGoogleFlightsUrl(params: FlightLinkParams): string {
  const origin = sanitizeIata(params.origin);
  const dest = sanitizeIata(params.destination);
  const depart = normalizeDate(params.departDate);
  const ret = params.returnDate ? normalizeDate(params.returnDate) : null;
  const adults = params.adults && params.adults > 0 ? params.adults : 1;
  const cabin = params.cabin || 'ECONOMY';

  if (!origin || !dest || !depart) {
    return 'https://www.google.com/travel/flights';
  }

  // Assemble a human-search style query (more resilient to format drift than path-based tokens)
  const parts = [`Flights from ${origin} to ${dest} on ${depart}`];
  if (ret) parts.push(`return ${ret}`);
  if (adults !== 1) parts.push(`${adults} adults`);
  if (cabin !== 'ECONOMY') parts.push(cabin.replace('_', ' ').toLowerCase());
  const query = encodeURIComponent(parts.join(' '));
  return `https://www.google.com/travel/flights?q=${query}`;
}

// ---------------- Maps Link (F2-BE-2) ----------------
interface MapsSearchParams {
  query?: string;          // Free-text location or place name
  latitude?: number;       // Optional precise coordinates
  longitude?: number;      // Optional precise coordinates
  zoom?: number;           // 1-20 typical; default 14 when lat/long provided
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

export function buildGoogleMapsSearchUrl(params: MapsSearchParams): string {
  const base = 'https://www.google.com/maps';
  const { query, latitude, longitude } = params;

  // Coordinate-centric URL if both lat & long present
  if (isFiniteNumber(latitude) && isFiniteNumber(longitude)) {
    const zoom = params.zoom && params.zoom >= 3 && params.zoom <= 20 ? params.zoom : 14;
    return `${base}/@${latitude},${longitude},${zoom}z`; // dynamic viewport
  }

  // Fallback to text search; ensure something to search
  const q = (query || '').trim();
  if (!q) return base;
  return `${base}/search/${encodeURIComponent(q)}`;
}

// Placeholder for future expansion (hotel & transit links)
// export function buildHotelSearchUrl(city: string, checkIn: string, checkOut: string) { ... }

// Simple self-contained smoke test (can be removed when Vitest harness lands)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (process.env.NODE_ENV === 'test_flights_smoke') {
  console.log(buildGoogleFlightsUrl({ origin: 'AMS', destination: 'NRT', departDate: '2025-03-15' }));
}

export type { FlightLinkParams, MapsSearchParams };
