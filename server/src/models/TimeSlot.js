import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  pitchName: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  timezone: { type: String, default: 'UTC' },
  status: { type: String, enum: ['AVAILABLE', 'BOOKED', 'MAINTENANCE'], default: 'AVAILABLE' },
  bookedByLobbyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby', default: null },
  bookedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Primary query index for slot availability
timeSlotSchema.index({ venueId: 1, pitchName: 1, startTime: 1, status: 1 });
// User's booking history
timeSlotSchema.index({ status: 1, bookedByUserId: 1 });

export default mongoose.model('TimeSlot', timeSlotSchema);
