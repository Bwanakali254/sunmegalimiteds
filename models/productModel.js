import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: Array, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, required: true},
    brand: { type: String, required: true },
    quantity: { type: Number, required: true },
    rating: { type: Number, required: true },
    bestseller: { type: Boolean},
    date: { type: Number, required: true }
})

// Add indexes for performance
productSchema.index({ category: 1 });
productSchema.index({ subCategory: 1 });
productSchema.index({ bestseller: 1 });

const productModel = mongoose.models.product || mongoose.model("Product", productSchema);

export default productModel;