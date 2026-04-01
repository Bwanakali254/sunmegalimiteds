import mongoose from 'mongoose';

const emailQueueSchema = new mongoose.Schema({
    to: { type: String, required: true },
    from: { type: String, required: true },
    subject: { type: String, required: true },
    html: { type: String, required: true },
    text: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'sent', 'failed'], 
        default: 'pending' 
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastAttemptAt: { type: Date, required: false },
    sentAt: { type: Date, required: false },
    failedAt: { type: Date, required: false },
    error: { type: String, required: false },
    context: { type: String, required: false },
    createdAt: { type: Date, default: Date.now }
}, { minimize: false });

// Indexes
emailQueueSchema.index({ status: 1 });
emailQueueSchema.index({ createdAt: 1 });
emailQueueSchema.index({ to: 1 });

const emailQueueModel = mongoose.models.emailQueue || mongoose.model('emailQueue', emailQueueSchema);

export default emailQueueModel;
