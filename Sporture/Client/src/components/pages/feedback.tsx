// Client/src/components/pages/feedback.jsx
import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import type { FeedbackDTO } from "@shared/api";
import "./feedback.css";
import { getFeedback, postFeedback } from "../utils/api";
import { apiErrorMessage } from "../utils/errors";

const Feedback = () => {
  // Name and email are no longer collected here — the server derives the
  // author from the logged-in user so feedback can't be posted as someone else.
  const [form, setForm] = useState({
    rating: 0,
    comment: "",
  });

  const [feedbackList, setFeedbackList] = useState<FeedbackDTO[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await getFeedback();
        setFeedbackList(res.data);
      } catch (err) {
        console.error("Error fetching feedback:", err);
      }
    };
    fetchFeedbacks();
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRating = (val: number) => {
    setForm((prev) => ({ ...prev, rating: val }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.comment || form.rating === 0) {
      setMessage("⚠️ Please add a rating and a comment before submitting.");
      return;
    }

    try {
      const res = await postFeedback(form);
      setFeedbackList((prev) => [res.data, ...prev]);
      setForm({ rating: 0, comment: "" });
      setMessage("✅ Thank you for your feedback!");
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setMessage(apiErrorMessage(err, "❌ Failed to submit feedback. Try again later."));
    }
  };

  return (
    <div className="feedback-bg">
      <div className="feedback-container">
        <h1 className="feedback-title">💬 User Feedback</h1>

        {/* Feedback Form */}
        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="rating-section">
            <label>Rate your experience:</label>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={form.rating >= star ? "star active" : "star"}
                  onClick={() => handleRating(star)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Rate ${star} out of 5`}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleRating(star); } }}
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
                  {/* No email here: the public listing withholds it server-side
                      (select("-email")), so rendering it showed a bare icon. */}
                  <small>📅 {new Date(f.createdAt).toLocaleDateString()}</small>
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