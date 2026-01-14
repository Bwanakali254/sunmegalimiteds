import express from "express";
import { testPesapalAuth } from "../controllers/pesapalController.js";
import { testRegisterIPN } from "../controllers/pesapalController.js";

const pesapalRouter = express.Router();

pesapalRouter.get("/test-auth", testPesapalAuth);
pesapalRouter.get("/test-ipn", testRegisterIPN);

export default pesapalRouter;
