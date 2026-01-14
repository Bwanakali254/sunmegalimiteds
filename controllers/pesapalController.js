import { getPesapalToken } from "../config/pesapal.js";
import { registerPesapalIPN } from "../config/pesapal.js";
import { submitPesapalOrder } from "../config/pesapal.js";
import { getPesapalTransactionStatus } from "../config/pesapal.js";

export const testPesapalAuth = async (req, res) => {
  try {
    const token = await getPesapalToken();
    res.json({ success: true, token });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const testRegisterIPN = async (req, res) => {
  try {
    // We pass the IPN url using query string for testing
    const ipnUrl = req.query.url;

    if (!ipnUrl) {
      return res.status(400).json({
        success: false,
        message: "You must provide ?url=YOUR_IPN_URL"
      });
    }

    const result = await registerPesapalIPN(ipnUrl);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// test controller
export const testSubmitOrder = async (req, res) => {
  try {
    const ipnId = "88956793-2c59-4419-bce2-dada320a3638"; // from Step 2

    const orderData = {
      id: "TEST_ORDER_" + Date.now(),
      currency: "KES",
      amount: 5,
      description: "Test Order from Backend",
      callback_url: "https://sunmegalimited.vercel.app/payment-callback",
      notification_id: ipnId,
      billing_address: {
        email_address: "test@example.com",
        phone_number: "0700000000",
        country: "KENYA",
        first_name: "Test",
        last_name: "User"
      }
    };

    const result = await submitPesapalOrder(orderData);

    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const handlePesapalIPN = async (req, res) => {
  try {
    const { OrderTrackingId, MerchantReference } = req.query;

    if (!OrderTrackingId) {
      return res.status(200).send("OK");
    }

    console.log("Pesapal IPN received:", req.query);

    // Ask Pesapal for real status
    const statusData = await getPesapalTransactionStatus(OrderTrackingId);

    /*
      statusData.payment_status_description could be:
      - COMPLETED
      - FAILED
      - PENDING
    */

    // For now just log it (next step we update DB)
    console.log("Final payment status:", statusData.payment_status_description);

    // Always reply 200 so Pesapal stops retrying
    res.status(200).send("OK");
  } catch (error) {
    console.error("IPN error:", error.message);
    res.status(200).send("OK"); // still return 200
  }
};