import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../styles/pages/SquadCreate.css';

const SPORTS = ['Football', 'Cricket', 'Basketball', 'Tennis', 'Padel', 'Volleyball', 'Badminton', 'Pickleball', 'TableTennis'];
const sportEmoji = { Football: '⚽', Cricket: '🏏', Basketball: '🏀', Tennis: '🎾', Padel: '🏓', Volleyball: '🏐', Badminton: '🏸', Pickleball: '🥒', TableTennis: '🏓' };

const SquadCreate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', sport: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.sport) {
      setError('Name and sport are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/squads', {
        name: form.name,
        sport: form.sport,
        description: form.description,
      });
      navigate(`/squad/${res.data.squad._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create squad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page squad-create-page" id="squad-create-page">
      <div className="container">
        <div className="create-squad-container">
          <div className="create-squad-header">
            <h1>Create a Squad</h1>
            <p className="text-secondary">Build your team and challenge other squads.</p>
          </div>

          {error && <div className="auth-error mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="create-squad-form">
            <div className="input-group">
              <label className="input-label">Squad Name</label>
              <input
                type="text"
                className="input"
                id="squad-name"
                placeholder="e.g. Northside FC"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                maxLength={100}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Sport</label>
              <div className="squad-sport-grid">
                {SPORTS.map(sport => (
                  <button
                    type="button"
                    key={sport}
                    className={`squad-sport-option ${form.sport === sport ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, sport })}
                  >
                    <span className="squad-sport-emoji">{sportEmoji[sport]}</span>
                    <span className="squad-sport-name">{sport}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Description (optional)</label>
              <textarea
                className="input"
                id="squad-description"
                placeholder="Tell others about your squad..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                maxLength={500}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              id="create-squad-submit"
              disabled={loading || !form.name || !form.sport}
            >
              {loading ? 'Creating...' : '👥 Create Squad'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SquadCreate;
