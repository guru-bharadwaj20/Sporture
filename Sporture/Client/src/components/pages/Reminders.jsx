// Client/src/components/pages/Reminders.jsx
import React, { useState, useEffect } from 'react';
import { getJoinedEvents } from '../utils/api';
import { Link } from 'react-router-dom';
import './Reminders.css';

const Reminders = () => {
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserEvents = async () => {
            try {
                const res = await getJoinedEvents();
                const now = new Date();
                // Filter for events that are in the future
                const upcoming = res.data.filter(event => new Date(event.date) >= now);
                // Sort by the soonest event first
                upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
                setUpcomingEvents(upcoming);
            } catch (err) {
                console.error("Error fetching user's events:", err);
                setError('Failed to load your events. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserEvents();
    }, []);

    const getTimeDifference = (eventDate) => {
        const now = new Date();
        const eventTime = new Date(eventDate);
        const diffInMs = eventTime - now;

        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const diffInHours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffInDays > 0) return `in ${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
        if (diffInHours > 0) return `in ${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
        if (diffInMinutes > 0) return `in ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
        return 'starting now';
    };

    if (loading) {
        return <div className="reminders-page"><p className="loading-text">Loading your reminders...</p></div>;
    }

    if (error) {
        return <div className="reminders-page"><p className="error-text">{error}</p></div>;
    }

    return (
        <div className="reminders-page">
            <div className="reminders-header">
                <h1 className="reminders-title">🔔 Your Upcoming Events</h1>
                <p className="reminders-subtitle">
                    Here are all the events you've joined or are hosting. Don't be late!
                </p>
            </div>

            {upcomingEvents.length > 0 ? (
                <div className="reminders-grid">
                    {upcomingEvents.map(event => (
                        <div key={event._id} className="reminder-card">
                            <div className="card-header">
                                <h3 className="event-title">{event.title}</h3>
                                <span className="time-away-badge">
                                    {getTimeDifference(event.date)}
                                </span>
                            </div>
                            <p className="event-detail"><strong>Sport:</strong> {event.sport}</p>
                            <p className="event-detail">
                                <strong>When:</strong> {new Date(event.date).toLocaleString('en-US', {
                                    weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                })}
                            </p>
                            <p className="event-detail"><strong>Where:</strong> {event.location}</p>
                            <div className="card-footer">
                                <span className="spots-info">
                                    {event.currentPlayers.length} / {event.maxPlayers} players
                                </span>
                                <Link to={`/events/${event._id}`} className="details-link-reminders">
                                    View Details →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-reminders">
                    <h2>No upcoming events!</h2>
                    <p>You haven't joined or created any future events yet.</p>
                    <Link to="/events" className="browse-events-link">
                        Find an event to join
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Reminders;