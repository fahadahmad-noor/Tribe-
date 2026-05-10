import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';

const VenueDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [venue, setVenue] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const vRes = await api.get('/venues', { params: {} });
        const myVenue = vRes.data.venues?.find(v => v.ownerId?._id === user?._id || v.ownerId === user?._id);
        if (myVenue) {
          setVenue(myVenue);
          const bRes = await api.get(`/venues/${myVenue._id}/history`);
          setBookings(bRes.data.bookings);
          socket?.emit('join_venue_room', myVenue._id);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [user?._id]);

  useEffect(() => {
    if (!socket || !venue) return;
    socket.on('booking_received', (slot) => setBookings(prev => [slot, ...prev]));
    socket.on('booking_cancelled', (slot) => setBookings(prev => prev.filter(b => b._id !== slot._id)));
    return () => { socket.off('booking_received'); socket.off('booking_cancelled'); };
  }, [socket, venue?._id]);

  if (loading) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;
  if (!venue) return <div className="page container"><div className="empty-state"><h3>No venue linked to your account</h3><p>Apply to register your venue first.</p></div></div>;

  return (
    <div className="page" id="venue-dashboard-page">
      <div className="container">
        <div className="flex justify-between items-start mb-6">
          <div><h1>📊 Venue Dashboard</h1><p className="text-secondary">{venue.name}</p></div>
          <span className={`badge ${venue.isVerified ? 'badge-open' : 'badge-pending'}`}>{venue.isVerified ? 'Verified ✓' : 'Pending Verification'}</span>
        </div>
        <div className="grid grid-3 gap-4 mb-8">
          <div className="card card-body text-center"><span className="text-mono" style={{fontSize:32,fontWeight:700}}>{venue.pitches?.length || 0}</span><p className="text-muted">Pitches</p></div>
          <div className="card card-body text-center"><span className="text-mono" style={{fontSize:32,fontWeight:700,color:'var(--accent-secondary)'}}>{bookings.length}</span><p className="text-muted">Bookings</p></div>
          <div className="card card-body text-center"><span className="text-mono" style={{fontSize:32,fontWeight:700,color:'var(--accent-amber)'}}>{venue.bookingMode}</span><p className="text-muted">Booking Mode</p></div>
        </div>

        <h2 className="mb-4">Recent Bookings</h2>
        {bookings.length === 0 ? <p className="text-muted">No bookings yet.</p> : (
          <div className="flex flex-col gap-2">
            {bookings.map(b => (
              <div key={b._id} className="card card-body flex justify-between items-center" style={{padding:'var(--space-3) var(--space-4)'}}>
                <div>
                  <span className="font-semibold">{b.pitchName}</span>
                  <p className="text-sm text-muted">{new Date(b.startTime).toLocaleString()} — {new Date(b.endTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueDashboard;


