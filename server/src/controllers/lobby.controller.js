import mongoose from 'mongoose';
import Lobby from '../models/Lobby.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import JoinRequest from '../models/JoinRequest.js';
import { getRedis, isRedisAvailable } from '../config/redis.js';

const LOBBY_CACHE_TTL = 30; // seconds

/**
 * Build a deterministic cache key from query params.
 */
function buildCacheKey(query) {
  const sorted = Object.keys(query).sort().map((k) => `${k}=${query[k]}`).join('&');
  return `lobbies:${sorted || 'all'}`;
}

/**
 * Bust all lobby list cache keys.
 */
async function bustLobbyCache() {
  try {
    if (!(await isRedisAvailable())) return;
    const redis = getRedis();
    if (!redis.status || redis.status === 'end') await redis.connect().catch(() => { });
    const keys = await redis.keys('lobbies:*');
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    console.warn('⚠️  Lobby cache bust failed:', err?.message);
  }
}

function emitFeed(io, event, payload) {
  io?.to('feed').emit(event, payload);
}

// Notify all pending waitlist users for a lobby
async function notifyWaitlist(io, lobbyId, title, message) {
  try {
    const waiters = await JoinRequest.find({
      lobbyId, type: 'WAITLIST', status: 'PENDING',
    }).select('userId').lean();

    await Promise.all(waiters.map(async (w) => {
      const notif = await Notification.create({
        userId: w.userId,
        type: 'LOBBY_CLOSED',
        title,
        message,
        lobbyId,
        isRead: false,
        metadata: { lobbyId },
      });
      io?.to(`user:${w.userId}`).emit('notification', notif.toObject());
    }));
  } catch (e) {
    console.error('notifyWaitlist error:', e?.message);
  }
}

