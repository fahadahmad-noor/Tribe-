import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    // DM fields
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional for LOBBY_CHAT

    // Group chat fields
    lobbyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby', index: true },

    // Message type discriminator
    type: {
      type: String,
      enum: ['DM', 'LOBBY_CHAT'],
      default: 'DM',
      required: true,
    },

    message: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
);

// DM thread indexes
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });
// Lobby chat index
messageSchema.index({ lobbyId: 1, _id: -1 });

export default mongoose.model('Message', messageSchema);
