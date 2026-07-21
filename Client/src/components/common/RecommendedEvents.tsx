import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import type { RecommendedEventDTO } from "@shared/api";
import { getRecommendedEvents } from "../utils/api";
import { apiErrorMessage } from "../utils/errors";
import { useGeolocation, formatDistance } from "../utils/useGeolocation";
import { emojiForSport } from "../utils/sports";
import "./RecommendedEvents.css";

const RecommendedEvents = ({ limit = 6 }: { limit?: number }) => {
  const [events, setEvents] = useState<RecommendedEventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { coords, status: geoStatus, request: requestLocation } = useGeolocation();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getRecommendedEvents({ coords, limit });
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      setError(apiErrorMessage(err, "Couldn't load recommendations."));
    } finally {
      setLoading(false);
    }
  }, [coords, limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <section className="recs">
        <h2 className="recs__title">✨ Recommended for you</h2>
        <p className="recs__status">Finding events you might like...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="recs">
        <h2 className="recs__title">✨ Recommended for you</h2>
        <p className="recs__status recs__status--error">{error}</p>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="recs">
        <h2 className="recs__title">✨ Recommended for you</h2>
        <p className="recs__status">
          Nothing to suggest yet — once there are events you haven't joined, they'll show up here.
        </p>
        <Link to="/events" className="recs__browse">Browse all events →</Link>
      </section>
    );
  }

  return (
    <section className="recs">
      <div className="recs__header">
        <h2 className="recs__title">✨ Recommended for you</h2>
        {!coords && (
          <button
            type="button"
            className="recs__locate"
            onClick={requestLocation}
            disabled={geoStatus === "locating"}
          >
            {geoStatus === "locating"
              ? "Finding you..."
              : "📍 Use my location for better matches"}
          </button>
        )}
      </div>

      <div className="recs__grid">
        {events.map((event) => {
          const spotsLeft = event.maxPlayers - (event.currentPlayers?.length || 0);

          return (
            <Link to={`/events/${event._id}`} key={event._id} className="rec-card">
              <div className="rec-card__head">
                <span className="rec-card__glyph">{emojiForSport(event.sport)}</span>
                <div>
                  <h3 className="rec-card__title">{event.title}</h3>
                  <p className="rec-card__sport">{event.sport}</p>
                </div>
              </div>

              <div className="rec-card__match" title={`Match score ${event.score}`}>
                <div className="rec-card__match-bar">
                  <div
                    className="rec-card__match-fill"
                    style={{ width: `${Math.round(event.score * 100)}%` }}
                  />
                </div>
                <span className="rec-card__match-label">
                  {Math.round(event.score * 100)}% match
                </span>
              </div>

              {event.reasons?.length > 0 && (
                <ul className="rec-card__reasons">
                  {event.reasons.slice(0, 3).map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              )}

              <div className="rec-card__foot">
                <span>
                  {new Date(event.date).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <span className={spotsLeft <= 2 ? "is-scarce" : ""}>
                  {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
                </span>
              </div>

              {event.distanceMetres !== undefined && (
                <span className="rec-card__distance">
                  {formatDistance(event.distanceMetres)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default RecommendedEvents;
