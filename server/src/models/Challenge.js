import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema(
  {
    sport: { type: String, required: true },
    proposingSquadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Squad', required: true },
    acceptingSquadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Squad' },
    status: { type: String, enum: ['OPEN', 'ACCEPTED', 'EXPIRED'], default: 'OPEN' },
    proposedDate: { type: Date },
    matchFormat: { type: Number, default: 5 },
    message: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Challenge', challengeSchema);
