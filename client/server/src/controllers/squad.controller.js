import mongoose from 'mongoose';
import Squad from '../models/Squad.js';
import User from '../models/User.js';
import Lobby from '../models/Lobby.js';

export async function listSquads(req, res) {
  const { sport, search } = req.query;
  const filter = {};
  if (sport) filter.sport = sport;
  if (search) filter.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const squads = await Squad.find(filter).populate('roster', 'name avatarUrl').populate('captainId', 'name avatarUrl');
  return res.json({ squads });
}

export async function getSquad(req, res) {
  const squad = await Squad.findById(req.params.id).populate('roster', 'name avatarUrl').populate('captainId', 'name avatarUrl');
  if (!squad) return res.status(404).json({ error: 'Not found' });
  return res.json({ squad });
}

export async function squadHistory(req, res) {
  const squad = await Squad.findById(req.params.id);
  if (!squad) return res.status(404).json({ error: 'Not found' });
  const rosterIds = squad.roster.map((id) => id.toString());
  const lobbies = await Lobby.find({
    confirmedPlayerIds: { $elemMatch: { $in: squad.roster } },
  })
    .sort({ dateTime: -1 })
    .limit(30)
    .lean();
  const filtered = lobbies.filter((l) => {
    const confirmed = (l.confirmedPlayerIds || []).map((x) => x.toString());
    return confirmed.some((id) => rosterIds.includes(id));
  });
  return res.json({ lobbies: filtered.length ? filtered : lobbies });
}

export async function createSquad(req, res) {
  const { name, sport, description } = req.body;
  if (!name || !sport) return res.status(400).json({ error: 'Missing fields' });
  const squad = await Squad.create({
    name,
    sport,
    description: description || '',
    captainId: req.userId,
    roster: [req.userId],
  });
  const populated = await Squad.findById(squad._id).populate('roster', 'name avatarUrl').populate('captainId', 'name avatarUrl');
  return res.status(201).json({ squad: populated });
}

export async function addMember(req, res) {
  const squad = await Squad.findById(req.params.id);
  if (!squad) return res.status(404).json({ error: 'Not found' });
  if (squad.captainId.toString() !== req.userId) return res.status(403).json({ error: 'Captain only' });

  const { userId, email } = req.body;
  let targetId = userId;
  if (!targetId && email) {
    const u = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!u) return res.status(404).json({ error: 'User not found' });
    targetId = u._id.toString();
  }
  if (!mongoose.isValidObjectId(targetId)) return res.status(400).json({ error: 'Invalid user' });

  if (squad.roster.some((id) => id.toString() === targetId)) {
    return res.status(400).json({ error: 'Already a member' });
  }
  squad.roster.push(new mongoose.Types.ObjectId(targetId));
  await squad.save();
  const populated = await Squad.findById(squad._id).populate('roster', 'name avatarUrl').populate('captainId', 'name avatarUrl');
  return res.json({ squad: populated });
}

export async function removeMember(req, res) {
  const squad = await Squad.findById(req.params.id);
  if (!squad) return res.status(404).json({ error: 'Not found' });
  if (squad.captainId.toString() !== req.userId) return res.status(403).json({ error: 'Captain only' });
  const memberId = req.params.userId;
  if (memberId === squad.captainId.toString()) return res.status(400).json({ error: 'Cannot remove captain' });
  squad.roster = squad.roster.filter((id) => id.toString() !== memberId);
  await squad.save();
  const populated = await Squad.findById(squad._id).populate('roster', 'name avatarUrl').populate('captainId', 'name avatarUrl');
  return res.json({ squad: populated });
}

export async function leaveSquad(req, res) {
  const squad = await Squad.findById(req.params.id);
  if (!squad) return res.status(404).json({ error: 'Not found' });
  if (squad.captainId.toString() === req.userId) return res.status(400).json({ error: 'Captain cannot leave (transfer captain first)' });
  if (!squad.roster.some((id) => id.toString() === req.userId)) return res.status(400).json({ error: 'Not a member' });
  squad.roster = squad.roster.filter((id) => id.toString() !== req.userId);
  await squad.save();
  const populated = await Squad.findById(squad._id).populate('roster', 'name avatarUrl').populate('captainId', 'name avatarUrl');
  return res.json({ squad: populated });
}
