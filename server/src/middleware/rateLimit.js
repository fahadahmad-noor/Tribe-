import { getRedis, isRedisAvailable } from '../config/redis.js';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

/**
 * Rate limiter for login endpoint.
 * Tracks failed attempts per IP in Redis.
 * After 5 failures, blocks that IP for 15 minutes.
 * Falls back gracefully if Redis is unavailable.
 */
export async function loginRateLimiter(req, res, next) {
  try {
    if (!(await isRedisAvailable())) return next();

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `ratelimit:login:${ip}`;
    const redis = getRedis();

    if (!redis.status || redis.status === 'end') {
      await redis.connect().catch(() => {});
    }

    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= MAX_ATTEMPTS) {
      const ttl = await redis.ttl(key);
      const minutesLeft = Math.ceil(ttl / 60);
      return res.status(429).json({
        error: `Too many login attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
      });
    }

    // Attach helper to controller so it can increment on failure
    req._incrementLoginAttempts = async () => {
      const newCount = await redis.incr(key);
      if (newCount === 1) {
        // First failure — set expiry window
        await redis.expire(key, WINDOW_SECONDS);
      }
    };

    // Attach helper to clear on successful login
    req._clearLoginAttempts = async () => {
      await redis.del(key);
    };

    next();
  } catch (err) {
    console.warn('⚠️  Rate limiter error (skipping):', err?.message || err);
    next();
  }
}
