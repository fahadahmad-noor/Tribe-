import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Lobby from '../models/Lobby.js';
import JoinRequest from '../models/JoinRequest.js';
import Squad from '../models/Squad.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

export async function getMe(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json({ user: user.toPublicJSON() });
}

export async function patchMe(req, res) {
  const { name, whatsappNumber, ringerMode } = req.body;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (name !== undefined) user.name = name;
  if (whatsappNumber !== undefined) user.whatsappNumber = whatsappNumber;
  if (ringerMode !== undefined) user.ringerMode = !!ringerMode;
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

export async function getHistory(req, res) {
  const userId = req.userId;
  const requests = await JoinRequest.find({ userId })
    .populate('lobbyId')
    .sort({ updatedAt: -1 })
    .limit(100);
  const lobbies = await Lobby.find({ confirmedPlayerIds: userId }).sort({ dateTime: -1 }).limit(50);
  return res.json({ requests, lobbies });
}

export async function getMeSquads(req, res) {
  const squads = await Squad.find({ roster: req.userId })
    .select('_id name sport captainId')
    .populate('captainId', 'name');
  return res.json({ squads });
}

export async function searchUsers(req, res) {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ users: [] });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({
    _id: { $ne: req.userId },
    banned: false,
    $or: [{ email: rx }, { name: rx }],
  })
    .select('name email avatarUrl')
    .limit(15);
  return res.json({
    users: users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
    })),
  });
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