export async function listLobbies(req, res) {
  try {
    const {
      sport,
      status,
      cursor,
      limit = 20,
      city,
      country,
      lng,
      lat,
      radiusKm,
    } = req.query;
    const lim = Math.min(Number(limit) || 20, 50);

    // --- Redis cache check (skip for geo queries — too dynamic) ---
    const hasGeo = lng != null && lat != null && radiusKm != null && !Number.isNaN(+lng) && !Number.isNaN(+lat);
    if (!hasGeo && !cursor && (await isRedisAvailable())) {
      try {
        const redis = getRedis();
        if (!redis.status || redis.status === 'end') await redis.connect().catch(() => { });
        const cacheKey = buildCacheKey(req.query);
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log(`📦 Lobby cache HIT: ${cacheKey}`);
          return res.json(JSON.parse(cached));
        }
      } catch (err) {
        console.warn('⚠️  Lobby cache read failed:', err?.message);
      }
    }

    const filter = { status: status || 'OPEN' };
    if (sport) filter.sport = sport;
    if (city) filter['location.city'] = new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (country) filter['location.country'] = new RegExp(`^${country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

    if (hasGeo) {
      const maxM = Math.max(1000, Number(radiusKm) * 1000);
      filter.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: maxM,
        },
      };
    }

    let findFilter = { ...filter };
    if (cursor && mongoose.isValidObjectId(cursor) && !hasGeo) {
      const cur = await Lobby.findById(cursor).select('dateTime').lean();
      if (cur) {
        findFilter = {
          $and: [
            filter,
            {
              $or: [
                { dateTime: { $gt: cur.dateTime } },
                { dateTime: cur.dateTime, _id: { $gt: new mongoose.Types.ObjectId(cursor) } },
              ],
            },
          ],
        };
      }
    }

    const q = Lobby.find(findFilter)
      .populate('organizerId', 'name avatarUrl whatsappNumber email')
      .sort({ dateTime: 1, _id: 1 });

    const rows = await q.limit(lim + 1).lean();
    const hasMore = rows.length > lim;
    const lobbies = hasMore ? rows.slice(0, lim) : rows;
    const nextCursor = hasMore ? lobbies[lobbies.length - 1]?._id?.toString() : null;
    const result = { lobbies, hasMore, nextCursor };

    // --- Store in Redis cache (skip for geo and paginated) ---
    if (!hasGeo && !cursor && (await isRedisAvailable())) {
      try {
        const redis = getRedis();
        const cacheKey = buildCacheKey(req.query);
        await redis.set(cacheKey, JSON.stringify(result), 'EX', LOBBY_CACHE_TTL);
        console.log(`📦 Lobby cache SET: ${cacheKey} (TTL ${LOBBY_CACHE_TTL}s)`);
      } catch (err) {
        console.warn('⚠️  Lobby cache write failed:', err?.message);
      }
    }

    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load lobbies' });
  }
}

export async function getLobby(req, res) {
  const lobby = await Lobby.findById(req.params.id)
    .populate('organizerId', 'name avatarUrl whatsappNumber email')
    .populate('confirmedPlayerIds', 'name avatarUrl');
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  return res.json({ lobby });
}

export async function createLobby(req, res) {
  try {
    const io = req.app.get('io');
    const { sport, matchFormat, location, dateTime, totalSlots, description } = req.body;
    if (!sport || !matchFormat || !dateTime || totalSlots == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const coords = location?.coordinates;
    const lng = Array.isArray(coords) ? Number(coords[0]) : 0;
    const lat = Array.isArray(coords) ? Number(coords[1]) : 0;
    const lobby = await Lobby.create({
      sport,
      matchFormat,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        address: location?.address || '',
        city: location?.city || '',
        country: location?.country || '',
      },
      dateTime: new Date(dateTime),
      totalSlots: Number(totalSlots),
      openSlots: Number(totalSlots),
      description: description || '',
      organizerId: req.userId,
      confirmedPlayerIds: [req.userId],
      status: 'OPEN',
    });
    const populated = await Lobby.findById(lobby._id)
      .populate('organizerId', 'name avatarUrl whatsappNumber email')
      .populate('confirmedPlayerIds', 'name avatarUrl');
    emitFeed(io, 'lobby_created', populated.toObject());
    await bustLobbyCache();
    return res.status(201).json({ lobby: populated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to create lobby' });
  }
}

export async function closeLobby(req, res) {
  const lobby = await Lobby.findById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  if (lobby.organizerId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  lobby.status = 'LOCKED';
  await lobby.save();
  const io = req.app.get('io');
  io?.to(`lobby:${lobby._id}`).emit('lobby_locked');
  emitFeed(io, 'lobby_updated', lobby.toObject());
  await bustLobbyCache();

  // 🔔 Notify waitlist — lobby is now locked (no more slots)
  await notifyWaitlist(
    io,
    lobby._id,
    '🔒 Lobby Locked',
    `The ${lobby.sport} lobby you were waiting for is now full`
  );

  return res.json({ lobby });
}

export async function completeLobby(req, res) {
  const lobby = await Lobby.findById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  if (lobby.organizerId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  if (!['OPEN', 'LOCKED'].includes(lobby.status)) {
    return res.status(400).json({ error: 'Lobby already completed or cancelled' });
  }
  lobby.status = 'COMPLETED';
  await lobby.save();
  const io = req.app.get('io');
  io?.to(`lobby:${lobby._id}`).emit('lobby_completed', { status: 'COMPLETED' });
  emitFeed(io, 'lobby_updated', lobby.toObject());
  await bustLobbyCache();

  // 🔔 Notify waitlist users the lobby is done — their spot is gone
  await notifyWaitlist(
    io,
    lobby._id,
    '🏁 Lobby Completed',
    `The ${lobby.sport} lobby you were waiting for has ended`
  );

  return res.json({ lobby });
}

export async function manualDecrement(req, res) {
  const lobby = await Lobby.findById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  if (lobby.organizerId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  if (lobby.openSlots <= 0) return res.status(400).json({ error: 'No slots' });
  lobby.openSlots -= 1;
  if (lobby.openSlots === 0) lobby.status = 'LOCKED';
  await lobby.save();
  const io = req.app.get('io');
  io?.to(`lobby:${lobby._id}`).emit('roster_updated', {
    openSlots: lobby.openSlots,
    status: lobby.status,
    confirmedPlayerIds: lobby.confirmedPlayerIds,
  });
  emitFeed(io, 'lobby_updated', lobby.toObject());
  await bustLobbyCache();
  return res.json({ lobby });
}

export async function getLocations(req, res) {
  try {
    const [cities, countries] = await Promise.all([
      Lobby.distinct('location.city', { 'location.city': { $ne: '' } }),
      Lobby.distinct('location.country', { 'location.country': { $ne: '' } }),
    ]);
    return res.json({ cities: cities.sort(), countries: countries.sort() });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load locations' });
  }
}

/**
 * GET /lobbies/:id/chat
 * Returns paginated lobby group chat messages.
 * Accessible to organizer or any confirmed player regardless of lobby status.
 */
export async function getLobbyChat(req, res) {
  try {
    const { id } = req.params;
    const { cursor, limit = 50 } = req.query;
    const uid = req.userId;

    const lobby = await Lobby.findById(id).select('organizerId confirmedPlayerIds').lean();
    if (!lobby) return res.status(404).json({ error: 'Lobby not found' });

    const isOrganizer = lobby.organizerId?.toString() === uid;
    const isConfirmed = lobby.confirmedPlayerIds?.some((p) => p.toString() === uid);
    if (!isOrganizer && !isConfirmed) {
      return res.status(403).json({ error: 'Not a member of this lobby' });
    }

    const lim = Math.min(Number(limit) || 50, 100);
    const query = { lobbyId: id, type: 'LOBBY_CHAT' };
    if (cursor && mongoose.isValidObjectId(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name avatarUrl')
      .sort({ _id: -1 })
      .limit(lim + 1)
      .lean();

    const hasMore = messages.length > lim;
    const result = hasMore ? messages.slice(0, lim) : messages;
    // Return oldest-first for display
    result.reverse();
    const nextCursor = hasMore ? result[0]?._id?.toString() : null;

    return res.json({ messages: result, hasMore, nextCursor });
  } catch (e) {
    console.error('getLobbyChat error:', e);
    return res.status(500).json({ error: 'Failed to load chat' });
  }
}
