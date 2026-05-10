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
        <div className="hero-bg-gradient" />
        <div className="container">
          <div className="hero-grid">
            {/* Left Column - Content */}
            <div className="hero-content">
              <div className="hero-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span>Community Sports Matchmaking</span>
              </div>
              <h1 className="hero-title">
                Find Your Game.<br />
                <span className="hero-accent">Build Your Team.</span>
              </h1>
              <p className="hero-subtitle">
                TRIBE connects amateur athletes with local sports fixtures. Create match lobbies, 
                discover open games, fill your roster in real-time, and never struggle to find players again.
              </p>
              <div className="hero-actions">
                {user ? (
                  <Link to="/feed" className="btn btn-primary btn-lg hero-cta">
                    <span>Go to Feed</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="btn btn-primary btn-lg hero-cta" id="hero-signup">
                      <span>Get Started Free</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </Link>
                    <Link to="/login" className="btn btn-outline btn-lg" id="hero-login">Log In</Link>
                  </>
                )}
              </div>
              <div className="hero-stats">
                <div className="stat">
                  <span className="stat-number">9</span>
                  <span className="stat-label">Sports</span>
                </div>
                <div className="stat">
                  <span className="stat-number">1000+</span>
                  <span className="stat-label">Active Players</span>
                </div>
                <div className="stat">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Live Matching</span>
                </div>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="hero-visual">
              <div className="hero-card hero-card-1">
                <div className="card-icon">⚽</div>
                <div className="card-content">
                  <div className="card-title">Football Match</div>
                  <div className="card-meta">5v5 • Dubai Sports City</div>
                  <div className="card-slots">
                    <span className="slot-badge">3 slots left</span>
                  </div>
                </div>
              </div>
              <div className="hero-card hero-card-2">
                <div className="card-icon">🏀</div>
                <div className="card-content">
                  <div className="card-title">Basketball Pickup</div>
                  <div className="card-meta">3v3 • Marina Court</div>
                  <div className="card-slots">
                    <span className="slot-badge slot-badge-urgent">1 slot left</span>
                  </div>
                </div>
              </div>
              <div className="hero-card hero-card-3">
                <div className="card-icon">🎾</div>
                <div className="card-content">
                  <div className="card-title">Tennis Doubles</div>
                  <div className="card-meta">2v2 • JBR Courts</div>
                  <div className="card-slots">
                    <span className="slot-badge">2 slots left</span>
                  </div>
                </div>
              </div>
              <div className="hero-glow hero-glow-1"></div>
              <div className="hero-glow hero-glow-2"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Sports Grid */}
      <section className="sports-section container">
        <div className="section-header">
          <h2 className="section-title text-center">Every Sport. Every Format.</h2>
          <p className="section-subtitle text-center text-secondary">
            From 5-a-side football to singles tennis — TRIBE handles it all with precision.
          </p>
        </div>
        <div className="sports-grid">
          {[
            { icon: '⚽', name: 'Football', desc: '3 to 11-a-side', color: '#4CAF50' },
            { icon: '🏏', name: 'Cricket', desc: '5 to 11-a-side', color: '#FF9800' },
            { icon: '🏀', name: 'Basketball', desc: '1v1, 3v3, 5v5', color: '#F44336' },
            { icon: '🎾', name: 'Tennis', desc: 'Singles & Doubles', color: '#CDDC39' },
            { icon: '🏓', name: 'Padel', desc: 'Singles & Doubles', color: '#2196F3' },
            { icon: '🏐', name: 'Volleyball', desc: '2v2 to 6v6', color: '#9C27B0' },
            { icon: '🏸', name: 'Badminton', desc: 'Singles & Doubles', color: '#00BCD4' },
            { icon: '🥎', name: 'Pickleball', desc: 'Singles & Doubles', color: '#8BC34A' },
            { icon: '🏓', name: 'Table Tennis', desc: 'Singles & Doubles', color: '#FF5722' },
          ].map(sport => (
            <div key={sport.name} className="sport-card" style={{'--sport-color': sport.color}}>
              <div className="sport-icon-wrapper">
                <span className="sport-emoji">{sport.icon}</span>
              </div>
              <h4 className="sport-name">{sport.name}</h4>
              <p className="sport-desc">{sport.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="how-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title text-center">How TRIBE Works</h2>
            <p className="section-subtitle text-center text-secondary">
              Four simple steps to find your perfect match
            </p>
          </div>
          <div className="steps-grid">
            {[
              { 
                num: '01', 
                icon: '📝',
                title: 'Create a Lobby', 
                desc: 'Pick your sport, format, venue, and time. Set how many players you need.' 
              },
              { 
                num: '02', 
                icon: '👥',
                title: 'Players Request to Join', 
                desc: 'Your lobby appears in the live feed. Players send join requests you can review.' 
              },
              { 
                num: '03', 
                icon: '✅',
                title: 'Approve & Fill', 
                desc: 'Approve players, watch slots fill in real-time. Auto-lock when full.' 
              },
              { 
                num: '04', 
                icon: '🎮',
                title: 'Play!', 
                desc: 'Chat with your team, get venue directions, and show up ready to compete.' 
              },
            ].map(step => (
              <div key={step.num} className="step-card">
                <div className="step-icon">{step.icon}</div>
                <div className="step-number">{step.num}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc text-secondary">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section container">
        <div className="section-header">
          <h2 className="section-title text-center">Built for Serious Players</h2>
          <p className="section-subtitle text-center text-secondary">
            Professional-grade features for amateur athletes
          </p>
        </div>
        <div className="features-grid">
          {[
            { 
              icon: '⚡', 
              title: 'Real-time Everything', 
              desc: 'Live roster updates, instant notifications, and chat — all via WebSockets.',
              highlight: true
            },
            { 
              icon: '🛡️', 
              title: 'Anti-Flake System', 
              desc: 'Waitlists auto-promote. Ringer alerts find nearby replacements in minutes.',
              highlight: true
            },
            { 
              icon: '👥', 
              title: 'Squad System', 
              desc: 'Build your team identity. Challenge other squads. Track your match history.' 
            },
            { 
              icon: '🏟️', 
              title: 'Venue Integration', 
              desc: 'Verified venues with live pitch availability. Book directly from lobby creation.' 
            },
            { 
              icon: '🎯', 
              title: 'Smart Matching', 
              desc: 'Find players by skill level, location, and availability. Perfect team composition every time.' 
            },
            { 
              icon: '📱', 
              title: 'Mobile-First', 
              desc: 'Responsive design that works beautifully on any device, anywhere.' 
            },
          ].map(f => (
            <div key={f.title} className={`feature-card card card-body ${f.highlight ? 'feature-highlight' : ''}`}>
              <span className="feature-icon">{f.icon}</span>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-bg-pattern" />
        <div className="container">
          <div className="cta-content text-center">
            <h2 className="cta-title">Ready to Find Your Next Game?</h2>
            <p className="cta-subtitle text-secondary">
              Join thousands of athletes who never struggle to fill their team again.
            </p>
            <div className="cta-actions">
              {user ? (
                <Link to="/feed" className="btn btn-primary btn-lg hero-cta">
                  <span>Go to Feed</span>
                  <span className="btn-arrow">→</span>
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg hero-cta">
                    <span>Create Free Account</span>
                    <span className="btn-arrow">→</span>
                  </Link>
                  <Link to="/login" className="btn btn-outline btn-lg">Sign In</Link>
                </>
              )}
            </div>
            <p className="cta-note text-muted text-sm">
              No credit card required • Free forever • Join in 30 seconds
            </p>
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


