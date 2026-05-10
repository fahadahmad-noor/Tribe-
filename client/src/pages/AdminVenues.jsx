import { useState, useEffect } from 'react';
import api from '../api/axios';
import ConfirmModal from '../components/admin/ConfirmModal';

const STATUS_OPTIONS = ['All', 'PENDING', 'VERIFIED', 'REJECTED'];

const AdminVenues = () => {
  const [pending, setPending] = useState([]);
  const [venues, setVenues] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', venueId: '', venueName: '' });

  useEffect(() => {
    api.get('/admin/venues/pending')
      .then(res => setPending(res.data.venues))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 20 };
        if (statusFilter !== 'All') params.status = statusFilter;
        if (search.trim()) params.search = search.trim();
        const res = await api.get('/admin/venues', { params });
        setVenues(res.data.venues);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [page, statusFilter, search]);

  const doVerify = async (id) => {
    setActionLoading(id + '-v');
    try {
      await api.patch(`/admin/venues/${id}/verify`);
      setPending(p => p.filter(v => v._id !== id));
      setVenues(p => p.filter(v => v._id !== id));
    } catch (err) { console.error(err); }
    setActionLoading('');
    setConfirmModal({ open: false, type: '', venueId: '', venueName: '' });
  };

  const doReject = async (id) => {
    setActionLoading(id + '-r');
    try {
      await api.patch(`/admin/venues/${id}/reject`);
      setPending(p => p.filter(v => v._id !== id));
      setVenues(p => p.filter(v => v._id !== id));
    } catch (err) { console.error(err); }
    setActionLoading('');
    setConfirmModal({ open: false, type: '', venueId: '', venueName: '' });
  };

  const openConfirm = (type, venue) =>
    setConfirmModal({ open: true, type, venueId: venue._id, venueName: venue.name });

  return (
    <div id="admin-venues-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Venues</h1>
          <p className="admin-page-subtitle">Review venue applications and manage all registered venues</p>
        </div>
      </div>

      {/* ── Pending Queue ── */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">
            ⏳ Pending Applications
            {pending.length > 0 && (
              <span className="admin-nav-badge" style={{ marginLeft: 8 }}>{pending.length}</span>
            )}
          </h2>
        </div>

        {pending.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <div className="empty-state-icon">✅</div>
            <h3>All caught up!</h3>
            <p>No venues pending verification.</p>
          </div>
        ) : (
          <div className="admin-venue-queue">
            {pending.map(v => (
              <div key={v._id} className="admin-venue-card">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <h3 style={{ margin: 0 }}>{v.name}</h3>
                    <span className="badge badge-pending">PENDING</span>
                  </div>
                  <p className="text-sm text-muted" style={{ marginBottom: 4 }}>
                    📍 {v.location?.address || 'No address provided'}
                  </p>
                  <p className="text-sm text-secondary" style={{ marginBottom: 4 }}>
                    🏅 {v.sportsSupported?.join(', ') || 'No sports listed'}
                  </p>
                  {v.amenities?.length > 0 && (
                    <p className="text-sm text-muted" style={{ marginBottom: 4 }}>
                      ⭐ {v.amenities.join(', ')}
                    </p>
                  )}
                  {v.ownerId && (
                    <p className="text-sm" style={{ marginTop: 6 }}>
                      Owner: <strong>{v.ownerId.name}</strong> · {v.ownerId.email}
                      {v.ownerId.whatsappNumber && (
                        <span className="text-muted"> · 📱 {v.ownerId.whatsappNumber}</span>
                      )}
                    </p>
                  )}
                  {v.description && (
                    <p className="text-sm text-secondary" style={{ marginTop: 6, fontStyle: 'italic', borderLeft: '3px solid var(--border-strong)', paddingLeft: 8 }}>
                      "{v.description.slice(0, 150)}{v.description.length > 150 ? '...' : ''}"
                    </p>
                  )}
                  {v.pitches?.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {v.pitches.map((p, i) => (
                        <span key={i} className="badge badge-completed">
                          {p.name} · {p.sports?.join('/')} · PKR {p.hourlyRate}/hr
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, minWidth: 100 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    id={`verify-venue-${v._id}`}
                    onClick={() => openConfirm('verify', v)}
                    disabled={!!actionLoading}
                  >
                    ✓ Verify
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    id={`reject-venue-${v._id}`}
                    onClick={() => openConfirm('reject', v)}
                    disabled={!!actionLoading}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── All Venues Table ── */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">All Venues</h2>
        </div>

        <div className="admin-toolbar" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="admin-search-wrap">
            <span className="admin-search-icon">🔍</span>
            <input
              className="admin-search"
              placeholder="Search venues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="admin-filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Venue</th>
                <th>Owner</th>
                <th>Sports</th>
                <th>Pitches</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="skeleton skeleton-text" style={{ width: 80 }} /></td>
                    ))}
                  </tr>
                ))
              ) : venues.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
                    No pending venues to show
                  </td>
                </tr>
              ) : (
                venues.map(v => (
                  <tr key={v._id}>
                    <td>
                      <div className="admin-user-name">{v.name}</div>
                      <div className="admin-user-email">📍 {v.location?.address || '—'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{v.ownerId?.name || '—'}</div>
                      <div className="admin-user-email">{v.ownerId?.email || '—'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {v.sportsSupported?.slice(0, 3).map(s => (
                          <span key={s} className="badge badge-sport" style={{ fontSize: 10 }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="text-muted text-sm">{v.pitches?.length || 0} pitches</td>
                    <td>
                      <span className={`badge badge-${v.verificationStatus === 'VERIFIED' ? 'approved' : v.verificationStatus === 'REJECTED' ? 'cancelled' : 'pending'}`}>
                        {v.verificationStatus}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        {v.verificationStatus === 'PENDING' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => openConfirm('verify', v)}>✓</button>
                            <button className="btn btn-danger btn-sm" onClick={() => openConfirm('reject', v)}>✕</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.type === 'verify' ? `Verify "${confirmModal.venueName}"?` : `Reject "${confirmModal.venueName}"?`}
        message={
          confirmModal.type === 'verify'
            ? `This will mark the venue as VERIFIED and grant the owner venue_owner role.`
            : `This will mark the venue as REJECTED. The owner will not be granted venue access.`
        }
        confirmLabel={confirmModal.type === 'verify' ? '✓ Verify' : '✕ Reject'}
        danger={confirmModal.type === 'reject'}
        onConfirm={() =>
          confirmModal.type === 'verify'
            ? doVerify(confirmModal.venueId)
            : doReject(confirmModal.venueId)
        }
        onCancel={() => setConfirmModal({ open: false, type: '', venueId: '', venueName: '' })}
        loading={!!actionLoading}
      />
    </div>
  );
};

export default AdminVenues;
