import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const metrics = [
  { key: 'totalUsers',      label: 'Total Users',     icon: '👥', variant: '' },
  { key: 'bannedUsers',     label: 'Banned Users',    icon: '🚫', variant: 'danger' },
  { key: 'activeLobbies',   label: 'Active Lobbies',  icon: '🏆', variant: 'success' },
  { key: 'pendingVenueApps',label: 'Pending Venues',  icon: '⏳', variant: 'warning' },
  { key: 'verifiedVenues',  label: 'Verified Venues', icon: '✅', variant: 'success' },
  { key: 'totalSquads',     label: 'Total Squads',    icon: '👕', variant: 'info' },
];

const AdminDashboard = () => {
  const [data, setData] = useState({ metrics: {}, pendingVenues: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [mRes, vRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/venues/pending'),
        ]);
        setData({ metrics: mRes.data.metrics, pendingVenues: vRes.data.venues });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleVerify = async (id) => {
    setActionLoading(id + '-verify');
    try {
      await api.patch(`/admin/venues/${id}/verify`);
      setData(prev => ({
        ...prev,
        pendingVenues: prev.pendingVenues.filter(v => v._id !== id),
        metrics: { ...prev.metrics, pendingVenueApps: Math.max(0, (prev.metrics.pendingVenueApps || 1) - 1) },
      }));
    } catch { /* handled */ }
    setActionLoading('');
  };

  const handleReject = async (id) => {
    setActionLoading(id + '-reject');
    try {
      await api.patch(`/admin/venues/${id}/reject`);
      setData(prev => ({
        ...prev,
        pendingVenues: prev.pendingVenues.filter(v => v._id !== id),
        metrics: { ...prev.metrics, pendingVenueApps: Math.max(0, (prev.metrics.pendingVenueApps || 1) - 1) },
      }));
    } catch { /* handled */ }
    setActionLoading('');
  };

  if (loading) {
    return (
      <div>
        <div className="admin-page-header">
          <div>
            <div className="skeleton skeleton-title" style={{ width: 200, height: 28 }} />
          </div>
        </div>
        <div className="admin-metrics-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="admin-metric-card">
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton" style={{ height: 40, width: '40%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="admin-overview-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Overview</h1>
          <p className="admin-page-subtitle">Platform health at a glance</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="admin-metrics-grid">
        {metrics.map(m => (
          <div key={m.key} className={`admin-metric-card ${m.variant}`}>
            <div className="admin-metric-header">
              <span className="admin-metric-label">{m.label}</span>
              <span className="admin-metric-icon">{m.icon}</span>
            </div>
            <div className="admin-metric-value">
              {(data.metrics[m.key] ?? 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Pending Venue Queue */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">
            ⏳ Pending Venue Applications
            {data.pendingVenues.length > 0 && (
              <span className="admin-nav-badge" style={{ marginLeft: 8 }}>
                {data.pendingVenues.length}
              </span>
            )}
          </h2>
          <Link to="/admin/venues" className="btn btn-outline btn-sm">
            View All Venues →
          </Link>
        </div>

        {data.pendingVenues.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <div className="empty-state-icon">✅</div>
            <h3>All caught up!</h3>
            <p>No venues pending verification.</p>
          </div>
        ) : (
          <div className="admin-venue-queue">
            {data.pendingVenues.slice(0, 5).map(v => (
              <div key={v._id} className="admin-venue-card">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                    <h4 style={{ margin: 0 }}>{v.name}</h4>
                  </div>
                  <p className="text-sm text-muted" style={{ marginBottom: 4 }}>
                    📍 {v.location?.address || 'No address'}
                  </p>
                  <p className="text-sm text-secondary">
                    🏅 {v.sportsSupported?.join(', ') || 'No sports listed'}
                  </p>
                  {v.ownerId && (
                    <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                      Owner: <strong>{v.ownerId.name}</strong> · {v.ownerId.email}
                      {v.ownerId.whatsappNumber && ` · ${v.ownerId.whatsappNumber}`}
                    </p>
                  )}
                  {v.description && (
                    <p className="text-sm text-secondary" style={{ marginTop: 4, fontStyle: 'italic' }}>
                      "{v.description.slice(0, 100)}{v.description.length > 100 ? '...' : ''}"
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleVerify(v._id)}
                    disabled={actionLoading === v._id + '-verify'}
                    id={`verify-venue-${v._id}`}
                  >
                    {actionLoading === v._id + '-verify' ? '...' : '✓ Verify'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleReject(v._id)}
                    disabled={actionLoading === v._id + '-reject'}
                    id={`reject-venue-${v._id}`}
                  >
                    {actionLoading === v._id + '-reject' ? '...' : '✕ Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
