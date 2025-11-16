// src/components/pages/EventDiscovery.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { joinEvent } from "../utils/api";
import "./EventDiscovery.css";

const EventDiscovery = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportsList, setSportsList] = useState([]);
  const [sportFilter, setSportFilter] = useState("All");
  const [joining, setJoining] = useState({});
  const [userId, setUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ✅ Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    console.log('🔍 Auth Check:', { 
      hasToken: !!token, 
      hasUser: !!user, 
      userId: user?._id,
      isAuth: !!(token && user && user._id)
    });
    
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
        const res = await api.get("/events");
        const evts = res.data || [];
        const sports = Array.from(new Set(evts.map((e) => e.sport).filter(Boolean)));
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
        const params = sportFilter === "All" ? {} : { sport: sportFilter };
        const res = await api.get("/events", { params });
        setEvents(res.data || []);
      } catch (err) {
        console.error("Error fetching events:", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [sportFilter]);

  // ✅ Handle Join - Check Authentication First
  const handleJoin = async (eventId) => {
    // Check token first, before any API call
    const token = localStorage.getItem('token');
    
    console.log('🎯 Join clicked:', { 
      eventId, 
      hasToken: !!token, 
      isAuth: isAuthenticated 
    });
    
    if (!token || !isAuthenticated) {
      alert("⚠️ Please login to join events!");
      navigate("/login");
      return;
    }

    setJoining((prev) => ({ ...prev, [eventId]: true }));
    try {
      const res = await joinEvent(eventId);
      alert(res.data.message);
      setEvents((prev) =>
        prev.map((e) => (e._id === eventId ? res.data.event : e))
      );
    } catch (err) {
      // If unauthorized, clear storage and redirect
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert("⚠️ Session expired. Please login again!");
        navigate("/login");
        return;
      }
      
      const msg = err.response?.data?.message || "Failed to join event.";
      alert("⚠️ " + msg);
    } finally {
      setJoining((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const getSportIcon = (sport) => {
    const icons = {
      'Football': '⚽',
      'Basketball': '🏀',
      'Tennis': '🎾',
      'Cricket': '🏏',
      'Badminton': '🏸',
      'Volleyball': '🏐',
    };
    return icons[sport] || '🏅';
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
      </div>

      <div className="event-count">
        <p>
          Showing <strong>{events.length}</strong> event{events.length !== 1 ? 's' : ''}{" "}
          {sportFilter !== "All" && <>for "{sportFilter}"</>}
        </p>
      </div>

      {events.length === 0 ? (
        <div className="no-events">
          <span className="no-events-icon">🔍</span>
          <h3>No events found{sportFilter !== "All" ? ` for "${sportFilter}"` : ""}</h3>
          <p>Be the first to create an exciting sports event!</p>
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
                    <strong>Location:</strong> {event.location}
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