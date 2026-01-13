import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import ipnLogModel from "../models/ipnLogModel.js";
import pesapal from "../config/pesapal.js";
import { logError, logInfo } from "../utils/logger.js";
import crypto from "crypto";

// Placing orders using pesapal
const placeOrderPesapal = async (req, res) => {
  try {
    const userId = String(req.userId); // From auth middleware
    const { address, items, amount } = req.body;

    // Validate and recalculate amount server-side
    const DELIVERY_FEE = 10; // Should match frontend deliveryFee
    let calculatedAmount = 0;

    for (const item of items) {
      if (!item._id || !item.price || !item.quantity) {
        return res.json({
          success: false,
          message: "Invalid item data: missing _id, price, or quantity",
        });
      }

      // Verify product exists and get current price
      const product = await productModel.findById(item._id);
      if (!product) {
        return res.json({
          success: false,
          message: `Product ${item._id} not found`,
        });
      }

      // Use server-side price for calculation
      calculatedAmount += product.price * item.quantity;
    }

    calculatedAmount += DELIVERY_FEE;

    // Compare with client amount (allow 1 currency unit difference for rounding)
    const amountDifference = Math.abs(calculatedAmount - amount);
    if (amountDifference > 1) {
      return res.json({
        success: false,
        message: "Amount mismatch detected. Please refresh and try again.",
      });
    }

    if (amountDifference > 0) {
      logInfo(
        `Warning: Amount difference of ${amountDifference} detected for order, but accepting within tolerance`,
        "placeOrderPesapal"
      );
    }

    // Use calculated amount for Pesapal (server-authoritative)
    const finalAmount = calculatedAmount;

    // Step 1: Create order in database first (with pending status)
    const orderData = {
      userId: userId,
      items: items,
      amount: finalAmount,
      address: address,
      status: "Pending Payment",
      paymentMethod: "Pesapal", // ✅ Fixed typo
      payment: false,
      date: new Date().toISOString(),
    };

    const newOrder = new orderModel(orderData);
    const savedOrder = await newOrder.save();
    const orderId = savedOrder._id.toString();

    // Step 2: Get IPN ID (use cached from env or register once)
    let ipnId = process.env.PESAPAL_IPN_ID;

    if (!ipnId) {
      // Register IPN if not cached (should only happen once)
      try {
        const ipnResponse = await pesapal.registerIPN(
          `${process.env.BACKEND_URL}/api/order/ipn`,
          "GET"
        );
        ipnId = ipnResponse.ipn_id;
        // Note: In production, set PESAPAL_IPN_ID in .env after first registration
        logInfo(
          `IPN registered with ID: ${ipnId}. Set PESAPAL_IPN_ID in .env to cache it.`,
          "placeOrderPesapal"
        );
      } catch (error) {
        logInfo(
          `Failed to register IPN, continuing without notification_id: ${error.message}`,
          "placeOrderPesapal"
        );
        // Continue without notification_id if registration fails (Pesapal may allow this)
      }
    }

    // Step 3: Prepare order details for Pesapal
    const pesapalOrderDetails = {
      id: orderId, // Use your MongoDB order ID
      currency: "KES",
      amount: finalAmount, // Use server-calculated amount
      description: `Order #${orderId} - ${items.length} item(s)`,
      callback_url: `${process.env.FRONTEND_URL}/payment-callback`,
      ...(ipnId && { notification_id: ipnId }), // Only include if IPN ID exists
      billing_address: {
        email_address: address.email,
        phone_number: address.phone,
        country_code: address.country || "KE",
        first_name: address.firstName,
        last_name: address.lastName,
        line_1: address.street,
        city: address.city,
        state: address.state || "",
        postal_code: address.zipcode || "",
        zip_code: address.zipcode || "",
      },
    };

    // Step 4: Submit order to Pesapal
    const pesapalResponse = await pesapal.submitOrder(pesapalOrderDetails);

    // Step 5: Update order with tracking ID
    await orderModel.findByIdAndUpdate(orderId, {
      orderTrackingId: pesapalResponse.order_tracking_id,
    });

    // Step 6: Return redirect URL to frontend
    res.json({
      success: true,
      redirect_url: pesapalResponse.redirect_url, // Frontend will redirect user here
      orderId: orderId,
      orderTrackingId: pesapalResponse.order_tracking_id,
    });
  } catch (error) {
    logError(error, "placeOrderPesapal");
    res.json({
      success: false,
      message: error.message || "Failed to process order",
    });
  }
};

