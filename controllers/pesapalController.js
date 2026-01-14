import { getPesapalToken } from "../config/pesapal.js";
import { registerPesapalIPN, getPesapalTransactionStatus } from "../config/pesapal.js";
import Order from "../models/orderModel.js";



export const handlePesapalIPN = async (req, res) => {
  try {
    const { OrderTrackingId } = req.query;

    if (!OrderTrackingId) {
      return res.status(200).send("OK");
    }

    const statusData = await getPesapalTransactionStatus(OrderTrackingId);

    const paymentStatus =
      statusData?.payment_status_description ||
      statusData?.data?.payment_status_description;

    const order = await Order.findOne({ orderTrackingId: OrderTrackingId });

    if (!order) {
      console.log("Order not found:", OrderTrackingId);
      return res.status(200).send("OK");
    }

    if (paymentStatus === "COMPLETED") {
      order.status = "Paid";
      order.payment = true;
    } else if (paymentStatus === "FAILED") {
      order.status = "Payment Failed";
      order.payment = false;
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
