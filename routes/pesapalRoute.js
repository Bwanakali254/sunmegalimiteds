import express from "express";
import { testPesapalAuth } from "../controllers/pesapalController.js";
import { testRegisterIPN } from "../controllers/pesapalController.js";
import { testSubmitOrder } from "../controllers/pesapalController.js";
import { handlePesapalIPN } from "../controllers/pesapalController.js";
import { checkPesapalStatus } from "../controllers/pesapalController.js";

const pesapalRouter = express.Router();

pesapalRouter.get("/test-auth", testPesapalAuth);
pesapalRouter.get("/test-ipn", testRegisterIPN);
pesapalRouter.get("/test-submit", testSubmitOrder);
pesapalRouter.get("/ipn", handlePesapalIPN);
pesapalRouter.get("/status", checkPesapalStatus);

export default pesapalRouter;
