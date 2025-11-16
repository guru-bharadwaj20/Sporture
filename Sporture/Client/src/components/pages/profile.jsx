// src/components/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { getCurrentUser, updateUserById, getJoinedEvents } from "../utils/api";
import "./Profile.css";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newPhoto, setNewPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);

  // State for user's events
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const userRes = await getCurrentUser();
        setUser(userRes.data.user);

        // Fetch the user's joined and hosted events
        const eventRes = await getJoinedEvents();
        const now = new Date();
        const upcoming = [];
        const past = [];
        
        eventRes.data.forEach(event => {
          if (new Date(event.date) >= now) {
            upcoming.push(event);
          } else {
            past.push(event);
          }
        });

        setUpcomingEvents(upcoming);
        setPastEvents(past);

      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Background theme effect
  useEffect(() => {
    document.body.classList.add("profile-theme");
    return () => document.body.classList.remove("profile-theme");
  }, []);

  // Optional: live city fetch via geolocation (updates city field locally)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUser((u) =>
            u
              ? {
                  ...u,
                  city: `Lat ${pos.coords.latitude.toFixed(2)}, Lng ${pos.coords.longitude.toFixed(2)}`,
                }
              : u
          ),
        () => setUser((u) => (u ? { ...u, city: "Location access denied" } : u))
      );
    }
  }, []);

  const handlePhotoChange = async (e) => {
  const file = e.target.files[0];
  if (!file || !user) return;

  const formData = new FormData();
  formData.append("photo", file);

  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/users/${user._id}/upload-photo`, {
  method: "POST",
  body: formData,
});
    const data = await res.json();

    if (data.user) {
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      alert("✅ Profile photo updated!");
    }
  } catch (err) {
    console.error("❌ Upload failed:", err);
    alert("Failed to upload image.");
  }
};

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await updateUserById(user._id, user);
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
      alert("✅ Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("❌ Failed to update profile.");
    } finally {
      setEditMode(false);
    }
  };

  const handleRatingClick = (val) => setUser((prev) => ({ ...prev, rating: val }));

  if (loading) return <div className="profile-bg"><p>Loading profile...</p></div>;
  if (!user) return <div className="profile-bg"><p>User not found.</p></div>;

  return (
    <div className="profile-bg">
      <div className="profile-layout">
        {/* Header */}
        <header className="profile-header">
          <div className="profile-photo-box">
            <img src={newPhoto || user.photoURL || 'https://via.placeholder.com/150'} alt="profile" className="profile-photo" />
            {editMode && (
              <input type="file" accept="image/*" className="photo-upload" onChange={handlePhotoChange} />
            )}
          </div>

          <div className="profile-details">
            {editMode ? (
              <form className="edit-form" onSubmit={handleSave}>
                <input
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  required
                  className="input"
                />
                <select
                  value={user.skillLevel}
                  onChange={(e) => setUser({ ...user, skillLevel: e.target.value })}
                  className="input"
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                  <option>Professional</option>
                </select>
                <textarea
                  value={user.bio}
                  onChange={(e) => setUser({ ...user, bio: e.target.value })}
                  className="textarea"
                />
                <button className="save-btn">💾 Save</button>
              </form>
            ) : (
              <>
                <h1>{user.name}</h1>
                <p className="email">📧 {user.email}</p>
                <p>📅 Member since {user.memberSince}</p>
                <p>📍 {user.city}</p>
                <p className="bio">{user.bio}</p>
                <button className="edit-btn" onClick={() => setEditMode(true)}>
                  ✏️ Edit Profile
                </button>
              </>
            )}
          </div>
        </header>

        {/* Stats */}
        <section className="stats-grid">
          <div className="stat">
            <h2>{user.gamesPlayed}</h2>
            <p>Games Played</p>
            <progress value={user.gamesPlayed} max="20"></progress>
          </div>
          <div className="stat">
            <h2>{user.eventsHosted}</h2>
            <p>Events Hosted</p>
            <progress value={user.eventsHosted} max="10"></progress>
          </div>
          <div className="stat rating">
            <div className="stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={s <= user.rating ? "star active" : "star"}
                  onClick={() => handleRatingClick(s)}
                >
                  ★
                </span>
              ))}
            </div>
            <p>Average Rating</p>
          </div>
        </section>

        {/* Favorite Sports */}
        <div className="sports-list">
          {Array.isArray(user.favSports) && user.favSports.map((s, i) => (
            <span key={i} className="sport-chip">
              🏆 {s}
            </span>
          ))}
        </div>

        {/* Tabs - Now with dynamic data */}
        <section className="tabs-section">
          <div className="tab-buttons">
            <button
              className={activeTab === "upcoming" ? "active" : ""}
              onClick={() => setActiveTab("upcoming")}
            >
              📅 Upcoming ({upcomingEvents.length})
            </button>
            <button
              className={activeTab === "past" ? "active" : ""}
              onClick={() => setActiveTab("past")}
            >
              📜 Past ({pastEvents.length})
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "upcoming" &&
              (upcomingEvents.length > 0 ? (
                upcomingEvents.map((e) => (
                  <div key={e._id} className="event-card">
                    <h3>🏅 {e.title}</h3>
                    <p>
                      {new Date(e.date).toLocaleDateString()} • {e.location}
                    </p>
                    <span className="slot-badge">{e.currentPlayers.length}/{e.maxPlayers} filled</span>
                  </div>
                ))
              ) : (<p>No upcoming events.</p>))
            }

            {activeTab === "past" &&
              (pastEvents.length > 0 ? (
                pastEvents.map((e) => (
                  <div key={e._id} className="event-card past">
                    <h3>🏆 {e.title}</h3>
                    <p>{new Date(e.date).toLocaleDateString()}</p>
                    <div className="feedback">Played on {new Date(e.date).toLocaleDateString()}</div>
                  </div>
                ))
              ) : (<p>No past events.</p>))
            }
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;