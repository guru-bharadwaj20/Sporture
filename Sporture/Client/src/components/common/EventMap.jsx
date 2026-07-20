import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { eventIcon, userIcon } from "../utils/mapIcons";
import { formatDistance } from "../utils/useGeolocation";
import "./EventMap.css";

const DEFAULT_CENTRE = [12.9716, 77.5946]; // Bengaluru
const DEFAULT_ZOOM = 12;

// Movement is deliberately not animated. An in-flight pan/zoom that outlives
// its container — navigating away from the map, or switching back to the list
// view — throws "Cannot read properties of undefined (reading '_leaflet_pos')"
// when the animation frame lands on a detached element.
const FIT_OPTIONS = { animate: false };

/**
 * Keeps the viewport in step with the data. Without this the map holds its
 * initial view when the radius changes or new results arrive, which reads as
 * the filter having done nothing.
 */
const FitToContent = ({ events, centre, radius }) => {
  const map = useMap();

  useEffect(() => {
    const points = events
      .map((e) => e.location?.geo?.coordinates)
      .filter(Boolean)
      .map(([lng, lat]) => [lat, lng]); // Leaflet wants [lat, lng]

    if (centre && radius) {
      // Frame the search area itself so the radius circle is fully visible,
      // even when no events fall inside it.
      //
      // Built from the LatLng rather than L.circle(...).getBounds(): a circle
      // that has not been added to a map has no internal _map reference, and
      // getBounds() throws when it tries to project. toBounds() takes the box
      // size, hence radius * 2.
      map.fitBounds(L.latLng(centre.lat, centre.lng).toBounds(radius * 2), {
        ...FIT_OPTIONS,
        padding: [40, 40],
      });
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 14, FIT_OPTIONS);
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

/** Recalculates size when the container appears, e.g. on a tab switch. */
const InvalidateOnMount = () => {
  const map = useMap();
  useEffect(() => {
    // Leaflet measures its container on init; if the map was hidden at that
    // point it computes zero height and renders as grey tiles.
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [map]);
  return null;
};

const EventMap = ({ events = [], centre = null, radius = null, height = 520 }) => {
  const positioned = useMemo(
    () => events.filter((e) => e.location?.geo?.coordinates?.length === 2),
    [events]
  );

  const initialCentre = centre
    ? [centre.lat, centre.lng]
    : positioned.length
      ? [
          positioned[0].location.geo.coordinates[1],
          positioned[0].location.geo.coordinates[0],
        ]
      : DEFAULT_CENTRE;

  return (
    <div className="event-map" style={{ height }}>
      <MapContainer
        center={initialCentre}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="event-map__canvas"
      >
        {/* OpenStreetMap's tile usage policy requires visible attribution. */}
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
