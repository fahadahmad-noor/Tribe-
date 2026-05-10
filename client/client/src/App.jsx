import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';

// Pages
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
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import Messages from './pages/Messages';

// Protected route wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.some(r => user.roles?.includes(r))) return <Navigate to="/feed" replace />;
  return children;
};

// Guest-only route (redirect if logged in)
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/feed" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Routes>
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
                <Route path="/squads" element={<ProtectedRoute><SquadDiscovery /></ProtectedRoute>} />
                <Route path="/squads/create" element={<ProtectedRoute><SquadCreate /></ProtectedRoute>} />
                <Route path="/squad/:id" element={<ProtectedRoute><SquadProfile /></ProtectedRoute>} />
                <Route path="/venues" element={<ProtectedRoute><VenueDirectory /></ProtectedRoute>} />
                <Route path="/venues/apply" element={<ProtectedRoute><VenueApply /></ProtectedRoute>} />
                <Route path="/venue/:id" element={<ProtectedRoute><VenueProfile /></ProtectedRoute>} />
                <Route path="/venue/dashboard" element={<ProtectedRoute roles={['venue_owner']}><VenueDashboard /></ProtectedRoute>} />
                <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />

                {/* Admin */}
                <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

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
