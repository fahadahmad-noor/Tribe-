import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getRedis, isRedisAvailable } from '../config/redis.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}

export async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization;
    const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { sub } = jwt.verify(token, JWT_SECRET);

    // Check if this token was blacklisted on logout
    if (await isRedisAvailable()) {
      try {
        const redis = getRedis();
        if (!redis.status || redis.status === 'end') {
          await redis.connect().catch(() => {});
        }
        const blacklisted = await redis.get(`blacklist:${token}`);
        if (blacklisted) return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
      } catch (redisErr) {
        console.warn('⚠️  Blacklist check failed (skipping):', redisErr?.message);
      }
    }

    const user = await User.findById(sub);
    if (!user || user.banned) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = sub;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user?.roles?.some((r) => roles.includes(r))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export async function optionalAuth(req, res, next) {
  try {
    const h = req.headers.authorization;
    const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return next();
    const { sub } = jwt.verify(token, JWT_SECRET);
    req.userId = sub;
  } catch {
    /* ignore invalid token for public routes */
  }
  next();
}
