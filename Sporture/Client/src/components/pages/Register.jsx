// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../utils/api";
import "./Auth.css";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    favSports: [],
    skillLevel: "Beginner",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sportsOptions = ["Football", "Basketball", "Cricket", "Tennis", "Badminton", "Volleyball"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSportsChange = (sport) => {
    setFormData((prev) => ({
      ...prev,
      favSports: prev.favSports.includes(sport)
        ? prev.favSports.filter((s) => s !== sport)
        : [...prev.favSports, sport],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validations
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (formData.favSports.length === 0) {
      setError("Please select at least one favorite sport");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        favSports: formData.favSports,
        skillLevel: formData.skillLevel,
      };

      const response = await registerUser(payload);

      if (response.data && response.data.success) {
        // Success animation
        const submitBtn = document.querySelector('.btn-submit');
        if (submitBtn) submitBtn.classList.add('success-state');

        alert("🎉 Registration successful! Please login to continue.");
        
        setTimeout(() => {
          navigate("/login");
        }, 500);
      } else {
        setError(response.data?.message || "Registration failed");
      }
    } catch (err) {
      console.error("Register error:", err);
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🏆</span>
          <div className="auth-logo-text">Sporture</div>
        </div>

        <h2 className="auth-title">Join Sporture</h2>
        <p className="auth-subtitle">Create your account and start playing</p>

        {error && <div className="error-message">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="At least 6 characters"
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Re-enter your password"
            />
          </div>

          <div className="form-group">
            <label>Favorite Sports (Select at least one)</label>
            <div className="sports-checkboxes">
              {sportsOptions.map((sport) => (
                <label key={sport} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.favSports.includes(sport)}
                    onChange={() => handleSportsChange(sport)}
                  />
                  <span>{sport}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Skill Level</label>
            <select name="skillLevel" value={formData.skillLevel} onChange={handleChange}>
              <option value="Beginner">Beginner - Just starting out</option>
              <option value="Intermediate">Intermediate - Regular player</option>
              <option value="Advanced">Advanced - Experienced athlete</option>
              <option value="Professional">Professional - Competitive level</option>
            </select>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")} className="link">
            Login here
          </span>
        </p>
      </div>

      <div className="back-to-home">
        <a onClick={() => navigate("/")} className="back-link">
          ← Back to Home
        </a>
      </div>
    </div>
  );
};

export default Register;