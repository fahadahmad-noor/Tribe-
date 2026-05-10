import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sport: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: { type: Date, default: () => new Date() },
    registeredSquadIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Squad' }],
    status: { type: String, enum: ['OPEN', 'CLOSED', 'REGISTRATION_OPEN'], default: 'REGISTRATION_OPEN' },
    maxTeams: { type: Number, default: 32 },
    format: { type: String, default: 'KNOCKOUT' },
    matchFormat: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export default mongoose.model('Tournament', tournamentSchema);
