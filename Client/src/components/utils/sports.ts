/**
 * Sport display helpers. Kept separate from mapIcons.ts so components that
 * only need a glyph don't pull Leaflet into their bundle.
 */

/**
 * A Map rather than an object literal.
 *
 * Sport is free text on the server, so this can be looked up with any string —
 * including "constructor" or "toString", which a plain object inherits from
 * Object.prototype. `SPORT_EMOJI["constructor"]` would return a *function*,
 * sail past the `??` fallback, and hand React something it cannot render.
 * Map has no prototype chain to walk.
 */
const SPORT_EMOJI = new Map<string, string>([
  ["football", "⚽"],
  ["cricket", "🏏"],
  ["tennis", "🎾"],
  ["badminton", "🏸"],
  ["basketball", "🏀"],
  ["volleyball", "🏐"],
  ["hockey", "🏑"],
  ["swimming", "🏊"],
  ["running", "🏃"],
  ["cycling", "🚴"],
]);

export const emojiForSport = (sport = ""): string =>
  SPORT_EMOJI.get(sport.trim().toLowerCase()) ?? "🏅";
