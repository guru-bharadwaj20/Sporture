// src/components/pages/CreateEvent.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent } from "../utils/api"; // ✅ token-aware axios instance
import './CreateEvent.css';

const CreateEvent = () => {
  const [formData, setFormData] = useState({
    title: '',
    sport: '',
    date: '',
    maxPlayers: 2,
    location: '', // ✅ keep same as backend
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const eventData = {
        title: formData.title,
        sport: formData.sport,
        date: formData.date,
        maxPlayers: formData.maxPlayers,
        location: formData.location || "Location unavailable",
      };

      console.log("Creating event with token + data:", eventData);

      const res = await createEvent(eventData); // ✅ token auto-attached
      alert('✅ Event Created Successfully!');
      navigate(`/events/${res.data._id}`);
    } catch (err) {
      console.error('❌ Event creation error:', err.response?.data || err.message);
      alert(`❌ ${err.response?.data?.message || 'Event creation failed'}`);
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
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Location Address"
            required
          />
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
          <button type="submit" className="create-event-btn">
            Create Event
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
