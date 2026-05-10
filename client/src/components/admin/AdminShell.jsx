import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin.css';

const navItems = [
  { to: '/admin',         icon: '📊', label: 'Overview',   exact: true },
  { to: '/admin/users',   icon: '👥', label: 'Users' },
  { to: '/admin/venues',  icon: '🏟️', label: 'Venues' },
  { to: '/admin/lobbies', icon: '🏆', label: 'Lobbies' },
  { to: '/admin/feed',    icon: '📡', label: 'Live Feed' },
  { to: '/admin/audit',   icon: '📋', label: 'Audit Log' },
];

const AdminShell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="admin-shell">
      {/* ── Fixed Sidebar ── */}
      <aside className="admin-sidebar">
        {/* Logo */}
        <div className="admin-sidebar-header">
          <NavLink to="/admin" className="admin-logo">
            <span className="admin-logo-icon">⚡</span>
            <span className="admin-logo-text">TRIBE</span>
            <span className="admin-logo-badge">ADMIN</span>
          </NavLink>
        </div>

        {/* Nav links */}
        <nav className="admin-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `admin-nav-link${isActive ? ' active' : ''}`
              }
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <span className="admin-user-email">{user?.email}</span>
            </div>
          </div>
          <div className="admin-nav-divider" />
          <button
            className="btn btn-ghost btn-sm w-full"
            style={{ justifyContent: 'flex-start', fontSize: 13, color: 'var(--text-secondary)' }}
            onClick={handleLogout}
          >
            ← Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="admin-main">
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminShell;
