import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import MapPicker from '../components/ui/MapPicker';
import '../styles/pages/VenueApply.css';

const SPORTS = ['Football', 'Cricket', 'Basketball', 'Tennis', 'Padel', 'Volleyball', 'Badminton', 'Pickleball', 'TableTennis'];
const AMENITIES_LIST = ['Parking', 'Showers', 'Floodlights', 'Cafeteria', 'Changing Rooms', 'Wi-Fi', 'First Aid', 'Equipment Rental', 'Spectator Seating'];

const VenueApply = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    address: '',
    coordinates: [0, 0],
    city: '',
    country: '',
    sportsSupported: [],
    amenities: [],
    pitches: [{ name: '', sports: [], hourlyRate: 0 }],
    description: '',
    contactPhone: '',
    contactEmail: '',
  });

  const toggleSport = (sport) => {
    setForm(prev => ({
      ...prev,
      sportsSupported: prev.sportsSupported.includes(sport)
        ? prev.sportsSupported.filter(s => s !== sport)
        : [...prev.sportsSupported, sport],
    }));
  };

  const toggleAmenity = (amenity) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const updatePitch = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      pitches: prev.pitches.map((p, i) => i === index ? { ...p, [field]: value } : p),
    }));
  };

  const addPitch = () => {
    setForm(prev => ({ ...prev, pitches: [...prev.pitches, { name: '', sports: [], hourlyRate: 0 }] }));
  };

  const removePitch = (index) => {
    setForm(prev => ({ ...prev, pitches: prev.pitches.filter((_, i) => i !== index) }));
  };

  const togglePitchSport = (index, sport) => {
    setForm(prev => ({
      ...prev,
      pitches: prev.pitches.map((p, i) =>
        i === index
          ? { ...p, sports: p.sports.includes(sport) ? p.sports.filter(s => s !== sport) : [...p.sports, sport] }
          : p
      ),
    }));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        location: { coordinates: form.coordinates, address: form.address, city: form.city, country: form.country },
        sportsSupported: form.sportsSupported,
        amenities: form.amenities,
        pitches: form.pitches.filter(p => p.name).map(p => ({ ...p, isActive: true })),
        description: form.description,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
      };
      await api.post('/venues/apply', payload);
      navigate('/venues');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page venue-apply-page" id="venue-apply-page">
      <div className="container">
        <div className="apply-container">
          <div className="step-progress">
            {['Basics', 'Sports & Amenities', 'Pitches', 'Review'].map((label, i) => (
              <div key={label} className={`step-dot ${step > i ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
                <span className="step-num">{i + 1}</span>
                <span className="step-label">{label}</span>
              </div>
            ))}
          </div>

          {error && <div className="auth-error mb-4">{error}</div>}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="create-step slide-up">
              <h2>Venue Information</h2>
              <p className="text-secondary mb-6">Tell us about your venue.</p>
              <div className="create-form">
                <div className="input-group">
                  <label className="input-label">Venue Name</label>
                  <input type="text" className="input" placeholder="e.g. Sports City Arena" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Location</label>
                  <MapPicker
                    initialCoords={form.coordinates}
                    initialAddress={form.address}
                    onLocationSelect={({ coordinates, address, city, country }) => {
                      setForm(prev => ({ ...prev, coordinates, address, city: city || prev.city, country: country || prev.country }));
                    }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea className="input" placeholder="Describe your venue..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={1000} />
                </div>
                <div className="grid grid-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Contact Phone</label>
                    <input type="text" className="input" placeholder="+971 50 123 4567" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Contact Email</label>
                    <input type="email" className="input" placeholder="venue@example.com" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="step-actions">
                <button className="btn btn-primary btn-lg" onClick={() => setStep(2)} disabled={!form.name || !form.address}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 2: Sports & Amenities */}
          {step === 2 && (
            <div className="create-step slide-up">
              <h2>Sports & Amenities</h2>
              <p className="text-secondary mb-6">What sports and facilities do you offer?</p>
              <div className="create-form">
                <div className="input-group">
                  <label className="input-label">Sports Supported</label>
                  <div className="sport-select-grid">
                    {SPORTS.map(sport => (
                      <button type="button" key={sport} className={`sport-chip ${form.sportsSupported.includes(sport) ? 'active' : ''}`} onClick={() => toggleSport(sport)}>
                        {sport}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Amenities</label>
                  <div className="sport-select-grid">
                    {AMENITIES_LIST.map(amenity => (
                      <button type="button" key={amenity} className={`sport-chip ${form.amenities.includes(amenity) ? 'active' : ''}`} onClick={() => toggleAmenity(amenity)}>
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="step-actions">
                <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary btn-lg" onClick={() => setStep(3)} disabled={form.sportsSupported.length === 0}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 3: Pitches */}
          {step === 3 && (
            <div className="create-step slide-up">
              <h2>Pitches & Courts</h2>
              <p className="text-secondary mb-6">Add each playable area at your venue.</p>
              <div className="create-form">
                {form.pitches.map((pitch, i) => (
                  <div key={i} className="pitch-card card card-body mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4>Pitch {i + 1}</h4>
                      {form.pitches.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePitch(i)}>✕ Remove</button>}
                    </div>
                    <div className="input-group mb-3">
                      <label className="input-label">Name</label>
                      <input type="text" className="input" placeholder="e.g. Pitch A" value={pitch.name} onChange={e => updatePitch(i, 'name', e.target.value)} />
                    </div>
                    <div className="input-group mb-3">
                      <label className="input-label">Hourly Rate</label>
                      <input type="number" className="input" min="0" value={pitch.hourlyRate} onChange={e => updatePitch(i, 'hourlyRate', parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Sports</label>
                      <div className="flex flex-wrap gap-2">
                        {form.sportsSupported.map(sport => (
                          <button type="button" key={sport} className={`sport-chip ${pitch.sports.includes(sport) ? 'active' : ''}`} onClick={() => togglePitchSport(i, sport)}>
                            {sport}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-outline w-full" onClick={addPitch}>+ Add Another Pitch</button>
              </div>
              <div className="step-actions">
                <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-primary btn-lg" onClick={() => setStep(4)}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="create-step slide-up">
              <h2>Review Your Application</h2>
              <p className="text-secondary mb-6">Make sure everything looks good before submitting.</p>
              <div className="review-card card card-body">
                <div className="review-row"><span className="review-label">Name</span><span>{form.name}</span></div>
                <div className="review-row"><span className="review-label">Address</span><span>{form.address}</span></div>
                <div className="review-row"><span className="review-label">Sports</span><span>{form.sportsSupported.join(', ')}</span></div>
                <div className="review-row"><span className="review-label">Amenities</span><span>{form.amenities.join(', ') || 'None'}</span></div>
                <div className="review-row"><span className="review-label">Pitches</span><span>{form.pitches.filter(p => p.name).length} configured</span></div>
                {form.contactPhone && <div className="review-row"><span className="review-label">Phone</span><span>{form.contactPhone}</span></div>}
                {form.contactEmail && <div className="review-row"><span className="review-label">Email</span><span>{form.contactEmail}</span></div>}
              </div>
              <p className="text-xs text-muted mt-3">Your venue will be reviewed by an admin before appearing in the directory.</p>
              <div className="step-actions">
                <button className="btn btn-outline" onClick={() => setStep(3)}>← Back</button>
                <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading} id="submit-venue-btn">
                  {loading ? 'Submitting...' : '🏟️ Submit Application'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VenueApply;
