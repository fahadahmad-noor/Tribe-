import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Challenges = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mySquads, setMySquads] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [cRes, sRes] = await Promise.all([api.get('/challenges'), api.get('/users/me/squads')]);
        setChallenges(cRes.data.challenges);
        setMySquads(sRes.data.squads.filter(s => s.captainId?._id === user?._id));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [user?._id]);

  const handleAccept = async (challengeId, squadId) => {
    try {
      const res = await api.patch(`/challenges/${challengeId}/accept`, { squadId });
      setChallenges(prev => prev.map(c => c._id === challengeId ? { ...c, status: 'ACCEPTED' } : c));
      alert('Challenge accepted! Lobby created.');
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="page" id="challenges-page">
      <div className="container">
        <div className="flex justify-between items-start mb-6">
          <div><h1>⚔️ Squad Challenges</h1><p className="text-secondary">Browse and accept open squad vs squad challenges.</p></div>
        </div>
        {loading ? <div className="grid grid-auto gap-4">{[1,2].map(i=><div key={i} className="skeleton skeleton-card" />)}</div> : challenges.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">⚔️</div><h3>No open challenges</h3><p>Post one from your squad profile!</p></div>
        ) : (
          <div className="grid grid-auto gap-4">
            {challenges.map(c => (
              <div key={c._id} className="card card-body">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="avatar avatar-placeholder">{c.challengerSquadId?.name?.[0]}</div>
                    <div>
                      <h3 style={{margin:0}}>{c.challengerSquadId?.name}</h3>
                      <span className="badge badge-sport">{c.sport}</span>
                    </div>
                  </div>
                  <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                </div>
                <p className="text-sm text-muted">📅 {new Date(c.proposedDateTime).toLocaleString()}</p>
                <p className="text-sm text-mono">Format: {c.matchFormat}-a-side</p>
                {c.message && <p className="text-sm text-secondary mt-2">"{c.message}"</p>}
                {c.status === 'OPEN' && mySquads.length > 0 && (
                  <div className="mt-3">
                    {mySquads.filter(s => s._id !== c.challengerSquadId?._id).map(s => (
                      <button key={s._id} className="btn btn-secondary btn-sm mr-2" onClick={() => handleAccept(c._id, s._id)}>
                        Accept as {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Challenges;


