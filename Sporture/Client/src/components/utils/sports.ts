/**
 * Sport display helpers. Kept separate from mapIcons.ts so components that
 * only need a glyph don't pull Leaflet into their bundle.
 */

const SPORT_EMOJI: Record<string, string> = {
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

export const emojiForSport = (sport = ""): string =>
  SPORT_EMOJI[sport.trim().toLowerCase()] ?? "🏅";
