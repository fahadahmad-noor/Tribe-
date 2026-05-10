const { Queue, Worker } = require('bullmq');
const { getRedis } = require('../config/redis');
const Lobby = require('../models/Lobby');

const QUEUE_NAME = 'lobby-expiry';
let queue = null;

const getQueue = () => {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getRedis() });
  }
  return queue;
};

const startWorker = () => {
  const worker = new Worker(QUEUE_NAME, async (job) => {
    console.log('🔄 Running lobby expiry check...');
    const now = new Date();
    const result = await Lobby.updateMany(
      { status: { $in: ['OPEN', 'LOCKED'] }, expiresAt: { $lt: now } },
      [{ $set: { status: { $cond: [{ $gt: [{ $size: '$confirmedPlayerIds' }, 1] }, 'COMPLETED', 'EXPIRED'] } } }]
    );
    console.log(`✅ Lobby expiry: ${result.modifiedCount} lobbies transitioned`);
  }, { connection: getRedis() });

  // If Redis is down, BullMQ emits "error". Without a listener Node treats it as unhandled and crashes.
  worker.on('error', (err) => {
    console.warn('⚠️  Lobby expiry worker error (Redis likely unavailable):', err?.message || err);
  });
  worker.on('failed', (job, err) => { console.error('Lobby expiry job failed:', err.message); });
  return worker;
};

// Schedule recurring job every 15 minutes
const scheduleExpiryJob = async () => {
  const q = getQueue();
  await q.upsertJobScheduler('lobby-expiry-recurring', { every: 15 * 60 * 1000 }, { name: 'check-expiry' });
  console.log('✅ Lobby expiry job scheduled (every 15 min)');
};

module.exports = { scheduleExpiryJob, startWorker, getQueue };
