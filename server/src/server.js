import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDb } from './config/db.js';
import { attachSocketIO } from './socket/handlers.js';
import { ensureUploadsDir } from './controllers/user.controller.js';
import { isRedisAvailable, getRedis } from './config/redis.js';
import { scheduleExpiryJob, startWorker as startExpiryWorker } from './jobs/lobbyExpiry.job.js';
import { startWorker as startRingerWorker } from './jobs/ringerAlert.job.js';
import { startWorker as startWaitlistWorker } from './jobs/waitlistPromotion.job.js';

ensureUploadsDir();

const PORT = Number(process.env.PORT) || 5000;
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

async function startJobs(io) {
  const available = await isRedisAvailable();
  if (!available) {
    console.warn('⚠️  Redis unavailable — background jobs (expiry, ringer alerts, waitlist) are disabled.');
    return;
  }

  // Connect the shared Redis client used by BullMQ queues
  try {
    const redis = getRedis();
    await redis.connect();
    console.log('✅ Redis client connected for BullMQ');
  } catch (err) {
    console.warn('⚠️  Redis connect failed — jobs disabled:', err?.message);
    return;
  }

  try {
    // 1. Lobby expiry — marks stale lobbies as EXPIRED/COMPLETED every 15 min
    startExpiryWorker(io);
    await scheduleExpiryJob();

    // 2. Ringer alerts — notifies nearby users when a lobby needs a player
    startRingerWorker(io);
    console.log('✅ Ringer alert worker started');

    // 3. Waitlist promotion — promotes next person when a slot opens
    startWaitlistWorker(io);
    console.log('✅ Waitlist promotion worker started');
  } catch (err) {
    console.error('❌ Failed to start background jobs:', err?.message || err);
  }
}

async function main() {
  await connectDb();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: clientOrigin, credentials: true },
  });
  app.set('io', io);
  attachSocketIO(io);

  // Start Redis-backed background jobs
  await startJobs(io);

  server.listen(PORT, () => {
    console.log(`TRIBE API + Socket listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
