import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, getCurrentUser } from "../utils/api";
import { setStoredUser, setToken } from "../utils/storage";
import { apiErrorMessage } from "../utils/errors";
import "./Auth.css";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginUser(formData);

      if (response.data.success) {
        setToken(response.data.token);

        try {
          const meRes = await getCurrentUser();
          const serverUser = meRes.data.user;
          setStoredUser(serverUser);
        } catch (meErr) {
          console.warn("Could not fetch /auth/me, using login response", meErr);
          setStoredUser(response.data.user);
        }

        const submitBtn = document.querySelector('.btn-submit');
        if (submitBtn) submitBtn.classList.add('success-state');

        setTimeout(() => {
          navigate("/dashboard");
        }, 500);
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(apiErrorMessage(err, "Login failed. Please check your credentials."));
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

        <h2 className="auth-title">Welcome Back!</h2>
        <p className="auth-subtitle">Login to continue your sports journey</p>

        {error && <div className="error-message">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Logging in..." : "Login to Sporture"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register" className="link">
            Sign up here
          </Link>
        </p>
      </div>

      <div className="back-to-home">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
};

export default Login;
