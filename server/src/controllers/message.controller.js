import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';

function partnerId(msg, me) {
  const s = msg.senderId?._id?.toString() || msg.senderId?.toString();
  const r = msg.receiverId?._id?.toString() || msg.receiverId?.toString();
  return s === me ? r : s;
}

export async function inbox(req, res) {
  const me = req.userId;
  const msgs = await Message.find({
    $or: [{ senderId: me }, { receiverId: me }],
  })
    .sort({ createdAt: -1 })
    .populate('senderId', 'name avatarUrl')
    .populate('receiverId', 'name avatarUrl')
    .limit(500)
    .lean();

  const latestByPeer = new Map();
  for (const m of msgs) {
    const peer = partnerId(m, me);
    if (peer && !latestByPeer.has(peer)) latestByPeer.set(peer, m);
  }

  const conversations = [];
  for (const [peerId, last] of latestByPeer) {
    const other = last.senderId?._id?.toString() === me ? last.receiverId : last.senderId;
    conversations.push({
      user: other,
      lastMessage: {
        _id: last._id,
        message: last.message,
        createdAt: last.createdAt,
        sentByMe: last.senderId?._id?.toString() === me,
      },
    });
  }

  conversations.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
  return res.json({ conversations });
}

export async function thread(req, res) {
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Invalid user' });
  const me = req.userId;
  const messages = await Message.find({
    $or: [
      { senderId: me, receiverId: userId },
      { senderId: userId, receiverId: me },
    ],
  })
    .sort({ createdAt: 1 })
    .populate('senderId', 'name avatarUrl')
    .populate('receiverId', 'name avatarUrl')
    .limit(200)
    .lean();
  return res.json({ messages });
}

export async function sendDm(req, res) {
  const io = req.app.get('io');
  const { userId } = req.params;
  const { message } = req.body;
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Invalid user' });
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'Empty message' });
  if (userId === req.userId) return res.status(400).json({ error: 'Invalid recipient' });

  const receiver = await User.findById(userId);
  if (!receiver) return res.status(404).json({ error: 'User not found' });

  const doc = await Message.create({
    senderId: req.userId,
    receiverId: userId,
    message: String(message).trim(),
  });
  const populated = await Message.findById(doc._id)
    .populate('senderId', 'name avatarUrl')
    .populate('receiverId', 'name avatarUrl');

  const payload = populated.toObject();
  io?.to(`user:${userId}`).emit('direct_message', payload);
  io?.to(`user:${req.userId}`).emit('direct_message', payload);

  return res.status(201).json({ message: populated });
}
