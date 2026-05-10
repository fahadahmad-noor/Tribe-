import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import '../styles/pages/Messages.css';

// Debounce helper
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

const Messages = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const initialUserId = searchParams.get('user');

  const [conversations, setConversations] = useState([]);
  const [activeUser,    setActiveUser]    = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [newMessage,    setNewMessage]    = useState('');
  const [loadingConv,   setLoadingConv]   = useState(true);

  // Player search state
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch,    setShowSearch]    = useState(false);

  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);
  const debouncedQuery = useDebounce(searchQuery, 280);

  // ── Inbox ──────────────────────────────────────────────────────
  const fetchInbox = useCallback(async () => {
    try {
      const res = await api.get('/messages/inbox');
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Failed to load inbox', err);
    } finally {
      setLoadingConv(false);
    }
  }, []);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  // ── Thread ─────────────────────────────────────────────────────
  const fetchThread = useCallback(async (userId) => {
    try {
      const res = await api.get(`/messages/${userId}`);
      setMessages(res.data.messages || []);
      if (!conversations.some(c => c.user._id === userId)) {
        const userRes = await api.get(`/users/${userId}`);
        if (userRes.data?.user) {
          setConversations(prev => [{
            user: userRes.data.user,
            lastMessage: { message: 'Start of conversation', createdAt: new Date() }
          }, ...prev]);
        }
      }
    } catch (err) {
      console.error('Failed to load thread', err);
    }
  }, [conversations]);

  useEffect(() => { if (activeUser) fetchThread(activeUser._id); }, [activeUser?._id]);

  // ── Initial URL param ──────────────────────────────────────────
  useEffect(() => {
    if (initialUserId && (!activeUser || activeUser.name === 'Loading…')) {
      const conv = conversations.find(c => c.user._id === initialUserId);
      if (conv) setActiveUser(conv.user);
      else if (!activeUser) setActiveUser({ _id: initialUserId, name: 'Loading…' });
    }
  }, [initialUserId, conversations, activeUser]);

  // ── Scroll ─────────────────────────────────────────────────────
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Socket ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleDm = (msg) => {
      if (activeUser && (msg.senderId._id === activeUser._id || msg.receiverId._id === activeUser._id)) {
        setMessages(prev => [...prev.filter(m => m._id !== msg._id), msg]);
      }
      fetchInbox();
    };
    socket.on('direct_message', handleDm);
    return () => socket.off('direct_message', handleDm);
  }, [socket, activeUser, fetchInbox]);

  // ── Player search (scored API) ─────────────────────────────────
  useEffect(() => {
    if (!showSearch) return;
    if (debouncedQuery.length < 2) { setSearchResults([]); return; }
    let cancelled = false;
    setSearchLoading(true);
    api.get('/users/search', { params: { q: debouncedQuery } })
      .then(res => { if (!cancelled) setSearchResults(res.data.users || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSearchLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery, showSearch]);

  const openSearch = () => {
    setShowSearch(true);
    setSearchQuery('');
    setSearchResults([]);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const selectSearchUser = (u) => {
    setActiveUser(u);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // ── Send ───────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser) return;
    try {
      if (socket) {
        socket.emit('send_direct_message', { receiverId: activeUser._id, message: newMessage });
      } else {
        await api.post(`/messages/${activeUser._id}`, { message: newMessage });
      }
      setNewMessage('');
    } catch {
      alert('Failed to send message');
    }
  };

  if (loadingConv) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;

  return (
    <div className="messages-page page" id="messages-page">
      <div className="container messages-container">

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div className={`messages-sidebar ${activeUser ? 'hide-mobile' : ''}`}>
          <div className="sidebar-header">
            <h2>Messages</h2>
            <button className="btn btn-primary btn-sm" onClick={openSearch} id="new-message-btn" title="New Message">
              ✏️ New
            </button>
          </div>

          {/* Player Search Panel */}
          {showSearch && (
            <div className="player-search-panel">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="input search-input"
                  placeholder="Search by name or email…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  id="player-search-input"
                />
                <button className="search-close-btn" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>✕</button>
              </div>

              <div className="search-results">
                {searchLoading && (
                  <div className="search-loading">
                    <div className="search-spinner" />
                    <span className="text-sm text-muted">Searching…</span>
                  </div>
                )}
                {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="search-empty text-muted text-sm">No players found for "{searchQuery}"</p>
                )}
                {searchResults.map(u => (
                  <div key={u._id} className="search-result-item" onClick={() => selectSearchUser(u)}>
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt="" className="avatar avatar-sm" />
                      : <div className="avatar avatar-sm avatar-placeholder">{u.name?.[0]}</div>}
                    <div className="search-result-info">
                      <span className="search-result-name">{u.name}</span>
                      <span className="search-result-sub">
                        {u.email}
                        {u.skillLevel && u.skillLevel !== 'Beginner' && <> · {u.skillLevel}</>}
                        {u.displayLocation && <> · {u.displayLocation}</>}
                      </span>
                    </div>
                    <Link
                      to={`/profile/${u._id}`}
                      className="search-profile-btn"
                      onClick={e => e.stopPropagation()}
                      title="View Profile"
                    >
                      👤
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation List */}
          {!showSearch && (
            conversations.length === 0
              ? <p className="text-muted mt-4">No conversations yet. Search for a player to start!</p>
              : (
                <div className="conversation-list">
                  {conversations.map(conv => (
                    <div
                      key={conv.user._id}
                      className={`conversation-item ${activeUser?._id === conv.user._id ? 'active' : ''}`}
                      onClick={() => setActiveUser(conv.user)}
                    >
                      {conv.user.avatarUrl
                        ? <img src={conv.user.avatarUrl} alt="" className="avatar avatar-md" />
                        : <div className="avatar avatar-md avatar-placeholder">{conv.user.name?.[0]}</div>}
                      <div className="conversation-details">
                        <h4>{conv.user.name}</h4>
                        <span className="last-message-text">
                          {conv.lastMessage.sentByMe && 'You: '}
                          {conv.lastMessage.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}
        </div>

        {/* ── Chat Area ───────────────────────────────────────── */}
        <div className={`messages-chat ${!activeUser ? 'hide-mobile' : ''}`}>
          {activeUser ? (
            <>
              <div className="chat-header">
                <button className="btn btn-icon hide-desktop mr-2" onClick={() => setActiveUser(null)}>←</button>
                {activeUser.avatarUrl
                  ? <img src={activeUser.avatarUrl} alt="" className="avatar avatar-sm" />
                  : <div className="avatar avatar-sm avatar-placeholder">{activeUser.name?.[0]}</div>}
                <div className="chat-header-info">
                  <h3>{activeUser.name}</h3>
                  {activeUser.skillLevel && <span className="chat-header-sub">{activeUser.skillLevel}</span>}
                </div>
                <Link to={`/profile/${activeUser._id}`} className="btn btn-outline btn-sm ml-auto" title="View Profile">
                  👤 Profile
                </Link>
              </div>

              <div className="chat-body">
                {messages.length === 0
                  ? <p className="text-center text-muted mt-6 border p-4 rounded bg-surface">Start of conversation with {activeUser.name}.</p>
                  : messages.map(msg => {
                    const isMe = msg.senderId._id === user._id || msg.senderId === user._id;
                    return (
                      <div key={msg._id} className={`chat-bubble-wrapper ${isMe ? 'mine' : 'theirs'}`}>
                        {!isMe && (
                          msg.senderId.avatarUrl
                            ? <img src={msg.senderId.avatarUrl} alt="" className="avatar avatar-xs mt-1" />
                            : <div className="avatar avatar-xs avatar-placeholder mt-1">{msg.senderId.name?.[0]}</div>
                        )}
                        <div className={`chat-bubble ${isMe ? 'bg-primary text-white' : 'bg-surface'}`}>
                          <p>{msg.message}</p>
                          <span className="chat-time text-xs opacity-70 mt-1 block text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                }
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-area" onSubmit={handleSend}>
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Type a message…"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>Send</button>
              </form>
            </>
          ) : (
            <div className="chat-empty-state hide-mobile">
              <span className="text-4xl mb-4 block">💬</span>
              <h2 className="text-muted">Select a conversation</h2>
              <p className="text-secondary">Or search for a player to message directly.</p>
              <button className="btn btn-primary mt-4" onClick={openSearch}>🔍 Find a Player</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
