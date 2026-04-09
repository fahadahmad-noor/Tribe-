import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const VenueDirectory = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = {};
        if (sportFilter) params.sport = sportFilter;
        const res = await api.get('/venues', { params });
        setVenues(res.data.venues);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [sportFilter]);

  return (
    <div className="page" id="venue-directory-page">
      <div className="container">
        <div className="flex justify-between items-start mb-6">
          <div><h1>Venues</h1><p className="text-secondary">Discover verified sports venues.</p></div>
          <Link to="/venue/apply" className="btn btn-outline">Apply as Venue</Link>
        </div>
        <div className="flex gap-3 mb-6">
          <select className="select" style={{maxWidth:200}} value={sportFilter} onChange={e=>setSportFilter(e.target.value)}>
            <option value="">All Sports</option>
            {['Football','Cricket','Basketball','Tennis','Padel','Volleyball','Badminton','Pickleball','TableTennis'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {loading ? <div className="grid grid-auto gap-4">{[1,2,3].map(i=><div key={i} className="skeleton skeleton-card" />)}</div> : venues.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🏟️</div><h3>No venues found</h3><p>Be the first venue partner!</p></div>
        ) : (
          <div className="grid grid-auto gap-4">
            {venues.map(v => (
              <Link to={`/venue/${v._id}`} key={v._id} className="card" style={{textDecoration:'none',color:'inherit'}}>
                <div className="card-body">
                  <h3 style={{marginBottom:'var(--space-2)'}}>{v.name}</h3>
                  <p className="text-sm text-secondary mb-2">📍 {v.location?.address}</p>
                  <div className="flex flex-wrap gap-1 mb-2">{v.sportsSupported?.map(s => <span key={s} className="badge badge-sport">{s}</span>)}</div>
                  <div className="flex flex-wrap gap-1">{v.amenities?.map(a => <span key={a} className="badge badge-completed">{a}</span>)}</div>
                </div>
                <div className="card-footer text-sm">
                  <span>{v.pitches?.length || 0} pitches</span>
                  <span className="badge badge-open">Verified ✓</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueDirectory;


