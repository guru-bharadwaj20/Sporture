import L from "leaflet";
import { emojiForSport } from "./sports";

export const eventIcon = (
  sport: string | undefined,
  { highlighted = false }: { highlighted?: boolean } = {}
): L.DivIcon =>
  L.divIcon({
    className: "",
    html: `<div class="map-pin${highlighted ? " map-pin--active" : ""}">
             <span class="map-pin__glyph">${emojiForSport(sport)}</span>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -38],
  });

export const userIcon = (): L.DivIcon =>
  L.divIcon({
    className: "",
    html: `<div class="map-you"><span class="map-you__pulse"></span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
