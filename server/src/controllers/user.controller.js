import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Lobby from '../models/Lobby.js';
import JoinRequest from '../models/JoinRequest.js';
import Squad from '../models/Squad.js';
import Venue from '../models/Venue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

// ── Profile ─────────────────────────────────────────────────────────────────

export async function getMe(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json({ user: user.toPublicJSON() });
}

export async function patchMe(req, res) {
  const { name, whatsappNumber, ringerMode, bio, skillLevel, location, preferences } = req.body;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (name !== undefined) user.name = name;
  if (whatsappNumber !== undefined) user.whatsappNumber = whatsappNumber;
  if (ringerMode !== undefined) user.ringerMode = !!ringerMode;
  if (bio !== undefined) user.bio = String(bio).slice(0, 300);
  if (skillLevel !== undefined && ['Beginner', 'Intermediate', 'Advanced', 'Pro'].includes(skillLevel)) {
    user.skillLevel = skillLevel;
  }
  if (location !== undefined) user.displayLocation = String(location).slice(0, 100);
  if (Array.isArray(preferences)) user.preferences = preferences;
  await user.save();
  return res.json({ user: user.toPublicJSON() });
}

export async function getUserById(req, res) {
  const user = await User.findById(req.params.id);
  if (!user || user.banned) return res.status(404).json({ error: 'User not found' });
  const pub = user.toPublicJSON();
  delete pub.email;
  return res.json({ user: pub });
}

