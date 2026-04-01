import Product from '../models/productModel.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

/**
 * List all products
 * GET /api/product/list
 */
export const listProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('List products error:', error);
    res.json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

/**
 * Add new product with Cloudinary image upload
 * POST /api/product/add
 */
export const addProduct = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      category, 
      subCategory, 
      brand, 
      specifications,
      features 
    } = req.body;

    // Handle image uploads to Cloudinary
    let imageUrls = [];
    
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file) => {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'image',
            folder: 'sunmega/products'
          });
          fs.unlinkSync(file.path);
          return result.secure_url;
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return null;
        }
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      imageUrls = uploadedUrls.filter(url => url !== null);
    }

    // Parse JSON fields
    let parsedSubCategory = subCategory;
    let parsedFeatures = features;
    let parsedSpecifications = specifications;
    
    try {
      if (typeof subCategory === 'string') parsedSubCategory = JSON.parse(subCategory);
      if (typeof features === 'string') parsedFeatures = JSON.parse(features);
      if (typeof specifications === 'string') parsedSpecifications = JSON.parse(specifications);
    } catch (e) {}

    const product = new Product({
      name,
      description,
      price: price ? Number(price) : null,
      category,
      subCategory: parsedSubCategory || [],
      brand: brand || 'Sun Mega',
      image: imageUrls,
      specifications: parsedSpecifications || {},
      features: parsedFeatures || []
    });

    await product.save();

    res.json({
      success: true,
      message: 'Product added successfully',
      product
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.json({
      success: false,
      message: 'Failed to add product'
    });
  }
};

/**
 * Remove product
 * POST /api/product/remove
 */
export const removeProduct = async (req, res) => {
  try {
    const { id } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product removed successfully'
    });
  } catch (error) {
    console.error('Remove product error:', error);
    res.json({
      success: false,
      message: 'Failed to remove product'
    });
  }
};

/**
 * Update product
 * POST /api/product/update
 */
export const updateProduct = async (req, res) => {
  try {
    const { id, ...updateData } = req.body;

    // Handle existing images from request
    if (updateData.image && typeof updateData.image === 'string') {
      try {
        updateData.image = JSON.parse(updateData.image);
      } catch (e) {
        // Keep as-is if parsing fails
      }
    }

    // Handle new image uploads to Cloudinary
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file) => {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'image',
            folder: 'sunmega/products'
          });
          fs.unlinkSync(file.path);
          return result.secure_url;
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return null;
        }
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      const newImages = uploadedUrls.filter(url => url !== null);
      
      // Merge existing images with new ones
      const existingImages = updateData.image || [];
      updateData.image = [...existingImages, ...newImages];
    }

    // Parse JSON fields
    ['subCategory', 'features', 'specifications'].forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'string') {
        try { updateData[field] = JSON.parse(updateData[field]); } catch (e) {}
      }
    });

    const product = await Product.findByIdAndUpdate(id, updateData, { new: true });

    if (!product) {
      return res.json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.json({
      success: false,
      message: 'Failed to update product'
    });
  }
};

/**
 * Get single product
 * GET /api/product/:id
 */
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product || !product.isActive) {
      return res.json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};
