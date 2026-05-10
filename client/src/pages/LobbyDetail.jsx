import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import MapEmbed from '../components/ui/MapEmbed';
import '../styles/pages/LobbyDetail.css';

const LobbyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [lobby, setLobby] = useState(null);
  const [requests, setRequests] = useState([]);
  const [myRequest, setMyRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');

  // Waitlist state
  const [waitlist, setWaitlist] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Group chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [chatCursor, setChatCursor] = useState(null);
  const chatEndRef = useRef(null);

  const isOrganizer = lobby?.organizerId?._id === user?._id;
  const isConfirmed = lobby?.confirmedPlayerIds?.some(p => (p._id || p) === user?._id);
  const canChat = isOrganizer || isConfirmed;
  const isFinished = lobby?.status === 'COMPLETED' || lobby?.status === 'CANCELLED';

  // My position in waitlist
  const myWaitlistEntry = waitlist.find(w => w.isMe);
  const isOnWaitlist = myRequest?.type === 'WAITLIST' && myRequest?.status === 'PENDING';
  const isPromoted = myRequest?.type === 'WAITLIST' && myRequest?.status === 'APPROVED';

  // ── Fetch waitlist ───────────────────────────────────────────────
  const fetchWaitlist = useCallback(async () => {
    if (!id) return;
    setWaitlistLoading(true);
    try {
      const res = await api.get(`/requests/lobby/${id}/waitlist`);
      setWaitlist(res.data.waitlist || []);
    } catch (e) {
      console.error('Waitlist fetch error:', e);
    } finally {
      setWaitlistLoading(false);
    }
  }, [id]);

  // ── Fetch lobby ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const lobbyRes = await api.get(`/lobbies/${id}`);
        setLobby(lobbyRes.data.lobby);
        if (lobbyRes.data.lobby.organizerId?._id === user?._id) {
          const reqRes = await api.get(`/requests/lobby/${id}/requests`);
          setRequests(reqRes.data.requests);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user?._id]);

  // ── Fetch my request status ──────────────────────────────────────
  useEffect(() => {
    const checkRequest = async () => {
      try {
        const res = await api.get(`/requests/lobby/${id}/my-request`);
        setMyRequest(res.data.request || null);
      } catch (e) { /* ignore */ }
    };
    if (id && user?._id) checkRequest();
  }, [id, user?._id]);

  // ── Fetch waitlist on mount and when tab switches to waitlist ────
  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  // ── Load group chat ──────────────────────────────────────────────
  const loadChat = useCallback(async (cursor = null) => {
    setChatLoading(true);
    try {
      const params = { limit: 40 };
      if (cursor) params.cursor = cursor;
      const res = await api.get(`/lobbies/${id}/chat`, { params });
      if (cursor) {
        setChatMessages(prev => [...(res.data.messages || []), ...prev]);
      } else {
        setChatMessages(res.data.messages || []);
      }
      setChatHasMore(res.data.hasMore || false);
      setChatCursor(res.data.nextCursor || null);
    } catch (e) { /* not a member */ }
    finally { setChatLoading(false); }
  }, [id]);

  useEffect(() => {
    if (tab === 'chat' && canChat) loadChat();
  }, [tab, canChat, loadChat]);

  useEffect(() => {
    if (tab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, tab]);

  // ── Socket ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('join_lobby_room', id);

    socket.on('roster_updated', (data) => {
      setLobby(prev => prev ? { ...prev, openSlots: data.openSlots, status: data.status, confirmedPlayerIds: data.confirmedPlayerIds || prev.confirmedPlayerIds } : prev);
    });
    socket.on('lobby_locked',    () => setLobby(prev => prev ? { ...prev, status: 'LOCKED'    } : prev));
    socket.on('lobby_cancelled', () => setLobby(prev => prev ? { ...prev, status: 'CANCELLED' } : prev));
    socket.on('lobby_completed', () => setLobby(prev => prev ? { ...prev, status: 'COMPLETED' } : prev));
    socket.on('request_received', (req) => setRequests(prev => [...prev, req]));
    socket.on('player_dropped', (data) => {
      setLobby(prev => prev ? { ...prev, openSlots: data.openSlots, status: data.status } : prev);
    });
    socket.on('lobby_message', (msg) => {
      setChatMessages(prev => [...prev.filter(m => m._id !== msg._id), msg]);
    });
    // Waitlist changed — re-fetch live
    socket.on('waitlist_updated', () => {
      fetchWaitlist();
    });

    return () => {
      socket.emit('leave_lobby_room', id);
      ['roster_updated','lobby_locked','lobby_cancelled','lobby_completed',
       'request_received','player_dropped','lobby_message','waitlist_updated']
        .forEach(ev => socket.off(ev));
    };
  }, [socket, id, fetchWaitlist]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleJoinRequest = async () => {
    try {
      const res = await api.post(`/requests/lobby/${id}/request`);
      setMyRequest(res.data.request);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleJoinWaitlist = async () => {
    try {
      const res = await api.post(`/requests/lobby/${id}/waitlist`);
      setMyRequest(res.data.request);
      fetchWaitlist();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleAcceptPromotion = async () => {
    if (!myRequest) return;
    try {
      await api.patch(`/requests/request/${myRequest._id}/accept`);
      setMyRequest(prev => ({ ...prev, status: 'APPROVED', type: 'WAITLIST' }));
      fetchWaitlist();
    } catch (err) { alert(err.response?.data?.error || 'Failed to accept'); }
  };

  const handleApprove = async (reqId) => {
    try {
      const res = await api.patch(`/requests/request/${reqId}/approve`);
      setRequests(prev => prev.map(r => r._id === reqId ? { ...r, status: 'APPROVED' } : r));
      setLobby(res.data.lobby);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleReject = async (reqId) => {
    try {
      await api.patch(`/requests/request/${reqId}/reject`);
      setRequests(prev => prev.map(r => r._id === reqId ? { ...r, status: 'REJECTED' } : r));
    } catch { alert('Failed'); }
  };

  const handleDropout = async () => {
    if (!myRequest || !confirm('Leave this match?')) return;
    try {
      await api.patch(`/requests/request/${myRequest._id}/dropout`);
      setMyRequest(prev => ({ ...prev, status: 'DROPPED_OUT' }));
    } catch { alert('Failed'); }
  };

  const handleClose = async () => {
    try {
      await api.patch(`/lobbies/${id}/close`);
      setLobby(prev => ({ ...prev, status: 'LOCKED' }));
    } catch { alert('Failed'); }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this match as completed? This cannot be undone.')) return;
    try {
      await api.post(`/lobbies/${id}/complete`);
      setLobby(prev => ({ ...prev, status: 'COMPLETED' }));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleManualDecrement = async () => {
    try {
      const res = await api.post(`/lobbies/${id}/manual-decrement`);
      setLobby(res.data.lobby);
    } catch (err) { alert(err.response?.data?.error || 'No slots'); }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('send_lobby_message', { lobbyId: id, message: chatInput.trim() });
    setChatInput('');
  };

  const handleCancelRequest = async () => {
    if (!myRequest) return;
    try {
      await api.patch(`/requests/request/${myRequest._id}/cancel`);
      setMyRequest(prev => ({ ...prev, status: 'CANCELLED' }));
      if (myRequest.type === 'WAITLIST') fetchWaitlist();
    } catch { /* ignore */ }
  };

  // ── Render ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page container">
        <div className="skeleton skeleton-title mt-6" />
        <div className="skeleton skeleton-card mt-4" />
      </div>
    );
  }
  if (!lobby) return <div className="page container"><h2>Lobby not found</h2></div>;

  const time = new Date(lobby.dateTime).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="lobby-detail-page page" id="lobby-detail-page">
      <div className="container">
        <div className="lobby-detail-grid">

          {/* ── Main ──────────────────────────────────────────────── */}
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
                {lobby.location?.coordinates && lobby.location.coordinates[0] !== 0 && (
                  <MapEmbed coordinates={lobby.location.coordinates} address={lobby.location.address} />
                )}
              </div>
              <div className={`slot-counter-lg ${lobby.openSlots <= 2 && lobby.openSlots > 0 ? 'urgent' : ''} ${lobby.openSlots === 0 ? 'full' : ''}`}>
                <span className="slot-number">{lobby.openSlots}</span>
                <span className="slot-label">/ {lobby.totalSlots} slots</span>
              </div>
            </div>

            {lobby.description && <p className="lobby-description card card-body">{lobby.description}</p>}

            {/* Tabs */}
            <div className="detail-tabs">
              <button className={`tab-btn ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
                Roster ({lobby.confirmedPlayerIds?.length || 0})
              </button>
              <button className={`tab-btn ${tab === 'waitlist' ? 'active' : ''}`} onClick={() => setTab('waitlist')}>
                ⏳ Waitlist {waitlist.length > 0 && <span className="waitlist-count-badge">{waitlist.length}</span>}
              </button>
              {isOrganizer && (
                <button className={`tab-btn ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
                  Requests ({requests.filter(r => r.status === 'PENDING').length})
                </button>
              )}
              {canChat && (
                <button className={`tab-btn ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
                  💬 Chat {isFinished && <span className="chat-ended-badge">ended</span>}
                </button>
              )}
            </div>

            {/* ── Roster ────────────────────────────────────────── */}
            {tab === 'info' && (
              <div className="roster-panel slide-up">
                <h3>Confirmed Players ({lobby.confirmedPlayerIds?.length || 0})</h3>
                <div className="roster-list mt-3">
                  {lobby.confirmedPlayerIds?.map(player => (
                    <div key={player._id || player} className="roster-player">
                      {player.avatarUrl
                        ? <img src={player.avatarUrl} className="avatar avatar-sm" alt="" />
                        : <div className="avatar avatar-sm avatar-placeholder">{player.name?.[0]}</div>}
                      <Link to={`/profile/${player._id || player}`} className="roster-name">
                        {player.name || 'Player'}
                      </Link>
                      {(player._id || player) === lobby.organizerId?._id && (
                        <span className="badge badge-sport">Organizer</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Waitlist Tab (public) ──────────────────────────── */}
            {tab === 'waitlist' && (
              <div className="waitlist-panel slide-up">
                {waitlistLoading ? (
                  <p className="text-muted text-center py-4">Loading waitlist…</p>
                ) : waitlist.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem 0' }}>
                    <div className="empty-state-icon" style={{ fontSize: '2rem' }}>🎉</div>
                    <p className="text-muted">No one is waiting — slots are available!</p>
                  </div>
                ) : (
                  <>
                    <p className="text-secondary text-sm mb-3">{waitlist.length} player{waitlist.length !== 1 ? 's' : ''} in queue</p>
                    <div className="waitlist-list">
                      {waitlist.map(w => (
                        <div key={w._id} className={`waitlist-card ${w.isMe ? 'waitlist-me' : ''}`}>
                          <span className="waitlist-position">#{w.position}</span>
                          {w.user?.avatarUrl
                            ? <img src={w.user.avatarUrl} className="avatar avatar-sm" alt="" />
                            : <div className="avatar avatar-sm avatar-placeholder">{w.user?.name?.[0]}</div>}
                          <div className="waitlist-info">
                            <Link to={`/profile/${w.user?._id}`} className="waitlist-name">
                              {w.isMe ? 'You' : w.user?.name}
                            </Link>
                            {w.user?.skillLevel && w.user.skillLevel !== 'Beginner' && (
                              <span className="waitlist-skill">{w.user.skillLevel}</span>
                            )}
                          </div>
                          <span className="waitlist-time text-muted text-xs">
                            {timeAgo(w.joinedAt)}
                          </span>
                          {w.isMe && <span className="badge badge-open">You</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Requests (organizer) ──────────────────────────── */}
            {tab === 'requests' && isOrganizer && (
              <div className="requests-panel slide-up">
                {requests.filter(r => r.status === 'PENDING').length === 0 && (
                  <p className="text-muted p-4">No pending requests.</p>
                )}
                {requests.map(req => (
                  <div key={req._id} className="request-card card card-body">
                    <div className="flex items-center gap-3">
                      {req.userId?.avatarUrl
                        ? <img src={req.userId.avatarUrl} className="avatar" alt="" />
                        : <div className="avatar avatar-placeholder">{req.userId?.name?.[0]}</div>}
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

            {/* ── Group Chat ────────────────────────────────────── */}
            {tab === 'chat' && canChat && (
              <div className="chat-panel slide-up">
                {isFinished && (
                  <div className="chat-finished-banner">
                    🏁 Match {lobby.status === 'COMPLETED' ? 'completed' : 'cancelled'} — messages are read-only
                  </div>
                )}
                {chatHasMore && (
                  <div className="text-center mb-3">
                    <button className="btn btn-outline btn-sm" onClick={() => loadChat(chatCursor)} disabled={chatLoading}>
                      {chatLoading ? 'Loading…' : '↑ Load older messages'}
                    </button>
                  </div>
                )}
                <div className="chat-messages">
                  {chatLoading && chatMessages.length === 0 && <p className="text-center text-muted py-6">Loading messages…</p>}
                  {!chatLoading && chatMessages.length === 0 && <p className="text-center text-muted py-6">No messages yet. Say something! 👋</p>}
                  {chatMessages.map(msg => {
                    const isMe = (msg.senderId?._id || msg.senderId) === user?._id;
                    return (
                      <div key={msg._id} className={`chat-msg ${isMe ? 'own' : ''}`}>
                        <div className="chat-msg-header">
                          <span className="chat-author">{isMe ? 'You' : msg.senderId?.name}</span>
                          <span className="chat-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p>{msg.message}</p>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                {!isFinished && (
                  <form className="chat-input-form" onSubmit={handleSendChat}>
                    <input className="input" placeholder="Message the group…" value={chatInput} onChange={e => setChatInput(e.target.value)} maxLength={2000} />
                    <button type="submit" className="btn btn-primary" disabled={!chatInput.trim()}>Send</button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar ───────────────────────────────────────────── */}
          <div className="lobby-sidebar">
            <div className="card card-body">
              <h3 className="mb-4">Actions</h3>

              {/* ── Non-organizer, not confirmed, no request ── */}
              {!isOrganizer && !isConfirmed && !myRequest && lobby.status === 'OPEN' && (
                <button className="btn btn-primary w-full" onClick={handleJoinRequest} id="join-request-btn">
                  Request to Join
                </button>
              )}

              {/* ── Lobby full, can join waitlist ── */}
              {!isOrganizer && !isConfirmed && !myRequest && lobby.status === 'LOCKED' && (
                <button className="btn btn-outline w-full" onClick={handleJoinWaitlist} id="join-waitlist-btn">
                  ⏳ Join Waitlist
                </button>
              )}

              {/* ── My request status ── */}
              {myRequest && !isPromoted && (
                <div className="my-request-status">
                  <p className="text-sm mb-2">
                    Your status: <span className={`badge badge-${myRequest.status.toLowerCase()}`}>{myRequest.status}</span>
                  </p>
                  {myRequest.status === 'PENDING' && myRequest.type === 'WAITLIST' && myWaitlistEntry && (
                    <p className="text-sm text-muted mb-2">
                      📍 You are <strong>#{myWaitlistEntry.position}</strong> in queue
                    </p>
                  )}
                  {myRequest.status === 'APPROVED' && myRequest.type === 'JOIN' && (
                    <button className="btn btn-danger btn-sm w-full mt-2" onClick={handleDropout}>Leave Match</button>
                  )}
                  {(myRequest.status === 'PENDING') && (
                    <button className="btn btn-outline btn-sm w-full mt-2" onClick={handleCancelRequest}>
                      Cancel {myRequest.type === 'WAITLIST' ? 'Waitlist Spot' : 'Request'}
                    </button>
                  )}
                </div>
              )}

              {/* ── Waitlist promotion: user was notified, can accept ── */}
              {isOnWaitlist && myWaitlistEntry?.position === 1 && (
                <div className="promotion-banner">
                  <p className="font-semibold text-sm mb-2">🎉 A slot opened up!</p>
                  <p className="text-xs text-muted mb-3">You are #1 — accept within 5 minutes.</p>
                  <button className="btn btn-primary w-full" onClick={handleAcceptPromotion}>
                    ✅ Accept Spot
                  </button>
                </div>
              )}

              {/* ── Organizer actions ── */}
              {isOrganizer && !isFinished && (
                <div className="flex flex-col gap-2">
                  {lobby.status === 'OPEN' && (
                    <>
                      <button className="btn btn-outline w-full" onClick={handleManualDecrement} disabled={lobby.openSlots === 0}>
                        Friend Joined Offline
                      </button>
                      <button className="btn btn-outline w-full" onClick={handleClose}>🔒 Lock Lobby</button>
                    </>
                  )}
                  <button className="btn btn-secondary w-full" onClick={handleComplete}>✅ End Match</button>
                </div>
              )}
            </div>

            {/* Organizer card */}
            <div className="card card-body mt-4">
              <h4 className="mb-3 text-muted">Organized by</h4>
              <div className="flex items-center gap-3">
                {lobby.organizerId?.avatarUrl
                  ? <img src={lobby.organizerId.avatarUrl} className="avatar avatar-lg" alt="" />
                  : <div className="avatar avatar-lg avatar-placeholder">{lobby.organizerId?.name?.[0]}</div>}
                <div>
                  <Link to={`/profile/${lobby.organizerId?._id}`} className="font-semibold" style={{ textDecoration: 'none', color: 'inherit' }}>
                    {lobby.organizerId?.name}
                  </Link>
                  {lobby.organizerId?.whatsappNumber && (
                    <p className="text-sm text-secondary">📱 {lobby.organizerId.whatsappNumber}</p>
                  )}
                </div>
              </div>
              {!isOrganizer && (
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-outline btn-sm flex-1" onClick={() => navigate(`/messages?user=${lobby.organizerId._id}`)}>
                    ✉️ Message
                  </button>
                  <Link to={`/profile/${lobby.organizerId?._id}`} className="btn btn-outline btn-sm flex-1">
                    👤 Profile
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default LobbyDetail;
