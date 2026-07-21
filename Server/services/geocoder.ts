import { AppError } from "../utils/AppError.js";

/**
 * Address -> coordinates via OpenStreetMap's Nominatim.
 *
 * Chosen because it needs no API key, which keeps a fresh clone of this
 * project runnable without signup. The trade-off is Nominatim's usage policy:
 * max ~1 request/second and a required identifying User-Agent. Results are
 * cached in-process so repeated lookups of the same venue cost nothing.
 *
 * Clients that already know their coordinates (map picker, browser geolocation)
 * should send them directly and skip this path entirely.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Sporture/1.0 (local sports events app)";
const REQUEST_TIMEOUT_MS = 5000;

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/** Subset of Nominatim's response that we rely on. */
interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
}

const cache = new Map<string, GeocodeResult>();
const CACHE_MAX = 500;

let lastRequestAt = 0;
const MIN_REQUEST_GAP_MS = 1100; // Nominatim asks for <= 1 req/sec

const throttle = async (): Promise<void> => {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
};

/**
 * @throws {AppError} 422 if the address cannot be resolved, 503 if the
 *         geocoding provider is unreachable.
 */
export const geocodeAddress = async (address: string): Promise<GeocodeResult> => {
  const key = address.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  await throttle();

  let res: Response;
  try {
    res = await fetch(
      `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`,
      {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
  } catch {
    // Network failure or timeout — the caller's input may be perfectly fine,
    // so this is a 503 rather than a 4xx.
    throw new AppError(
      "Could not reach the geocoding service. Try again, or supply coordinates directly.",
      503
    );
  }

  if (!res.ok) {
    throw new AppError("The geocoding service returned an error.", 503);
  }

  const results = (await res.json()) as NominatimHit[];
  const hit = Array.isArray(results) ? results[0] : undefined;

  if (!hit) {
    throw new AppError(
      `Could not find a location matching "${address}". Try a more specific address.`,
      422
    );
  }

  const resolved: GeocodeResult = {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    displayName: hit.display_name,
  };

  // Naive size cap: drop the oldest entry once full.
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, resolved);

  return resolved;
};

export const _clearCache = (): void => cache.clear();
