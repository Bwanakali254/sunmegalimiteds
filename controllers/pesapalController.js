import { getPesapalToken } from "../config/pesapal.js";
import { registerPesapalIPN, getPesapalTransactionStatus } from "../config/pesapal.js";
import Order from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import { sendPaymentConfirmationEmail, sendAdminPaymentReceivedEmail, sendPaymentFailedEmail, sendAdminPaymentFailedEmail } from "../services/emailService.js";
import { logError } from "../utils/logger.js";



export const handlePesapalIPN = async (req, res) => {
  try {
    const { OrderTrackingId } = req.query;

    if (!OrderTrackingId) {
      logError(new Error('IPN received without OrderTrackingId'), 'handlePesapalIPN');
      return res.status(200).send("OK");
    }
    
    // Validate OrderTrackingId format (basic validation)
    if (typeof OrderTrackingId !== 'string' || OrderTrackingId.length < 10) {
      logError(new Error(`Invalid OrderTrackingId format: ${OrderTrackingId}`), 'handlePesapalIPN');
      return res.status(200).send("OK");
    }

    // Verify transaction status directly from Pesapal (security measure)
    const statusData = await getPesapalTransactionStatus(OrderTrackingId);
    
    // Validate response from Pesapal
    if (!statusData || (!statusData.payment_status_description && !statusData?.data?.payment_status_description)) {
      logError(new Error(`Invalid Pesapal response for OrderTrackingId: ${OrderTrackingId}`), 'handlePesapalIPN');
      return res.status(200).send("OK");
    }

    const paymentStatus =
      statusData?.payment_status_description ||
      statusData?.data?.payment_status_description;

      const order = await Order.findOne({
        $or: [
          { orderTrackingId: OrderTrackingId },
          { merchantReference: OrderTrackingId }
        ]
      });

    if (!order) {
      logError(new Error(`Order not found for OrderTrackingId: ${OrderTrackingId}`), 'handlePesapalIPN');
      return res.status(200).send("OK");
    }
    
    // Log IPN processing
    console.log(`IPN Processing: OrderTrackingId=${OrderTrackingId}, Status=${paymentStatus}, OrderId=${order._id}`);

    if (paymentStatus === "COMPLETED") {
      order.status = "Paid";
      order.payment = true;
      
      // Send payment confirmation emails (fire-and-forget)
      try {
        const user = await userModel.findById(order.userId);
        
        // Send confirmation email to customer
        sendPaymentConfirmationEmail({
          to: order.address.email,
          order,
          user,
        }).catch(err => logError(err, 'handlePesapalIPN-customerEmail'));
        
        // Send notification email to admin
        sendAdminPaymentReceivedEmail({
          order,
          user,
        }).catch(err => logError(err, 'handlePesapalIPN-adminEmail'));
      } catch (emailError) {
        logError(emailError, 'handlePesapalIPN-emails');
        // Don't block IPN processing if emails fail
      }
    } else if (paymentStatus === "FAILED") {
      order.status = "Payment Failed";
      order.payment = false;
      
      // Send payment failed emails (fire-and-forget)
      try {
        const user = await userModel.findById(order.userId);
        
        // Send failed payment email to customer
        sendPaymentFailedEmail({
          to: order.address.email,
          order,
          user,
        }).catch(err => logError(err, 'handlePesapalIPN-customerFailedEmail'));
        
        // Send failed payment notification to admin
        sendAdminPaymentFailedEmail({
          order,
          user,
        }).catch(err => logError(err, 'handlePesapalIPN-adminFailedEmail'));
      } catch (emailError) {
        logError(emailError, 'handlePesapalIPN-failedEmails');
        // Don't block IPN processing if emails fail
      }
    } else {
      order.status = "Pending Payment";
      order.payment = false;
    }

    await order.save();
    console.log("Order updated:", order._id, order.status);

    res.status(200).send("OK");
  } catch (error) {
    console.error("IPN error:", error.message);
    res.status(200).send("OK");
  }
};

export const checkPesapalStatus = async (req, res) => {
  try {
    const { orderTrackingId } = req.query;

    if (!orderTrackingId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing orderTrackingId" });
    }

    const statusData = await getPesapalTransactionStatus(orderTrackingId);

    const paymentStatus =
      statusData?.payment_status_description ||
      statusData?.data?.payment_status_description;

    res.json({
      success: true,
      status: paymentStatus,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


export const verifyPesapalAndUpdateOrder = async (req, res) => {
  try {
    // Accept both cases (Pesapal uses OrderTrackingId)
    const orderTrackingId =
      req.query.orderTrackingId || req.query.OrderTrackingId;

    if (!orderTrackingId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing orderTrackingId" });
    }

    // 1) Ask Pesapal for the real truth
    const statusData = await getPesapalTransactionStatus(orderTrackingId);

    const paymentStatus =
      statusData?.payment_status_description ||
      statusData?.data?.payment_status_description ||
      "PENDING";

    // 2) Update your DB based on truth (idempotent)
    if (paymentStatus === "COMPLETED") {
      await Order.updateOne(
        { orderTrackingId },
        { $set: { payment: true, status: "Paid" } }
      );
    } else if (
      paymentStatus === "FAILED" ||
      paymentStatus === "INVALID" ||
      paymentStatus === "REVERSED"
    ) {
      await Order.updateOne(
        { orderTrackingId },
        { $set: { payment: false, status: "Payment Failed" } }
      );
    } else {
      // Pending: don’t overwrite Paid orders by mistake
      await Order.updateOne(
        { orderTrackingId, payment: { $ne: true } },
        { $set: { status: "Pending Payment" } }
      );
    }

    // 3) Send response to frontend
    return res.json({ success: true, status: paymentStatus });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
