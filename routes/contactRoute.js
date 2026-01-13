import express from 'express';
import { submitContact } from '../controllers/contactController.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { validateContact, handleValidationErrors } from '../middleware/validation.js';

const contactRouter = express.Router();

contactRouter.post('/', generalRateLimit, validateContact, handleValidationErrors, submitContact);

export default contactRouter;
