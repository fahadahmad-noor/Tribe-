import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Auth.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      navigate(data.user.roles?.includes('admin') ? '/admin' : '/feed');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" id="login-page">
      {/* ── Left branding panel ── */}
      <div className="auth-brand-panel">
        <div className="auth-brand-glow auth-brand-glow-1" />
        <div className="auth-brand-glow auth-brand-glow-2" />
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <span className="auth-brand-icon">⚡</span>
            <span className="auth-brand-name">TRIBE</span>
          </div>
          <h2 className="auth-brand-headline">
            Your next match<br />is one tap away.
          </h2>
          <p className="auth-brand-sub">
            Real-time sports matchmaking for amateur athletes across Pakistan.
          </p>
          <div className="auth-brand-stats">
            <div className="auth-stat">
              <span className="auth-stat-val">9</span>
              <span className="auth-stat-lbl">Sports</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-val">Live</span>
              <span className="auth-stat-lbl">Rosters</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-val">Free</span>
              <span className="auth-stat-lbl">Forever</span>
            </div>
          </div>
          <div className="auth-brand-sports">
            {['⚽','🏏','🏀','🎾','🏐','🏸','🏓'].map((e, i) => (
              <span key={i} className="auth-brand-sport-emoji" style={{ animationDelay: `${i * 0.15}s` }}>{e}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1>Welcome back</h1>
            <p className="auth-form-subtitle">Sign in to your TRIBE account</p>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="input-group">
              <label className="input-label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className="input auth-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                required
              />
            </div>

            <div className="input-group">
              <div className="auth-label-row">
                <label className="input-label" htmlFor="login-password">Password</label>
              </div>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className="input auth-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              id="login-submit"
              disabled={loading}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          <div className="auth-divider"><span>New to TRIBE?</span></div>

          <Link to="/register" className="btn btn-outline btn-lg w-full auth-alt-btn" id="login-to-register">
            Create Free Account
          </Link>

          <p className="auth-terms">
            By signing in you agree to our community standards.<br />
            No spam. Just sport.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
