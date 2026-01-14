import express from 'express'
import { allorders, userOrders, updateStatus, placeOrder } from '../controllers/orderController.js'
import adminAuth from '../middleware/adminAuth.js'
import authUser from '../middleware/auth.js'
import { validateOrder, handleValidationErrors } from '../middleware/validation.js'


const orderRouter = express.Router()

// Admin Features
orderRouter.post('/list',adminAuth,allorders)
orderRouter.post('/status',adminAuth,updateStatus)
orderRouter.post("/place", authUser, placeOrder);


// User Features
orderRouter.post('/userorders',authUser,userOrders)

export default orderRouter;
