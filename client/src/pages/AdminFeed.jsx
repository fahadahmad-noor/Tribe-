import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import LobbyCard from '../components/lobby/LobbyCard';
import api from '../api/axios';
import ConfirmModal from '../components/admin/ConfirmModal';
import '../styles/pages/Feed.css';

const SPORTS = ['All', 'Football', 'Cricket', 'Basketball', 'Tennis', 'Padel', 'Volleyball'];
const STATUSES = ['OPEN', 'LOCKED', 'EXPIRED', 'COMPLETED'];

const AdminFeed = () => {
  const { socket } = useSocket();
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [closeTarget, setCloseTarget] = useState(null);
  const [closeLoading, setCloseLoading] = useState(false);

  const fetchLobbies = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 30 };
      if (statusFilter) params.status = statusFilter;
      if (sportFilter !== 'All') params.sport = sportFilter;
      const res = await api.get('/admin/lobbies', { params });
      setLobbies(res.data.lobbies);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [sportFilter, statusFilter]);

  useEffect(() => { fetchLobbies(); }, [fetchLobbies]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_feed');
    const onCreated = (l) => setLobbies(prev => [l, ...prev]);
    const onUpdated = (l) => setLobbies(prev => prev.map(x => x._id === l._id ? l : x));
    socket.on('lobby_created', onCreated);
    socket.on('lobby_updated', onUpdated);
    return () => {
      socket.emit('leave_feed');
      socket.off('lobby_created', onCreated);
      socket.off('lobby_updated', onUpdated);
    };
  }, [socket]);

  const handleForceClose = async () => {
    if (!closeTarget) return;
    setCloseLoading(true);
    try {
      await api.patch(`/admin/lobbies/${closeTarget._id}/close`);
      setLobbies(prev => prev.map(l => l._id === closeTarget._id ? { ...l, status: 'LOCKED' } : l));
      setCloseTarget(null);
    } catch (err) { console.error(err); }
    setCloseLoading(false);
  };

  return (
    <div id="admin-feed-page">
      {/* Admin Banner */}
      <div className="admin-view-banner">
        🛡️ ADMIN VIEW — You are monitoring the live feed. Changes here are real.
      </div>

      <div style={{ padding: 'var(--space-6) 0' }}>
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Live Feed</h1>
            <p className="admin-page-subtitle">Monitor all lobbies in real-time. Force-close any lobby.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-toolbar" style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button
                key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <select
            className="admin-filter-select"
            value={sportFilter}
            onChange={e => setSportFilter(e.target.value)}
          >
            {SPORTS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sports' : s}</option>)}
          </select>
        </div>

        {/* Lobby Grid with admin overlays */}
        {loading ? (
          <div className="grid grid-auto gap-4">
            {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" />)}
          </div>
        ) : lobbies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏟️</div>
            <h3>No lobbies</h3>
            <p>No lobbies match the current filters.</p>
          </div>
        ) : (
          <div className="grid grid-auto gap-4">
            {lobbies.map(lobby => (
              <div key={lobby._id} style={{ position: 'relative' }}>
                <LobbyCard lobby={lobby} />
                {/* Admin action overlay */}
                <div style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  gap: 6,
                  zIndex: 10,
                }}>
                  <Link
                    to={`/admin/users/${lobby.organizerId?._id}`}
                    className="btn btn-sm"
                    style={{ background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', fontSize: 11, padding: '3px 8px', backdropFilter: 'blur(4px)' }}
                    title="View organizer"
                  >
                    👤
                  </Link>
                  {lobby.status === 'OPEN' && (
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => setCloseTarget(lobby)}
                      title="Force close"
                    >
                      🔒
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!closeTarget}
        title="Force Close Lobby?"
        message={`This will immediately lock the "${closeTarget?.sport}" lobby and notify all players via socket.`}
        confirmLabel="🔒 Force Close"
        danger
        onConfirm={handleForceClose}
        onCancel={() => setCloseTarget(null)}
        loading={closeLoading}
      />
    </div>
  );
};

export default AdminFeed;