// Handle IPN (Instant Payment Notification) from Pesapal
const handleIPN = async (req, res) => {
  try {
    // === STEP 1: Verify webhook signature (security check) ===
    const signature = req.headers["x-pesapal-signature"];

    if (!signature) {
      logInfo("Missing x-pesapal-signature header", "handleIPN");
      return res.status(200).send("IPN received");
    }

    try {
      // Verify signature using raw body and secret
      const isValid = verifyPesapalSignature(
        JSON.stringify(req.query),
        signature
      );

      if (!isValid) {
        logError("Invalid PesaPal webhook signature", "handleIPN");
        return res.status(200).send("IPN received"); // Silent fail - return 200 but don't process
      }
    } catch (sigError) {
      logError(sigError, "handleIPN-signature-verification");
      return res.status(200).send("IPN received"); // Silent fail on verification error
    }

    // === STEP 2: Extract and validate OrderTrackingId ===
    const { OrderTrackingId } = req.query;

    if (!OrderTrackingId) {
      return res.status(200).send("IPN received");
    }

    // Validate OrderTrackingId format (alphanumeric, reasonable length)
    if (
      typeof OrderTrackingId !== "string" ||
      OrderTrackingId.length < 10 ||
      OrderTrackingId.length > 100
    ) {
      logInfo(
        `Invalid OrderTrackingId format: ${OrderTrackingId}`,
        "handleIPN"
      );
      return res.status(200).send("IPN received"); // Still return 200 to Pesapal
    }

    // === STEP 3: Atomic idempotency check (prevents race condition) ===
    let idempotencyRecord;
    try {
      // Atomic operation: Try to insert a new record
      // If it already exists (duplicate webhook), MongoDB throws error
      // We catch and return early without processing
      idempotencyRecord = await ipnLogModel.findOneAndUpdate(
        { orderTrackingId: OrderTrackingId },
        {
          processedStatus: "processing",
          lockedAt: new Date(),
          retryCount: { $inc: 1 },
        },
        {
          upsert: true,
          new: true,
          returnDocument: "after",
        }
      );

      // Check if this was the first time processing this webhook
      if (idempotencyRecord.retryCount > 0) {
        // Not the first attempt - webhook was already being processed
        logInfo(
          `IPN already processed/processing for OrderTrackingId: ${OrderTrackingId}`,
          "handleIPN"
        );
        return res.status(200).send("IPN received");
      }
    } catch (idempotencyError) {
      // Handle any database errors gracefully
      logError(idempotencyError, "handleIPN-idempotency");
      return res.status(200).send("IPN received");
    }

    // === STEP 4: Verify order exists ===
    const order = await orderModel.findOne({
      orderTrackingId: OrderTrackingId,
    });

    if (!order) {
      logInfo(
        `Order not found for OrderTrackingId: ${OrderTrackingId}`,
        "handleIPN"
      );

      // Mark as failed in idempotency log
      await ipnLogModel.findOneAndUpdate(
        { orderTrackingId: OrderTrackingId },
        {
          processedStatus: "failed",
          lastError: "Order not found",
          processedAt: new Date(),
        }
      );

      return res.status(200).send("IPN received");
    }

    // === STEP 5: Get transaction status (unchanged business logic) ===
    const statusResponse = await pesapal.getTransactionStatus(OrderTrackingId);

    // === STEP 6: Update order status (unchanged business logic) ===
    let orderStatus = "Pending Payment";
    let paymentStatus = false;

    if (statusResponse.payment_status_description === "COMPLETED") {
      orderStatus = "Paid";
      paymentStatus = true;
    } else if (statusResponse.payment_status_description === "FAILED") {
      orderStatus = "Payment Failed";
      paymentStatus = false;
    }

    await orderModel.findByIdAndUpdate(order._id, {
      status: orderStatus,
      payment: paymentStatus,
    });

    // === STEP 7: Mark processing complete in idempotency log ===
    await ipnLogModel.findOneAndUpdate(
      { orderTrackingId: OrderTrackingId },
      {
        processedStatus: "completed",
        status: orderStatus,
        processedAt: new Date(),
      }
    );

    // Always return 200 to Pesapal
    res.status(200).send("IPN received");
  } catch (error) {
    logError(error, "handleIPN");
    res.status(200).send("IPN received"); // Still return 200 to Pesapal
  }
};

// Handle callback after payment
const handleCallback = async (req, res) => {
  try {
    const { OrderTrackingId } = req.query;

    if (!OrderTrackingId) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
    }

    // Get transaction status
    const statusResponse = await pesapal.getTransactionStatus(OrderTrackingId);

    // Find and update order
    const order = await orderModel.findOne({
      orderTrackingId: OrderTrackingId,
    });

    if (order) {
      let orderStatus = "Pending Payment";
      let paymentStatus = false;

      if (statusResponse.payment_status_description === "COMPLETED") {
        orderStatus = "Paid";
        paymentStatus = true;
      } else if (statusResponse.payment_status_description === "FAILED") {
        orderStatus = "Payment Failed";
        paymentStatus = false;
      }

      await orderModel.findByIdAndUpdate(order._id, {
        status: orderStatus,
        payment: paymentStatus,
      });
    }

    // Redirect to frontend success/failure page
    if (statusResponse.payment_status_description === "COMPLETED") {
      res.redirect(
        `${process.env.FRONTEND_URL}/payment-success?orderId=${OrderTrackingId}`
      );
    } else {
      res.redirect(
        `${process.env.FRONTEND_URL}/payment-failure?orderId=${OrderTrackingId}`
      );
    }
  } catch (error) {
    logError(error, "handleCallback");
    res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
    res.json({ success: false, message: "Failed to complete checkout" });
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

     const orders = await orderModel.find({userId})
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
  placeOrderPesapal,
  allorders,
  userOrders,
  updateStatus,
  handleIPN,
  handleCallback,
};
