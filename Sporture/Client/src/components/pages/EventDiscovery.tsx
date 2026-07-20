// src/components/pages/EventDiscovery.jsx
import { useState, useEffect } from "react";
import type { EventDTO, EventSearchParams } from "@shared/api";
import { Link, useNavigate } from "react-router-dom";
import { getEvents, joinEvent } from "../utils/api";
import { clearSession, getStoredUser, getToken } from "../utils/storage";
import { apiErrorMessage, isUnauthorised } from "../utils/errors";
import { useToast } from "../common/toastContext";
import { useGeolocation, formatDistance } from "../utils/useGeolocation";
import EventMap from "../common/EventMap";
import "./EventDiscovery.css";

const RADIUS_OPTIONS = [
  { label: "2 km", value: 2000 },
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10000 },
  { label: "25 km", value: 25000 },
  { label: "50 km", value: 50000 },
];

const EventDiscovery = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportsList, setSportsList] = useState<string[]>([]);
  const [sportFilter, setSportFilter] = useState("All");
  const [radius, setRadius] = useState(10000);
  const [view, setView] = useState<"list" | "map">("list");
  const [joining, setJoining] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { coords, status: geoStatus, error: geoError, request: requestLocation, clear: clearLocation } =
    useGeolocation();

  // ✅ Check authentication on mount
  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();

    if (token && user && user._id) {
      setIsAuthenticated(true);
      setUserId(user._id);
    } else {
      setIsAuthenticated(false);
      setUserId(null);
    }
  }, []);

  useEffect(() => {
    const loadSports = async () => {
      try {
        const res = await getEvents();
        const evts = res.data || [];
        const sports = Array.from(
          new Set(evts.map((e) => e.sport).filter(Boolean))
        );
        setSportsList(sports);
      } catch (err) {
        console.error("Error loading sports list:", err);
      }
    };
    loadSports();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params: EventSearchParams = {};
        if (sportFilter !== "All") params.sport = sportFilter;
        // Sending coordinates switches the API to proximity search: results
        // come back nearest-first with a distanceMetres field.
        if (coords) {
          params.lat = coords.lat;
          params.lng = coords.lng;
          params.radius = radius;
        }

        const res = await getEvents(params);
        setEvents(res.data || []);
      } catch (err) {
        console.error("Error fetching events:", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [sportFilter, coords, radius]);

  const handleJoin = async (eventId: string) => {
    // Checked before the request so an unauthenticated click is a prompt to
    // log in rather than a 401 round-trip.
    const token = getToken();

    if (!token || !isAuthenticated) {
      toast.info("Please log in to join events.");
      navigate("/login");
      return;
    }

    setJoining((prev) => ({ ...prev, [eventId]: true }));
    try {
      const res = await joinEvent(eventId);
      toast.success(res.data.message);
      setEvents((prev) =>
        prev.map((e) => (e._id === eventId ? res.data.event : e))
      );
    } catch (err) {
      // If unauthorized, clear storage and redirect
      if (isUnauthorised(err)) {
        clearSession();
        toast.error("Your session expired. Please log in again.");
        navigate("/login");
        return;
      }
      
      const msg = apiErrorMessage(err, "Failed to join event.");
      toast.error(msg);
    } finally {
      setJoining((prev) => ({ ...prev, [eventId]: false }));
    }
  };


  if (loading) {
    return (
      <div className="event-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading Events...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="event-page">
      <div className="page-header">
        <h1 className="page-title">🏅 Discover Sports Events</h1>
        <p className="page-subtitle">Find and join exciting sports events in your area</p>
      </div>

      <div className="filter-section">
        <div className="filter-bar view-toggle">
          <button
            type="button"
            className={`view-toggle-btn${view === "list" ? " is-active" : ""}`}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            ☰ List
          </button>
          <button
            type="button"
            className={`view-toggle-btn${view === "map" ? " is-active" : ""}`}
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
          >
            🗺️ Map
          </button>
        </div>

        <div className="filter-bar">
          <label>Filter by sport:</label>
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
          >
            <option value="All">All Sports</option>
            {sportsList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-bar">
          {!coords ? (
            <button
              type="button"
              className="locate-btn"
              onClick={requestLocation}
              disabled={geoStatus === "locating"}
            >
              {geoStatus === "locating" ? "📍 Finding you..." : "📍 Find events near me"}
            </button>
          ) : (
            <>
              <label htmlFor="radius">Within:</label>
              <select
                id="radius"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                {RADIUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button type="button" className="clear-location-btn" onClick={clearLocation}>
                Clear location
              </button>
            </>
          )}
        </div>
      </div>

      {geoError && <p className="geo-error">{geoError}</p>}

      <div className="event-count">
        <p>
          Showing <strong>{events.length}</strong> event{events.length !== 1 ? 's' : ''}{" "}
          {sportFilter !== "All" && <>for "{sportFilter}"</>}
          {coords && (
            <> within {RADIUS_OPTIONS.find((o) => o.value === radius)?.label} of you</>
          )}
        </p>
      </div>

      {view === "map" ? (
        <EventMap events={events} centre={coords} radius={coords ? radius : null} />
      ) : events.length === 0 ? (
        <div className="no-events">
          <span className="no-events-icon">🔍</span>
          <h3>No events found{sportFilter !== "All" ? ` for "${sportFilter}"` : ""}</h3>
          {coords ? (
            <p>Nothing within {RADIUS_OPTIONS.find((o) => o.value === radius)?.label} of you — try widening the radius.</p>
          ) : (
            <p>Be the first to create an exciting sports event!</p>
          )}
          <Link to="/create-event" className="create-link">
            ➕ Create Event Now
          </Link>
        </div>
      ) : (
        <div className="event-grid">
          {events.map((event) => {
            const spotsFilled = event.currentPlayers?.length || 0;
            const isFull = spotsFilled >= event.maxPlayers;
            const hasJoined = userId ? event.currentPlayers.some(player => player._id === userId) : false;
            const progressPercentage = (spotsFilled / event.maxPlayers) * 100;

            return (
              <div key={event._id} className="event-card">
                <div className="event-card-header">
                  <h3>{event.title}</h3>
                  <span className="sport-badge">{event.sport}</span>
                </div>

                <div className="event-info">
                  <p>
                    <span className="event-icon">📅</span>
                    <strong>Date:</strong>
                    {event.date
                      ? new Date(event.date).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "TBD"}
                  </p>
                  <p>
                    <span className="event-icon">📍</span>
                    <strong>Location:</strong> {event.location?.address}
                    {event.distanceMetres !== undefined && (
                      <span className="distance-badge">{formatDistance(event.distanceMetres)}</span>
                    )}
                  </p>
                  <p>
                    <span className="event-icon">👤</span>
                    <strong>Host:</strong> {event.createdBy?.name}
                  </p>
                </div>

                <div className="progress-section">
                  <div className="progress-label">
                    <span>Players</span>
                    <span className="spots-filled">{spotsFilled} / {event.maxPlayers}</span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="event-card-footer">
                  <Link to={`/events/${event._id}`} className="details-link">
                    View Details
                  </Link>
                  <button
                    onClick={() => handleJoin(event._id)}
                    disabled={joining[event._id] || isFull || hasJoined}
                    className="join-btn"
                  >
                    {!isAuthenticated 
                      ? "Login to Join" 
                      : isFull 
                        ? "Event Full" 
                        : hasJoined 
                          ? "Already Joined" 
                          : joining[event._id] 
                            ? "Joining..." 
                            : "Join Event"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventDiscovery;