import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lobbyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby', default: null },
  type: {
    type: String,
    enum: ['APPROVAL', 'REJECTION', 'REQUEST', 'ALERT', 'WAITLIST_PROMOTION', 'RINGER', 'CHALLENGE', 'BOOKING', 'SQUAD_INVITE', 'SYSTEM', 'MESSAGE', 'LOBBY_CLOSED'],
    required: true,
  },
  title: { type: String, default: '' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// User's unread notifications feed
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
