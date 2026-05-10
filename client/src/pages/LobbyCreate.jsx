import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import MapPicker from '../components/ui/MapPicker';
import PAKISTAN_CITIES from '../data/pakistan_cities';
import '../styles/pages/LobbyCreate.css';

const SPORTS = ['Football', 'Cricket', 'Basketball', 'Tennis', 'Padel', 'Volleyball', 'Badminton', 'Pickleball', 'TableTennis'];

const sportConfig = {
  Football: { type: 'variable', min: 3, max: 11, label: 'X-a-side' },
  Cricket: { type: 'variable', min: 5, max: 11, label: 'X-a-side' },
  Basketball: { type: 'fixed-set', allowed: [1, 3, 5], labels: { 1: '1v1', 3: '3v3', 5: '5v5' } },
  Volleyball: { type: 'fixed-set', allowed: [2, 3, 4, 6], labels: { 2: '2v2 Beach', 3: '3v3', 4: '4v4', 6: '6v6' } },
  Padel: { type: 'fixed-set', allowed: [1, 2], labels: { 1: 'Singles', 2: 'Doubles' } },
  Tennis: { type: 'fixed-set', allowed: [1, 2], labels: { 1: 'Singles', 2: 'Doubles' } },
  Pickleball: { type: 'fixed-set', allowed: [1, 2], labels: { 1: 'Singles', 2: 'Doubles' } },
  Badminton: { type: 'fixed-set', allowed: [1, 2], labels: { 1: 'Singles', 2: 'Doubles' } },
  TableTennis: { type: 'fixed-set', allowed: [1, 2], labels: { 1: 'Singles', 2: 'Doubles' } },
};

const sportEmoji = { Football: '⚽', Cricket: '🏏', Basketball: '🏀', Tennis: '🎾', Padel: '🏓', Volleyball: '🏐', Badminton: '🏸', Pickleball: '🥒', TableTennis: '🏓' };

