import mongoose from 'mongoose';

const pitchSchema = new mongoose.Schema({
  name: String,
  sports: [String],
  hourlyRate: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    sportsSupported: [String],
    amenities: [String],
    pitches: [pitchSchema],
    description: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
  },
  { timestamps: true }
);

venueSchema.index({ location: '2dsphere' });

export default mongoose.model('Venue', venueSchema);
