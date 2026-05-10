import mongoose from 'mongoose';

const joinRequestSchema = new mongoose.Schema(
  {
    lobbyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'DROPPED_OUT', 'WAITLIST'],
      default: 'PENDING',
    },
    type: { type: String, enum: ['JOIN', 'WAITLIST'], default: 'JOIN' },
  },
  { timestamps: true }
);

joinRequestSchema.index({ lobbyId: 1, userId: 1 }, { unique: true });
joinRequestSchema.index({ lobbyId: 1, type: 1, status: 1, createdAt: 1 }); // waitlist FIFO
joinRequestSchema.index({ userId: 1, status: 1 });                         // my requests

export default mongoose.model('JoinRequest', joinRequestSchema);
