import { getPesapalTransactionStatus } from "../config/pesapal.js";
import Order from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import {
  sendPaymentConfirmationEmail,
  sendAdminPaymentReceivedEmail,
  sendPaymentFailedEmail,
  sendAdminPaymentFailedEmail,
} from "../services/emailService.js";
import { logError } from "../utils/logger.js";

// ---------------------------
// IPN Handler (Pesapal -> Backend)
// ---------------------------
export const handlePesapalIPN = async (req, res) => {
  try {
    // Pesapal usually sends these in query params (GET IPN)
    const OrderTrackingId = req.query.OrderTrackingId || req.query.orderTrackingId;
    const OrderMerchantReference =
      req.query.OrderMerchantReference || req.query.orderMerchantReference;

    if (!OrderTrackingId) {
      logError(new Error("IPN received without OrderTrackingId"), "handlePesapalIPN");
      return res.status(200).send("OK");
    }

    // Basic validation
    if (typeof OrderTrackingId !== "string" || OrderTrackingId.length < 10) {
      logError(
        new Error(`Invalid OrderTrackingId format: ${OrderTrackingId}`),
        "handlePesapalIPN"
      );
      return res.status(200).send("OK");
    }

    // Verify transaction status directly from Pesapal
    const statusData = await getPesapalTransactionStatus(OrderTrackingId);

    const paymentStatus =
      statusData?.payment_status_description ||
      statusData?.data?.payment_status_description;

    if (!paymentStatus) {
      logError(
        new Error(`Invalid Pesapal response for OrderTrackingId: ${OrderTrackingId}`),
        "handlePesapalIPN"
      );
      return res.status(200).send("OK");
    }

    // ✅ FIX: Find order using tracking id OR merchant reference (correct param)
    const order = await Order.findOne({
      $or: [
        { orderTrackingId: OrderTrackingId },
        ...(OrderMerchantReference ? [{ merchantReference: OrderMerchantReference }] : []),
      ],
    });

    if (!order) {
      logError(
        new Error(
          `Order not found. OrderTrackingId=${OrderTrackingId}, OrderMerchantReference=${OrderMerchantReference}`
        ),
        "handlePesapalIPN"
      );
      return res.status(200).send("OK");
    }

    console.log(
      `IPN Processing: OrderTrackingId=${OrderTrackingId}, MerchantRef=${OrderMerchantReference}, Status=${paymentStatus}, OrderId=${order._id}`
    );

    if (paymentStatus === "COMPLETED") {
      order.status = "Paid";
      order.payment = true;

      // Emails (fire-and-forget)
      try {
        const user = await userModel.findById(order.userId);

        sendPaymentConfirmationEmail({
          to: order.address.email,
          order,
          user,
        }).catch((err) => logError(err, "handlePesapalIPN-customerEmail"));

        sendAdminPaymentReceivedEmail({
          order,
          user,
        }).catch((err) => logError(err, "handlePesapalIPN-adminEmail"));
      } catch (emailError) {
        logError(emailError, "handlePesapalIPN-emails");
      }
    } else if (
      paymentStatus === "FAILED" ||
      paymentStatus === "INVALID" ||
      paymentStatus === "REVERSED"
    ) {
      order.status = "Payment Failed";
      order.payment = false;

      // Emails (fire-and-forget)
      try {
        const user = await userModel.findById(order.userId);

        sendPaymentFailedEmail({
          to: order.address.email,
          order,
          user,
        }).catch((err) => logError(err, "handlePesapalIPN-customerFailedEmail"));

        sendAdminPaymentFailedEmail({
          order,
          user,
        }).catch((err) => logError(err, "handlePesapalIPN-adminFailedEmail"));
      } catch (emailError) {
        logError(emailError, "handlePesapalIPN-failedEmails");
      }
    } else {
      // Pending-like statuses
      if (!order.payment) {
        order.status = "Pending Payment";
      }
    }

    await order.save();
    console.log("Order updated via IPN:", order._id.toString(), order.status, order.payment);

    return res.status(200).send("OK");
  } catch (error) {
    console.error("IPN error:", error.message);
    return res.status(200).send("OK");
  }
};

// ---------------------------
// Simple status check (does NOT update DB)
// ---------------------------
export const checkPesapalStatus = async (req, res) => {
  try {
    const orderTrackingId =
      req.query.orderTrackingId || req.query.OrderTrackingId;

    if (!orderTrackingId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing orderTrackingId" });
    }

    const statusData = await getPesapalTransactionStatus(orderTrackingId);

    const paymentStatus =
      statusData?.payment_status_description ||
      statusData?.data?.payment_status_description ||
      "PENDING";

    return res.json({
      success: true,
      status: paymentStatus,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------
// Verify + UPDATE DB (Callback Page should use THIS)
// ---------------------------
export const verifyPesapalAndUpdateOrder = async (req, res) => {
  // ✅ Stop caching (fixes 304 issues)
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");

  try {
    const orderTrackingId =
      req.query.orderTrackingId || req.query.OrderTrackingId;

    if (!orderTrackingId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing orderTrackingId" });
    }

    // Ask Pesapal for truth
    const statusData = await getPesapalTransactionStatus(orderTrackingId);

    const paymentStatus =
      statusData?.payment_status_description ||
      statusData?.data?.payment_status_description ||
      "PENDING";

    // Update DB based on truth (idempotent)
    let updateResult;

    if (paymentStatus === "COMPLETED") {
      updateResult = await Order.updateOne(
        { orderTrackingId },
        { $set: { payment: true, status: "Paid" } }
      );
    } else if (
      paymentStatus === "FAILED" ||
      paymentStatus === "INVALID" ||
      paymentStatus === "REVERSED"
    ) {
      updateResult = await Order.updateOne(
        { orderTrackingId },
        { $set: { payment: false, status: "Payment Failed" } }
      );
    } else {
      updateResult = await Order.updateOne(
        { orderTrackingId, payment: { $ne: true } },
        { $set: { status: "Pending Payment" } }
      );
    }

    // ✅ Debug log so we know if DB matched anything
    console.log("VERIFY:", orderTrackingId, paymentStatus, "UPDATE:", updateResult);

    return res.json({ success: true, status: paymentStatus });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
