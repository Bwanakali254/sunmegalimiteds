import mongoose from 'mongoose';

/**
 * Product Model
 * Stores solar products for the e-commerce system
 */
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    default: null  // No price for inquiry-based products
  },
  category: {
    type: String,
    required: true,
    enum: ['batteries', 'energy-storage-systems', 'single-phase', 'three-phase', 'accessories', 'other']
  },
  subCategory: {
    type: [String],  // Array of subcategories like ['single-phase', 'all-in-one']
    default: []
  },
  brand: {
    type: String,
    default: 'Sun Mega'
  },
  image: {
    type: [String],  // Array of Cloudinary image URLs - matches frontend
    default: []
  },
  features: {
    type: [String],
    default: []
  },
  specifications: {
    type: Map,
    of: String,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

export default Product;
