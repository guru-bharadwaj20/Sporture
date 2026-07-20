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

const cache = new Map();
const CACHE_MAX = 500;

let lastRequestAt = 0;
const MIN_REQUEST_GAP_MS = 1100; // Nominatim asks for <= 1 req/sec

const throttle = async () => {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
};

/**
 * @returns {Promise<{lat: number, lng: number, displayName: string}>}
 * @throws {AppError} 422 if the address cannot be resolved, 503 if the
 *         geocoding provider is unreachable.
 */
export const geocodeAddress = async (address) => {
  const key = address.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);

  await throttle();

  let res;
  try {
    res = await fetch(
      `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`,
      {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
  } catch (err) {
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

  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new AppError(
      `Could not find a location matching "${address}". Try a more specific address.`,
      422
    );
  }

  const { lat, lon, display_name: displayName } = results[0];
  const resolved = { lat: Number(lat), lng: Number(lon), displayName };

  // Naive size cap: drop the oldest entry once full.
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, resolved);

  return resolved;
};

export const _clearCache = () => cache.clear();
