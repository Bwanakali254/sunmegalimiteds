import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import { logError, logInfo } from "../utils/logger.js";
import { submitPesapalOrder } from "../config/pesapal.js";
import { 
  sendOrderConfirmationEmail, 
  sendAdminNewOrderEmail,
  sendOrderProcessingEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendAdminOrderProcessingEmail,
  sendAdminOrderShippedEmail,
  sendAdminOrderDeliveredEmail,
  sendAdminOrderCancelledEmail
} from "../services/emailService.js";

// Placing orders using pesapal
const placeOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { address, items, amount } = req.body;

    if (!address || !items || !items.length || !amount) {
      return res.json({ success: false, message: "Invalid order data" });
    }

    const merchantReference = `ORD-${Date.now()}`;

    const order = await orderModel.create({
      userId,
      items,
      address,
      amount,
      merchantReference,            // ✅ ADD THIS LINE
      status: "Pending Payment",
      payment: false,               // ✅ KEEP THIS
      paymentMethod: "Pesapal",
      date: new Date().toISOString(),
    });

    // Build Pesapal payload from this order
    const pesapalData = {
      id: order._id.toString(),
      currency: "KES",
      amount: Number(order.amount),
      description: `Order #${order._id}`,
      callback_url: process.env.PESAPAL_FRONTEND_CALLBACK_URL, // call back url
      notification_id: process.env.PESAPAL_IPN_ID,
      billing_address: {
        email_address: order.address.email,
        phone_number: order.address.phone,
        country: order.address.country || "KE",
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

    // Send order confirmation emails (fire-and-forget)
    try {
      const user = await userModel.findById(userId);
      
      // Send confirmation email to customer
      sendOrderConfirmationEmail({
        to: order.address.email,
        order,
        user,
      }).catch(err => logError(err, 'placeOrder-customerEmail'));
      
      // Send notification email to admin
      sendAdminNewOrderEmail({
        order,
        user,
      }).catch(err => logError(err, 'placeOrder-adminEmail'));
    } catch (emailError) {
      logError(emailError, 'placeOrder-emails');
      // Don't block order placement if emails fail
    }

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

    // Load order with full details before updating
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    // Update order status
    order.status = status;
    await order.save();

    // Send status update email (fire-and-forget)
    try {
      const user = await userModel.findById(order.userId);
      const customerEmail = order.address?.email || user?.email;

      if (customerEmail) {
        // Send appropriate email based on status
        if (status === "Processing") {
          sendOrderProcessingEmail({
            to: customerEmail,
            order,
            user,
          }).catch(err => logError(err, 'updateStatus-processingEmail'));
        } else if (status === "Shipped") {
          sendOrderShippedEmail({
            to: customerEmail,
            order,
            user,
          }).catch(err => logError(err, 'updateStatus-shippedEmail'));
        } else if (status === "Delivered") {
          sendOrderDeliveredEmail({
            to: customerEmail,
            order,
            user,
          }).catch(err => logError(err, 'updateStatus-deliveredEmail'));
        } else if (status === "Cancelled") {
          sendOrderCancelledEmail({
            to: customerEmail,
            order,
            user,
          }).catch(err => logError(err, 'updateStatus-cancelledEmail'));
        }
      }

      // Send admin notification emails (fire-and-forget)
      if (status === "Processing") {
        sendAdminOrderProcessingEmail({
          order,
          user,
        }).catch(err => logError(err, 'updateStatus-adminProcessingEmail'));
      } else if (status === "Shipped") {
        sendAdminOrderShippedEmail({
          order,
          user,
        }).catch(err => logError(err, 'updateStatus-adminShippedEmail'));
      } else if (status === "Delivered") {
        sendAdminOrderDeliveredEmail({
          order,
          user,
        }).catch(err => logError(err, 'updateStatus-adminDeliveredEmail'));
      } else if (status === "Cancelled") {
        sendAdminOrderCancelledEmail({
          order,
          user,
        }).catch(err => logError(err, 'updateStatus-adminCancelledEmail'));
      }
    } catch (emailError) {
      logError(emailError, 'updateStatus-emails');
      // Don't block status update if emails fail
    }

    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    logError(error, "updateStatus");
    res.json({ success: false, message: "Failed to update order status" });
  }
};

export { placeOrder, allorders, userOrders, updateStatus };
