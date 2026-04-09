import { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import './NotificationDropdown.css';

const NotificationDropdown = () => {
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.emit('get_notifications');
    socket.on('notifications_data', (data) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    });

    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.off('notifications_data');
      socket.off('notification');
    };
  }, [socket]);

  const markRead = (id) => {
    socket?.emit('mark_notification_read', id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getIcon = (type) => {
    const icons = { APPROVAL: '✅', REQUEST: '📩', ALERT: '⚠️', WAITLIST_PROMOTION: '🎉', RINGER: '🚨', CHALLENGE: '⚔️', BOOKING: '📅', SQUAD_INVITE: '👥', SYSTEM: 'ℹ️' };
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
    <div className="notif-wrapper" id="notification-dropdown">
      <button className="btn btn-icon notif-trigger" onClick={() => setOpen(!open)}>
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />
          <div className="notif-dropdown">
            <div className="notif-header">
              <h4>Notifications</h4>
              <span className="text-muted text-sm">{unreadCount} unread</span>
            </div>
            <div className="notif-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">No notifications yet</div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n._id}
                    className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                    onClick={() => markRead(n._id)}
                  >
                    <span className="notif-icon">{getIcon(n.type)}</span>
                    <div className="notif-content">
                      <p className="notif-title">{n.title || n.type}</p>
                      <p className="notif-message">{n.message}</p>
                      <span className="notif-time">{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationDropdown;
