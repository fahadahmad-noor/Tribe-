import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import '../styles/pages/LobbyDetail.css';

const LobbyDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [lobby, setLobby] = useState(null);
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [myRequest, setMyRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const chatEndRef = useRef(null);

  const isOrganizer = lobby?.organizerId?._id === user?._id;
  const isConfirmed = lobby?.confirmedPlayerIds?.some(p => (p._id || p) === user?._id);

  // Fetch lobby data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lobbyRes, msgRes] = await Promise.all([
          api.get(`/lobbies/${id}`),
          api.get(`/lobbies/${id}/messages?limit=50`),
        ]);
        setLobby(lobbyRes.data.lobby);
        setMessages(msgRes.data.messages);

        // Get requests if organizer
        if (lobbyRes.data.lobby.organizerId?._id === user?._id) {
          const reqRes = await api.get(`/requests/lobby/${id}/requests`);
          setRequests(reqRes.data.requests);
        }

        // Check user's request
        try {
          const histRes = await api.get('/users/me/history');
          const myReq = histRes.data.requests?.find(r => r.lobbyId?._id === id || r.lobbyId === id);
          setMyRequest(myReq || null);
        } catch (e) {}
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user?._id]);

  // Socket room & events
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('join_lobby_room', id);

    socket.on('roster_updated', (data) => {
      setLobby(prev => prev ? { ...prev, openSlots: data.openSlots, status: data.status, confirmedPlayerIds: data.confirmedPlayerIds || prev.confirmedPlayerIds } : prev);
    });
    socket.on('lobby_locked', () => setLobby(prev => prev ? { ...prev, status: 'LOCKED' } : prev));
    socket.on('lobby_cancelled', () => setLobby(prev => prev ? { ...prev, status: 'CANCELLED' } : prev));
    socket.on('new_message', (msg) => setMessages(prev => [...prev, msg]));
    socket.on('request_received', (req) => setRequests(prev => [...prev, req]));
    socket.on('player_dropped', (data) => {
      setLobby(prev => prev ? { ...prev, openSlots: data.openSlots, status: data.status } : prev);
    });

    return () => {
      socket.emit('leave_lobby_room', id);
      socket.off('roster_updated');
      socket.off('lobby_locked');
      socket.off('lobby_cancelled');
      socket.off('new_message');
      socket.off('request_received');
      socket.off('player_dropped');
    };
  }, [socket, id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !socket) return;
    socket.emit('send_message', { lobbyId: id, message: newMsg.trim() });
    setNewMsg('');
  };

  const handleJoinRequest = async () => {
    try {
      const res = await api.post(`/requests/lobby/${id}/request`);
      setMyRequest(res.data.request);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit request');
    }
  };

  const handleApprove = async (reqId) => {
    try {
      const res = await api.patch(`/requests/request/${reqId}/approve`);
      setRequests(prev => prev.map(r => r._id === reqId ? { ...r, status: 'APPROVED' } : r));
      setLobby(res.data.lobby);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleReject = async (reqId) => {
    try {
      await api.patch(`/requests/request/${reqId}/reject`);
      setRequests(prev => prev.map(r => r._id === reqId ? { ...r, status: 'REJECTED' } : r));
    } catch (err) { alert('Failed'); }
  };

  const handleDropout = async () => {
    if (!myRequest || !confirm('Are you sure you want to leave this match?')) return;
    try {
      await api.patch(`/requests/request/${myRequest._id}/dropout`);
      setMyRequest(prev => ({ ...prev, status: 'DROPPED_OUT' }));
    } catch (err) { alert('Failed'); }
  };

  const handleClose = async () => {
    try {
      await api.patch(`/lobbies/${id}/close`);
      setLobby(prev => ({ ...prev, status: 'LOCKED' }));
    } catch (err) { alert('Failed'); }
  };

  const handleManualDecrement = async () => {
    try {
      const res = await api.post(`/lobbies/${id}/manual-decrement`);
      setLobby(res.data.lobby);
    } catch (err) { alert(err.response?.data?.error || 'No slots'); }
  };

  if (loading) {
    return (
      <div className="page container">
        <div className="skeleton skeleton-title mt-6" />
        <div className="skeleton skeleton-card mt-4" />
      </div>
    );
  }

  if (!lobby) return <div className="page container"><h2>Lobby not found</h2></div>;

  const time = new Date(lobby.dateTime).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="lobby-detail-page page" id="lobby-detail-page">
      <div className="container">
        <div className="lobby-detail-grid">
          {/* Main Content */}
          <div className="lobby-main">
            <div className="lobby-detail-header">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`badge badge-${lobby.status.toLowerCase()}`}>{lobby.status}</span>
                  <span className="badge badge-sport">{lobby.sport}</span>
                </div>
                <h1>{lobby.sport} — {lobby.matchFormat}-a-side</h1>
                <p className="text-secondary mt-1">📅 {time}</p>
                <p className="text-secondary">📍 {lobby.location?.address || 'Location TBD'}</p>
              </div>
              <div className={`slot-counter-lg ${lobby.openSlots <= 2 && lobby.openSlots > 0 ? 'urgent' : ''} ${lobby.openSlots === 0 ? 'full' : ''}`}>
                <span className="slot-number">{lobby.openSlots}</span>
                <span className="slot-label">/ {lobby.totalSlots} slots</span>
              </div>
            </div>

            {lobby.description && <p className="lobby-description card card-body">{lobby.description}</p>}

            {/* Tabs */}
            <div className="detail-tabs">
              <button className={`tab-btn ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>Roster</button>
              {(isConfirmed || isOrganizer) && <button className={`tab-btn ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>Chat</button>}
              {isOrganizer && <button className={`tab-btn ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>Requests ({requests.filter(r => r.status === 'PENDING').length})</button>}
            </div>

            {/* Roster Tab */}
            {tab === 'info' && (
              <div className="roster-panel slide-up">
                <h3>Confirmed Players ({lobby.confirmedPlayerIds?.length || 0})</h3>
                <div className="roster-list mt-3">
                  {lobby.confirmedPlayerIds?.map(player => (
                    <div key={player._id || player} className="roster-player">
                      {player.avatarUrl ? <img src={player.avatarUrl} className="avatar avatar-sm" alt="" /> : <div className="avatar avatar-sm avatar-placeholder">{player.name?.[0]}</div>}
                      <span>{player.name || 'Player'}</span>
                      {(player._id || player) === lobby.organizerId?._id && <span className="badge badge-sport">Organizer</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {tab === 'chat' && (isConfirmed || isOrganizer) && (
              <div className="chat-panel slide-up">
                <div className="chat-messages">
                  {messages.length === 0 && <p className="text-muted text-center p-4">No messages yet. Say hello! 👋</p>}
                  {messages.map(msg => (
                    <div key={msg._id} className={`chat-msg ${msg.userId?._id === user?._id ? 'own' : ''}`}>
                      <div className="chat-msg-header">
                        <span className="chat-author">{msg.userId?._id === user?._id ? 'You' : msg.userId?.name}</span>
                        <span className="chat-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p>{msg.message}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form className="chat-input-form" onSubmit={sendMessage}>
                  <input type="text" className="input" placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} maxLength={2000} />
                  <button type="submit" className="btn btn-primary" disabled={!newMsg.trim()}>Send</button>
                </form>
              </div>
            )}

            {/* Requests Tab (Organizer) */}
            {tab === 'requests' && isOrganizer && (
              <div className="requests-panel slide-up">
                {requests.filter(r => r.status === 'PENDING').length === 0 && <p className="text-muted p-4">No pending requests.</p>}
                {requests.map(req => (
                  <div key={req._id} className="request-card card card-body">
                    <div className="flex items-center gap-3">
                      {req.userId?.avatarUrl ? <img src={req.userId.avatarUrl} className="avatar" alt="" /> : <div className="avatar avatar-placeholder">{req.userId?.name?.[0]}</div>}
                      <div>
                        <p className="font-semibold">{req.userId?.name}</p>
                        <p className="text-sm text-muted">{req.userId?.preferences?.join(', ') || 'No preferences'}</p>
                      </div>
                      <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                    </div>
                    {req.status === 'PENDING' && (
                      <div className="flex gap-2 mt-3">
                        <button className="btn btn-secondary btn-sm" onClick={() => handleApprove(req._id)}>✓ Approve</button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleReject(req._id)}>✕ Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Actions */}
          <div className="lobby-sidebar">
            <div className="card card-body">
              <h3 className="mb-4">Actions</h3>
              {!isOrganizer && !isConfirmed && !myRequest && lobby.status === 'OPEN' && (
                <button className="btn btn-primary w-full" onClick={handleJoinRequest} id="join-request-btn">Request to Join</button>
              )}
              {!isOrganizer && !isConfirmed && !myRequest && lobby.status === 'LOCKED' && (
                <button className="btn btn-outline w-full" onClick={async () => { try { const res = await api.post(`/requests/lobby/${id}/waitlist`); setMyRequest(res.data.request); } catch (e) { alert(e.response?.data?.error); } }}>Join Waitlist</button>
              )}
              {myRequest && (
                <div className="my-request-status">
                  <p className="text-sm">Your request: <span className={`badge badge-${myRequest.status.toLowerCase()}`}>{myRequest.status}</span></p>
                  {myRequest.status === 'APPROVED' && <button className="btn btn-danger btn-sm w-full mt-3" onClick={handleDropout}>Leave Match</button>}
                  {myRequest.status === 'PENDING' && <button className="btn btn-outline btn-sm w-full mt-3" onClick={async () => { try { await api.patch(`/requests/request/${myRequest._id}/cancel`); setMyRequest(p => ({ ...p, status: 'CANCELLED' })); } catch (e) {} }}>Cancel Request</button>}
                </div>
              )}
              {isOrganizer && (
                <>
                  {lobby.status === 'OPEN' && (
                    <>
                      <button className="btn btn-outline w-full mt-3" onClick={handleManualDecrement} disabled={lobby.openSlots === 0}>Friend Joined Offline</button>
                      <button className="btn btn-outline w-full mt-3" onClick={handleClose}>Close Lobby</button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Organizer Info */}
            <div className="card card-body mt-4">
              <h4 className="mb-3 text-muted">Organized by</h4>
              <div className="flex items-center gap-3">
                {lobby.organizerId?.avatarUrl ? <img src={lobby.organizerId.avatarUrl} className="avatar avatar-lg" alt="" /> : <div className="avatar avatar-lg avatar-placeholder">{lobby.organizerId?.name?.[0]}</div>}
                <div>
                  <p className="font-semibold">{lobby.organizerId?.name}</p>
                  {isConfirmed && lobby.organizerId?.whatsappNumber && <p className="text-sm text-secondary">📱 {lobby.organizerId.whatsappNumber}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyDetail;


