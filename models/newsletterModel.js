import mongoose from 'mongoose'
import crypto from 'crypto'

const newsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
  unsubscribedAt: { type: Date },
  status: {
    type: String,
    enum: ['active', 'unsubscribed'],
    default: 'active'
  },
  unsubscribeToken: { type: String }
}, { minimize: false })

newsletterSchema.index({ status: 1 })

const newsletterModel = mongoose.models.newsletter || mongoose.model('newsletter', newsletterSchema)

export default newsletterModel

export const generateUnsubscribeToken = () => {
  return crypto.randomBytes(32).toString('hex')
}
