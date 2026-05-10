import Redis from 'ioredis';

let redis = null;
let pub = null;
let sub = null;
let redisAvailable = null;

const createRedisClient = () => {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
  });

  client.on('error', (err) => {
    console.error('Redis client error:', err.message);
  });

  return client;
};

export const isRedisAvailable = async () => {
  if (redisAvailable !== null) return redisAvailable;

  // Probe Redis once at startup. If it's down, treat Redis features as optional.
  const probe = createRedisClient();
  try {
    await Promise.race([
      probe.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connect timeout')), 1200)),
    ]);
    await Promise.race([
      probe.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout')), 1200)),
    ]);
    redisAvailable = true;
    console.log('✅ Redis is available');
  } catch (err) {
    redisAvailable = false;
    console.warn('⚠️  Redis unavailable, continuing without Redis:', err?.message || err);
  } finally {
    try { probe.disconnect(); } catch (e) {}
  }
  return redisAvailable;
};

export const getRedis = () => {
  if (!redis) redis = createRedisClient();
  return redis;
};

export const getPub = () => {
  if (!pub) pub = createRedisClient();
  return pub;
};

export const getSub = () => {
  if (!sub) sub = createRedisClient();
  return sub;
};

export { createRedisClient };
