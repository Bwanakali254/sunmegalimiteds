import { v2 as cloudinary } from 'cloudinary';
import productModel from '../models/productModel.js';
import { logError, logInfo } from '../utils/logger.js';

// function for add product
const addProduct = async (req, res) => {
    try {
        const { name, description, price, category, subCategory, brand, bestseller, quantity, rating } = req.body

        const image1 = req.files.image1 && req.files.image1[0]
        const image2 = req.files.image2 && req.files.image2[0]
        const image3 = req.files.image3 && req.files.image3[0]
        const image4 = req.files.image4 && req.files.image4[0]

        const images = [image1, image2, image3, image4].filter((item)=> item !== undefined);

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

export { addProduct, listProducts, removeProduct, singleProduct };
