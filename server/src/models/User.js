import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    whatsappNumber: { type: String, default: '' },
    preferences: [{ type: String }],
    ringerMode: { type: Boolean, default: false },
    avatarUrl: { type: String, default: '' },
    roles: [{ type: String }],
    banned: { type: Boolean, default: false },
    // Enhanced profile fields
    bio: { type: String, default: '', maxlength: 300 },
    skillLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Pro'],
      default: 'Beginner',
    },
    displayLocation: { type: String, default: '' }, // e.g. "Islamabad, Pakistan"
  },
  { timestamps: true }
);

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    whatsappNumber: this.whatsappNumber || '',
    preferences: this.preferences,
    ringerMode: this.ringerMode,
    avatarUrl: this.avatarUrl,
    roles: this.roles || [],
    bio: this.bio || '',
    skillLevel: this.skillLevel || 'Beginner',
    displayLocation: this.displayLocation || '',
  };
};

// Text index: fast player search on name + email
userSchema.index({ name: 'text', email: 'text' }, { weights: { name: 10, email: 5 } });
// Banned filter used in search
userSchema.index({ banned: 1 });

export default mongoose.model('User', userSchema);
