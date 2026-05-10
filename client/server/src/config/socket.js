const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { getPub, getSub, isRedisAvailable } = require('./redis');
const jwt = require('jsonwebtoken');

let io = null;

const setupSocket = async (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis adapter for horizontal scaling (optional — falls back to in-memory)
  if (await isRedisAvailable()) {
    try {
      const pubClient = getPub();
      const subClient = getSub();
      await pubClient.connect();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.io Redis adapter attached');
    } catch (err) {
      console.warn('⚠️  Socket.io Redis adapter failed, using in-memory adapter:', err?.message || err);
    }
  } else {
    console.warn('⚠️  Socket.io Redis adapter disabled (Redis unavailable)');
  }

  // JWT authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRoles = decoded.roles;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  console.log('✅ Socket.io initialized with Redis adapter');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { setupSocket, getIO };
