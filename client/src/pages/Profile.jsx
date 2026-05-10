import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import '../styles/pages/Profile.css';

const SPORTS = ['Football', 'Cricket', 'Basketball', 'Tennis', 'Padel', 'Volleyball', 'Badminton', 'Pickleball', 'TableTennis'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Pro'];
const SKILL_COLORS = {
  Beginner:     { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  Intermediate: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  Advanced:     { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  Pro:          { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
};

function computeCompleteness(profile) {
  const checks = [
    { label: 'Profile photo',    done: !!profile.avatarUrl },
    { label: 'Bio',              done: !!profile.bio },
    { label: 'WhatsApp',         done: !!profile.whatsappNumber },
    { label: 'Skill level set',  done: profile.skillLevel && profile.skillLevel !== 'Beginner' },
    { label: 'Sport preference', done: profile.preferences?.length > 0 },
  ];
  return { score: Math.round((checks.filter(c => c.done).length / checks.length) * 100), checks };
}

function buildSportBreakdown(lobbies) {
  const map = {};
  for (const l of lobbies) { if (l.sport) map[l.sport] = (map[l.sport] || 0) + 1; }
  return Object.entries(map).map(([sport, count]) => ({ sport, count })).sort((a, b) => b.count - a.count).slice(0, 5);
}

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const isMe = id === 'me' || id === user?._id;
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState({ lobbies: [], squads: [] });
  const [venues,  setVenues]  = useState([]);
  const [stats,   setStats]   = useState(null);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        if (isMe) {
          const [profRes, histRes, squadRes] = await Promise.all([
            api.get('/users/me'),
            api.get('/users/me/history', { params: { limit: 20 } }),
            api.get('/users/me/squads'),
          ]);
          const u = profRes.data.user;
          setProfile(u);
          setHistory({ lobbies: histRes.data.lobbies || [], squads: squadRes.data.squads || [] });
          setForm({ name: u.name, whatsappNumber: u.whatsappNumber || '', ringerMode: u.ringerMode, bio: u.bio || '', skillLevel: u.skillLevel || 'Beginner', location: u.displayLocation || '', preferences: u.preferences || [] });
        } else {
          const res = await api.get(`/users/${id}/public`);
          setProfile(res.data.user);
          setHistory({ lobbies: res.data.lobbies || [], squads: res.data.squads || [] });
          setVenues(res.data.venues || []);
          setStats(res.data.stats || null);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [id, isMe]);

  const handleSave = async () => {
    try {
      const res = await api.patch('/users/me', form);
      setProfile(res.data.user);
      updateUser(res.data.user);
      setEditing(false);
    } catch { alert('Failed to save'); }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('avatar', file);
    try {
      const res = await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(p => ({ ...p, avatarUrl: res.data.avatarUrl }));
      updateUser({ avatarUrl: res.data.avatarUrl });
    } catch { alert('Upload failed'); }
  };

  const togglePref = (sport) => setForm(f => ({ ...f, preferences: f.preferences.includes(sport) ? f.preferences.filter(s => s !== sport) : [...f.preferences, sport] }));

  if (loading) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;
  if (!profile) return <div className="page container"><h2>User not found</h2></div>;

  const { score: completeness, checks: completenessChecks } = isMe ? computeCompleteness(profile) : { score: 100, checks: [] };
  const skillStyle = SKILL_COLORS[profile.skillLevel] || SKILL_COLORS.Beginner;
  const myStats = isMe
    ? { totalMatches: history.lobbies.length, asOrganizer: history.lobbies.filter(l => l.myRole === 'organizer').length, completedMatches: history.lobbies.filter(l => l.status === 'COMPLETED').length, sportBreakdown: buildSportBreakdown(history.lobbies) }
    : stats;

  return (
    <div className="profile-page page" id="profile-page">
      <div className="container">

        {/* Hero Card */}
        <div className="profile-hero card card-body">
          <div className="profile-avatar-section">
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} className="avatar avatar-xl profile-avatar" alt={profile.name} />
              : <div className="avatar avatar-xl avatar-placeholder profile-avatar" style={{ fontSize: 28 }}>{profile.name?.[0]}</div>}
            {isMe && <label className="avatar-upload-btn btn btn-outline btn-sm mt-2"><input type="file" accept="image/*" onChange={handleAvatar} hidden />📷 Photo</label>}
          </div>

          <div className="profile-info">
            {editing ? (
              <div className="profile-edit-form">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bio <span className="text-muted">(max 300)</span></label>
                  <textarea className="input" rows={3} maxLength={300} placeholder="Tell others about yourself…" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
                  <span className="char-count">{form.bio.length}/300</span>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">WhatsApp</label>
                    <input className="input" placeholder="+92 3XX XXXXXXX" value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input className="input" placeholder="e.g. Islamabad, Pakistan" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Skill Level</label>
                  <div className="skill-selector">
                    {SKILL_LEVELS.map(sl => (
                      <button key={sl} type="button" className={`skill-btn ${form.skillLevel === sl ? 'selected' : ''}`}
                        style={form.skillLevel === sl ? { background: SKILL_COLORS[sl].bg, color: SKILL_COLORS[sl].color, borderColor: SKILL_COLORS[sl].color } : {}}
                        onClick={() => setForm({ ...form, skillLevel: sl })}>{sl}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Sport Preferences</label>
                  <div className="filter-chips">
                    {SPORTS.map(s => <button key={s} type="button" className={`filter-chip ${form.preferences.includes(s) ? 'active' : ''}`} onClick={() => togglePref(s)}>{s}</button>)}
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={form.ringerMode} onChange={e => setForm({ ...form, ringerMode: e.target.checked })} />
                  <span className="text-sm">🚨 Ringer Mode</span>
                </label>
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="profile-name-row">
                  <h1>{profile.name}</h1>
                  {profile.ringerMode && <span className="badge badge-open ml-2">🚨 Ringer</span>}
                </div>
                <div className="profile-meta-chips">
                  {profile.skillLevel && <span className="skill-badge" style={{ background: skillStyle.bg, color: skillStyle.color }}>⚡ {profile.skillLevel}</span>}
                  {profile.displayLocation && <span className="location-chip">📍 {profile.displayLocation}</span>}
                  {isMe && <span className="text-secondary text-sm">{profile.email}</span>}
                </div>
                {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                <div className="profile-prefs mt-3">{profile.preferences?.map(s => <span key={s} className="badge badge-sport">{s}</span>)}</div>
                <div className="profile-actions mt-4">
                  {isMe && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>✏️ Edit Profile</button>}
                  {isMe && <Link to="/history" className="btn btn-outline btn-sm">📋 Full History</Link>}
                  {!isMe && <button className="btn btn-primary btn-sm" onClick={() => navigate(`/messages?user=${profile._id}`)}>✉️ Message</button>}
                  {!isMe && <Link to={`/history/${profile._id}`} className="btn btn-outline btn-sm">📋 Match History</Link>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        {myStats && !editing && (
          <div className="stats-row">
            {[['Matches', myStats.totalMatches], ['Organized', myStats.asOrganizer], ['Completed', myStats.completedMatches], ['Sports', myStats.sportBreakdown?.length || 0]].map(([label, val]) => (
              <div key={label} className="stat-card">
                <span className="stat-value">{val}</span>
                <span className="stat-label">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sport Breakdown */}
        {myStats?.sportBreakdown?.length > 0 && !editing && (
          <div className="card card-body mt-4">
            <h3 className="mb-3">Sport Breakdown</h3>
            <div className="sport-breakdown">
              {myStats.sportBreakdown.map(({ sport, count }) => {
                const max = myStats.sportBreakdown[0]?.count || 1;
                return (
                  <div key={sport} className="sport-bar-row">
                    <span className="sport-bar-label">{sport}</span>
                    <div className="sport-bar-track"><div className="sport-bar-fill" style={{ width: `${Math.round((count / max) * 100)}%` }} /></div>
                    <span className="sport-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completeness nudge */}
        {isMe && completeness < 100 && !editing && (
          <div className="completeness-card card card-body mt-4">
            <div className="completeness-header">
              <h3>Complete Your Profile</h3>
              <span className="completeness-pct">{completeness}%</span>
            </div>
            <div className="completeness-bar-track"><div className="completeness-bar-fill" style={{ width: `${completeness}%` }} /></div>
            <div className="completeness-checklist">
              {completenessChecks.map(c => (
                <div key={c.label} className={`completeness-item ${c.done ? 'done' : ''}`}>
                  <span>{c.done ? '✅' : '⬜'}</span><span>{c.label}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-sm mt-3" onClick={() => setEditing(true)}>Complete Now →</button>
          </div>
        )}

        {/* Recent Matches */}
        <div className="mt-6">
          <div className="section-header">
            <h2>{isMe ? 'Recent Matches' : `${profile.name}'s Matches`}</h2>
            <Link to={isMe ? '/history' : `/history/${profile._id}`} className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          {history.lobbies?.length === 0 ? <p className="text-muted">No matches yet.</p> : (
            <div className="history-list">
              {history.lobbies.slice(0, 5).map(l => (
                <Link key={l._id} to={`/lobby/${l._id}`} className="history-item card card-body">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{l.sport} — {l.matchFormat}-a-side</span>
                      <p className="text-sm text-muted">{l.location?.address || l.location?.city || 'TBD'} · {new Date(l.dateTime).toLocaleDateString()}</p>
                    </div>
                    <span className={`badge badge-${l.status?.toLowerCase()}`}>{l.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Squads */}
        {history.squads?.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-4">{isMe ? 'My Squads' : `${profile.name}'s Squads`}</h2>
            <div className="history-list">
              {history.squads.map(s => (
                <Link key={s._id} to={`/squad/${s._id}`} className="history-item card card-body">
                  <div className="flex justify-between items-center">
                    <div><span className="font-semibold">{s.name}</span><p className="text-sm text-muted">{s.sport} · Captain: {s.captainId?.name}</p></div>
                    <span className="text-sm text-secondary">{s.stats?.matchesPlayed || 0} matches</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Venues */}
        {venues.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-4">🏟️ {profile.name}'s Venues</h2>
            <div className="history-list">
              {venues.map(v => (
                <Link key={v._id} to={`/venue/${v._id}`} className="history-item card card-body">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{v.name}</span>
                      <p className="text-sm text-muted">📍 {v.location?.address || 'No address'}</p>
                      <div className="flex gap-2 mt-1" style={{ flexWrap: 'wrap' }}>{v.sportsSupported?.map(s => <span key={s} className="badge badge-sport" style={{ fontSize: 10 }}>{s}</span>)}</div>
                    </div>
                    <span className="badge badge-approved">✅ Verified</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
