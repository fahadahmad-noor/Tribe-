import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { useState, useEffect } from 'react';
import NotificationDropdown from '../notifications/NotificationDropdown';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner container">
        <Link to={user ? '/feed' : '/'} className="navbar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">TRIBE</span>
        </Link>

          {user && !user.roles?.includes('admin') && (
          <div className="navbar-links hide-mobile">
            <Link to="/feed" className="nav-link">Feed</Link>
            <Link to="/messages" className="nav-link">Messages</Link>
            <Link to="/squads" className="nav-link">Squads</Link>
            <Link to="/venues" className="nav-link">Venues</Link>
            <Link to="/challenges" className="nav-link">Challenges</Link>
          </div>
          )}

        <div className="navbar-actions">
          <button onClick={toggleTheme} className="btn btn-icon theme-toggle" title="Toggle theme" id="theme-toggle">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {connected && <span className="connection-dot" title="Connected" />}

          {user ? (
            <>
              {/* Admin: show only admin panel link + logout */}
              {user.roles?.includes('admin') ? (
                <>
                  <Link
                    to="/admin"
                    className="btn btn-outline btn-sm"
                    id="admin-panel-btn"
                    style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                  >
                    🛡️ Admin Panel
                  </Link>
                  <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NotificationDropdown />
                  <Link to="/lobby/create" className="btn btn-primary btn-sm hide-mobile" id="create-lobby-btn">
                    + Create Lobby
                  </Link>
                  <div className="navbar-profile" onClick={() => setMenuOpen(!menuOpen)}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="avatar avatar-sm" />
                    ) : (
                      <div className="avatar avatar-sm avatar-placeholder">{user.name?.[0]?.toUpperCase()}</div>
                    )}
                    {menuOpen && (
                      <div className="profile-dropdown" id="profile-dropdown">
                        <Link to="/profile/me" className="dropdown-item" onClick={() => setMenuOpen(false)}>Profile</Link>
                        {user.roles?.includes('venue_owner') && (
                          <Link to="/venue/dashboard" className="dropdown-item" onClick={() => setMenuOpen(false)}>Venue Dashboard</Link>
                        )}
                        <hr className="dropdown-divider" />
                        <button className="dropdown-item" onClick={handleLogout}>Logout</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="btn btn-outline btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button className="btn btn-icon mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none' }}>
            ☰
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
