import { Router } from 'express';
import { listProducts, addProduct, removeProduct, updateProduct, getProduct } from '../controllers/productController.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';

const router = Router();

// Public routes (for frontend)
router.get('/list', listProducts);
router.get('/:id', getProduct);

// Protected admin routes with file upload
router.post('/add', adminAuth, upload.array('images', 4), addProduct);
router.post('/remove', adminAuth, removeProduct);
router.post('/update', adminAuth, upload.array('images', 4), updateProduct);

export default router;
