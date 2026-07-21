import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Coords } from "@shared/api";
import { eventIcon } from "../utils/mapIcons";
import "./VenuePicker.css";

const DEFAULT_CENTRE: [number, number] = [12.9716, 77.5946];

type PickHandler = (coords: Coords) => void;

const ClickToPlace = ({ onPick }: { onPick: PickHandler }) => {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
};

const Recentre = ({ position }: { position: Coords | null }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], Math.max(map.getZoom(), 14));
  }, [map, position]);
  return null;
};

const InvalidateOnMount = () => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [map]);
  return null;
};

interface VenuePickerProps {
  position: Coords | null;
  sport?: string;
  onPick: PickHandler;
  height?: number;
}

const VenuePicker = ({ position, sport, onPick, height = 300 }: VenuePickerProps) => (
  <div className="venue-picker" style={{ height }}>
    <MapContainer
      center={position ? [position.lat, position.lng] : DEFAULT_CENTRE}
      zoom={position ? 15 : 12}
      scrollWheelZoom
      className="venue-picker__canvas"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <InvalidateOnMount />
      <ClickToPlace onPick={onPick} />
      <Recentre position={position} />

      {position && (
        <Marker
          position={[position.lat, position.lng]}
          icon={eventIcon(sport, { highlighted: true })}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              onPick({ lat, lng });
            },
          }}
        />
      )}
    </MapContainer>

    <p className="venue-picker__hint">
      {position
        ? "Drag the pin to fine-tune, or click elsewhere to move it."
        : "Click the map to drop a pin on the exact venue."}
    </p>
  </div>
);

export default VenuePicker;
