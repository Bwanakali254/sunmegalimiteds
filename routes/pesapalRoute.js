import express from "express";
import { handlePesapalIPN, checkPesapalStatus } from "../controllers/pesapalController.js";

const pesapalRouter = express.Router();

// Pesapal callback
pesapalRouter.all("/ipn", handlePesapalIPN);

// Frontend/manual status check
pesapalRouter.get("/status", checkPesapalStatus);

export default pesapalRouter;
