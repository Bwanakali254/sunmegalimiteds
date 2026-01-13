import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['new', 'read', 'replied'], 
        default: 'new' 
    },
    repliedAt: { type: Date, required: false }
}, { minimize: false });

// Indexes
contactSchema.index({ email: 1 });
contactSchema.index({ date: 1 });
contactSchema.index({ status: 1 });

const contactModel = mongoose.models.contact || mongoose.model('contact', contactSchema);

export default contactModel;
