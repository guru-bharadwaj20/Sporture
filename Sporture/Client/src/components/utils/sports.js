/**
 * Sport display helpers. Kept separate from mapIcons.js so components that
 * only need a glyph don't pull Leaflet into their bundle.
 */

const SPORT_EMOJI = {
  football: "⚽",
  cricket: "🏏",
  tennis: "🎾",
  badminton: "🏸",
  basketball: "🏀",
  volleyball: "🏐",
  hockey: "🏑",
  swimming: "🏊",
  running: "🏃",
  cycling: "🚴",
};

export const emojiForSport = (sport = "") =>
  SPORT_EMOJI[sport.trim().toLowerCase()] || "🏅";
