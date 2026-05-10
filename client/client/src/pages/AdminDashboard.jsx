import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import '../styles/pages/AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(0);

  // Venues state
  const [venues, setVenues] = useState([]);
  const [pendingVenues, setPendingVenues] = useState([]);
  const [venueSearch, setVenueSearch] = useState('');
  const [venueStatus, setVenueStatus] = useState('');
  const [venuePage, setVenuePage] = useState(1);
  const [venueTotal, setVenueTotal] = useState(0);
  const [venueTotalPages, setVenueTotalPages] = useState(0);

  // Lobbies state
  const [lobbies, setLobbies] = useState([]);
  const [lobbyStatus, setLobbyStatus] = useState('');
  const [lobbySport, setLobbySport] = useState('');
  const [lobbyPage, setLobbyPage] = useState(1);
  const [lobbyTotal, setLobbyTotal] = useState(0);
  const [lobbyTotalPages, setLobbyTotalPages] = useState(0);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditAction, setAuditAction] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(0);

  // Fetch dashboard metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        setMetrics(res.data.metrics);
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  // Fetch users
  useEffect(() => {
    if (activeTab !== 'users') return;
    const fetchUsers = async () => {
      try {
        const res = await api.get('/admin/users', {
          params: { search: userSearch, role: userRole, status: userStatus, page: userPage, limit: 20 }
        });
        setUsers(res.data.users);
        setUserTotal(res.data.total);
        setUserTotalPages(res.data.totalPages);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    fetchUsers();
  }, [activeTab, userSearch, userRole, userStatus, userPage]);

  // Fetch venues
  useEffect(() => {
    if (activeTab !== 'venues') return;
    const fetchVenues = async () => {
      try {
        const [allRes, pendingRes] = await Promise.all([
          api.get('/admin/venues', {
            params: { search: venueSearch, status: venueStatus, page: venuePage, limit: 20 }
          }),
          api.get('/admin/venues/pending')
        ]);
        setVenues(allRes.data.venues);
        setVenueTotal(allRes.data.total);
        setVenueTotalPages(allRes.data.totalPages);
        setPendingVenues(pendingRes.data.venues);
      } catch (err) {
        console.error('Failed to load venues:', err);
      }
    };
    fetchVenues();
  }, [activeTab, venueSearch, venueStatus, venuePage]);

  // Fetch lobbies
  useEffect(() => {
    if (activeTab !== 'lobbies') return;
    const fetchLobbies = async () => {
      try {
        const res = await api.get('/admin/lobbies', {
          params: { status: lobbyStatus, sport: lobbySport, page: lobbyPage, limit: 20 }
        });
        setLobbies(res.data.lobbies);
        setLobbyTotal(res.data.total);
        setLobbyTotalPages(res.data.totalPages);
      } catch (err) {
        console.error('Failed to load lobbies:', err);
      }
    };
    fetchLobbies();
  }, [activeTab, lobbyStatus, lobbySport, lobbyPage]);

  // Fetch audit logs
  useEffect(() => {
    if (activeTab !== 'audit') return;
    const fetchAuditLogs = async () => {
      try {
        const res = await api.get('/admin/audit', {
          params: { action: auditAction, page: auditPage, limit: 20 }
        });
        setAuditLogs(res.data.logs);
        setAuditTotal(res.data.total);
        setAuditTotalPages(res.data.totalPages);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      }
    };
    fetchAuditLogs();
  }, [activeTab, auditAction, auditPage]);

  // User actions
  const handleBanUser = async (id) => {
    if (!confirm('Ban this user?')) return;
    try {
      await api.patch(`/admin/users/${id}/ban`, { reason: 'Admin action' });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, banned: true } : u));
    } catch (err) {
      alert('Failed to ban user');
    }
  };

  const handleUnbanUser = async (id) => {
    try {
      await api.patch(`/admin/users/${id}/unban`);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, banned: false } : u));
    } catch (err) {
      alert('Failed to unban user');
    }
  };

  // Venue actions
  const handleVerifyVenue = async (id) => {
    try {
      await api.patch(`/admin/venues/${id}/verify`);
      setPendingVenues(prev => prev.filter(v => v._id !== id));
      // Refresh venues list
      const res = await api.get('/admin/venues', {
        params: { search: venueSearch, status: venueStatus, page: venuePage, limit: 20 }
      });
      setVenues(res.data.venues);
    } catch (err) {
      alert('Failed to verify venue');
    }
  };

  const handleRejectVenue = async (id) => {
    try {
      await api.patch(`/admin/venues/${id}/reject`);
      setPendingVenues(prev => prev.filter(v => v._id !== id));
    } catch (err) {
      alert('Failed to reject venue');
    }
  };

  // Lobby actions
  const handleCloseLobby = async (id) => {
    if (!confirm('Force close this lobby?')) return;
    try {
      await api.patch(`/admin/lobbies/${id}/close`);
      setLobbies(prev => prev.map(l => l._id === id ? { ...l, status: 'LOCKED' } : l));
    } catch (err) {
      alert('Failed to close lobby');
    }
  };

  if (loading) {
    return (
      <div className="page container">
        <div className="skeleton skeleton-card mt-6" />
      </div>
    );
  }

  return (
    <div className="page admin-dashboard-page">
      <div className="container">
        <div className="admin-header">
          <h1>🛡️ Admin Dashboard</h1>
          <p className="text-secondary">Manage users, venues, lobbies, and view audit logs</p>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button
            className={`admin-tab ${activeTab === 'venues' ? 'active' : ''}`}
            onClick={() => setActiveTab('venues')}
          >
            🏟️ Venues
          </button>
          <button
            className={`admin-tab ${activeTab === 'lobbies' ? 'active' : ''}`}
            onClick={() => setActiveTab('lobbies')}
          >
            🎮 Lobbies
          </button>
          <button
            className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            📋 Audit Logs
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="admin-content">
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">👥</div>
                <div className="metric-value">{metrics.totalUsers || 0}</div>
                <div className="metric-label">Total Users</div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">🚫</div>
                <div className="metric-value">{metrics.bannedUsers || 0}</div>
                <div className="metric-label">Banned Users</div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">🎮</div>
                <div className="metric-value">{metrics.activeLobbies || 0}</div>
                <div className="metric-label">Active Lobbies</div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">🏟️</div>
                <div className="metric-value">{metrics.verifiedVenues || 0}</div>
                <div className="metric-label">Verified Venues</div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">⏳</div>
                <div className="metric-value">{metrics.pendingVenueApps || 0}</div>
                <div className="metric-label">Pending Venues</div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">👥</div>
                <div className="metric-value">{metrics.totalSquads || 0}</div>
                <div className="metric-label">Total Squads</div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="admin-content">
            <div className="admin-filters">
              <input
                type="text"
                className="input"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
              />
              <select
                className="select"
                value={userRole}
                onChange={(e) => { setUserRole(e.target.value); setUserPage(1); }}
              >
                <option value="">All Roles</option>
                <option value="player">Player</option>
                <option value="admin">Admin</option>
                <option value="venue_owner">Venue Owner</option>
              </select>
              <select
                className="select"
                value={userStatus}
                onChange={(e) => { setUserStatus(e.target.value); setUserPage(1); }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            <div className="admin-table-info">
              <span>Showing {users.length} of {userTotal} users</span>
            </div>

            <div className="admin-table">
              {users.map(u => (
                <div key={u._id} className="admin-table-row">
                  <div className="admin-table-cell user-info">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} className="avatar avatar-sm" alt="" />
                    ) : (
                      <div className="avatar avatar-sm avatar-placeholder">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="user-name">{u.name}</div>
                      <div className="user-email">{u.email}</div>
                    </div>
                  </div>
                  <div className="admin-table-cell">
                    <div className="user-roles">
                      {u.roles?.map(r => (
                        <span key={r} className="badge badge-sport">{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="admin-table-cell">
                    {u.banned ? (
                      <span className="badge badge-cancelled">Banned</span>
                    ) : (
                      <span className="badge badge-approved">Active</span>
                    )}
                  </div>
                  <div className="admin-table-cell admin-actions">
                    {u.banned ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleUnbanUser(u._id)}
                      >
                        Unban
                      </button>
                    ) : (
                      !u.roles?.includes('admin') && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleBanUser(u._id)}
                        >
                          Ban
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {userTotalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={userPage === 1}
                  onClick={() => setUserPage(p => p - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {userPage} of {userTotalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={userPage === userTotalPages}
                  onClick={() => setUserPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Venues Tab */}
        {activeTab === 'venues' && (
          <div className="admin-content">
            {pendingVenues.length > 0 && (
              <div className="pending-section">
                <h3>⏳ Pending Verification ({pendingVenues.length})</h3>
                <div className="pending-venues">
                  {pendingVenues.map(v => (
                    <div key={v._id} className="pending-venue-card card">
                      <div className="card-body">
                        <h4>{v.name}</h4>
                        <p className="text-sm text-muted">📍 {v.location?.address}</p>
                        <p className="text-sm text-secondary">
                          Owner: {v.ownerId?.name} ({v.ownerId?.email})
                        </p>
                        <div className="venue-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleVerifyVenue(v._id)}
                          >
                            ✓ Verify
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRejectVenue(v._id)}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3>All Venues</h3>
            <div className="admin-filters">
              <input
                type="text"
                className="input"
                placeholder="Search venues..."
                value={venueSearch}
                onChange={(e) => { setVenueSearch(e.target.value); setVenuePage(1); }}
              />
              <select
                className="select"
                value={venueStatus}
                onChange={(e) => { setVenueStatus(e.target.value); setVenuePage(1); }}
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="admin-table-info">
              <span>Showing {venues.length} of {venueTotal} venues</span>
            </div>

            <div className="admin-table">
              {venues.map(v => (
                <div key={v._id} className="admin-table-row">
                  <div className="admin-table-cell">
                    <div className="venue-name">{v.name}</div>
                    <div className="venue-address text-sm text-muted">
                      📍 {v.location?.address}
                    </div>
                  </div>
                  <div className="admin-table-cell">
                    <div className="text-sm">
                      Owner: {v.ownerId?.name}
                    </div>
                  </div>
                  <div className="admin-table-cell">
                    {v.verificationStatus === 'VERIFIED' && (
                      <span className="badge badge-approved">Verified</span>
                    )}
                    {v.verificationStatus === 'PENDING' && (
                      <span className="badge badge-pending">Pending</span>
                    )}
                    {v.verificationStatus === 'REJECTED' && (
                      <span className="badge badge-cancelled">Rejected</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {venueTotalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={venuePage === 1}
                  onClick={() => setVenuePage(p => p - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {venuePage} of {venueTotalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={venuePage === venueTotalPages}
                  onClick={() => setVenuePage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Lobbies Tab */}
        {activeTab === 'lobbies' && (
          <div className="admin-content">
            <div className="admin-filters">
              <select
                className="select"
                value={lobbyStatus}
                onChange={(e) => { setLobbyStatus(e.target.value); setLobbyPage(1); }}
              >
                <option value="">All Status</option>
                <option value="OPEN">Open</option>
                <option value="LOCKED">Locked</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <select
                className="select"
                value={lobbySport}
                onChange={(e) => { setLobbySport(e.target.value); setLobbyPage(1); }}
              >
                <option value="">All Sports</option>
                <option value="Football">Football</option>
                <option value="Cricket">Cricket</option>
                <option value="Basketball">Basketball</option>
                <option value="Tennis">Tennis</option>
                <option value="Padel">Padel</option>
                <option value="Volleyball">Volleyball</option>
                <option value="Badminton">Badminton</option>
                <option value="Pickleball">Pickleball</option>
                <option value="TableTennis">Table Tennis</option>
              </select>
            </div>

            <div className="admin-table-info">
              <span>Showing {lobbies.length} of {lobbyTotal} lobbies</span>
            </div>

            <div className="admin-table">
              {lobbies.map(l => (
                <div key={l._id} className="admin-table-row">
                  <div className="admin-table-cell">
                    <div className="lobby-sport">{l.sport} - {l.matchFormat}</div>
                    <div className="text-sm text-muted">
                      Organizer: {l.organizerId?.name}
                    </div>
                  </div>
                  <div className="admin-table-cell">
                    <div className="text-sm">
                      {new Date(l.dateTime).toLocaleString()}
                    </div>
                  </div>
                  <div className="admin-table-cell">
                    {l.status === 'OPEN' && <span className="badge badge-open">Open</span>}
                    {l.status === 'LOCKED' && <span className="badge badge-locked">Locked</span>}
                    {l.status === 'CANCELLED' && <span className="badge badge-cancelled">Cancelled</span>}
                    {l.status === 'COMPLETED' && <span className="badge badge-completed">Completed</span>}
                  </div>
                  <div className="admin-table-cell admin-actions">
                    {l.status === 'OPEN' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCloseLobby(l._id)}
                      >
                        Force Close
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {lobbyTotalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={lobbyPage === 1}
                  onClick={() => setLobbyPage(p => p - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {lobbyPage} of {lobbyTotalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={lobbyPage === lobbyTotalPages}
                  onClick={() => setLobbyPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit' && (
          <div className="admin-content">
            <div className="admin-filters">
              <select
                className="select"
                value={auditAction}
                onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
              >
                <option value="">All Actions</option>
                <option value="BAN_USER">Ban User</option>
                <option value="UNBAN_USER">Unban User</option>
                <option value="CHANGE_ROLES">Change Roles</option>
                <option value="VERIFY_VENUE">Verify Venue</option>
                <option value="REJECT_VENUE">Reject Venue</option>
                <option value="CLOSE_LOBBY">Close Lobby</option>
              </select>
            </div>

            <div className="admin-table-info">
              <span>Showing {auditLogs.length} of {auditTotal} logs</span>
            </div>

            <div className="audit-logs">
              {auditLogs.map(log => (
                <div key={log._id} className="audit-log-item card">
                  <div className="card-body">
                    <div className="audit-header">
                      <span className="badge badge-sport">{log.action}</span>
                      <span className="text-sm text-muted">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="audit-details">
                      <p className="text-sm">
                        <strong>Admin:</strong> {log.adminId?.name} ({log.adminId?.email})
                      </p>
                      <p className="text-sm">
                        <strong>Target:</strong> {log.targetType} - {log.targetId}
                      </p>
                      {log.meta && Object.keys(log.meta).length > 0 && (
                        <p className="text-sm">
                          <strong>Details:</strong> {JSON.stringify(log.meta)}
                        </p>
                      )}
                      {log.ip && (
                        <p className="text-sm text-muted">
                          IP: {log.ip}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {auditTotalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={auditPage === 1}
                  onClick={() => setAuditPage(p => p - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {auditPage} of {auditTotalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={auditPage === auditTotalPages}
                  onClick={() => setAuditPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
