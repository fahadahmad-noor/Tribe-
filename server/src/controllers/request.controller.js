import Lobby from '../models/Lobby.js';
import JoinRequest from '../models/JoinRequest.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { enqueuePromotion } from '../jobs/waitlistPromotion.job.js';

async function populateLobby(id) {
  return Lobby.findById(id)
    .populate('organizerId', 'name avatarUrl whatsappNumber email')
    .populate('confirmedPlayerIds', 'name avatarUrl');
}

// ── Notification helper ───────────────────────────────────────────────────────
async function notify(io, { userId, type, title, message, lobbyId = null, metadata = {} }) {
  try {
    const notif = await Notification.create({ userId, type, title, message, lobbyId, metadata, isRead: false });
    io?.to(`user:${userId}`).emit('notification', notif.toObject());
  } catch (e) {
    console.error('notify error:', e?.message);
  }
}

// ── Organizer: list all JOIN requests for a lobby ────────────────────────────
export async function listLobbyRequests(req, res) {
  const lobby = await Lobby.findById(req.params.lobbyId);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  if (lobby.organizerId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  const requests = await JoinRequest.find({ lobbyId: lobby._id })
    .populate('userId', 'name avatarUrl preferences skillLevel')
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ requests });
}

// ── Public: get waitlist for any lobby ───────────────────────────────────────
export async function getWaitlist(req, res) {
  try {
    const waitlist = await JoinRequest.find({
      lobbyId: req.params.lobbyId,
      type: 'WAITLIST',
      status: 'PENDING',
    })
      .sort({ createdAt: 1 })
      .populate('userId', 'name avatarUrl preferences skillLevel displayLocation')
      .lean();

    return res.json({
      waitlist: waitlist.map((w, i) => ({
        _id: w._id,
        position: i + 1,
        user: w.userId,
        joinedAt: w.createdAt,
        isMe: w.userId?._id?.toString() === req.userId,
      })),
      count: waitlist.length,
    });
  } catch (e) {
    console.error('getWaitlist error:', e);
    return res.status(500).json({ error: 'Failed to load waitlist' });
  }
}

// ── Get current user's own request for a lobby ───────────────────────────────
export async function getMyRequest(req, res) {
  try {
    const request = await JoinRequest.findOne({
      lobbyId: req.params.lobbyId,
      userId: req.userId,
    }).sort({ createdAt: -1 }).lean();
    return res.json({ request: request || null });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch request' });
  }
}

// ── User accepts waitlist promotion ──────────────────────────────────────────
export async function acceptPromotion(req, res) {
  const io = req.app.get('io');
  try {
    const request = await JoinRequest.findById(req.params.requestId).populate('lobbyId');
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.userId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    if (request.type !== 'WAITLIST' || request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Not eligible to accept' });
    }

    const lobby = request.lobbyId;
    const updated = await Lobby.findOneAndUpdate(
      { _id: lobby._id, openSlots: { $gt: 0 } },
      { $inc: { openSlots: -1 }, $addToSet: { confirmedPlayerIds: request.userId } },
      { new: true }
    );
    if (!updated) return res.status(409).json({ error: 'No slots available anymore' });

    request.status = 'APPROVED';
    await request.save();

    if (updated.openSlots === 0) { updated.status = 'LOCKED'; await updated.save(); }

    const populatedLobby = await populateLobby(lobby._id);
    io?.to(`lobby:${lobby._id}`).emit('roster_updated', {
      openSlots: populatedLobby.openSlots,
      status: populatedLobby.status,
      confirmedPlayerIds: populatedLobby.confirmedPlayerIds,
    });
    io?.to(`lobby:${lobby._id}`).emit('waitlist_updated');
    io?.to('feed').emit('lobby_updated', populatedLobby.toObject());

    return res.json({ ok: true, lobby: populatedLobby });
  } catch (e) {
    console.error('acceptPromotion error:', e);
    return res.status(500).json({ error: 'Failed to accept promotion' });
  }
}

// ── Create join request (OPEN lobby) — 🔔 notify organizer ──────────────────
export async function createJoinRequest(req, res) {
  const io = req.app.get('io');
  const lobby = await Lobby.findById(req.params.lobbyId);
  if (!lobby || lobby.status !== 'OPEN') return res.status(400).json({ error: 'Lobby not open' });
  if (lobby.organizerId.toString() === req.userId) return res.status(400).json({ error: 'You are the organizer' });
  try {
    const [request, requester] = await Promise.all([
      JoinRequest.create({ lobbyId: lobby._id, userId: req.userId, status: 'PENDING', type: 'JOIN' }),
      User.findById(req.userId).select('name').lean(),
    ]);
    const populated = await JoinRequest.findById(request._id)
      .populate('userId', 'name avatarUrl preferences skillLevel')
      .lean();

    // Socket push to organizer's lobby room
    io?.to(`lobby:${lobby._id}`).emit('request_received', populated);

    // 🔔 Persistent notification to organizer
    await notify(io, {
      userId: lobby.organizerId.toString(),
      type: 'REQUEST',
      title: `📩 ${requester?.name || 'Someone'} wants to join`,
      message: `New join request for your ${lobby.sport} lobby`,
      lobbyId: lobby._id,
      metadata: { requestId: request._id, requesterId: req.userId },
    });

    return res.status(201).json({ request: populated });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: 'Already requested' });
    throw e;
  }
}

