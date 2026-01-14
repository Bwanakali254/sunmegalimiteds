import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { logError, logInfo } from "../utils/logger.js";

// Placing orders using pesapal
const placeOrder = async (req, res) => {
  try {
    const userId = req.userId;
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
      paymentMethod: "Pesapal", // required by schema
      date: new Date().toISOString(), // required by schema
    });

    // Build Pesapal payload from this order
    const pesapalData = {
      id: order._id.toString(),
      currency: "KES",
      amount: order.amount,
      description: `Order #${order._id}`,
      callback_url: "https://sunmegalimited.vercel.app/payment-callback",
      notification_id: process.env.PESAPAL_IPN_ID,
      billing_address: {
        email_address: order.address.email,
        phone_number: order.address.phone,
        country: order.address.country || "KENYA",
        first_name: order.address.firstName,
        last_name: order.address.lastName,
        line_1: order.address.street,
        city: order.address.city,
        state: order.address.state || "",
        postal_code: order.address.zipcode || "",
        zip_code: order.address.zipcode || "",
      },
    };

    // Send order to Pesapal
    const pesapalRes = await submitPesapalOrder(pesapalData);

    // Save tracking id on order
    order.orderTrackingId = pesapalRes.order_tracking_id;
    await order.save();

    // Send redirect URL to frontend
    res.json({
      success: true,
      redirect_url: pesapalRes.redirect_url,
      orderId: order._id,
      orderTrackingId: pesapalRes.order_tracking_id,
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

export { placeOrder, allorders, userOrders, updateStatus };
