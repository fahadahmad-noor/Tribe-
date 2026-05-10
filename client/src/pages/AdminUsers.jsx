import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ConfirmModal from '../components/admin/ConfirmModal';

const ROLES_MAP = { admin: 'badge-admin', player: 'badge-completed', venue_owner: 'badge-venue-owner' };
const PAGE_SIZES = [10, 20, 50];

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Ban modal state
  const [banTarget, setBanTarget] = useState(null); // { _id, name }
  const [banLoading, setBanLoading] = useState(false);

  const debounceRef = useRef(null);

  const fetchUsers = useCallback(async (params) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.users);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers({ search, page, limit, role, status });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search, page, limit, role, status, fetchUsers]);

  const handleBanConfirm = async (reason) => {
    if (!banTarget) return;
    setBanLoading(true);
    try {
      await api.patch(`/admin/users/${banTarget._id}/ban`, { reason });
      setUsers(prev => prev.map(u => u._id === banTarget._id ? { ...u, banned: true } : u));
      setBanTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnban = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/unban`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, banned: false } : u));
    } catch (err) {
      console.error(err);
    }
  };

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div id="admin-users-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-subtitle">Search, manage, ban and review all platform users</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <span className="admin-search-icon">🔍</span>
          <input
            id="admin-user-search"
            className="admin-search"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select
          className="admin-filter-select"
          value={role}
          onChange={e => { setRole(e.target.value); setPage(1); }}
          id="admin-role-filter"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="player">Player</option>
          <option value="venue_owner">Venue Owner</option>
        </select>

        <select
          className="admin-filter-select"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          id="admin-status-filter"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>

        <select
          className="admin-filter-select"
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>

        {!loading && (
          <span className="admin-results-count">
            {total === 0 ? 'No results' : `${start}–${end} of ${total.toLocaleString()} users`}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Roles</th>
              <th>Joined</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j}>
                      <div className="skeleton skeleton-text" style={{ width: j === 0 ? 160 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="admin-user-row">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} className="avatar avatar-sm" alt="" />
                      ) : (
                        <div className="avatar avatar-sm avatar-placeholder" style={{ fontSize: 12 }}>
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="admin-user-name">{u.name}</div>
                        <div className="admin-user-email">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {u.roles?.map(r => (
                        <span key={r} className={`badge ${ROLES_MAP[r] || 'badge-completed'}`}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="text-muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={u.banned ? 'badge-banned' : 'badge-active'}>
                      {u.banned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <Link
                        to={`/admin/users/${u._id}`}
                        className="btn btn-outline btn-sm"
                        id={`view-user-${u._id}`}
                        title="View profile"
                      >
                        👁
                      </Link>
                      {u.banned ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleUnban(u._id)}
                          id={`unban-user-${u._id}`}
                          title="Unban user"
                        >
                          ✅ Unban
                        </button>
                      ) : (
                        !u.roles?.includes('admin') && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setBanTarget(u)}
                            id={`ban-user-${u._id}`}
                            title="Ban user"
                          >
                            🚫 Ban
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <span className="admin-pagination-info">
              Page {page} of {totalPages}
            </span>
            <div className="admin-pagination-controls">
              <button
                className="admin-page-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ←
              </button>
              {/* Show page numbers (max 5 visible) */}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    className={`admin-page-btn ${p === page ? 'active' : ''}`}
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

      {/* Ban Confirmation Modal */}
      <ConfirmModal
        isOpen={!!banTarget}
        title={`Ban ${banTarget?.name}?`}
        message={`This will immediately revoke ${banTarget?.name}'s access to Tribe. They will be locked out on their next request.`}
        confirmLabel="Ban User"
        danger
        withReason
        onConfirm={handleBanConfirm}
        onCancel={() => setBanTarget(null)}
        loading={banLoading}
      />
    </div>
  );
};

export default AdminUsers;
