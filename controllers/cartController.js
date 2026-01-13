import userModel from "../models/userModel.js";
import { logError } from '../utils/logger.js';


// add products to cart
const addToCart = async (req, res) => {
    try {
        const userId = req.userId; // Set by auth middleware
        const { itemId, quantity } = req.body; 

        const userData = await userModel.findById(userId);
        
        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }
        
        let cartData = userData.cartData || {};

        if (cartData[itemId]) {
            if (cartData[itemId][quantity]) {
                cartData[itemId][quantity] += 1;
            } else {
                cartData[itemId][quantity] = 1;
            }
        } else {
            cartData[itemId] = { };
            cartData[itemId][quantity] = 1;
        }

        await userModel.findByIdAndUpdate(userId, { cartData });

        res.json({ success: true, message: "Item added to cart successfully", cartData });

    } catch (error) {
        logError(error, 'addToCart');
        res.json({ success: false, message: "Failed to add item to cart" });
    }
}

// update products in cart
const updateCart = async (req, res) => {
    try {

        const userId = req.userId; // Set by auth middleware
        const { itemId, sizeKey, newQuantity } = req.body; 

        const userData = await userModel.findById(userId);
        
        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }
        
        let cartData = userData.cartData || {};

        if (newQuantity === 0) {
            if (cartData[itemId] && cartData[itemId][sizeKey]) {
                delete cartData[itemId][sizeKey];
                if (Object.keys(cartData[itemId]).length === 0) {
                    delete cartData[itemId];
                }
            }
        } else {
            if (!cartData[itemId]) {
                cartData[itemId] = {};
            }
            cartData[itemId][sizeKey] = newQuantity;
        }

        await userModel.findByIdAndUpdate(userId, { cartData });

        res.json({ success: true, message: "Cart updated successfully", cartData });

    } catch (error) {
        logError(error, 'updateCart');
        res.json({ success: false, message: "Failed to Update Cart" });
    }
}

// get user cart data
const getUserCart = async (req, res) => {

    try {

        const userId = req.userId; // Set by auth middleware

        const userData = await userModel.findById(userId);
        
        if (!userData) {
            return res.json({ success: false, message: "User not found", cartData: {} });
        }
        
        let cartData = userData.cartData || {};

        res.json({ success: true, cartData });

    } catch (error) {
        logError(error, 'getUserCart');
        res.json({ success: false, message: error.message });
    }

}

export { addToCart, updateCart, getUserCart };