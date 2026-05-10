import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ConfirmModal from '../components/admin/ConfirmModal';

const SPORTS = ['Football', 'Cricket', 'Basketball', 'Tennis', 'Padel', 'Volleyball', 'Badminton'];
const STATUSES = ['OPEN', 'LOCKED', 'EXPIRED', 'COMPLETED'];

const statusClass = {
  OPEN: 'badge-open',
  LOCKED: 'badge-locked',
  EXPIRED: 'badge-cancelled',
  COMPLETED: 'badge-completed',
};

const AdminLobbies = () => {
  const [lobbies, setLobbies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [closeTarget, setCloseTarget] = useState(null);
  const [closeLoading, setCloseLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 20 };
        if (statusFilter) params.status = statusFilter;
        if (sportFilter) params.sport = sportFilter;
        const res = await api.get('/admin/lobbies', { params });
        setLobbies(res.data.lobbies);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, statusFilter, sportFilter]);

  const handleForceClose = async () => {
    if (!closeTarget) return;
    setCloseLoading(true);
    try {
      await api.patch(`/admin/lobbies/${closeTarget._id}/close`);
      setLobbies(prev =>
        prev.map(l => l._id === closeTarget._id ? { ...l, status: 'LOCKED' } : l)
      );
      setCloseTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setCloseLoading(false);
    }
  };

  const start = total === 0 ? 0 : (page - 1) * 20 + 1;
  const end = Math.min(page * 20, total);

  return (
    <div id="admin-lobbies-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Lobbies</h1>
          <p className="admin-page-subtitle">
            All platform lobbies — filter by status and sport, force-close if needed
          </p>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="admin-toolbar">
        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          id="admin-lobby-status-filter"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="admin-filter-select"
          value={sportFilter}
          onChange={e => { setSportFilter(e.target.value); setPage(1); }}
          id="admin-lobby-sport-filter"
        >
          <option value="">All Sports</option>
          {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {!loading && (
          <span className="admin-results-count">
            {total === 0 ? 'No results' : `${start}–${end} of ${total.toLocaleString()} lobbies`}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sport</th>
              <th>Organizer</th>
              <th>Location</th>
              <th>Date & Time</th>
              <th>Slots</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j}>
                      <div className="skeleton skeleton-text" style={{ width: 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : lobbies.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}
                >
                  No lobbies found
                </td>
              </tr>
            ) : (
              lobbies.map(l => (
                <tr key={l._id}>
                  <td>
                    <span className="badge badge-sport">{l.sport}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{l.organizerId?.name || '—'}</div>
                    <div className="admin-user-email">{l.organizerId?.email || ''}</div>
                  </td>
                  <td className="text-sm text-muted" style={{ maxWidth: 160 }}>
                    {(l.location?.address || l.location?.city || '—').slice(0, 40)}
                  </td>
                  <td className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>
                    <div>{new Date(l.dateTime).toLocaleDateString()}</div>
                    <div style={{ fontSize: 11 }}>
                      {new Date(l.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="text-mono text-sm">
                    {l.openSlots ?? '?'} / {l.totalSlots ?? '?'}
                  </td>
                  <td>
                    <span className={`badge ${statusClass[l.status] || 'badge-completed'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <Link
                        to={`/lobby/${l._id}`}
                        className="btn btn-outline btn-sm"
                        target="_blank"
                        title="View lobby detail"
                        id={`view-lobby-${l._id}`}
                      >
                        👁
                      </Link>
                      {l.status === 'OPEN' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setCloseTarget(l)}
                          id={`close-lobby-${l._id}`}
                          title="Force close lobby"
                        >
                          🔒 Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <span className="admin-pagination-info">Page {page} of {totalPages}</span>
            <div className="admin-pagination-controls">
              <button
                className="admin-page-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ←
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    className={`admin-page-btn${p === page ? ' active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="admin-page-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Force Close Modal ── */}
      <ConfirmModal
        isOpen={!!closeTarget}
        title="Force Close Lobby?"
        message={`This will immediately lock the "${closeTarget?.sport}" lobby organized by ${closeTarget?.organizerId?.name || 'this user'}. All players will be notified.`}
        confirmLabel="🔒 Force Close"
        danger
        onConfirm={handleForceClose}
        onCancel={() => setCloseTarget(null)}
        loading={closeLoading}
      />
    </div>
  );
};

export default AdminLobbies;
