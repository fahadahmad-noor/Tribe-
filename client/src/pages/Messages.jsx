import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import '../styles/pages/Messages.css';

const Messages = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const initialUserId = searchParams.get('user');

  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch inbox
  const fetchInbox = async () => {
    try {
      const res = await api.get('/messages/inbox');
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Failed to load inbox', err);
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => { fetchInbox(); }, []);

  // Fetch specific thread
  const fetchThread = async (userId) => {
    try {
      const res = await api.get(`/messages/${userId}`);
      setMessages(res.data.messages || []);
      
      // Update conversations list so this user is visible if brand new
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
  };

  useEffect(() => {
    if (activeUser) {
      fetchThread(activeUser._id);
    }
  }, [activeUser]);

  // Initial user from URL
  useEffect(() => {
    if (initialUserId && !activeUser) {
      // Find within conversations
      const conv = conversations.find(c => c.user._id === initialUserId);
      if (conv) {
        setActiveUser(conv.user);
      } else {
        // Assume valid ID, let fetchThread fetch the user details
        setActiveUser({ _id: initialUserId, name: 'Loading...' }); 
      }
    }
  }, [initialUserId, conversations]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket
  useEffect(() => {
    if (!socket) return;
    const handleDm = (msg) => {
      // If it belongs to active thread, push it
      if (activeUser && (msg.senderId._id === activeUser._id || msg.receiverId._id === activeUser._id)) {
        setMessages(prev => [...prev.filter(m => m._id !== msg._id), msg]);
      }
      fetchInbox(); // Refresh sidebar always
    };

    socket.on('direct_message', handleDm);
    return () => socket.off('direct_message', handleDm);
  }, [socket, activeUser]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser) return;
    
    // Optimistic UI update could go here
    try {
      if (socket) {
        socket.emit('send_direct_message', { receiverId: activeUser._id, message: newMessage });
      } else {
        await api.post(`/messages/${activeUser._id}`, { message: newMessage });
      }
      setNewMessage('');
    } catch (err) {
      alert('Failed to send message');
    }
  };

  if (loadingConv) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;

  return (
    <div className="messages-page page" id="messages-page">
      <div className="container messages-container">
        
        {/* Sidebar */}
        <div className={`messages-sidebar ${activeUser ? 'hide-mobile' : ''}`}>
          <h2 className="mb-4">Messages</h2>
          {conversations.length === 0 ? (
            <p className="text-muted">No conversations yet.</p>
          ) : (
            <div className="conversation-list">
              {conversations.map(conv => (
                <div 
                  key={conv.user._id} 
                  className={`conversation-item ${activeUser?._id === conv.user._id ? 'active' : ''}`}
                  onClick={() => setActiveUser(conv.user)}
                >
                  {conv.user.avatarUrl ? (
                    <img src={conv.user.avatarUrl} alt="" className="avatar avatar-md" />
                  ) : (
                    <div className="avatar avatar-md avatar-placeholder">{conv.user.name?.[0]}</div>
                  )}
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
          )}
        </div>

        {/* Chat Area */}
        <div className={`messages-chat ${!activeUser ? 'hide-mobile' : ''}`}>
          {activeUser ? (
            <>
              <div className="chat-header">
                <button className="btn btn-icon hide-desktop mr-2" onClick={() => setActiveUser(null)}>←</button>
                {activeUser.avatarUrl ? (
                  <img src={activeUser.avatarUrl} alt="" className="avatar avatar-sm" />
                ) : (
                  <div className="avatar avatar-sm avatar-placeholder">{activeUser.name?.[0]}</div>
                )}
                <h3 className="ml-2">{activeUser.name}</h3>
              </div>

              <div className="chat-body">
                {messages.length === 0 ? (
                  <p className="text-center text-muted mt-6 border p-4 rounded bg-surface">This is the start of your conversation with {activeUser.name}.</p>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId._id === user._id;
                    return (
                      <div key={msg._id} className={`chat-bubble-wrapper ${isMe ? 'mine' : 'theirs'}`}>
                        {!isMe && (
                          msg.senderId.avatarUrl ? (
                            <img src={msg.senderId.avatarUrl} alt="" className="avatar avatar-xs mt-1" />
                          ) : (
                            <div className="avatar avatar-xs avatar-placeholder mt-1">{msg.senderId.name?.[0]}</div>
                          )
                        )}
                        <div className={`chat-bubble ${isMe ? 'bg-primary text-white' : 'bg-surface'}`}>
                          <p>{msg.message}</p>
                          <span className="chat-time text-xs opacity-70 mt-1 block text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-area" onSubmit={handleSend}>
                <input 
                  type="text" 
                  className="input flex-1" 
                  placeholder="Type a message..." 
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
              <p className="text-secondary">Choose a user from the left to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
