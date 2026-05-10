import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Lobby from '../models/Lobby.js';
import Squad from '../models/Squad.js';
import AuditLog from '../models/AuditLog.js';

// ─── Helper ────────────────────────────────────────────────────────────────
async function writeAudit(adminId, action, targetType, targetId, meta = {}, ip = '') {
  try {
    await AuditLog.create({ adminId, action, targetType, targetId, meta, ip });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

// ─── Overview Metrics ──────────────────────────────────────────────────────
export async function dashboard(req, res) {
  try {
    const [totalUsers, bannedUsers, pendingVenueApps, activeLobbies, verifiedVenues, totalSquads] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ banned: true }),
        Venue.countDocuments({ verificationStatus: 'PENDING' }),
        Lobby.countDocuments({ status: 'OPEN' }),
        Venue.countDocuments({ verificationStatus: 'VERIFIED' }),
        Squad.countDocuments(),
      ]);
    return res.json({
      metrics: { totalUsers, bannedUsers, activeLobbies, verifiedVenues, pendingVenueApps, totalSquads },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load metrics' });
  }
}

// ─── Users — list with search + pagination ─────────────────────────────────
export async function listUsers(req, res) {
  try {
    const { search = '', page = 1, limit = 20, role = '', status = '' } = req.query;
    const lim = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * lim;

    const filter = {};

    // Search: anchored regex on name + email for index-friendly scan
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    // Role filter
    if (role) filter.roles = role;

    // Status filter
    if (status === 'banned') filter.banned = true;
    else if (status === 'active') filter.banned = { $ne: true };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email roles banned avatarUrl createdAt whatsappNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Manual relevance sort when searching (exact > startsWith > contains)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      users.sort((a, b) => {
        const score = (u) => {
          const name = (u.name || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          if (email === q || name === q) return 3;
          if (name.startsWith(q) || email.startsWith(q)) return 2;
          return 1;
        };
        return score(b) - score(a);
      });
    }

    return res.json({
      users,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / lim),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load users' });
  }
}

// ─── Users — single detail ─────────────────────────────────────────────────
export async function getUser(req, res) {
  try {
    const user = await User.findById(req.params.id)
      .select('name email roles banned avatarUrl createdAt whatsappNumber ringerMode preferences')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [lobbiesOrganized, lobbiesJoined, squads] = await Promise.all([
      Lobby.countDocuments({ organizerId: user._id }),
      Lobby.countDocuments({ confirmedPlayerIds: user._id }),
      Squad.countDocuments({ roster: user._id }),
    ]);

    const recentLobbies = await Lobby.find({
      $or: [{ organizerId: user._id }, { confirmedPlayerIds: user._id }],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('sport matchFormat status dateTime location organizerId')
      .lean();

    const auditHistory = await AuditLog.find({ targetId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('adminId', 'name email')
      .lean();

    return res.json({
      user,
      stats: { lobbiesOrganized, lobbiesJoined, squads },
      recentLobbies,
      auditHistory,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load user' });
  }
}

// ─── Users — ban ───────────────────────────────────────────────────────────
export async function banUser(req, res) {
  try {
    const { reason = '' } = req.body;
    const u = await User.findByIdAndUpdate(req.params.id, { banned: true }, { new: true })
      .select('name email roles banned');
    if (!u) return res.status(404).json({ error: 'Not found' });
    await writeAudit(req.userId, 'BAN_USER', 'User', u._id, { reason }, req.ip);
    return res.json({ user: u });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to ban user' });
  }
}

// ─── Users — unban ─────────────────────────────────────────────────────────
export async function unbanUser(req, res) {
  try {
    const u = await User.findByIdAndUpdate(req.params.id, { banned: false }, { new: true })
      .select('name email roles banned');
    if (!u) return res.status(404).json({ error: 'Not found' });
    await writeAudit(req.userId, 'UNBAN_USER', 'User', u._id, {}, req.ip);
    return res.json({ user: u });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to unban user' });
  }
}

// ─── Users — update roles ──────────────────────────────────────────────────
export async function updateUserRoles(req, res) {
  try {
    const { roles } = req.body;
    if (!Array.isArray(roles)) return res.status(400).json({ error: 'roles must be an array' });
    const allowed = ['player', 'admin', 'venue_owner'];
    if (!roles.every(r => allowed.includes(r))) return res.status(400).json({ error: 'Invalid role' });
    const u = await User.findByIdAndUpdate(req.params.id, { roles }, { new: true })
      .select('name email roles banned');
    if (!u) return res.status(404).json({ error: 'Not found' });
    await writeAudit(req.userId, 'CHANGE_ROLES', 'User', u._id, { roles }, req.ip);
    return res.json({ user: u });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update roles' });
  }
}

// ─── Venues — pending ──────────────────────────────────────────────────────
export async function pendingVenues(req, res) {
  try {
    const venues = await Venue.find({ verificationStatus: 'PENDING' })
      .populate('ownerId', 'name email whatsappNumber')
      .lean();
    return res.json({ venues });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load venues' });
  }
}

// ─── Venues — list all ─────────────────────────────────────────────────────
export async function listAllVenues(req, res) {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const lim = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * lim;

    const filter = {};
    if (status) filter.verificationStatus = status;
    if (search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.name = regex;
    }

    const [venues, total] = await Promise.all([
      Venue.find(filter)
        .populate('ownerId', 'name email whatsappNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Venue.countDocuments(filter),
    ]);

    return res.json({ venues, total, page: Number(page), totalPages: Math.ceil(total / lim) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load venues' });
  }
}

// ─── Venues — verify ───────────────────────────────────────────────────────
export async function verifyVenue(req, res) {
  try {
    const v = await Venue.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: 'VERIFIED' },
      { new: true }
    );
    if (!v) return res.status(404).json({ error: 'Not found' });
    if (v.ownerId) await User.findByIdAndUpdate(v.ownerId, { $addToSet: { roles: 'venue_owner' } });
    await writeAudit(req.userId, 'VERIFY_VENUE', 'Venue', v._id, {}, req.ip);
    return res.json({ venue: v });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify venue' });
  }
}

// ─── Venues — reject ───────────────────────────────────────────────────────
export async function rejectVenue(req, res) {
  try {
    const v = await Venue.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: 'REJECTED' },
      { new: true }
    );
    if (!v) return res.status(404).json({ error: 'Not found' });
    await writeAudit(req.userId, 'REJECT_VENUE', 'Venue', v._id, {}, req.ip);
    return res.json({ venue: v });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reject venue' });
  }
}

// ─── Lobbies — list all ────────────────────────────────────────────────────
export async function listAllLobbies(req, res) {
  try {
    const { status = '', sport = '', page = 1, limit = 20 } = req.query;
    const lim = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * lim;
    const filter = {};
    if (status) filter.status = status;
    if (sport) filter.sport = sport;

    const [lobbies, total] = await Promise.all([
      Lobby.find(filter)
        .populate('organizerId', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Lobby.countDocuments(filter),
    ]);

    return res.json({ lobbies, total, page: Number(page), totalPages: Math.ceil(total / lim) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load lobbies' });
  }
}

// ─── Lobbies — force close ─────────────────────────────────────────────────
export async function forceCloseLobby(req, res) {
  try {
    const lobby = await Lobby.findByIdAndUpdate(
      req.params.id,
      { status: 'LOCKED' },
      { new: true }
    );
    if (!lobby) return res.status(404).json({ error: 'Not found' });
    req.app.get('io')?.to(`lobby:${lobby._id}`).emit('lobby_locked');
    await writeAudit(req.userId, 'CLOSE_LOBBY', 'Lobby', lobby._id, {}, req.ip);
    return res.json({ lobby });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to close lobby' });
  }
}

// ─── Audit Log — list ──────────────────────────────────────────────────────
export async function listAuditLog(req, res) {
  try {
    const { page = 1, limit = 20, action = '', adminId = '' } = req.query;
    const lim = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * lim;
    const filter = {};
    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('adminId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / lim) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load audit log' });
  }
}
