import L from "leaflet";

/**
 * Markers are built with divIcon (HTML) rather than Leaflet's default image
 * icons. Leaflet resolves its default marker PNGs relative to the CSS file,
 * which breaks under Vite's asset hashing and silently yields invisible
 * markers. HTML icons sidestep that entirely and are easier to style.
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

export const eventIcon = (sport, { highlighted = false } = {}) =>
  L.divIcon({
    className: "", // suppress Leaflet's default styling hooks
    html: `<div class="map-pin${highlighted ? " map-pin--active" : ""}">
             <span class="map-pin__glyph">${emojiForSport(sport)}</span>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40], // tip of the pin sits on the coordinate
    popupAnchor: [0, -38],
  });

export const userIcon = () =>
  L.divIcon({
    className: "",
    html: `<div class="map-you"><span class="map-you__pulse"></span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11], // centred, since this marks a point not a place
  });
