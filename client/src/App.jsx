import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import AdminShell from './components/admin/AdminShell';

// Player Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import LobbyCreate from './pages/LobbyCreate';
import LobbyDetail from './pages/LobbyDetail';
import Profile from './pages/Profile';
import SquadDiscovery from './pages/SquadDiscovery';
import SquadProfile from './pages/SquadProfile';
import SquadCreate from './pages/SquadCreate';
import VenueDirectory from './pages/VenueDirectory';
import VenueProfile from './pages/VenueProfile';
import VenueApply from './pages/VenueApply';
import VenueDashboard from './pages/VenueDashboard';
import Challenges from './pages/Challenges';
import Messages from './pages/Messages';
import MatchHistory from './pages/MatchHistory';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';
import AdminVenues from './pages/AdminVenues';
import AdminLobbies from './pages/AdminLobbies';
import AdminFeed from './pages/AdminFeed';
import AdminAudit from './pages/AdminAudit';

// ── Route Guards ────────────────────────────────────────────────
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  // If role check fails: admins stay in admin area, others go to feed
  if (roles && !roles.some(r => user.roles?.includes(r))) {
    return <Navigate to={user.roles?.includes('admin') ? '/admin' : '/feed'} replace />;
  }
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  // Admins bypass the guest check and go straight to /admin if they somehow hit a guest page
  if (user) return <Navigate to={user.roles?.includes('admin') ? '/admin' : '/feed'} replace />;
  return children;
};

// ── App ─────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              {/* ── Admin Shell (separate layout, no player navbar) ── */}
              <Route
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/users/:id" element={<AdminUserDetail />} />
                <Route path="/admin/venues" element={<AdminVenues />} />
                <Route path="/admin/lobbies" element={<AdminLobbies />} />
                <Route path="/admin/feed" element={<AdminFeed />} />
                <Route path="/admin/audit" element={<AdminAudit />} />
              </Route>

              {/* ── Player Layout ── */}
              <Route element={<Layout />}>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

                {/* Authenticated */}
                <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/lobby/create" element={<ProtectedRoute><LobbyCreate /></ProtectedRoute>} />
                <Route path="/lobby/:id" element={<ProtectedRoute><LobbyDetail /></ProtectedRoute>} />
                <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><MatchHistory /></ProtectedRoute>} />
                <Route path="/history/:id" element={<ProtectedRoute><MatchHistory /></ProtectedRoute>} />
                <Route path="/squads" element={<ProtectedRoute><SquadDiscovery /></ProtectedRoute>} />
                <Route path="/squads/create" element={<ProtectedRoute><SquadCreate /></ProtectedRoute>} />
                <Route path="/squad/:id" element={<ProtectedRoute><SquadProfile /></ProtectedRoute>} />
                <Route path="/venues" element={<ProtectedRoute><VenueDirectory /></ProtectedRoute>} />
                <Route path="/venues/apply" element={<ProtectedRoute><VenueApply /></ProtectedRoute>} />
                <Route path="/venue/:id" element={<ProtectedRoute><VenueProfile /></ProtectedRoute>} />
                <Route path="/venue/dashboard" element={<ProtectedRoute roles={['venue_owner']}><VenueDashboard /></ProtectedRoute>} />
                <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
