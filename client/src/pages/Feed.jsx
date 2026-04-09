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
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchLobbies = useCallback(async (cursor = null) => {
    try {
      setLoading(true);
      const params = { limit: 20 };
      if (sportFilter !== 'All') params.sport = sportFilter;
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
  }, [sportFilter]);

  useEffect(() => { fetchLobbies(); }, [fetchLobbies]);

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


