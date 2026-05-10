import mongoose from 'mongoose';

const lobbySchema = new mongoose.Schema(
  {
    sport: { type: String, required: true },
    matchFormat: { type: Number, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      country: { type: String, default: '' },
      venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', default: null },
    },
    dateTime: { type: Date, required: true },
    expiresAt: { type: Date, default: null }, // dateTime + 2h, set on create
    description: { type: String, default: '' },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    confirmedPlayerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    totalSlots: { type: Number, required: true },
    openSlots: { type: Number, required: true },
    // EXPIRED = auto-transitioned by cron; CANCELLED = manually cancelled
    status: { type: String, enum: ['OPEN', 'LOCKED', 'CANCELLED', 'COMPLETED', 'EXPIRED'], default: 'OPEN' },
  },
  { timestamps: true }
);

lobbySchema.index({ location: '2dsphere' });
lobbySchema.index({ 'location.city': 1, 'location.country': 1 });
lobbySchema.index({ sport: 1, status: 1, dateTime: 1 });
lobbySchema.index({ 'location.country': 1, 'location.city': 1, status: 1 });
// Expiry cron: find lobbies where expiresAt < now and status is still active
lobbySchema.index({ expiresAt: 1, status: 1 });
// Status-only filter (admin panel)
lobbySchema.index({ status: 1, createdAt: -1 });
// History query indexes
lobbySchema.index({ organizerId: 1, status: 1, dateTime: -1 });
lobbySchema.index({ confirmedPlayerIds: 1, status: 1, dateTime: -1 });
// computeStats aggregate index
lobbySchema.index({ organizerId: 1, status: 1 });
lobbySchema.index({ confirmedPlayerIds: 1, status: 1 });

export default mongoose.model('Lobby', lobbySchema);
