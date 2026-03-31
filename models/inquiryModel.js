import mongoose from 'mongoose'

const inquirySchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  location: { type: String, required: true },
  productInterest: { type: String, required: true },
  message: { type: String, default: '' },
  contactMethod: { type: String, default: '' },
  status: {
    type: String,
    enum: ['new', 'read', 'replied'],
    default: 'new'
  },
  createdAt: { type: Date, default: Date.now }
}, { minimize: false })

inquirySchema.index({ email: 1 })
inquirySchema.index({ createdAt: -1 })
inquirySchema.index({ productInterest: 1 })

const inquiryModel = mongoose.models.inquiry || mongoose.model('inquiry', inquirySchema)

export default inquiryModel
