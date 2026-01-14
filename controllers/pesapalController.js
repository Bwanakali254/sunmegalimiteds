import { getPesapalToken } from "../config/pesapal.js";
import { registerPesapalIPN } from "../config/pesapal.js";

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