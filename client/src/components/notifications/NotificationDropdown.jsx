import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './NotificationDropdown.css';

const NotificationDropdown = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapperRef = useRef(null);

  // Load via REST on mount
  useEffect(() => {
    api.get('/notifications')
      .then(res => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit('get_notifications');
    socket.on('notifications_data', (data) => {
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    });
    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 30));
      setUnreadCount(prev => prev + 1);
    });
    socket.on('notifications_all_read', () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
    return () => {
      socket.off('notifications_data');
      socket.off('notification');
      socket.off('notifications_all_read');
    };
  }, [socket]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = (id) => {
    socket?.emit('mark_notification_read', id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = () => {
    socket?.emit('mark_all_notifications_read');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleClick = (n) => {
    markRead(n._id);
    if (n.lobbyId) {
      navigate(`/lobby/${n.lobbyId?._id || n.lobbyId}`);
    } else if (n.metadata?.senderId) {
      navigate(`/messages?user=${n.metadata.senderId}`);
    }
    setOpen(false);
  };

  const getIcon = (type) => {
    const icons = {
      APPROVAL: '✅',
      REJECTION: '❌',
      REQUEST: '📩',
      ALERT: '⚠️',
      WAITLIST_PROMOTION: '🎉',
      RINGER: '🚨',
      CHALLENGE: '⚔️',
      BOOKING: '📅',
      SQUAD_INVITE: '👥',
      SYSTEM: 'ℹ️',
      MESSAGE: '💬',
      LOBBY_CLOSED: '🏁',
    };
    return icons[type] || '🔔';
  };

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  return (
    <div className="notif-wrapper" id="notification-dropdown" ref={wrapperRef}>
      <button className="btn btn-icon notif-trigger" onClick={() => setOpen(!open)} aria-label="Notifications">
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  className={`notif-item ${!n.isRead ? 'unread' : ''} ${(n.lobbyId || n.metadata?.senderId) ? 'clickable' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="notif-icon">{getIcon(n.type)}</span>
                  <div className="notif-content">
                    <p className="notif-title">{n.title || n.type}</p>
                    <p className="notif-message">{n.message}</p>
                    <span className="notif-time">{timeAgo(n.createdAt)}</span>
                  </div>
                  {!n.isRead && <span className="notif-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
