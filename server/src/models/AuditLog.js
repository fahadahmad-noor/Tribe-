import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action:     { type: String, required: true }, // BAN_USER, UNBAN_USER, VERIFY_VENUE, etc.
    targetType: { type: String, required: true }, // 'User', 'Venue', 'Lobby'
    targetId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    meta:       { type: Object, default: {} },    // { reason, previousValue, newValue }
    ip:         { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
