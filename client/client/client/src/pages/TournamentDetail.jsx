import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const TournamentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mySquads, setMySquads] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [tRes, sRes] = await Promise.all([api.get(`/tournaments/${id}`), api.get('/users/me/squads')]);
        setTournament(tRes.data.tournament);
        setMySquads(sRes.data.squads);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  const handleRegister = async (squadId) => {
    try {
      const res = await api.post(`/tournaments/${id}/register`, { squadId });
      setTournament(res.data.tournament);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;
  if (!tournament) return <div className="page container"><h2>Tournament not found</h2></div>;

  const canRegister = tournament.status === 'REGISTRATION_OPEN' && tournament.registeredSquads.length < tournament.maxTeams;
  const captainSquads = mySquads.filter(s => s.captainId?._id === user?._id && !tournament.registeredSquads?.some(rs => (rs._id || rs) === s._id));

  return (
    <div className="page" id="tournament-detail-page">
      <div className="container" style={{maxWidth:800}}>
        <div className="card card-body mb-6">
          <div className="flex justify-between items-start mb-3">
            <h1 style={{margin:0}}>{tournament.name}</h1>
            <span className={`badge badge-${tournament.status === 'REGISTRATION_OPEN' ? 'open' : 'locked'}`}>{tournament.status.replace(/_/g,' ')}</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="badge badge-sport">{tournament.sport}</span>
            <span className="badge badge-completed">{tournament.format?.replace(/_/g,' ')}</span>
            <span className="badge badge-completed">{tournament.matchFormat}-a-side</span>
          </div>
          <p className="text-secondary">📍 {tournament.venueId?.name || 'TBD'}</p>
          <p className="text-secondary">📅 {new Date(tournament.startDate).toLocaleDateString()} — {new Date(tournament.endDate).toLocaleDateString()}</p>
          <p className="text-mono mt-3">{tournament.registeredSquads?.length || 0} / {tournament.maxTeams} teams registered</p>
          {tournament.entryFee && tournament.entryFee !== 'Free' && <p className="mt-2">💰 Entry: {tournament.entryFee}</p>}
          {tournament.rules && <div className="mt-4"><h3>Rules</h3><p className="text-secondary mt-1">{tournament.rules}</p></div>}
        </div>

        {canRegister && captainSquads.length > 0 && (
          <div className="card card-body mb-6">
            <h3>Register Your Squad</h3>
            <div className="flex flex-col gap-2 mt-3">
              {captainSquads.map(s => (
                <div key={s._id} className="flex justify-between items-center">
                  <span className="font-medium">{s.name}</span>
                  <button className="btn btn-primary btn-sm" onClick={() => handleRegister(s._id)}>Register</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="mb-4">Registered Teams ({tournament.registeredSquads?.length})</h2>
        <div className="flex flex-col gap-2">
          {tournament.registeredSquads?.map(s => (
            <a key={s._id || s} href={`/squad/${s._id || s}`} className="card card-body flex items-center gap-3" style={{textDecoration:'none',color:'inherit',padding:'var(--space-3) var(--space-4)'}}>
              {s.logoUrl ? <img src={s.logoUrl} className="avatar avatar-sm" alt="" /> : <div className="avatar avatar-sm avatar-placeholder">{s.name?.[0]}</div>}
              <span className="font-medium">{s.name || 'Team'}</span>
              <span className="text-sm text-muted" style={{marginLeft:'auto'}}>👥 {s.roster?.length || '?'}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentDetail;


