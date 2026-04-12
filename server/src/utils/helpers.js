const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');

/**
 * Generate JWT token for a user.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, roles: user.roles },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Set JWT as httpOnly cookie.
 */
const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Create and optionally emit a notification.
 */
const createNotification = async (io, { userId, lobbyId, type, title, message, metadata }) => {
  const notification = await Notification.create({
    userId, lobbyId, type, title, message, metadata,
  });

  // Emit via socket if io is available
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }

  return notification;
};

/**
 * Parse cursor-based pagination params from query.
 */
const parsePagination = (query, defaultLimit = 20) => {
  const limit = Math.min(parseInt(query.limit) || defaultLimit, 50);
  const cursor = query.cursor || null;
  return { limit, cursor };
};

module.exports = { generateToken, setTokenCookie, createNotification, parsePagination };
