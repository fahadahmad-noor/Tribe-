import { Queue, Worker } from 'bullmq';
import { getRedis } from '../config/redis.js';
import User from '../models/User.js';
import Lobby from '../models/Lobby.js';
import { createNotification } from '../utils/helpers.js';

const QUEUE_NAME = 'ringer-alert';
let queue = null;

const getQueue = () => {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getRedis() });
  return queue;
};

export const startWorker = (io) => {
  const worker = new Worker(QUEUE_NAME, async (job) => {
    const { lobbyId } = job.data;
    const lobby = await Lobby.findById(lobbyId);
    if (!lobby || lobby.status !== 'OPEN') return;

    // Find users with ringerMode + matching sport preference (not already in lobby)
    const ringers = await User.find({
      ringerMode: true,
      banned: false,
      _id: { $nin: [...lobby.confirmedPlayerIds, lobby.organizerId] },
      preferences: lobby.sport,
    }).select('_id').limit(30).lean();

    for (const ringer of ringers) {
      await createNotification(io, {
        userId: ringer._id,
        lobbyId,
        type: 'RINGER',
        title: '🚨 Ringer Alert!',
        message: `A ${lobby.sport} game near you needs a player ASAP!`,
        metadata: { lobbyId },
      });
    }

    console.log(`🚨 Ringer alert sent to ${ringers.length} users for lobby ${lobbyId}`);
  }, { connection: getRedis() });

  worker.on('error', (err) => {
    console.warn('⚠️  Ringer worker error (Redis likely unavailable):', err?.message || err);
  });
  return worker;
};

export const sendRingerAlert = async (lobbyId) => {
  const q = getQueue();
  await q.add('ringer-alert', { lobbyId });
};

export { getQueue };
