import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const SquadProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [squad, setSquad] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [addingUser, setAddingUser] = useState(false);

  const isCaptain = squad?.captainId?._id === user?._id;
  const isMember = squad?.roster?.some(r => (r._id || r) === user?._id);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [sRes, hRes] = await Promise.all([api.get(`/squads/${id}`), api.get(`/squads/${id}/history`)]);
        setSquad(sRes.data.squad);
        setHistory(hRes.data.lobbies);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addEmail) return;
    setAddingUser(true);
    try {
      const res = await api.post(`/squads/${id}/members`, { email: addEmail });
      setSquad(res.data.squad);
      setAddEmail('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      const res = await api.delete(`/squads/${id}/members/${userId}`);
      setSquad(res.data.squad);
    } catch (err) { alert('Failed to remove'); }
  };

  const handleLeaveSquad = async () => {
    if (!confirm('Are you sure you want to leave the squad?')) return;
    try {
      await api.post(`/squads/${id}/leave`);
      window.location.href = '/squads';
    } catch (err) { alert('Failed to leave'); }
  };

  if (loading) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;
  if (!squad) return <div className="page container"><h2>Squad not found</h2></div>;

  return (
    <div className="page" id="squad-profile-page">
      <div className="container" style={{maxWidth:800}}>
        <div className="card card-body mb-6">
          <div className="flex items-center gap-4 mb-4">
            {squad.logoUrl ? <img src={squad.logoUrl} className="avatar avatar-xl" alt="" /> : <div className="avatar avatar-xl avatar-placeholder" style={{fontSize:24}}>{squad.name?.[0]}</div>}
            <div>
              <h1 style={{margin:0}}>{squad.name}</h1>
              <span className="badge badge-sport mt-1">{squad.sport}</span>
              {isCaptain && <span className="badge badge-open ml-2">Captain</span>}
            </div>
          </div>
          {squad.description && <p className="text-secondary">{squad.description}</p>}
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 style={{margin:0}}>Roster ({squad.roster?.length})</h2>
          {isMember && !isCaptain && (
            <button className="btn btn-outline btn-sm" onClick={handleLeaveSquad}>Leave Squad</button>
          )}
        </div>
        
        {isCaptain && (
          <form className="flex gap-2 mb-4" onSubmit={handleAddMember}>
            <input type="email" className="input flex-1" placeholder="Add member by email..." value={addEmail} onChange={e => setAddEmail(e.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={addingUser}>{addingUser ? '...' : 'Add'}</button>
          </form>
        )}
        <div className="flex flex-col gap-2 mb-6">
          {squad.roster?.map(m => (
            <div key={m._id || m} className="card card-body flex items-center justify-between gap-3" style={{padding:'var(--space-3) var(--space-4)'}}>
              <div className="flex items-center gap-3">
                {m.avatarUrl ? <img src={m.avatarUrl} className="avatar avatar-sm" alt="" /> : <div className="avatar avatar-sm avatar-placeholder">{m.name?.[0]}</div>}
                <span className="font-medium">{m.name}</span>
                {(m._id || m) === squad.captainId?._id && <span className="badge badge-sport ml-2">Captain</span>}
              </div>
              {isCaptain && (m._id || m) !== squad.captainId?._id && (
                <button className="btn btn-icon text-muted" onClick={() => handleRemoveMember(m._id || m)}>✕</button>
              )}
            </div>
          ))}
        </div>

        <h2 className="mb-4">Match History</h2>
        {history.length === 0 ? <p className="text-muted">No matches yet.</p> : (
          <div className="flex flex-col gap-2">
            {history.map(l => (
              <a key={l._id} href={`/lobby/${l._id}`} className="card card-body flex justify-between items-center" style={{textDecoration:'none',color:'inherit',padding:'var(--space-3) var(--space-4)'}}>
                <span>{l.sport} — {l.matchFormat}-a-side</span>
                <span className={`badge badge-${l.status.toLowerCase()}`}>{l.status}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SquadProfile;


