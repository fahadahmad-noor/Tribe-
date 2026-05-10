import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import JoinRequest from '../models/JoinRequest.js';
import User from '../models/User.js';
import Lobby from '../models/Lobby.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

// ── Helper: create notification + push via socket ────────────────────────────
async function notify(io, { userId, type, title, message, lobbyId = null, metadata = {} }) {
  try {
    const notif = await Notification.create({ userId, type, title, message, lobbyId, metadata, isRead: false });
    io?.to(`user:${userId}`).emit('notification', notif.toObject());
    return notif;
  } catch (e) {
    console.error('notify() error:', e?.message);
  }
}

// Notify multiple users in parallel
async function notifyMany(io, userIds, payload) {
  await Promise.all(userIds.map(uid => notify(io, { ...payload, userId: uid })));
}

export function attachSocketIO(io) {
  // ── Auth middleware ──────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const { sub } = jwt.verify(token, JWT_SECRET);
      socket.userId = sub;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.userId;
    socket.join('feed');
    socket.join(`user:${uid}`);

    // ── Room join/leave ──────────────────────────────────────────
    socket.on('join_feed',        () => socket.join('feed'));
    socket.on('leave_feed',       () => socket.leave('feed'));
    socket.on('join_lobby_room',  (lobbyId) => { if (lobbyId) socket.join(`lobby:${lobbyId}`); });
    socket.on('leave_lobby_room', (lobbyId) => { if (lobbyId) socket.leave(`lobby:${lobbyId}`); });
    socket.on('join_venue_room',  (venueId) => { if (venueId) socket.join(`venue:${venueId}`); });

    // ── Get notifications (initial load) ────────────────────────
    socket.on('get_notifications', async () => {
      try {
        const [notifications, unreadCount] = await Promise.all([
          Notification.find({ userId: uid }).sort({ createdAt: -1 }).limit(30).lean(),
          Notification.countDocuments({ userId: uid, isRead: false }),
        ]);
        socket.emit('notifications_data', { notifications, unreadCount });
      } catch (e) {
        console.error('get_notifications error:', e);
      }
    });

    // ── Mark read via socket ─────────────────────────────────────
    socket.on('mark_notification_read', async (notifId) => {
      try {
        await Notification.findOneAndUpdate({ _id: notifId, userId: uid }, { isRead: true });
      } catch (e) {
        console.error('mark_notification_read error:', e);
      }
    });

    socket.on('mark_all_notifications_read', async () => {
      try {
        await Notification.updateMany({ userId: uid, isRead: false }, { isRead: true });
        socket.emit('notifications_all_read');
      } catch (e) {
        console.error('mark_all_read error:', e);
      }
    });

    // ── Direct Message ───────────────────────────────────────────
    socket.on('send_direct_message', async ({ receiverId, message }, cb) => {
      try {
        if (!receiverId || !String(message || '').trim()) return cb?.({ error: 'Invalid message' });
        if (receiverId === uid) return cb?.({ error: 'Invalid recipient' });

        const [receiver, sender] = await Promise.all([
          User.findById(receiverId).select('name').lean(),
          User.findById(uid).select('name').lean(),
        ]);
        if (!receiver) return cb?.({ error: 'User not found' });

        const doc = await Message.create({
          senderId: uid,
          receiverId,
          message: String(message).trim(),
        });
        const populated = await Message.findById(doc._id)
          .populate('senderId', 'name avatarUrl')
          .populate('receiverId', 'name avatarUrl')
          .lean();

        // Push DM to both parties
        io.to(`user:${receiverId}`).emit('direct_message', populated);
        io.to(`user:${uid}`).emit('direct_message', populated);

        // 🔔 Notification to receiver
        await notify(io, {
          userId: receiverId,
          type: 'MESSAGE',
          title: `💬 ${sender?.name || 'Someone'} sent you a message`,
          message: String(message).trim().slice(0, 100),
          metadata: { senderId: uid, senderName: sender?.name },
        });

        cb?.({ ok: true, message: populated });
      } catch (e) {
        console.error('send_direct_message error:', e);
        cb?.({ error: 'Failed to send' });
      }
    });

    // ── Lobby Group Chat ─────────────────────────────────────────
    socket.on('send_lobby_message', async ({ lobbyId, message }, cb) => {
      try {
        if (!lobbyId || !String(message || '').trim()) return cb?.({ error: 'Invalid message' });

        const lobby = await Lobby.findById(lobbyId)
          .select('organizerId confirmedPlayerIds sport')
          .lean();
        if (!lobby) return cb?.({ error: 'Lobby not found' });

        const isOrganizer = lobby.organizerId?.toString() === uid;
        const isConfirmed = lobby.confirmedPlayerIds?.some(p => p.toString() === uid);
        if (!isOrganizer && !isConfirmed) return cb?.({ error: 'Not a member of this lobby' });

        const sender = await User.findById(uid).select('name').lean();

        const doc = await Message.create({
          senderId: uid,
          lobbyId,
          type: 'LOBBY_CHAT',
          message: String(message).trim(),
        });
        const populated = await Message.findById(doc._id)
          .populate('senderId', 'name avatarUrl')
          .lean();

        // Broadcast to lobby room
        io.to(`lobby:${lobbyId}`).emit('lobby_message', populated);

        // 🔔 Notify confirmed members NOT currently in the room about new chat
        const lobbyRoomSockets = await io.in(`lobby:${lobbyId}`).fetchSockets();
        const onlineInRoom = new Set(lobbyRoomSockets.map(s => s.userId));

        const memberIds = [
          lobby.organizerId?.toString(),
          ...(lobby.confirmedPlayerIds || []).map(id => id.toString()),
        ].filter(id => id && id !== uid && !onlineInRoom.has(id));

        const uniqueOffline = [...new Set(memberIds)];
        await notifyMany(io, uniqueOffline, {
          type: 'MESSAGE',
          title: `💬 ${sender?.name || 'Someone'} in ${lobby.sport} lobby`,
          message: String(message).trim().slice(0, 100),
          lobbyId,
          metadata: { lobbyId, senderName: sender?.name, type: 'lobby_chat' },
        });

        cb?.({ ok: true, message: populated });
      } catch (e) {
        console.error('send_lobby_message error:', e);
        cb?.({ error: 'Failed to send' });
      }
    });
  });
}