const LobbyCreate = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    sport: '',
    matchFormat: 0,
    dateTime: '',
    address: '',
    coordinates: [0, 0],
    city: '',
    country: 'Pakistan',
    totalSlots: 1,
    description: '',
  });

  const config = sportConfig[form.sport];

  const handleSportSelect = (sport) => {
    const cfg = sportConfig[sport];
    const defaultFormat = cfg.type === 'variable' ? cfg.min : cfg.allowed[0];
    setForm({ ...form, sport, matchFormat: defaultFormat });
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/lobbies', {
        sport: form.sport,
        matchFormat: form.matchFormat,
        location: { coordinates: form.coordinates, address: form.address, city: form.city, country: form.country },
        dateTime: new Date(form.dateTime).toISOString(),
        totalSlots: form.totalSlots,
        description: form.description,
      });
      navigate(`/lobby/${res.data.lobby._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create lobby');
    } finally {
      setLoading(false);
    }
  };

  // Calculate minimum datetime (now + 30 min)
  const minDateTime = new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16);

  return (
    <div className="lobby-create-page page" id="lobby-create-page">
      <div className="container">
        <div className="create-container">
          {/* Progress Steps */}
          <div className="step-progress">
            {['Sport', 'Details', 'Location', 'Review'].map((label, i) => (
              <div key={label} className={`step-dot ${step > i ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
                <span className="step-num">{i + 1}</span>
                <span className="step-label">{label}</span>
              </div>
            ))}
          </div>

          {error && <div className="auth-error mb-4">{error}</div>}

          {/* Step 1: Sport Selection */}
          {step === 1 && (
            <div className="create-step slide-up">
              <h2>Choose your sport</h2>
              <p className="text-secondary mb-6">Select the sport for your match.</p>
              <div className="sport-grid">
                {SPORTS.map(sport => (
                  <button key={sport} className={`sport-option ${form.sport === sport ? 'selected' : ''}`} onClick={() => handleSportSelect(sport)}>
                    <span className="sport-option-emoji">{sportEmoji[sport]}</span>
                    <span className="sport-option-name">{sport}</span>
                  </button>
                ))}
              </div>
              {form.sport && (
                <div className="format-section mt-6">
                  <h3>Match Format</h3>
                  {config.type === 'variable' ? (
                    <div className="format-variable">
                      <input type="range" min={config.min} max={config.max} value={form.matchFormat} onChange={e => setForm({ ...form, matchFormat: parseInt(e.target.value) })} className="range-input" />
                      <div className="format-display">{form.matchFormat}-a-side</div>
                    </div>
                  ) : (
                    <div className="format-options">
                      {config.allowed.map(val => (
                        <button key={val} className={`format-btn ${form.matchFormat === val ? 'active' : ''}`} onClick={() => setForm({ ...form, matchFormat: val })}>
                          {config.labels[val]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="step-actions">
                <button className="btn btn-primary btn-lg" onClick={() => setStep(2)} disabled={!form.sport}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 2: Date/Time & Slots */}
          {step === 2 && (
            <div className="create-step slide-up">
              <h2>Match details</h2>
              <p className="text-secondary mb-6">When are you playing and how many players do you need?</p>
              <div className="create-form">
                <div className="input-group">
                  <label className="input-label">Date & Time</label>
                  <input type="datetime-local" className="input" min={minDateTime} value={form.dateTime} onChange={e => setForm({ ...form, dateTime: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Players Needed (excluding you)</label>
                  <input type="number" className="input" min="1" max="20" value={form.totalSlots} onChange={e => setForm({ ...form, totalSlots: parseInt(e.target.value) || 1 })} />
                  <span className="text-xs text-muted">You're player #1. This is how many more you need.</span>
                </div>
                <div className="input-group">
                  <label className="input-label">Description (optional)</label>
                  <textarea className="input" placeholder="Any details about the game..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={500} />
                </div>
              </div>
              <div className="step-actions">
                <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary btn-lg" onClick={() => setStep(3)} disabled={!form.dateTime}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="create-step slide-up">
              <h2>Where are you playing?</h2>
              <p className="text-secondary mb-6">Search for a venue or click on the map to set the location.</p>
              <div className="create-form">
                <MapPicker
                  initialCoords={form.coordinates}
                  initialAddress={form.address}
                  onLocationSelect={({ coordinates, address, city }) => {
                    setForm(prev => ({ ...prev, coordinates, address, city: city || prev.city, country: 'Pakistan' }));
                  }}
                />
                <div className="input-group mt-4">
                  <label className="input-label">City <span style={{color:'var(--color-error)'}}>*</span></label>
                  <select
                    className="input"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    required
                  >
                    <option value="">Select a city...</option>
                    {PAKISTAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="step-actions">
                <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-primary btn-lg" onClick={() => setStep(4)} disabled={!form.address || !form.city}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="create-step slide-up">
              <h2>Review your lobby</h2>
              <p className="text-secondary mb-6">Make sure everything looks good before publishing.</p>
              <div className="review-card card card-body">
                <div className="review-row">
                  <span className="review-label">Sport</span>
                  <span>{sportEmoji[form.sport]} {form.sport}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Format</span>
                  <span className="text-mono">{form.matchFormat}-a-side</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Date & Time</span>
                  <span>{new Date(form.dateTime).toLocaleString()}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Location</span>
                  <span>{form.address}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Players Needed</span>
                  <span className="text-mono">{form.totalSlots}</span>
                </div>
                {form.description && (
                  <div className="review-row">
                    <span className="review-label">Description</span>
                    <span>{form.description}</span>
                  </div>
                )}
              </div>
              <div className="step-actions">
                <button className="btn btn-outline" onClick={() => setStep(3)}>← Back</button>
                <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading} id="publish-lobby-btn">
                  {loading ? 'Publishing...' : '🚀 Publish Lobby'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyCreate;


