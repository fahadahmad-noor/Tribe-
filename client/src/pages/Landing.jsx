import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Landing.css';

const sports = [
  { emoji: '⚽', name: 'Football',     desc: '3 to 11-a-side',   color: '#4CAF50' },
  { emoji: '🏏', name: 'Cricket',      desc: '5 to 11-a-side',   color: '#FF9800' },
  { emoji: '🏀', name: 'Basketball',   desc: '1v1, 3v3, 5v5',    color: '#F44336' },
  { emoji: '🎾', name: 'Tennis',       desc: 'Singles & Doubles', color: '#CDDC39' },
  { emoji: '🎾', name: 'Padel',        desc: 'Singles & Doubles', color: '#2196F3' },
  { emoji: '🏐', name: 'Volleyball',   desc: '2v2 to 6v6',       color: '#9C27B0' },
  { emoji: '🏸', name: 'Badminton',    desc: 'Singles & Doubles', color: '#00BCD4' },
  { emoji: '🏓', name: 'Pickleball',   desc: 'Singles & Doubles', color: '#8BC34A' },
  { emoji: '🏓', name: 'Table Tennis', desc: 'Singles & Doubles', color: '#FF5722' },
];

const steps = [
  { num: '01', icon: '🏟️', title: 'Create a Lobby', desc: 'Pick your sport, format, venue, and time. Set how many players you need.' },
  { num: '02', icon: '📣', title: 'Players Find You', desc: 'Your lobby goes live in the feed. Nearby players send join requests instantly.' },
  { num: '03', icon: '✅', title: 'Approve & Fill', desc: 'Approve players, watch slots fill in real-time. Auto-lock when full.' },
  { num: '04', icon: '🏆', title: 'Play!', desc: 'Chat with your team, get venue directions, and show up ready to compete.' },
];

const features = [
  { icon: '⚡', title: 'Real-time Everything', desc: 'Live roster updates, instant notifications, and group chat — all via WebSockets.' },
  { icon: '🛡️', title: 'Anti-Flake System',   desc: 'Waitlists auto-promote. Ringer alerts find nearby replacements in minutes.' },
  { icon: '👥', title: 'Squad System',         desc: 'Build your team identity. Challenge other squads. Track your match history.' },
  { icon: '🏟️', title: 'Venue Integration',   desc: 'Verified venues with live pitch availability. Book directly from lobby creation.' },
  { icon: '🏆', title: 'Tournaments',          desc: 'Single elimination, round robin, group stages — full bracket management.' },
  { icon: '📱', title: 'Mobile-First',          desc: 'Responsive design that works beautifully on any device, anywhere.' },
];

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="landing-page" id="landing-page">

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-glow hero-glow-3" />

        <div className="container hero-inner">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Community Sports Matchmaking · Pakistan
            </div>

            <h1 className="hero-title">
              Find your game.<br />
              <span className="hero-accent">Fill your team.</span>
            </h1>

            <p className="hero-subtitle">
              TRIBE connects amateur athletes with local sports fixtures.
              Create match lobbies, discover open games, and never struggle
              to find players again — in real-time.
            </p>

            <div className="hero-actions">
              {user ? (
                <Link to="/feed" className="btn btn-primary btn-lg hero-cta">
                  Go to Feed <span className="hero-arrow">→</span>
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg hero-cta" id="hero-signup">
                    Get Started — It's Free
                  </Link>
                  <Link to="/login" className="btn btn-outline btn-lg" id="hero-login">
                    Log In
                  </Link>
                </>
              )}
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">9</span>
                <span className="hero-stat-label">Sports</span>
              </div>
              <div className="hero-stat-sep" />
              <div className="hero-stat">
                <span className="hero-stat-value">Live</span>
                <span className="hero-stat-label">Roster Updates</span>
              </div>
              <div className="hero-stat-sep" />
              <div className="hero-stat">
                <span className="hero-stat-value">Free</span>
                <span className="hero-stat-label">Always</span>
              </div>
            </div>
          </div>

          {/* Visual panel */}
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-card hero-card-main">
              <div className="hc-header">
                <span className="hc-sport-badge">⚽ Football</span>
                <span className="hc-status open">OPEN</span>
              </div>
              <div className="hc-title">5-a-side at F-7 Ground</div>
              <div className="hc-meta">📍 Islamabad · Today 6:00 PM</div>
              <div className="hc-slots">
                <span className="hc-slot filled" />
                <span className="hc-slot filled" />
                <span className="hc-slot filled" />
                <span className="hc-slot" />
                <span className="hc-slot" />
                <span className="hc-slots-label">3/5 players joined</span>
              </div>
              <button className="btn btn-primary btn-sm hc-btn">Request to Join</button>
            </div>

            <div className="hero-card hero-card-notif">
              <span style={{ fontSize: 18 }}>🔔</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Slot confirmed!</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>You're in for tonight's match</div>
              </div>
            </div>

            <div className="hero-card hero-card-players">
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, opacity: 0.7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Roster</div>
              {['Ali K.', 'Sara M.', 'Zain R.'].map((name, i) => (
                <div key={i} className="hc-player-row">
                  <div className="hc-player-avatar">{name[0]}</div>
                  <span style={{ fontSize: 12 }}>{name}</span>
                  <span className="hc-player-check">✓</span>
                </div>
              ))}
              <div className="hc-player-row waiting">
                <div className="hc-player-avatar empty">?</div>
                <span style={{ fontSize: 12, opacity: 0.5 }}>Waiting for player…</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sports Grid ── */}
      <section className="sports-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Every sport. Every format.</h2>
            <p className="section-subtitle">From 5-a-side futsal to singles tennis — TRIBE handles it all.</p>
          </div>
          <div className="sports-grid">
            {sports.map(sport => (
              <div key={sport.name} className="sport-card">
                <div className="sport-emoji-wrap" style={{ '--sport-color': sport.color }}>
                  <span className="sport-emoji">{sport.emoji}</span>
                </div>
                <h4 className="sport-name">{sport.name}</h4>
                <p className="sport-desc">{sport.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="how-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How TRIBE works</h2>
            <p className="section-subtitle">From zero to game day in four steps.</p>
          </div>
          <div className="steps-grid">
            {steps.map((step, i) => (
              <div key={step.num} className="step-card">
                <div className="step-number">{step.num}</div>
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                {i < steps.length - 1 && <div className="step-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Built for serious players</h2>
            <p className="section-subtitle">Everything you need to organise, join, and dominate local sport.</p>
          </div>
          <div className="features-grid">
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon-wrap">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-glow" />
        <div className="container cta-inner">
          <div className="cta-tag">Ready to play?</div>
          <h2 className="cta-title">Never struggle to fill your team again.</h2>
          <p className="cta-sub">Join thousands of athletes already using TRIBE to find local games.</p>
          <div className="cta-actions">
            <Link to="/register" className="btn btn-primary btn-lg" id="cta-signup">
              Create Free Account →
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg" id="cta-login">
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="footer-logo-icon">⚡</span>
            <span className="footer-logo-text">TRIBE</span>
          </div>
          <span className="footer-copy">© 2026 TRIBE. Built for athletes across Pakistan.</span>
          <div className="footer-links">
            <Link to="/login">Log In</Link>
            <Link to="/register">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