// ── Compute stats block — all queries run in PARALLEL ───────────────────────
async function computeStats(userId) {
  const uid = new mongoose.Types.ObjectId(userId);

  const [allLobbies, asOrganizer, completed, sportAgg] = await Promise.all([
    // Total matches (org or player, not cancelled)
    Lobby.countDocuments({
      $or: [{ organizerId: uid }, { confirmedPlayerIds: uid }],
      status: { $ne: 'CANCELLED' },
    }),
    // As organizer
    Lobby.countDocuments({ organizerId: uid, status: { $ne: 'CANCELLED' } }),
    // Completed only
    Lobby.countDocuments({
      $or: [{ organizerId: uid }, { confirmedPlayerIds: uid }],
      status: 'COMPLETED',
    }),
    // Sport breakdown aggregation
    Lobby.aggregate([
      {
        $match: {
          $or: [{ organizerId: uid }, { confirmedPlayerIds: uid }],
          status: { $ne: 'CANCELLED' },
        },
      },
      { $group: { _id: '$sport', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  return {
    totalMatches: allLobbies,
    asOrganizer,
    completedMatches: completed,
    sportBreakdown: sportAgg.map(s => ({ sport: s._id, count: s.count })),
  };
}

// ── Public profile — all DB calls run in PARALLEL ────────────────────────────
export async function getUserPublicProfile(req, res) {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user || user.banned) return res.status(404).json({ error: 'User not found' });

    const isVenueOwner = user.roles?.includes('venue_owner');

    // Run lobbies, squads, venues, stats ALL in parallel
    const [lobbies, squads, venues, stats] = await Promise.all([
      Lobby.find({
        $or: [{ organizerId: user._id }, { confirmedPlayerIds: user._id }],
        status: { $ne: 'CANCELLED' },
      })
        .sort({ dateTime: -1 })
        .limit(20)
        .select('sport matchFormat dateTime status location organizerId')
        .lean(),

      Squad.find({ roster: user._id })
        .select('_id name sport captainId stats')
        .populate('captainId', 'name')
        .lean(),

      isVenueOwner
        ? Venue.find({ ownerId: user._id, verificationStatus: 'VERIFIED' })
            .select('_id name location sportsSupported amenities pitches description')
            .lean()
        : Promise.resolve([]),

      computeStats(user._id.toString()),
    ]);

    // Build public user object (no mongoose doc — we used .lean())
    const pub = {
      _id: user._id,
      name: user.name,
      whatsappNumber: user.whatsappNumber || '',
      preferences: user.preferences,
      ringerMode: user.ringerMode,
      avatarUrl: user.avatarUrl,
      roles: user.roles || [],
      bio: user.bio || '',
      skillLevel: user.skillLevel || 'Beginner',
      displayLocation: user.displayLocation || '',
    };

    return res.json({ user: pub, lobbies, squads, venues, stats });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
}

// ── Match History — cursor-based pagination, lean queries ───────────────────
export async function getHistory(req, res) {
  try {
    const userId = req.userId;
    const {
      sport,
      status,
      role = 'all',
      from,
      to,
      cursor,
      limit = 20,
    } = req.query;

    const lim = Math.min(Number(limit) || 20, 50);

    const roleFilter =
      role === 'organizer'
        ? { organizerId: userId }
        : role === 'player'
        ? { confirmedPlayerIds: userId }
        : { $or: [{ organizerId: userId }, { confirmedPlayerIds: userId }] };

    const filter = { ...roleFilter };
    if (sport && sport !== 'All') filter.sport = sport;
    if (status && status !== 'All') filter.status = status;
    if (from || to) {
      filter.dateTime = {};
      if (from) filter.dateTime.$gte = new Date(from);
      if (to)   filter.dateTime.$lte = new Date(to);
    }

    // Cursor pagination — use _id directly to avoid extra DB roundtrip
    if (cursor && mongoose.isValidObjectId(cursor)) {
      const cursorClause = { _id: { $lt: new mongoose.Types.ObjectId(cursor) } };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, cursorClause];
        delete filter.$or;
      } else {
        Object.assign(filter, cursorClause);
      }
    }

    const rows = await Lobby.find(filter)
      .sort({ _id: -1 })           // _id desc = newest first, no extra dateTime sort needed
      .limit(lim + 1)
      .select('sport matchFormat dateTime status location organizerId description')
      .populate('organizerId', 'name avatarUrl')
      .lean();

    const hasMore = rows.length > lim;
    const lobbies = hasMore ? rows.slice(0, lim) : rows;
    const nextCursor = hasMore ? lobbies[lobbies.length - 1]?._id?.toString() : null;

    const annotated = lobbies.map(l => ({
      ...l,
      myRole: l.organizerId?._id?.toString() === userId ? 'organizer' : 'player',
    }));

    return res.json({ lobbies: annotated, hasMore, nextCursor });
  } catch (e) {
    console.error('getHistory error:', e);
    return res.status(500).json({ error: 'Failed to load history' });
  }
}

export async function getMeSquads(req, res) {
  const squads = await Squad.find({ roster: req.userId })
    .select('_id name sport captainId')
    .populate('captainId', 'name')
    .lean();
  return res.json({ squads });
}

// ── Player Search — text index + scored ranking ──────────────────────────────
// Uses MongoDB $text index (weight: name:10, email:5) for fast full-text lookup
// then re-ranks client-side with a precision scoring algorithm
export async function searchUsers(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ users: [] });

    const lower = q.toLowerCase();
    let candidates;

    try {
      // Fast path: MongoDB text index search
      candidates = await User.find(
        {
          $text: { $search: q },
          _id: { $ne: req.userId },
          banned: false,
        },
        { score: { $meta: 'textScore' } }
      )
        .select('name email avatarUrl skillLevel preferences displayLocation')
        .sort({ score: { $meta: 'textScore' } })
        .limit(30)
        .lean();
    } catch {
      // Fallback: regex scan (if text index not yet built)
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      candidates = await User.find({
        _id: { $ne: req.userId },
        banned: false,
        $or: [{ name: rx }, { email: rx }],
      })
        .select('name email avatarUrl skillLevel preferences displayLocation')
        .limit(30)
        .lean();
    }

    // Re-rank: exact > starts-with > contains (name weighs more than email)
    const scored = candidates.map(u => {
      const nameLow  = (u.name  || '').toLowerCase();
      const emailLow = (u.email || '').toLowerCase();
      let score = 0;
      if      (nameLow === lower)               score = 100;
      else if (nameLow.startsWith(lower))       score = 80;
      else if (nameLow.includes(lower))         score = 60;
      else if (emailLow === lower)              score = 50;
      else if (emailLow.startsWith(lower))      score = 30;
      else if (emailLow.includes(lower))        score = 10;
      return { ...u, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    return res.json({
      users: scored.slice(0, 15).map(({ _score, score, ...u }) => u),
    });
  } catch (e) {
    console.error('searchUsers error:', e);
    return res.status(500).json({ error: 'Search failed' });
  }
}

export async function uploadAvatar(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/${req.file.filename}`;
  await User.findByIdAndUpdate(req.userId, { avatarUrl: url });
  return res.json({ avatarUrl: url });
}

export function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

export { uploadsDir };
