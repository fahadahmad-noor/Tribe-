import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import LobbyCard from '../components/lobby/LobbyCard';
import api from '../api/axios';
import '../styles/pages/Feed.css';

const SPORTS = ['All', 'Football', 'Cricket', 'Basketball', 'Tennis', 'Padel', 'Volleyball', 'Badminton', 'Pickleball', 'TableTennis'];

const Feed = () => {
  const { socket } = useSocket();
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('All');
  
  // Location filters
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [radiusKm, setRadiusKm] = useState('25');
  const [coords, setCoords] = useState(null); // { lng, lat }
  const [locating, setLocating] = useState(false);

  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchLobbies = useCallback(async (cursor = null) => {
    try {
      setLoading(true);
      const params = { limit: 20 };
      if (sportFilter !== 'All') params.sport = sportFilter;
      if (city) params.city = city;
      if (country) params.country = country;
      if (coords) {
        params.lng = coords.lng;
        params.lat = coords.lat;
        params.radiusKm = radiusKm === 'All' ? '100000' : radiusKm;
      }
      if (cursor) params.cursor = cursor;

      const res = await api.get('/lobbies', { params });
      if (cursor) {
        setLobbies(prev => [...prev, ...res.data.lobbies]);
      } else {
        setLobbies(res.data.lobbies);
      }
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    } catch (err) {
      console.error('Feed error:', err);
    } finally {
      setLoading(false);
    }
  }, [sportFilter, city, country, radiusKm, coords]);

  useEffect(() => { fetchLobbies(); }, [fetchLobbies]);

  const handleNearMe = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        alert('Could not get location. Ensure permissions are granted.');
        setLocating(false);
      }
    );
  };

  // Real-time updates
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_feed');

    const handleCreated = (lobby) => { setLobbies(prev => [lobby, ...prev]); };
    const handleUpdated = (lobby) => { setLobbies(prev => prev.map(l => l._id === lobby._id ? lobby : l)); };

    socket.on('lobby_created', handleCreated);
    socket.on('lobby_updated', handleUpdated);

    return () => {
      socket.emit('leave_feed');
      socket.off('lobby_created', handleCreated);
      socket.off('lobby_updated', handleUpdated);
    };
  }, [socket]);

  return (
    <div className="feed-page page" id="feed-page">
      <div className="container">
        <div className="feed-header">
          <div>
            <h1>Live Feed</h1>
            <p className="text-secondary">Open games near you, updated in real-time.</p>
          </div>
          <Link to="/lobby/create" className="btn btn-primary" id="feed-create-btn">+ Create Lobby</Link>
        </div>

        {/* Sport Filter */}
        <div className="feed-filters">
          {SPORTS.map(sport => (
            <button key={sport} className={`filter-chip ${sportFilter === sport ? 'active' : ''}`} onClick={() => setSportFilter(sport)}>
              {sport}
            </button>
          ))}
        </div>

        {/* Location Filters */}
        <div className="location-filter-bar">
          <button className={`btn btn-sm ${coords ? 'btn-primary' : 'btn-outline'}`} onClick={coords ? () => setCoords(null) : handleNearMe} disabled={locating}>
            {locating ? '⏳ Locating...' : coords ? '✖ Clear Location' : '📍 Near Me'}
          </button>
          {coords && (
            <select className="input input-sm radius-select" value={radiusKm} onChange={e => setRadiusKm(e.target.value)}>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
              <option value="All">Any Distance</option>
            </select>
          )}
          <input type="text" className="input input-sm flex-1" placeholder="City (e.g. Dubai)" value={city} onChange={e => setCity(e.target.value)} />
          <input type="text" className="input input-sm flex-1" placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} />
        </div>

        {/* Lobby Grid */}
        {loading && lobbies.length === 0 ? (
          <div className="grid grid-auto gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton skeleton-card" />)}
          </div>
        ) : lobbies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏟️</div>
            <h3>No open lobbies</h3>
            <p>Be the first to create a game!</p>
            <Link to="/lobby/create" className="btn btn-primary mt-4">Create Lobby</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-auto gap-4 lobby-grid">
              {lobbies.map(lobby => <LobbyCard key={lobby._id} lobby={lobby} />)}
            </div>
            {hasMore && (
              <div className="text-center mt-6">
                <button className="btn btn-outline" onClick={() => fetchLobbies(nextCursor)} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Feed;


