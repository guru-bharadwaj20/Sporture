import { useState, useEffect } from "react";
import { apiErrorMessage } from "../utils/errors";
import type { EventDTO } from "@shared/api";
import { useParams, useNavigate } from "react-router-dom";
import { getEventById } from "../utils/api";
import EventMap from "../common/EventMap";
import "./EventDetails.css";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.classList.add("event-details-active");

    return () => {
      document.body.classList.remove("event-details-active");
    };
  }, []);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await getEventById(id!);
        setEvent(res.data);
      } catch (err) {
        console.error("Error fetching event:", apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="event-details-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-details-page">
        <div className="error-state">
          <p>❌ Event not found</p>
          <button onClick={() => navigate("/events")} className="back-button">
            ← Back to Events
          </button>
        </div>
      </div>
    );
  }

  const {
    title,
    sport,
    date,
    location,
    createdBy,
    currentPlayers = [],
    maxPlayers = 0,
  } = event;

  const spotsFilled = currentPlayers.length;
  const isFull = spotsFilled >= maxPlayers;
  const progressPercentage = (spotsFilled / maxPlayers) * 100;

  const getSportIcon = (sport: string) => {
    const icons: Record<string, string> = {
      'Football': '⚽',
      'Basketball': '🏀',
      'Tennis': '🎾',
      'Cricket': '🏏',
      'Badminton': '🏸',
      'Volleyball': '🏐',
    };
    return icons[sport] || '🏅';
  };

  const getHostInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  };

  return (
    <div className="event-details-page">
      <button onClick={() => navigate("/events")} className="back-button">
        ← Back to Events
      </button>

      <div className="event-details-container">
        <div className="event-hero">
          <span className="event-icon-large">{getSportIcon(sport)}</span>
          <h1 className="event-title-main">{title}</h1>
          <span className="event-sport-badge">{sport}</span>
        </div>

        <div className="event-info-grid">
          <div className="event-main-info">
            <div className="info-section">
              <h2 className="section-title">
                <span className="section-icon">ℹ️</span>
                Event Details
              </h2>

              <div className="info-row">
                <span className="info-icon">📅</span>
                <div className="info-content">
                  <div className="info-label">Date & Time</div>
                  <div className="info-value">
                    {date ? new Date(date).toLocaleString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    }) : "TBD"}
                  </div>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon">📍</span>
                <div className="info-content">
                  <div className="info-label">Location</div>
                  <div className="info-value">
                    {typeof location === "object" ? location.address : location || "Location unavailable"}
                  </div>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon">🏆</span>
                <div className="info-content">
                  <div className="info-label">Sport Type</div>
                  <div className="info-value">{sport}</div>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h2 className="section-title">
                <span className="section-icon">👥</span>
                Players
              </h2>

              <div className="players-capacity">
                <span className="capacity-text">
                  {spotsFilled} / {maxPlayers} Players
                </span>
                <span className={`capacity-badge ${isFull ? 'full' : ''}`}>
                  {isFull ? 'Event Full' : `${maxPlayers - spotsFilled} spots left`}
                </span>
              </div>

              <div className="progress-bar-wrapper">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

              <div className="players-list">
                {currentPlayers.length > 0 ? (
                  currentPlayers.map((player, index) => (
                    <div key={player._id || index} className="player-item">
                      <div className="player-avatar">
                        {player.name ? player.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : "?"}
                      </div>
                      <span className="player-name">{player.name || "Anonymous Player"}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>
                    No players yet. Be the first to join!
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="event-sidebar">
            <div className="host-card">
              <div className="host-avatar-large">
                {getHostInitials(createdBy?.name)}
              </div>
              <h3 className="host-name">{createdBy?.name || "Unknown"}</h3>
              <p className="host-label">Event Host</p>
            </div>

            <div className="location-card">
              <h3 className="section-title">
                <span className="section-icon">🗺️</span>
                Location
              </h3>
              {location?.geo?.coordinates ? (
                <EventMap events={[event]} height={240} />
              ) : (
                <div className="map-placeholder">📍</div>
              )}
              <p className="location-text">
                {typeof location === "object" ? location.address : location || "Location unavailable"}
              </p>
              {location?.geo?.coordinates && (
                <a
                  className="directions-link"
                  href={`https://www.openstreetmap.org/directions?to=${location.geo.coordinates[1]},${location.geo.coordinates[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
