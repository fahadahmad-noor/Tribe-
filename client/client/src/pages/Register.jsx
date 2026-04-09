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
    <div className="auth-page page" id="register-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Join TRIBE</h1>
          <p className="text-secondary">Create your account and start playing.</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label className="input-label">Name</label>
            <input type="text" className="input" id="register-name" placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" className="input" id="register-email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" className="input" id="register-password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          <div className="input-group">
            <label className="input-label">WhatsApp Number (optional)</label>
            <input type="text" className="input" id="register-whatsapp" placeholder="+971 50 123 4567" value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} />
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
          <button type="submit" className="btn btn-primary w-full btn-lg" id="register-submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-footer">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
};

export default Register;


