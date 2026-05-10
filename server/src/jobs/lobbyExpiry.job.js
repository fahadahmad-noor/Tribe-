import { Queue, Worker } from 'bullmq';
import { getRedis } from '../config/redis.js';
import Lobby from '../models/Lobby.js';
import Notification from '../models/Notification.js';
import JoinRequest from '../models/JoinRequest.js';

const QUEUE_NAME = 'lobby-expiry';
let queue = null;

const getQueue = () => {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getRedis() });
  }
  return queue;
};

// Notify all waitlist users for expired/completed lobbies
async function notifyWaitlistBatch(io, lobbyIds, status) {
  try {
    const title = status === 'COMPLETED' ? '🏁 Match Completed' : '⏰ Lobby Expired';
    const msgVerb = status === 'COMPLETED' ? 'has ended' : 'has expired';

    // Fetch all pending waitlist entries for these lobbies
    const waiters = await JoinRequest.find({
      lobbyId: { $in: lobbyIds },
      type: 'WAITLIST',
      status: 'PENDING',
    }).select('userId lobbyId').lean();

    if (!waiters.length) return;

    // Fetch sport info for affected lobbies
    const lobbies = await Lobby.find({ _id: { $in: lobbyIds } })
      .select('_id sport')
      .lean();
    const sportMap = Object.fromEntries(lobbies.map(l => [l._id.toString(), l.sport]));

    await Promise.all(waiters.map(async (w) => {
      const sport = sportMap[w.lobbyId.toString()] || 'A';
      const notif = await Notification.create({
        userId: w.userId,
        type: 'LOBBY_CLOSED',
        title,
        message: `The ${sport} lobby you were waiting for ${msgVerb}`,
        lobbyId: w.lobbyId,
        isRead: false,
        metadata: { lobbyId: w.lobbyId },
      });
      io?.to(`user:${w.userId}`).emit('notification', notif.toObject());
    }));
  } catch (e) {
    console.error('notifyWaitlistBatch error:', e?.message);
  }
}

export const startWorker = (io) => {
  const worker = new Worker(QUEUE_NAME, async (job) => {
    console.log('🔄 Running lobby expiry check...');
    const now = new Date();

    // Find all lobbies that will transition before updating
    const toExpire = await Lobby.find({
      status: { $in: ['OPEN', 'LOCKED'] },
      expiresAt: { $lt: now },
    }).select('_id confirmedPlayerIds status').lean();

    if (!toExpire.length) {
      console.log('✅ Lobby expiry: no lobbies to transition');
      return;
    }

    const lobbyIds = toExpire.map(l => l._id);

    // Transition statuses
    const result = await Lobby.updateMany(
      { _id: { $in: lobbyIds } },
      [{ $set: { status: { $cond: [{ $gt: [{ $size: '$confirmedPlayerIds' }, 1] }, 'COMPLETED', 'EXPIRED'] } } }]
    );
    console.log(`✅ Lobby expiry: ${result.modifiedCount} lobbies transitioned`);

    // Group into completed vs expired for notification messages
    const completed = toExpire
      .filter(l => (l.confirmedPlayerIds?.length || 0) > 1)
      .map(l => l._id);
    const expired = toExpire
      .filter(l => (l.confirmedPlayerIds?.length || 0) <= 1)
      .map(l => l._id);

    if (completed.length) await notifyWaitlistBatch(io, completed, 'COMPLETED');
    if (expired.length)   await notifyWaitlistBatch(io, expired,   'EXPIRED');

  }, { connection: getRedis() });

  worker.on('error',  (err) => console.warn('⚠️  Lobby expiry worker error:', err?.message));
  worker.on('failed', (job, err) => console.error('Lobby expiry job failed:', err.message));
  return worker;
};

// Schedule recurring job every 15 minutes
export const scheduleExpiryJob = async () => {
  const q = getQueue();
  await q.upsertJobScheduler('lobby-expiry-recurring', { every: 15 * 60 * 1000 }, { name: 'check-expiry' });
  console.log('✅ Lobby expiry job scheduled (every 15 min)');
};

export { getQueue };
