import express from "express";
import { handlePesapalIPN, checkPesapalStatus, verifyPesapalAndUpdateOrder } from "../controllers/pesapalController.js";

const pesapalRouter = express.Router();

// Pesapal callback
pesapalRouter.all("/ipn", handlePesapalIPN);

// Frontend/manual status check
pesapalRouter.get("/status", checkPesapalStatus);

// ✅ NEW: verify + update DB
pesapalRouter.get("/verify", verifyPesapalAndUpdateOrder);

export default pesapalRouter;
