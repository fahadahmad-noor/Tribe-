import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import '../styles/pages/Profile.css';

const Profile = () => {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const isMe = id === 'me' || id === user?._id;
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState({ lobbies: [], requests: [] });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (isMe) {
          const [profRes, histRes] = await Promise.all([api.get('/users/me'), api.get('/users/me/history')]);
          setProfile(profRes.data.user);
          setHistory(histRes.data);
          setForm({ name: profRes.data.user.name, whatsappNumber: profRes.data.user.whatsappNumber || '', ringerMode: profRes.data.user.ringerMode });
        } else {
          const res = await api.get(`/users/${id}`);
          setProfile(res.data.user);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, isMe]);

  const handleSave = async () => {
    try {
      const res = await api.patch('/users/me', form);
      setProfile(res.data.user);
      updateUser(res.data.user);
      setEditing(false);
    } catch (err) { alert('Failed to save'); }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(p => ({ ...p, avatarUrl: res.data.avatarUrl }));
      updateUser({ avatarUrl: res.data.avatarUrl });
    } catch (err) { alert('Upload failed'); }
  };

  if (loading) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;
  if (!profile) return <div className="page container"><h2>User not found</h2></div>;

  return (
    <div className="profile-page page" id="profile-page">
      <div className="container">
        <div className="profile-header card card-body">
          <div className="profile-avatar-section">
            {profile.avatarUrl ? <img src={profile.avatarUrl} className="avatar avatar-xl" alt="" /> : <div className="avatar avatar-xl avatar-placeholder" style={{ fontSize: 24 }}>{profile.name?.[0]}</div>}
            {isMe && <label className="avatar-upload-btn btn btn-outline btn-sm mt-2"><input type="file" accept="image/*" onChange={handleAvatar} hidden />Change Photo</label>}
          </div>
          <div className="profile-info">
            {editing ? (
              <div className="flex flex-col gap-3">
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <input className="input" placeholder="WhatsApp" value={form.whatsappNumber} onChange={e => setForm({...form, whatsappNumber: e.target.value})} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.ringerMode} onChange={e => setForm({...form, ringerMode: e.target.checked})} />
                  <span className="text-sm">Ringer Mode (Ready to play now)</span>
                </label>
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1>{profile.name}</h1>
                <p className="text-secondary">{profile.email}</p>
                {profile.whatsappNumber && <p className="text-secondary">📱 {profile.whatsappNumber}</p>}
                {profile.ringerMode && <span className="badge badge-open mt-2 d-inline-block">🚨 Ringer Mode Active</span>}
                <div className="profile-prefs mt-3">{profile.preferences?.map(s => <span key={s} className="badge badge-sport">{s}</span>)}</div>
                {isMe && <button className="btn btn-outline btn-sm mt-4" onClick={() => setEditing(true)}>Edit Profile</button>}
              </>
            )}
          </div>
        </div>

        {/* Match History */}
        {isMe && (
          <div className="mt-6">
            <h2 className="mb-4">Match History</h2>
            {history.lobbies?.length === 0 ? <p className="text-muted">No matches yet.</p> : (
              <div className="history-list">
                {history.lobbies?.slice(0, 20).map(l => (
                  <a key={l._id} href={`/lobby/${l._id}`} className="history-item card card-body">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold">{l.sport} — {l.matchFormat}-a-side</span>
                        <p className="text-sm text-muted">{new Date(l.dateTime).toLocaleDateString()}</p>
                      </div>
                      <span className={`badge badge-${l.status.toLowerCase()}`}>{l.status}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;


