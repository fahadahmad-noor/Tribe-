import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({});
  const [pendingVenues, setPendingVenues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [mRes, vRes, uRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/venues/pending'),
          api.get('/admin/users'),
        ]);
        setMetrics(mRes.data.metrics);
        setPendingVenues(vRes.data.venues);
        setUsers(uRes.data.users);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleVerify = async (id) => {
    try {
      await api.patch(`/admin/venues/${id}/verify`);
      setPendingVenues(prev => prev.filter(v => v._id !== id));
    } catch (err) { alert('Failed'); }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/admin/venues/${id}/reject`);
      setPendingVenues(prev => prev.filter(v => v._id !== id));
    } catch (err) { alert('Failed'); }
  };

  const handleBan = async (id) => {
    if (!confirm('Ban this user?')) return;
    try {
      await api.patch(`/admin/users/${id}/ban`);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, roles: ['banned'] } : u));
    } catch (err) { alert('Failed'); }
  };

  if (loading) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;

  return (
    <div className="page" id="admin-dashboard-page">
      <div className="container">
        <h1 className="mb-6">🛡️ Admin Dashboard</h1>

        {/* Metrics */}
        <div className="grid grid-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: metrics.totalUsers, color: 'var(--text-primary)' },
            { label: 'Active Lobbies', value: metrics.activeLobbies, color: 'var(--accent-secondary)' },
            { label: 'Verified Venues', value: metrics.totalVenues, color: 'var(--accent-amber)' },
            { label: 'Completed Matches', value: metrics.totalBookings, color: 'var(--accent-primary)' },
          ].map(m => (
            <div key={m.label} className="card card-body text-center">
              <span className="text-mono" style={{ fontSize: 36, fontWeight: 700, color: m.color }}>{m.value || 0}</span>
              <p className="text-muted mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Pending Venues */}
        <h2 className="mb-4">Venue Verification Queue ({pendingVenues.length})</h2>
        {pendingVenues.length === 0 ? <p className="text-muted mb-6">No pending venues.</p> : (
          <div className="flex flex-col gap-3 mb-8">
            {pendingVenues.map(v => (
              <div key={v._id} className="card card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 style={{margin:0}}>{v.name}</h3>
                    <p className="text-sm text-muted">📍 {v.location?.address}</p>
                    <p className="text-sm text-secondary">Owner: {v.ownerId?.name} ({v.ownerId?.email})</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => handleVerify(v._id)}>✓ Verify</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(v._id)}>✕ Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
        <h2 className="mb-4">Users</h2>
        <div className="flex flex-col gap-2">
          {users.map(u => (
            <div key={u._id} className="card card-body flex justify-between items-center" style={{padding:'var(--space-3) var(--space-4)'}}>
              <div className="flex items-center gap-3">
                {u.avatarUrl ? <img src={u.avatarUrl} className="avatar avatar-sm" alt="" /> : <div className="avatar avatar-sm avatar-placeholder">{u.name?.[0]}</div>}
                <div>
                  <span className="font-medium">{u.name}</span>
                  <p className="text-xs text-muted">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {u.roles?.map(r => <span key={r} className="badge badge-completed">{r}</span>)}
                {!u.roles?.includes('banned') && !u.roles?.includes('admin') && (
                  <button className="btn btn-outline btn-sm" onClick={() => handleBan(u._id)}>Ban</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


