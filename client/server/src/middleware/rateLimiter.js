const rateLimit = require('express-rate-limit');

// Auth endpoints: 10 requests/minute per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Join request submission: 5 requests/minute per user
const joinLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.userId?.toString() || req.ip,
  message: { error: 'Too many join requests. Try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lobby creation: 3 requests/hour per user
const lobbyCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.userId?.toString() || req.ip,
  message: { error: 'Lobby creation limit reached. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Venue booking: 5 requests/hour per user
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.userId?.toString() || req.ip,
  message: { error: 'Booking limit reached. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat messages: 30 messages/minute per user
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.userId?.toString() || req.ip,
  message: { error: 'Message rate limit reached.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: 100 requests/minute per user
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, joinLimiter, lobbyCreateLimiter, bookingLimiter, chatLimiter, generalLimiter };
