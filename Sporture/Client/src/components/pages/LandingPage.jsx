// src/pages/LandingPage.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  // Create MORE VISIBLE floating sports particles
  useEffect(() => {
    const particles = ['⚽', '🏀', '🎾', '🏈', '⚾', '🏐', '🏸', '⛳', '🥊'];
    const container = document.querySelector('.landing-container');
    
    particles.forEach((emoji, index) => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.textContent = emoji;
      container.appendChild(particle);
    });

    return () => {
      const existingParticles = document.querySelectorAll('.particle');
      existingParticles.forEach(p => p.remove());
    };
  }, []);

  const sports = [
    { icon: '⚽', name: 'Football' },
    { icon: '🏀', name: 'Basketball' },
    { icon: '🎾', name: 'Tennis' },
    { icon: '🏐', name: 'Volleyball' },
    { icon: '🏸', name: 'Badminton' },
    { icon: '🏏', name: 'Cricket' },
  ];

  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="logo-container" onClick={() => navigate('/')}>
          <span className="logo-icon">🏆</span>
          <h1 className="logo">Sporture</h1>
        </div>
        <nav>
          <button onClick={() => navigate('/login')} className="btn-outline">
            Login
          </button>
          <button onClick={() => navigate('/register')} className="btn-primary">
            Sign Up
          </button>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-badge">
            <span>🎯</span>
            <span>Your Ultimate Sports Platform</span>
          </div>
          <h2 className="hero-title">
            Find Your Next <span className="highlight">Game</span>
          </h2>
          <p className="hero-subtitle">
            Connect with players, create events, and enjoy sports together.<br />
            Join thousands of athletes already playing!
          </p>
          <div className="cta-buttons">
            <button 
              onClick={() => navigate('/register')} 
              className="cta-button"
            >
              Get Started Free
            </button>
            {/* ✅ Changed from /events to actual discovery route */}
            <button 
              onClick={() => navigate('/events')} 
              className="cta-button cta-secondary"
            >
              Browse Events
            </button>
          </div>
        </section>

        {/* Sports Showcase */}
        <section className="sports-showcase">
          {sports.map((sport, index) => (
            <div key={index} className="sport-item">
              <span className="sport-icon">{sport.icon}</span>
              <div className="sport-name">{sport.name}</div>
            </div>
          ))}
        </section>

        {/* Features */}
        <section className="features">
          <div className="feature-card">
            <span className="feature-icon">🎮</span>
            <h3>Create Events</h3>
            <p>Organize sports events in your area and invite players to join instantly. Simple, fast, and efficient.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">👥</span>
            <h3>Join Players</h3>
            <p>Find teammates and opponents for any sport at any skill level. Connect with your local sports community.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">⭐</span>
            <h3>Rate & Review</h3>
            <p>Build your sports reputation and connect with like-minded athletes. Track your progress and achievements.</p>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="testimonial-section">
          <h2>What Players Say</h2>
          <p className="testimonial-text">
            "Sporture has completely transformed how I find sports partners. 
            I've met amazing people and never miss a game anymore. It's like having 
            a sports community in your pocket!"
          </p>
          <div className="testimonial-author">Alex Johnson</div>
          <div className="testimonial-role">Basketball Enthusiast, Mumbai</div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="#about" className="footer-link">About Us</a>
            <a href="#features" className="footer-link">Features</a>
            <a href="#contact" className="footer-link">Contact</a>
            <a href="#privacy" className="footer-link">Privacy Policy</a>
            <a href="#terms" className="footer-link">Terms of Service</a>
          </div>
          <p>🏆 &copy; 2025 Sporture. All rights reserved. | Made with ❤️ for sports enthusiasts</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
