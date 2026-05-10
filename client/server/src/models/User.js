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
  };
};

export default mongoose.model('User', userSchema);
