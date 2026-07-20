// src/components/pages/CreateEvent.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent } from "../utils/api"; // ✅ token-aware axios instance
import { useGeolocation } from "../utils/useGeolocation";
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

  const navigate = useNavigate();
  const { coords, status: geoStatus, error: geoError, request: requestLocation, clear: clearCoords } =
    useGeolocation();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const eventData = {
        title: formData.title,
        sport: formData.sport,
        date: formData.date,
        maxPlayers: formData.maxPlayers,
        // Sending coordinates when we have them skips server-side geocoding,
        // which is both faster and more precise than resolving the text.
        location: coords
          ? { address: formData.location, lat: coords.lat, lng: coords.lng }
          : formData.location,
      };

      const res = await createEvent(eventData); // ✅ token auto-attached
      navigate(`/events/${res.data._id}`);
    } catch (err) {
      console.error('❌ Event creation error:', err.response?.data || err.message);
      const data = err.response?.data;
      // Validation failures carry a details array; surface it rather than the
      // generic message, so the user knows which field to fix.
      alert(`❌ ${data?.details?.join('\n') || data?.message || 'Event creation failed'}`);
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
            {coords ? (
              <p className="location-hint pinned">
                📍 Pinned to your current position
                <button type="button" onClick={clearCoords}>use the address instead</button>
              </p>
            ) : (
              <p className="location-hint">
                <button type="button" onClick={requestLocation} disabled={geoStatus === "locating"}>
                  {geoStatus === "locating" ? "Finding you..." : "📍 Use my current location"}
                </button>
                {" "}— otherwise we'll look up the address you typed.
              </p>
            )}
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
