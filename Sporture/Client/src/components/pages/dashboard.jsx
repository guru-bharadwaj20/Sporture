// src/components/pages/Dashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import "./dashboard.css";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getAllEvents } from "../utils/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for dynamic functionality
  const [events, setEvents] = useState([]);
  const [popularVenues, setPopularVenues] = useState([]);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllVenues, setShowAllVenues] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const eventIds = useRef(new Set());

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [userRes, eventsRes] = await Promise.all([
          getCurrentUser(),
          getAllEvents(),
        ]);

        const serverUser = userRes?.data?.user;
        if (!serverUser) throw new Error("User not found");
        setUser(serverUser);
        localStorage.setItem('user', JSON.stringify(serverUser)); // Keep local storage in sync

        const allEvents = eventsRes.data;
        const sortedEvents = [...allEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
        setEvents(sortedEvents);
        eventIds.current = new Set(sortedEvents.map((e) => e._id));

        // Calculate Popular Venues from Events Data
        const locationCounts = allEvents.reduce((acc, event) => {
          if (event.location && typeof event.location === 'string') {
            const location = event.location.trim();
            if (location) {
              acc[location] = (acc[location] || 0) + 1;
            }
          }
          return acc;
        }, {});
        const venuesData = Object.entries(locationCounts)
          .map(([name, bookings]) => ({ name, bookings }))
          .sort((a, b) => b.bookings - a.bookings);
        setPopularVenues(venuesData);

      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Polling logic for notifications
    const intervalId = setInterval(async () => {
      try {
        const res = await getAllEvents();
        const newEvents = res.data;
        const freshUser = JSON.parse(localStorage.getItem('user')); // Get latest user data
        
        const newNotifications = [];
        newEvents.forEach((event) => {
          if (!eventIds.current.has(event._id)) {
            newNotifications.push({ id: event._id, message: `New: "${event.title}"`, event: event });
            eventIds.current.add(event._id);
          }
        });
        if (newNotifications.length > 0) {
          setNotifications((prev) => [...newNotifications, ...prev]);
          setEvents(newEvents.sort((a, b) => new Date(a.date) - new Date(b.date)));
          if (freshUser) setUser(freshUser); // Update user state if new data is in storage
        }
      } catch (error) { console.error("Polling error:", error); }
    }, 30000); 

    return () => clearInterval(intervalId);
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  if (loading) {
    return <div className="dashboard-wrapper"><div className="dashboard-container" style={{ paddingTop: 140 }}><p>Loading dashboard...</p></div></div>;
  }
  if (!user) {
    return <div className="dashboard-wrapper"><div className="dashboard-container" style={{ paddingTop: 140 }}><p>User not found. Please login again.</p></div></div>;
  }

  const initials = user.name ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("") : "U";
  const firstName = user.name ? user.name.split(" ")[0] : "User";

  const features = [
    { id: 1, icon: "🏟️", title: "Event Discovery", subtitle: "Find Events", desc: "Browse and filter exciting sports events happening near you.", className: "feature-blue", route: "/events" },
    { id: 3, icon: "➕", title: "Create Event", subtitle: "Host Events", desc: "Host your own event and invite players to join the fun!", className: "feature-green", route: "/create-event" },
    { id: 4, icon: "🔔", title: "Reminders", subtitle: "Your Schedule", desc: "See all your upcoming events in one place.", className: "feature-purple", route: "/reminders" },
    { id: 5, icon: "🙋‍♂️", title: "Profile", subtitle: "Your Info", desc: "View and update your personal information and stats.", className: "feature-cyan", route: "/profile" },
    { id: 6, icon: "⭐", title: "Feedback & Ratings", subtitle: "Share Views", desc: "Share your thoughts and rate your experience with Sporture.", className: "feature-pink", route: "/feedback" },
  ];
  
  const eventsToShow = showAllEvents ? events : events.slice(0, 3);
  const venuesToShow = showAllVenues ? popularVenues : popularVenues.slice(0, 3);
  const eventColors = ['event-green', 'event-orange', 'event-blue'];

  return (
    <div className="dashboard-wrapper">
      <nav className="top-navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <div className="logo-box"><div className="logo-icon">🏆</div></div>
            <div className="brand-name">Sporture</div>
          </div>
          <div className="navbar-right">
            <div className="notification-section">
              <button className="notification-btn" onClick={() => setShowNotifDropdown(!showNotifDropdown)}>
                <span className="notif-icon">🔔</span>
                {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
              </button>
              {showNotifDropdown && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <span>Notifications</span>
                    {notifications.length > 0 && <button className="clear-notifs-btn" onClick={() => setNotifications([])}>Clear All</button>}
                  </div>
                  <div className="notification-list">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div key={notif.id} className="notification-item" onClick={() => { navigate(`/events/${notif.event._id}`); setShowNotifDropdown(false); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }}>
                          <p className="notification-message">{notif.message}</p>
                        </div>
                      ))
                    ) : (<div className="no-notifications"><p>No new notifications.</p></div>)}
                  </div>
                </div>
              )}
            </div>
            <div className="profile-section">
              <button className="profile-btn" onClick={() => setShowDropdown(!showDropdown)}>
                <div className="profile-avatar">{initials}</div>
                <div className="profile-name">{user.name}</div>
              </button>
              {showDropdown && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">{initials}</div>
                    <div>
                      <div className="dropdown-name">{user.name}</div>
                      <div className="dropdown-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item" onClick={() => { navigate("/profile"); setShowDropdown(false); }}>👤 View Profile</button>
                  <button className="dropdown-item" onClick={() => { navigate("/feedback"); setShowDropdown(false); }}>⭐ Feedback</button>
                  <button className="dropdown-item logout" onClick={handleLogout}>🚪 Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <div className="dashboard-container">
        <section className="hero-section">
          <h1 className="hero-title">Welcome back, <span className="highlight">{firstName}!</span></h1>
          <p className="hero-subtitle">Explore sports events, track your stats, and stay updated — all in one place.</p>
        </section>
        <div className="stats-grid">
          <div className="stat-card stat-blue">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-label">Events Participated</div>
              <div className="stat-value">{user.gamesPlayed || 0}</div>
              <div className="stat-trend">Keep up the good work!</div>
            </div>
          </div>
          <div className="stat-card stat-green">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-label">Events Hosted</div>
              <div className="stat-value">{user.eventsHosted || 0}</div>
              <div className="stat-trend">Great initiative!</div>
            </div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <div className="stat-label">Average Rating</div>
              <div className="stat-value">{user.rating || 'N/A'}</div>
              <div className="stat-trend">Based on community feedback</div>
            </div>
          </div>
          
          {/* ======================= THE FIX ======================= */}
          {/* The redundant 'Events Joined' card is replaced with 'Skill Level'. */}
          <div className="stat-card stat-orange">
            <div className="stat-icon">🚀</div>
            <div className="stat-content">
              <div className="stat-label">Skill Level</div>
              <div className="stat-value" style={{ fontSize: '28px', marginTop: '4px' }}>{user.skillLevel || 'N/A'}</div>
              <div className="stat-trend">Level up!</div>
            </div>
          </div>
          {/* ===================== END OF FIX ====================== */}

        </div>
        <section className="features-section">
          <h2 className="section-title">Your Sporture Tools</h2>
          <div className="features-grid">{features.map((f) => (<div key={f.id} className={`feature-card ${f.className}`} onClick={() => navigate(f.route)}><div className="feature-glow"></div><div className="feature-icon">{f.icon}</div><div className="feature-subtitle">{f.subtitle}</div><div className="feature-title">{f.title}</div><div className="feature-desc">{f.desc}</div><div className="feature-footer"><div className="feature-stats">Open Section</div><div className="feature-arrow">→</div></div></div>))}</div>
        </section>
        <section className="activity-section">
          <div className="activity-left">
            <div className="activity-header">
              <h3>Upcoming Events</h3>
              {events.length > 3 && (<button className="view-all-btn" onClick={() => setShowAllEvents(!showAllEvents)}>{showAllEvents ? 'View Less' : 'View All'}</button>)}
            </div>
            <div className="events-list">
              {eventsToShow.length > 0 ? (eventsToShow.map((event, index) => (<div key={event._id} className={`event-card ${eventColors[index % eventColors.length]}`} onClick={() => navigate(`/events/${event._id}`)}><div className="event-main"><div className="event-sport">{event.title}</div><div className="event-spots">{event.currentPlayers.length}/{event.maxPlayers} Spots</div></div><div className="event-venue">{event.location}</div><div className="event-time">{new Date(event.date).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: true })}</div></div>))) : (<p style={{textAlign: 'center', color: '#64748b'}}>No upcoming events found.</p>)}
            </div>
          </div>
          <div className="activity-right">
            <div className="activity-header">
              <h3>Popular Venues</h3>
              {popularVenues.length > 3 && (<button className="view-all-btn" onClick={() => setShowAllVenues(!showAllVenues)}>{showAllVenues ? 'View Less' : 'View All'}</button>)}
            </div>
            <div className="venues-list">
              {venuesToShow.length > 0 ? (venuesToShow.map(venue => (<div className="venue-card" key={venue.name}><div className="venue-image">🏟️</div><div className="venue-info"><div className="venue-name">{venue.name}</div><div className="venue-bookings">{venue.bookings} Booking{venue.bookings > 1 ? 's' : ''}</div></div><div className="venue-rating"><span className="rating-star">⭐</span><span className="rating-value">Top</span></div></div>))) : (<p style={{textAlign: 'center', color: '#64748b'}}>No venue data available.</p>)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;