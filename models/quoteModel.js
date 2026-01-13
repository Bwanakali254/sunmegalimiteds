import mongoose from 'mongoose';

const quoteSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    serviceType: { type: String, required: true },
    location: { type: String, required: true },
    message: { type: String, required: false },
    status: { 
        type: String, 
        enum: ['new', 'read', 'replied'], 
        default: 'new' 
    },
    createdAt: { type: Date, default: Date.now }
}, { minimize: false });

// Indexes
quoteSchema.index({ email: 1 });
quoteSchema.index({ createdAt: 1 });
quoteSchema.index({ serviceType: 1 });
quoteSchema.index({ status: 1 });

const quoteModel = mongoose.models.quote || mongoose.model('quote', quoteSchema);

export default quoteModel;
