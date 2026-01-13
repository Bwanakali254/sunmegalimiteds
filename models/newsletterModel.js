import mongoose from 'mongoose';

const newsletterSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: { type: Date, required: false },
    status: { 
        type: String, 
        enum: ['active', 'unsubscribed'], 
        default: 'active' 
    },
    unsubscribeToken: { type: String, required: false }
}, { minimize: false });

// Indexes
newsletterSchema.index({ email: 1 }, { unique: true });
newsletterSchema.index({ status: 1 });

const newsletterModel = mongoose.models.newsletter || mongoose.model('newsletter', newsletterSchema);

export default newsletterModel;
