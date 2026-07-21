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
