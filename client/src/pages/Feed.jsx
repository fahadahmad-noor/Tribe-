import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import LobbyCard from '../components/lobby/LobbyCard';
import PAKISTAN_CITIES from '../data/pakistan_cities';
import api from '../api/axios';
import '../styles/pages/Feed.css';

const SPORTS = ['All', 'Football', 'Cricket', 'Basketball', 'Tennis', 'Padel', 'Volleyball', 'Badminton', 'Pickleball', 'TableTennis'];
const RADII = [5, 10, 25, 50];

const Feed = () => {
  const { socket } = useSocket();
  const [feedTab, setFeedTab] = useState('open');        // 'open' | 'past'
  const [lobbies, setLobbies]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sportFilter, setSportFilter] = useState('All');

  // Location state
  const [city, setCity]         = useState('');
  const [nearMe, setNearMe]     = useState(false);
  const [geo, setGeo]           = useState(null);        // { lat, lng }
  const [radiusKm, setRadiusKm] = useState(10);
  const [geoError, setGeoError] = useState('');

  // Pagination
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore]       = useState(false);

  // ── Geo ────────────────────────────────────────────────────────
  const handleNearMe = () => {
    if (nearMe) {
      setNearMe(false);
      setGeo(null);
      setGeoError('');
      return;
    }
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGeo({ lat: coords.latitude, lng: coords.longitude });
        setNearMe(true);
        setCity('');       // mutually exclusive with city
        setGeoError('');
      },
      () => {
        setGeoError('Location access denied. Please allow location or use city filter.');
      }
    );
  };

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchLobbies = useCallback(async (cursor = null) => {
    try {
      setLoading(true);
      const params = { limit: 20, country: 'Pakistan' };

      if (feedTab === 'past') params.status = 'COMPLETED';
      // else default OPEN

      if (sportFilter !== 'All') params.sport = sportFilter;

      if (nearMe && geo) {
        params.lat      = geo.lat;
        params.lng      = geo.lng;
        params.radiusKm = radiusKm;
      } else if (city) {
        params.city = city;
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
  }, [sportFilter, city, nearMe, geo, radiusKm, feedTab]);

  // Reset cursor whenever filters change
  useEffect(() => {
    setNextCursor(null);
    setHasMore(false);
    fetchLobbies();
  }, [fetchLobbies]);

  // ── Real-time (only relevant for open tab) ─────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_feed');
    const handleCreated = (lobby) => { if (feedTab === 'open') setLobbies(prev => [lobby, ...prev]); };
    const handleUpdated = (lobby) => { setLobbies(prev => prev.map(l => l._id === lobby._id ? lobby : l)); };
    socket.on('lobby_created', handleCreated);
    socket.on('lobby_updated', handleUpdated);
    return () => {
      socket.emit('leave_feed');
      socket.off('lobby_created', handleCreated);
      socket.off('lobby_updated', handleUpdated);
    };
  }, [socket, feedTab]);

  const emptyMsg = feedTab === 'past'
    ? { icon: '📜', title: 'No past matches found', sub: 'Try changing your filters.' }
    : { icon: '🏟️', title: 'No open lobbies', sub: 'Be the first to create a game!' };

  return (
    <div className="feed-page page" id="feed-page">
      <div className="container">

        {/* Header */}
        <div className="feed-header">
          <div>
            <h1>Live Feed</h1>
            <p className="text-secondary">Open games near you, updated in real-time.</p>
          </div>
          <Link to="/lobby/create" className="btn btn-primary" id="feed-create-btn">+ Create Lobby</Link>
        </div>

        {/* Feed tabs */}
        <div className="feed-tabs mb-4">
          <button
            className={`feed-tab-btn ${feedTab === 'open' ? 'active' : ''}`}
            onClick={() => setFeedTab('open')}
          >
            🟢 Open
          </button>
          <button
            className={`feed-tab-btn ${feedTab === 'past' ? 'active' : ''}`}
            onClick={() => setFeedTab('past')}
          >
            📜 Past Matches
          </button>
        </div>

        {/* Sport chips */}
        <div className="feed-filters">
          {SPORTS.map(sport => (
            <button
              key={sport}
              className={`filter-chip ${sportFilter === sport ? 'active' : ''}`}
              onClick={() => setSportFilter(sport)}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Location bar */}
        <div className="location-filter-bar">
          <button
            className={`btn btn-sm near-me-btn ${nearMe ? 'active' : ''}`}
            onClick={handleNearMe}
            id="near-me-btn"
          >
            📍 {nearMe ? 'Near Me ✓' : 'Near Me'}
          </button>

          {nearMe && geo && (
            <div className="radius-control">
              <span className="text-sm text-muted">Radius:</span>
              {RADII.map(r => (
                <button
                  key={r}
                  className={`radius-chip ${radiusKm === r ? 'active' : ''}`}
                  onClick={() => setRadiusKm(r)}
                >
                  {r} km
                </button>
              ))}
            </div>
          )}

          {!nearMe && (
            <select
              className="input input-sm"
              value={city}
              onChange={e => setCity(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="">All Cities (Pakistan)</option>
              {PAKISTAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {geoError && <span className="geo-error text-sm">{geoError}</span>}
        </div>

        {/* Grid */}
        {loading && lobbies.length === 0 ? (
          <div className="grid grid-auto gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton skeleton-card" />)}
          </div>
        ) : lobbies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{emptyMsg.icon}</div>
            <h3>{emptyMsg.title}</h3>
            <p>{emptyMsg.sub}</p>
            {feedTab === 'open' && (
              <Link to="/lobby/create" className="btn btn-primary mt-4">Create Lobby</Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-auto gap-4 lobby-grid">
              {lobbies.map(lobby => <LobbyCard key={lobby._id} lobby={lobby} />)}
            </div>
            {hasMore && (
              <div className="text-center mt-6">
                <button
                  className="btn btn-outline"
                  onClick={() => fetchLobbies(nextCursor)}
                  disabled={loading}
                >
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
