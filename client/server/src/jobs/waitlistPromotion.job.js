const { Queue, Worker } = require('bullmq');
const { getRedis } = require('../config/redis');
const JoinRequest = require('../models/JoinRequest');
const Lobby = require('../models/Lobby');
const { createNotification } = require('../utils/helpers');

const QUEUE_NAME = 'waitlist-promotion';
let queue = null;

const getQueue = () => {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getRedis() });
  return queue;
};

const startWorker = (io) => {
  const worker = new Worker(QUEUE_NAME, async (job) => {
    const { lobbyId, requestId } = job.data;
    const request = await JoinRequest.findById(requestId);
    if (!request || request.status !== 'PENDING') {
      // User didn't accept in time, promote next
      if (request) { request.status = 'EXPIRED'; await request.save(); }
      await promoteNext(lobbyId, io);
      return;
    }
  }, { connection: getRedis() });

  // If Redis is down, BullMQ emits "error". Without a listener Node treats it as unhandled and crashes.
  worker.on('error', (err) => {
    console.warn('⚠️  Waitlist worker error (Redis likely unavailable):', err?.message || err);
  });
  worker.on('failed', (job, err) => { console.error('Waitlist job failed:', err.message); });
  return worker;
};

const promoteNext = async (lobbyId, io) => {
  const lobby = await Lobby.findById(lobbyId);
  if (!lobby || lobby.openSlots <= 0) return;

  const nextWaiter = await JoinRequest.findOne({
    lobbyId, type: 'WAITLIST', status: 'PENDING',
  }).sort({ createdAt: 1 });

  if (!nextWaiter) return;

  await createNotification(io, {
    userId: nextWaiter.userId,
    lobbyId,
    type: 'WAITLIST_PROMOTION',
    title: 'Your Turn!',
    message: 'A slot opened up! You have 5 minutes to accept.',
    metadata: { requestId: nextWaiter._id },
  });

  // Schedule expiry check in 5 minutes
  const q = getQueue();
  await q.add('check-acceptance', { lobbyId, requestId: nextWaiter._id.toString() }, { delay: 5 * 60 * 1000 });
};

const enqueuePromotion = async (lobbyId) => {
  await promoteNext(lobbyId, null);
};

module.exports = { startWorker, enqueuePromotion, getQueue };
