import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Landing.css';

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="landing-page" id="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg-pattern" />
        <div className="container hero-content">
          <div className="hero-badge">🏟️ Community Sports Matchmaking</div>
          <h1 className="hero-title">
            Find your game.<br />
            <span className="hero-accent">Fill your team.</span>
          </h1>
          <p className="hero-subtitle">
            TRIBE connects amateur athletes with local sports fixtures. Create match lobbies, 
            discover open games, fill your roster in real-time, and never struggle to find players again.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/feed" className="btn btn-primary btn-lg">Go to Feed →</Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg" id="hero-signup">Get Started Free</Link>
                <Link to="/login" className="btn btn-outline btn-lg" id="hero-login">Log In</Link>
              </>
            )}
          </div>
          <div className="hero-stats">
            <div className="stat"><span className="stat-number">9</span><span className="stat-label">Sports</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-number">Real-time</span><span className="stat-label">Live Roster Updates</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-number">Free</span><span className="stat-label">Always</span></div>
          </div>
        </div>
      </section>

      {/* Sports Grid */}
      <section className="sports-section container">
        <h2 className="section-title text-center">Every sport. Every format.</h2>
        <p className="section-subtitle text-center text-secondary">From 5-a-side futsal to singles tennis — TRIBE handles it all.</p>
        <div className="sports-grid">
          {[
            { emoji: '⚽', name: 'Football', desc: '3 to 11-a-side' },
            { emoji: '🏏', name: 'Cricket', desc: '5 to 11-a-side' },
            { emoji: '🏀', name: 'Basketball', desc: '1v1, 3v3, 5v5' },
            { emoji: '🎾', name: 'Tennis', desc: 'Singles & Doubles' },
            { emoji: '🏓', name: 'Padel', desc: 'Singles & Doubles' },
            { emoji: '🏐', name: 'Volleyball', desc: '2v2 to 6v6' },
            { emoji: '🏸', name: 'Badminton', desc: 'Singles & Doubles' },
            { emoji: '🥒', name: 'Pickleball', desc: 'Singles & Doubles' },
            { emoji: '🏓', name: 'Table Tennis', desc: 'Singles & Doubles' },
          ].map(sport => (
            <div key={sport.name} className="sport-card card">
              <span className="sport-emoji">{sport.emoji}</span>
              <h4>{sport.name}</h4>
              <p className="text-sm text-muted">{sport.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="how-section">
        <div className="container">
          <h2 className="section-title text-center">How TRIBE works</h2>
          <div className="steps-grid">
            {[
              { num: '01', title: 'Create a Lobby', desc: 'Pick your sport, format, venue, and time. Set how many players you need.' },
              { num: '02', title: 'Players Request to Join', desc: 'Your lobby appears in the live feed. Players send join requests you can review.' },
              { num: '03', title: 'Approve & Fill', desc: 'Approve players, watch slots fill in real-time. Auto-lock when full.' },
              { num: '04', title: 'Play!', desc: 'Chat with your team, get venue directions, and show up ready to compete.' },
            ].map(step => (
              <div key={step.num} className="step-card" >
                <div className="step-number">{step.num}</div>
                <h3>{step.title}</h3>
                <p className="text-secondary">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section container">
        <h2 className="section-title text-center">Built for serious players</h2>
        <div className="features-grid">
          {[
            { icon: '⚡', title: 'Real-time Everything', desc: 'Live roster updates, instant notifications, and chat — all via WebSockets.' },
            { icon: '🛡️', title: 'Anti-Flake System', desc: 'Waitlists auto-promote. Ringer alerts find nearby replacements in minutes.' },
            { icon: '👥', title: 'Squad System', desc: 'Build your team identity. Challenge other squads. Track your match history.' },
            { icon: '🏟️', title: 'Venue Integration', desc: 'Verified venues with live pitch availability. Book directly from lobby creation.' },
            { icon: '🏆', title: 'Tournaments', desc: 'Single elimination, round robin, group stages — full bracket management.' },
            { icon: '📱', title: 'Mobile-First', desc: 'Responsive design that works beautifully on any device, anywhere.' },
          ].map(f => (
            <div key={f.title} className="feature-card card card-body">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p className="text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container text-center">
          <h2>Ready to find your next game?</h2>
          <p className="text-secondary mt-2">Join TRIBE and never struggle to fill your team again.</p>
          <div className="mt-6">
            <Link to="/register" className="btn btn-primary btn-lg">Create Account →</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container flex justify-between items-center">
          <span className="text-muted text-sm">© 2026 TRIBE. All rights reserved.</span>
          <span className="text-muted text-sm">Built with ❤️ for athletes everywhere.</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


