import mongoose from 'mongoose';

const squadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sport: { type: String, required: true },
    description: { type: String, default: '' },
    captainId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roster: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    logoUrl: { type: String, default: '' },
    stats: {
      matchesPlayed: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Squad', squadSchema);
