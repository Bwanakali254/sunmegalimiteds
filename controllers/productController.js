import { v2 as cloudinary } from 'cloudinary';
import productModel from '../models/productModel.js';
import { logError, logInfo } from '../utils/logger.js';
import fs from 'fs';

// function for add product
const addProduct = async (req, res) => {
    try {
        const { name, description, price, category, subCategory, brand, bestseller, quantity, rating } = req.body

        const image1 = req.files.image1 && req.files.image1[0]
        const image2 = req.files.image2 && req.files.image2[0]
        const image3 = req.files.image3 && req.files.image3[0]
        const image4 = req.files.image4 && req.files.image4[0]

        const images = [image1, image2, image3, image4].filter((item)=> item !== undefined);

        if (images.length === 0) {
            return res.status(400).json({ success: false, message: "At least one product image is required" });
        }

        let imagesUrl = await Promise.all(
            images.map(async (item) => {
            let result = await cloudinary.uploader.upload(item.path,{resource_type: 'image'});
            return result.secure_url;
        })
    )

    const productData = {
        name,
        description,
        category,
        price: Number(price),
        subCategory,
        brand,
        bestseller: bestseller === "true" || bestseller === true,
        quantity: Number(quantity),
        rating: 0,
        image: imagesUrl,
        date: Date.now()
    }

    logInfo(JSON.stringify(productData), 'addProduct');

    const product = new productModel(productData);
    await product.save();

        res.json({ success: true, message: "Product Added Successfully" })

    } catch (error) {
        logError(error, 'addProduct');
        res.json({ success: false, message: "Failed to add product" })
    }
}

// function for list products
const listProducts = async (req, res) => {
    try {

        const products = await productModel.find({});
        res.json({ success: true, products })

    } catch (error) {
        logError(error, 'listProducts');
        res.json({ success: false, message: "Failed to list products" })
    }

}

// function for removing product
const removeProduct = async (req, res) => {
    try {

      await productModel.findByIdAndDelete(req.body.id);
      res.json({ success: true, message: "Product Removed Successfully" })

    } catch (error) {
        logError(error, 'removeProduct');
        res.json({ success: false, message: "Failed to remove product" })
    }
}

// function for getting single product
const singleProduct = async (req, res) => {
   try {

    const {productId} = req.body;
    const product = await productModel.findById(productId);
    res.json({ success: true, product })

   } catch (error) {
        logError(error, 'singleProduct');
        res.json({ success: false, message: "Failed to fetch product" })
    }
}

// Add this to your productController.js
const updateProduct = async (req, res) => {
    try {
        const { id, name, description, price, category, subCategory, brand, bestseller, quantity } = req.body;

        // Get the existing product first
        const existingProduct = await productModel.findById(id);
        if (!existingProduct) {
            return res.json({ success: false, message: "Product not found" });
        }

        // Start with existing images
        let updatedImages = [...existingProduct.image];

        // Handle new uploaded images
        const newImages = [];
        for (let i = 1; i <= 4; i++) {
            const imageKey = `image${i}`;
            if (req.files && req.files[imageKey] && req.files[imageKey][0]) {
                const result = await cloudinary.uploader.upload(req.files[imageKey][0].path, { 
                    resource_type: 'image' 
                });
                // Clean up local file after upload
                try {
                    fs.unlinkSync(req.files[imageKey][0].path);
                } catch (unlinkError) {
                    logError(unlinkError, 'updateProduct-cleanup');
                }
                newImages.push({
                    index: i - 1, // 0-based index
                    url: result.secure_url
                });
            }
        }

        // Replace images at specific positions
        newImages.forEach(({ index, url }) => {
            if (index < updatedImages.length) {
                updatedImages[index] = url;
            } else {
                updatedImages.push(url);
            }
        });

        const updatedProduct = await productModel.findByIdAndUpdate(
            id,
            {
                name,
                description,
                category,
                price: Number(price),
                subCategory,
                brand,
                bestseller: bestseller === "true" || bestseller === true,
                quantity: Number(quantity),
                image: updatedImages,
            },
            { new: true }
        );

        logInfo(`Product updated: ${id}`, 'updateProduct');
        res.json({ success: true, message: "Product Updated Successfully" });

    } catch (error) {
        logError(error, 'updateProduct');
        res.json({ success: false, message: "Failed to update product" });
    }
};

// Add to your exports
export { addProduct, listProducts, removeProduct, singleProduct, updateProduct };
