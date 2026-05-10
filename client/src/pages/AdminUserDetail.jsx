import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import ConfirmModal from '../components/admin/ConfirmModal';

const ROLES_ALL = ['player', 'admin', 'venue_owner'];

const AdminUserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [banOpen, setBanOpen] = useState(false);
  const [banLoading, setBanLoading] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/admin/users/${id}`);
        setData(res.data);
        setSelectedRoles(res.data.user.roles || []);
      } catch {
        navigate('/admin/users');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleBan = async (reason) => {
    setBanLoading(true);
    try {
      await api.patch(`/admin/users/${id}/ban`, { reason });
      setData(prev => ({ ...prev, user: { ...prev.user, banned: true } }));
      setBanOpen(false);
    } catch (err) { console.error(err); }
    setBanLoading(false);
  };

  const handleUnban = async () => {
    try {
      await api.patch(`/admin/users/${id}/unban`);
      setData(prev => ({ ...prev, user: { ...prev.user, banned: false } }));
    } catch (err) { console.error(err); }
  };

  const handleRolesSave = async () => {
    try {
      const res = await api.patch(`/admin/users/${id}/roles`, { roles: selectedRoles });
      setData(prev => ({ ...prev, user: { ...prev.user, roles: res.data.user.roles } }));
      setRolesOpen(false);
    } catch (err) { console.error(err); }
  };

  const toggleRole = (role) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-title mb-4" style={{ width: 200 }} />
        <div className="skeleton skeleton-card" style={{ height: 180 }} />
      </div>
    );
  }

  if (!data) return null;

  const { user, stats, recentLobbies, auditHistory } = data;

  return (
    <div className="admin-user-detail" id="admin-user-detail-page">
      {/* Back */}
      <Link to="/admin/users" className="btn btn-ghost btn-sm mb-6" style={{ display: 'inline-flex' }}>
        ← Back to Users
      </Link>

      {/* Profile Card */}
      <div className="admin-user-profile-card">
        <div className="admin-user-profile-avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
          ) : (
            user.name?.[0]?.toUpperCase()
          )}
        </div>
        <div className="admin-user-profile-info">
          <h1 className="admin-user-profile-name">{user.name}</h1>
          <p className="text-secondary" style={{ marginBottom: 'var(--space-2)' }}>{user.email}</p>
          {user.whatsappNumber && (
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-2)' }}>
              📱 {user.whatsappNumber}
            </p>
          )}
          <p className="text-sm text-muted">
            Joined {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Roles */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
            {user.roles?.map(r => (
              <span key={r} className={`badge ${r === 'admin' ? 'badge-admin' : r === 'venue_owner' ? 'badge-venue-owner' : 'badge-completed'}`}>
                {r}
              </span>
            ))}
            <span className={user.banned ? 'badge-banned' : 'badge-active'}>
              {user.banned ? 'Banned' : 'Active'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flexShrink: 0 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setRolesOpen(true)}
            id="edit-roles-btn"
          >
            ✏️ Edit Roles
          </button>
          {user.banned ? (
            <button className="btn btn-secondary btn-sm" onClick={handleUnban} id="unban-btn">
              ✅ Unban
            </button>
          ) : (
            !user.roles?.includes('admin') && (
              <button className="btn btn-danger btn-sm" onClick={() => setBanOpen(true)} id="ban-btn">
                🚫 Ban User
              </button>
            )
          )}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.lobbiesOrganized}</div>
          <div className="admin-stat-label">Lobbies Organized</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.lobbiesJoined}</div>
          <div className="admin-stat-label">Lobbies Joined</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.squads}</div>
          <div className="admin-stat-label">Squads</div>
        </div>
      </div>

      {/* Recent Lobbies */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">Recent Lobbies</h2>
        </div>
        {recentLobbies.length === 0 ? (
          <p className="text-muted">No lobby activity yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sport</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {recentLobbies.map(l => (
                  <tr key={l._id}>
                    <td><span className="badge badge-sport">{l.sport}</span></td>
                    <td className="text-muted text-sm">{l.location?.address || '—'}</td>
                    <td className="text-muted text-sm" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(l.dateTime).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge badge-${l.status === 'OPEN' ? 'open' : l.status === 'LOCKED' ? 'locked' : 'completed'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {l.organizerId?.toString() === id ? '⭐ Organizer' : 'Player'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit History */}
      {auditHistory.length > 0 && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2 className="admin-section-title">Admin Action History</h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Action</th><th>By</th><th>Reason</th><th>Date</th></tr>
              </thead>
              <tbody>
                {auditHistory.map(log => (
                  <tr key={log._id}>
                    <td><span className="badge badge-completed">{log.action}</span></td>
                    <td className="text-sm">{log.adminId?.name || '—'}</td>
                    <td className="text-sm text-muted">{log.meta?.reason || '—'}</td>
                    <td className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      <ConfirmModal
        isOpen={banOpen}
        title={`Ban ${user.name}?`}
        message={`This will immediately revoke ${user.name}'s access to Tribe. They will be locked out on their next request.`}
        confirmLabel="Ban User"
        danger
        withReason
        onConfirm={handleBan}
        onCancel={() => setBanOpen(false)}
        loading={banLoading}
      />

      {/* Edit Roles Modal */}
      {rolesOpen && (
        <div className="admin-modal-overlay" onClick={() => setRolesOpen(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span style={{ fontSize: 20 }}>✏️</span>
              <h3 className="admin-modal-title">Edit Roles — {user.name}</h3>
            </div>
            <div className="admin-modal-body">
              <p>Select all roles that apply to this user.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {ROLES_ALL.map(r => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(r)}
                      onChange={() => toggleRole(r)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{r.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setRolesOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleRolesSave} id="save-roles-btn">Save Roles</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDetail;