// ── Join waitlist (LOCKED lobby) ─────────────────────────────────────────────
export async function createWaitlist(req, res) {
  const io = req.app.get('io');
  const lobby = await Lobby.findById(req.params.lobbyId);
  if (!lobby || lobby.status !== 'LOCKED') return res.status(400).json({ error: 'Lobby not full' });
  if (lobby.organizerId.toString() === req.userId) return res.status(400).json({ error: 'You are the organizer' });
  if (lobby.confirmedPlayerIds.some(id => id.toString() === req.userId)) {
    return res.status(400).json({ error: 'You are already in this lobby' });
  }
  try {
    const request = await JoinRequest.create({
      lobbyId: lobby._id, userId: req.userId, status: 'PENDING', type: 'WAITLIST',
    });
    const populated = await JoinRequest.findById(request._id)
      .populate('userId', 'name avatarUrl preferences skillLevel')
      .lean();

    io?.to(`lobby:${lobby._id}`).emit('waitlist_updated');
    return res.status(201).json({ request: populated });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: 'Already on waitlist' });
    throw e;
  }
}

// ── Organizer: approve — 🔔 notify requester ─────────────────────────────────
export async function approveRequest(req, res) {
  const io = req.app.get('io');
  const request = await JoinRequest.findById(req.params.requestId).populate('lobbyId');
  if (!request) return res.status(404).json({ error: 'Not found' });
  const lobby = request.lobbyId;
  if (lobby.organizerId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'Invalid status' });

  const updated = await Lobby.findOneAndUpdate(
    { _id: lobby._id, openSlots: { $gt: 0 }, status: 'OPEN' },
    { $inc: { openSlots: -1 }, $addToSet: { confirmedPlayerIds: request.userId } },
    { new: true }
  );
  if (!updated) return res.status(409).json({ error: 'Lobby full' });

  request.status = 'APPROVED';
  await request.save();

  if (updated.openSlots === 0) { updated.status = 'LOCKED'; await updated.save(); }

  const populatedLobby = await populateLobby(lobby._id);
  io?.to(`lobby:${lobby._id}`).emit('roster_updated', {
    openSlots: populatedLobby.openSlots,
    status: populatedLobby.status,
    confirmedPlayerIds: populatedLobby.confirmedPlayerIds,
  });
  io?.to('feed').emit('lobby_updated', populatedLobby.toObject());

  // 🔔 Notify requester they got approved
  await notify(io, {
    userId: request.userId.toString(),
    type: 'APPROVAL',
    title: '✅ Join request approved!',
    message: `You've been confirmed for the ${lobby.sport} lobby on ${new Date(lobby.dateTime).toLocaleDateString()}`,
    lobbyId: lobby._id,
    metadata: { lobbyId: lobby._id },
  });

  return res.json({ lobby: populatedLobby, request });
}

// ── Organizer: reject — 🔔 notify requester ──────────────────────────────────
export async function rejectRequest(req, res) {
  const io = req.app.get('io');
  const request = await JoinRequest.findById(req.params.requestId).populate('lobbyId');
  if (!request) return res.status(404).json({ error: 'Not found' });
  const lobby = request.lobbyId;
  if (lobby.organizerId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  request.status = 'REJECTED';
  await request.save();

  // 🔔 Notify requester they were rejected
  await notify(io, {
    userId: request.userId.toString(),
    type: 'REJECTION',
    title: '❌ Join request not accepted',
    message: `Your request for the ${lobby.sport} lobby was not approved`,
    lobbyId: lobby._id,
    metadata: { lobbyId: lobby._id },
  });

  return res.json({ ok: true });
}

// ── Cancel pending request or waitlist spot ───────────────────────────────────
export async function cancelRequest(req, res) {
  const io = req.app.get('io');
  const request = await JoinRequest.findById(req.params.requestId);
  if (!request || request.userId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  request.status = 'CANCELLED';
  await request.save();
  if (request.type === 'WAITLIST') {
    io?.to(`lobby:${request.lobbyId}`).emit('waitlist_updated');
  }
  return res.json({ ok: true });
}

// ── Drop out — 🔔 enqueue waitlist promotion ──────────────────────────────────
export async function dropout(req, res) {
  const io = req.app.get('io');
  const request = await JoinRequest.findById(req.params.requestId).populate('lobbyId');
  if (!request || request.userId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  if (request.status !== 'APPROVED') return res.status(400).json({ error: 'Not confirmed' });

  const lobby = await Lobby.findById(request.lobbyId._id);
  lobby.confirmedPlayerIds = lobby.confirmedPlayerIds.filter(id => id.toString() !== req.userId);
  lobby.openSlots += 1;
  if (lobby.status === 'LOCKED' && lobby.openSlots > 0) lobby.status = 'OPEN';
  await lobby.save();

  request.status = 'DROPPED_OUT';
  await request.save();

  io?.to(`lobby:${lobby._id}`).emit('player_dropped', { openSlots: lobby.openSlots, status: lobby.status });
  io?.to('feed').emit('lobby_updated', lobby.toObject());

  // 🔔 Notify #1 waitlist person a slot opened
  try {
    await enqueuePromotion(lobby._id.toString(), io);
  } catch (e) {
    console.warn('Waitlist promotion enqueue failed (non-critical):', e?.message);
  }

  return res.json({ ok: true });
}
