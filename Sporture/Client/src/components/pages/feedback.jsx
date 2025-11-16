// Client/src/components/pages/feedback.jsx
import React, { useState, useEffect } from "react";
import "./Feedback.css";
import axios from "axios";

const Feedback = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    rating: 0,
    comment: "",
  });

  const [feedbackList, setFeedbackList] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/feedback");
        setFeedbackList(res.data);
      } catch (err) {
        console.error("Error fetching feedback:", err);
      }
    };
    fetchFeedbacks();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRating = (val) => {
    setForm((prev) => ({ ...prev, rating: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.comment || form.rating === 0) {
      setMessage("⚠️ Please fill in all fields before submitting.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/feedback", form);
      setFeedbackList((prev) => [res.data, ...prev]);
      setForm({ name: "", email: "", rating: 0, comment: "" });
      setMessage("✅ Thank you for your feedback!");
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setMessage("❌ Failed to submit feedback. Try again later.");
    }
  };

  return (
    <div className="feedback-bg">
      <div className="feedback-container">
        <h1 className="feedback-title">💬 User Feedback</h1>

        {/* Feedback Form */}
        <form className="feedback-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={form.name}
            onChange={handleChange}
            className="feedback-input"
          />

          <input
            type="email"
            name="email"
            placeholder="Your Email"
            value={form.email}
            onChange={handleChange}
            className="feedback-input"
          />

          <div className="rating-section">
            <label>Rate your experience:</label>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={form.rating >= star ? "star active" : "star"}
                  onClick={() => handleRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <textarea
            name="comment"
            placeholder="Write your feedback..."
            value={form.comment}
            onChange={handleChange}
            className="feedback-textarea"
          />

          <button type="submit" className="submit-btn">
            Submit Feedback
          </button>

          {message && <p className="feedback-message">{message}</p>}
        </form>

        {/* Feedback List */}
        <div className="feedback-list">
          <h2>Recent Feedbacks</h2>
          {feedbackList.length === 0 ? (
            <p>No feedback yet. Be the first to share your thoughts!</p>
          ) : (
            feedbackList.map((f) => (
              <div key={f._id} className="feedback-card">
                <div className="feedback-card-header">
                  <h3>{f.name}</h3>
                  <span className="rating">
                    {"★".repeat(f.rating)}
                    {"☆".repeat(5 - f.rating)}
                  </span>
                </div>
                <p className="feedback-comment">“{f.comment}”</p>
                <div className="feedback-footer">
                  {/* THE FIX IS HERE: f.createdAt instead of f.date */}
                  <small>📅 {new Date(f.createdAt).toLocaleDateString()}</small>
                  <small>📧 {f.email}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Feedback;