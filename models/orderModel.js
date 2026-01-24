import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: { type: Array, required: true },
    amount: { type: Number, required: true },
    address: { type: Object, required: true },
  
    merchantReference: { type: String, required: true, unique: true }, // ✅ ADD
  
    status: { type: String, default: "Order Placed" },
    paymentMethod: { type: String, required: true },
    payment: { type: Boolean, default: false },
    date: { type: String, required: true },
    orderTrackingId: { type: String },
  });

// Add indexes for performance
orderSchema.index({ userId: 1 });
orderSchema.index({ orderTrackingId: 1 });
orderSchema.index({ status: 1 });

const orderModel = mongoose.models.order || mongoose.model('order',orderSchema)
export default orderModel;