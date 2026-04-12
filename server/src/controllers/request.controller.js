import Lobby from '../models/Lobby.js';
import JoinRequest from '../models/JoinRequest.js';

async function populateLobby(id) {
  return Lobby.findById(id)
    .populate('organizerId', 'name avatarUrl whatsappNumber email')
    .populate('confirmedPlayerIds', 'name avatarUrl');
}

export async function listLobbyRequests(req, res) {
  const lobby = await Lobby.findById(req.params.lobbyId);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  if (lobby.organizerId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  const requests = await JoinRequest.find({ lobbyId: lobby._id })
    .populate('userId', 'name avatarUrl preferences')
    .sort({ createdAt: -1 });
  return res.json({ requests });
}

export async function createJoinRequest(req, res) {
  const lobby = await Lobby.findById(req.params.lobbyId);
  if (!lobby || lobby.status !== 'OPEN') return res.status(400).json({ error: 'Lobby not open' });
  if (lobby.organizerId.toString() === req.userId) return res.status(400).json({ error: 'You are the organizer' });
  try {
    const request = await JoinRequest.create({
      lobbyId: lobby._id,
      userId: req.userId,
      status: 'PENDING',
      type: 'JOIN',
    });
    const populated = await JoinRequest.findById(request._id).populate('userId', 'name avatarUrl preferences');
    req.app.get('io')?.to(`lobby:${lobby._id}`).emit('request_received', populated.toObject());
    return res.status(201).json({ request: populated });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: 'Already requested' });
    throw e;
  }
}

export async function createWaitlist(req, res) {
  const lobby = await Lobby.findById(req.params.lobbyId);
  if (!lobby || lobby.status !== 'LOCKED') return res.status(400).json({ error: 'Lobby not full' });
  try {
    const request = await JoinRequest.create({
      lobbyId: lobby._id,
      userId: req.userId,
      status: 'PENDING',
      type: 'WAITLIST',
    });
    const populated = await JoinRequest.findById(request._id).populate('userId', 'name avatarUrl preferences');
    return res.status(201).json({ request: populated });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: 'Already on waitlist' });
    throw e;
  }
}

export async function approveRequest(req, res) {
  const io = req.app.get('io');
  const request = await JoinRequest.findById(req.params.requestId).populate('lobbyId');
  if (!request) return res.status(404).json({ error: 'Not found' });
  const lobby = request.lobbyId;
  if (lobby.organizerId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'Invalid status' });

  const updated = await Lobby.findOneAndUpdate(
    { _id: lobby._id, openSlots: { $gt: 0 }, status: 'OPEN' },
    {
      $inc: { openSlots: -1 },
      $addToSet: { confirmedPlayerIds: request.userId },
    },
    { new: true }
  );

  if (!updated) return res.status(409).json({ error: 'Lobby full' });

  request.status = 'APPROVED';
  await request.save();
  if (updated.openSlots === 0) {
    updated.status = 'LOCKED';
    await updated.save();
  }

  const populatedLobby = await populateLobby(lobby._id);

  io?.to(`lobby:${lobby._id}`).emit('roster_updated', {
    openSlots: populatedLobby.openSlots,
    status: populatedLobby.status,
    confirmedPlayerIds: populatedLobby.confirmedPlayerIds,
  });
  io?.to('feed').emit('lobby_updated', populatedLobby.toObject());
  return res.json({ lobby: populatedLobby, request });
}

export async function rejectRequest(req, res) {
  const request = await JoinRequest.findById(req.params.requestId).populate('lobbyId');
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.lobbyId.organizerId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  request.status = 'REJECTED';
  await request.save();
  return res.json({ ok: true });
}

export async function cancelRequest(req, res) {
  const request = await JoinRequest.findById(req.params.requestId);
  if (!request || request.userId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  request.status = 'CANCELLED';
  await request.save();
  return res.json({ ok: true });
}

export async function dropout(req, res) {
  const io = req.app.get('io');
  const request = await JoinRequest.findById(req.params.requestId).populate('lobbyId');
  if (!request || request.userId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  if (request.status !== 'APPROVED') return res.status(400).json({ error: 'Not confirmed' });

  const lobby = await Lobby.findById(request.lobbyId._id);
  lobby.confirmedPlayerIds = lobby.confirmedPlayerIds.filter((id) => id.toString() !== req.userId);
  lobby.openSlots += 1;
  if (lobby.status === 'LOCKED' && lobby.openSlots > 0) lobby.status = 'OPEN';
  await lobby.save();

  request.status = 'DROPPED_OUT';
  await request.save();

  io?.to(`lobby:${lobby._id}`).emit('player_dropped', { openSlots: lobby.openSlots, status: lobby.status });
  io?.to('feed').emit('lobby_updated', lobby.toObject());
  return res.json({ ok: true });
}
