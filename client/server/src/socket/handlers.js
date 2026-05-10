import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

export function attachSocketIO(io) {
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

    socket.on('join_feed', () => {
      socket.join('feed');
    });
    socket.on('leave_feed', () => {
      socket.leave('feed');
    });
    socket.on('join_lobby_room', (lobbyId) => {
      if (lobbyId) socket.join(`lobby:${lobbyId}`);
    });
    socket.on('leave_lobby_room', (lobbyId) => {
      if (lobbyId) socket.leave(`lobby:${lobbyId}`);
    });
    socket.on('join_venue_room', (venueId) => {
      if (venueId) socket.join(`venue:${venueId}`);
    });

    socket.on('send_direct_message', async ({ receiverId, message }, cb) => {
      try {
        if (!receiverId || !String(message || '').trim()) {
          cb?.({ error: 'Invalid message' });
          return;
        }
        if (receiverId === uid) {
          cb?.({ error: 'Invalid recipient' });
          return;
        }
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          cb?.({ error: 'User not found' });
          return;
        }
        const doc = await Message.create({
          senderId: uid,
          receiverId,
          message: String(message).trim(),
        });
        const populated = await Message.findById(doc._id)
          .populate('senderId', 'name avatarUrl')
          .populate('receiverId', 'name avatarUrl');
        const payload = populated.toObject();
        io.to(`user:${receiverId}`).emit('direct_message', payload);
        io.to(`user:${uid}`).emit('direct_message', payload);
        cb?.({ ok: true, message: payload });
      } catch (e) {
        console.error(e);
        cb?.({ error: 'Failed to send' });
      }
    });
  });
}
