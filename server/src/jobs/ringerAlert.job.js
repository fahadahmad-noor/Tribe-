const { Queue, Worker } = require('bullmq');
const { getRedis } = require('../config/redis');
const User = require('../models/User');
const Lobby = require('../models/Lobby');
const { createNotification } = require('../utils/helpers');

const QUEUE_NAME = 'ringer-alert';
let queue = null;

const getQueue = () => {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getRedis() });
  return queue;
};

const startWorker = (io) => {
  const worker = new Worker(QUEUE_NAME, async (job) => {
    const { lobbyId } = job.data;
    const lobby = await Lobby.findById(lobbyId);
    if (!lobby || lobby.status !== 'OPEN') return;

    // Find nearby users with ringerMode active
    const ringers = await User.find({
      ringerMode: true,
      _id: { $nin: [...lobby.confirmedPlayerIds, lobby.organizerId] },
      preferences: lobby.sport,
      location: {
        $nearSphere: {
          $geometry: lobby.location,
          $maxDistance: 15000, // 15km radius
        },
      },
    }).limit(20);

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

  // If Redis is down, BullMQ emits "error". Without a listener Node treats it as unhandled and crashes.
  worker.on('error', (err) => {
    console.warn('⚠️  Ringer worker error (Redis likely unavailable):', err?.message || err);
  });
  return worker;
};

const sendRingerAlert = async (lobbyId) => {
  const q = getQueue();
  await q.add('ringer-alert', { lobbyId });
};

module.exports = { startWorker, sendRingerAlert, getQueue };
