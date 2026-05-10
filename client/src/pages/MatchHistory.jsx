import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import '../styles/pages/MatchHistory.css';

const SPORTS = ['All', 'Football', 'Cricket', 'Basketball', 'Tennis', 'Padel', 'Volleyball', 'Badminton', 'Pickleball', 'TableTennis'];
const STATUSES = ['All', 'OPEN', 'LOCKED', 'COMPLETED', 'CANCELLED'];
const ROLES = ['all', 'organizer', 'player'];
const DATE_RANGES = [
  { label: 'All Time', from: null },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 3 Months', days: 90 },
];

function getFromDate(range) {
  if (!range || !range.days) return null;
  const d = new Date();
  d.setDate(d.getDate() - range.days);
  return d.toISOString();
}

const statusColors = {
  OPEN: 'badge-open',
  LOCKED: 'badge-locked',
  COMPLETED: 'badge-completed',
  CANCELLED: 'badge-cancelled',
};

const MatchHistory = () => {
  const { id } = useParams();          // optional: /history/:userId
  const { user } = useAuth();
  const navigate = useNavigate();

  const targetId = id || user?._id;
  const isMe = !id || id === user?._id;

  // Filters
  const [sport, setSport]       = useState('All');
  const [status, setStatus]     = useState('All');
  const [role, setRole]         = useState('all');
  const [dateRange, setDateRange] = useState(DATE_RANGES[0]);

  // Data
  const [lobbies, setLobbies]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [hasMore, setHasMore]   = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [profileName, setProfileName] = useState('');

  // Fetch profile name for non-me views
  useEffect(() => {
    if (!isMe && targetId) {
      api.get(`/users/${targetId}`).then(r => setProfileName(r.data.user?.name || '')).catch(() => {});
    }
  }, [isMe, targetId]);

  const fetchHistory = useCallback(async (cursor = null) => {
    if (!targetId) return;
    try {
      setLoading(true);
      const params = { limit: 20 };
      if (sport !== 'All') params.sport = sport;
      if (status !== 'All') params.status = status;
      if (role !== 'all') params.role = role;
      const fromDate = getFromDate(dateRange);
      if (fromDate) params.from = fromDate;
      if (cursor) params.cursor = cursor;

      // For own history use /users/me/history; for others use public profile lobbies
      const res = await api.get('/users/me/history', { params });
      const data = res.data;

      if (cursor) {
        setLobbies(prev => [...prev, ...(data.lobbies || [])]);
      } else {
        setLobbies(data.lobbies || []);
      }
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      console.error('MatchHistory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [targetId, sport, status, role, dateRange]);

  // Reset + fetch when filters change
  useEffect(() => {
    setNextCursor(null);
    setHasMore(false);
    fetchHistory();
  }, [fetchHistory]);

  const totalShown = lobbies.length;

  return (
    <div className="match-history-page page" id="match-history-page">
      <div className="container">

        {/* Header */}
        <div className="history-page-header">
          <div>
            <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate(-1)}>
              ← Back
            </button>
            <h1>{isMe ? 'My Match History' : `${profileName || 'Player'}'s Match History`}</h1>
            <p className="text-secondary">
              {totalShown} match{totalShown !== 1 ? 'es' : ''} shown
            </p>
          </div>
          {isMe && (
            <Link to={`/profile/${user?._id}`} className="btn btn-outline btn-sm">
              👤 My Profile
            </Link>
          )}
        </div>

        {/* Filter Bar */}
        <div className="history-filters card card-body">

          {/* Sport chips */}
          <div className="filter-section">
            <span className="filter-label">Sport</span>
            <div className="filter-chips">
              {SPORTS.map(s => (
                <button
                  key={s}
                  className={`filter-chip ${sport === s ? 'active' : ''}`}
                  onClick={() => setSport(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Status tabs */}
          <div className="filter-section">
            <span className="filter-label">Status</span>
            <div className="filter-chips">
              {STATUSES.map(s => (
                <button
                  key={s}
                  className={`filter-chip ${status === s ? 'active' : ''}`}
                  onClick={() => setStatus(s)}
                >
                  {s === 'All' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Role + Date row */}
          <div className="filter-row">
            {isMe && (
              <div className="filter-section">
                <span className="filter-label">My Role</span>
                <div className="filter-chips">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      className={`filter-chip ${role === r ? 'active' : ''}`}
                      onClick={() => setRole(r)}
                    >
                      {r === 'all' ? 'All' : r === 'organizer' ? '🎯 Organizer' : '🏃 Player'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="filter-section">
              <span className="filter-label">Date Range</span>
              <div className="filter-chips">
                {DATE_RANGES.map(dr => (
                  <button
                    key={dr.label}
                    className={`filter-chip ${dateRange.label === dr.label ? 'active' : ''}`}
                    onClick={() => setDateRange(dr)}
                  >
                    {dr.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading && lobbies.length === 0 ? (
          <div className="history-skeleton">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton skeleton-card" />)}
          </div>
        ) : lobbies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No matches found</h3>
            <p>Try adjusting your filters or play some games!</p>
            {isMe && <Link to="/feed" className="btn btn-primary mt-4">Browse Open Games</Link>}
          </div>
        ) : (
          <>
            <div className="history-results">
              {lobbies.map(lobby => {
                const date = new Date(lobby.dateTime);
                const isOrganizer = lobby.myRole === 'organizer';
                return (
                  <Link
                    key={lobby._id}
                    to={`/lobby/${lobby._id}`}
                    className="history-card card card-body"
                  >
                    <div className="history-card-left">
                      <div className="history-sport-icon">
                        {getSportEmoji(lobby.sport)}
                      </div>
                      <div className="history-card-info">
                        <h3 className="history-card-title">
                          {lobby.sport} — {lobby.matchFormat}-a-side
                        </h3>
                        <p className="history-card-meta">
                          📍 {lobby.location?.address || lobby.location?.city || 'Location TBD'}
                        </p>
                        <p className="history-card-date">
                          🗓️ {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          &nbsp;·&nbsp;
                          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {lobby.description && (
                          <p className="history-card-desc">{lobby.description.slice(0, 80)}{lobby.description.length > 80 ? '…' : ''}</p>
                        )}
                      </div>
                    </div>
                    <div className="history-card-right">
                      <span className={`badge ${statusColors[lobby.status] || 'badge-sport'}`}>
                        {lobby.status}
                      </span>
                      {isMe && (
                        <span className={`role-badge ${isOrganizer ? 'role-organizer' : 'role-player'}`}>
                          {isOrganizer ? '🎯 Organizer' : '🏃 Player'}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {hasMore && (
              <div className="text-center mt-6 mb-4">
                <button
                  className="btn btn-outline"
                  onClick={() => fetchHistory(nextCursor)}
                  disabled={loading}
                >
                  {loading ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

function getSportEmoji(sport) {
  const map = {
    Football: '⚽', Cricket: '🏏', Basketball: '🏀', Tennis: '🎾',
    Padel: '🏓', Volleyball: '🏐', Badminton: '🏸', Pickleball: '🥎',
    TableTennis: '🏓',
  };
  return map[sport] || '🏅';
}

export default MatchHistory;
