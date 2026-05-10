import mongoose from 'mongoose';
import Lobby from '../models/Lobby.js';
import User from '../models/User.js';

function emitFeed(io, event, payload) {
  io?.to('feed').emit(event, payload);
}

export async function listLobbies(req, res) {
  try {
    const {
      sport,
      cursor,
      limit = 20,
      city,
      country,
      lng,
      lat,
      radiusKm,
    } = req.query;
    const lim = Math.min(Number(limit) || 20, 50);
    const filter = { status: 'OPEN' };
    if (sport) filter.sport = sport;
    if (city) filter['location.city'] = new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (country) filter['location.country'] = new RegExp(`^${country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

    const hasGeo = lng != null && lat != null && radiusKm != null && !Number.isNaN(+lng) && !Number.isNaN(+lat);
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

    return res.json({ lobbies, hasMore, nextCursor });
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
  req.app.get('io')?.to(`lobby:${lobby._id}`).emit('lobby_locked');
  emitFeed(req.app.get('io'), 'lobby_updated', lobby.toObject());
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
