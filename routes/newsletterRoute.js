import express from 'express';
import { subscribeNewsletter } from '../controllers/newsletterController.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { validateNewsletter, handleValidationErrors } from '../middleware/validation.js';

const newsletterRouter = express.Router();

newsletterRouter.post('/subscribe', generalRateLimit, validateNewsletter, handleValidationErrors, subscribeNewsletter);

export default newsletterRouter;
