import { useState, useEffect } from 'react';
import api from '../api/axios';

const ACTION_LABELS = {
  BAN_USER: { label: 'Banned User', color: '#DC3545' },
  UNBAN_USER: { label: 'Unbanned User', color: '#2A9D8F' },
  CHANGE_ROLES: { label: 'Changed Roles', color: '#8A63D2' },
  VERIFY_VENUE: { label: 'Verified Venue', color: '#2A9D8F' },
  REJECT_VENUE: { label: 'Rejected Venue', color: '#E09145' },
  CLOSE_LOBBY: { label: 'Closed Lobby', color: '#DC3545' },
};

const AdminAudit = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 20 };
        if (actionFilter) params.action = actionFilter;
        const res = await api.get('/admin/audit', { params });
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [page, actionFilter]);

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const start = (page - 1) * 20 + 1;
  const end = Math.min(page * 20, total);

  return (
    <div id="admin-audit-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Audit Log</h1>
          <p className="admin-page-subtitle">
            Every admin action is recorded here — immutable, timestamped, traceable.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <select
          className="admin-filter-select"
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          id="admin-audit-action-filter"
        >
          <option value="">All Actions</option>
          {Object.keys(ACTION_LABELS).map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a].label}</option>
          ))}
        </select>
        {!loading && (
          <span className="admin-results-count">
            {total === 0 ? 'No logs yet' : `${start}–${end} of ${total.toLocaleString()} records`}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Reason / Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j}><div className="skeleton skeleton-text" style={{ width: 80 }} /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                  No audit records yet. Actions like banning users or verifying venues will appear here.
                </td>
              </tr>
            ) : (
              logs.map(log => {
                const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-muted)' };
                return (
                  <tr key={log._id}>
                    <td className="text-sm" style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500 }}>{timeAgo(log.createdAt)}</div>
                      <div className="text-xs text-muted">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{log.adminId?.name || '—'}</div>
                      <div className="admin-user-email">{log.adminId?.email || ''}</div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: meta.color + '18',
                          color: meta.color,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                        }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="text-mono text-sm text-muted">
                      {log.targetType} · {String(log.targetId).slice(-8)}
                    </td>
                    <td className="text-sm text-secondary">
                      {log.meta?.reason || log.meta?.roles?.join(', ') || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <span className="admin-pagination-info">Page {page} of {totalPages}</span>
            <div className="admin-pagination-controls">
              <button className="admin-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button key={p} className={`admin-page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button className="admin-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAudit;
