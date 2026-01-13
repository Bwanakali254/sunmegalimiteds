import mongoose from 'mongoose';

const ipnLogSchema = new mongoose.Schema({
    orderTrackingId: { type: String, required: true, unique: true },
    processedStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    lockedAt: { type: Date },
    processedAt: { type: Date, default: Date.now },
    status: { type: String },
    retryCount: { type: Number, default: 0 },
    lastError: { type: String }
});

// Compound index for race condition prevention
ipnLogSchema.index({ orderTrackingId: 1, processedStatus: 1 });
ipnLogSchema.index({ orderTrackingId: 1 });

const ipnLogModel = mongoose.models.ipnLog || mongoose.model('ipnLog', ipnLogSchema);
export default ipnLogModel;
