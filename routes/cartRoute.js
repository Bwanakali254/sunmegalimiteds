import express from 'express';
import { addToCart, getUserCart, updateCart } from '../controllers/cartController.js';
import authUser from '../middleware/auth.js';
import { validateAddToCart, validateUpdateCart, handleValidationErrors } from '../middleware/validation.js';

const cartRouter = express.Router();

cartRouter.post('/add',authUser, validateAddToCart, handleValidationErrors, addToCart);
cartRouter.post('/update',authUser, validateUpdateCart, handleValidationErrors, updateCart);
cartRouter.post('/get',authUser, getUserCart);

export default cartRouter;