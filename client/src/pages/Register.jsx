import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Auth.css';

const SPORTS = ['Football', 'Cricket', 'Basketball', 'Tennis', 'Padel', 'Volleyball', 'Badminton', 'Pickleball', 'TableTennis'];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', whatsappNumber: '', preferences: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleSport = (sport) => {
    setForm(prev => ({
      ...prev,
      preferences: prev.preferences.includes(sport)
        ? prev.preferences.filter(s => s !== sport)
        : [...prev.preferences, sport]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.whatsappNumber.trim()) {
      setError('Contact / WhatsApp number is required.');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page register-layout" id="register-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Join TRIBE</h1>
          <p className="text-secondary">Create your account and start playing.</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label className="input-label" htmlFor="register-name">Name</label>
            <input type="text" className="input auth-input" id="register-name" placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="register-email">Email</label>
            <input type="email" className="input auth-input" id="register-email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="register-password">Password</label>
            <input type="password" className="input auth-input" id="register-password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="register-whatsapp">Contact / WhatsApp Number <span style={{color:'#DC3545'}}>*</span></label>
            <input type="tel" className="input auth-input" id="register-whatsapp" placeholder="e.g. 03001234567" value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} required minLength={7} />
            <span className="text-xs text-muted">Required — so organizers can contact you</span>
          </div>
          <div className="input-group">
            <label className="input-label">Favourite Sports</label>
            <div className="sport-select-grid">
              {SPORTS.map(sport => (
                <button type="button" key={sport} className={`sport-chip ${form.preferences.includes(sport) ? 'active' : ''}`} onClick={() => toggleSport(sport)}>
                  {sport}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary auth-submit btn-lg" id="register-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : 'Create Account →'}
          </button>
        </form>
        <p className="auth-footer">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
};

export default Register;


