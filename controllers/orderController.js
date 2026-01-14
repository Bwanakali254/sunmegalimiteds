import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { logError, logInfo } from "../utils/logger.js";


// Placing orders using pesapal
const placeOrder = async (req, res) => {
  try {
    const userId = req.userId; // from auth middleware
    const { address, items, amount } = req.body;

    if (!address || !items || !items.length || !amount) {
      return res.json({ success: false, message: "Invalid order data" });
    }

    const order = await orderModel.create({
      userId,
      items,
      address,
      amount,
      status: "Pending Payment",
      payment: false,
      createdAt: new Date()
    });

    res.json({
      success: true,
      message: "Order created",
      orderId: order._id
    });

  } catch (error) {
    logError(error, "placeOrder");
    res.json({ success: false, message: "Failed to place order" });
  }
};



// All Orders data foor Admin panel
const allorders = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.json({ success: true, orders });
  } catch (error) {
    logError(error, "allorders");
    res.json({ success: false, message: "Failed to fetch orders" });
  }
};

// User orders data for frontend
const userOrders = async (req, res) => {
  try {
    const userId = req.userId;

    const orders = await orderModel.find({ userId });
    res.json({ success: true, orders });
  } catch (error) {
    logError(error, "userOrders");
    res.json({ success: false, message: "Failed to fetch user orders" });
  }
};
// Update order status from admin panel
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    await orderModel.findByIdAndUpdate(orderId, { status });
    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    logError(error, "updateStatus");
    res.json({ success: false, message: "Failed to update order status" });
  }
};

export {
  placeOrder,
  allorders,
  userOrders,
  updateStatus
};
