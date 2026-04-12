const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lobbyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby', default: null },
  type: {
    type: String,
    enum: ['APPROVAL', 'REQUEST', 'ALERT', 'WAITLIST_PROMOTION', 'RINGER', 'CHALLENGE', 'BOOKING', 'SQUAD_INVITE', 'SYSTEM'],
    required: true,
  },
  title: { type: String, default: '' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// User's unread notifications feed
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
