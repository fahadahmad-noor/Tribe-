import { Queue, Worker } from 'bullmq';
import { getRedis } from '../config/redis.js';
import JoinRequest from '../models/JoinRequest.js';
import Lobby from '../models/Lobby.js';
import { createNotification } from '../utils/helpers.js';

const QUEUE_NAME = 'waitlist-promotion';
let queue = null;

const getQueue = () => {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getRedis() });
  return queue;
};

export const startWorker = (io) => {
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
    title: '🎉 Slot Available!',
    message: 'A spot opened up in your lobby! Tap to accept before it\'s gone.',
    metadata: { requestId: nextWaiter._id, lobbyId },
  });

  // Notify all lobby viewers (so they see position shift)
  io?.to(`lobby:${lobbyId}`).emit('waitlist_updated');

  // Schedule expiry: if user hasn't accepted in 5 min, move to next
  const q = getQueue();
  await q.add('check-acceptance', { lobbyId: lobbyId.toString(), requestId: nextWaiter._id.toString() }, { delay: 5 * 60 * 1000 });
};

export const enqueuePromotion = async (lobbyId, io) => {
  await promoteNext(lobbyId, io);
};

export { getQueue };
