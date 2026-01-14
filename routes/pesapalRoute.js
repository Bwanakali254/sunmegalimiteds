import express from "express";
import { testPesapalAuth } from "../controllers/pesapalController.js";
import { testRegisterIPN } from "../controllers/pesapalController.js";
import { testSubmitOrder } from "../controllers/pesapalController.js";
import { handlePesapalIPN } from "../controllers/pesapalController.js";
import { checkPesapalStatus } from "../controllers/pesapalController.js";
import { getPesapalIPNs } from "../config/pesapal.js"

const pesapalRouter = express.Router();

pesapalRouter.get("/test-auth", testPesapalAuth);
pesapalRouter.get("/test-ipn", testRegisterIPN);
pesapalRouter.get("/test-submit", testSubmitOrder);
pesapalRouter.get("/ipn", handlePesapalIPN);
pesapalRouter.get("/status", checkPesapalStatus);

pesapalRouter.get("/list-ipns", async (req, res) => {
  try {
    const data = await getPesapalIPNs(); // function that calls Pesapal IPN list API
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

export default pesapalRouter;
