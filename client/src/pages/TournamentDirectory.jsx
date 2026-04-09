import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const TournamentDirectory = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = {};
        if (sportFilter) params.sport = sportFilter;
        const res = await api.get('/tournaments', { params });
        setTournaments(res.data.tournaments);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [sportFilter]);

  return (
    <div className="page" id="tournament-directory-page">
      <div className="container">
        <div className="flex justify-between items-start mb-6">
          <div><h1>🏆 Tournaments</h1><p className="text-secondary">Compete in organized multi-team events.</p></div>
        </div>
        <div className="flex gap-3 mb-6">
          <select className="select" style={{maxWidth:200}} value={sportFilter} onChange={e=>setSportFilter(e.target.value)}>
            <option value="">All Sports</option>
            {['Football','Cricket','Basketball','Tennis','Padel','Volleyball'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {loading ? <div className="grid grid-auto gap-4">{[1,2,3].map(i=><div key={i} className="skeleton skeleton-card" />)}</div> : tournaments.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🏆</div><h3>No tournaments</h3><p>Check back soon!</p></div>
        ) : (
          <div className="grid grid-auto gap-4">
            {tournaments.map(t => (
              <Link to={`/tournament/${t._id}`} key={t._id} className="card card-body" style={{textDecoration:'none',color:'inherit'}}>
                <div className="flex justify-between items-start mb-2">
                  <h3 style={{margin:0}}>{t.name}</h3>
                  <span className={`badge badge-${t.status === 'REGISTRATION_OPEN' ? 'open' : t.status === 'IN_PROGRESS' ? 'locked' : 'completed'}`}>{t.status.replace(/_/g,' ')}</span>
                </div>
                <span className="badge badge-sport mb-2">{t.sport}</span>
                <p className="text-sm text-muted">📍 {t.venueId?.name || 'TBD'}</p>
                <p className="text-sm text-muted">📅 {new Date(t.startDate).toLocaleDateString()} — {new Date(t.endDate).toLocaleDateString()}</p>
                <div className="flex justify-between items-center mt-3 text-sm">
                  <span className="text-mono">{t.format?.replace(/_/g,' ')}</span>
                  <span className="text-mono">{t.registeredSquads?.length || 0}/{t.maxTeams} teams</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentDirectory;


