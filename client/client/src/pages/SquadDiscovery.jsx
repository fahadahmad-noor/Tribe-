import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const SquadDiscovery = () => {
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = {};
        if (sportFilter) params.sport = sportFilter;
        if (search) params.search = search;
        const res = await api.get('/squads', { params });
        setSquads(res.data.squads);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [sportFilter, search]);

  return (
    <div className="page" id="squad-discovery-page">
      <div className="container">
        <div className="flex justify-between items-start mb-6">
          <div><h1>Squads</h1><p className="text-secondary">Find and join teams.</p></div>
          <Link to="/squads/create" className="btn btn-primary">+ Create Squad</Link>
        </div>
        <div className="flex gap-3 mb-6 flex-wrap">
          <input className="input" style={{maxWidth:240}} placeholder="Search squads..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="select" style={{maxWidth:180}} value={sportFilter} onChange={e=>setSportFilter(e.target.value)}>
            <option value="">All Sports</option>
            {['Football','Cricket','Basketball','Tennis','Padel','Volleyball','Badminton','Pickleball','TableTennis'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {loading ? <div className="grid grid-auto gap-4">{[1,2,3].map(i=><div key={i} className="skeleton skeleton-card" />)}</div> : squads.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">👥</div><h3>No squads found</h3><p>Be the first to create one!</p></div>
        ) : (
          <div className="grid grid-auto gap-4">
            {squads.map(s => (
              <Link to={`/squad/${s._id}`} key={s._id} className="card card-body" style={{textDecoration:'none',color:'inherit'}}>
                <div className="flex items-center gap-3 mb-3">
                  {s.logoUrl ? <img src={s.logoUrl} className="avatar avatar-lg" alt="" /> : <div className="avatar avatar-lg avatar-placeholder">{s.name?.[0]}</div>}
                  <div><h3 style={{margin:0}}>{s.name}</h3><span className="badge badge-sport">{s.sport}</span></div>
                </div>
                <div className="flex justify-between text-sm text-muted">
                  <span>👥 {s.roster?.length || 0} members</span>
                  <span>🏆 {s.stats?.wins || 0}W / {s.stats?.losses || 0}L</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SquadDiscovery;


