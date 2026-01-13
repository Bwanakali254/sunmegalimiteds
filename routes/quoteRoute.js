import express from 'express';
import { submitQuote } from '../controllers/quoteController.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { validateQuote, handleValidationErrors } from '../middleware/validation.js';

const quoteRouter = express.Router();

quoteRouter.post('/', generalRateLimit, validateQuote, handleValidationErrors, submitQuote);

export default quoteRouter;
