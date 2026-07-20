// src/components/pages/CreateEvent.jsx
import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { apiErrorMessage } from "../utils/errors";
import type { Coords } from "@shared/api";
import { useNavigate } from 'react-router-dom';
import { createEvent } from "../utils/api"; // ✅ token-aware axios instance
import { useGeolocation } from "../utils/useGeolocation";
import VenuePicker from "../common/VenuePicker";
import './CreateEvent.css';

const CreateEvent = () => {
  const [formData, setFormData] = useState({
    title: '',
    sport: '',
    date: '',
    maxPlayers: 2,
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  // A pin dropped on the map. When set it overrides geocoding the address.
  const [pin, setPin] = useState<Coords | null>(null);

  const navigate = useNavigate();
  const { coords, status: geoStatus, error: geoError, request: requestLocation } =
    useGeolocation();

  // "Use my current location" seeds the pin, which the user can then drag.
  useEffect(() => {
    if (coords) {
      setPin(coords);
      setShowMap(true);
    }
  }, [coords]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const eventData = {
        title: formData.title,
        sport: formData.sport,
        date: formData.date,
        maxPlayers: formData.maxPlayers,
        // A dropped pin is more precise than geocoding the address, which
        // resolves to a building or street centroid. Falls back to the text.
        location: pin
          ? { address: formData.location, lat: pin.lat, lng: pin.lng }
          : formData.location,
      };

      const res = await createEvent(eventData); // ✅ token auto-attached
      navigate(`/events/${res.data._id}`);
    } catch (err) {
      console.error('Event creation error:', apiErrorMessage(err));
            // Validation failures carry a details array; surface it rather than the
      // generic message, so the user knows which field to fix.
      alert(`❌ ${apiErrorMessage(err, 'Event creation failed')}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-event-container">
      <div className="create-event-card">
        <h2 className="create-event-title">🏆 Create a New Sports Event</h2>
        <form onSubmit={handleSubmit} className="create-event-form">
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Event Title"
            required
          />
          <input
            type="text"
            name="sport"
            value={formData.sport}
            onChange={handleChange}
            placeholder="Sport (e.g., Tennis)"
            required
          />
          <input
            type="datetime-local"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
          <div className="location-field">
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Venue address (e.g. Chinnaswamy Stadium, Bengaluru)"
              required
            />
            <div className="location-actions">
              <button
                type="button"
                className="location-action"
                onClick={() => setShowMap((v) => !v)}
              >
                {showMap ? "Hide map" : "🗺️ Pick on map"}
              </button>
              <button
                type="button"
                className="location-action"
                onClick={requestLocation}
                disabled={geoStatus === "locating"}
              >
                {geoStatus === "locating" ? "Finding you..." : "📍 Use my location"}
              </button>
              {pin && (
                <button
                  type="button"
                  className="location-action location-action--clear"
                  onClick={() => setPin(null)}
                >
                  Clear pin
                </button>
              )}
            </div>

            {showMap && (
              <VenuePicker position={pin} sport={formData.sport} onPick={setPin} />
            )}

            <p className={`location-hint${pin ? " pinned" : ""}`}>
              {pin
                ? `📍 Pinned at ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
                : "No pin set — we'll look up the address you typed."}
            </p>
            {geoError && <p className="location-error">{geoError}</p>}
          </div>
          <div>
            <label className="create-event-label">Max Players</label>
            <input
              type="number"
              name="maxPlayers"
              value={formData.maxPlayers}
              onChange={handleChange}
              min="2"
              required
            />
          </div>
          <button type="submit" className="create-event-btn" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
