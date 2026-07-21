import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coords, EventDTO } from "@shared/api";
import { eventIcon, userIcon } from "../utils/mapIcons";
import { formatDistance } from "../utils/useGeolocation";
import "./EventMap.css";

const DEFAULT_CENTRE: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 12;

const FIT_OPTIONS = { animate: false } as const;

interface EventMapProps {
  events?: EventDTO[];
  centre?: Coords | null;
  radius?: number | null;
  height?: number;
}

interface FitProps {
  events: EventDTO[];
  centre?: Coords | null;
  radius?: number | null;
}

const FitToContent = ({ events, centre, radius }: FitProps) => {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = events
      .map((e) => e.location?.geo?.coordinates)
      .filter((c): c is [number, number] => Array.isArray(c) && c.length === 2)
      .map(([lng, lat]) => [lat, lng]);

    if (centre && radius) {
      map.fitBounds(L.latLng(centre.lat, centre.lng).toBounds(radius * 2), {
        ...FIT_OPTIONS,
        padding: [40, 40],
      });
      return;
    }

    if (points.length === 1) {
      map.setView(points[0]!, 14, FIT_OPTIONS);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), {
        ...FIT_OPTIONS,
        padding: [50, 50],
        maxZoom: 15,
      });
    }
  }, [map, events, centre, radius]);

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

const EventMap = ({
  events = [],
  centre = null,
  radius = null,
  height = 520,
}: EventMapProps) => {
  const positioned = useMemo(
    () => events.filter((e) => e.location?.geo?.coordinates?.length === 2),
    [events]
  );

  const first = positioned[0];
  const initialCentre: [number, number] = centre
    ? [centre.lat, centre.lng]
    : first
      ? [first.location.geo.coordinates[1], first.location.geo.coordinates[0]]
      : DEFAULT_CENTRE;

  return (
    <div className="event-map" style={{ height }}>
      <MapContainer
        center={initialCentre}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="event-map__canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <InvalidateOnMount />
        <FitToContent events={positioned} centre={centre} radius={radius} />

        {centre && radius && (
          <Circle
            center={[centre.lat, centre.lng]}
            radius={radius}
            pathOptions={{
              color: "#667eea",
              fillColor: "#667eea",
              fillOpacity: 0.08,
              weight: 2,
            }}
          />
        )}

        {centre && (
          <Marker position={[centre.lat, centre.lng]} icon={userIcon()}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {positioned.map((event) => {
          const [lng, lat] = event.location.geo.coordinates;
          const spots = event.currentPlayers?.length ?? 0;
          const full = spots >= event.maxPlayers;

          return (
            <Marker key={event._id} position={[lat, lng]} icon={eventIcon(event.sport)}>
              <Popup>
                <div className="map-popup">
                  <h4 className="map-popup__title">{event.title}</h4>
                  <p className="map-popup__meta">
                    <strong>{event.sport}</strong>
                    {event.distanceMetres !== undefined && (
                      <> · {formatDistance(event.distanceMetres)}</>
                    )}
                  </p>
                  <p className="map-popup__meta">{event.location.address}</p>
                  <p className="map-popup__meta">
                    {new Date(event.date).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className={`map-popup__spots${full ? " is-full" : ""}`}>
                    {full ? "Event full" : `${spots} / ${event.maxPlayers} players`}
                  </p>
                  <Link to={`/events/${event._id}`} className="map-popup__link">
                    View details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {positioned.length === 0 && (
        <p className="event-map__empty">No events with a location to show here yet.</p>
      )}
    </div>
  );
};

export default EventMap;
